import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RoutingService } from './routing.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}
