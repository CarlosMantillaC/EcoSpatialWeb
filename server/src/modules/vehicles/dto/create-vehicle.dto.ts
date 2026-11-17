import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { CargoType } from '../../../common/cargo-type';
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

  /** Capacidad del vehiculo: un unico tipo de carga. */
  @IsEnum(CargoType)
  cargoType: CargoType;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;
}
