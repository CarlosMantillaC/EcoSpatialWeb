import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispatch } from '../../entities/dispatch.entity';
import { RoutingModule } from '../routing/routing.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';

@Module({
  imports: [TypeOrmModule.forFeature([Dispatch]), VehiclesModule, RoutingModule],
  controllers: [DispatchController],
  providers: [DispatchService],
})
export class DispatchModule {}
