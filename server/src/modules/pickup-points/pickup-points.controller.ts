import {
  Body,
  Controller,
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
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/request-user';
import { AuditService } from '../audit/audit.service';
import { CreatePickupPointDto, UpdatePickupPointDto } from './dto/pickup-point.dto';
import { PickupPointsService } from './pickup-points.service';

/**
 * Puntos de recogida (sucursales). Lectura para cualquier autenticado
 * (las operadoras los necesitan para elegir/sugerir recogida); alta y
 * edicion solo para el administrador.
 */
@ApiTags('pickup-points')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Sin JWT o token invalido/expirado.' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pickup-points')
export class PickupPointsController {
  constructor(
    private readonly pickupPointsService: PickupPointsService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({
    summary: 'Lista las sucursales (todas o solo activas)',
    description:
      'Nunca se borran: se desactivan para conservar la trazabilidad de los viajes.',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    enum: ['true', 'false'],
    description: 'Pasa "true" para listar solo las sucursales activas.',
  })
  @ApiOkResponse({ description: 'Lista de sucursales.' })
  @Get()
  findAll(@Query('active') active?: string) {
    return this.pickupPointsService.findAll(active === 'true');
  }

  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Crea una sucursal (solo administrador)',
    description:
      'Las coordenadas deben caer dentro del perimetro urbano de Cucuta.',
  })
  @ApiResponse({ status: 201, description: 'Sucursal creada.' })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere administrador.',
  })
  @ApiResponse({
    status: 400,
    description: 'Fuera del perimetro de Cucuta o datos invalidos.',
  })
  @Post()
  async create(
    @Body() dto: CreatePickupPointDto,
    @Req() req: { user: RequestUser },
  ) {
    const point = await this.pickupPointsService.create(dto);
    await this.auditService.record({
      user: req.user,
      action: 'pickup_point.create',
      entityType: 'pickup_point',
      entityId: point.id,
      detail: { name: point.name },
    });
    return point;
  }

  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Edita o desactiva una sucursal (solo administrador)',
    description:
      'Para "borrarla" usa `active: false`; nunca se elimina el registro.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la sucursal.' })
  @ApiOkResponse({ description: 'Sucursal actualizada.' })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere administrador.',
  })
  @ApiResponse({ status: 404, description: 'No existe esa sucursal.' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePickupPointDto,
    @Req() req: { user: RequestUser },
  ) {
    const point = await this.pickupPointsService.update(id, dto);
    await this.auditService.record({
      user: req.user,
      action: 'pickup_point.update',
      entityType: 'pickup_point',
      entityId: point.id,
      detail: { ...dto },
    });
    return point;
  }
}
