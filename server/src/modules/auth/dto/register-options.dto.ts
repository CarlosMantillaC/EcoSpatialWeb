import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export type AuthenticatorMethod = 'device' | 'securityKey' | 'phone';

export class RegisterOptionsDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsIn(['device', 'securityKey', 'phone'])
  method?: AuthenticatorMethod;
}
