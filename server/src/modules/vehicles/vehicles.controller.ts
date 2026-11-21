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
import { VehicleStatus } from '../../entities/vehicle.entity';
import { UserRole } from '../../entities/user.entity';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/request-user';
import { AuditService } from '../audit/audit.service';
import { vehicleToJsonLd } from '../../semantic/jsonld';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

/**
 * Flota: lectura para cualquier autenticado; alta, edicion y baja solo
 * para el administrador (gestion de maestros).
 */
@ApiTags('vehicles')
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: 'Sin JWT o token invalido/expirado.',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({
    summary: 'Lista la flota (opcionalmente filtrada por estado)',
    description:
      'Devuelve todos los vehiculos. `status` filtra por estado y `format=jsonld` cambia la serializacion a JSON-LD (schema.org).',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: VehicleStatus,
    description: 'Filtra por estado del vehiculo.',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['jsonld'],
    description: 'Pasa a JSON-LD en vez del JSON normal.',
  })
  @ApiOkResponse({ description: 'Lista de vehiculos.' })
  @Get()
  async findAll(
    @Query('status') status?: VehicleStatus,
    @Query('format') format?: string,
  ) {
    const vehicles = await this.vehiclesService.findAll(status);
    if (format === 'jsonld') {
      return vehicles.map(vehicleToJsonLd);
    }
    return vehicles;
  }

  @ApiOperation({ summary: 'Detalle de un vehiculo por id' })
  @ApiParam({ name: 'id', description: 'UUID del vehiculo.' })
  @ApiOkResponse({ description: 'El vehiculo encontrado.' })
  @ApiResponse({ status: 404, description: 'No existe ese vehiculo.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Crea un vehiculo (solo administrador)',
    description:
      'La placa y el tipo de carga son obligatorios; el tipo de carga define que despachos puede aceptar.',
  })
  @ApiResponse({ status: 201, description: 'Vehiculo creado.' })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere administrador.',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un vehiculo con esa placa.',
  })
  @Post()
  async create(
    @Body() dto: CreateVehicleDto,
    @Req() req: { user: RequestUser },
  ) {
    const vehicle = await this.vehiclesService.create(dto);
    await this.auditService.record({
      user: req.user,
      action: 'vehicle.create',
      entityType: 'vehicle',
      entityId: vehicle.id,
      detail: { plate: vehicle.plate },
    });
    return vehicle;
  }

  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Actualiza campos del vehiculo (solo administrador)',
  })
  @ApiParam({ name: 'id', description: 'UUID del vehiculo.' })
  @ApiOkResponse({ description: 'Vehiculo actualizado.' })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere administrador.',
  })
  @ApiResponse({ status: 404, description: 'No existe ese vehiculo.' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @Req() req: { user: RequestUser },
  ) {
    const vehicle = await this.vehiclesService.update(id, dto);
    await this.auditService.record({
      user: req.user,
      action: 'vehicle.update',
      entityType: 'vehicle',
      entityId: vehicle.id,
      detail: { ...dto },
    });
    return vehicle;
  }

  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Elimina el vehiculo (solo administrador)',
    description:
      'Si tiene despachos en curso conviene desactivarlo desde su estado en vez de borrarlo.',
  })
  @ApiParam({ name: 'id', description: 'UUID del vehiculo.' })
  @ApiOkResponse({ description: 'Borrado confirmado.' })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere administrador.',
  })
  @ApiResponse({ status: 404, description: 'No existe ese vehiculo.' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    await this.vehiclesService.remove(id);
    await this.auditService.record({
      user: req.user,
      action: 'vehicle.delete',
      entityType: 'vehicle',
      entityId: id,
    });
    return { deleted: true };
  }
}
