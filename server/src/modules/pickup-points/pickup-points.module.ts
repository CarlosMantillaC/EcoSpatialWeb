import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PickupPoint } from '../../entities/pickup-point.entity';
import { AuditModule } from '../audit/audit.module';
import { PickupPointsController } from './pickup-points.controller';
import { PickupPointsService } from './pickup-points.service';

@Module({
  imports: [TypeOrmModule.forFeature([PickupPoint]), AuditModule],
  controllers: [PickupPointsController],
  providers: [PickupPointsService],
  exports: [PickupPointsService],
})
export class PickupPointsModule {}
