import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isInsideCucuta } from '../../common/cucuta-boundary';
import { definedProps } from '../../common/objects';
import { PickupPoint } from '../../entities/pickup-point.entity';
import { CreatePickupPointDto, UpdatePickupPointDto } from './dto/pickup-point.dto';

/**
 * Maestro de puntos de recogida (sucursales). Solo el administrador lo
 * modifica; las operadoras lo leen para elegir (o aceptar la sugerencia
 * del sistema) donde carga el vehiculo. Los puntos nunca se borran: se
 * desactivan para conservar la trazabilidad de los despachos.
 */
@Injectable()
export class PickupPointsService {
  constructor(
    @InjectRepository(PickupPoint)
    private readonly pickupPointsRepository: Repository<PickupPoint>,
  ) {}

  findAll(activeOnly = false): Promise<PickupPoint[]> {
    return this.pickupPointsRepository.find({
      where: activeOnly ? { active: true } : {},
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<PickupPoint> {
    const point = await this.pickupPointsRepository.findOne({ where: { id } });
    if (!point) {
      throw new NotFoundException(`Punto de recogida ${id} no encontrado`);
    }
    return point;
  }

  async create(dto: CreatePickupPointDto): Promise<PickupPoint> {
    this.assertInsideCucuta(dto.lat, dto.lng);
    const point = this.pickupPointsRepository.create({
      name: dto.name,
      address: dto.address ?? null,
      lat: dto.lat,
      lng: dto.lng,
      active: dto.active ?? true,
    });
    return this.pickupPointsRepository.save(point);
  }

  async update(id: string, dto: UpdatePickupPointDto): Promise<PickupPoint> {
    const point = await this.findOne(id);
    const lat = dto.lat ?? point.lat;
    const lng = dto.lng ?? point.lng;
    this.assertInsideCucuta(lat, lng);
    Object.assign(point, definedProps(dto));
    return this.pickupPointsRepository.save(point);
  }

  count(): Promise<number> {
    return this.pickupPointsRepository.count();
  }

  /** Siembra inicial idempotente (la usa el bootstrap del servidor). */
  async seedIfEmpty(
    points: Array<{ name: string; address?: string; lat: number; lng: number }>,
  ): Promise<number> {
    if ((await this.count()) > 0) return 0;
    let created = 0;
    for (const point of points) {
      if (!isInsideCucuta({ lat: point.lat, lng: point.lng })) continue;
      await this.create(point);
      created += 1;
    }
    return created;
  }

  /** Ningun punto de recogida fuera del perimetro urbano de Cucuta. */
  private assertInsideCucuta(lat: number, lng: number) {
    if (!isInsideCucuta({ lat, lng })) {
      throw new BadRequestException(
        'El punto de recogida debe estar dentro del perimetro urbano de Cucuta',
      );
    }
  }
}
