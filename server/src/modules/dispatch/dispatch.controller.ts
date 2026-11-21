import {
  Body,
  Controller,
  Get,
  Param,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/request-user';
import { AuditService } from '../audit/audit.service';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { UserRole } from '../../entities/user.entity';
import { dispatchToJsonLd } from '../../semantic/jsonld';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { DispatchService } from './dispatch.service';

/**
 * Despachos: la operacion (crear, completar, cancelar) es exclusiva de
 * las operadoras; el administrador solo gestiona maestros. Lectura para
 * cualquier autenticado.
 */
@ApiTags('dispatch')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Sin JWT o token invalido/expirado.' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(
    private readonly dispatchService: DispatchService,
    private readonly auditService: AuditService,
  ) {}

  @Roles(UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Aprueba y crea el despacho (solo operadora)',
    description:
      'Asigna el vehiculo compatible mas cercano a la recogida, guarda la ruta de dos tramos (vehiculo -> recogida -> entrega) y lo marca `en_ruta`. Revalida en el servidor que el vehiculo siga libre.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Despacho creado: despacho, vehiculo, recogida resuelta, tramos y totales.',
  })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere operadora.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Sin vehiculo compatible, destino fuera de Cucuta o vehiculo ya ocupado.',
  })
  @Post()
  async create(@Body() dto: CreateDispatchDto, @Req() req: { user: RequestUser }) {
    const result = await this.dispatchService.create(dto);
    await this.auditService.record({
      user: req.user,
      action: 'dispatch.approve',
      entityType: 'dispatch',
      entityId: result.dispatch.id,
      detail: {
        vehicleId: result.vehicle.id,
        plate: result.vehicle.plate,
        pickup: result.pickup.name,
        cargoType: result.cargoType,
        productLabel: result.productLabel,
        quantity: result.quantity,
        orderId: dto.orderId ?? null,
      },
    });
    return result;
  }

  @Roles(UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Vista previa del viaje (solo operadora)',
    description:
      'Calcula vehiculo compatible + recogida sugerida + ruta de dos tramos con distancias y ETAs. NO guarda nada ni cambia estados: es el paso 2 del flujo, antes de "Aprobar viaje".',
  })
  @ApiResponse({
    status: 200,
    description: 'Propuesta con vehiculo, recogida, tramos y totales.',
  })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere operadora.',
  })
  @ApiResponse({
    status: 400,
    description: 'Sin vehiculo compatible para ese tipo de carga o destino invalido.',
  })
  @Post('preview')
  preview(@Body() dto: CreateDispatchDto) {
    return this.dispatchService.preview(dto);
  }

  @ApiOperation({ summary: 'Historial de despachos' })
  @ApiOkResponse({ description: 'Despachos ordenados del mas reciente al mas antiguo.' })
  @Get()
  async findAll() {
    const dispatches = await this.dispatchService.findAll();
    return dispatches;
  }

  @ApiOperation({
    summary: 'Despachos activos con progreso en vivo',
    description:
      'Devuelve avance (0..1), segundos restantes y fase actual (yendo a recoger / cargando / en reparto). El mismo dato llega por SSE en /events/dispatch.',
  })
  @ApiOkResponse({ description: 'Despachos en curso enriquecidos con progreso.' })
  @Get('active')
  findActive() {
    return this.dispatchService.findActive();
  }

  @ApiOperation({ summary: 'Detalle de un despacho por id' })
  @ApiParam({ name: 'id', description: 'UUID del despacho.' })
  @ApiOkResponse({ description: 'El despacho encontrado.' })
  @ApiResponse({ status: 404, description: 'No existe ese despacho.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dispatchService.findOne(id);
  }

  @ApiOperation({
    summary: 'Despacho serializado en JSON-LD',
    description: 'Misma informacion que GET /dispatch/:id pero con vocabulario schema.org.',
  })
  @ApiParam({ name: 'id', description: 'UUID del despacho.' })
  @ApiOkResponse({ description: 'Documento JSON-LD del despacho.' })
  @ApiResponse({ status: 404, description: 'No existe ese despacho.' })
  @Get(':id/jsonld')
  async findOneJsonLd(@Param('id') id: string) {
    return dispatchToJsonLd(await this.dispatchService.findOne(id));
  }

  @Roles(UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Completa el servicio (solo operadora)',
    description:
      'Cierra el despacho, libera el vehiculo y refresca la flota. El backend tambien lo autocierra si el viaje ya no figura como activo.',
  })
  @ApiParam({ name: 'id', description: 'UUID del despacho.' })
  @ApiOkResponse({ description: 'Despacho completado.' })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere operadora.',
  })
  @ApiResponse({ status: 404, description: 'No existe ese despacho.' })
  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Req() req: { user: RequestUser },
  ) {
    const dispatch = await this.dispatchService.complete(id);
    await this.auditService.record({
      user: req.user,
      action: 'dispatch.complete',
      entityType: 'dispatch',
      entityId: id,
    });
    return dispatch;
  }

  @Roles(UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Cancela el despacho (solo operadora)',
    description: 'Cancela el viaje en curso y libera el vehiculo.',
  })
  @ApiParam({ name: 'id', description: 'UUID del despacho.' })
  @ApiOkResponse({ description: 'Despacho cancelado.' })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere operadora.',
  })
  @ApiResponse({ status: 404, description: 'No existe ese despacho.' })
  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    const dispatch = await this.dispatchService.cancel(id);
    await this.auditService.record({
      user: req.user,
      action: 'dispatch.cancel',
      entityType: 'dispatch',
      entityId: id,
    });
    return dispatch;
  }
}
