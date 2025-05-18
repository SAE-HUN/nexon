import { IsOptional, IsBoolean, IsDateString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListEventQuery {
  @IsOptional()
  @IsDateString()
  startedAt?: Date;

  @IsOptional()
  @IsDateString()
  endedAt?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['startedAt', 'endedAt'])
  sortBy?: string = 'startedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
} 