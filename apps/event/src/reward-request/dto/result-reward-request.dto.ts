import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum RewardResultStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export class ResultRewardRequestDto {
  @IsString()
  @IsNotEmpty()
  rewardRequestId: string;

  @IsEnum(RewardResultStatus)
  status: RewardResultStatus;

  @IsString()
  @IsOptional()
  reason?: string;
} 