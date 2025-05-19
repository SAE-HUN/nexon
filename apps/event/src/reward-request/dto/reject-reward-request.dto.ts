import { ApiHideProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectRewardRequestDto {
  @IsString()
  @IsNotEmpty()
  @ApiHideProperty()
  rewardRequestId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
