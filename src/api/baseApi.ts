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
  USER_ID_STORAGE_KEY,
  getStoredOrganizationId,
} from './config';
import { canRefreshAfter, refreshAccessToken, retryWithRefreshedToken } from './tokenRefresh';

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

baseClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Silent token refresh when the short-lived access token has expired
    const retried = await retryWithRefreshedToken(baseClient, error);
    if (retried) return retried;

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

  const sentToken = getStoredToken();
  let result = await rawBaseQuery(adjustedArgs, api, extraOptions);

  // Silent token refresh on 401, then retry the original request once
  if (result.error && canRefreshAfter(adjustedArgs.url, result.error.status, result.error.data)) {
    const newToken = await refreshAccessToken(sentToken);
    if (newToken) {
      // Force the new token into the retry request headers explicitly
      const retryArgs: FetchArgs =
        typeof adjustedArgs === 'string'
          ? { url: adjustedArgs, headers: { Authorization: `Bearer ${newToken}` } }
          : {
              ...adjustedArgs,
              headers: {
                ...(adjustedArgs.headers || {}),
                Authorization: `Bearer ${newToken}`,
              },
            };
      result = await rawBaseQuery(retryArgs, api, extraOptions);
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
