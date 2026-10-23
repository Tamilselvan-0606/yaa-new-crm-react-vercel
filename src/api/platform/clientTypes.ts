/**
 * Platform Clients API Types
 * Based on OpenAPI documentation for /platform/clients
 */

export interface ClientSubscriptionInfo {
  id: string;
  subscriptionNumber?: string;
  planId?: string;
  planCode?: string;
  planName?: string;
  billingCycle?: string;
  amount?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  autoRenew?: boolean;
  daysRemaining?: number;
}

export interface ClientBillingInfo {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdueInvoices: number;
}

export interface ClientRecentInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
}

export interface ClientSubscriptionHistoryItem {
  id: string;
  subscriptionNumber?: string;
  planCode?: string;
  planName?: string;
  billingCycle?: string;
  amount?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface ClientSourceLead {
  id: string;
  leadCode?: string;
  source?: string;
  convertedAt?: string;
}

export interface PlatformClientItem {
  id: string;
  code: string;
  name: string;
  legalName?: string | null;
  status: string;
  active: boolean;
  organizationType: number; // 0, 1, 2
  registrationType?: string | null;
  subscriptionPlan?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  industry?: string | null;
  location?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email: string;
  subOrganizationSupport?: boolean;
  createdAt: string;
  updatedAt: string;
  branchesCount?: number;
  subOrganizationsCount?: number;
  membersCount?: number;
  subscription?: ClientSubscriptionInfo | null;
  billing?: ClientBillingInfo | null;
  recentInvoices?: ClientRecentInvoice[];
  subscriptionHistory?: ClientSubscriptionHistoryItem[];
  sourceLead?: ClientSourceLead | null;
}

export interface PlatformClientListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'Active' | 'Inactive' | 'Suspend' | 'All' | string;
  organizationType?: string; // 'Client Management', 'Sales Management', 'All', or 0, 1, 2
  subscriptionStatus?: 'Active' | 'Expiring Soon' | 'Expired' | 'Cancelled' | 'None' | 'All' | string;
  hasOutstanding?: 'true' | 'false' | boolean;
  sortBy?: 'name' | 'code' | 'createdAt' | 'updatedAt' | string;
  sortOrder?: 'asc' | 'desc';
  organization_id?: string;
}

export interface PlatformClientPagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PlatformClientListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: PlatformClientItem[];
  pagination: PlatformClientPagination;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface PlatformClientSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: PlatformClientItem;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface CreatePlatformClientRequest {
  name: string;
  code: string;
  legalName?: string;
  email: string;
  password?: string;
  phone?: string;
  whatsapp?: string;
  contactPerson?: string;
  industry?: string;
  location?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  registrationType?: string;
  organizationType?: number;
  status?: string;
  subOrganizationSupport?: boolean;
  organizationId?: string;
  subOrganizationId?: string;
  branchId?: string;
  productId?: string;
}

export interface UpdatePlatformClientRequest {
  name?: string;
  code?: string;
  legalName?: string;
  email?: string;
  password?: string;
  phone?: string;
  whatsapp?: string;
  contactPerson?: string;
  industry?: string;
  location?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  registrationType?: string;
  organizationType?: number;
  status?: string;
  subOrganizationSupport?: boolean;
  active?: boolean;
  organizationId?: string;
  subOrganizationId?: string;
  branchId?: string;
  productId?: string;
}

