import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DriverStatus } from '../../../entities/driver.entity';

export class CreateDriverDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  license?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;
}
