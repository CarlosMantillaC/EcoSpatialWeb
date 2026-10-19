import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { VehicleStatus } from '../../entities/vehicle.entity';
import { VehiclesService } from '../vehicles/vehicles.service';

const DRIVERS = [
  'Ana Torres',
  'Luis Vega',
  'Maria Paredes',
  'Jorge Salazar',
  'Carla Mendez',
  'Diego Rojas',
  'Sofia Nunez',
  'Andres Cevallos',
];

const CARGOS = ['general', 'refrigerado', 'fragil', 'express', 'paqueteria'];

const INTERVAL_NAME = 'fleet-simulator';

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

@Injectable()
export class SimulatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);

  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    const enabled = this.config.get<boolean>('simulator.enabled');
    if (!enabled) {
      this.logger.log('Simulador de flota deshabilitado');
      return;
    }

    await this.seedIfEmpty();

    const seconds = this.config.get<number>('simulator.intervalSeconds') ?? 15;
    const interval = setInterval(() => {
      void this.tick().catch((error) =>
        this.logger.error(`Error en el simulador: ${error.message}`),
      );
    }, seconds * 1000);

    this.schedulerRegistry.addInterval(INTERVAL_NAME, interval);
    this.logger.log(`Simulador activo cada ${seconds}s`);
  }

  onModuleDestroy() {
    if (this.schedulerRegistry.doesExist('interval', INTERVAL_NAME)) {
      this.schedulerRegistry.deleteInterval(INTERVAL_NAME);
    }
  }

  private async seedIfEmpty() {
    const count = await this.vehiclesService.count();
    if (count > 0) return;

    const total = this.config.get<number>('simulator.vehicleCount') ?? 12;
    const centerLat = this.config.get<number>('simulator.centerLat') ?? -0.1807;
    const centerLng = this.config.get<number>('simulator.centerLng') ?? -78.4678;

    for (let i = 0; i < total; i += 1) {
      const onRoute = Math.random() < 0.25;
      await this.vehiclesService.create({
        plate: `PBA-${1000 + Math.floor(Math.random() * 9000)}`,
        driverName: DRIVERS[i % DRIVERS.length],
        cargoType: CARGOS[i % CARGOS.length],
        status: onRoute ? VehicleStatus.ON_ROUTE : VehicleStatus.FREE,
        lat: centerLat + randomBetween(-0.04, 0.04),
        lng: centerLng + randomBetween(-0.04, 0.04),
      });
    }
    this.logger.log(`Flota inicial sembrada con ${total} vehiculos`);
  }

  private async tick() {
    const centerLat = this.config.get<number>('simulator.centerLat') ?? -0.1807;
    const centerLng = this.config.get<number>('simulator.centerLng') ?? -78.4678;
    const vehicles = await this.vehiclesService.findAll();

    for (const vehicle of vehicles) {
      const lat =
        vehicle.lat + randomBetween(-0.0015, 0.0015);
      const lng =
        vehicle.lng + randomBetween(-0.0015, 0.0015);

      const clampedLat =
        Math.abs(lat - centerLat) > 0.05 ? centerLat : lat;
      const clampedLng =
        Math.abs(lng - centerLng) > 0.05 ? centerLng : lng;

      await this.vehiclesService.updatePosition(vehicle.id, {
        lat: clampedLat,
        lng: clampedLng,
      });

      if (
        vehicle.status === VehicleStatus.ON_ROUTE &&
        Math.random() < 0.1
      ) {
        await this.vehiclesService.setStatus(
          vehicle.id,
          VehicleStatus.FREE,
        );
      }
    }
  }
}
