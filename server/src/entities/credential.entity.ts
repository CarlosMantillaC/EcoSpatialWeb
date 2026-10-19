import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('credentials')
export class Credential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'credential_id', type: 'text' })
  credentialID: string;

  @Column({ name: 'public_key', type: 'text' })
  publicKey: string;

  @Column({ type: 'bigint', default: 0 })
  counter: string;

  @Column({ type: 'text', nullable: true })
  transports?: string | null;

  @Column({ name: 'device_type', type: 'text', nullable: true })
  deviceType?: string | null;

  @Column({ name: 'backed_up', default: false })
  backedUp: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.credentials, { onDelete: 'CASCADE' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;
}
