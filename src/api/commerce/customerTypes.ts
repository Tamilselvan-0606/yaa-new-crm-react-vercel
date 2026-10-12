import { CustomerStatus, CustomerType, SalesCustomer } from '../../store/useSalesManagementStore';

export interface ApiCustomer {
  id: string;
  organizationId: string;
  customerCode: string;
  name: string;
  company?: string | null;
  customerType: 'Business' | 'Individual' | CustomerType;
  phone: string;
  alternatePhone?: string | null;
  email?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  sameAsBilling?: boolean;
  creditLimit?: number;
  paymentTerms?: string;
  openingBalance?: number;
  preferredPaymentMethod?: string | null;
  notes?: string | null;
  tags?: string[];
  status: CustomerStatus;
  branchId?: string | null;
  subOrganizationId?: string | null;
  outstandingBalance?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetailFinancials {
  totalInvoices?: number;
  totalSales?: number;
  paidAmount?: number;
  creditNotes?: number;
  outstandingAmount?: number;
  pendingDues?: number;
  availableCredit?: number;
}

export interface ApiCustomerDetail extends ApiCustomer, CustomerDetailFinancials {}

export interface CustomerPagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CustomerListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiCustomer[];
  pagination: CustomerPagination;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface CustomerSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiCustomerDetail;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface CustomerDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface CustomerLedgerActivity {
  id: string;
  type: 'PAYMENT' | 'INVOICE' | 'RETURN' | string;
  referenceNo: string;
  date: string;
  user: string;
  action: string;
  details: string;
  debit: number;
  credit: number;
}

export interface CustomerLedgerData {
  customerId: string;
  customerCode: string;
  customerName: string;
  creditLimit: number;
  totalInvoices: number;
  totalSales: number;
  paidAmount: number;
  creditNotes: number;
  openingBalance: number;
  outstandingAmount: number;
  activities: CustomerLedgerActivity[];
}

export interface CustomerLedgerResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: CustomerLedgerData;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface CreateCustomerPayload {
  customerCode?: string;
  name: string;
  company?: string;
  customerType: 'Business' | 'Individual';
  phone: string;
  alternatePhone?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gstNumber?: string;
  panNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  sameAsBilling?: boolean;
  creditLimit?: number;
  paymentTerms?: string;
  openingBalance?: number;
  preferredPaymentMethod?: string;
  notes?: string;
  tags?: string[];
  status?: CustomerStatus;
  branchId?: string | null;
  subOrganizationId?: string | null;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;

export interface CustomerFilterParams {
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  customerType?: string;
  branchId?: string;
}

export const mapApiCustomerToSalesCustomer = (apiCust: ApiCustomer): SalesCustomer => {
  return {
    id: apiCust.id,
    customerCode: apiCust.customerCode || 'CUST-0001',
    name: apiCust.name || 'Unnamed Customer',
    company: apiCust.company || '',
    customerType: (apiCust.customerType as CustomerType) || 'Business',
    phone: apiCust.phone || '',
    alternatePhone: apiCust.alternatePhone || '',
    email: apiCust.email || '',
    gender: apiCust.gender || 'Not Specified',
    dateOfBirth: apiCust.dateOfBirth || '',
    address: apiCust.address || '',
    city: apiCust.city || '',
    state: apiCust.state || '',
    country: apiCust.country || 'India',
    pincode: apiCust.pincode || '',
    gstNumber: apiCust.gstNumber || '',
    panNumber: apiCust.panNumber || '',
    billingAddress: apiCust.billingAddress || apiCust.address || '',
    shippingAddress: apiCust.shippingAddress || apiCust.address || '',
    sameAsBilling: apiCust.sameAsBilling ?? true,
    creditLimit: Number(apiCust.creditLimit) || 0,
    paymentTerms: apiCust.paymentTerms || 'Net 30 Days',
    openingBalance: Number(apiCust.openingBalance) || 0,
    preferredPaymentMethod: apiCust.preferredPaymentMethod || 'Bank Transfer',
    notes: apiCust.notes || '',
    tags: Array.isArray(apiCust.tags) ? apiCust.tags : [],
    status: (apiCust.status as CustomerStatus) || 'Active',
    totalSales: (apiCust as any).totalSales ?? 0,
    paidAmount: (apiCust as any).paidAmount ?? 0,
    outstandingAmount: (apiCust as any).outstandingAmount ?? (apiCust.outstandingBalance || 0),
    activities: [],
    createdAt: apiCust.createdAt || new Date().toISOString(),
    updatedAt: apiCust.updatedAt || new Date().toISOString(),
  };
};

export const mapSalesCustomerToPayload = (cust: SalesCustomer): CreateCustomerPayload => {
  return {
    customerCode: cust.customerCode || undefined,
    name: cust.name,
    company: cust.company || undefined,
    customerType: cust.customerType === 'Individual' ? 'Individual' : 'Business',
    phone: cust.phone,
    alternatePhone: cust.alternatePhone || undefined,
    email: cust.email || undefined,
    gender: cust.gender || undefined,
    dateOfBirth: cust.dateOfBirth || undefined,
    address: cust.address || undefined,
    city: cust.city || undefined,
    state: cust.state || undefined,
    country: cust.country || 'India',
    pincode: cust.pincode || undefined,
    gstNumber: cust.gstNumber || undefined,
    panNumber: cust.panNumber || undefined,
    billingAddress: cust.billingAddress || cust.address || undefined,
    shippingAddress: cust.shippingAddress || cust.address || undefined,
    sameAsBilling: cust.sameAsBilling ?? true,
    creditLimit: cust.creditLimit ?? 0,
    paymentTerms: cust.paymentTerms || 'Net 30 Days',
    openingBalance: cust.openingBalance ?? 0,
    preferredPaymentMethod: cust.preferredPaymentMethod || 'Bank Transfer',
    notes: cust.notes || undefined,
    tags: cust.tags || [],
    status: cust.status || 'Active',
  };
};
