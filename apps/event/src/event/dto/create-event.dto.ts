import { IsString, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateEventDto {
  @IsString()
  @ApiProperty()
  title: string;

  @IsString()
  @ApiProperty()
  description: string;

  @IsDateString()
  @ApiProperty()
  startedAt: Date;

  @IsDateString()
  @ApiProperty()
  endedAt: Date;

  @IsBoolean()
  @ApiProperty()
  isActive: boolean;
} 