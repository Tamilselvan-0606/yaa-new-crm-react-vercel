import { SaleProductItem } from '../../store/useSalesManagementStore';

/**
 * Status types for Sales Orders
 */
export type SaleOrderStatus = 'Open' | 'Converted' | 'Completed' | 'Cancelled' | string;

/**
 * Line item in API Sales Order
 */
export interface ApiSaleOrderItem {
  id?: string;
  productId: string;
  productName: string;
  sku?: string | null;
  batch?: string | null;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  total?: number;
  unit?: string;
  category?: string;
  itemCode?: string;
  hsnCode?: string;
  description?: string;
}

/**
 * Customer snapshot in API Sales Order
 */
export interface ApiSaleOrderCustomer {
  id: string;
  customerCode?: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
}

/**
 * Sales Order from GET /commerce/orders and GET /commerce/orders/{id}
 */
export interface ApiSaleOrder {
  id: string;
  organizationId?: string;
  branchId?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  customer?: ApiSaleOrderCustomer | null;
  orderNo: string;
  referenceNo?: string | null;
  orderDate: string;
  dueDate: string;
  customerId?: string | null;
  partyName: string;
  customerCompany?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  stateOfSupply?: string | null;
  paymentType?: string | null;
  items: ApiSaleOrderItem[];
  withGst?: boolean;
  gstType?: 'intra_state' | 'inter_state' | string;
  roundOff?: number;
  advanceAmount?: number;
  notes?: string | null;
  terms?: string | null;
  attachedImageName?: string | null;
  attachedDocName?: string | null;
  expectedDeliveryDate?: string | null;
  subTotal?: number;
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  discountAmount?: number;
  discount?: number;
  taxAmount?: number;
  grandTotal?: number;
  amount?: number;
  balance?: number;
  status: SaleOrderStatus;
  convertedToInvoiceNo?: string | null;
  convertedToType?: 'Invoice' | string | null;
  convertedToId?: string | null;
}

/**
 * Pagination object returned by GET /commerce/orders
 */
export interface SaleOrderPagination {
  page: number;
  limit: number;
  page_no: number;
  page_size: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Query parameters for GET /commerce/orders
 */
export interface SaleOrderFilterParams {
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
  period?:
    | 'today'
    | 'this_week'
    | 'this_month'
    | 'last_month'
    | 'this_quarter'
    | 'this_year'
    | 'all'
    | string;
}

/**
 * Response for GET /commerce/orders
 */
export interface SaleOrderListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiSaleOrder[];
  pagination?: SaleOrderPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Response for GET /commerce/orders/{id}, POST, PUT, PATCH
 */
export interface SaleOrderSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiSaleOrder;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Response for DELETE /commerce/orders/{id}
 */
export interface SaleOrderDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Payload for line item in POST / PUT
 */
export interface CreateSaleOrderItemPayload {
  productId: string;
  productName?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
}

/**
 * Payload for POST /commerce/orders
 */
export interface CreateSaleOrderPayload {
  orderNo?: string;
  referenceNo?: string;
  orderDate?: string;
  dueDate?: string;
  customerId?: string;
  partyName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  billingAddress?: string;
  shippingAddress?: string;
  stateOfSupply?: string;
  paymentType?: string;
  items: CreateSaleOrderItemPayload[];
  withGst?: boolean;
  gstType?: string;
  roundOff?: number;
  advanceAmount?: number;
  notes?: string;
  terms?: string;
  attachedImageName?: string;
  attachedDocName?: string;
}

/**
 * Payload for PUT /commerce/orders/{id}
 */
export type UpdateSaleOrderPayload = Partial<CreateSaleOrderPayload>;

/**
 * Payload for PATCH /commerce/orders/{id}
 */
export type PatchSaleOrderPayload = Partial<CreateSaleOrderPayload>;

/**
 * Payload for PATCH /commerce/orders/{id}/status
 */
export interface SaleOrderStatusUpdatePayload {
  status: SaleOrderStatus;
}

/**
 * Payload for POST /commerce/orders/{id}/convert
 */
export interface ConvertSaleOrderPayload {
  targetType: 'Invoice' | string;
  dueDate?: string;
}

/**
 * Response for POST /commerce/orders/{id}/convert
 */
export interface ConvertSaleOrderResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    source: ApiSaleOrder;
    convertedTo: {
      type: 'Invoice' | string;
      id: string;
      documentNo: string;
    };
    document?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Payload for POST /commerce/orders/bulk-convert
 */
export interface BulkConvertSaleOrderPayload {
  orderIds: string[];
}

export interface BulkConvertSaleOrderResultItem {
  id: string;
  sourceNo?: string;
  invoiceId?: string;
  invoiceNo?: string;
  code?: string;
  message?: string;
}

/**
 * Response for POST /commerce/orders/bulk-convert
 */
export interface BulkConvertSaleOrderResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    converted: BulkConvertSaleOrderResultItem[];
    failed: BulkConvertSaleOrderResultItem[];
    total: number;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
