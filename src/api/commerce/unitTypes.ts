export interface ApiUnit {
  id: string;
  organizationId: string;
  name: string;
  shortCode: string;
  status: number; // 0 = Inactive, 1 = Active
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitFilterParams {
  page_no?: number;
  page_size?: number;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  sortBy?: 'name' | 'shortCode' | 'createdAt' | 'status';
  status?: number | string;
}

export interface UnitPagination {
  page: number;
  limit: number;
  page_no: number;
  page_size: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UnitListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiUnit[];
  pagination?: UnitPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface UnitSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiUnit;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface UnitDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CreateUnitPayload {
  name: string;
  shortCode: string;
  status?: number; // 0 = Inactive, 1 = Active (default 1)
}

export interface UpdateUnitPayload {
  name?: string;
  shortCode?: string;
  status?: number;
}

export interface UpdateUnitStatusPayload {
  status: 0 | 1;
}
