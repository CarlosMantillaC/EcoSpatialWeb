import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
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
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(
    private readonly dispatchService: DispatchService,
    private readonly auditService: AuditService,
  ) {}

  @Roles(UserRole.OPERATOR)
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
  @Post('preview')
  preview(@Body() dto: CreateDispatchDto) {
    return this.dispatchService.preview(dto);
  }

  @Get()
  async findAll() {
    const dispatches = await this.dispatchService.findAll();
    return dispatches;
  }

  @Get('active')
  findActive() {
    return this.dispatchService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dispatchService.findOne(id);
  }

  @Get(':id/jsonld')
  async findOneJsonLd(@Param('id') id: string) {
    return dispatchToJsonLd(await this.dispatchService.findOne(id));
  }

  @Roles(UserRole.OPERATOR)
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
