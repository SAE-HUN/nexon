import { ApiHideProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RejectRewardRequestDto {
  @IsString()
  @IsNotEmpty()
  @ApiHideProperty()
  rewardRequestId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
} 