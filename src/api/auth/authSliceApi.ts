import { baseApi } from '../baseApi';
import {
  ApiLoginRequest,
  ApiLoginResponse,
  ApiRefreshTokenResponse,
  ApiForgotPasswordRequest,
  ApiForgotPasswordResponse,
  ApiResetPasswordRequest,
  ApiVerifyTokenResponse,
  ApiMeResponse,
  ApiEmailVerificationResponse,
  ApiVerifyEmailRequest,
  ApiVerifyEmailResponse,
  ApiChangePasswordRequest,
} from './authTypes';

export const authEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ApiLoginResponse, ApiLoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User', 'Dashboard'],
    }),

    refreshToken: builder.mutation<ApiRefreshTokenResponse, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
        headers: {
          'X-CSRF-Protection': '1',
          'accept': '*/*',
        },
      }),
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User', 'Dashboard'],
    }),

    logoutAll: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout-all',
        method: 'POST',
      }),
      invalidatesTags: ['User', 'Dashboard'],
    }),

    verifyToken: builder.query<ApiVerifyTokenResponse, void>({
      query: () => '/auth/verify',
    }),

    getCurrentUser: builder.query<ApiMeResponse, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),

    forgotPassword: builder.mutation<ApiForgotPasswordResponse, ApiForgotPasswordRequest>({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),

    resetPassword: builder.mutation<void, ApiResetPasswordRequest>({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),

    requestEmailVerification: builder.mutation<ApiEmailVerificationResponse, void>({
      query: () => ({
        url: '/auth/request-email-verification',
        method: 'POST',
      }),
    }),

    verifyEmail: builder.mutation<ApiVerifyEmailResponse, ApiVerifyEmailRequest | string>({
      query: (payload) => ({
        url: '/auth/verify-email',
        method: 'POST',
        body: typeof payload === 'string' ? { token: payload } : payload,
      }),
    }),

    changePassword: builder.mutation<void, ApiChangePasswordRequest>({
      query: (body) => ({
        url: '/auth/change-password',
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useLoginMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useLogoutAllMutation,
  useVerifyTokenQuery,
  useGetCurrentUserQuery,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useRequestEmailVerificationMutation,
  useVerifyEmailMutation,
  useChangePasswordMutation,
} = authEndpoints;
