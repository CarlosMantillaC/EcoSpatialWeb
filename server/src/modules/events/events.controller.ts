import { Controller, Sse, UseGuards } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { interval, map, merge, Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FleetEventsService } from './fleet-events.service';

const HEARTBEAT_MS = 20_000;

/**
 * Stream SSE de estado de flota. El cliente se conecta con
 * `GET /api/events/dispatch?token=...` (EventSource no soporta headers).
 * El heartbeat evita que los proxies cierren la conexion por inactividad.
 */
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly fleetEvents: FleetEventsService) {}

  @Sse('dispatch')
  dispatch(): Observable<MessageEvent> {
    const events$ = this.fleetEvents.stream().pipe(
      map((event) => ({
        type: event.event,
        data: JSON.stringify(event.data),
      })),
    );

    const heartbeat$ = interval(HEARTBEAT_MS).pipe(
      map(() => ({ data: 'ping' } as MessageEvent)),
    );

    return merge(events$, heartbeat$);
  }
}
