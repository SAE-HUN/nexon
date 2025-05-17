import { IsString, IsNotEmpty } from 'class-validator';

export class RejectRewardRequestDto {
  @IsString()
  @IsNotEmpty()
  rewardRequestId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
} 