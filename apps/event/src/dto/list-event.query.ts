export interface ListEventQuery {
  startedAt?: string;
  endedAt?: string;
  isActive?: boolean;
  sortBy?: 'startedAt' | 'endedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
} 