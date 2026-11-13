import { IsIn, IsOptional } from 'class-validator';

export class AddDeviceOptionsDto {
  @IsOptional()
  @IsIn(['device', 'securityKey', 'phone'])
  method?: 'device' | 'securityKey' | 'phone';
}
