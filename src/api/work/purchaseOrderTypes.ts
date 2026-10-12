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
  supplierId: string;
  orderDate?: string;
  expectedDeliveryDate?: string | null;
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  status: 'Pending' | 'Approved' | 'Ordered' | 'Received' | 'Cancelled' | string;
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
}

export interface CreatePurchaseOrderPayload {
  supplierId: string;
  expectedDeliveryDate?: string;
  discountAmount?: number;
  notes?: string;
  items: CreatePurchaseOrderItemPayload[];
}

export interface UpdatePurchaseOrderPayload {
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
