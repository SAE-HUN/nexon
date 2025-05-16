import { IsOptional, IsBoolean, IsDateString, IsIn, IsInt, Min, Max } from 'class-validator';

export class ListEventDto {
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsIn(['startedAt', 'endedAt'])
  sortBy: 'startedAt' | 'endedAt' = 'startedAt';

  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';

  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize: number = 20;
} 