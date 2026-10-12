import {
  SaleTransaction,
  SaleProductItem,
  PaymentSplitItem,
  SalePaymentRecord,
  SaleStatus,
  SalePaymentStatus,
} from '../../store/useSalesManagementStore';

/**
 * Customer snapshot inside ApiSalesInvoice
 */
export interface ApiSalesInvoiceCustomer {
  id: string;
  customerCode?: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
}

/**
 * Line item in ApiSalesInvoice
 */
export interface ApiSalesInvoiceItem {
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
  hsnCode?: string;
}

/**
 * Payment record attached to an invoice
 */
export interface ApiInvoicePaymentItem {
  id: string;
  organizationId?: string;
  branchId?: string | null;
  receiptNo?: string;
  date?: string;
  paymentDate?: string;
  customerId?: string;
  partyName?: string;
  customerPhone?: string;
  customerCompany?: string;
  paymentType?: string;
  receivedAmount?: number;
  amount?: number;
  referenceNo?: string;
  description?: string;
  notes?: string;
  imageAttachment?: string;
  firmName?: string;
  invoiceNo?: string;
  invoiceId?: string;
  status?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  customer?: {
    id: string;
    name: string;
  };
}

/**
 * Full Sales Invoice representation from GET /commerce/invoices
 */
export interface ApiSalesInvoice {
  id: string;
  organizationId?: string;
  branchId?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  customer?: ApiSalesInvoiceCustomer | null;
  invoiceNo: string;
  invoiceStatus?: 'Draft' | 'Generated' | 'Invoiced' | string;
  referenceNo?: string | null;
  saleDate?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  partyName?: string | null;
  customerCompany?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  stateOfSupply?: string | null;
  items: ApiSalesInvoiceItem[];
  withGst?: boolean;
  gstType?: 'intra_state' | 'inter_state' | string;
  overallDiscount?: number;
  shippingCharges?: number;
  otherCharges?: number;
  paymentMethod?: string;
  paymentSplits?: PaymentSplitItem[];
  paymentTerms?: string | null;
  saleStatus?: SaleStatus | string;
  salesperson?: string | null;
  notes?: string | null;
  terms?: string | null;
  subTotal?: number;
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  taxAmount?: number;
  totalTax?: number;
  discountAmount?: number;
  totalDiscount?: number;
  discount?: number;
  roundOff?: number;
  grandTotal?: number;
  amount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  balance?: number;
  paymentStatus?: SalePaymentStatus | string;
  status?: string;
  stockDeducted?: boolean;
  sourceType?: string | null;
  sourceId?: string | null;
  payments?: ApiInvoicePaymentItem[];
}

/**
 * Pagination object returned by GET /commerce/invoices
 */
export interface CommerceInvoicePagination {
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
 * Query parameters for GET /commerce/invoices
 */
export interface InvoiceFilterParams {
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean | string;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string; // filters saleStatus
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
  paymentStatus?: 'Paid' | 'Partial' | 'Unpaid' | 'Pending' | string;
  invoiceStatus?: 'Draft' | 'Generated' | 'Invoiced' | string;
}

/**
 * Response for GET /commerce/invoices
 */
export interface CommerceInvoiceListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiSalesInvoice[];
  pagination?: CommerceInvoicePagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Response for GET /commerce/invoices/{id}, POST, PUT, PATCH
 */
export interface CommerceInvoiceSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiSalesInvoice;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Response for DELETE /commerce/invoices/{id}
 */
export interface CommerceInvoiceDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiSalesInvoice | null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Clean Line Item Payload for POST / PUT
 * Strictly adheres to backend schema: NO 'unit', 'total', 'discountAmount', etc.
 */
export interface CommerceCreateInvoiceItemPayload {
  productId: string;
  productName?: string;
  sku?: string;
  batch?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
}

/**
 * Payload for POST /commerce/invoices
 */
export interface CreateInvoicePayload {
  invoiceNo?: string;
  invoiceStatus?: 'Draft' | 'Generated' | 'Invoiced';
  referenceNo?: string;
  saleDate: string;
  dueDate?: string;
  customerId?: string;
  customerName?: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  billingAddress?: string;
  shippingAddress?: string;
  stateOfSupply?: string;
  items: CommerceCreateInvoiceItemPayload[];
  withGst?: boolean;
  gstType?: 'intra_state' | 'inter_state';
  overallDiscount?: number;
  shippingCharges?: number;
  otherCharges?: number;
  paymentMethod?: string;
  paymentSplits?: PaymentSplitItem[];
  paymentTerms?: string;
  saleStatus?: SaleStatus;
  salesperson?: string;
  notes?: string;
  terms?: string;
  roundOff?: number;
}

/**
 * Payload for PUT /commerce/invoices/{id}
 */
export type UpdateInvoicePayload = Partial<CreateInvoicePayload>;

/**
 * Payload for PATCH /commerce/invoices/{id}
 */
export type PatchInvoicePayload = Partial<CreateInvoicePayload>;

/**
 * Payload for PATCH /commerce/invoices/{id}/status
 */
export interface InvoiceStatusUpdatePayload {
  saleStatus: SaleStatus | string;
}

/**
 * Printable invoice payload returned by GET /commerce/invoices/{id}/pdf
 */
export interface CommerceInvoicePdfResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: {
    documentType: string;
    fileName: string;
    seller?: {
      name: string;
      legalName?: string;
      gstNumber?: string;
      branch?: any;
    };
    buyer?: {
      customerId?: string;
      name: string;
      company?: string;
      billingAddress?: string;
      stateOfSupply?: string;
    };
    invoice?: {
      invoiceNo: string;
      saleDate: string;
      dueDate?: string;
      paymentStatus?: string;
    };
    items?: Array<{
      sNo: number;
      id?: string;
      productId: string;
      productName: string;
      sku?: string;
      batch?: string;
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
      taxPercent?: number;
      discountAmount?: number;
      taxAmount?: number;
      totalAmount?: number;
      total?: number;
      hsnCode?: string;
      unit?: string;
    }>;
    taxBreakup?: Array<{
      taxPercent: number;
      taxableAmount: number;
      cgst: number;
      sgst: number;
      igst: number;
      totalTax: number;
    }>;
    totals?: {
      subtotal: number;
      totalDiscount: number;
      cgst: number;
      sgst: number;
      igst: number;
      totalTax: number;
      shippingCharges: number;
      otherCharges: number;
      roundOff: number;
      grandTotal: number;
      paidAmount: number;
      balance: number;
    };
    amountInWords?: string;
    generatedAt?: string;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
