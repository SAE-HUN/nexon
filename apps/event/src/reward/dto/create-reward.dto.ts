import { IsString } from 'class-validator';

export class CreateRewardDto {
  type: string;
  name: string;

  @IsString()
  description: string;

  @IsString()
  cmd: string = 'game.reward.process';
}
