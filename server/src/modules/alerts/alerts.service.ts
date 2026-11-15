import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  Alert,
  AlertSeverity,
  AlertType,
} from '../../entities/alert.entity';
import { FleetEventsService } from '../events/fleet-events.service';

export interface CreateAlertInput {
  type: AlertType;
  message: string;
  severity?: AlertSeverity;
  vehicleId?: string | null;
  dispatchId?: string | null;
}

/**
 * Genera alertas operativas y las emite a los clientes SSE de inmediato.
 */
@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertsRepository: Repository<Alert>,
    private readonly fleetEvents: FleetEventsService,
  ) {}

  async create(input: CreateAlertInput): Promise<Alert> {
    const alert = await this.alertsRepository.save(
      this.alertsRepository.create({
        type: input.type,
        severity: input.severity ?? AlertSeverity.INFO,
        message: input.message,
        vehicleId: input.vehicleId ?? null,
        dispatchId: input.dispatchId ?? null,
      }),
    );
    this.fleetEvents.emit('alert', alert);
    return alert;
  }

  findAll(unreadOnly = false): Promise<Alert[]> {
    return this.alertsRepository.find({
      where: unreadOnly ? { readAt: IsNull() } : {},
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  countUnread(): Promise<number> {
    return this.alertsRepository.count({ where: { readAt: IsNull() } });
  }

  async markRead(id: string): Promise<Alert> {
    const alert = await this.alertsRepository.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException(`Alerta ${id} no encontrada`);
    }
    if (!alert.readAt) {
      alert.readAt = new Date();
      await this.alertsRepository.save(alert);
    }
    return alert;
  }

  async markAllRead(): Promise<{ updated: number }> {
    const result = await this.alertsRepository
      .createQueryBuilder()
      .update()
      .set({ readAt: new Date() })
      .where('read_at IS NULL')
      .execute();
    return { updated: result.affected ?? 0 };
  }
}
