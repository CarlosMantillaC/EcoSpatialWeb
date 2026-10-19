import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Dispatch,
  DispatchStatus,
} from '../../entities/dispatch.entity';
import { VehicleStatus } from '../../entities/vehicle.entity';
import { RoutingService } from '../routing/routing.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(Dispatch)
    private readonly dispatchesRepository: Repository<Dispatch>,
    private readonly vehiclesService: VehiclesService,
    private readonly routingService: RoutingService,
  ) {}

  async create(dto: CreateDispatchDto) {
    const target = { lat: dto.destLat, lng: dto.destLng };
    const vehicle = await this.vehiclesService.findNearestFree(target);
    if (!vehicle) {
      throw new BadRequestException(
        'No hay vehiculos disponibles para asignar en este momento',
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

  async findOne(id: string): Promise<Dispatch> {
    const dispatch = await this.dispatchesRepository.findOne({ where: { id } });
    if (!dispatch) {
      throw new NotFoundException(`Despacho ${id} no encontrado`);
    }
    return dispatch;
  }

  async complete(id: string): Promise<Dispatch> {
    const dispatch = await this.findOne(id);
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
