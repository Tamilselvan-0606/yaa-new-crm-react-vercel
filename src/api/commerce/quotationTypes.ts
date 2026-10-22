import { QuotationStatus, SaleProductItem, SaleQuotation } from '../../store/useSalesManagementStore';

/**
 * Line item in API Quotation
 */
export interface ApiQuotationItem {
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
 * Customer snapshot in API Quotation
 */
export interface ApiQuotationCustomer {
  id: string;
  customerCode?: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
}

/**
 * Quotation from GET /commerce/quotations and GET /commerce/quotations/{id}
 */
export interface ApiQuotation {
  id: string;
  organizationId?: string;
  branchId?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  customer?: ApiQuotationCustomer | null;
  quotationNo: string;
  referenceNo?: string | null;
  date: string;
  validUntil: string;
  customerId?: string | null;
  partyName: string;
  customerCompany?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  items: ApiQuotationItem[];
  withGst?: boolean;
  gstType?: 'intra_state' | 'inter_state' | string;
  notes?: string | null;
  terms?: string | null;
  quotationDate?: string;
  stateOfSupply?: string | null;
  subTotal?: number;
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  overallDiscount?: number;
  discountAmount?: number;
  discount?: number;
  taxAmount?: number;
  roundOff?: number;
  grandTotal?: number;
  amount: number;
  balance: number;
  status: QuotationStatus | string;
  convertedToType?: 'Invoice' | 'Order' | 'Proforma' | string | null;
  convertedToId?: string | null;
  convertedToInvoiceNo?: string | null;
  attachedImageName?: string | null;
  attachedDocName?: string | null;
}

/**
 * Pagination metadata for Quotation list
 */
export interface QuotationPagination {
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
 * Filter parameters for GET /commerce/quotations
 */
export interface QuotationFilterParams {
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean | string;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  customerId?: string;
  branchId?: string;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  period?: 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all' | string;
}

/**
 * Payload for line item in POST / PUT
 * Strictly adheres to backend schema: NO 'unit' or unrecognized keys
 */
export interface CreateQuotationItemPayload {
  productId: string;
  productName: string;
  sku?: string;
  batch?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
}

/**
 * Payload for POST /commerce/quotations
 */
export interface CreateQuotationPayload {
  quotationNo?: string;
  referenceNo?: string;
  date?: string;
  validUntil?: string;
  customerId?: string;
  partyName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  billingAddress?: string;
  shippingAddress?: string;
  items: CreateQuotationItemPayload[];
  withGst?: boolean;
  gstType?: string;
  notes?: string;
  terms?: string;
  stateOfSupply?: string;
}

/**
 * Payload for PUT /commerce/quotations/{id}
 */
export type UpdateQuotationPayload = Partial<CreateQuotationPayload>;

/**
 * Payload for PATCH /commerce/quotations/{id}
 */
export type PatchQuotationPayload = Partial<CreateQuotationPayload>;

/**
 * Payload for PATCH /commerce/quotations/{id}/status
 */
export interface QuotationStatusUpdatePayload {
  status: QuotationStatus | 'Open' | 'Converted' | 'Cancelled' | 'Expired' | string;
}

/**
 * Payload for POST /commerce/quotations/{id}/convert
 */
export interface ConvertQuotationPayload {
  targetType: 'Invoice' | 'Order' | 'Proforma';
  dueDate?: string;
}

/**
 * Response for GET /commerce/quotations
 */
export interface QuotationListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiQuotation[];
  pagination: QuotationPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Response for GET /commerce/quotations/{id}, POST, PUT, PATCH
 */
export interface QuotationSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiQuotation;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Response for DELETE /commerce/quotations/{id}
 */
export interface QuotationDeleteResponse {
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
 * Response for POST /commerce/quotations/{id}/convert
 */
export interface ConvertQuotationResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    source: ApiQuotation;
    convertedTo: {
      type: 'Invoice' | 'Order' | 'Proforma';
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
