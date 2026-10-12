export type ProformaInvoiceStatus = 'Draft' | 'Sent' | 'Approved' | 'Converted' | 'Cancelled';

export interface ProformaItem {
  id?: string;
  itemId?: string;
  itemDescription?: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  gstPercent?: number;
  taxAmount?: number;
  lineTotal?: number;
  sortOrder?: number;
}

export interface ProformaInvoiceApiItem {
  id: string;
  proformaNumber: string;
  invoiceDate: string; // ISO string: '2026-10-06T00:00:00.000Z'
  dueDate: string;
  organizationId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  gstin?: string | null;
  pan?: string | null;
  status: ProformaInvoiceStatus;
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  notes?: string | null;
  termsAndConditions?: string | null;
  sourceQuoteId?: string | null;
  convertedInvoiceId?: string | null;
  items: ProformaItem[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ProformaPagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ProformaListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ProformaInvoiceApiItem[];
  pagination: ProformaPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface ProformaSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ProformaInvoiceApiItem;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

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

export interface ProformaConvertResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    proforma: ProformaInvoiceApiItem;
    invoice: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface ProformaListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  status?: ProformaInvoiceStatus | 'ALL' | string;
  organizationId?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: 'invoiceDate' | 'dueDate' | 'grandTotal' | 'createdAt';
}

export interface CreateProformaItemPayload {
  itemId?: string;
  itemDescription: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  gstPercent?: number;
}

export interface CreateProformaRequest {
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  customerId: string; // UUID
  organizationId?: string;
  discountTotal?: number;
  billingAddress?: string;
  shippingAddress?: string;
  gstin?: string;
  pan?: string;
  notes?: string;
  termsAndConditions?: string;
  sourceQuoteId?: string;
  items: CreateProformaItemPayload[];
}

export interface UpdateProformaRequest {
  status?: ProformaInvoiceStatus | string;
  invoiceDate?: string;
  dueDate?: string;
  discountTotal?: number;
  billingAddress?: string;
  shippingAddress?: string;
  gstin?: string;
  pan?: string;
  notes?: string;
  termsAndConditions?: string;
  items?: CreateProformaItemPayload[];
}

export interface ConvertProformaToInvoiceRequest {
  dueDate?: string; // YYYY-MM-DD
}
