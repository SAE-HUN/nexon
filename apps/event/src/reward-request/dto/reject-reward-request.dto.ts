import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectRewardRequestDto {
  @IsString()
  @IsNotEmpty()
  rewardRequestId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  reason: string;
} 