import { baseClient, baseApi } from '../baseApi';
import {
  NumberingSettingsResponse,
  UpdateNumberingSettingsPayload,
  AddPrefixOptionPayload,
  AddPrefixOptionResponse,
  RemovePrefixOptionResponse,
} from './numberingTypes';

export * from './numberingTypes';

export const numberingEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNumberingSettings: builder.query<NumberingSettingsResponse, void>({
      query: () => '/settings/numbering',
      providesTags: ['NumberingSetting'],
    }),

    updateNumberingSettings: builder.mutation<
      NumberingSettingsResponse,
      UpdateNumberingSettingsPayload
    >({
      query: (payload) => ({
        url: '/settings/numbering',
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['NumberingSetting'],
    }),

    patchNumberingSettings: builder.mutation<
      NumberingSettingsResponse,
      UpdateNumberingSettingsPayload
    >({
      query: (payload) => ({
        url: '/settings/numbering',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['NumberingSetting'],
    }),

    addPrefixOption: builder.mutation<AddPrefixOptionResponse, AddPrefixOptionPayload>({
      query: (payload) => ({
        url: '/settings/numbering/prefixes',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['NumberingSetting'],
    }),

    deletePrefixOption: builder.mutation<RemovePrefixOptionResponse, string>({
      query: (prefix) => ({
        url: `/settings/numbering/prefixes/${encodeURIComponent(prefix)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['NumberingSetting'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNumberingSettingsQuery,
  useLazyGetNumberingSettingsQuery,
  useUpdateNumberingSettingsMutation,
  usePatchNumberingSettingsMutation,
  useAddPrefixOptionMutation,
  useDeletePrefixOptionMutation,
} = numberingEndpoints;

export const numberingApi = {
  getNumberingSettings: async (): Promise<NumberingSettingsResponse> => {
    const response = await baseClient.get<NumberingSettingsResponse>('/settings/numbering');
    return response.data;
  },

  updateNumberingSettings: async (
    payload: UpdateNumberingSettingsPayload
  ): Promise<NumberingSettingsResponse> => {
    const response = await baseClient.put<NumberingSettingsResponse>(
      '/settings/numbering',
      payload
    );
    return response.data;
  },

  patchNumberingSettings: async (
    payload: UpdateNumberingSettingsPayload
  ): Promise<NumberingSettingsResponse> => {
    const response = await baseClient.patch<NumberingSettingsResponse>(
      '/settings/numbering',
      payload
    );
    return response.data;
  },

  addPrefixOption: async (
    payload: AddPrefixOptionPayload
  ): Promise<AddPrefixOptionResponse> => {
    const response = await baseClient.post<AddPrefixOptionResponse>(
      '/settings/numbering/prefixes',
      payload
    );
    return response.data;
  },

  deletePrefixOption: async (prefix: string): Promise<RemovePrefixOptionResponse> => {
    const response = await baseClient.delete<RemovePrefixOptionResponse>(
      `/settings/numbering/prefixes/${encodeURIComponent(prefix)}`
    );
    return response.data;
  },
};
