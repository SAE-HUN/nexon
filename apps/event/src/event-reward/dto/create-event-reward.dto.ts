import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventRewardDto {
  @IsString()
  @ApiProperty()
  eventId: string;

  @IsString()
  @ApiProperty()
  rewardId: string;

  @IsInt()
  @Min(1)
  @ApiProperty()
  qty: number;
} 