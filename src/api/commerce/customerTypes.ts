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
  whatsapp?: string | null;
  email?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  countryId?: string | null;
  stateId?: string | null;
  districtId?: string | null;
  cityId?: string | null;
  pincode?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  sameAsBilling?: boolean;
  creditLimit?: number;
  paymentTerms?: string;
  paymentDuePeriod?: string | null;
  openingBalance?: number;
  preferredPaymentMethod?: string | null;
  notes?: string | null;
  tags?: string[];
  status: CustomerStatus;
  branchId?: string | null;
  subOrganizationId?: string | null;
  outstandingBalance?: number;
  paidAmountDate?: string | null;
  lastPaymentDate?: string | null;
  salesRepresentativeId?: string | null;
  salesRepresentativeName?: string | null;
  salesRepresentativeType?: 'Primary' | 'Temporary' | null;
  salesRepresentative?: {
    id: string;
    name: string;
    mobile?: string;
    email?: string;
  } | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetailFinancials {
  totalInvoices?: number;
  totalSales?: number;
  paidAmount?: number;
  paidAmountDate?: string | null;
  lastPaymentDate?: string | null;
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

export interface CustomerListSummary {
  totalCount: number;
  activeCount: number;
  withOutstandingCount: number;
  totalReceivable: number;
  newCount: number;
}

export interface CustomerListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiCustomer[];
  pagination: CustomerPagination;
  summary?: CustomerListSummary;
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
  whatsapp?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  countryId?: string;
  stateId?: string;
  districtId?: string;
  cityId?: string;
  pincode?: string;
  gstNumber?: string;
  panNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  sameAsBilling?: boolean;
  creditLimit?: number;
  paymentTerms?: string;
  paymentDuePeriod?: string;
  openingBalance?: number;
  preferredPaymentMethod?: string;
  notes?: string;
  tags?: string[];
  status?: CustomerStatus;
  salesRepresentativeId?: string;
  salesRepresentativeType?: 'Primary' | 'Temporary';
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
    customerCode: apiCust.customerCode || '',
    name: apiCust.name || 'Unnamed Customer',
    company: apiCust.company || '',
    customerType: (apiCust.customerType as CustomerType) || 'Business',
    phone: apiCust.phone || '',
    alternatePhone: apiCust.whatsapp || apiCust.alternatePhone || '',
    email: apiCust.email || '',
    gender: apiCust.gender || 'Not Specified',
    dateOfBirth: apiCust.dateOfBirth || '',
    address: apiCust.address || '',
    city: apiCust.city || '',
    state: apiCust.state || '',
    country: apiCust.country || 'India',
    countryId: apiCust.countryId || undefined,
    stateId: apiCust.stateId || undefined,
    districtId: apiCust.districtId || undefined,
    cityId: apiCust.cityId || undefined,
    pincode: apiCust.pincode || '',
    gstNumber: apiCust.gstNumber || '',
    panNumber: apiCust.panNumber || '',
    billingAddress: apiCust.billingAddress || apiCust.address || '',
    shippingAddress: apiCust.shippingAddress || apiCust.address || '',
    sameAsBilling: apiCust.sameAsBilling ?? true,
    creditLimit: Number(apiCust.creditLimit) || 0,
    paymentTerms: apiCust.paymentTerms || (apiCust as any).paymentDuePeriod || 'Net 30 Days',
    paymentDuePeriod: (apiCust as any).paymentDuePeriod || apiCust.paymentTerms || 'Net 30 Days',
    openingBalance: Number(apiCust.openingBalance) || 0,
    preferredPaymentMethod: apiCust.preferredPaymentMethod || 'Bank Transfer',
    notes: apiCust.notes || '',
    tags: Array.isArray(apiCust.tags) ? apiCust.tags : [],
    status: (apiCust.status as CustomerStatus) || 'Active',
    totalSales: (apiCust as any).totalSales ?? 0,
    paidAmount: (apiCust as any).paidAmount ?? 0,
    paidAmountDate:
      (apiCust as any).paidAmountDate ||
      (apiCust as any).lastPaymentDate ||
      (apiCust as any).paidDate ||
      (apiCust as any).lastPayment?.date ||
      (apiCust as any).paymentDate ||
      null,
    lastPaymentDate:
      (apiCust as any).lastPaymentDate ||
      (apiCust as any).paidAmountDate ||
      (apiCust as any).paidDate ||
      (apiCust as any).lastPayment?.date ||
      null,
    outstandingAmount: (() => {
      const openingBal = Number(apiCust.openingBalance) || 0;
      const raw = (apiCust as any).outstandingAmount ?? (apiCust.outstandingBalance);
      const parsed = raw !== undefined && raw !== null ? Number(raw) : NaN;
      return !isNaN(parsed) && parsed > 0 ? parsed : openingBal;
    })(),
    salesRepresentativeId: apiCust.salesRepresentativeId || (apiCust as any).salesRepresentative?.id || undefined,
    salesRepresentativeName: apiCust.salesRepresentativeName || (apiCust as any).salesRepresentative?.name || undefined,
    salesRepresentativeType: (apiCust.salesRepresentativeType as 'Primary' | 'Temporary') || undefined,
    activities: [],
    createdAt: apiCust.createdAt || new Date().toISOString(),
    updatedAt: apiCust.updatedAt || new Date().toISOString(),
  };
};

