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
import { DriverStatus } from '../../entities/driver.entity';
import { UserRole } from '../../entities/user.entity';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import type { RequestUser } from '../auth/request-user';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriversService } from './drivers.service';

/**
 * Conductores: lectura para cualquier autenticado; alta, edicion y baja
 * solo para el administrador (gestion de maestros).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('drivers')
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAll(@Query('status') status?: DriverStatus) {
    return this.driversService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateDriverDto, @Req() req: { user: RequestUser }) {
    const driver = await this.driversService.create(dto);
    await this.auditService.record({
      user: req.user,
      action: 'driver.create',
      entityType: 'driver',
      entityId: driver.id,
      detail: { name: driver.name },
    });
    return driver;
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
    @Req() req: { user: RequestUser },
  ) {
    const driver = await this.driversService.update(id, dto);
    await this.auditService.record({
      user: req.user,
      action: 'driver.update',
      entityType: 'driver',
      entityId: driver.id,
      detail: { ...dto },
    });
    return driver;
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    await this.driversService.remove(id);
    await this.auditService.record({
      user: req.user,
      action: 'driver.delete',
      entityType: 'driver',
      entityId: id,
    });
    return { deleted: true };
  }
}
