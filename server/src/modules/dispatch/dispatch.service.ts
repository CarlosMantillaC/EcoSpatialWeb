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
  DispatchStatus,
} from '../../entities/dispatch.entity';
import { Vehicle, VehicleStatus } from '../../entities/vehicle.entity';
import { Coords, positionAlongRoute } from '../../common/geo';
import { RoutingService } from '../routing/routing.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';

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
}

@Injectable()
export class DispatchService {
  private readonly tripSeconds: number;

  constructor(
    @InjectRepository(Dispatch)
    private readonly dispatchesRepository: Repository<Dispatch>,
    private readonly vehiclesService: VehiclesService,
    private readonly routingService: RoutingService,
    config: ConfigService,
  ) {
    this.tripSeconds = config.get<number>('simulator.tripSeconds') ?? 50;
  }

  /**
   * Avance del viaje derivado de `createdAt` y la duracion simulada:
   * no guarda estado, asi que sobrevive a reinicios del servidor.
   */
  progressOf(dispatch: Dispatch, now: Date = new Date()): number {
    const elapsedSec = (now.getTime() - dispatch.createdAt.getTime()) / 1000;
    return Math.min(1, Math.max(0, elapsedSec / this.tripSeconds));
  }

  /**
   * Calcula el vehiculo candidato y la ruta sin guardar nada ni tocar
   * estados: sirve para la vista previa antes de aprobar el viaje.
   */
  async preview(dto: CreateDispatchDto) {
    const target = { lat: dto.destLat, lng: dto.destLng };
    const vehicle = await this.vehiclesService.findNearestFree(target);
    if (!vehicle) {
      throw new BadRequestException(
        'No hay vehiculos disponibles para asignar en este momento',
      );
    }

    const origin = { lat: vehicle.lat, lng: vehicle.lng };
    const route = await this.routingService.route(origin, target);
    return { vehicle, route };
  }

  async create(dto: CreateDispatchDto) {
    const target = { lat: dto.destLat, lng: dto.destLng };

    // Prefiere el vehiculo de la vista previa si sigue libre; si otro
    // usuario lo tomo primero, asigna el mas cercano disponible.
    const vehicle =
      (dto.vehicleId
        ? await this.vehiclesService.findFreeById(dto.vehicleId)
        : null) ?? (await this.vehiclesService.findNearestFree(target));
    if (!vehicle) {
      throw new BadRequestException(
        'No hay vehiculos disponibles para asignar en este momento',
      );
    }

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
    const route = await this.routingService.route(origin, target);

    const dispatch = this.dispatchesRepository.create({
      originLat: origin.lat,
      originLng: origin.lng,
      destLat: target.lat,
      destLng: target.lng,
      destLabel: dto.destLabel,
      vehicleId: vehicle.id,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      status: DispatchStatus.ASSIGNED,
      routeGeometry: route.geometry,
    });
    const saved = await this.dispatchesRepository.save(dispatch);

    await this.vehiclesService.setStatus(vehicle.id, VehicleStatus.ON_ROUTE);

    return {
      dispatch: saved,
      vehicle: await this.vehiclesService.findOne(vehicle.id),
      route,
    };
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
        const progress = this.progressOf(dispatch);
        views.push({
          dispatch,
          vehicle,
          progress,
          remainingSec: Math.ceil((1 - progress) * this.tripSeconds),
          origin: { lat: dispatch.originLat, lng: dispatch.originLng },
          destination: { lat: dispatch.destLat, lng: dispatch.destLng },
        });
      } catch {
        // Vehiculo borrado entre medias: se ignora ese despacho.
      }
    }
    return views;
  }

  /** Posicion simulada del vehiculo de un despacho activo. */
  positionOf(dispatch: Dispatch, progress: number): Coords {
    return positionAlongRoute(dispatch.routeGeometry, progress, {
      from: { lat: dispatch.originLat, lng: dispatch.originLng },
      to: { lat: dispatch.destLat, lng: dispatch.destLng },
    });
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
    if (dispatch.vehicleId) {
      await this.vehiclesService.setStatus(
        dispatch.vehicleId,
        VehicleStatus.FREE,
      );
    }
    dispatch.status = DispatchStatus.COMPLETED;
    return this.dispatchesRepository.save(dispatch);
  }

  async cancel(id: string): Promise<Dispatch> {
    const dispatch = await this.findOne(id);
    if (dispatch.status === DispatchStatus.CANCELLED) return dispatch;
    if (dispatch.status === DispatchStatus.COMPLETED) {
      throw new BadRequestException('El despacho ya fue completado');
    }
    if (dispatch.vehicleId) {
      await this.vehiclesService.setStatus(
        dispatch.vehicleId,
        VehicleStatus.FREE,
      );
    }
    dispatch.status = DispatchStatus.CANCELLED;
    return this.dispatchesRepository.save(dispatch);
  }
}
