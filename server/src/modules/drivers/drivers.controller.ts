import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DriverStatus } from '../../entities/driver.entity';
import { UserRole } from '../../entities/user.entity';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import type { RequestUser } from '../auth/request-user';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriversService } from './drivers.service';

/**
 * Conductores: lectura para cualquier autenticado; alta, edicion y baja
 * solo para el administrador (gestion de maestros).
 */
@ApiTags('drivers')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Sin JWT o token invalido/expirado.' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('drivers')
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({
    summary: 'Lista conductores (opcionalmente filtrados por estado)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DriverStatus,
    description: 'Filtra por disponibilidad del conductor.',
  })
  @ApiOkResponse({ description: 'Lista de conductores.' })
  @Get()
  findAll(@Query('status') status?: DriverStatus) {
    return this.driversService.findAll(status);
  }

  @ApiOperation({ summary: 'Detalle de un conductor por id' })
  @ApiParam({ name: 'id', description: 'UUID del conductor.' })
  @ApiOkResponse({ description: 'El conductor encontrado.' })
  @ApiResponse({ status: 404, description: 'No existe ese conductor.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crea un conductor (solo administrador)' })
  @ApiResponse({ status: 201, description: 'Conductor creado.' })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere administrador.',
  })
  @Post()
  async create(@Body() dto: CreateDriverDto, @Req() req: { user: RequestUser }) {
    const driver = await this.driversService.create(dto);
    await this.auditService.record({
      user: req.user,
      action: 'driver.create',
      entityType: 'driver',
      entityId: driver.id,
      detail: { name: driver.name },
    });
    return driver;
  }

  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Actualiza un conductor (solo administrador)',
    description:
      'Cambiar `status` a `fuera` saca el vehiculo de servicio hasta reactivarlo.',
  })
  @ApiParam({ name: 'id', description: 'UUID del conductor.' })
  @ApiOkResponse({ description: 'Conductor actualizado.' })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere administrador.',
  })
  @ApiResponse({ status: 404, description: 'No existe ese conductor.' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
    @Req() req: { user: RequestUser },
  ) {
    const driver = await this.driversService.update(id, dto);
    await this.auditService.record({
      user: req.user,
      action: 'driver.update',
      entityType: 'driver',
      entityId: driver.id,
      detail: { ...dto },
    });
    return driver;
  }

  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Elimina un conductor (solo administrador)',
    description: 'Sus vehiculos quedan sin conductor y disponibles.',
  })
  @ApiParam({ name: 'id', description: 'UUID del conductor.' })
  @ApiOkResponse({ description: 'Borrado confirmado.' })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere administrador.',
  })
  @ApiResponse({ status: 404, description: 'No existe ese conductor.' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    await this.driversService.remove(id);
    await this.auditService.record({
      user: req.user,
      action: 'driver.delete',
      entityType: 'driver',
      entityId: id,
    });
    return { deleted: true };
  }
}
