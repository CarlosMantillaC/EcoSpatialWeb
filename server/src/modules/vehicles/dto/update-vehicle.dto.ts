import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { CargoType } from '../../../common/cargo-type';
import { VehicleStatus } from '../../../entities/vehicle.entity';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  plate?: string;

  @IsOptional()
  @IsString()
  driverName?: string | null;

  /** Conductor asignado; `driverName` se sincroniza con su nombre. */
  @IsOptional()
  @IsUUID()
  driverId?: string | null;

  @IsOptional()
  @IsEnum(CargoType)
  cargoType?: CargoType;

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
