import { SaleProductItem } from '../../store/useSalesManagementStore';

/**
 * Status types for Delivery Challans
 */
export type DeliveryChallanStatus = 'Open' | 'Converted' | 'Delivered' | 'Cancelled' | string;

/**
 * Line item in API Delivery Challan
 */
export interface ApiDeliveryChallanItem {
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
 * Customer snapshot in API Delivery Challan
 */
export interface ApiDeliveryChallanCustomer {
  id: string;
  customerCode?: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
}

/**
 * Delivery Challan model from GET /commerce/challans and GET /commerce/challans/{id}
 */
export interface ApiDeliveryChallan {
  id: string;
  organizationId?: string;
  branchId?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  customer?: ApiDeliveryChallanCustomer | null;
  challanNo: string;
  referenceNo?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  challanDate?: string | null;
  customerId?: string | null;
  partyName: string;
  customerCompany?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  stateOfSupply?: string | null;
  items: ApiDeliveryChallanItem[];
  withGst?: boolean;
  gstType?: 'intra_state' | 'inter_state' | string;
  roundOff?: number;
  vehicleNo?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  notes?: string | null;
  terms?: string | null;
  attachedImageName?: string | null;
  attachedDocName?: string | null;
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
  status: DeliveryChallanStatus;
  convertedToInvoiceNo?: string | null;
  convertedToType?: 'Invoice' | string | null;
  convertedToId?: string | null;
}

/**
 * Pagination object returned by GET /commerce/challans
 */
export interface DeliveryChallanPagination {
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
 * Query parameters for GET /commerce/challans
 */
export interface DeliveryChallanFilterParams {
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
 * Response for GET /commerce/challans
 */
export interface DeliveryChallanListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiDeliveryChallan[];
  pagination?: DeliveryChallanPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Response for GET /commerce/challans/{id}, POST, PUT, PATCH
 */
export interface DeliveryChallanSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiDeliveryChallan;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Response for DELETE /commerce/challans/{id}
 */
export interface DeliveryChallanDeleteResponse {
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
 * Strictly adheres to backend schema: NO 'unit' or unrecognized keys
 */
export interface CreateDeliveryChallanItemPayload {
  productId: string;
  productName?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
}

/**
 * Payload for POST /commerce/challans
 */
export interface CreateDeliveryChallanPayload {
  challanNo?: string;
  referenceNo?: string;
  invoiceDate?: string;
  dueDate?: string;
  customerId?: string;
  partyName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  billingAddress?: string;
  shippingAddress?: string;
  stateOfSupply?: string;
  items: CreateDeliveryChallanItemPayload[];
  withGst?: boolean;
  gstType?: string;
  roundOff?: number;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  notes?: string;
  terms?: string;
  attachedImageName?: string;
  attachedDocName?: string;
}

/**
 * Payload for PUT /commerce/challans/{id}
 */
export type UpdateDeliveryChallanPayload = Partial<CreateDeliveryChallanPayload>;

/**
 * Payload for PATCH /commerce/challans/{id}
 */
export type PatchDeliveryChallanPayload = Partial<CreateDeliveryChallanPayload>;

/**
 * Payload for PATCH /commerce/challans/{id}/status
 */
export interface DeliveryChallanStatusUpdatePayload {
  status: DeliveryChallanStatus;
}

/**
 * Payload for POST /commerce/challans/{id}/convert
 */
export interface ConvertDeliveryChallanPayload {
  targetType: 'Invoice' | string;
  dueDate?: string;
}

/**
 * Response for POST /commerce/challans/{id}/convert
 */
export interface ConvertDeliveryChallanResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: {
    source?: ApiDeliveryChallan;
    convertedTo?: {
      type: string;
      id: string;
      documentNo: string;
    };
    document?: {
      id: string;
      invoiceNo?: string;
      [key: string]: any;
    };
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Payload for POST /commerce/challans/bulk-convert
 */
export interface BulkConvertDeliveryChallanPayload {
  challanIds: string[];
}

/**
 * Response for POST /commerce/challans/bulk-convert
 */
export interface BulkConvertDeliveryChallanResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: {
    converted?: Array<{
      id: string;
      sourceNo: string;
      invoiceId: string;
      invoiceNo: string;
    }>;
    failed?: Array<{
      id: string;
      code: string;
      message: string;
    }>;
    total: number;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
