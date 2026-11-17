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
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAll(@Query('status') status?: ServiceOrderStatus) {
    return this.ordersService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Roles(UserRole.OPERATOR)
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

  @Post(':id/preview')
  preview(@Param('id') id: string) {
    return this.ordersService.preview(id);
  }

  @Roles(UserRole.OPERATOR)
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
