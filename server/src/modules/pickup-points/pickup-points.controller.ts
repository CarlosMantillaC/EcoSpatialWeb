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
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pickup-points')
export class PickupPointsController {
  constructor(
    private readonly pickupPointsService: PickupPointsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAll(@Query('active') active?: string) {
    return this.pickupPointsService.findAll(active === 'true');
  }

  @Roles(UserRole.ADMIN)
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
