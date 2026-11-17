import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Driver } from './driver.entity';
import { CargoType } from '../common/cargo-type';

export enum VehicleStatus {
  FREE = 'libre',
  ON_ROUTE = 'en_ruta',
  /** Fuera de servicio: su conductor no esta disponible. */
  UNAVAILABLE = 'no_disponible',
  /** Sin conductor ("Libre"): esperando asignacion. */
  UNASSIGNED = 'sin_conductor',
}

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  plate: string;

  @Column({ name: 'driver_name', type: 'text', nullable: true })
  driverName?: string | null;

  /** Conductor asignado (el nombre se denormaliza en `driverName`). */
  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId?: string | null;

  @ManyToOne(() => Driver, (driver) => driver.vehicles, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'driver_id' })
  driver?: Driver | null;

  @Column({ type: 'enum', enum: VehicleStatus, default: VehicleStatus.FREE })
  status: VehicleStatus;

  @Column('double precision')
  lat: number;

  @Column('double precision')
  lng: number;

  /**
   * Capacidad del vehiculo: es el UNICO tipo de carga que transporta.
   * La asignacion de despachos exige coincidencia exacta con el tipo
   * pedido por la operadora.
   */
  @Column({ type: 'enum', enum: CargoType, default: CargoType.GENERAL })
  cargoType: CargoType;

  @UpdateDateColumn({ name: 'last_update', type: 'timestamptz' })
  lastUpdate: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
