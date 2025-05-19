import { IsString } from 'class-validator';

export class CreateUserActionDto {
  @IsString()
  cmd: string;

  @IsString()
  field: string;
} 