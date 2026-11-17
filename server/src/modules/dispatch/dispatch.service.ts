import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Dispatch,
  DispatchPhase,
  DispatchStatus,
} from '../../entities/dispatch.entity';
import {
  ServiceOrder,
  ServiceOrderStatus,
} from '../../entities/service-order.entity';
import { Vehicle, VehicleStatus } from '../../entities/vehicle.entity';
import { PickupPoint } from '../../entities/pickup-point.entity';
import { CargoType, CARGO_LABELS } from '../../common/cargo-type';
import { Coords, LineStringCoords, positionAlongRoute } from '../../common/geo';
import {
  isInsideCucuta,
  isRouteInsideCucuta,
} from '../../common/cucuta-boundary';
import { AlertSeverity, AlertType } from '../../entities/alert.entity';
import { DriverStatus } from '../../entities/driver.entity';
import { AlertsService } from '../alerts/alerts.service';
import { DriversService } from '../drivers/drivers.service';
import { RoutingService } from '../routing/routing.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';

/** Punto de recogida resuelto (elegido o sugerido por el sistema). */
export interface PickupRef {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string | null;
  /** true si el sistema lo sugirio (la operadora puede cambiarlo). */
  suggested: boolean;
}

/** Tramo de la ruta: vehiculo -> recogida, o recogida -> entrega. */
export interface DispatchLeg {
  distanceKm: number;
  durationMin: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

export interface PreviewResult {
  vehicle: Vehicle;
  pickup: PickupRef;
  cargoType: CargoType;
  productLabel: string;
  quantity: number | null;
  /** Tramo 1 (a recoger) y tramo 2 (a entregar). */
  legs: [DispatchLeg, DispatchLeg];
  /** Totales del viaje (ambos tramos) con geometria concatenada. */
  route: DispatchLeg;
  loadPauseSec: number;
}

/** Despacho activo enriquecido con progreso para el frontend. */
export interface ActiveDispatchView {
  dispatch: Dispatch;
  vehicle: Vehicle;
  /** Avance del viaje en [0, 1]. */
  progress: number;
  /** Segundos restantes del viaje simulado. */
  remainingSec: number;
  origin: Coords;
  destination: Coords;
  /** Punto de recogida del viaje (null en despachos heredados). */
  pickup: { lat: number; lng: number; label: string | null } | null;
  /** Fase actual: va a buscar, esta cargando, o va a entregar. */
  phase: DispatchPhase;
}

/** Reparto del tiempo simulado entre fases del viaje. */
interface TripTimeline {
  hasPickup: boolean;
  totalSec: number;
  leg1Sec: number;
  loadSec: number;
  leg2Sec: number;
}

@Injectable()
export class DispatchService {
  private readonly tripSeconds: number;
  private readonly loadPauseSec: number;

  constructor(
    @InjectRepository(Dispatch)
    private readonly dispatchesRepository: Repository<Dispatch>,
    @InjectRepository(ServiceOrder)
    private readonly ordersRepository: Repository<ServiceOrder>,
    @InjectRepository(PickupPoint)
    private readonly pickupPointsRepository: Repository<PickupPoint>,
    private readonly vehiclesService: VehiclesService,
    private readonly driversService: DriversService,
    private readonly alertsService: AlertsService,
    private readonly routingService: RoutingService,
    config: ConfigService,
  ) {
    this.tripSeconds = config.get<number>('simulator.tripSeconds') ?? 50;
    this.loadPauseSec = config.get<number>('simulator.loadPauseSec') ?? 8;
  }

  /**
   * Avance del viaje derivado de `createdAt` y la duracion simulada:
   * no guarda estado, asi que sobrevive a reinicios del servidor.
   */
  progressOf(dispatch: Dispatch, now: Date = new Date()): number {
    const timeline = this.timelineOf(dispatch);
    const elapsedSec = this.elapsedOf(dispatch, now);
    return Math.min(1, Math.max(0, elapsedSec / timeline.totalSec));
  }

  private elapsedOf(dispatch: Dispatch, now: Date = new Date()): number {
    return (now.getTime() - dispatch.createdAt.getTime()) / 1000;
  }

