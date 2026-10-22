import { baseClient, baseApi } from '../baseApi';
import { SalePaymentIn, PaymentInType } from '../../store/useSalesManagementStore';
import {
  ApiPaymentIn,
  PaymentInFilterParams,
  CommercePaymentInListResponse,
  CommercePaymentInSingleResponse,
  CommercePaymentInDeleteResponse,
  CreatePaymentInPayload,
  UpdatePaymentInPayload,
  PatchPaymentInPayload,
} from './paymentInTypes';

export * from './paymentInTypes';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Mapper: ApiPaymentIn -> SalePaymentIn
 */
export const mapApiPaymentInToSalePaymentIn = (apiPay: ApiPaymentIn): SalePaymentIn => {
  let dateStr = apiPay.date || (apiPay.paymentDate ? apiPay.paymentDate.split('T')[0] : apiPay.createdAt ? apiPay.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }

  const amt = Number(apiPay.receivedAmount || 0);

  return {
    id: apiPay.id,
    receiptNo: apiPay.receiptNo || `REC-${Date.now().toString().slice(-6)}`,
    date: dateStr,
    paymentDate: dateStr,
    customerId: apiPay.customerId || apiPay.customer?.id || undefined,
    partyName: apiPay.partyName || apiPay.customer?.name || 'Unnamed Customer',
    customerPhone: apiPay.customerPhone || apiPay.customer?.phone || undefined,
    customerCompany: apiPay.customerCompany || apiPay.customer?.company || undefined,
    paymentType: (apiPay.paymentType as PaymentInType) || 'Cash',
    paymentMethod: apiPay.paymentType || 'Cash',
    receivedAmount: amt,
    amount: amt,
    referenceNo: apiPay.referenceNo || undefined,
    description: apiPay.description || apiPay.notes || undefined,
    notes: apiPay.notes || apiPay.description || undefined,
    imageAttachment: apiPay.imageAttachment || undefined,
    firmName: apiPay.firmName || undefined,
    invoiceId: apiPay.invoiceId || apiPay.invoice?.id || undefined,
    invoiceNo: apiPay.invoiceNo || apiPay.invoice?.invoiceNo || undefined,
    status: apiPay.status || 'Completed',
    createdAt: apiPay.createdAt || new Date().toISOString(),
    updatedAt: apiPay.updatedAt || new Date().toISOString(),
  };
};

/**
 * Mapper: SalePaymentIn -> CreatePaymentInPayload (Strict schema)
 */
export const mapSalePaymentInToApiPayload = (
  pay: Partial<SalePaymentIn> & {
    partyName: string;
    paymentType: string;
    receivedAmount: number;
  }
): CreatePaymentInPayload => {
  const dateVal = pay.date || pay.paymentDate || new Date().toISOString().split('T')[0];
  const dateStr = dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;

  const payload: CreatePaymentInPayload = {
    date: dateStr,
    partyName: pay.partyName.trim(),
    paymentType: pay.paymentType || pay.paymentMethod || 'Cash',
    receivedAmount: Math.max(0, Number(pay.receivedAmount ?? pay.amount ?? 0)),
  };

  if (pay.receiptNo && pay.receiptNo.trim()) {
    payload.receiptNo = pay.receiptNo.trim();
  }
  if (pay.customerId && UUID_REGEX.test(pay.customerId)) {
    payload.customerId = pay.customerId;
  }
  if (pay.customerPhone && pay.customerPhone.trim()) {
    payload.customerPhone = pay.customerPhone.trim();
  }
  if (pay.customerCompany && pay.customerCompany.trim()) {
    payload.customerCompany = pay.customerCompany.trim();
  }
  if (pay.referenceNo && pay.referenceNo.trim()) {
    payload.referenceNo = pay.referenceNo.trim();
  }
  if (pay.description && pay.description.trim()) {
    payload.description = pay.description.trim();
  }
  if (pay.notes && pay.notes.trim()) {
    payload.notes = pay.notes.trim();
  }
  if (pay.imageAttachment && pay.imageAttachment.trim()) {
    payload.imageAttachment = pay.imageAttachment.trim();
  }
  if (pay.firmName && pay.firmName.trim()) {
    payload.firmName = pay.firmName.trim();
  }
  if (pay.invoiceNo && pay.invoiceNo.trim()) {
    payload.invoiceNo = pay.invoiceNo.trim();
  }
  if (pay.invoiceId && UUID_REGEX.test(pay.invoiceId)) {
    payload.invoiceId = pay.invoiceId;
  }
  if (pay.status && pay.status.trim()) {
    payload.status = pay.status.trim();
  }

  return payload;
};

