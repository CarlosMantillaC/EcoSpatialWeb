import {
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

export class CreateDispatchDto {
  @IsLatitude()
  destLat: number;

  @IsLongitude()
  destLng: number;

  @IsOptional()
  @IsString()
  destLabel?: string;

  /**
   * Punto de recogida elegido por la operadora. Sin el, el sistema
   * sugiere el mas conveniente (editable antes de aprobar).
   */
  @IsOptional()
  @IsUUID()
  pickupPointId?: string;

  /** Tipo de carga del envio: filtra los vehiculos asignables. */
  @IsEnum(CargoType)
  cargoType: CargoType;

  /** Producto/contenido que se recoge y entrega (ej. "Insulina NPH 100UI"). */
  @IsString()
  @IsNotEmpty()
  productLabel: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  /** Vehiculo elegido en la vista previa; se valida que siga libre. */
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  /** Orden de servicio que origina el viaje (opcional: viaje ad-hoc). */
  @IsOptional()
  @IsUUID()
  orderId?: string;
}