  /**
   * Reparto del tiempo simulado: tramo a la recogida, pausa de carga y
   * tramo a la entrega, proporcionales a las duraciones OSRM de cada
   * tramo. Sin recogida (despachos heredados) es un unico tramo.
   */
  timelineOf(dispatch: Dispatch): TripTimeline {
    const hasPickup =
      dispatch.pickupLat != null && dispatch.pickupLng != null;
    if (!hasPickup) {
      return {
        hasPickup: false,
        totalSec: this.tripSeconds,
        leg1Sec: 0,
        loadSec: 0,
        leg2Sec: this.tripSeconds,
      };
    }
    const loadSec = Math.min(this.loadPauseSec, this.tripSeconds * 0.3);
    const travelSec = Math.max(1, this.tripSeconds - loadSec);
    const d1 = Math.max(dispatch.pickupDurationMin ?? 0, 0.01);
    const d2 = Math.max(dispatch.durationMin ?? 0, 0.01);
    const leg1Sec = (travelSec * d1) / (d1 + d2);
    return {
      hasPickup: true,
      totalSec: this.tripSeconds,
      leg1Sec,
      loadSec,
      leg2Sec: travelSec - leg1Sec,
    };
  }

  /** Fase del viaje y avance dentro de su tramo actual. */
  phaseOf(
    dispatch: Dispatch,
    elapsedSec: number,
  ): { phase: DispatchPhase; legProgress: number } {
    const timeline = this.timelineOf(dispatch);
    if (!timeline.hasPickup) {
      return {
        phase: 'to_delivery',
        legProgress: Math.min(1, Math.max(0, elapsedSec / timeline.leg2Sec)),
      };
    }
    if (elapsedSec < timeline.leg1Sec) {
      return {
        phase: 'to_pickup',
        legProgress: Math.min(1, elapsedSec / timeline.leg1Sec),
      };
    }
    if (elapsedSec < timeline.leg1Sec + timeline.loadSec) {
      return { phase: 'loading', legProgress: 0 };
    }
    const inLeg2 = elapsedSec - timeline.leg1Sec - timeline.loadSec;
    return {
      phase: 'to_delivery',
      legProgress: Math.min(1, Math.max(0, inLeg2 / timeline.leg2Sec)),
    };
  }

  /**
   * Calcula vehiculo, punto de recogida y rutas sin guardar nada ni
   * tocar estados: sirve para la vista previa antes de aprobar el viaje.
   */
  async preview(dto: CreateDispatchDto): Promise<PreviewResult> {
    const target = { lat: dto.destLat, lng: dto.destLng };
    this.assertDestinationInCucuta(target);
    const { vehicle, pickup, suggested } = await this.resolveAssignment(dto);
    const { legs, route } = await this.planRoutes(
      { lat: vehicle.lat, lng: vehicle.lng },
      { lat: pickup.lat, lng: pickup.lng },
      target,
      vehicle,
    );
    return {
      vehicle,
      pickup: { ...pickup, suggested },
      cargoType: dto.cargoType,
      productLabel: dto.productLabel,
      quantity: dto.quantity ?? null,
      legs,
      route,
      loadPauseSec: this.loadPauseSec,
    };
  }

