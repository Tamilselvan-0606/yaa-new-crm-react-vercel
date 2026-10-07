export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_API_BASE_URL) ||
  'https://api.dev.crm.yaacreations.com/api/v1';
export const AUTH_API_BASE_URL = `${API_BASE_URL}/auth`;
export const TOKEN_STORAGE_KEY = 'yaa_crm_jwt_token';

export const USER_ID_STORAGE_KEY = 'nexus_crm_user_id';
export const USER_CACHE_STORAGE_KEY = 'nexus_crm_fallback_user';

export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
    fields?: Array<{
      path?: string[];
      message: string;
    }>;
  };
  message?: string;
}

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_ID_STORAGE_KEY);
  localStorage.removeItem(USER_CACHE_STORAGE_KEY);
};
