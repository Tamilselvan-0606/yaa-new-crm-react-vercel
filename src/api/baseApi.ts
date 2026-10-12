import axios, { AxiosInstance } from 'axios';
import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import {
  API_BASE_URL,
  getStoredToken,
  setStoredToken,
  USER_ID_STORAGE_KEY,
  USER_CACHE_STORAGE_KEY,
  getStoredOrganizationId,
  setStoredOrganizationId,
} from './config';
import { authApi } from './auth/authApi';

/**
 * Base Axios Client for CRM API integration
 * Automatically attaches JWT Bearer token and credentials for cookies
 */
export const baseClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

baseClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const currentUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (currentUserId) {
      config.headers['x-user-id'] = currentUserId;
    }
    const orgId = getStoredOrganizationId();
    if (orgId) {
      config.headers['x-organization-id'] = orgId;
    }
    return config;
  },

  (error) => Promise.reject(error)
);

/**
 * Shared in-flight refresh promise singleton.
 * Prevents multiple parallel /refresh calls and avoids token family replay revocations.
 */
let refreshPromise: Promise<string | null> | null = null;

export const executeTokenRefresh = async (): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await authApi.refreshToken();
      const token =
        res?.accessToken ||
        res?.data?.token ||
        res?.data?.accessToken ||
        (res as any)?.token ||
        null;

      if (token) {
        setStoredToken(token);
        const user = res?.user || res?.data?.user;
        if (user) {
          localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(user));
          if (user.id) localStorage.setItem(USER_ID_STORAGE_KEY, user.id);
          if (user.organizationId) setStoredOrganizationId(user.organizationId);
        }
        return token;
      }
      return null;
    } catch (err) {
      console.warn('Silent session token refresh failed:', err);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

baseClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const is401 = error.response?.status === 401;

    // Silent Token Refresh on 401 (prevent logout when 15-min JWT expires)
    if (is401 && originalRequest && !originalRequest._retry) {
      // Do not attempt refresh on auth endpoints themselves (e.g. login/refresh) to prevent infinite loops
      if (
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/login')
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      const newToken = await executeTokenRefresh();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return baseClient(originalRequest);
      }
    }

    const data = error.response?.data;
    let message = 'An unexpected error occurred';

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

// =========================================================================
// Redux Toolkit RTK Query Shared baseApi
// =========================================================================

const rawBaseQuery = fetchBaseQuery({
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = getStoredToken();
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    const currentUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (currentUserId) {
      headers.set('x-user-id', currentUserId);
    }
    const orgId = getStoredOrganizationId();
    if (orgId) {
      headers.set('x-organization-id', orgId);
    }
    return headers;
  },
});

const dynamicBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let adjustedArgs: FetchArgs = typeof args === 'string' ? { url: args } : { ...args };

  if (!adjustedArgs.url.startsWith('http://') && !adjustedArgs.url.startsWith('https://')) {
    if (adjustedArgs.url.startsWith('/api/')) {
      // Local development server routes
      adjustedArgs.url = adjustedArgs.url;
    } else {
      // Platform / Commerce backend endpoints
      const cleanUrl = adjustedArgs.url.startsWith('/') ? adjustedArgs.url : `/${adjustedArgs.url}`;
      adjustedArgs.url = `${API_BASE_URL}${cleanUrl}`;
    }
  }

  let result = await rawBaseQuery(adjustedArgs, api, extraOptions);

  // Silent Token Refresh on 401
  if (result.error && result.error.status === 401) {
    const newToken = await executeTokenRefresh();
    if (newToken) {
      result = await rawBaseQuery(adjustedArgs, api, extraOptions);
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: dynamicBaseQuery,
  tagTypes: [
    'User',
    'Organization',
    'Customer',
    'Supplier',
    'Product',
    'Stock',
    'Quotation',
    'Proforma',
    'SalesOrder',
    'DeliveryChallan',
    'SalesInvoice',
    'Payment',
    'PaymentIn',
    'PaymentOut',
    'SalesReturn',
    'PurchaseRequest',
    'Purchase',
    'PurchaseReturn',
    'Expense',
    'ExpenseCategory',
    'Lead',
    'Task',
    'Content',
    'Dashboard',
    'Employee',
    'Reminder',
    'Activity',
    'Report',
    'Setting',
    'Branch',
    'Category',
    'Subcategory',
    'Unit',
    'Subscription',
    'ClientSubscription',
    'SubscriptionPlan',
    'OrgSubscription',
    'ProductPlan',
    'ClientProduct',
  ],
  endpoints: () => ({}),
});
