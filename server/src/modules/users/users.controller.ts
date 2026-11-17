import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/request-user';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto, UpdateRoleDto } from './dto/user.dto';
import { UsersService } from './users.service';

/**
 * Gestion de usuarios y roles: exclusiva del administrador. El registro
 * publico (biometria) solo crea operadores; los administradores se crean
 * desde aqui. El usuario creado inscribe su dispositivo despues con su
 * correo en la pantalla de registro.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    }));
  }

  @Post()
  async create(@Body() dto: CreateUserDto, @Req() req: { user: RequestUser }) {
    const user = await this.usersService.createWithRole({
      email: dto.email,
      name: dto.name,
      role: dto.role ?? UserRole.OPERATOR,
    });
    await this.auditService.record({
      user: req.user,
      action: 'user.create',
      entityType: 'user',
      entityId: user.id,
      detail: { email: user.email, role: user.role },
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: { user: RequestUser },
  ) {
    const user = await this.usersService.updateRole(id, dto.role);
    await this.auditService.record({
      user: req.user,
      action: 'user.role',
      entityType: 'user',
      entityId: user.id,
      detail: { role: user.role },
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
