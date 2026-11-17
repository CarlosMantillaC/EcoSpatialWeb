import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Punto de recogida (sucursal / almacen) donde los vehiculos cargan el
 * envio antes de llevarlo al destino. Solo el administrador los crea;
 * se desactivan (`active = false`) en vez de borrarse para conservar la
 * trazabilidad de los despachos historicos.
 */
@Entity('pickup_points')
export class PickupPoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column('double precision')
  lat: number;

  @Column('double precision')
  lng: number;

  @Column({ default: true })
  active: boolean;

  @UpdateDateColumn({ name: 'last_update', type: 'timestamptz' })
  lastUpdate: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
