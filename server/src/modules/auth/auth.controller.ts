import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AddDeviceOptionsDto } from './dto/add-device-options.dto';
import { DevLoginDto } from './dto/dev-login.dto';
import { LoginOptionsDto } from './dto/login-options.dto';
import { LoginVerifyDto } from './dto/login-verify.dto';
import { RegisterOptionsDto } from './dto/register-options.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Registro y acceso sin contrasena (WebAuthn). Solo `devices/options` y
 * `me` exigen JWT; el resto es publico (el demo login esta ademas
 * deshabilitado fuera de desarrollo).
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Opciones de registro WebAuthn (publico)',
    description:
      'Primer paso del registro: devuelve el reto y los credenciales existentes. `method` admite device, phone o securityKey.',
  })
  @ApiResponse({ status: 201, description: 'Reto WebAuthn para inscribir el dispositivo.' })
  @ApiResponse({ status: 409, description: 'El correo ya esta registrado.' })
  @Post('register/options')
  registrationOptions(@Body() dto: RegisterOptionsDto) {
    return this.authService.registrationOptions(
      dto.email,
      dto.name,
      dto.method ?? 'device',
    );
  }

  @ApiOperation({
    summary: 'Verifica el registro y emite el JWT (publico)',
    description:
      'Segundo paso: valida la respuesta del navegador, crea el perfil (rol operadora por defecto) y devuelve el token de sesion.',
  })
  @ApiResponse({ status: 201, description: 'Perfil creado + JWT.' })
  @ApiResponse({ status: 400, description: 'Firma WebAuthn invalida o flujo expirado.' })
  @Post('register/verify')
  verifyRegistration(@Body() dto: RegisterVerifyDto) {
    return this.authService.verifyRegistration(dto.flowId, dto.response as any);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Opciones para agregar un segundo dispositivo (JWT)',
    description:
      'Sirve para enlazar otro telefono o llave al perfil que ya inicio sesion.',
  })
  @ApiResponse({ status: 201, description: 'Reto WebAuthn para el nuevo dispositivo.' })
  @ApiResponse({ status: 401, description: 'Sin JWT o token invalido/expirado.' })
  @Post('devices/options')
  addDeviceOptions(@Req() request: Request, @Body() dto: AddDeviceOptionsDto) {
    const user = request.user as { id: string };
    return this.authService.addDeviceOptions(user.id, dto.method ?? 'device');
  }

  @ApiOperation({
    summary: 'Opciones de autenticacion (publico)',
    description:
      'Si se envia `email` devuelve el reto de ese perfil; sin el, el reto es generico para cualquiera registrado.',
  })
  @ApiResponse({ status: 201, description: 'Reto WebAuthn para iniciar sesion.' })
  @Post('login/options')
  authenticationOptions(@Body() dto: LoginOptionsDto) {
    return this.authService.authenticationOptions(dto.email);
  }

  @ApiOperation({
    summary: 'Verifica la firma y emite el JWT (publico)',
    description:
      'Segundo paso del acceso: valida la firma del navegador y devuelve el token con el rol del perfil.',
  })
  @ApiResponse({ status: 201, description: 'JWT de sesion.' })
  @ApiResponse({ status: 400, description: 'Firma WebAuthn invalida o flujo expirado.' })
  @Post('login/verify')
  verifyAuthentication(@Body() dto: LoginVerifyDto) {
    return this.authService.verifyAuthentication(dto.flowId, dto.response as any);
  }

  @ApiOperation({
    summary: 'Configuracion publica de acceso (publico)',
    description:
      'Avisa si el acceso de demostracion por correo esta habilitado (nunca en produccion).',
  })
  @ApiOkResponse({ description: 'Estado del login demo: { devLoginEnabled }.' })
  @Get('config')
  config() {
    return { devLoginEnabled: this.authService.isDevLoginEnabled() };
  }

  @ApiOperation({
    summary: 'Login por correo sin biometria (solo desarrollo)',
    description:
      'Crea o reutiliza el perfil y emite el JWT sin firma WebAuthn. Responde 403 si DEV_LOGIN_ENABLED esta apagado o NODE_ENV=production.',
  })
  @ApiResponse({ status: 201, description: 'JWT de sesion.' })
  @ApiResponse({ status: 403, description: 'Acceso de demostracion deshabilitado.' })
  @Post('dev/login')
  devLogin(@Body() dto: DevLoginDto) {
    return this.authService.devLogin(dto.email, dto.name);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Perfil de la sesion actual (JWT)' })
  @ApiOkResponse({ description: 'id, email, nombre y rol del usuario autenticado.' })
  @ApiResponse({ status: 401, description: 'Sin JWT o token invalido/expirado.' })
  @Get('me')
  me(@Req() request: Request) {
    const user = request.user as { id: string };
    return this.authService.me(user.id);
  }
}
