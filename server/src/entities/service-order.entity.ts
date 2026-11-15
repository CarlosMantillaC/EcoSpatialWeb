import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ServiceOrderStatus {
  PENDING = 'pendiente',
  ASSIGNED = 'asignada',
  COMPLETED = 'completada',
  CANCELLED = 'cancelada',
}

export enum ServiceOrderPriority {
  LOW = 'baja',
  MEDIUM = 'media',
  HIGH = 'alta',
}

@Entity('service_orders')
export class ServiceOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_name' })
  clientName: string;

  @Column({ type: 'text', nullable: true })
  contact?: string | null;

  @Column({ name: 'dest_lat', type: 'double precision' })
  destLat: number;

  @Column({ name: 'dest_lng', type: 'double precision' })
  destLng: number;

  @Column({ name: 'dest_label', type: 'text', nullable: true })
  destLabel?: string | null;

  @Column({
    type: 'enum',
    enum: ServiceOrderPriority,
    default: ServiceOrderPriority.MEDIUM,
  })
  priority: ServiceOrderPriority;

  /** Ventana horaria deseada de entrega (informativa para el despachador). */
  @Column({ name: 'window_start', type: 'timestamptz', nullable: true })
  windowStart?: Date | null;

  @Column({ name: 'window_end', type: 'timestamptz', nullable: true })
  windowEnd?: Date | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({
    type: 'enum',
    enum: ServiceOrderStatus,
    default: ServiceOrderStatus.PENDING,
  })
  status: ServiceOrderStatus;

  /** Despacho que esta sirviendo esta orden (trazabilidad orden -> viaje). */
  @Column({ name: 'dispatch_id', type: 'uuid', nullable: true })
  dispatchId?: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
