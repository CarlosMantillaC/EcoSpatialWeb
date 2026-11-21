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
import { ServiceOrderStatus } from '../../entities/service-order.entity';
import { UserRole } from '../../entities/user.entity';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/request-user';
import { AuditService } from '../audit/audit.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

/**
 * Ordenes de servicio: la operacion (crear, editar, despachar, cancelar)
 * es exclusiva de las operadoras; lectura para cualquier autenticado.
 */
@ApiTags('orders')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Sin JWT o token invalido/expirado.' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly auditService: AuditService,
  ) {}

  @ApiOperation({
    summary: 'Lista ordenes de servicio (opcional por estado)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ServiceOrderStatus,
    description: 'Filtra por estado de la orden.',
  })
  @ApiOkResponse({ description: 'Lista de ordenes.' })
  @Get()
  findAll(@Query('status') status?: ServiceOrderStatus) {
    return this.ordersService.findAll(status);
  }

  @ApiOperation({ summary: 'Detalle de una orden por id' })
  @ApiParam({ name: 'id', description: 'UUID de la orden.' })
  @ApiOkResponse({ description: 'La orden encontrada.' })
  @ApiResponse({ status: 404, description: 'No existe esa orden.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Roles(UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Crea una orden de servicio (solo operadora)',
    description:
      'El destino debe quedar dentro del perimetro de Cucuta; la sucursal es obligatoria.',
  })
  @ApiResponse({ status: 201, description: 'Orden creada en estado pendiente.' })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere operadora.',
  })
  @ApiResponse({ status: 400, description: 'Datos invalidos o fuera de Cucuta.' })
  @Post()
  async create(@Body() dto: CreateOrderDto, @Req() req: { user: RequestUser }) {
    const order = await this.ordersService.create(dto);
    await this.auditService.record({
      user: req.user,
      action: 'order.create',
      entityType: 'service_order',
      entityId: order.id,
      detail: {
        clientName: order.clientName,
        destLabel: order.destLabel,
        productLabel: order.productLabel,
        cargoType: order.cargoType,
      },
    });
    return order;
  }

  @Roles(UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Edita una orden (solo operadora, solo si no esta completada)',
  })
  @ApiParam({ name: 'id', description: 'UUID de la orden.' })
  @ApiOkResponse({ description: 'Orden actualizada.' })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere operadora.',
  })
  @ApiResponse({ status: 404, description: 'No existe esa orden.' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @Req() req: { user: RequestUser },
  ) {
    const order = await this.ordersService.update(id, dto);
    await this.auditService.record({
      user: req.user,
      action: 'order.update',
      entityType: 'service_order',
      entityId: order.id,
      detail: { ...dto },
    });
    return order;
  }

  @Roles(UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Cancela una orden (solo operadora, solo pendientes)',
    description: 'Pasa a estado `cancelada`; no puede despacharse despues.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la orden.' })
  @ApiOkResponse({ description: 'Orden cancelada.' })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere operadora.',
  })
  @ApiResponse({
    status: 400,
    description: 'La orden ya no esta pendiente.',
  })
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Req() req: { user: RequestUser },
  ) {
    const order = await this.ordersService.cancel(id);
    await this.auditService.record({
      user: req.user,
      action: 'order.cancel',
      entityType: 'service_order',
      entityId: order.id,
    });
    return order;
  }

  @Roles(UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Elimina una orden (solo operadora, solo pendientes)',
  })
  @ApiParam({ name: 'id', description: 'UUID de la orden.' })
  @ApiOkResponse({ description: 'Borrado confirmado.' })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere operadora.',
  })
  @ApiResponse({ status: 404, description: 'No existe esa orden.' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    await this.ordersService.remove(id);
    await this.auditService.record({
      user: req.user,
      action: 'order.delete',
      entityType: 'service_order',
      entityId: id,
    });
    return { deleted: true };
  }

  @ApiOperation({
    summary: 'Vista previa del viaje para una orden',
    description:
      'Calcula vehiculo compatible, recogida y ruta sin guardar nada (no cambia la orden).',
  })
  @ApiParam({ name: 'id', description: 'UUID de la orden.' })
  @ApiOkResponse({ description: 'Preview del viaje: vehiculo, recogida y dos tramos.' })
  @ApiResponse({ status: 404, description: 'No existe esa orden.' })
  @Post(':id/preview')
  preview(@Param('id') id: string) {
    return this.ordersService.preview(id);
  }

  @Roles(UserRole.OPERATOR)
  @ApiOperation({
    summary: 'Despacha la orden (solo operadora)',
    description:
      'Crea el despacho y deja la orden en estado `asignada`. `vehicleId` es opcional: sin el se elige el compatible mas cercano.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la orden.' })
  @ApiResponse({
    status: 201,
    description: 'Despacho creado: despacho + vehiculo + recogida + dos tramos.',
  })
  @ApiResponse({
    status: 403,
    description: 'Rol insuficiente: requiere operadora.',
  })
  @ApiResponse({
    status: 400,
    description: 'Sin vehiculo compatible o la orden no esta pendiente.',
  })
  @Post(':id/dispatch')
  async dispatch(
    @Param('id') id: string,
    @Body('vehicleId') vehicleId: string | undefined,
    @Req() req: { user: RequestUser },
  ) {
    const result = await this.ordersService.dispatch(id, vehicleId);
    await this.auditService.record({
      user: req.user,
      action: 'order.dispatch',
      entityType: 'service_order',
      entityId: id,
      detail: {
        dispatchId: result.dispatch.id,
        vehicleId: result.vehicle.id,
      },
    });
    return result;
  }
}
