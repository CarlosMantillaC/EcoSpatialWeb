import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PickupPointsModule } from '../pickup-points/pickup-points.module';
import { UsersModule } from '../users/users.module';
import { BootstrapService } from './bootstrap.service';

/** Siembra idempotente al arrancar (admin, sucursales, ordenes demo). */
@Module({
  imports: [UsersModule, PickupPointsModule, OrdersModule],
  providers: [BootstrapService],
})
export class BootstrapModule {}
