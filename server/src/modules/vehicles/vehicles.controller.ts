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
import { VehicleStatus } from '../../entities/vehicle.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/request-user';
import { AuditService } from '../audit/audit.service';
import { vehicleToJsonLd } from '../../semantic/jsonld';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly auditService: AuditService,
  ) {}

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

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
