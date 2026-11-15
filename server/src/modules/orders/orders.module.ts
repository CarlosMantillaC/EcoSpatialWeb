import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceOrder } from '../../entities/service-order.entity';
import { AuditModule } from '../audit/audit.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceOrder]),
    DispatchModule,
    AuditModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
