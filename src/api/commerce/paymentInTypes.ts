/**
 * Data types and interfaces for Payments In (Customer payment receipts)
 */

export interface ApiPaymentInInvoiceSummary {
  id?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  grandTotal?: number;
  balanceAmount?: number;
  paymentStatus?: string;
}

export interface ApiPaymentInCustomerSummary {
  id?: string;
  customerCode?: string;
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
}

export interface ApiPaymentIn {
  id: string;
  organizationId: string;
  branchId?: string | null;
  receiptNo: string;
  date: string;
  customerId?: string;
  partyName: string;
  customerPhone?: string;
  customerCompany?: string;
  paymentType: string;
  receivedAmount: number;
  referenceNo?: string;
  description?: string;
  imageAttachment?: string | null;
  firmName?: string;
  invoiceNo?: string;
  status: string;
  invoiceId?: string;
  paymentDate?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  customer?: ApiPaymentInCustomerSummary;
  invoice?: ApiPaymentInInvoiceSummary;
}

export interface PaymentInFilterParams {
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
  period?: 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all' | string;
  invoiceId?: string;
  paymentType?: string;
}

export type CommercePaymentType =
  | 'Cash'
  | 'Cheque'
  | 'Bank Transfer'
  | 'UPI'
  | 'Card'
  | 'Online Payment';

export const COMMERCE_PAYMENT_TYPES: CommercePaymentType[] = [
  'Cash',
  'Cheque',
  'Bank Transfer',
  'UPI',
  'Card',
  'Online Payment',
];

/**
 * Normalizes any payment method string to one of the 6 backend-accepted enum values:
 * "Cash" | "Cheque" | "Bank Transfer" | "UPI" | "Card" | "Online Payment"
 */
export const normalizeCommercePaymentType = (type?: string | null): CommercePaymentType => {
  if (!type || typeof type !== 'string') return 'Cash';
  const clean = type.trim();
  if (!clean) return 'Cash';

  // 1. Exact matches
  if (clean === 'Cash') return 'Cash';
  if (clean === 'Cheque') return 'Cheque';
  if (clean === 'Bank Transfer') return 'Bank Transfer';
  if (clean === 'UPI') return 'UPI';
  if (clean === 'Card') return 'Card';
  if (clean === 'Online Payment') return 'Online Payment';

  const lower = clean.toLowerCase();

  // 2. Case-insensitive direct matches
  if (lower === 'cash') return 'Cash';
  if (lower === 'cheque' || lower === 'check') return 'Cheque';
  if (lower === 'bank transfer' || lower === 'bank') return 'Bank Transfer';
  if (lower === 'upi') return 'UPI';
  if (lower === 'card') return 'Card';
  if (lower === 'online payment' || lower === 'online') return 'Online Payment';

  // 3. Pattern / alias matches
  if (
    lower.includes('card') ||
    lower.includes('credit') ||
    lower.includes('debit') ||
    lower.includes('visa') ||
    lower.includes('mastercard') ||
    lower.includes('rupay') ||
    lower.includes('amex') ||
    lower.includes('pos')
  ) {
    return 'Card';
  }

  if (
    lower.includes('upi') ||
    lower.includes('gpay') ||
    lower.includes('google pay') ||
    lower.includes('phonepe') ||
    lower.includes('phone pe') ||
    lower.includes('paytm') ||
    lower.includes('bhim') ||
    lower.includes('qr')
  ) {
    return 'UPI';
  }

  if (
    lower.includes('cash') ||
    lower === 'cod'
  ) {
    return 'Cash';
  }

  if (
    lower.includes('cheque') ||
    lower.includes('check') ||
    lower.includes('demand draft') ||
    lower.includes('dd')
  ) {
    return 'Cheque';
  }

  if (
    lower.includes('bank') ||
    lower.includes('transfer') ||
    lower.includes('neft') ||
    lower.includes('rtgs') ||
    lower.includes('imps') ||
    lower.includes('wire') ||
    lower.includes('net banking') ||
    lower.includes('netbanking') ||
    lower.includes('account')
  ) {
    return 'Bank Transfer';
  }

  if (
    lower.includes('online') ||
    lower.includes('gateway') ||
    lower.includes('razorpay') ||
    lower.includes('stripe') ||
    lower.includes('paypal')
  ) {
    return 'Online Payment';
  }

  // 4. Fallback safe option
  return 'Bank Transfer';
};

export interface CreatePaymentInPayload {
  receiptNo?: string;
  date: string;
  customerId?: string;
  partyName: string;
  customerPhone?: string;
  customerCompany?: string;
  paymentType: CommercePaymentType | string;
  receivedAmount: number;
  referenceNo?: string;
  description?: string;
  imageAttachment?: string;
  firmName?: string;
  invoiceNo?: string;
  invoiceId?: string;
  status?: string;
  notes?: string;
}

export interface UpdatePaymentInPayload {
  receiptNo?: string;
  date?: string;
  customerId?: string;
  partyName?: string;
  customerPhone?: string;
  customerCompany?: string;
  paymentType?: CommercePaymentType | string;
  receivedAmount?: number;
  referenceNo?: string;
  description?: string;
  imageAttachment?: string;
  firmName?: string;
  invoiceNo?: string;
  invoiceId?: string;
  status?: string;
  notes?: string;
}

export type PatchPaymentInPayload = Partial<UpdatePaymentInPayload>;

export interface CommercePaymentInListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiPaymentIn[];
  pagination?: {
    page: number;
    limit: number;
    page_no?: number;
    page_size?: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CommercePaymentInSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiPaymentIn;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CommercePaymentInDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiPaymentIn | null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