  async create(dto: CreateDispatchDto) {
    const target = { lat: dto.destLat, lng: dto.destLng };
    this.assertDestinationInCucuta(target);

    // Si el viaje nace de una orden, se valida y se marca como asignada.
    let order: ServiceOrder | null = null;
    if (dto.orderId) {
      order = await this.ordersRepository.findOne({
        where: { id: dto.orderId },
      });
      if (!order) {
        throw new NotFoundException(`Orden ${dto.orderId} no encontrada`);
      }
      if (order.status !== ServiceOrderStatus.PENDING) {
        throw new BadRequestException(
          'La orden ya fue despachada o cancelada',
        );
      }
    }

    // Prefiere el vehiculo de la vista previa si sigue libre; si otro
    // usuario lo tomo primero, asigna el compatible mas cercano.
    const { vehicle, pickup, suggested } = await this.resolveAssignment(
      dto,
      true,
    );

    const alreadyActive = await this.dispatchesRepository.findOne({
      where: {
        vehicleId: vehicle.id,
        status: In([DispatchStatus.PENDING, DispatchStatus.ASSIGNED]),
      },
    });
    if (alreadyActive) {
      throw new BadRequestException(
        'El vehiculo seleccionado ya tiene un despacho activo',
      );
    }

    const origin = { lat: vehicle.lat, lng: vehicle.lng };
    const { legs, route } = await this.planRoutes(
      origin,
      { lat: pickup.lat, lng: pickup.lng },
      target,
      vehicle,
    );

    const dispatch = this.dispatchesRepository.create({
      originLat: origin.lat,
      originLng: origin.lng,
      destLat: target.lat,
      destLng: target.lng,
      destLabel: dto.destLabel ?? order?.destLabel ?? null,
      pickupPointId: pickup.id,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      pickupLabel: pickup.name,
      cargoType: dto.cargoType,
      productLabel: dto.productLabel,
      quantity: dto.quantity ?? null,
      vehicleId: vehicle.id,
      orderId: order?.id ?? null,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      pickupRouteGeometry: legs[0].geometry,
      pickupDistanceKm: legs[0].distanceKm,
      pickupDurationMin: legs[0].durationMin,
      status: DispatchStatus.ASSIGNED,
      routeGeometry: legs[1].geometry,
    });
    const saved = await this.dispatchesRepository.save(dispatch);

    await this.vehiclesService.setStatus(vehicle.id, VehicleStatus.ON_ROUTE);

    if (order) {
      order.status = ServiceOrderStatus.ASSIGNED;
      order.dispatchId = saved.id;
      await this.ordersRepository.save(order);
    }
    if (vehicle.driverId) {
      await this.driversService.setStatus(
        vehicle.driverId,
        DriverStatus.ON_TRIP,
      );
    }

    return {
      dispatch: saved,
      vehicle: await this.vehiclesService.findOne(vehicle.id),
      pickup: { ...pickup, suggested },
      cargoType: dto.cargoType,
      productLabel: dto.productLabel,
      quantity: dto.quantity ?? null,
      legs,
      route,
      loadPauseSec: this.loadPauseSec,
    };
  }

  /** Ningun destino fuera del perimetro urbano de Cucuta. */
  private assertDestinationInCucuta(target: Coords) {
    if (!isInsideCucuta(target)) {
      throw new BadRequestException(
        'El destino debe estar dentro del perimetro urbano de Cucuta',
      );
    }
  }

  private noVehiclesError(cargoType: CargoType) {
    return new BadRequestException(
      `No hay vehiculos tipo '${CARGO_LABELS[cargoType]}' disponibles para asignar; crea o libera vehiculos con esa capacidad`,
    );
  }

