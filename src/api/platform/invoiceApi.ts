import { baseClient, baseApi } from '../baseApi';
import {
  InvoiceListParams,
  InvoiceListResponse,
  InvoiceSingleResponse,
  InvoiceDeleteResponse,
  InvoicePaymentsListResponse,
  InvoiceRecordPaymentResponse,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  RecordPaymentRequest,
} from './invoiceTypes';

export * from './invoiceTypes';

export const invoiceEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformInvoices: builder.query<InvoiceListResponse, InvoiceListParams | void>({
      query: (params) => ({
        url: '/platform/invoices',
        params: params || {},
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'SalesInvoice' as const, id })),
              { type: 'SalesInvoice', id: 'LIST' },
            ]
          : [{ type: 'SalesInvoice', id: 'LIST' }],
    }),

    getPlatformInvoiceById: builder.query<InvoiceSingleResponse, string>({
      query: (id) => `/platform/invoices/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'SalesInvoice', id }],
    }),

    createPlatformInvoice: builder.mutation<InvoiceSingleResponse, CreateInvoiceRequest>({
      query: (payload) => ({
        url: '/platform/invoices',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'SalesInvoice', id: 'LIST' }, 'Dashboard'],
    }),

    updatePlatformInvoice: builder.mutation<
      InvoiceSingleResponse,
      { id: string; payload: UpdateInvoiceRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/platform/invoices/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalesInvoice', id },
        { type: 'SalesInvoice', id: 'LIST' },
      ],
    }),

    deletePlatformInvoice: builder.mutation<InvoiceDeleteResponse, string>({
      query: (id) => ({
        url: `/platform/invoices/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'SalesInvoice', id: 'LIST' }, 'Dashboard'],
    }),

    getPlatformInvoicePayments: builder.query<InvoicePaymentsListResponse, string>({
      query: (id) => `/platform/invoices/${id}/payments`,
      providesTags: (_result, _error, id) => [{ type: 'Payment', id: `INV_${id}` }],
    }),

    recordPlatformInvoicePayment: builder.mutation<
      InvoiceRecordPaymentResponse,
      { id: string; payload: RecordPaymentRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/platform/invoices/${id}/payments`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalesInvoice', id },
        { type: 'Payment', id: 'LIST' },
        'Dashboard',
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPlatformInvoicesQuery,
  useGetPlatformInvoiceByIdQuery,
  useCreatePlatformInvoiceMutation,
  useUpdatePlatformInvoiceMutation,
  useDeletePlatformInvoiceMutation,
  useGetPlatformInvoicePaymentsQuery,
  useRecordPlatformInvoicePaymentMutation,
} = invoiceEndpoints;

export const invoiceApi = {
  getInvoices: async (params?: InvoiceListParams): Promise<InvoiceListResponse> => {
    const res = await baseClient.get<InvoiceListResponse>('/platform/invoices', {
      params,
    });
    return res.data;
  },

  createInvoice: async (payload: CreateInvoiceRequest): Promise<InvoiceSingleResponse> => {
    const res = await baseClient.post<InvoiceSingleResponse>('/platform/invoices', payload);
    return res.data;
  },

  getInvoiceById: async (id: string): Promise<InvoiceSingleResponse> => {
    const res = await baseClient.get<InvoiceSingleResponse>(`/platform/invoices/${id}`);
    return res.data;
  },

  updateInvoice: async (
    id: string,
    payload: UpdateInvoiceRequest
  ): Promise<InvoiceSingleResponse> => {
    const res = await baseClient.put<InvoiceSingleResponse>(`/platform/invoices/${id}`, payload);
    return res.data;
  },

  deleteInvoice: async (id: string): Promise<InvoiceDeleteResponse> => {
    const res = await baseClient.delete<InvoiceDeleteResponse>(`/platform/invoices/${id}`);
    return res.data;
  },

  getInvoicePayments: async (id: string): Promise<InvoicePaymentsListResponse> => {
    const res = await baseClient.get<InvoicePaymentsListResponse>(`/platform/invoices/${id}/payments`);
    return res.data;
  },

  recordPayment: async (
    id: string,
    payload: RecordPaymentRequest
  ): Promise<InvoiceRecordPaymentResponse> => {
    const res = await baseClient.post<InvoiceRecordPaymentResponse>(
      `/platform/invoices/${id}/payments`,
      payload
    );
    return res.data;
  },
};
