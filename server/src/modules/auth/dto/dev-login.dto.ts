import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class DevLoginDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
