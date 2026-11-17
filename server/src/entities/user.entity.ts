import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Credential } from './credential.entity';

/**
 * Roles de la plataforma:
 * - `admin`: gestiona maestros (puntos de recogida, vehiculos, conductores
 *   y usuarios). No opera despachos.
 * - `operator`: crea y gestiona ordenes y despachos sobre el mapa.
 */
export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.OPERATOR })
  role: UserRole;

  @OneToMany(() => Credential, (credential) => credential.user, {
    cascade: true,
  })
  credentials: Credential[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
