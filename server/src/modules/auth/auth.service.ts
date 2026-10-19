import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorSelectionCriteria,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { Credential } from '../../entities/credential.entity';
import { User } from '../../entities/user.entity';
import { UsersService } from '../users/users.service';
import { ChallengeStore } from './challenge.store';

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

function fromBase64Url(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64url'));
}

export interface AuthResult {
  token: string;
  user: { id: string; email: string; name: string };
}

export type AuthenticatorMethod = 'device' | 'securityKey' | 'phone';

const AUTHENTICATOR_SELECTION: Record<
  AuthenticatorMethod,
  AuthenticatorSelectionCriteria
> = {
  device: {
    authenticatorAttachment: 'platform',
    residentKey: 'required',
    userVerification: 'required',
  },
  securityKey: {
    authenticatorAttachment: 'cross-platform',
    residentKey: 'required',
    userVerification: 'preferred',
  },
  phone: {
    residentKey: 'required',
    userVerification: 'preferred',
  },
};

const PREFERRED_AUTHENTICATOR: Record<
  AuthenticatorMethod,
  'localDevice' | 'securityKey' | 'remoteDevice'
> = {
  device: 'localDevice',
  securityKey: 'securityKey',
  phone: 'remoteDevice',
};

@Injectable()
export class AuthService {
  private readonly rpId: string;
  private readonly rpName: string;
  private readonly origin: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly challengeStore: ChallengeStore,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(Credential)
    private readonly credentialsRepository: Repository<Credential>,
  ) {
    this.rpId = this.config.get<string>('webauthn.rpId')!;
    this.rpName = this.config.get<string>('webauthn.rpName')!;
    this.origin = this.config.get<string>('webauthn.origin')!;
  }

  async registrationOptions(
    email: string,
    name: string,
    method: AuthenticatorMethod = 'device',
  ) {
    let user = await this.usersService.findByEmailWithCredentials(email);
    if (!user) {
      user = await this.usersService.create({ email, name });
      user.credentials = [];
    }

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userID: new TextEncoder().encode(user.id),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: (user.credentials ?? []).map((credential) => ({
        id: credential.credentialID,
        transports: credential.transports
          ? credential.transports.split(',')
          : undefined,
      })),
      authenticatorSelection: AUTHENTICATOR_SELECTION[method],
      preferredAuthenticatorType: PREFERRED_AUTHENTICATOR[method],
    });

    const { flowId } = this.challengeStore.create({
      challenge: options.challenge,
      type: 'registration',
      userId: user.id,
      email: user.email,
    });

    return { flowId, options };
  }

  async verifyRegistration(
    flowId: string,
    response: RegistrationResponseJSON,
  ): Promise<AuthResult> {
    const entry = this.safeConsume(flowId, 'registration');
    const user = await this.usersService.findById(entry.userId!);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: entry.challenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpId,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException('Registro biometrico no verificado');
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    const existing = await this.credentialsRepository.findOne({
      where: { credentialID: credential.id },
    });
    if (!existing) {
      await this.credentialsRepository.save(
        this.credentialsRepository.create({
          credentialID: credential.id,
          publicKey: toBase64Url(credential.publicKey),
          counter: String(credential.counter),
          transports: credential.transports?.join(',') ?? null,
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          userId: user.id,
        }),
      );
    }

    return this.issueToken(user);
  }

  async authenticationOptions(email?: string) {
    let allowCredentials:
      | { id: string; transports?: string[] }[]
      | undefined;
    let userId: string | undefined;

    if (email) {
      const user = await this.usersService.findByEmailWithCredentials(email);
      if (!user) {
        throw new UnauthorizedException(
          'No existe una cuenta registrada con ese correo',
        );
      }
      userId = user.id;
      allowCredentials = (user.credentials ?? []).map((credential) => ({
        id: credential.credentialID,
        transports: credential.transports
          ? credential.transports.split(',')
          : undefined,
      }));
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      allowCredentials,
      userVerification: 'preferred',
    });

    const { flowId } = this.challengeStore.create({
      challenge: options.challenge,
      type: 'authentication',
      userId,
      email,
    });

    return { flowId, options };
  }

  async verifyAuthentication(
    flowId: string,
    response: AuthenticationResponseJSON,
  ): Promise<AuthResult> {
    const entry = this.safeConsume(flowId, 'authentication');

    let user = entry.userId
      ? await this.usersService.findById(entry.userId)
      : null;

    if (!user && response.response.userHandle) {
      const userId = Buffer.from(
        response.response.userHandle,
        'base64url',
      ).toString('utf8');
      user = await this.usersService.findById(userId);
    }

    if (!user) {
      throw new UnauthorizedException('No se pudo identificar al usuario');
    }

    const credential = await this.credentialsRepository.findOne({
      where: { credentialID: response.id },
    });
    if (!credential || credential.userId !== user.id) {
      throw new UnauthorizedException('Credencial biometria no registrada');
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: entry.challenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpId,
      requireUserVerification: false,
      credential: {
        id: credential.credentialID,
        publicKey: fromBase64Url(credential.publicKey) as any,
        counter: Number(credential.counter),
        transports: credential.transports
          ? (credential.transports.split(',') as any)
          : undefined,
      },
    });

    if (!verification.verified) {
      throw new UnauthorizedException('Firma biometrica invalida');
    }

    credential.counter = String(verification.authenticationInfo.newCounter);
    await this.credentialsRepository.save(credential);

    return this.issueToken(user);
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return { id: user.id, email: user.email, name: user.name };
  }

  isDevLoginEnabled(): boolean {
    return this.config.get<boolean>('devLoginEnabled') === true;
  }

  async devLogin(email: string, name?: string): Promise<AuthResult> {
    if (!this.isDevLoginEnabled()) {
      throw new ForbiddenException('El acceso de demostracion esta deshabilitado');
    }

    let user = await this.usersService.findByEmail(email);
    if (!user) {
      user = await this.usersService.create({
        email,
        name: name?.trim() || email.split('@')[0],
      });
    }

    return this.issueToken(user);
  }

  private issueToken(user: User): AuthResult {
    const payload = { sub: user.id, email: user.email };
    return {
      token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  private safeConsume(flowId: string, type: 'registration' | 'authentication') {
    try {
      return this.challengeStore.consume(flowId, type);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }
}
