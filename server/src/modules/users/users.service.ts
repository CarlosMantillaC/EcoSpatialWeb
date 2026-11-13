import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

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
    data: { id?: string; email: string; name: string },
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
