import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum DispatchStatus {
  PENDING = 'pendiente',
  ASSIGNED = 'asignado',
  COMPLETED = 'completado',
  CANCELLED = 'cancelado',
}

@Entity('dispatches')
export class Dispatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'origin_lat', type: 'double precision' })
  originLat: number;

  @Column({ name: 'origin_lng', type: 'double precision' })
  originLng: number;

  @Column({ name: 'dest_lat', type: 'double precision' })
  destLat: number;

  @Column({ name: 'dest_lng', type: 'double precision' })
  destLng: number;

  @Column({ name: 'dest_label', type: 'text', nullable: true })
  destLabel?: string | null;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId?: string | null;

  @Column({ name: 'distance_km', type: 'double precision', nullable: true })
  distanceKm?: number | null;

  @Column({ name: 'duration_min', type: 'double precision', nullable: true })
  durationMin?: number | null;

  @Column({ type: 'enum', enum: DispatchStatus, default: DispatchStatus.PENDING })
  status: DispatchStatus;

  @Column({ name: 'route_geometry', type: 'jsonb', nullable: true })
  routeGeometry?: any | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
