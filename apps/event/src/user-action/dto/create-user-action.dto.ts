import { IsString } from 'class-validator';

export class CreateUserActionDto {
  @IsString()
  cmd: string = 'game.user-action.get';

  @IsString()
  field: string;
} 