export type InvoiceStatus = 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';

export interface InvoiceItemApi {
  id?: string;
  itemId?: string;
  itemDescription: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  gstPercent?: number;
  taxAmount?: number;
  lineTotal?: number;
  sortOrder?: number;
}

export interface InvoicePaymentApiItem {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface InvoiceApiItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  subscriptionId?: string | null;
  organizationId: string;
  subOrganizationId?: string | null;
  branchId?: string | null;
  createdScope?: 'SUPER_ADMIN' | 'ORGANIZATION' | 'SUB_ORGANIZATION' | 'BRANCH' | string;
  createdBy?: string;
  updatedBy?: string | null;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  gstin?: string | null;
  pan?: string | null;
  status: InvoiceStatus;
  isOverdue?: boolean;
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string | null;
  termsAndConditions?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  items: InvoiceItemApi[];
  payments?: InvoicePaymentApiItem[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface InvoicePagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface InvoiceListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: InvoiceApiItem[];
  pagination: InvoicePagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface InvoiceSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: InvoiceApiItem;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface InvoiceDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface InvoicePaymentsListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: InvoicePaymentApiItem[];
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface InvoiceRecordPaymentResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    payment: InvoicePaymentApiItem;
    invoice: InvoiceApiItem;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  status?: InvoiceStatus | 'ALL' | string;
  filter?: 'all' | string;
  organization_id?: string;
  organizationId?: string;
  sub_organization_id?: string;
  subOrganizationId?: string;
  branch_id?: string;
  branchId?: string;
  customerId?: string;
  subscriptionId?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: 'invoiceDate' | 'dueDate' | 'grandTotal' | 'createdAt';
}

export interface CreateInvoiceItemPayload {
  itemId?: string;
  itemDescription: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  gstPercent?: number;
}

export interface CreateInvoiceRequest {
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  customerId: string; // UUID
  organizationId?: string;
  status?: 'Draft' | 'Sent' | InvoiceStatus;
  discountTotal?: number;
  billingAddress?: string;
  shippingAddress?: string;
  gstin?: string;
  pan?: string;
  notes?: string;
  termsAndConditions?: string;
  subscriptionId?: string;
  items: CreateInvoiceItemPayload[];
}

export interface UpdateInvoiceRequest {
  dueDate?: string;
  notes?: string;
  termsAndConditions?: string;
  billingAddress?: string;
  shippingAddress?: string;
  status?: InvoiceStatus;
  discountTotal?: number;
  items?: CreateInvoiceItemPayload[];
}

export interface RecordPaymentRequest {
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMode: string;
  referenceNumber?: string;
  notes?: string;
}
