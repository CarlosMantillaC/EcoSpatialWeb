import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateDispatchDto {
  @IsLatitude()
  destLat: number;

  @IsLongitude()
  destLng: number;

  @IsOptional()
  @IsString()
  destLabel?: string;

  /** Vehiculo elegido en la vista previa; se valida que siga libre. */
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
