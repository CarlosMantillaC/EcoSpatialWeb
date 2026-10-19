import { IsEmail, IsOptional } from 'class-validator';

export class LoginOptionsDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}
