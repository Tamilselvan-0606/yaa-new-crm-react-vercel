export interface OrganizationApiItem {
  id: string;
  code: string;
  name: string;
  active: boolean;
  status?: string;
  organizationType?: string;
  legalName?: string;
  registrationType?: string;
  subscriptionPlan?: string;
  gstNumber?: string;
  panNumber?: string;
  industry?: string;
  location?: string;
  address?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  logo?: string;
  subOrganizationSupport?: boolean;
  branchesCount?: number;
  membersCount?: number;
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
  organizationType: number | string;
  legalName?: string;
  gstNumber?: string;
  panNumber?: string;
  email?: string;
  phone?: string;
  password?: string;
}

export interface UpdateOrganizationRequest {
  code?: string;
  name?: string;
  legalName?: string;
  organizationType?: number | string;
  registrationType?: string;
  subscriptionPlan?: string;
  gstNumber?: string;
  panNumber?: string;
  industry?: string;
  location?: string;
  address?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  logo?: string;
  status?: string;
  subOrganizationSupport?: boolean;
  password?: string;
  [key: string]: any;
}
