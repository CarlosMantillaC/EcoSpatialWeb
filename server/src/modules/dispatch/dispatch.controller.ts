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
import { dispatchToJsonLd } from '../../semantic/jsonld';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { DispatchService } from './dispatch.service';

@UseGuards(JwtAuthGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(
    private readonly dispatchService: DispatchService,
    private readonly auditService: AuditService,
  ) {}

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
        orderId: dto.orderId ?? null,
      },
    });
    return result;
  }

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
