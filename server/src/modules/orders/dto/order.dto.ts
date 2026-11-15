import {
  IsDateString,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
} from 'class-validator';
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
