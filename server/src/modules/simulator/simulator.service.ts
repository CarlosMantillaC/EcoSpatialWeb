import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Coords } from '../../common/geo';
import { Vehicle, VehicleStatus } from '../../entities/vehicle.entity';
import { FleetEventsService } from '../events/fleet-events.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { RoutingService } from '../routing/routing.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { randomWaypoint, wanderStep, type WanderState } from './wander';

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

/** Peticiones OSRM de deambulacion simultaneas por tick (ritmo del demo). */
const MAX_ROUTE_REQUESTS_PER_TICK = 2;

/** Pausa "estacionado" tras llegar a un destino, en ticks. */
const PAUSE_TICKS_MIN = 4;
const PAUSE_TICKS_MAX = 8;

@Injectable()
export class SimulatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);

  /**
   * Rutas de deambulacion en memoria, por vehiculo. Si el servidor
   * reinicia, cada vehiculo simplemente pide una ruta nueva: es solo
   * simulacion, no hay estado que perder.
   */
  private readonly wanderers = new Map<string, WanderState>();

  /** Ticks restantes de pausa (estacionado) por vehiculo. */
  private readonly pausedTicks = new Map<string, number>();

  private intervalSec = 3;

  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly dispatchService: DispatchService,
    private readonly routingService: RoutingService,
    private readonly fleetEvents: FleetEventsService,
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
    await this.publishFleet();

    this.intervalSec =
      this.config.get<number>('simulator.intervalSeconds') ?? 3;
    const interval = setInterval(() => {
      void this.tick().catch((error) =>
        this.logger.error(`Error en el simulador: ${error.message}`),
      );
    }, this.intervalSec * 1000);

    this.schedulerRegistry.addInterval(INTERVAL_NAME, interval);
    this.logger.log(`Simulador activo cada ${this.intervalSec}s`);
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
    const center = this.center();

    for (let i = 0; i < total; i += 1) {
      const onRoute = Math.random() < 0.25;
      // Punto aleatorio del area; luego queda "snapped" a una calle
      // real en cuanto el simulador le asigna su primera ruta.
      const point = randomWaypoint(center, center, 0, 4.5);
      await this.vehiclesService.create({
        plate: `PBA-${1000 + Math.floor(Math.random() * 9000)}`,
        driverName: DRIVERS[i % DRIVERS.length],
        cargoType: CARGOS[i % CARGOS.length],
        status: onRoute ? VehicleStatus.ON_ROUTE : VehicleStatus.FREE,
        lat: point.lat,
        lng: point.lng,
      });
    }
    this.logger.log(`Flota inicial sembrada con ${total} vehiculos`);
  }

  private async tick() {
    const dispatchedVehicleIds = await this.advanceActiveDispatches();
    const vehicles = await this.vehiclesService.findAll();

    // Presupuesto de peticiones OSRM por tick: las rutas se piden de a
    // pocas para respetar el ritmo del servidor publico de demo.
    let routeBudget = MAX_ROUTE_REQUESTS_PER_TICK;

    for (const vehicle of vehicles) {
      // Los vehiculos con despacho activo ya avanzaron sobre su ruta.
      if (dispatchedVehicleIds.has(vehicle.id)) {
        this.wanderers.delete(vehicle.id);
        this.pausedTicks.delete(vehicle.id);
        continue;
      }

      // Trafico de fondo: solo los "en_ruta" sin despacho se liberan
      // solos. Nunca un vehiculo con viaje asignado.
      if (vehicle.status === VehicleStatus.ON_ROUTE && Math.random() < 0.1) {
        await this.vehiclesService.setStatus(vehicle.id, VehicleStatus.FREE);
      }

      await this.advanceWanderer(vehicle, () => {
        if (routeBudget <= 0) return false;
        routeBudget -= 1;
        return true;
      });
    }

    await this.publishFleet();
  }

  /**
   * Desplaza un vehiculo sin despacho a lo largo de una ruta OSRM real
   * (nunca sobre casas: sin ruta disponible, el vehiculo espera quieto).
   */
  private async advanceWanderer(
    vehicle: Vehicle,
    tryConsumeBudget: () => boolean,
  ): Promise<void> {
    const paused = this.pausedTicks.get(vehicle.id) ?? 0;
    if (paused > 0) {
      this.pausedTicks.set(vehicle.id, paused - 1);
      return;
    }

    let state = this.wanderers.get(vehicle.id);

    if (!state) {
      // Sin ruta asignada: el vehiculo se queda donde esta hasta que
      // haya presupuesto de peticiones OSRM (nunca random walk).
      if (!tryConsumeBudget()) return;
      const next = await this.buildWanderRoute(vehicle);
      if (next) this.wanderers.set(vehicle.id, next);
      return;
    }

    const step = wanderStep(state, this.intervalSec);
    await this.vehiclesService.updatePosition(vehicle.id, step.position);

    if (step.arrived) {
      // Llego al destino: se "estaciona" unos ticks y pide otra ruta.
      this.wanderers.delete(vehicle.id);
      const pause =
        PAUSE_TICKS_MIN +
        Math.floor(Math.random() * (PAUSE_TICKS_MAX - PAUSE_TICKS_MIN + 1));
      this.pausedTicks.set(vehicle.id, pause);
    } else {
      this.wanderers.set(vehicle.id, step.state);
    }
  }

  /** Pide a OSRM una ruta real desde la posicion actual del vehiculo. */
  private async buildWanderRoute(vehicle: Vehicle): Promise<WanderState | null> {
    const center = this.center();
    let from: Coords = { lat: vehicle.lat, lng: vehicle.lng };

    // Si el vehiculo quedo fuera del area de operacion (p. ej. flota de
    // otra ciudad), se reubica dentro del area antes de trazar la ruta.
    const MAX_RADIUS_DEG = 0.06;
    if (
      Math.abs(from.lat - center.lat) > MAX_RADIUS_DEG ||
      Math.abs(from.lng - center.lng) > MAX_RADIUS_DEG
    ) {
      from = randomWaypoint(center, center, 0, 4.5);
      await this.vehiclesService.updatePosition(vehicle.id, from);
    }

    const to = randomWaypoint(from, center);
    try {
      const route = await this.routingService.route(from, to);
      return {
        geometry: route.geometry.coordinates,
        from,
        to,
        progress: 0,
        durationSec: Math.max(route.durationMin * 60, 30),
      };
    } catch (error) {
      // OSRM caido: el vehiculo espera quieto y se reintenta luego.
      this.logger.warn(
        `Sin ruta de deambulacion para ${vehicle.plate}: ${
          (error as Error).message
        }`,
      );
      return null;
    }
  }

  /**
   * Mueve cada vehiculo con despacho activo a lo largo de su ruta y
   * completa el servicio al llegar al destino. Devuelve los ids de
   * vehiculos gestionados aqui (para no moverlos con deambulacion).
   */
  private async advanceActiveDispatches(): Promise<Set<string>> {
    const active = await this.dispatchService.findActive();
    const handled = new Set<string>();

    for (const view of active) {
      const { dispatch, vehicle, progress } = view;
      handled.add(vehicle.id);

      if (progress >= 1) {
        try {
          await this.dispatchService.complete(dispatch.id);
          this.fleetEvents.emit('dispatch-completed', {
            dispatchId: dispatch.id,
            vehicleId: vehicle.id,
          });
          this.logger.log(
            `Despacho ${dispatch.id} completado automaticamente (${vehicle.plate})`,
          );
        } catch (error) {
          this.logger.error(
            `No se pudo auto-completar ${dispatch.id}: ${error.message}`,
          );
        }
        continue;
      }

      const position = this.dispatchService.positionOf(dispatch, progress);
      await this.vehiclesService.updatePosition(vehicle.id, position);
    }

    return handled;
  }

  private center(): Coords {
    return {
      lat: this.config.get<number>('simulator.centerLat') ?? 7.889,
      lng: this.config.get<number>('simulator.centerLng') ?? -72.4967,
    };
  }

  /** Emite el estado completo de flota a los clientes SSE. */
  private async publishFleet() {
    const [vehicles, activeDispatches] = await Promise.all([
      this.vehiclesService.findAll(),
      this.dispatchService.findActive(),
    ]);
    this.fleetEvents.emit('fleet', { vehicles, activeDispatches });
  }
}
