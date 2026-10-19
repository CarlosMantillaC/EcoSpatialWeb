import { IsObject, IsString } from 'class-validator';

export class RegisterVerifyDto {
  @IsString()
  flowId: string;

  @IsObject()
  response: Record<string, any>;
}
