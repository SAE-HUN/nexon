import { IsString, IsInt, Min } from 'class-validator';

export class CreateEventRewardDto {
  @IsString()
  eventId: string;

  @IsString()
  rewardId: string;

  @IsInt()
  @Min(1)
  qty: number;
}
