import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
} from 'class-validator';

export class GeocodeSearchDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class GeocodeReverseDto {
  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;
}
