import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispatch } from '../../entities/dispatch.entity';
import { PickupPoint } from '../../entities/pickup-point.entity';
import { ServiceOrder } from '../../entities/service-order.entity';
import { AlertsModule } from '../alerts/alerts.module';
import { AuditModule } from '../audit/audit.module';
import { DriversModule } from '../drivers/drivers.module';
import { RoutingModule } from '../routing/routing.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dispatch, ServiceOrder, PickupPoint]),
    VehiclesModule,
    DriversModule,
    AlertsModule,
    AuditModule,
    RoutingModule,
  ],
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
