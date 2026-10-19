import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { LoginOptionsDto } from './dto/login-options.dto';
import { LoginVerifyDto } from './dto/login-verify.dto';
import { RegisterOptionsDto } from './dto/register-options.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/options')
  registrationOptions(@Body() dto: RegisterOptionsDto) {
    return this.authService.registrationOptions(
      dto.email,
      dto.name,
      dto.method ?? 'device',
    );
  }

  @Post('register/verify')
  verifyRegistration(@Body() dto: RegisterVerifyDto) {
    return this.authService.verifyRegistration(dto.flowId, dto.response as any);
  }

  @Post('login/options')
  authenticationOptions(@Body() dto: LoginOptionsDto) {
    return this.authService.authenticationOptions(dto.email);
  }

  @Post('login/verify')
  verifyAuthentication(@Body() dto: LoginVerifyDto) {
    return this.authService.verifyAuthentication(dto.flowId, dto.response as any);
  }

  @Get('config')
  config() {
    return { devLoginEnabled: this.authService.isDevLoginEnabled() };
  }

  @Post('dev/login')
  devLogin(@Body() dto: DevLoginDto) {
    return this.authService.devLogin(dto.email, dto.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: Request) {
    const user = request.user as { id: string };
    return this.authService.me(user.id);
  }
}
