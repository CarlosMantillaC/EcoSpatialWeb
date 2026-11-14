import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { FleetEventsService } from './fleet-events.service';

@Module({
  controllers: [EventsController],
  providers: [FleetEventsService],
  exports: [FleetEventsService],
})
export class EventsModule {}
