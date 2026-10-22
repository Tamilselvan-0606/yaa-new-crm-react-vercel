import { baseClient, baseApi } from '../baseApi';
import {
  ApiCollectionInvoiceItem,
  CollectionTabCounts,
  CollectionDashboardMetrics,
  CollectionInvoicesParams,
  CommerceCollectionInvoicesResponse,
  CommerceCollectionMetricsResponse,
  CustomerAssignmentItem,
  CommerceCustomerAssignmentsResponse,
  AssignCustomerPayload,
  CollectionFollowUpItem,
  CommerceFollowUpsResponse,
  CreateCollectionFollowUpPayload,
  CollectionHistoryItem,
  CommerceCollectionHistoryResponse,
  RecordCollectionPaymentPayload,
  RecordPromiseToPayPayload,
  CommerceCustomerTimelineResponse,
} from './collectionTypes';

export * from './collectionTypes';

export const collectionApi = {
  /**
   * Get collection dashboard summary metrics
   * GET /commerce/collections/dashboard-metrics (Alias: /commerce/collections/metrics)
   */
  getCollectionMetrics: async (params?: {
    salesRepresentativeId?: string;
    referenceDate?: string;
    date?: string;
  }): Promise<CommerceCollectionMetricsResponse> => {
    const queryParams: Record<string, any> = {};
    if (params?.salesRepresentativeId) {
      queryParams.salesRepresentativeId = params.salesRepresentativeId;
    }
    if (params?.referenceDate || params?.date) {
      queryParams.referenceDate = params?.referenceDate || params?.date;
      queryParams.date = params?.date || params?.referenceDate;
    }

    try {
      const response = await baseClient.get<CommerceCollectionMetricsResponse>(
        '/commerce/collections/dashboard-metrics',
        { params: queryParams }
      );
      return response.data;
    } catch {
      // Fallback to direct alias
      const response = await baseClient.get<CommerceCollectionMetricsResponse>(
        '/commerce/collections/metrics',
        { params: queryParams }
      );
      return response.data;
    }
  },

  /**
   * Get receivable collection invoices with tab counts and filters
   * GET /commerce/collections/invoices
   */
  getCollectionInvoices: async (
    params?: CollectionInvoicesParams
  ): Promise<CommerceCollectionInvoicesResponse> => {
    const queryParams: Record<string, any> = {};
    if (params) {
      if (params.tab && params.tab !== 'all') {
        queryParams.tab = params.tab;
      } else {
        queryParams.tab = 'all';
      }
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params.salesRepresentativeId) {
        queryParams.salesRepresentativeId = params.salesRepresentativeId;
      }
      if (params.customerId) {
        queryParams.customerId = params.customerId;
      }
      if (params.dueDateFilter && params.dueDateFilter !== 'ALL') {
        queryParams.dueDateFilter = params.dueDateFilter;
      }
      if (params.status && params.status !== 'ALL') {
        queryParams.status = params.status;
      }
      if (params.paymentStatus && params.paymentStatus !== 'ALL') {
        queryParams.paymentStatus = params.paymentStatus;
      }
      if (typeof params.page === 'number') {
        queryParams.page = params.page;
      }
      if (typeof params.limit === 'number') {
        queryParams.limit = params.limit;
      } else if (typeof params.pageSize === 'number') {
        queryParams.limit = params.pageSize;
        queryParams.pageSize = params.pageSize;
      }
      if (params.sub_organization_id) {
        queryParams.sub_organization_id = params.sub_organization_id;
      }
      if (params.branch_id) {
        queryParams.branch_id = params.branch_id;
      }
      if (params.product_id) {
        queryParams.product_id = params.product_id;
      }
    }

    try {
      const response = await baseClient.get<CommerceCollectionInvoicesResponse>(
        '/commerce/collections/invoices',
        { params: queryParams }
      );
      return response.data;
    } catch {
      // Fallback to /commerce/collections
      const response = await baseClient.get<CommerceCollectionInvoicesResponse>(
        '/commerce/collections',
        { params: queryParams }
      );
      return response.data;
    }
  },

  /**
   * Get customer accounts and assigned sales representatives register
   * GET /commerce/collections/customer-assignments
   */
  getCustomerAssignments: async (params?: {
    search?: string;
    salesRepresentativeId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<CommerceCustomerAssignmentsResponse> => {
    const queryParams: Record<string, any> = {};
    if (params) {
      if (params.search && params.search.trim()) queryParams.search = params.search.trim();
      if (params.salesRepresentativeId && params.salesRepresentativeId !== 'ALL') {
        queryParams.salesRepresentativeId = params.salesRepresentativeId;
      }
      if (params.status && params.status !== 'ALL') queryParams.status = params.status;
      if (typeof params.page === 'number') queryParams.page = params.page;
      if (typeof params.limit === 'number') queryParams.limit = Math.min(params.limit, 200);
    }

    const response = await baseClient.get<CommerceCustomerAssignmentsResponse>(
      '/commerce/collections/customer-assignments',
      { params: queryParams }
    );
    return response.data;
  },

  /**
   * Assign sales representative to customer
   * POST /commerce/collections/assign-customer
   */
  assignCustomer: async (payload: AssignCustomerPayload): Promise<{ success: boolean; message?: string }> => {
    const response = await baseClient.post('/commerce/collections/assign-customer', payload);
    return response.data;
  },

  /**
   * List collection follow-up logs
   * GET /commerce/sales/collections/follow-ups
   */
  getFollowUps: async (params?: {
    search?: string;
    salesRepresentativeId?: string;
    contactMethod?: string;
    outcome?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
    limit?: number;
  }): Promise<CommerceFollowUpsResponse> => {
    const queryParams: Record<string, any> = {};
    if (params) {
      if (params.search && params.search.trim()) queryParams.search = params.search.trim();
      if (params.salesRepresentativeId && params.salesRepresentativeId !== 'ALL') {
        queryParams.salesRepresentativeId = params.salesRepresentativeId;
      }
      if (params.contactMethod && params.contactMethod !== 'ALL') {
        queryParams.contactMethod = params.contactMethod;
      }
      if (params.outcome && params.outcome !== 'ALL') queryParams.outcome = params.outcome;
      if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
      if (params.dateTo) queryParams.dateTo = params.dateTo;
      if (typeof params.page === 'number') queryParams.page = params.page;
      if (typeof params.pageSize === 'number') queryParams.pageSize = params.pageSize;
      if (typeof params.limit === 'number') queryParams.limit = params.limit;
    }

    try {
      const response = await baseClient.get<CommerceFollowUpsResponse>(
        '/commerce/sales/collections/follow-ups',
        { params: queryParams }
      );
      return response.data;
    } catch {
      const response = await baseClient.get<CommerceFollowUpsResponse>(
        '/commerce/collections/follow-ups',
        { params: queryParams }
      );
      return response.data;
    }
  },

  /**
   * Record collection follow-up and optional Promise to Pay
   * POST /commerce/sales/collections/follow-ups
   */
  createFollowUp: async (
    payload: CreateCollectionFollowUpPayload
  ): Promise<{ success: boolean; message?: string; data?: any }> => {
    const response = await baseClient.post(
      '/commerce/sales/collections/follow-ups',
      payload
    );
    return response.data;
  },

  /**
   * Get collection inward receipts and payment history
   * GET /commerce/collections/history
   */
  getCollectionHistory: async (params?: {
    search?: string;
    salesRepresentativeId?: string;
    paymentMethod?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<CommerceCollectionHistoryResponse> => {
    const queryParams: Record<string, any> = {};
    if (params) {
      if (params.search && params.search.trim()) queryParams.search = params.search.trim();
      if (params.salesRepresentativeId && params.salesRepresentativeId !== 'ALL') {
        queryParams.salesRepresentativeId = params.salesRepresentativeId;
      }
      if (params.paymentMethod && params.paymentMethod !== 'ALL') {
        queryParams.paymentMethod = params.paymentMethod;
      }
      if (params.fromDate) queryParams.fromDate = params.fromDate;
      if (params.toDate) queryParams.toDate = params.toDate;
      if (typeof params.page === 'number') queryParams.page = params.page;
      if (typeof params.limit === 'number') queryParams.limit = params.limit;
    }

    const response = await baseClient.get<CommerceCollectionHistoryResponse>(
      '/commerce/collections/history',
      { params: queryParams }
    );
    return response.data;
  },

  /**
   * Record collection payment with atomic ledger updates
   * POST /commerce/sales/collections/record-payment
   */
  recordPayment: async (
    payload: RecordCollectionPaymentPayload
  ): Promise<{ success: boolean; message?: string; data?: any }> => {
    const response = await baseClient.post(
      '/commerce/sales/collections/record-payment',
      payload
    );
    return response.data;
  },

  /**
   * Record standalone Promise to Pay
   * POST /commerce/sales/collections/promises-to-pay
   */
  createPromiseToPay: async (
    payload: RecordPromiseToPayPayload
  ): Promise<{ success: boolean; message?: string; data?: any }> => {
    const response = await baseClient.post(
      '/commerce/sales/collections/promises-to-pay',
      payload
    );
    return response.data;
  },

  /**
   * Unified chronological collection and activity timeline for a customer
   * GET /commerce/customers/{id}/collection-timeline
   */
  getCustomerTimeline: async (customerId: string): Promise<CommerceCustomerTimelineResponse> => {
    const response = await baseClient.get<CommerceCustomerTimelineResponse>(
      `/commerce/customers/${customerId}/collection-timeline`
    );
    return response.data;
  },
};
