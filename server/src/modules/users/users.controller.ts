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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
@ApiTags('users')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Sin JWT o token invalido/expirado.' })
@ApiResponse({
  status: 403,
  description: 'Rol insuficiente: requiere administrador.',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({
    summary: 'Lista usuarios y roles (solo administrador)',
  })
  @ApiOkResponse({ description: 'Usuarios con id, email, nombre y rol.' })
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

  @ApiOperation({
    summary: 'Crea un usuario con rol (solo administrador)',
    description:
      'Si `role` se omite nace como operadora. El nuevo perfil inscribe su dispositivo despues desde /enroll con este correo.',
  })
  @ApiResponse({ status: 201, description: 'Usuario creado.' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un usuario con ese correo.',
  })
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

  @ApiOperation({
    summary: 'Cambia el rol de un usuario (solo administrador)',
  })
  @ApiParam({ name: 'id', description: 'UUID del usuario.' })
  @ApiOkResponse({ description: 'Usuario con el rol actualizado.' })
  @ApiResponse({ status: 404, description: 'No existe ese usuario.' })
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
