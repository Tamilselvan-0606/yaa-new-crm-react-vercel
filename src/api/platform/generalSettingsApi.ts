import { baseClient, baseApi } from '../baseApi';
import {
  GeneralSettingsResponse,
  UpdateGeneralSettingsPayload,
} from './generalSettingsTypes';

export * from './generalSettingsTypes';

export const generalSettingsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGeneralSettings: builder.query<GeneralSettingsResponse, void>({
      query: () => '/settings/general',
      providesTags: ['GeneralSetting'],
    }),

    updateGeneralSettings: builder.mutation<
      GeneralSettingsResponse,
      UpdateGeneralSettingsPayload
    >({
      query: (payload) => ({
        url: '/settings/general',
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['GeneralSetting'],
    }),

    patchGeneralSettings: builder.mutation<
      GeneralSettingsResponse,
      UpdateGeneralSettingsPayload
    >({
      query: (payload) => ({
        url: '/settings/general',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['GeneralSetting'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetGeneralSettingsQuery,
  useLazyGetGeneralSettingsQuery,
  useUpdateGeneralSettingsMutation,
  usePatchGeneralSettingsMutation,
} = generalSettingsEndpoints;

export const generalSettingsApi = {
  getGeneralSettings: async (): Promise<GeneralSettingsResponse> => {
    const response = await baseClient.get<GeneralSettingsResponse>('/settings/general');
    return response.data;
  },

  updateGeneralSettings: async (
    payload: UpdateGeneralSettingsPayload
  ): Promise<GeneralSettingsResponse> => {
    const response = await baseClient.put<GeneralSettingsResponse>(
      '/settings/general',
      payload
    );
    return response.data;
  },

  patchGeneralSettings: async (
    payload: UpdateGeneralSettingsPayload
  ): Promise<GeneralSettingsResponse> => {
    const response = await baseClient.patch<GeneralSettingsResponse>(
      '/settings/general',
      payload
    );
    return response.data;
  },
};
