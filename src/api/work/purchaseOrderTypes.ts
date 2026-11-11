/**
 * Data types and interfaces for Procurement Purchase Orders API
 * Based on OpenAPI spec for /work/purchase-orders
 */

export interface ApiPurchaseOrderItem {
  productId: string;
  productName?: string;
  quantity: number;
  unitCost: number;
  taxPercent: number;
  taxAmount?: number;
  totalAmount?: number;
}

export interface ApiPurchaseOrderSupplier {
  id: string;
  name: string;
}

export interface ApiPurchaseOrder {
  id: string;
  organizationId?: string;
  subOrganizationId?: string | null;
  branchId?: string | null;
  poNo: string;
  purchaseBillManualNo?: string | null;
  supplierId: string;
  orderDate?: string;
  expectedDeliveryDate?: string | null;
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  /** Amount of the bill already paid, balance still due and the resulting payment status (from the API). */
  paidAmount?: number;
  balance?: number;
  paymentStatus?: 'Paid' | 'Partial' | 'Unpaid' | string;
  status: 'Pending' | 'Approved' | 'Ordered' | 'Received' | 'Cancelled' | string;
  originalBillAmount?: number;
  totalPurchaseReturnAmount?: number;
  totalReturned?: number;
  netPayableAmount?: number;
  netPayable?: number;
  totalPaidAmount?: number;
  totalPaid?: number;
  creditAdjustedAmount?: number;
  outstandingBalance?: number;
  outstandingAmount?: number;
  supplierCreditAmount?: number;
  supplierCredit?: number;
  supplierCreditGeneratedAmount?: number;
  creditRefundedAmount?: number;
  refundedAmount?: number;
  creditSettledAmount?: number;
  remainingSupplierCredit?: number;
  refundStatus?: string;
  notes?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  supplier?: ApiPurchaseOrderSupplier;
  items: ApiPurchaseOrderItem[];
}

export interface PurchaseOrderPagination {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface PurchaseOrderFilterParams {
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

export interface CreatePurchaseOrderItemPayload {
  productId: string;
  quantity: number;
  unitCost: number;
  taxPercent: number;
  batchNo?: string;
  batch?: string;
  expDate?: string;
  mfgDate?: string;
}

export interface CreatePurchaseOrderPayload {
  purchaseBillManualNo?: string;
  supplierId: string;
  expectedDeliveryDate?: string;
  discountAmount?: number;
  paidAmount?: number;
  notes?: string;
  items: CreatePurchaseOrderItemPayload[];
}

export interface UpdatePurchaseOrderPayload {
  purchaseBillManualNo?: string;
  expectedDeliveryDate?: string;
  discountAmount?: number;
  notes?: string;
  items?: CreatePurchaseOrderItemPayload[];
}

export interface PatchPurchaseOrderPayload {
  notes?: string;
  expectedDeliveryDate?: string;
  discountAmount?: number;
}

export interface PatchPurchaseOrderStatusPayload {
  status: 'Pending' | 'Approved' | 'Ordered' | 'Received' | 'Cancelled' | string;
}

export interface PurchaseOrderListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiPurchaseOrder[];
  pagination?: PurchaseOrderPagination;
  summary?: { totalCount: number; totalAmount: number; todayCount: number; todayAmount: number; pendingPayments: number; paidCount: number; completedCount: number; totalPurchaseReturnAmount?: number; supplierCreditAmount?: number };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PurchaseOrderSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiPurchaseOrder;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PurchaseOrderDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
