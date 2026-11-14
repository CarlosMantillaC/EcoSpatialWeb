import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // EventSource no puede enviar headers: el SSE pasa el token por
        // query string (?token=...).
        (req) =>
          (req as { query?: { token?: string } })?.query?.token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret')!,
    });
  }

  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email };
  }
}
