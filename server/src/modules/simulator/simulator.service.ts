import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Coords } from '../../common/geo';
import {
  isInsideCucuta,
  isRouteInsideCucuta,
} from '../../common/cucuta-boundary';
import { Vehicle, VehicleStatus } from '../../entities/vehicle.entity';
import { AlertSeverity, AlertType } from '../../entities/alert.entity';
import { Driver } from '../../entities/driver.entity';
import { AlertsService } from '../alerts/alerts.service';
import { DriversService } from '../drivers/drivers.service';
import { FleetEventsService } from '../events/fleet-events.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { RoutingService } from '../routing/routing.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import {
  randomWaypointInside,
  wanderStep,
  WANDER_MAX_KM,
  WANDER_MIN_KM,
  type WanderState,
} from './wander';

const DRIVERS = [
  'Ana Torres',
  'Luis Vega',
  'Maria Paredes',
  'Jorge Salazar',
  'Carla Mendez',
  'Diego Rojas',
  'Sofia Nunez',
  'Andres Cevallos',
  'Paula Rios',
  'Camilo Diaz',
  'Valentina Rojas',
  'Hector Salas',
];

const CARGOS = ['general', 'refrigerado', 'fragil', 'express', 'paqueteria'];

const INTERVAL_NAME = 'fleet-simulator';

/** Peticiones OSRM de deambulacion simultaneas por tick (ritmo del demo). */
const MAX_ROUTE_REQUESTS_PER_TICK = 2;

/** Reintentos de destino si la ruta OSRM se sale del perimetro de Cucuta. */
const ROUTE_ATTEMPTS = 3;

/** Centro por defecto (Cucuta) si la configuracion esta fuera del perimetro. */
const DEFAULT_CENTER: Coords = { lat: 7.889, lng: -72.4967 };

/** Pausa "estacionado" tras llegar a un destino, en ticks. */
const PAUSE_TICKS_MIN = 4;
const PAUSE_TICKS_MAX = 8;

/** Umbral de alerta de velocidad para el trafico de fondo (km/h urbanos). */
const SPEED_ALERT_KMH = 55;

