/**
 * Type definitions for Commerce Collections Module
 * Spec Endpoints:
 * - GET /commerce/collections/dashboard-metrics (and /commerce/collections/metrics)
 * - GET /commerce/collections/invoices (and /commerce/collections)
 * - GET /commerce/collections/customer-assignments
 * - POST /commerce/collections/assign-customer
 * - GET /commerce/sales/collections/follow-ups
 * - POST /commerce/sales/collections/follow-ups
 * - GET /commerce/collections/history
 * - POST /commerce/sales/collections/record-payment
 * - POST /commerce/sales/collections/promises-to-pay
 * - GET /commerce/customers/{id}/collection-timeline
 */

export interface ApiCollectionInvoiceItem {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  paymentStatus: 'Unpaid' | 'Partial' | 'Paid';
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

export interface CollectionTabCounts {
  allDues: number;
  dueToday: number;
  overdue: number;
  promiseToPay: number;
  collected: number;
}

export interface CollectionDashboardMetrics {
  totalOutstanding: number;
  overdue: {
    count: number;
    amount: number;
  };
  dueToday: {
    count: number;
    amount: number;
  };
  followUpsToday: {
    count: number;
  };
  collectedThisMonth: {
    count: number;
    amount: number;
  };
  overdueAmount?: number;
  overdueCount?: number;
  dueTodayAmount?: number;
  dueTodayCount?: number;
  followUpsTodayCount?: number;
  collectedThisMonthAmount?: number;
  collectedThisMonthCount?: number;
}

export interface CollectionPagination {
  page?: number;
  limit?: number;
  page_no?: number;
  page_size?: number;
  totalRecords?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface CollectionInvoicesParams {
  tab?: 'all' | 'due-today' | 'overdue' | 'promise-to-pay' | 'collected' | string;
  search?: string;
  salesRepresentativeId?: string;
  customerId?: string;
  dueDateFilter?: 'ALL' | 'OVERDUE' | 'TODAY' | 'THIS_MONTH' | string;
  status?: 'ALL' | 'Overdue' | 'Due Today' | 'Upcoming' | 'Promise to Pay' | 'Paid' | string;
  paymentStatus?: 'ALL' | 'Unpaid' | 'Partial' | 'Paid' | string;
  page?: number;
  limit?: number;
  pageSize?: number;
  organization_id?: string;
  sub_organization_id?: string;
  branch_id?: string;
  product_id?: string;
  date?: string;
  referenceDate?: string;
}

export interface CommerceCollectionInvoicesResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: ApiCollectionInvoiceItem[];
  tabCounts?: CollectionTabCounts;
  pagination?: CollectionPagination;
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}

export interface CommerceCollectionMetricsResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: CollectionDashboardMetrics;
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}

export interface CustomerAssignmentItem {
  id: string;
  customerName: string;
  customerCode?: string;
  company?: string;
  phone?: string;
  totalOutstanding: number;
  salesRepresentative?: {
    id: string;
    name: string;
    mobile?: string;
    type?: string;
  };
  assignedDate?: string;
  status?: string;
}

export interface CommerceCustomerAssignmentsResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: CustomerAssignmentItem[];
  pagination?: CollectionPagination;
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}

export interface AssignCustomerPayload {
  customerId: string;
  salesRepresentativeId: string;
  assignmentType?: 'Primary' | 'Temporary' | string;
  effectiveFrom?: string;
  notes?: string;
}

export interface CollectionFollowUpItem {
  id: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  invoiceId?: string;
  invoiceNo?: string;
  invoiceNumber?: string;
  salesRepresentativeId?: string;
  salesRepresentativeName?: string;
  contactMethod: string;
  followUpDate: string;
  followUpTime?: string;
  notes: string;
  outcome: string;
  nextFollowUpDate?: string;
  promiseToPay?: {
    id?: string;
    promisedAmount?: number;
    promiseDate?: string;
    status?: string;
  };
  hasPromiseToPay?: boolean;
  promisedAmount?: number;
  promiseDate?: string;
  createdAt?: string;
}

export interface CommerceFollowUpsResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: CollectionFollowUpItem[];
  pagination?: CollectionPagination;
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}

export interface CreateCollectionFollowUpPayload {
  customerId: string;
  invoiceId?: string;
  salesRepresentativeId?: string;
  contactMethod?: string;
  followUpDate?: string;
  followUpTime?: string;
  notes: string;
  outcome?: string;
  hasPromiseToPay?: boolean;
  promisedAmount?: number;
  promiseDate?: string;
  nextFollowUpDate?: string;
}

export interface CollectionHistoryItem {
  id: string;
  receiptNo: string;
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
  partyName?: string;
  invoiceNumber?: string;
  invoiceNo?: string;
  paymentDate: string;
  date?: string;
  paymentMethod: string;
  paymentType?: string;
  referenceNo?: string;
  collectedBy?: {
    id: string;
    name: string;
  };
  salesRepresentativeName?: string;
  receivedAmount: number;
  amount?: number;
  status?: string;
  notes?: string;
}

export interface CommerceCollectionHistoryResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: CollectionHistoryItem[];
  pagination?: CollectionPagination;
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}

export interface RecordCollectionPaymentPayload {
  invoiceId: string;
  customerId?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNo?: string;
  notes?: string;
  recordedBy?: string;
  salesRepresentativeId?: string;
}

export interface RecordPromiseToPayPayload {
  customerId: string;
  invoiceId?: string;
  salesRepresentativeId?: string;
  promisedAmount: number;
  promiseDate: string;
  notes?: string;
}

export interface CustomerTimelineEvent {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  date: string;
  details?: string;
}

export interface CustomerCollectionTimelineData {
  customerId: string;
  customerName: string;
  totalOutstanding: number;
  salesRepresentative?: {
    id: string;
    name: string;
    type?: string;
  };
  events: CustomerTimelineEvent[];
}

export interface CommerceCustomerTimelineResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: CustomerCollectionTimelineData;
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}
