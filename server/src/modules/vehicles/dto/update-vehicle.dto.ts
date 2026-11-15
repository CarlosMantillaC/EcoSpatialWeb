import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { VehicleStatus } from '../../../entities/vehicle.entity';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  plate?: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  /** Conductor asignado; `driverName` se sincroniza con su nombre. */
  @IsOptional()
  @IsUUID()
  driverId?: string | null;

  @IsOptional()
  @IsString()
  cargoType?: string;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsLongitude()
  lng?: number;
}