/** Enfriamiento entre alertas del mismo tipo para un mismo vehiculo. */
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

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

  /** Enfriamiento de alertas repetidas, por `tipo:vehiculo`. */
  private readonly alertCooldown = new Map<string, number>();

  private intervalSec = 3;

  /** Aviso unico cuando el centro configurado esta fuera de Cucuta. */
  private warnedCenterOutside = false;

  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly driversService: DriversService,
    private readonly dispatchService: DispatchService,
    private readonly routingService: RoutingService,
    private readonly fleetEvents: FleetEventsService,
    private readonly alertsService: AlertsService,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    const enabled = this.config.get<boolean>('simulator.enabled');
    if (!enabled) {
      this.logger.log('Simulador de flota deshabilitado');
      return;
    }

    const drivers = await this.seedDriversIfEmpty();
    await this.seedIfEmpty(drivers);
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

  /** Crea la plantilla de conductores si la tabla esta vacia. */
  private async seedDriversIfEmpty(): Promise<Driver[]> {
    const count = await this.driversService.count();
    if (count > 0) return this.driversService.findAll();

    const drivers: Driver[] = [];
    for (const name of DRIVERS) {
      drivers.push(
        await this.driversService.create({
          name,
          license: `LIC-${1000 + Math.floor(Math.random() * 9000)}`,
        }),
      );
    }
    this.logger.log(`Plantilla de conductores sembrada (${drivers.length})`);
    return drivers;
  }

  /**
   * Vincula conductores existentes a vehiculos por nombre (bases de datos
   * previas a la entidad Driver) y siembra la flota si esta vacia.
   */
  private async seedIfEmpty(drivers: Driver[]) {
    await this.repairDriverLinks(drivers);

    const count = await this.vehiclesService.count();
    if (count > 0) return;

    const total = this.config.get<number>('simulator.vehicleCount') ?? 12;
    const center = this.center();

    for (let i = 0; i < total; i += 1) {
      const onRoute = Math.random() < 0.25;
      // Regla 1:1 — cada conductor conduce un solo vehiculo; los vehiculos
      // sobrantes quedan sin conductor y se les puede asignar desde el panel.
      const driver = i < drivers.length ? drivers[i] : null;
      // Punto aleatorio del area (dentro del perimetro de Cucuta); luego
      // queda "snapped" a una calle real en cuanto el simulador le asigna
      // su primera ruta.
      const point = randomWaypointInside(
        center,
        center,
        0,
        4.5,
        isInsideCucuta,
      );
      await this.vehiclesService.create({
        plate: `PBA-${1000 + Math.floor(Math.random() * 9000)}`,
        driverId: driver?.id ?? null,
        driverName: driver?.name ?? null,
        cargoType: CARGOS[i % CARGOS.length],
        // Sin conductor el vehiculo queda Libre ("sin_conductor"), salvo
        // el trafico de fondo sembrado en_ruta.
        ...(onRoute ? { status: VehicleStatus.ON_ROUTE } : {}),
        lat: point.lat,
        lng: point.lng,
      });
    }
    this.logger.log(`Flota inicial sembrada con ${total} vehiculos`);
  }

  /**
   * Repara los vinculos conductor-vehiculo al arrancar (datos heredados
   * de versiones previas). Regla 1:1: un conductor conduce un vehiculo.
   * - Conductores en varios vehiculos: se conserva el vinculo mas antiguo.
   * - Vehiculos sin conductor: quedan Libre ("sin_conductor") y se limpia
   *   cualquier nombre heredado.
   * - Vehiculos sin vinculo cuyo nombre coincide con un conductor: se
   *   vinculan.
   */
  private async repairDriverLinks(drivers: Driver[]) {
    const byName = new Map(drivers.map((driver) => [driver.name, driver]));
    const byId = new Map(drivers.map((driver) => [driver.id, driver]));
    const vehicles = await this.vehiclesService.findAll();
    const linked = new Set<string>();

    // Vinculos existentes: un solo vehiculo por conductor.
    for (const vehicle of vehicles) {
      if (!vehicle.driverId) continue;
      if (linked.has(vehicle.driverId)) {
        await this.vehiclesService.update(vehicle.id, { driverId: null });
        continue;
      }
      linked.add(vehicle.driverId);
      const driver = byId.get(vehicle.driverId);
      if (driver && vehicle.driverName !== driver.name) {
        await this.vehiclesService.update(vehicle.id, {
          driverName: driver.name,
        });
      }
    }

    // Vehiculos sin vinculo: se vinculan si el nombre coincide con un
    // conductor libre; si no (conductor borrado con datos heredados o
    // vehiculo nuevo), quedan Libre ("sin_conductor") para asignar a un
    // conductor nuevo. Un vehiculo en_ruta solo se limpia al terminar.
    for (const vehicle of vehicles) {
      if (vehicle.driverId) continue;
      const driver = vehicle.driverName
        ? byName.get(vehicle.driverName)
        : undefined;
      if (driver && !linked.has(driver.id)) {
        linked.add(driver.id);
        await this.vehiclesService.update(vehicle.id, { driverId: driver.id });
      } else if (
        vehicle.driverName ||
        vehicle.status === VehicleStatus.FREE ||
        vehicle.status === VehicleStatus.UNAVAILABLE
      ) {
        await this.vehiclesService.update(vehicle.id, { driverId: null });
      }
    }
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

      // Fuera de servicio o sin conductor (Libre): estacionado.
      if (
        vehicle.status === VehicleStatus.UNAVAILABLE ||
        vehicle.status === VehicleStatus.UNASSIGNED
      ) {
        this.wanderers.delete(vehicle.id);
        this.pausedTicks.delete(vehicle.id);
        continue;
      }

      // Trafico de fondo: solo los "en_ruta" sin despacho se liberan
      // solos. Nunca un vehiculo con viaje asignado. `release` respeta
      // la disponibilidad del conductor.
      if (vehicle.status === VehicleStatus.ON_ROUTE && Math.random() < 0.1) {
        await this.vehiclesService.release(vehicle.id);
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

    // Guarda final: ninguna posicion fuera del perimetro de Cucuta llega
    // al frontend (p. ej. rutas heredadas que cruzan la frontera).
    if (!isInsideCucuta(step.position)) {
      this.wanderers.delete(vehicle.id);
      const safe = this.randomPointInArea();
      await this.vehiclesService.updatePosition(vehicle.id, safe);
      await this.maybeAlert(
        AlertType.GEOFENCE,
        vehicle,
        `El vehiculo ${vehicle.plate} salio del perimetro de operacion y fue reubicado dentro de Cucuta`,
        AlertSeverity.WARNING,
      );
      return;
    }

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
    // otra ciudad o datos previos al geofence), se reubica dentro del
    // perimetro de Cucuta antes de trazar la ruta.
    const MAX_RADIUS_DEG = 0.06;
    if (
      !isInsideCucuta(from) ||
      Math.abs(from.lat - center.lat) > MAX_RADIUS_DEG ||
      Math.abs(from.lng - center.lng) > MAX_RADIUS_DEG
    ) {
      from = this.randomPointInArea();
      await this.vehiclesService.updatePosition(vehicle.id, from);
      await this.maybeAlert(
        AlertType.GEOFENCE,
        vehicle,
        `El vehiculo ${vehicle.plate} estaba fuera del area de operacion y fue reubicado dentro de Cucuta`,
        AlertSeverity.WARNING,
      );
    }

    // El destino se descarta y se sortea de nuevo si la ruta real de
    // OSRM se sale del perimetro (p. ej. calles que cruzan la frontera).
    for (let attempt = 0; attempt < ROUTE_ATTEMPTS; attempt += 1) {
      const to = randomWaypointInside(
        from,
        center,
        WANDER_MIN_KM,
        WANDER_MAX_KM,
        isInsideCucuta,
      );
      try {
        const route = await this.routingService.route(from, to);
        if (!isRouteInsideCucuta(route.geometry.coordinates)) {
          this.logger.warn(
            `Ruta de deambulacion de ${vehicle.plate} sale de Cucuta; se reintenta`,
          );
          continue;
        }
        const speedKmh =
          route.distanceKm / Math.max(route.durationMin / 60, 0.01);
        if (speedKmh > SPEED_ALERT_KMH) {
          await this.maybeAlert(
            AlertType.SPEED,
            vehicle,
            `El vehiculo ${vehicle.plate} registro ${speedKmh.toFixed(
              0,
            )} km/h en su ruta (limite urbano ${SPEED_ALERT_KMH} km/h)`,
            AlertSeverity.WARNING,
          );
        }
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
    return null;
  }

  /** Punto aleatorio dentro del perimetro de Cucuta, cerca del centro. */
  private randomPointInArea(): Coords {
    const center = this.center();
    return randomWaypointInside(center, center, 0, 4.5, isInsideCucuta);
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
      // Guarda final: despachos heredados con ruta fuera de Cucuta no
      // muestran el vehiculo fuera del perimetro; al completarse, el
      // trafico de fondo lo reubica dentro del area.
      if (!isInsideCucuta(position)) continue;
      await this.vehiclesService.updatePosition(vehicle.id, position);
    }

    return handled;
  }

  /**
   * Centro del area de operacion. El geofence es el perimetro urbano de
   * Cucuta: si la configuracion apunta fuera de el, se usa el centro por
   * defecto para que la flota nunca salga de Cucuta.
   */
  private center(): Coords {
    const configured: Coords = {
      lat: this.config.get<number>('simulator.centerLat') ?? DEFAULT_CENTER.lat,
      lng: this.config.get<number>('simulator.centerLng') ?? DEFAULT_CENTER.lng,
    };
    if (isInsideCucuta(configured)) return configured;
    if (!this.warnedCenterOutside) {
      this.warnedCenterOutside = true;
      this.logger.warn(
        `SIMULATOR_CENTER fuera del perimetro de Cucuta (${configured.lat}, ${configured.lng}); se usa el centro por defecto`,
      );
    }
    return DEFAULT_CENTER;
  }

  /**
   * Genera una alerta como maximo una cada ALERT_COOLDOWN_MS por vehiculo
   * y tipo: el trafico simulado no debe saturar la campana de notificaciones.
   */
  private async maybeAlert(
    type: AlertType,
    vehicle: Vehicle,
    message: string,
    severity: AlertSeverity,
  ): Promise<void> {
    const key = `${type}:${vehicle.id}`;
    const now = Date.now();
    const last = this.alertCooldown.get(key) ?? 0;
    if (now - last < ALERT_COOLDOWN_MS) return;
    this.alertCooldown.set(key, now);
    try {
      await this.alertsService.create({
        type,
        severity,
        message,
        vehicleId: vehicle.id,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo generar la alerta ${type}: ${(error as Error).message}`,
      );
    }
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
