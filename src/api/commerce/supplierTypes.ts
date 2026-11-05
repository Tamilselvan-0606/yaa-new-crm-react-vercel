export interface SupplierPurchaseSummary {
  totalBills: number;
  /** Sum of the bills' grand totals. */
  totalPurchases: number;
  totalPaid: number;
  /** Still payable to the supplier. */
  balance: number;
}

export interface ApiSupplier {
  id: string;
  organizationId?: string;
  supplierCode?: string;
  name: string;
  company?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone: string;
  whatsapp?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  countryId?: string | null;
  stateId?: string | null;
  districtId?: string | null;
  cityId?: string | null;
  pincode?: string | null;
  paymentTerms?: string | null;
  creditLimit?: number | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  branchName?: string | null;
  /** The server's names for the bank details (the older accountNumber / ifscCode above are kept for old data). */
  bankAccountNumber?: string | null;
  ifsc?: string | null;
  alternatePhone?: string | null;
  /** Display names of the saved location (the ids are above). */
  countryName?: string | null;
  stateName?: string | null;
  districtName?: string | null;
  cityName?: string | null;
  status: 'Active' | 'Inactive' | 'Blocked' | string;
  notes?: string | null;
  totalPurchase?: number;
  paid?: number;
  payable?: number;
  /** Totals over the supplier's purchase bills, computed by the API. */
  purchaseSummary?: SupplierPurchaseSummary;
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
  summary?: { totalCount: number; activeCount: number; inactiveCount: number; totalPayables: number; newSuppliersCount: number };
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
  whatsapp?: string;
  gstNumber?: string;
  panNumber?: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  countryId?: string;
  stateId?: string;
  districtId?: string;
  cityId?: string;
  pincode: string;
  paymentTerms?: string;
  bankName?: string;
  bankAccountNumber?: string;
  ifsc?: string;
  status?: string;
}

export interface UpdateSupplierPayload {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  gstNumber?: string;
  panNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  countryId?: string;
  stateId?: string;
  districtId?: string;
  cityId?: string;
  pincode?: string;
  paymentTerms?: string;
  bankName?: string;
  bankAccountNumber?: string;
  ifsc?: string;
  status?: string;
}
