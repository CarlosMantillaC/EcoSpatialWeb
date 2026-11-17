import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CargoType } from '../common/cargo-type';

export enum DispatchStatus {
  PENDING = 'pendiente',
  ASSIGNED = 'asignado',
  COMPLETED = 'completado',
  CANCELLED = 'cancelado',
}

/** Fases del viaje con recogida: va a buscar, carga, y entrega. */
export type DispatchPhase = 'to_pickup' | 'loading' | 'to_delivery';

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

  /** Punto de recogida elegido (o sugerido) para cargar el envio. */
  @Column({ name: 'pickup_point_id', type: 'uuid', nullable: true })
  pickupPointId?: string | null;

  /** Snapshot del punto de recogida: sobrevive ediciones del maestro. */
  @Column({ name: 'pickup_lat', type: 'double precision', nullable: true })
  pickupLat?: number | null;

  @Column({ name: 'pickup_lng', type: 'double precision', nullable: true })
  pickupLng?: number | null;

  @Column({ name: 'pickup_label', type: 'text', nullable: true })
  pickupLabel?: string | null;

  /** Tipo de carga exigido por el envio (coincide con el del vehiculo). */
  @Column({ name: 'cargo_type', type: 'enum', enum: CargoType, nullable: true })
  cargoType?: CargoType | null;

  /** Producto/contenido que se recoge y entrega (ej. "Insulina NPH 100UI"). */
  @Column({ name: 'product_label', type: 'text', nullable: true })
  productLabel?: string | null;

  @Column({ type: 'int', nullable: true })
  quantity?: number | null;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId?: string | null;

  /** Orden de servicio que origino este despacho (opcional: viaje ad-hoc). */
  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId?: string | null;

  /** Momento de cierre del servicio (completado); null si sigue activo. */
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  /** Totales del viaje (tramo recogida + tramo entrega). */
  @Column({ name: 'distance_km', type: 'double precision', nullable: true })
  distanceKm?: number | null;

  @Column({ name: 'duration_min', type: 'double precision', nullable: true })
  durationMin?: number | null;

  /** Tramo 1: vehiculo -> punto de recogida. */
  @Column({ name: 'pickup_route_geometry', type: 'jsonb', nullable: true })
  pickupRouteGeometry?: any | null;

  @Column({ name: 'pickup_distance_km', type: 'double precision', nullable: true })
  pickupDistanceKm?: number | null;

  @Column({ name: 'pickup_duration_min', type: 'double precision', nullable: true })
  pickupDurationMin?: number | null;

  @Column({ type: 'enum', enum: DispatchStatus, default: DispatchStatus.PENDING })
  status: DispatchStatus;

  /** Tramo 2: punto de recogida -> destino de entrega. */
  @Column({ name: 'route_geometry', type: 'jsonb', nullable: true })
  routeGeometry?: any | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