  /**
   * Resuelve (vehiculo, punto de recogida):
   * - Con `pickupPointId` explicito: el vehiculo compatible mas cercano
   *   a esa sucursal (la eleccion de la operadora manda).
   * - Sin explicito: la pareja (vehiculo libre compatible, sucursal) que
   *   minimiza la distancia vehiculo -> recogida. La sugerencia es
   *   editable por la operadora.
   * Con `allowFallback`, un vehiculo explicito ya tomado se sustituye por
   * el mas cercano en vez de fallar (al aprobar no se pierde el viaje).
   */
  private async resolveAssignment(
    dto: CreateDispatchDto,
    allowFallback = false,
  ): Promise<{ vehicle: Vehicle; pickup: PickupRef; suggested: boolean }> {
    const points = await this.activePickupPoints();
    if (points.length === 0) {
      throw new BadRequestException(
        'No hay puntos de recogida activos; el administrador debe crear sucursales',
      );
    }

    // Con vehiculo explicito (vista previa): se respeta su eleccion.
    if (dto.vehicleId) {
      const vehicle = await this.vehiclesService.findFreeById(dto.vehicleId);
      if (!vehicle) {
        if (!allowFallback) {
          throw new BadRequestException(
            'El vehiculo elegido ya no esta disponible; calcula la vista previa de nuevo',
          );
        }
        return this.resolveAssignment(
          { ...dto, vehicleId: undefined },
          allowFallback,
        );
      }
      if (vehicle.cargoType !== dto.cargoType) {
        throw new BadRequestException(
          `El vehiculo ${vehicle.plate} transporta carga tipo '${vehicle.cargoType}' y no puede llevar un envio tipo '${dto.cargoType}'`,
        );
      }
      const { pickup, suggested } = await this.resolvePickup(dto, vehicle);
      return { vehicle, pickup, suggested };
    }

    const free = await this.vehiclesService.findAll(VehicleStatus.FREE);
    const compatible = free.filter((v) => v.cargoType === dto.cargoType);
    if (compatible.length === 0) {
      throw this.noVehiclesError(dto.cargoType);
    }

    if (dto.pickupPointId) {
      const pickup = points.find((point) => point.id === dto.pickupPointId);
      if (!pickup) {
        throw new BadRequestException(
          'El punto de recogida elegido no existe o esta inactivo',
        );
      }
      const target = { lat: pickup.lat, lng: pickup.lng };
      const vehicle = compatible.reduce((nearest, current) =>
        this.distanceTo(current, target) < this.distanceTo(nearest, target)
          ? current
          : nearest,
      );
      return {
        vehicle,
        pickup: this.toPickupRef(pickup, false),
        suggested: false,
      };
    }

    // Sugerencia: par (vehiculo, sucursal) con menor distancia a recorrer.
    let best: { vehicle: Vehicle; point: PickupPoint; distance: number } | null =
      null;
    for (const point of points) {
      const target = { lat: point.lat, lng: point.lng };
      for (const vehicle of compatible) {
        const distance = this.distanceTo(vehicle, target);
        if (!best || distance < best.distance) {
          best = { vehicle, point, distance };
        }
      }
    }
    if (!best) throw this.noVehiclesError(dto.cargoType);
    return {
      vehicle: best.vehicle,
      pickup: this.toPickupRef(best.point, true),
      suggested: true,
    };
  }

  /**
   * Punto de recogida explicito del DTO o el mas cercano al vehiculo
   * (marcado como sugerido). Solo llega aqui con vehiculo ya elegido.
   */
  private async resolvePickup(
    dto: CreateDispatchDto,
    vehicle: Vehicle,
  ): Promise<{ pickup: PickupRef; suggested: boolean }> {
    const points = await this.activePickupPoints();
    if (points.length === 0) {
      throw new BadRequestException(
        'No hay puntos de recogida activos; el administrador debe crear sucursales',
      );
    }
    if (dto.pickupPointId) {
      const pickup = points.find((point) => point.id === dto.pickupPointId);
      if (!pickup) {
        throw new BadRequestException(
          'El punto de recogida elegido no existe o esta inactivo',
        );
      }
      return { pickup: this.toPickupRef(pickup, false), suggested: false };
    }
    const target = { lat: vehicle.lat, lng: vehicle.lng };
    const nearest = points.reduce((best, point) =>
      this.distanceTo(point, target) < this.distanceTo(best, target)
        ? point
        : best,
    );
    return { pickup: this.toPickupRef(nearest, true), suggested: true };
  }

  private async activePickupPoints(): Promise<PickupPoint[]> {
    return this.pickupPointsRepository.find({
      where: { active: true },
      order: { name: 'ASC' },
    });
  }

  private toPickupRef(point: PickupPoint, suggested: boolean): PickupRef {
    return {
      id: point.id,
      name: point.name,
      lat: point.lat,
      lng: point.lng,
      address: point.address ?? null,
      suggested,
    };
  }

  private distanceTo(a: Coords, b: Coords): number {
    const dLat = a.lat - b.lat;
    const dLng = a.lng - b.lng;
    return dLat * dLat + dLng * dLng;
  }

