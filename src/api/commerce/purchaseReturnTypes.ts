/**
 * Data types and interfaces for Purchase Returns API
 * Based on OpenAPI spec for /commerce/purchase-returns
 */

export interface ApiPurchaseReturnItem {
  id?: string;
  productId: string;
  productName: string;
  batch?: string;
  purchasedQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  returnAmount: number;
  reason: string;
  remarks?: string;
}

export interface ApiPurchaseReturn {
  id: string;
  returnNo: string;
  purchaseId: string;
  purchaseNo: string;
  supplierId: string;
  supplierName: string;
  returnDate: string;
  items: ApiPurchaseReturnItem[];
  returnAmount: number;
  refundStatus: 'Pending' | 'Refunded' | 'Supplier Credit' | 'Adjusted' | string;
  returnStatus: 'Requested' | 'Approved' | 'Dispatched' | 'Completed' | 'Rejected' | 'Cancelled' | string;
  notes?: string | null;
  organizationId?: string;
  subOrganizationId?: string | null;
  branchId?: string | null;
  stockDeducted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseReturnPagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface PurchaseReturnFilterParams {
  page_no?: number;
  page_size?: number;
  page?: number;
  limit?: number;
  pagination_required?: boolean | string;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  supplierId?: string;
  returnStatus?: string;
  refundStatus?: string;
  startDate?: string;
  endDate?: string;
  organization_id?: string;
  sub_organization_id?: string;
  branch_id?: string;
  status?: string;
}

export interface PurchaseReturnListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiPurchaseReturn[];
  pagination?: PurchaseReturnPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PurchaseReturnSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiPurchaseReturn;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PurchaseReturnDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: any;
}

export interface CreatePurchaseReturnPayload {
  returnNo?: string;
  purchaseId?: string;
  purchaseNo?: string;
  supplierId: string;
  supplierName?: string;
  returnDate?: string;
  items: Array<{
    productId: string;
    productName: string;
    batch?: string;
    purchasedQuantity: number;
    returnQuantity: number;
    unitPrice: number;
    returnAmount: number;
    reason: string;
    remarks?: string;
  }>;
  returnAmount: number;
  refundStatus: string;
  returnStatus?: string;
  notes?: string;
  organization_id?: string;
  sub_organization_id?: string;
  branch_id?: string;
}

export interface UpdatePurchaseReturnPayload {
  returnNo?: string;
  purchaseId?: string;
  purchaseNo?: string;
  supplierId?: string;
  supplierName?: string;
  returnDate?: string;
  items?: Array<{
    productId: string;
    productName: string;
    batch?: string;
    purchasedQuantity: number;
    returnQuantity: number;
    unitPrice: number;
    returnAmount: number;
    reason: string;
    remarks?: string;
  }>;
  returnAmount?: number;
  refundStatus?: string;
  returnStatus?: string;
  notes?: string;
}
