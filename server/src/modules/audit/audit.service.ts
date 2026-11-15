import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../entities/audit-log.entity';
import type { RequestUser } from '../auth/request-user';

export interface AuditEntry {
  user?: RequestUser | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  detail?: Record<string, unknown> | null;
}

/**
 * Bitacora de auditoria. El registro nunca rompe la operacion principal:
 * si la base falla, solo se avisa en el log del servidor.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.auditRepository.save(
        this.auditRepository.create({
          userId: entry.user?.id ?? null,
          userEmail: entry.user?.email ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          detail: entry.detail ?? null,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo registrar la auditoria ${entry.action}: ${
          (error as Error).message
        }`,
      );
    }
  }

  findAll(options: { action?: string; limit?: number }): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: options.action ? { action: options.action } : {},
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(options.limit ?? 100, 1), 500),
    });
  }
}
