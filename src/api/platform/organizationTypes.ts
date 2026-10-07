export interface OrganizationApiItem {
  id: string;
  code: string;
  name: string;
  active: boolean;
  organizationType: string;
  legalName?: string;
  gstNumber?: string;
  panNumber?: string;
  email?: string;
  phone?: string;
  userId?: string | null;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: any;
}

export interface OrganizationPagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface OrganizationListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: OrganizationApiItem[];
  pagination: OrganizationPagination;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface OrganizationSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: OrganizationApiItem;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface OrganizationDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface CreateOrganizationRequest {
  code: string;
  name: string;
  organizationType: string;
  legalName?: string;
  gstNumber?: string;
  panNumber?: string;
  email?: string;
  phone?: string;
  password?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  legalName?: string;
  organizationType?: string;
  gstNumber?: string;
  panNumber?: string;
  email?: string;
  phone?: string;
  password?: string;
}
