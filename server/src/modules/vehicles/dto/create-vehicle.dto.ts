import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { VehicleStatus } from '../../../entities/vehicle.entity';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  plate: string;

  @IsOptional()
  @IsString()
  driverName?: string | null;

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

  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;
}
