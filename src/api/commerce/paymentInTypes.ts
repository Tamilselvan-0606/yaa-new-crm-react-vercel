/**
 * Data types and interfaces for Payments In (Customer payment receipts)
 */

export interface ApiPaymentInInvoiceSummary {
  id?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  grandTotal?: number;
  balanceAmount?: number;
  paymentStatus?: string;
}

export interface ApiPaymentInCustomerSummary {
  id?: string;
  customerCode?: string;
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
}

export interface ApiPaymentIn {
  id: string;
  organizationId: string;
  branchId?: string | null;
  receiptNo: string;
  date: string;
  customerId?: string;
  partyName: string;
  customerPhone?: string;
  customerCompany?: string;
  paymentType: string;
  receivedAmount: number;
  referenceNo?: string;
  description?: string;
  imageAttachment?: string | null;
  firmName?: string;
  invoiceNo?: string;
  status: string;
  invoiceId?: string;
  paymentDate?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  customer?: ApiPaymentInCustomerSummary;
  invoice?: ApiPaymentInInvoiceSummary;
}

export interface PaymentInFilterParams {
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean | string;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  customerId?: string;
  branchId?: string;
  from?: string;
  to?: string;
  period?: 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all' | string;
  invoiceId?: string;
  paymentType?: string;
}

export interface CreatePaymentInPayload {
  receiptNo?: string;
  date: string;
  customerId?: string;
  partyName: string;
  customerPhone?: string;
  customerCompany?: string;
  paymentType: string;
  receivedAmount: number;
  referenceNo?: string;
  description?: string;
  imageAttachment?: string;
  firmName?: string;
  invoiceNo?: string;
  invoiceId?: string;
  status?: string;
  notes?: string;
}

export interface UpdatePaymentInPayload {
  receiptNo?: string;
  date?: string;
  customerId?: string;
  partyName?: string;
  customerPhone?: string;
  customerCompany?: string;
  paymentType?: string;
  receivedAmount?: number;
  referenceNo?: string;
  description?: string;
  imageAttachment?: string;
  firmName?: string;
  invoiceNo?: string;
  invoiceId?: string;
  status?: string;
  notes?: string;
}

export type PatchPaymentInPayload = Partial<UpdatePaymentInPayload>;

export interface CommercePaymentInListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiPaymentIn[];
  pagination?: {
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

export interface CommercePaymentInSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiPaymentIn;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CommercePaymentInDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiPaymentIn | null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
