import { baseClient, baseApi, buildListParams } from '../baseApi';
import {
  QuoteListParams,
  QuoteListResponse,
  QuoteSingleResponse,
  QuoteDeleteResponse,
  QuoteConvertResponse,
  CreateQuoteRequest,
  UpdateQuoteRequest,
  ConvertQuoteRequest,
} from './quoteTypes';

export * from './quoteTypes';

export const quoteEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformQuotes: builder.query<QuoteListResponse, QuoteListParams | void>({
      query: (params) => ({
        url: '/platform/quotes',
        params: { ...params, ...buildListParams(params as any, { sortBy: 'createdAt', sortOrder: 'desc' }) },
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'PlatformQuote' as const, id })),
              { type: 'PlatformQuote', id: 'LIST' },
            ]
          : [{ type: 'PlatformQuote', id: 'LIST' }],
    }),

    getPlatformQuoteById: builder.query<QuoteSingleResponse, string>({
      query: (id) => `/platform/quotes/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'PlatformQuote', id }],
    }),

    createPlatformQuote: builder.mutation<QuoteSingleResponse, CreateQuoteRequest>({
      query: (payload) => ({
        url: '/platform/quotes',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'PlatformQuote', id: 'LIST' }],
    }),

    updatePlatformQuote: builder.mutation<QuoteSingleResponse, { id: string; payload: UpdateQuoteRequest }>({
      query: ({ id, payload }) => ({
        url: `/platform/quotes/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PlatformQuote', id },
        { type: 'PlatformQuote', id: 'LIST' },
      ],
    }),

    deletePlatformQuote: builder.mutation<QuoteDeleteResponse, string>({
      query: (id) => ({
        url: `/platform/quotes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'PlatformQuote', id: 'LIST' }],
    }),

    convertPlatformQuote: builder.mutation<QuoteConvertResponse, { id: string; payload: ConvertQuoteRequest }>({
      query: ({ id, payload }) => ({
        url: `/platform/quotes/${id}/convert`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'PlatformQuote', id: 'LIST' }, { type: 'PlatformInvoice', id: 'LIST' }],
    }),

    convertToProformaInvoice: builder.mutation<QuoteConvertResponse, { id: string; payload: { dueDate?: string } }>({
      query: ({ id, payload }) => ({
        url: `/platform/quotes/${id}/convert-to-proforma-invoice`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'PlatformQuote', id: 'LIST' }, { type: 'PlatformInvoice', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPlatformQuotesQuery,
  useGetPlatformQuoteByIdQuery,
  useCreatePlatformQuoteMutation,
  useUpdatePlatformQuoteMutation,
  useDeletePlatformQuoteMutation,
  useConvertPlatformQuoteMutation,
  useConvertToProformaInvoiceMutation,
} = quoteEndpoints;

export const quoteApi = {
  getQuotes: async (params?: QuoteListParams): Promise<QuoteListResponse> => {
    const res = await baseClient.get<QuoteListResponse>('/platform/quotes', {
      params: { ...params, ...buildListParams(params as any, { sortBy: 'createdAt', sortOrder: 'desc' }) },
    });
    return res.data;
  },

  createQuote: async (payload: CreateQuoteRequest): Promise<QuoteSingleResponse> => {
    const res = await baseClient.post<QuoteSingleResponse>('/platform/quotes', payload);
    return res.data;
  },

  getQuoteById: async (id: string): Promise<QuoteSingleResponse> => {
    const res = await baseClient.get<QuoteSingleResponse>(`/platform/quotes/${id}`);
    return res.data;
  },

  updateQuote: async (id: string, payload: UpdateQuoteRequest): Promise<QuoteSingleResponse> => {
    const res = await baseClient.put<QuoteSingleResponse>(`/platform/quotes/${id}`, payload);
    return res.data;
  },

  deleteQuote: async (id: string): Promise<QuoteDeleteResponse> => {
    const res = await baseClient.delete<QuoteDeleteResponse>(`/platform/quotes/${id}`);
    return res.data;
  },

  convertQuote: async (id: string, payload: ConvertQuoteRequest): Promise<QuoteConvertResponse> => {
    const res = await baseClient.post<QuoteConvertResponse>(`/platform/quotes/${id}/convert`, payload);
    return res.data;
  },

  convertToProformaInvoice: async (id: string, payload?: { dueDate?: string }): Promise<QuoteConvertResponse> => {
    const res = await baseClient.post<QuoteConvertResponse>(`/platform/quotes/${id}/convert-to-proforma-invoice`, payload || {});
    return res.data;
  },
};
