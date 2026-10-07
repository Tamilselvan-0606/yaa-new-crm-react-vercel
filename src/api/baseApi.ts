import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL, getStoredToken, USER_ID_STORAGE_KEY } from './config';

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
    return config;
  },
  (error) => Promise.reject(error)
);

baseClient.interceptors.response.use(
  (response) => response,
  (error) => {
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
