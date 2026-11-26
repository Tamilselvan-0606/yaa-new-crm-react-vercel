export interface ApiFirm {
  id: string;
  organization_id?: string;
  organizationId?: string;
  sub_organization_id?: string | null;
  subOrganizationId?: string | null;
  sub_organization_name?: string | null;
  branch_id?: string | null;
  branchId?: string | null;
  branch_name?: string | null;
  firm_name: string;
  firmName?: string;
  firm_code: string;
  firmCode?: string;
  mobile_number: string;
  mobileNumber?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  created_at: string;
  updated_at: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FirmFilterParams {
  page_no?: number;
  page?: number;
  page_size?: number;
  limit?: number;
  pagination_required?: 'true' | 'false' | boolean;
  search?: string;
  status?: string;
  sort_by?: 'created_at' | 'updated_at' | 'firm_name' | 'firm_code' | 'mobile_number' | 'status' | string;
  sortBy?: string;
  sort_order?: 'asc' | 'desc' | string;
  sortOrder?: 'asc' | 'desc' | string;
  organization_id?: string;
  organizationId?: string;
  sub_organization_id?: string;
  subOrganizationId?: string;
  branch_id?: string;
  branchId?: string;
}

export interface FirmListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiFirm[];
  pagination: {
    page: number;
    limit: number;
    page_no?: number;
    page_size?: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface FirmSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiFirm;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface FirmDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CreateFirmPayload {
  firm_name: string;
  mobile_number: string;
  sub_organization_id?: string | null;
  branch_id?: string | null;
  status?: 'Active' | 'Inactive' | 'Suspended';
}

export interface UpdateFirmPayload {
  firm_name?: string;
  mobile_number?: string;
  sub_organization_id?: string | null;
  branch_id?: string | null;
  status?: 'Active' | 'Inactive' | 'Suspended';
}

export interface UpdateFirmStatusPayload {
  status: 'Active' | 'Inactive' | 'Suspended';
}

export interface FirmItem {
  id: string;
  name: string;
  code: string;
  subOrganizationId?: string | null;
  subOrganizationName?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  mobileNumber: string;
  phone?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  createdAt: string;
  updatedAt?: string;
  // Kept for backward compatibility in existing components/views
  registrationType?: string;
  gstNumber?: string;
  panNumber?: string;
  contactPerson?: string;
  email?: string;
  location?: string;
}
