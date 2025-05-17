import { IsString, IsBoolean, IsDateString } from 'class-validator';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsDateString()
  startedAt: string;

  @IsDateString()
  endedAt: string;

  @IsBoolean()
  isActive: boolean;
} 