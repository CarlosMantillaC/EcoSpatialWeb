import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from '../../entities/alert.entity';
import { Dispatch } from '../../entities/dispatch.entity';
import { ServiceOrder } from '../../entities/service-order.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dispatch, ServiceOrder, Vehicle, Alert]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