  /**
   * Geofence de Cucuta sobre el viaje completo: cada tramo se calcula
   * con OSRM y ninguna ruta puede salirse del perimetro (p. ej. calles
   * que cruzan la frontera con Venezuela).
   */
  private async planRoutes(
    origin: Coords,
    pickup: Coords,
    target: Coords,
    vehicle: Vehicle,
  ): Promise<{ legs: [DispatchLeg, DispatchLeg]; route: DispatchLeg }> {
    const leg1 = await this.routeInsideCucuta(origin, pickup, vehicle);
    const leg2 = await this.routeInsideCucuta(pickup, target, vehicle);
    const legs: [DispatchLeg, DispatchLeg] = [leg1, leg2];
    const route: DispatchLeg = {
      distanceKm:
        Math.round((leg1.distanceKm + leg2.distanceKm) * 100) / 100,
      durationMin:
        Math.round((leg1.durationMin + leg2.durationMin) * 10) / 10,
      geometry: {
        type: 'LineString',
        coordinates: [
          ...leg1.geometry.coordinates,
          ...leg2.geometry.coordinates,
        ],
      },
    };
    return { legs, route };
  }

  private async routeInsideCucuta(
    origin: Coords,
    target: Coords,
    vehicle: Vehicle,
  ): Promise<DispatchLeg> {
    if (!isInsideCucuta(origin)) {
      throw new BadRequestException(
        `El vehiculo ${vehicle.plate} esta fuera de Cucuta y no puede iniciar el viaje`,
      );
    }
    const route = await this.routingService.route(origin, target);
    if (!isRouteInsideCucuta(route.geometry.coordinates)) {
      throw new BadRequestException(
        'La ruta hacia el destino sale del area de Cucuta; elige otro destino',
      );
    }
    return route;
  }

  findAll(): Promise<Dispatch[]> {
    return this.dispatchesRepository.find({ order: { createdAt: 'DESC' } });
  }

  /** Despachos pendientes/asignados con progreso para el frontend. */
  async findActive(): Promise<ActiveDispatchView[]> {
    const dispatches = await this.dispatchesRepository.find({
      where: { status: In([DispatchStatus.PENDING, DispatchStatus.ASSIGNED]) },
      order: { createdAt: 'ASC' },
    });

    const views: ActiveDispatchView[] = [];
    for (const dispatch of dispatches) {
      if (!dispatch.vehicleId) continue;
      try {
        const vehicle = await this.vehiclesService.findOne(
          dispatch.vehicleId,
        );
        const elapsedSec = this.elapsedOf(dispatch);
        const timeline = this.timelineOf(dispatch);
        const { phase } = this.phaseOf(dispatch, elapsedSec);
        views.push({
          dispatch,
          vehicle,
          progress: Math.min(1, Math.max(0, elapsedSec / timeline.totalSec)),
          remainingSec: Math.ceil(
            Math.max(0, timeline.totalSec - elapsedSec),
          ),
          origin: { lat: dispatch.originLat, lng: dispatch.originLng },
          destination: { lat: dispatch.destLat, lng: dispatch.destLng },
          pickup:
            dispatch.pickupLat != null && dispatch.pickupLng != null
              ? {
                  lat: dispatch.pickupLat,
                  lng: dispatch.pickupLng,
                  label: dispatch.pickupLabel ?? null,
                }
              : null,
          phase,
        });
      } catch {
        // Vehiculo borrado entre medias: se ignora ese despacho.
      }
    }
    return views;
  }

  /**
   * Posicion simulada del vehiculo de un despacho activo: avanza hacia
   * la recogida, espera durante la carga y luego avanza hacia la entrega.
   */
  positionOf(dispatch: Dispatch, elapsedSec: number): Coords {
    const { phase, legProgress } = this.phaseOf(dispatch, elapsedSec);
    const fallback = {
      from: { lat: dispatch.originLat, lng: dispatch.originLng },
      to: { lat: dispatch.destLat, lng: dispatch.destLng },
    };

    if (phase === 'loading') {
      return {
        lat: dispatch.pickupLat ?? fallback.to.lat,
        lng: dispatch.pickupLng ?? fallback.to.lng,
      };
    }
    if (phase === 'to_pickup') {
      return positionAlongRoute(
        dispatch.pickupRouteGeometry as LineStringCoords | null,
        legProgress,
        {
          from: fallback.from,
          to: {
            lat: dispatch.pickupLat ?? fallback.to.lat,
            lng: dispatch.pickupLng ?? fallback.to.lng,
          },
        },
      );
    }
    return positionAlongRoute(
      dispatch.routeGeometry as LineStringCoords | null,
      legProgress,
      {
        from: {
          lat: dispatch.pickupLat ?? fallback.from.lat,
          lng: dispatch.pickupLng ?? fallback.from.lng,
        },
        to: fallback.to,
      },
    );
  }

