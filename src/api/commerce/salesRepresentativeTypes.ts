/**
 * Type definitions for Commerce Sales Representatives Module
 * Spec Endpoints:
 * - GET  /commerce/sales-representatives          (list with metrics)
 * - POST /commerce/sales-representatives          (create with login)
 * - GET  /commerce/sales-representatives/me       (logged-in rep portfolio)
 * - GET  /commerce/sales-representatives/{id}     (single rep)
 * - PUT  /commerce/sales-representatives/{id}     (update rep)
 * - DELETE /commerce/sales-representatives/{id}   (delete rep)
 * - GET  /commerce/sales-representatives/{id}/portfolio
 */

// -----------------------------------------------------------------------
// Core entity
// -----------------------------------------------------------------------
export interface ApiSalesRepresentative {
  id: string;
  organizationId: string;
  subOrganizationId?: string | null;
  branchId?: string | null;
  name: string;
  email: string;
  mobile: string;
  designation?: string;
  status: 'Active' | 'Inactive';
  userId?: string;
  hasLogin?: boolean;
  // Performance metrics (included in list endpoint)
  assignedCustomersCount: number;
  assignedInvoicesCount: number;
  totalOutstandingAmount: number;
  totalCollectedAmount: number;
  collectionRatePercent: number;
  createdAt: string;
  updatedAt: string;
  // Embedded user object (only on create/detail)
  user?: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    active: boolean;
    roleId?: string;
    role?: { id: string; code: string; name: string };
  };
}

// -----------------------------------------------------------------------
// Portfolio (detail view per rep or /me)
// -----------------------------------------------------------------------
export interface ApiRepPortfolioCustomer {
  id: string;
  customerCode?: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  salesRepresentativeType?: 'Primary' | 'Temporary';
  assignedDate?: string;
  assignmentNotes?: string;
  outstandingBalance?: number;
  totalInvoicesCount?: number;
}

export interface ApiRepPortfolioInvoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  collectionStatus?: string;
  assignmentSource?: string;
  nextFollowUpDate?: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  salesRepresentativeId?: string;
  salesRepresentativeName?: string;
  salesRepresentativeMobile?: string;
  promiseToPay?: {
    id?: string;
    promisedAmount?: number;
    promiseDate?: string;
    status?: string;
  };
  lastFollowUp?: {
    id?: string;
    followUpDate?: string;
    contactMethod?: string;
    outcome?: string;
    notes?: string;
  };
}

export interface ApiRepFollowUp {
  id: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  invoiceId?: string;
  invoiceNo?: string;
  salesRepresentativeId?: string;
  salesRepresentativeName?: string;
  contactMethod: string;
  followUpDate: string;
  followUpTime?: string;
  notes?: string;
  outcome: string;
  nextFollowUpDate?: string;
  promiseToPay?: {
    id?: string;
    promisedAmount?: number;
    promiseDate?: string;
    status?: string;
  };
  createdAt: string;
}

export interface ApiRepCollectionHistory {
  id: string;
  receiptNo: string;
  invoiceId?: string;
  invoiceNo?: string;
  customerId?: string;
  customerName: string;
  receivedAmount: number;
  paymentMethod: string;
  referenceNo?: string;
  paymentDate: string;
}

export interface ApiRepPortfolioSummary {
  totalAssignedCustomers: number;
  totalAssignedInvoices: number;
  totalOutstandingAmount: number;
  totalCollectedAmount: number;
  collectionRatePercent: number;
  pendingFollowUpsCount?: number;
  activePromisesToPayCount?: number;
}

export interface ApiRepPortfolio {
  representative: ApiSalesRepresentative;
  summary: ApiRepPortfolioSummary;
  customers: ApiRepPortfolioCustomer[];
  invoices: ApiRepPortfolioInvoice[];
  followUps: ApiRepFollowUp[];
  collectionHistory: ApiRepCollectionHistory[];
}

// -----------------------------------------------------------------------
// API Response wrappers
// -----------------------------------------------------------------------
export interface ApiPagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SalesRepListResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: ApiSalesRepresentative[];
  pagination: ApiPagination;
  meta?: { timestamp: string; requestId: string };
}

export interface SalesRepSingleResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: ApiSalesRepresentative;
  meta?: { timestamp: string; requestId: string };
}

export interface SalesRepPortfolioResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: ApiRepPortfolio;
  meta?: { timestamp: string; requestId: string };
}

// -----------------------------------------------------------------------
// Request payloads
// -----------------------------------------------------------------------
export interface CreateSalesRepPayload {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword?: string;
  designation?: string;
  status?: 'Active' | 'Inactive';
  roleId?: string;
  branchId?: string | null;
  subOrganizationId?: string | null;
}

export interface UpdateSalesRepPayload {
  name?: string;
  mobile?: string;
  email?: string;
  designation?: string;
  status?: 'Active' | 'Inactive';
}

export interface SalesRepListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'Active' | 'Inactive' | 'ALL';
}
