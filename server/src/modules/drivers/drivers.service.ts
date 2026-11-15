import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver, DriverStatus } from '../../entities/driver.entity';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driversRepository: Repository<Driver>,
  ) {}

  findAll(status?: DriverStatus): Promise<Driver[]> {
    return this.driversRepository.find({
      where: status ? { status } : {},
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Driver> {
    const driver = await this.driversRepository.findOne({ where: { id } });
    if (!driver) {
      throw new NotFoundException(`Conductor ${id} no encontrado`);
    }
    return driver;
  }

  create(dto: CreateDriverDto): Promise<Driver> {
    const driver = this.driversRepository.create(dto);
    return this.driversRepository.save(driver);
  }

  async update(id: string, dto: UpdateDriverDto): Promise<Driver> {
    const driver = await this.findOne(id);
    Object.assign(driver, dto);
    return this.driversRepository.save(driver);
  }

  async remove(id: string): Promise<void> {
    const driver = await this.findOne(id);
    await this.driversRepository.remove(driver);
  }

  async setStatus(id: string, status: DriverStatus): Promise<Driver> {
    return this.update(id, { status });
  }

  count(): Promise<number> {
    return this.driversRepository.count();
  }
}
