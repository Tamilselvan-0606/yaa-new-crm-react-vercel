/**
 * Platform Payments API Types
 * Based on OpenAPI documentation for /platform/payments
 */

export type PlatformPaymentStatus =
  | 'Paid'
  | 'Pending'
  | 'Partially Paid'
  | 'Overdue'
  | 'Cancelled'
  | string;

export type PlatformPaymentMethod =
  | 'Bank Transfer'
  | 'Bank Wire'
  | 'Credit Card'
  | 'Stripe'
  | 'UPI'
  | 'PayPal'
  | 'Cash'
  | 'Other'
  | string;

export interface PlatformPaymentItem {
  id: string;
  receiptNumber?: string;
  invoiceNumber?: string;
  customerId?: string;
  customerName: string;
  productOrService?: string;
  productName?: string;
  productId?: string;
  plan?: string;
  amount: number;
  dueDate: string;
  paymentDate?: string | null;
  paymentMethod?: PlatformPaymentMethod;
  referenceNumber?: string;
  transactionId?: string;
  status: PlatformPaymentStatus;
  notes?: string;
  organizationId?: string;
  subOrganizationId?: string;
  branchId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PlatformPaymentListParams {
  page?: number;
  limit?: number;
  search?: string;
  product?: string;
  productId?: string;
  product_id?: string;
  status?: string;
  organization_id?: string;
  sub_organization_id?: string;
  branch_id?: string;
  pagination_required?: boolean | string;
}

export interface PlatformPaymentPagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PlatformPaymentListSummary {
  totalRevenueCollected: number;
  pendingOverdueReceivables: number;
  totalInvoicesIssued: number;
  collectionSuccessRate: number;
}

export interface PlatformPaymentDataWrapper {
  summaryMetrics?: PlatformPaymentListSummary;
  items: PlatformPaymentItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PlatformPaymentListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: PlatformPaymentDataWrapper | PlatformPaymentItem[];
  pagination?: PlatformPaymentPagination;
  summary?: PlatformPaymentListSummary;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PlatformPaymentSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: PlatformPaymentItem;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CreatePlatformPaymentRequest {
  customerName: string;
  customerId?: string;
  amount: number;
  productOrService?: string;
  productName?: string;
  productId?: string;
  plan?: string;
  paymentMethod?: string;
  status: string;
  dueDate: string;
  paymentDate?: string;
  referenceNumber?: string;
  notes?: string;
  organizationId?: string;
  subOrganizationId?: string;
  branchId?: string;
}

export interface DeletePlatformPaymentResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: {
    id: string;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
