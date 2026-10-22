import { SaleProductItem } from '../../store/useSalesManagementStore';

/**
 * Line item in API Proforma Invoice
 */
export interface ApiProformaInvoiceItem {
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
 * Customer snapshot in API Proforma Invoice
 */
export interface ApiProformaInvoiceCustomer {
  id: string;
  customerCode?: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
}

/**
 * Proforma Invoice from GET /commerce/proformas and GET /commerce/proformas/{id}
 */
export interface ApiProformaInvoice {
  id: string;
  organizationId?: string;
  branchId?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  customer?: ApiProformaInvoiceCustomer | null;
  proformaNo: string;
  referenceNo?: string | null;
  date: string;
  validUntil?: string | null;
  customerId?: string | null;
  partyName: string;
  customerCompany?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  stateOfSupply?: string | null;
  items: ApiProformaInvoiceItem[];
  withGst?: boolean;
  gstType?: 'intra_state' | 'inter_state' | string;
  roundOff?: number;
  notes?: string | null;
  terms?: string | null;
  attachedImageName?: string | null;
  attachedDocName?: string | null;
  proformaDate?: string;
  subTotal?: number;
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  overallDiscount?: number;
  discountAmount?: number;
  discount?: number;
  taxAmount?: number;
  grandTotal?: number;
  amount: number;
  balance: number;
  status: 'Open' | 'Converted' | 'Expired' | 'Cancelled' | string;
  convertedToInvoiceNo?: string | null;
  convertedToType?: 'Invoice' | string | null;
  convertedToId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
}

/**
 * Pagination metadata for Proforma list
 */
export interface ProformaPagination {
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
 * Filter parameters for GET /commerce/proformas
 */
export interface ProformaFilterParams {
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
 * Response for GET /commerce/proformas
 */
export interface ProformaListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiProformaInvoice[];
  pagination?: ProformaPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Response for single Proforma (GET, POST, PUT, PATCH)
 */
export interface ProformaSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiProformaInvoice;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Response for DELETE /commerce/proformas/{id}
 */
export interface ProformaDeleteResponse {
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
 * Payload for POST /commerce/proformas/{id}/convert
 */
export interface ConvertProformaPayload {
  targetType: 'Invoice' | 'Order' | string;
  dueDate?: string;
}

/**
 * Response for POST /commerce/proformas/{id}/convert
 */
export interface ConvertProformaResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    source: ApiProformaInvoice;
    convertedTo: {
      type: 'Invoice' | 'Order' | string;
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
 * Payload for Item in Proforma Creation / Update (Strictly matches Commerce API schema)
 */
export interface CreateProformaItemPayload {
  productId: string;
  productName?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
}

/**
 * Payload for POST /commerce/proformas
 */
export interface CreateProformaPayload {
  proformaNo?: string;
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
  stateOfSupply?: string;
  items: CreateProformaItemPayload[];
  withGst?: boolean;
  gstType?: 'intra_state' | 'inter_state' | string;
  roundOff?: number;
  notes?: string;
  terms?: string;
  attachedImageName?: string | null;
  attachedDocName?: string | null;
}

/**
 * Payload for PUT /commerce/proformas/{id}
 */
export type UpdateProformaPayload = Partial<CreateProformaPayload>;

/**
 * Payload for PATCH /commerce/proformas/{id}
 */
export type PatchProformaPayload = Partial<CreateProformaPayload>;

/**
 * Payload for PATCH /commerce/proformas/{id}/status
 */
export interface ProformaStatusUpdatePayload {
  status: 'Open' | 'Converted' | 'Expired' | 'Cancelled' | string;
}
