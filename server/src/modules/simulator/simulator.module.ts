import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { DriversModule } from '../drivers/drivers.module';
import { EventsModule } from '../events/events.module';
import { RoutingModule } from '../routing/routing.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { SimulatorService } from './simulator.service';

@Module({
  imports: [
    VehiclesModule,
    DriversModule,
    DispatchModule,
    EventsModule,
    RoutingModule,
    AlertsModule,
  ],
  providers: [SimulatorService],
})
export class SimulatorModule {}
