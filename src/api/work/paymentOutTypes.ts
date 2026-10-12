/**
 * Data types and interfaces for Procurement Payments Out (Supplier Disbursements) API
 * Endpoint: /api/v1/work/payments-out
 */

export interface ApiPaymentOutSupplier {
  id: string;
  name: string;
}

export interface ApiPaymentOut {
  id: string;
  organizationId: string;
  paymentNo: string;
  supplierId: string;
  paymentDate: string;
  paymentType: string;
  amount: number;
  referenceNo?: string | null;
  status: 'Completed' | 'Pending' | 'Cancelled' | string;
  notes?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  supplier?: ApiPaymentOutSupplier;
}

export interface PaymentOutPagination {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface PaymentOutFilterParams {
  page?: number;
  limit?: number;
  page_no?: number;
  page_size?: number;
  search?: string;
  status?: string;
  organization_id?: string;
  sub_organization_id?: string;
  branch_id?: string;
  pagination_required?: boolean | string;
}

export interface CreatePaymentOutPayload {
  supplierId: string;
  paymentType: string;
  amount: number;
  referenceNo?: string;
  notes?: string;
}

export interface UpdatePaymentOutPayload {
  amount?: number;
  referenceNo?: string;
  paymentType?: string;
  notes?: string;
}

export interface PatchPaymentOutPayload {
  notes?: string;
  referenceNo?: string;
  amount?: number;
  paymentType?: string;
}

export interface PaymentOutListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiPaymentOut[];
  pagination?: PaymentOutPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PaymentOutSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiPaymentOut;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PaymentOutDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
