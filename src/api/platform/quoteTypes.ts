export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED';

export interface QuoteItem {
  id: string;
  quoteId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  taxAmount?: number;
  amount?: number;
  sortOrder?: number;
}

export interface QuoteApiItem {
  id: string;
  estimateNumber: string;
  referenceNumber: string;
  date: string; // ISO string: '2026-10-06T00:00:00.000Z' or date string
  expiryDate: string;
  organizationId: string;
  customerId: string;
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  customerPhone: string;
  customerLocation?: string;
  productName: string;
  status: QuoteStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  amount: number;
  notes?: string | null;
  termsAndConditions?: string | null;
  convertedToType?: 'INVOICE' | 'PROFORMA' | string | null;
  convertedToId?: string | null;
  items: QuoteItem[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface QuotePagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface QuoteListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: QuoteApiItem[];
  pagination: QuotePagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface QuoteSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: QuoteApiItem;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface QuoteDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface QuoteConvertResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    quote: QuoteApiItem;
    target: 'INVOICE' | 'PROFORMA';
    document: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface QuoteListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  status?: QuoteStatus | 'ALL';
  organizationId?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: 'date' | 'expiryDate' | 'amount' | 'estimateNumber' | 'createdAt';
}

export interface CreateQuoteItemPayload {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface CreateQuoteRequest {
  referenceNumber: string;
  date: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  organizationId?: string;
  customerId: string; // UUID
  productName: string;
  discountAmount?: number;
  notes?: string;
  termsAndConditions?: string;
  items: CreateQuoteItemPayload[];
}

export interface UpdateQuoteRequest {
  status?: QuoteStatus;
  discountAmount?: number;
  notes?: string;
  termsAndConditions?: string;
  productName?: string;
  date?: string;
  expiryDate?: string;
  referenceNumber?: string;
  items?: CreateQuoteItemPayload[];
}

export interface ConvertQuoteRequest {
  target: 'INVOICE' | 'PROFORMA';
  dueDate?: string; // YYYY-MM-DD
}
