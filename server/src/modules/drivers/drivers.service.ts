import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver, DriverStatus } from '../../entities/driver.entity';
import { Vehicle, VehicleStatus } from '../../entities/vehicle.entity';
import { definedProps } from '../../common/objects';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driversRepository: Repository<Driver>,
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
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
    Object.assign(driver, definedProps(dto));
    const saved = await this.driversRepository.save(driver);
    // La disponibilidad del conductor manda sobre sus vehiculos.
    if (dto.status !== undefined) {
      await this.syncVehicles(saved);
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    const driver = await this.findOne(id);
    if (driver.status === DriverStatus.ON_TRIP) {
      throw new BadRequestException(
        'El conductor tiene un viaje en curso; completa o cancela el despacho antes de eliminarlo',
      );
    }
    // Sus vehiculos quedan sin conductor y pasan a Libre ("sin_conductor")
    // para poder asignarse a un conductor nuevo. Un vehiculo en_ruta solo
    // se desvincula: termina su viaje y queda Libre.
    const vehicles = await this.vehiclesRepository.find({
      where: { driverId: id },
    });
    for (const vehicle of vehicles) {
      vehicle.driverId = null;
      vehicle.driverName = null;
      if (vehicle.status !== VehicleStatus.ON_ROUTE) {
        vehicle.status = VehicleStatus.UNASSIGNED;
      }
      await this.vehiclesRepository.save(vehicle);
    }
    await this.driversRepository.remove(driver);
  }

  async setStatus(id: string, status: DriverStatus): Promise<Driver> {
    return this.update(id, { status });
  }

  /**
   * Los vehiculos siguen la disponibilidad del conductor: si se marca
   * `fuera`, sus vehiculos libres quedan `no_disponible` (y viceversa).
   * Un vehiculo `en_ruta` nunca se toca: termina su viaje primero.
   */
  private async syncVehicles(driver: Driver): Promise<void> {
    const vehicles = await this.vehiclesRepository.find({
      where: { driverId: driver.id },
    });
    for (const vehicle of vehicles) {
      if (
        driver.status === DriverStatus.OFF &&
        vehicle.status === VehicleStatus.FREE
      ) {
        vehicle.status = VehicleStatus.UNAVAILABLE;
        await this.vehiclesRepository.save(vehicle);
      } else if (
        driver.status === DriverStatus.AVAILABLE &&
        vehicle.status === VehicleStatus.UNAVAILABLE
      ) {
        vehicle.status = VehicleStatus.FREE;
        await this.vehiclesRepository.save(vehicle);
      }
    }
  }

  count(): Promise<number> {
    return this.driversRepository.count();
  }
}
