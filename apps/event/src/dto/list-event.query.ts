import { IsOptional, IsBoolean, IsDateString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListEventQuery {
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['startedAt', 'endedAt'])
  sortBy: 'startedAt' | 'endedAt' = 'startedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
} 