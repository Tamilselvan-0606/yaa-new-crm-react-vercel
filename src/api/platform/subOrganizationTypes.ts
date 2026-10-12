export interface SubOrganizationUser {
  id: string;
  email: string;
  name: string;
  active: boolean;
  isPlatformAdmin?: boolean;
  roleId?: string;
  role?: {
    id: string;
    code: string;
    name: string;
  };
  createdAt?: string;
}

export interface SubOrganizationApiItem {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  legalName?: string;
  organizationType?: string;
  industry?: string;
  location?: string;
  address?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  gstNumber?: string;
  panNumber?: string;
  registrationType?: string;
  subOrganizationSupport?: boolean;
  status?: 'Active' | 'Inactive' | 'Suspended' | 'Pending' | string;
  userId?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: SubOrganizationUser;
  // UI helper mappings
  subscriptionPlan?: string;
  branchesCount?: number;
  membersCount?: number;
  logo?: string;
}

export interface SubOrganizationPagination {
  page?: number;
  limit?: number;
  page_no?: number;
  page_size?: number;
  totalRecords?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface SubOrganizationListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: SubOrganizationApiItem[];
  pagination?: SubOrganizationPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface SubOrganizationSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: SubOrganizationApiItem;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface SubOrganizationListParams {
  organization_id?: string;
  sub_organization_id?: string;
  branch_id?: string;
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean | string;
  status?: string;
  search?: string;
}

export interface CreateSubOrganizationRequest {
  code: string;
  name: string;
  email?: string;
  password?: string;
  roleId?: string;
  legalName?: string;
  organizationType?: string;
  industry?: string;
  location?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  whatsapp?: string;
  gstNumber?: string;
  panNumber?: string;
  registrationType?: string;
  subOrganizationSupport?: boolean;
  subscriptionPlan?: string;
  logo?: string;
  status?: string;
  user?: {
    email?: string;
    password?: string;
    name?: string;
    roleId?: string;
  };
}

export interface UpdateSubOrganizationRequest {
  code?: string;
  name?: string;
  email?: string;
  password?: string;
  roleId?: string;
  legalName?: string;
  organizationType?: string;
  industry?: string;
  location?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  whatsapp?: string;
  gstNumber?: string;
  panNumber?: string;
  registrationType?: string;
  subOrganizationSupport?: boolean;
  subscriptionPlan?: string;
  logo?: string;
  status?: string;
  user?: {
    email?: string;
    password?: string;
    name?: string;
    roleId?: string;
  };
}

export interface UpdateSubOrganizationStatusRequest {
  status: 'Active' | 'Inactive' | 'Suspended' | 'Suspend' | 'Pending';
}
