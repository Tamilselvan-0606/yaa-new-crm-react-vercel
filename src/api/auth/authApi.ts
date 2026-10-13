import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL, AUTH_API_BASE_URL, getStoredToken } from '../config';
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

/**
 * Helper to extract access token safely from various response structures
 */
export const extractAccessToken = (response: any): string | null => {
  if (!response) return null;
  return (
    response.accessToken ||
    response.data?.token ||
    response.data?.accessToken ||
    response.token ||
    null
  );
};

/**
 * Bare axios instance used ONLY for /auth/refresh.
 * Has ZERO interceptors so the HttpOnly yaa_crm_refresh cookie is sent cleanly.
 * No Authorization header is injected — the server reads the cookie exclusively.
 * Mirrors the bellsnrings-customer-portal axiosInstance pattern exactly.
 */
const refreshHttpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // sends HttpOnly yaa_crm_refresh cookie automatically
  // timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': '*/*',
  },
});

/**
 * Dedicated Auth API client targeting /api/v1/auth
 */
export const authHttpClient: AxiosInstance = axios.create({
  baseURL: AUTH_API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

authHttpClient.interceptors.request.use(
  (config) => {
    // Endpoints that use HttpOnly cookie or unauthenticated payload (do not send expired token)
    const isCookieOrPublicAuth =
      config.url?.includes('/refresh') ||
      config.url?.includes('/login') ||
      config.url?.includes('/forgot-password') ||
      config.url?.includes('/reset-password');

    if (!isCookieOrPublicAuth) {
      const token = getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      delete config.headers.Authorization;
    }

    if (config.url?.includes('/refresh')) {
      config.headers['X-CSRF-Protection'] = '1';
      config.headers['accept'] = '*/*';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

authHttpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    let message = 'Authentication request failed';

    if (data?.error?.message) {
      message = data.error.message;
      if (Array.isArray(data.error.fields) && data.error.fields.length > 0) {
        const fieldErrors = data.error.fields
          .map((f: any) => `${f.path ? f.path.join('.') + ': ' : ''}${f.message}`)
          .join(', ');
        message = `${message} (${fieldErrors})`;
      }
    } else if (data?.message) {
      message = data.message;
    } else if (error.message) {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);

/**
 * Auth Module API methods
 */
export const authApi = {
  // POST /login
  login: async (payload: ApiLoginRequest): Promise<ApiLoginResponse> => {
    const res = await authHttpClient.post<ApiLoginResponse>('/login', payload);
    return res.data;
  },

  // POST /refresh - Uses bare refreshHttpClient (no interceptors) so the
  // HttpOnly yaa_crm_refresh cookie is sent without any Authorization header.
  // Mirrors bellsnrings-customer-portal axiosBaseQueryWithReauth exactly.
  refreshToken: async (): Promise<ApiRefreshTokenResponse> => {
    console.group('🔄 [AuthApi] POST /auth/refresh invoked');
    console.log(
      '📋 Visible cookies (HttpOnly cookies like yaa_crm_refresh are NOT visible here, but ARE sent by browser):',
      document.cookie || '(none visible to JS)'
    );
    console.log('📡 Using refreshHttpClient — bare instance, NO interceptors, withCredentials: true');
    console.log('🎯 POST URL:', `${API_BASE_URL}/auth/refresh`);

    try {
      // Use refreshHttpClient (bare, no interceptors) to POST /auth/refresh.
      // The browser automatically attaches the HttpOnly yaa_crm_refresh cookie.
      // No Authorization header is sent — server reads cookie exclusively.
      const res = await refreshHttpClient.post<ApiRefreshTokenResponse>(
        '/auth/refresh',
        undefined, // empty body — server reads cookie only
        {
          headers: {
            'X-CSRF-Protection': '1',
          },
        }
      );
      console.log('✅ [AuthApi] /auth/refresh succeeded! Status:', res.status);
      console.log('📦 Response data:', res.data);
      console.groupEnd();
      return res.data;
    } catch (error: any) {
      console.error('❌ [AuthApi] /auth/refresh FAILED:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        responseData: error?.response?.data,
        headers: error?.config?.headers,
        message: error?.message,
      });
      console.groupEnd();
      throw error; // re-throw original AxiosError (not wrapped)
    }
  },

  // POST /logout
  logout: async (): Promise<void> => {
    await authHttpClient.post('/logout');
  },

  // POST /logout-all
  logoutAll: async (): Promise<void> => {
    await authHttpClient.post('/logout-all');
  },

  // POST /forgot-password
  forgotPassword: async (payload: ApiForgotPasswordRequest): Promise<ApiForgotPasswordResponse> => {
    const res = await authHttpClient.post<ApiForgotPasswordResponse>('/forgot-password', payload);
    return res.data;
  },

  // POST /reset-password
  resetPassword: async (payload: ApiResetPasswordRequest): Promise<void> => {
    await authHttpClient.post('/reset-password', payload);
  },

  // GET /verify
  verifyToken: async (): Promise<ApiVerifyTokenResponse> => {
    const res = await authHttpClient.get<ApiVerifyTokenResponse>('/verify');
    return res.data;
  },

  // GET /me
  getCurrentUser: async (): Promise<ApiMeResponse> => {
    const res = await authHttpClient.get<ApiMeResponse>('/me');
    return res.data;
  },

  // POST /request-email-verification
  requestEmailVerification: async (): Promise<ApiEmailVerificationResponse> => {
    const res = await authHttpClient.post<ApiEmailVerificationResponse>('/request-email-verification');
    return res.data;
  },

  // POST /verify-email
  verifyEmail: async (payload: ApiVerifyEmailRequest | string): Promise<ApiVerifyEmailResponse> => {
    const body = typeof payload === 'string' ? { token: payload } : payload;
    const res = await authHttpClient.post<ApiVerifyEmailResponse>('/verify-email', body);
    return res.data;
  },

  // POST /change-password
  changePassword: async (payload: ApiChangePasswordRequest): Promise<void> => {
    await authHttpClient.post('/change-password', payload);
  },
};
