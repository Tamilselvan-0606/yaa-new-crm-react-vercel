import { baseClient, baseApi } from '../baseApi';
import {
  TaxSettingsResponse,
  UpdateTaxSettingsPayload,
  TaxRatesListResponse,
  CreateTaxRatePayload,
  UpdateTaxRatePayload,
  SingleTaxRateResponse,
  DeleteTaxRateResponse,
} from './taxSettingsTypes';

export * from './taxSettingsTypes';

export const taxSettingsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTaxSettings: builder.query<TaxSettingsResponse, void>({
      query: () => '/settings/taxes',
      providesTags: ['TaxSetting'],
    }),

    updateTaxSettings: builder.mutation<TaxSettingsResponse, UpdateTaxSettingsPayload>({
      query: (payload) => ({
        url: '/settings/taxes',
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['TaxSetting'],
    }),

    patchTaxSettings: builder.mutation<TaxSettingsResponse, UpdateTaxSettingsPayload>({
      query: (payload) => ({
        url: '/settings/taxes',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['TaxSetting'],
    }),

    getTaxRates: builder.query<TaxRatesListResponse, void>({
      query: () => '/settings/tax-rates',
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'TaxRate' as const, id })),
              { type: 'TaxRate', id: 'LIST' },
            ]
          : [{ type: 'TaxRate', id: 'LIST' }],
    }),

    createTaxRate: builder.mutation<SingleTaxRateResponse, CreateTaxRatePayload>({
      query: (payload) => ({
        url: '/settings/tax-rates',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'TaxRate', id: 'LIST' }, 'TaxSetting'],
    }),

    updateTaxRate: builder.mutation<
      SingleTaxRateResponse,
      { id: string; payload: UpdateTaxRatePayload }
    >({
      query: ({ id, payload }) => ({
        url: `/settings/tax-rates/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'TaxRate', id },
        { type: 'TaxRate', id: 'LIST' },
        'TaxSetting',
      ],
    }),

    patchTaxRate: builder.mutation<
      SingleTaxRateResponse,
      { id: string; payload: UpdateTaxRatePayload }
    >({
      query: ({ id, payload }) => ({
        url: `/settings/tax-rates/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'TaxRate', id },
        { type: 'TaxRate', id: 'LIST' },
        'TaxSetting',
      ],
    }),

    deleteTaxRate: builder.mutation<DeleteTaxRateResponse, string>({
      query: (id) => ({
        url: `/settings/tax-rates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'TaxRate', id: 'LIST' }, 'TaxSetting'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetTaxSettingsQuery,
  useUpdateTaxSettingsMutation,
  usePatchTaxSettingsMutation,
  useGetTaxRatesQuery,
  useCreateTaxRateMutation,
  useUpdateTaxRateMutation,
  usePatchTaxRateMutation,
  useDeleteTaxRateMutation,
} = taxSettingsEndpoints;

export const taxSettingsApi = {
  getTaxSettings: async (): Promise<TaxSettingsResponse> => {
    const res = await baseClient.get<TaxSettingsResponse>('/settings/taxes');
    return res.data;
  },

  updateTaxSettings: async (payload: UpdateTaxSettingsPayload): Promise<TaxSettingsResponse> => {
    const res = await baseClient.put<TaxSettingsResponse>('/settings/taxes', payload);
    return res.data;
  },

  patchTaxSettings: async (payload: UpdateTaxSettingsPayload): Promise<TaxSettingsResponse> => {
    const res = await baseClient.patch<TaxSettingsResponse>('/settings/taxes', payload);
    return res.data;
  },

  getTaxRates: async (): Promise<TaxRatesListResponse> => {
    const res = await baseClient.get<TaxRatesListResponse>('/settings/tax-rates');
    return res.data;
  },

  createTaxRate: async (payload: CreateTaxRatePayload): Promise<SingleTaxRateResponse> => {
    const res = await baseClient.post<SingleTaxRateResponse>('/settings/tax-rates', payload);
    return res.data;
  },

  updateTaxRate: async (
    id: string,
    payload: UpdateTaxRatePayload
  ): Promise<SingleTaxRateResponse> => {
    const res = await baseClient.put<SingleTaxRateResponse>(`/settings/tax-rates/${id}`, payload);
    return res.data;
  },

  patchTaxRate: async (
    id: string,
    payload: UpdateTaxRatePayload
  ): Promise<SingleTaxRateResponse> => {
    const res = await baseClient.patch<SingleTaxRateResponse>(`/settings/tax-rates/${id}`, payload);
    return res.data;
  },

  deleteTaxRate: async (id: string): Promise<DeleteTaxRateResponse> => {
    const res = await baseClient.delete<DeleteTaxRateResponse>(`/settings/tax-rates/${id}`);
    return res.data;
  },
};
