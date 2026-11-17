import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle, VehicleStatus } from '../../entities/vehicle.entity';
import { Driver, DriverStatus } from '../../entities/driver.entity';
import { Coords, haversineKm } from '../../common/geo';
import { definedProps } from '../../common/objects';
import { CargoType } from '../../common/cargo-type';
import { DriversService } from '../drivers/drivers.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    private readonly driversService: DriversService,
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

  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    const driver = dto.driverId
      ? await this.assignableDriver(dto.driverId)
      : null;
    const vehicle = this.vehiclesRepository.create({
      ...dto,
      driverName: driver?.name ?? dto.driverName,
      status:
        dto.status ??
        (!driver
          ? VehicleStatus.UNASSIGNED
          : driver.status === DriverStatus.OFF
            ? VehicleStatus.UNAVAILABLE
            : VehicleStatus.FREE),
    });
    try {
      return await this.vehiclesRepository.save(vehicle);
    } catch (error) {
      // Violacion del constraint unique de placa (Postgres: 23505).
      const code =
        (error as { code?: string }).code ??
        (error as { driverError?: { code?: string } }).driverError?.code;
      if (code === '23505') {
        throw new ConflictException(
          `Ya existe un vehiculo con la placa ${dto.plate}`,
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findOne(id);
    const patch: Partial<Vehicle> = { ...definedProps(dto) };

    if (dto.driverId !== undefined && dto.driverId !== null) {
      // Se asigna conductor: el nombre se denormaliza y la disponibilidad
      // del vehiculo sigue la del conductor.
      const driver = await this.assignableDriver(dto.driverId, vehicle.id);
      if (vehicle.driverId && vehicle.driverId !== dto.driverId) {
        throw new ConflictException(
          `El vehiculo ${vehicle.plate} ya tiene asignado a ${
            vehicle.driverName ?? 'otro conductor'
          }; desasignalo primero`,
        );
      }
      patch.driverName = driver.name;
      if (dto.status === undefined) {
        patch.status = this.statusForDriver(driver, vehicle.status);
      }
    } else if (dto.driverId === null) {
      // Se desasigna el conductor: el vehiculo queda Libre (sin conductor)
      // para poder asignarse a otro. Un vehiculo en_ruta termina su viaje.
      patch.driverName = null;
      if (dto.status === undefined && vehicle.status !== VehicleStatus.ON_ROUTE) {
        patch.status = VehicleStatus.UNASSIGNED;
      }
    }

    Object.assign(vehicle, patch);
    return this.vehiclesRepository.save(vehicle);
  }

  /**
   * Restriccion 1:1 — una persona conduce un solo vehiculo a la vez.
   * El conductor no puede estar ya asignado a otro vehiculo.
   */
  private async assignableDriver(
    driverId: string,
    vehicleId?: string,
  ): Promise<Driver> {
    const driver = await this.driversService.findOne(driverId);
    const vehicles = await this.vehiclesRepository.find({ where: { driverId } });
    const other = vehicles.find((vehicle) => vehicle.id !== vehicleId);
    if (other) {
      throw new ConflictException(
        `El conductor ${driver.name} ya esta asignado al vehiculo ${other.plate}; desasignalo primero`,
      );
    }
    return driver;
  }

  /**
   * Libera el vehiculo tras un viaje: `libre` si su conductor esta
   * disponible, `no_disponible` si esta fuera y `sin_conductor` (Libre)
   * si no tiene conductor.
   */
  async release(id: string): Promise<Vehicle> {
    const vehicle = await this.findOne(id);
    const driver = vehicle.driverId
      ? await this.driversService.findOne(vehicle.driverId)
      : null;
    return this.update(id, {
      status: !driver
        ? VehicleStatus.UNASSIGNED
        : driver.status === DriverStatus.OFF
          ? VehicleStatus.UNAVAILABLE
          : VehicleStatus.FREE,
    });
  }

  /** Estado del vehiculo segun la disponibilidad del conductor. */
  private statusForDriver(driver: Driver, current: VehicleStatus): VehicleStatus {
    if (current === VehicleStatus.ON_ROUTE) {
      return VehicleStatus.ON_ROUTE;
    }
    return driver.status === DriverStatus.OFF
      ? VehicleStatus.UNAVAILABLE
      : VehicleStatus.FREE;
  }

  async remove(id: string): Promise<void> {
    const vehicle = await this.findOne(id);
    await this.vehiclesRepository.remove(vehicle);
  }

  /**
   * Vehiculo libre mas cercano a `target` cuyo tipo de capacidad coincida
   * EXACTAMENTE con el tipo de carga pedido: un envio refrigerado jamas
   * se asigna a un vehiculo general (y viceversa).
   */
  async findNearestFreeForCargo(
    target: Coords,
    cargoType: CargoType,
  ): Promise<Vehicle | null> {
    const free = await this.vehiclesRepository.find({
      where: { status: VehicleStatus.FREE, cargoType },
    });
    if (free.length === 0) return null;
    return free.reduce((nearest, current) =>
      haversineKm(target, current) < haversineKm(target, nearest)
        ? current
        : nearest,
    );
  }

  async findFreeById(id: string): Promise<Vehicle | null> {
    return this.vehiclesRepository.findOne({
      where: { id, status: VehicleStatus.FREE },
    });
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
