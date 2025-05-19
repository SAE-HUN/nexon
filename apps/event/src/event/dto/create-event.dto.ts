import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsObject, IsString } from 'class-validator';
import { Condition } from '../schema/event.schema';

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

  @IsObject()
  @Type(() => Object)
  condition: Condition;
}
