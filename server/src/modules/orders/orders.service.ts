import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isInsideCucuta } from '../../common/cucuta-boundary';
import { definedProps } from '../../common/objects';
import { CargoType } from '../../common/cargo-type';
import {
  ServiceOrder,
  ServiceOrderStatus,
} from '../../entities/service-order.entity';
import { DispatchService } from '../dispatch/dispatch.service';
import { CreateDispatchDto } from '../dispatch/dto/create-dispatch.dto';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(ServiceOrder)
    private readonly ordersRepository: Repository<ServiceOrder>,
    private readonly dispatchService: DispatchService,
  ) {}

  findAll(status?: ServiceOrderStatus): Promise<ServiceOrder[]> {
    return this.ordersRepository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ServiceOrder> {
    const order = await this.ordersRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Orden ${id} no encontrada`);
    }
    return order;
  }

  async create(dto: CreateOrderDto): Promise<ServiceOrder> {
    this.assertDestinationInCucuta(dto.destLat, dto.destLng);
    const order = this.ordersRepository.create({
      clientName: dto.clientName,
      contact: dto.contact ?? null,
      destLat: dto.destLat,
      destLng: dto.destLng,
      destLabel: dto.destLabel ?? null,
      pickupPointId: dto.pickupPointId,
      cargoType: dto.cargoType,
      productLabel: dto.productLabel,
      quantity: dto.quantity ?? null,
      priority: dto.priority,
      windowStart: dto.windowStart ? new Date(dto.windowStart) : null,
      windowEnd: dto.windowEnd ? new Date(dto.windowEnd) : null,
      notes: dto.notes ?? null,
    });
    return this.ordersRepository.save(order);
  }

  async update(id: string, dto: UpdateOrderDto): Promise<ServiceOrder> {
    const order = await this.findOne(id);
    if (order.status !== ServiceOrderStatus.PENDING) {
      throw new BadRequestException(
        'Solo las ordenes pendientes pueden editarse',
      );
    }
    if (dto.destLat !== undefined && dto.destLng !== undefined) {
      this.assertDestinationInCucuta(dto.destLat, dto.destLng);
    }
    Object.assign(order, {
      ...definedProps(dto),
      windowStart: dto.windowStart
        ? new Date(dto.windowStart)
        : order.windowStart,
      windowEnd: dto.windowEnd ? new Date(dto.windowEnd) : order.windowEnd,
    });
    return this.ordersRepository.save(order);
  }

  /** Cancela la orden (solo si aun no fue despachada). */
  async cancel(id: string): Promise<ServiceOrder> {
    const order = await this.findOne(id);
    if (order.status === ServiceOrderStatus.CANCELLED) return order;
    if (order.status !== ServiceOrderStatus.PENDING) {
      throw new BadRequestException(
        'La orden ya fue despachada; cancela el despacho para devolverla a la cola',
      );
    }
    order.status = ServiceOrderStatus.CANCELLED;
    return this.ordersRepository.save(order);
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOne(id);
    if (order.status !== ServiceOrderStatus.PENDING) {
      throw new BadRequestException('Solo las ordenes pendientes pueden borrarse');
    }
    await this.ordersRepository.remove(order);
  }

  /** Vista previa del viaje para esta orden (vehiculo + ruta, sin asignar). */
  preview(id: string) {
    return this.findOne(id).then((order) => {
      if (order.status !== ServiceOrderStatus.PENDING) {
        throw new BadRequestException(
          'Solo las ordenes pendientes tienen vista previa',
        );
      }
      return this.dispatchService.preview(this.dispatchDtoFor(order));
    });
  }

  /** Despacha la orden: crea el viaje y la marca como asignada. */
  async dispatch(id: string, vehicleId?: string) {
    const order = await this.findOne(id);
    if (order.status !== ServiceOrderStatus.PENDING) {
      throw new BadRequestException('La orden ya fue despachada o cancelada');
    }
    return this.dispatchService.create({
      ...this.dispatchDtoFor(order),
      vehicleId,
      orderId: order.id,
    });
  }

  /**
   * Los datos del envio de la orden (recogida, tipo de carga, producto)
   * viajan al despacho: el viaje siempre se planifica sobre el envio
   * completo, no solo sobre el destino.
   */
  private dispatchDtoFor(order: ServiceOrder): CreateDispatchDto {
    return {
      destLat: order.destLat,
      destLng: order.destLng,
      destLabel: order.destLabel ?? undefined,
      pickupPointId: order.pickupPointId ?? undefined,
      cargoType: order.cargoType ?? CargoType.GENERAL,
      productLabel: order.productLabel ?? 'Envio',
      quantity: order.quantity ?? undefined,
    };
  }

  count(): Promise<number> {
    return this.ordersRepository.count();
  }

  private assertDestinationInCucuta(lat: number, lng: number) {
    if (!isInsideCucuta({ lat, lng })) {
      throw new BadRequestException(
        'El destino debe estar dentro del perimetro urbano de Cucuta',
      );
    }
  }
}
