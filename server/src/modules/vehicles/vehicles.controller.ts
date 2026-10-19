import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VehicleStatus } from '../../entities/vehicle.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { vehicleToJsonLd } from '../../semantic/jsonld';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

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
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.vehiclesService.remove(id);
    return { deleted: true };
  }
}