export const mapSalesCustomerToPayload = (cust: SalesCustomer): CreateCustomerPayload => {
  const cleanStr = (val?: string | null) => (val && val.trim() ? val.trim() : undefined);

  const payload: CreateCustomerPayload = {
    name: cust.name.trim(),
    phone: cust.phone.trim(),
    customerType: cust.customerType === 'Individual' ? 'Individual' : 'Business',
  };

  // customerCode is server-generated; never sent from the client

  const company = cleanStr(cust.company);
  if (company) payload.company = company;

  const altPhone = cleanStr(cust.alternatePhone);
  if (altPhone) payload.whatsapp = altPhone;

  const email = cleanStr(cust.email);
  if (email) payload.email = email;

  const gender = cleanStr(cust.gender);
  if (gender) payload.gender = gender;

  const dob = cleanStr(cust.dateOfBirth);
  if (dob) payload.dateOfBirth = dob;

  const addr = cleanStr(cust.address);
  if (addr) payload.address = addr;

  const city = cleanStr(cust.city);
  if (city) payload.city = city;

  const state = cleanStr(cust.state);
  if (state) payload.state = state;

  const country = cleanStr(cust.country);
  if (country) payload.country = country;
  if (cust.countryId) payload.countryId = cust.countryId;
  if (cust.stateId) payload.stateId = cust.stateId;
  if (cust.districtId) payload.districtId = cust.districtId;
  if (cust.cityId) payload.cityId = cust.cityId;

  const pin = cleanStr(cust.pincode);
  if (pin) payload.pincode = pin;

  const gst = cleanStr(cust.gstNumber);
  if (gst) payload.gstNumber = gst.toUpperCase();

  const pan = cleanStr(cust.panNumber);
  if (pan) payload.panNumber = pan.toUpperCase();

  const bill = cleanStr(cust.billingAddress);
  if (bill) payload.billingAddress = bill;

  const ship = cleanStr(cust.shippingAddress);
  if (ship) payload.shippingAddress = ship;

  if (typeof cust.sameAsBilling === 'boolean' && (bill || ship || addr)) {
    payload.sameAsBilling = cust.sameAsBilling;
  }

  if (cust.creditLimit !== undefined && cust.creditLimit !== null && cust.creditLimit !== ('' as any)) {
    const num = Number(cust.creditLimit);
    if (!isNaN(num) && num > 0) {
      payload.creditLimit = num;
    }
  }

  const terms = cleanStr(cust.paymentTerms) || cleanStr((cust as any).paymentDuePeriod);
  if (terms) payload.paymentTerms = terms;

  if (cust.openingBalance !== undefined && cust.openingBalance !== null && cust.openingBalance !== ('' as any)) {
    const num = Number(cust.openingBalance);
    if (!isNaN(num) && num > 0) {
      payload.openingBalance = num;
    }
  }

  const method = cleanStr(cust.preferredPaymentMethod);
  if (method) payload.preferredPaymentMethod = method;

  const notes = cleanStr(cust.notes);
  if (notes) payload.notes = notes;

  if (Array.isArray(cust.tags) && cust.tags.length > 0) {
    const cleanTags = cust.tags.map((t) => (typeof t === 'string' ? t.trim() : t)).filter(Boolean);
    if (cleanTags.length > 0) payload.tags = cleanTags;
  }

  if (cust.status) {
    payload.status = cust.status;
  }

  return payload;
};

export interface CustomerBulkUploadError {
  row: number;
  message: string;
}

export interface CustomerBulkUploadResult {
  total: number;
  created: number;
  failed: number;
  errors: CustomerBulkUploadError[];
}

export interface CustomerBulkUploadResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: CustomerBulkUploadResult;
  meta: {
    timestamp: string;
    requestId: string;
  };
}
