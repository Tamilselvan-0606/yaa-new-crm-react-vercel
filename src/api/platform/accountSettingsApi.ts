import { baseClient, baseApi } from '../baseApi';
import {
  AccountProfileResponse,
  UpdateAccountProfilePayload,
  ChangePasswordPayload,
  ChangePasswordResponse,
  Toggle2FaPayload,
  Toggle2FaResponse,
} from './accountSettingsTypes';

export * from './accountSettingsTypes';

export const accountSettingsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAccountProfile: builder.query<AccountProfileResponse, void>({
      query: () => '/settings/account',
      providesTags: ['AccountSetting'],
    }),

    updateAccountProfile: builder.mutation<
      AccountProfileResponse,
      UpdateAccountProfilePayload
    >({
      query: (payload) => ({
        url: '/settings/account',
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: ['AccountSetting', 'User'],
    }),

    patchAccountProfile: builder.mutation<
      AccountProfileResponse,
      UpdateAccountProfilePayload
    >({
      query: (payload) => ({
        url: '/settings/account',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['AccountSetting', 'User'],
    }),

    changeAccountPassword: builder.mutation<
      ChangePasswordResponse,
      ChangePasswordPayload
    >({
      query: (payload) => ({
        url: '/settings/account/password',
        method: 'PUT',
        body: payload,
      }),
    }),

    toggle2Fa: builder.mutation<Toggle2FaResponse, Toggle2FaPayload>({
      query: (payload) => ({
        url: '/settings/account/2fa',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['AccountSetting'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAccountProfileQuery,
  useLazyGetAccountProfileQuery,
  useUpdateAccountProfileMutation,
  usePatchAccountProfileMutation,
  useChangeAccountPasswordMutation,
  useToggle2FaMutation,
} = accountSettingsEndpoints;

export const accountSettingsApi = {
  getAccountProfile: async (): Promise<AccountProfileResponse> => {
    const response = await baseClient.get<AccountProfileResponse>('/settings/account');
    return response.data;
  },

  updateAccountProfile: async (
    payload: UpdateAccountProfilePayload
  ): Promise<AccountProfileResponse> => {
    const response = await baseClient.put<AccountProfileResponse>(
      '/settings/account',
      payload
    );
    return response.data;
  },

  patchAccountProfile: async (
    payload: UpdateAccountProfilePayload
  ): Promise<AccountProfileResponse> => {
    const response = await baseClient.patch<AccountProfileResponse>(
      '/settings/account',
      payload
    );
    return response.data;
  },

  changePassword: async (
    payload: ChangePasswordPayload
  ): Promise<ChangePasswordResponse> => {
    const response = await baseClient.put<ChangePasswordResponse>(
      '/settings/account/password',
      payload
    );
    return response.data;
  },

  toggle2Fa: async (
    payload: Toggle2FaPayload
  ): Promise<Toggle2FaResponse> => {
    const response = await baseClient.patch<Toggle2FaResponse>(
      '/settings/account/2fa',
      payload
    );
    return response.data;
  },
};