  async findOne(id: string): Promise<Dispatch> {
    const dispatch = await this.dispatchesRepository.findOne({ where: { id } });
    if (!dispatch) {
      throw new NotFoundException(`Despacho ${id} no encontrado`);
    }
    return dispatch;
  }

  async complete(id: string): Promise<Dispatch> {
    const dispatch = await this.findOne(id);
    if (dispatch.status === DispatchStatus.COMPLETED) return dispatch;
    if (dispatch.status === DispatchStatus.CANCELLED) {
      throw new BadRequestException(
        'El despacho fue cancelado y no puede completarse',
      );
    }
    let vehicle: Vehicle | null = null;
    if (dispatch.vehicleId) {
      vehicle = await this.vehiclesService.findOne(dispatch.vehicleId);
      await this.vehiclesService.release(dispatch.vehicleId);
    }
    dispatch.status = DispatchStatus.COMPLETED;
    dispatch.completedAt = new Date();
    const saved = await this.dispatchesRepository.save(dispatch);

    if (dispatch.orderId) {
      const order = await this.ordersRepository.findOne({
        where: { id: dispatch.orderId },
      });
      if (order && order.status === ServiceOrderStatus.ASSIGNED) {
        order.status = ServiceOrderStatus.COMPLETED;
        await this.ordersRepository.save(order);
      }
    }
    await this.releaseDriver(vehicle);

    const product = dispatch.productLabel
      ? ` (${dispatch.productLabel})`
      : '';
    await this.alertsService.create({
      type: AlertType.ARRIVAL,
      severity: AlertSeverity.INFO,
      message: `Servicio completado: ${vehicle?.plate ?? 'vehiculo'} entrego${
        product ? '' : ''
      }${product} en ${dispatch.destLabel ?? 'su destino'}`,
      vehicleId: dispatch.vehicleId ?? null,
      dispatchId: dispatch.id,
    });

    return saved;
  }

  async cancel(id: string): Promise<Dispatch> {
    const dispatch = await this.findOne(id);
    if (dispatch.status === DispatchStatus.CANCELLED) return dispatch;
    if (dispatch.status === DispatchStatus.COMPLETED) {
      throw new BadRequestException('El despacho ya fue completado');
    }
    let vehicle: Vehicle | null = null;
    if (dispatch.vehicleId) {
      vehicle = await this.vehiclesService.findOne(dispatch.vehicleId);
      await this.vehiclesService.release(dispatch.vehicleId);
    }
    dispatch.status = DispatchStatus.CANCELLED;
    const saved = await this.dispatchesRepository.save(dispatch);

    // La orden vuelve a la cola para poder reasignarla a otro viaje.
    if (dispatch.orderId) {
      const order = await this.ordersRepository.findOne({
        where: { id: dispatch.orderId },
      });
      if (order && order.status === ServiceOrderStatus.ASSIGNED) {
        order.status = ServiceOrderStatus.PENDING;
        order.dispatchId = null;
        await this.ordersRepository.save(order);
      }
    }
    await this.releaseDriver(vehicle);

    return saved;
  }

  /**
   * Devuelve el conductor a `disponible` al cerrar el viaje. Si el
   * operador lo marco `fuera` durante el trayecto, se respeta su estado.
   */
  private async releaseDriver(vehicle: Vehicle | null): Promise<void> {
    if (!vehicle?.driverId) return;
    const driver = await this.driversService.findOne(vehicle.driverId);
    if (driver.status === DriverStatus.ON_TRIP) {
      await this.driversService.setStatus(
        vehicle.driverId,
        DriverStatus.AVAILABLE,
      );
    }
  }
}
