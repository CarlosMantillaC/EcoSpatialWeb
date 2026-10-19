import { Module } from '@nestjs/common';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { SimulatorService } from './simulator.service';

@Module({
  imports: [VehiclesModule],
  providers: [SimulatorService],
})
export class SimulatorModule {}
