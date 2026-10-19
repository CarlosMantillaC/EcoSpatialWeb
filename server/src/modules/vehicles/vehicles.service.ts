import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle, VehicleStatus } from '../../entities/vehicle.entity';
import { Coords, haversineKm } from '../../common/geo';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
  ) {}

  findAll(status?: VehicleStatus): Promise<Vehicle[]> {
    return this.vehiclesRepository.find({
      where: status ? { status } : {},
      order: { plate: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehiculo ${id} no encontrado`);
    }
    return vehicle;
  }

  create(dto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = this.vehiclesRepository.create(dto);
    return this.vehiclesRepository.save(vehicle);
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findOne(id);
    Object.assign(vehicle, dto);
    return this.vehiclesRepository.save(vehicle);
  }

  async remove(id: string): Promise<void> {
    const vehicle = await this.findOne(id);
    await this.vehiclesRepository.remove(vehicle);
  }

  async findNearestFree(target: Coords): Promise<Vehicle | null> {
    const free = await this.vehiclesRepository.find({
      where: { status: VehicleStatus.FREE },
    });
    if (free.length === 0) return null;
    return free.reduce((nearest, current) =>
      haversineKm(target, current) < haversineKm(target, nearest)
        ? current
        : nearest,
    );
  }

  async setStatus(id: string, status: VehicleStatus): Promise<Vehicle> {
    return this.update(id, { status });
  }

  async updatePosition(id: string, coords: Coords): Promise<Vehicle> {
    return this.update(id, { lat: coords.lat, lng: coords.lng });
  }

  count(): Promise<number> {
    return this.vehiclesRepository.count();
  }
}
