import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum VehicleStatus {
  FREE = 'libre',
  ON_ROUTE = 'en_ruta',
}

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  plate: string;

  @Column({ name: 'driver_name', type: 'text', nullable: true })
  driverName?: string;

  @Column({ type: 'enum', enum: VehicleStatus, default: VehicleStatus.FREE })
  status: VehicleStatus;

  @Column('double precision')
  lat: number;

  @Column('double precision')
  lng: number;

  @Column({ name: 'cargo_type', type: 'text', nullable: true })
  cargoType?: string;

  @UpdateDateColumn({ name: 'last_update' })
  lastUpdate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
