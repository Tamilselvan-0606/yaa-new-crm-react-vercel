import { baseClient, baseApi } from '../baseApi';
import {
  ProformaListParams,
  ProformaListResponse,
  ProformaSingleResponse,
  ProformaDeleteResponse,
  ProformaConvertResponse,
  CreateProformaRequest,
  UpdateProformaRequest,
  ConvertProformaToInvoiceRequest,
} from './proformaInvoiceTypes';

export * from './proformaInvoiceTypes';

export const proformaInvoiceEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformProformaInvoices: builder.query<ProformaListResponse, ProformaListParams | void>({
      query: (params) => ({
        url: '/platform/proforma-invoices',
        params: params || {},
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Proforma' as const, id })),
              { type: 'Proforma', id: 'LIST' },
            ]
          : [{ type: 'Proforma', id: 'LIST' }],
    }),

    getPlatformProformaInvoiceById: builder.query<ProformaSingleResponse, string>({
      query: (id) => `/platform/proforma-invoices/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Proforma', id }],
    }),

    createPlatformProformaInvoice: builder.mutation<ProformaSingleResponse, CreateProformaRequest>({
      query: (payload) => ({
        url: '/platform/proforma-invoices',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Proforma', id: 'LIST' }],
    }),

    updatePlatformProformaInvoice: builder.mutation<
      ProformaSingleResponse,
      { id: string; payload: UpdateProformaRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/platform/proforma-invoices/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Proforma', id },
        { type: 'Proforma', id: 'LIST' },
      ],
    }),

    deletePlatformProformaInvoice: builder.mutation<ProformaDeleteResponse, string>({
      query: (id) => ({
        url: `/platform/proforma-invoices/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Proforma', id: 'LIST' }],
    }),

    convertPlatformProformaToInvoice: builder.mutation<
      ProformaConvertResponse,
      { id: string; payload?: ConvertProformaToInvoiceRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/platform/proforma-invoices/${id}/convert-to-invoice`,
        method: 'POST',
        body: payload || {},
      }),
      invalidatesTags: [
        { type: 'Proforma', id: 'LIST' },
        { type: 'SalesInvoice', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPlatformProformaInvoicesQuery,
  useGetPlatformProformaInvoiceByIdQuery,
  useCreatePlatformProformaInvoiceMutation,
  useUpdatePlatformProformaInvoiceMutation,
  useDeletePlatformProformaInvoiceMutation,
  useConvertPlatformProformaToInvoiceMutation,
} = proformaInvoiceEndpoints;

export const proformaInvoiceApi = {
  getProformaInvoices: async (params?: ProformaListParams): Promise<ProformaListResponse> => {
    const res = await baseClient.get<ProformaListResponse>('/platform/proforma-invoices', {
      params,
    });
    return res.data;
  },

  createProformaInvoice: async (payload: CreateProformaRequest): Promise<ProformaSingleResponse> => {
    const res = await baseClient.post<ProformaSingleResponse>('/platform/proforma-invoices', payload);
    return res.data;
  },

  getProformaInvoiceById: async (id: string): Promise<ProformaSingleResponse> => {
    const res = await baseClient.get<ProformaSingleResponse>(`/platform/proforma-invoices/${id}`);
    return res.data;
  },

  updateProformaInvoice: async (
    id: string,
    payload: UpdateProformaRequest
  ): Promise<ProformaSingleResponse> => {
    const res = await baseClient.put<ProformaSingleResponse>(`/platform/proforma-invoices/${id}`, payload);
    return res.data;
  },

  deleteProformaInvoice: async (id: string): Promise<ProformaDeleteResponse> => {
    const res = await baseClient.delete<ProformaDeleteResponse>(`/platform/proforma-invoices/${id}`);
    return res.data;
  },

  convertToInvoice: async (
    id: string,
    payload?: ConvertProformaToInvoiceRequest
  ): Promise<ProformaConvertResponse> => {
    const res = await baseClient.post<ProformaConvertResponse>(
      `/platform/proforma-invoices/${id}/convert-to-invoice`,
      payload || {}
    );
    return res.data;
  },
};
