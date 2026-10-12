export interface ApiSupplier {
  id: string;
  organizationId?: string;
  supplierCode?: string;
  name: string;
  company?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone: string;
  gstNumber?: string | null;
  panNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  paymentTerms?: string | null;
  creditLimit?: number | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  branchName?: string | null;
  status: 'Active' | 'Inactive' | 'Blocked' | string;
  notes?: string | null;
  totalPurchase?: number;
  paid?: number;
  payable?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface SupplierFilterParams {
  page?: number;
  limit?: number;
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean | string;
  search?: string;
  status?: string;
  organization_id?: string;
  sub_organization_id?: string;
  branch_id?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SupplierPagination {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SupplierListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiSupplier[];
  pagination?: SupplierPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface SupplierSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiSupplier;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface SupplierDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CreateSupplierPayload {
  name: string;
  company?: string;
  email?: string;
  phone: string;
  gstNumber?: string;
  panNumber?: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  pincode: string;
  paymentTerms?: string;
  status?: string;
}

export interface UpdateSupplierPayload {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  gstNumber?: string;
  panNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  paymentTerms?: string;
  status?: string;
}
