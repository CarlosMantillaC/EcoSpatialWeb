import { Module } from '@nestjs/common';
import { DispatchModule } from '../dispatch/dispatch.module';
import { EventsModule } from '../events/events.module';
import { RoutingModule } from '../routing/routing.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { SimulatorService } from './simulator.service';

@Module({
  imports: [VehiclesModule, DispatchModule, EventsModule, RoutingModule],
  providers: [SimulatorService],
})
export class SimulatorModule {}
