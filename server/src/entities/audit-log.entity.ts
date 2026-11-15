import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Bitacora de auditoria: registra las acciones sensibles de los
 * operadores autenticados (WebAuthn/JWT) sobre el negocio.
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ name: 'user_email', type: 'text', nullable: true })
  userEmail?: string | null;

  /** Accion en formato "entidad.accion" (ej. "dispatch.approve"). */
  @Column({ type: 'text' })
  action: string;

  @Column({ name: 'entity_type', type: 'text' })
  entityType: string;

  @Column({ name: 'entity_id', type: 'text', nullable: true })
  entityId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  detail?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
