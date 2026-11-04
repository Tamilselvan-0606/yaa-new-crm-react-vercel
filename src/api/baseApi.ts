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
import { ALL_TAG_TYPES } from '../store/api/tagTypes';

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
    if (orgId && config.headers['x-organization-id'] === undefined) {
      config.headers['x-organization-id'] = orgId;
    }
    // If explicitly passed as empty string or null, remove the header entirely
    if (config.headers['x-organization-id'] === '' || config.headers['x-organization-id'] === null) {
      delete config.headers['x-organization-id'];
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
    const customErr: any = new Error(message);
    customErr.response = error.response;
    customErr.data = data;
    customErr.status = error.response?.status;
    return Promise.reject(customErr);
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
    if (orgId && !headers.has('x-organization-id')) {
      headers.set('x-organization-id', orgId);
    }
    if (headers.get('x-organization-id') === '') {
      headers.delete('x-organization-id');
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
    // Platform / Commerce backend endpoints (https://api.dev.crm.yaacreations.com/api/v1)
    const cleanUrl = adjustedArgs.url.startsWith('/') ? adjustedArgs.url : `/${adjustedArgs.url}`;
    adjustedArgs.url = `${API_BASE_URL}${cleanUrl}`;
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
  // Cache policy for every RTK Query endpoint: keep responses 5 minutes after the last component using them
  // unmounts, so leaving a page and coming back reuses the response. Nothing refetches just because a component
  // mounted (refetchOnMountOrArgChange stays false) or the tab got focus; mutations invalidate by tag instead.
  keepUnusedDataFor: 300,
  refetchOnMountOrArgChange: false,
  refetchOnFocus: false,
  refetchOnReconnect: true,
  // Every tag lives in api/tags.ts (one definition for all modules).
  tagTypes: [...ALL_TAG_TYPES],
  endpoints: () => ({}),
});

// ---------------------------------------------------------------------------------------------------
// List request shape shared by every list endpoint:
//   ?page_no=1&page_size=10&pagination_required=true&search=abc&status=Active&page=1&limit=10&sortBy=name
// (`page` / `limit` are sent next to `page_no` / `page_size` because the backend accepts either form.)
// Empty values are left out, "All" status means no status filter.
// ---------------------------------------------------------------------------------------------------
export interface ListParamsInput {
  page?: number;
  limit?: number;
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean | string;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface ListParamsDefaults {
  /** Used when the screen does not choose a sort: 'name' for master data, 'createdAt' for documents. */
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const buildListParams = (p: ListParamsInput = {}, defaults: ListParamsDefaults = {}) => {
  const page = Number(p.page_no ?? p.page ?? 1) || 1;
  const limit = Number(p.page_size ?? p.limit ?? 10) || 10;
  const search = typeof p.search === 'string' ? p.search.trim() : '';
  const status = p.status && p.status !== 'All' && p.status !== 'ALL' ? p.status : undefined;
  const sortBy = p.sortBy ?? defaults.sortBy;
  const sortOrder = p.sortOrder ?? (p.sortBy ? undefined : defaults.sortOrder);

  return {
    page_no: page,
    page_size: limit,
    pagination_required: String(p.pagination_required ?? 'true'),
    search: search || undefined,
    status,
    page,
    limit,
    sortBy,
    sortOrder,
  };
};
