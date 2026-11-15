import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AlertType {
  GEOFENCE = 'geocerca',
  SPEED = 'velocidad',
  ARRIVAL = 'llegada',
  SYSTEM = 'sistema',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AlertType })
  type: AlertType;

  @Column({ type: 'enum', enum: AlertSeverity, default: AlertSeverity.INFO })
  severity: AlertSeverity;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId?: string | null;

  @Column({ name: 'dispatch_id', type: 'uuid', nullable: true })
  dispatchId?: string | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
