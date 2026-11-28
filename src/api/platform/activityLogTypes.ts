export type ActivityLogStatus = 'Success' | 'Blocked' | 'Failed' | 'All';

export interface ActivityLogItem {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  module: string;
  status: 'Success' | 'Blocked' | 'Failed' | string;
  ipAddress?: string;
  details?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ActivityLogPagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ActivityLogsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ActivityLogStatus | string;
  module?: string;
  from?: string;
  to?: string;
}

export interface ActivityLogsResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ActivityLogItem[];
  pagination: ActivityLogPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
