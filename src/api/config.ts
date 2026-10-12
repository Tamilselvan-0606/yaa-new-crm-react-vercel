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

export const ORGANIZATION_ID_STORAGE_KEY = 'yaa_crm_organization_id';
export const DEFAULT_ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const getStoredOrganizationId = (): string => {
  return (
    localStorage.getItem(ORGANIZATION_ID_STORAGE_KEY) ||
    (typeof import.meta !== 'undefined' &&
      (import.meta as any)?.env?.VITE_ORGANIZATION_ID) ||
    DEFAULT_ORGANIZATION_ID
  );
};

export const setStoredOrganizationId = (orgId: string): void => {
  localStorage.setItem(ORGANIZATION_ID_STORAGE_KEY, orgId);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_ID_STORAGE_KEY);
  localStorage.removeItem(USER_CACHE_STORAGE_KEY);
  localStorage.removeItem(ORGANIZATION_ID_STORAGE_KEY);
  localStorage.removeItem('user_organization_type');
  localStorage.removeItem('user_organization_type_name');
  localStorage.removeItem('active_organization');
  localStorage.removeItem('active_organization_orgsuperadmin');
  localStorage.removeItem('active_org_type_view');
  localStorage.removeItem('active_org_type_orgsuperadmin');
};

