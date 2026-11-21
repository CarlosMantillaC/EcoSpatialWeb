import { Controller, Sse, UseGuards } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { interval, map, merge, Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FleetEventsService } from './fleet-events.service';

const HEARTBEAT_MS = 20_000;

/**
 * Stream SSE de estado de flota. El cliente se conecta con
 * `GET /api/events/dispatch?token=...` (EventSource no soporta headers).
 * El heartbeat evita que los proxies cierren la conexion por inactividad.
 */
@ApiTags('events')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Sin JWT o token invalido/expirado.' })
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly fleetEvents: FleetEventsService) {}

  @ApiOperation({
    summary: 'Stream SSE de flota en tiempo real',
    description:
      'Eventos `fleet` (vehiculos + despachos con progreso), `dispatch-completed` y `alert`, mas un heartbeat `ping` cada 20 s. ' +
      'EventSource no envia headers: pasa el JWT en el query param `token`.',
  })
  @ApiQuery({
    name: 'token',
    required: false,
    type: String,
    description:
      'JWT de la sesion (alternativa al header Authorization, que EventSource no puede enviar).',
  })
  @ApiOkResponse({
    description:
      'Flujo `text/event-stream`. Cada mensaje trae `event` y `data` JSON.',
  })
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
