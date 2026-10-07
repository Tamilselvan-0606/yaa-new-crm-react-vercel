import axios, { AxiosInstance } from 'axios';
import { AUTH_API_BASE_URL, getStoredToken } from '../config';
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
  ApiChangePasswordRequest,
} from './authTypes';

/**
 * Dedicated Auth API client targeting /api/v1/auth
 */
export const authHttpClient: AxiosInstance = axios.create({
  baseURL: AUTH_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

authHttpClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

  // POST /refresh
  refreshToken: async (): Promise<ApiRefreshTokenResponse> => {
    const res = await authHttpClient.post<ApiRefreshTokenResponse>(
      '/refresh',
      {},
      {
        headers: {
          'X-CSRF-Protection': '1',
        },
      }
    );
    return res.data;
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

  // POST /change-password
  changePassword: async (payload: ApiChangePasswordRequest): Promise<void> => {
    await authHttpClient.post('/change-password', payload);
  },
};
