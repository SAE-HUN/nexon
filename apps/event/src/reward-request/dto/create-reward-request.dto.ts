import { IsString } from 'class-validator';

export class CreateRewardRequestDto {
  @IsString()
  userId: string;

  @IsString()
  eventRewardId: string;
}
