import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: normalizeEmail(email) },
    });
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'ASC' } });
  }

  /** Perfil pre-creado por un administrador (aun sin dispositivos). */
  async createWithRole(data: {
    email: string;
    name: string;
    role: UserRole;
  }): Promise<User> {
    return this.create(data);
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    if (user.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
      const admins = await this.usersRepository.count({
        where: { role: UserRole.ADMIN },
      });
      if (admins <= 1) {
        throw new BadRequestException(
          'No puedes quitar el rol administrador: es el unico admin del sistema',
        );
      }
    }
    user.role = role;
    return this.usersRepository.save(user);
  }

  findByEmailWithCredentials(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: normalizeEmail(email) },
      relations: { credentials: true },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  findByIdWithCredentials(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: { credentials: true },
    });
  }

  async create(
    data: { id?: string; email: string; name: string; role?: UserRole },
    manager?: EntityManager,
  ): Promise<User> {
    const repository = manager
      ? manager.getRepository(User)
      : this.usersRepository;
    const user = repository.create({
      ...data,
      email: normalizeEmail(data.email),
    });
    try {
      return await repository.save(user);
    } catch (error) {
      // Violacion del constraint unique de email (Postgres: 23505).
      const code =
        (error as { code?: string }).code ??
        (error as { driverError?: { code?: string } }).driverError?.code;
      if (code === '23505') {
        throw new ConflictException(
          'Ya existe una cuenta registrada con ese correo',
        );
      }
      throw error;
    }
  }
}
