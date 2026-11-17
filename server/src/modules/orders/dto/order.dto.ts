import {
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { CargoType } from '../../../common/cargo-type';
import { ServiceOrderPriority } from '../../../entities/service-order.entity';

export class CreateOrderDto {
  @IsString()
  clientName: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsLatitude()
  destLat: number;

  @IsLongitude()
  destLng: number;

  @IsOptional()
  @IsString()
  destLabel?: string;

  /** Punto de recogida donde el vehiculo carga el envio. */
  @IsUUID()
  pickupPointId: string;

  /** Tipo de carga exigido (filtra el vehiculo asignable). */
  @IsEnum(CargoType)
  cargoType: CargoType;

  /** Producto/contenido del envio (ej. "Insulina NPH 100UI"). */
  @IsString()
  @IsNotEmpty()
  productLabel: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsEnum(ServiceOrderPriority)
  priority?: ServiceOrderPriority;

  @IsOptional()
  @IsDateString()
  windowStart?: string;

  @IsOptional()
  @IsDateString()
  windowEnd?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsLatitude()
  destLat?: number;

  @IsOptional()
  @IsLongitude()
  destLng?: number;

  @IsOptional()
  @IsString()
  destLabel?: string;

  @IsOptional()
  @IsUUID()
  pickupPointId?: string;

  @IsOptional()
  @IsEnum(CargoType)
  cargoType?: CargoType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  productLabel?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsEnum(ServiceOrderPriority)
  priority?: ServiceOrderPriority;

  @IsOptional()
  @IsDateString()
  windowStart?: string;

  @IsOptional()
  @IsDateString()
  windowEnd?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
