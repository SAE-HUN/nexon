import { IsString, IsBoolean, IsDateString } from 'class-validator';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsDateString()
  startedAt: Date;

  @IsDateString()
  endedAt: Date;

  @IsBoolean()
  isActive: boolean;
} 