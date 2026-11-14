import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface FleetEvent {
  event: 'fleet' | 'dispatch-completed';
  data: unknown;
}

/**
 * Bus de eventos en memoria del simulador hacia los clientes SSE.
 * Sin estado persistente: cada conexion recibe un snapshot inicial y
 * luego los eventos emitidos mientras este viva.
 */
@Injectable()
export class FleetEventsService {
  private readonly subject = new Subject<FleetEvent>();

  emit(event: FleetEvent['event'], data: unknown): void {
    this.subject.next({ event, data });
  }

  stream(): Observable<FleetEvent> {
    return this.subject.asObservable();
  }
}
