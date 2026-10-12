/**
 * Data types and interfaces for Sales Returns / Credit Notes API
 */

export interface ApiSalesReturnItem {
  id?: string;
  productId: string;
  productName?: string;
  sku?: string;
  batch?: string;
  returnQuantity: number;
  reason: string;
  notes?: string;
  soldQuantity?: number;
  unitPrice?: number;
  returnAmount?: number;
}

export interface ApiSalesReturnInvoiceSummary {
  id?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  grandTotal?: number;
}

export interface ApiSalesReturn {
  id: string;
  organizationId: string;
  branchId?: string | null;
  returnNo: string;
  invoiceNo?: string;
  saleId?: string;
  invoiceId?: string;
  customerId?: string;
  customerName?: string;
  customerCompany?: string;
  returnDate: string;
  items: ApiSalesReturnItem[];
  refundMethod?: string;
  refundStatus: string;
  returnStatus: string;
  returnAmount?: number;
  refundAmount?: number;
  rejectionReason?: string | null;
  stockRestored?: boolean;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  invoice?: ApiSalesReturnInvoiceSummary;
}

export interface SalesReturnFilterParams {
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
  refundStatus?: string;
}

export interface CreateSalesReturnItemPayload {
  productId: string;
  productName?: string;
  sku?: string;
  batch?: string;
  returnQuantity: number;
  reason: string;
  notes?: string;
}

export interface CreateSalesReturnPayload {
  returnNo?: string;
  invoiceNo?: string;
  saleId?: string;
  invoiceId?: string;
  customerId?: string;
  customerName?: string;
  customerCompany?: string;
  returnDate: string;
  items: CreateSalesReturnItemPayload[];
  refundMethod?: string;
  refundStatus?: string;
  returnStatus?: string;
  notes?: string;
}

export interface UpdateSalesReturnPayload {
  returnNo?: string;
  invoiceNo?: string;
  saleId?: string;
  invoiceId?: string;
  customerId?: string;
  customerName?: string;
  customerCompany?: string;
  returnDate?: string;
  items?: CreateSalesReturnItemPayload[];
  refundMethod?: string;
  refundStatus?: string;
  returnStatus?: string;
  notes?: string;
}

export type PatchSalesReturnPayload = Partial<UpdateSalesReturnPayload>;

export interface SalesReturnStatusPayload {
  status: 'Approved' | 'Received' | 'Refunded' | 'Requested' | 'Rejected' | string;
  rejectionReason?: string;
}

export interface CommerceSalesReturnListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiSalesReturn[];
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

export interface CommerceSalesReturnSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiSalesReturn;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CommerceSalesReturnDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiSalesReturn | null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
