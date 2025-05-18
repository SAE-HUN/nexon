import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateRewardDto {
  @IsString()
  @ApiProperty()
  type: string;

  @IsString()
  @ApiProperty()
  name: string;

  @IsString()
  @ApiProperty()
  description: string;

  @IsString()
  @ApiProperty()
  cmd: string;
} 