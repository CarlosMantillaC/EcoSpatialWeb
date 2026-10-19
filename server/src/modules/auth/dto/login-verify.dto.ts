import { IsObject, IsString } from 'class-validator';

export class LoginVerifyDto {
  @IsString()
  flowId: string;

  @IsObject()
  response: Record<string, any>;
}
