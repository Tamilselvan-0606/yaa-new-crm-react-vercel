export interface BranchUser {
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

export interface BranchApiItem {
  id: string;
  organizationId?: string;
  subOrganizationId?: string;
  code: string;
  name: string;
  status: 'Active' | 'Inactive' | 'Suspended' | string;
  userId?: string | null;
  user?: BranchUser;
  createdAt: string;
  updatedAt?: string;
  // Optional/extended fields
  contactPerson?: string;
  phone?: string;
  mobileNumber?: string;
  whatsapp?: string;
  email?: string;
  location?: string;
  city?: string;
  state?: string;
  address?: string;
  gstNumber?: string;
  productId?: string;
  productName?: string;
}

export interface BranchPagination {
  page?: number;
  limit?: number;
  page_no?: number;
  page_size?: number;
  totalRecords?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface BranchListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: BranchApiItem[];
  pagination?: BranchPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface BranchSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: BranchApiItem;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface BranchListParams {
  organization_id?: string;
  sub_organization_id?: string;
  branch_id?: string;
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean | string;
  search?: string;
  status?: string;
}

export interface CreateBranchRequest {
  code: string;
  name: string;
  organizationId?: string;
  subOrganizationId?: string;
  email?: string;
  password?: string;
  roleId?: string;
  contactPerson?: string;
  phone?: string;
  mobileNumber?: string;
  whatsapp?: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  status?: string;
  user?: {
    email?: string;
    password?: string;
    name?: string;
    roleId?: string;
  };
}

export interface UpdateBranchRequest {
  code?: string;
  name?: string;
  contactPerson?: string;
  phone?: string;
  mobileNumber?: string;
  whatsapp?: string;
  email?: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  status?: string;
  organizationId?: string;
  subOrganizationId?: string;
}

export interface PatchBranchStatusRequest {
  status: 'Active' | 'Inactive' | 'Suspended' | string;
}

export interface BranchDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null | string;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