// =========================================================================
// RTK Query Injected Endpoints for Commerce Payments In
// =========================================================================

export const commercePaymentInEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommercePaymentIns: builder.query<CommercePaymentInListResponse, PaymentInFilterParams | void>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params) {
          if (typeof params.page_no === 'number') queryParams.page_no = params.page_no;
          if (typeof params.page_size === 'number') queryParams.page_size = params.page_size;
          if (typeof params.pagination_required !== 'undefined') {
            queryParams.pagination_required = String(params.pagination_required);
          }
          if (params.search && params.search.trim()) {
            queryParams.search = params.search.trim();
          }
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
          if (params.status && params.status !== 'ALL' && params.status !== 'All') {
            queryParams.status = params.status;
          }
          if (params.customerId && UUID_REGEX.test(params.customerId)) {
            queryParams.customerId = params.customerId;
          }
          if (params.branchId && UUID_REGEX.test(params.branchId)) {
            queryParams.branchId = params.branchId;
          }
          if (params.from) queryParams.from = params.from;
          if (params.to) queryParams.to = params.to;
          if (params.period && params.period !== 'all' && params.period !== 'All Time') {
            queryParams.period = params.period;
          }
          if (params.invoiceId && UUID_REGEX.test(params.invoiceId)) {
            queryParams.invoiceId = params.invoiceId;
          }
          if (params.paymentType && params.paymentType !== 'ALL' && params.paymentType !== 'All') {
            queryParams.paymentType = params.paymentType;
          }
        }
        return {
          url: '/commerce/payments-in',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'PaymentIn' as const, id })),
              { type: 'PaymentIn', id: 'LIST' },
            ]
          : [{ type: 'PaymentIn', id: 'LIST' }],
    }),

    getCommercePaymentInById: builder.query<CommercePaymentInSingleResponse, string>({
      query: (id) => `/commerce/payments-in/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'PaymentIn', id }],
    }),

    createCommercePaymentIn: builder.mutation<CommercePaymentInSingleResponse, CreatePaymentInPayload>({
      query: (payload) => ({
        url: '/commerce/payments-in',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'PaymentIn', id: 'LIST' },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'Customer', id: 'LIST' },
        'SalesRepresentative',
        'Dashboard',
      ],
    }),

    updateCommercePaymentIn: builder.mutation<
      CommercePaymentInSingleResponse,
      { id: string; payload: UpdatePaymentInPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/payments-in/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PaymentIn', id },
        { type: 'PaymentIn', id: 'LIST' },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'Customer', id: 'LIST' },
        'SalesRepresentative',
        'Dashboard',
      ],
    }),

    patchCommercePaymentIn: builder.mutation<
      CommercePaymentInSingleResponse,
      { id: string; payload: PatchPaymentInPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/payments-in/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PaymentIn', id },
        { type: 'PaymentIn', id: 'LIST' },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'Customer', id: 'LIST' },
        'SalesRepresentative',
        'Dashboard',
      ],
    }),

    deleteCommercePaymentIn: builder.mutation<CommercePaymentInDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/payments-in/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'PaymentIn', id },
        { type: 'PaymentIn', id: 'LIST' },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'Customer', id: 'LIST' },
        'SalesRepresentative',
        'Dashboard',
      ],
    }),
  }),
});

export const {
  useGetCommercePaymentInsQuery,
  useLazyGetCommercePaymentInsQuery,
  useGetCommercePaymentInByIdQuery,
  useCreateCommercePaymentInMutation,
  useUpdateCommercePaymentInMutation,
  usePatchCommercePaymentInMutation,
  useDeleteCommercePaymentInMutation,
} = commercePaymentInEndpoints;

// =========================================================================
// Imperative API Client for Commerce Payments In
// =========================================================================

export const commercePaymentInApi = {
  /**
   * List payment receipts
   * GET /commerce/payments-in
   */
  getPaymentIns: async (params?: PaymentInFilterParams): Promise<CommercePaymentInListResponse> => {
    const queryParams: Record<string, any> = {};

    if (params) {
      if (typeof params.page_no === 'number') queryParams.page_no = params.page_no;
      if (typeof params.page_size === 'number') queryParams.page_size = params.page_size;
      if (typeof params.pagination_required !== 'undefined') {
        queryParams.pagination_required = String(params.pagination_required);
      }
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params.status && params.status !== 'ALL' && params.status !== 'All') {
        queryParams.status = params.status;
      }
      if (params.customerId && UUID_REGEX.test(params.customerId)) {
        queryParams.customerId = params.customerId;
      }
      if (params.branchId && UUID_REGEX.test(params.branchId)) {
        queryParams.branchId = params.branchId;
      }
      if (params.from) queryParams.from = params.from;
      if (params.to) queryParams.to = params.to;
      if (params.period && params.period !== 'all' && params.period !== 'All Time') {
        queryParams.period = params.period;
      }
      if (params.invoiceId && UUID_REGEX.test(params.invoiceId)) {
        queryParams.invoiceId = params.invoiceId;
      }
      if (params.paymentType && params.paymentType !== 'ALL' && params.paymentType !== 'All') {
        queryParams.paymentType = params.paymentType;
      }
    }

    const response = await baseClient.get<CommercePaymentInListResponse>('/commerce/payments-in', {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * Get single payment receipt
   * GET /commerce/payments-in/{id}
   */
  getPaymentInById: async (id: string): Promise<CommercePaymentInSingleResponse> => {
    const response = await baseClient.get<CommercePaymentInSingleResponse>(`/commerce/payments-in/${id}`);
    return response.data;
  },

  /**
   * Record a payment receipt
   * POST /commerce/payments-in
   */
  createPaymentIn: async (payload: CreatePaymentInPayload): Promise<CommercePaymentInSingleResponse> => {
    const response = await baseClient.post<CommercePaymentInSingleResponse>('/commerce/payments-in', payload);
    return response.data;
  },

  /**
   * Edit payment receipt
   * PUT /commerce/payments-in/{id}
   */
  updatePaymentIn: async (
    id: string,
    payload: UpdatePaymentInPayload
  ): Promise<CommercePaymentInSingleResponse> => {
    const response = await baseClient.put<CommercePaymentInSingleResponse>(`/commerce/payments-in/${id}`, payload);
    return response.data;
  },

  /**
   * Partially edit payment receipt
   * PATCH /commerce/payments-in/{id}
   */
  patchPaymentIn: async (
    id: string,
    payload: PatchPaymentInPayload
  ): Promise<CommercePaymentInSingleResponse> => {
    const response = await baseClient.patch<CommercePaymentInSingleResponse>(`/commerce/payments-in/${id}`, payload);
    return response.data;
  },

  /**
   * Void payment receipt (re-opens linked invoice balance)
   * DELETE /commerce/payments-in/{id}
   */
  deletePaymentIn: async (id: string): Promise<CommercePaymentInDeleteResponse> => {
    const response = await baseClient.delete<CommercePaymentInDeleteResponse>(`/commerce/payments-in/${id}`);
    return response.data;
  },
};
