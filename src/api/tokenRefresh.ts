import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AUTH_API_BASE_URL, getStoredToken, setStoredToken, removeStoredToken } from './config';

/**
 * Silent access-token refresh shared by every API client (baseClient, axiosClient, authHttpClient, RTK Query).
 *
 * The refresh token lives only in the yaa_crm_refresh HttpOnly cookie: it is never read, stored or sent by
 * JavaScript. The browser attaches it because the request is made with credentials. The backend rotates it on
 * every call and revokes the whole session family when an already-used token is replayed, so two refresh calls
 * carrying the same cookie log the user out. Every refresh therefore goes through one shared promise per tab
 * and one Web Lock across tabs.
 */

/** Dispatched on window when the session cannot be resumed and the user must sign in again. */
export const SESSION_EXPIRED_EVENT = 'yaa-crm:session-expired';

const REFRESH_LOCK_NAME = 'yaa-crm-token-refresh';

// A 401 from these endpoints means bad credentials or a dead session, never an expired access token.
const REFRESH_EXEMPT_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
];

/** Bare client so the refresh call itself never passes through a 401-retry interceptor. */
export const refreshHttpClient: AxiosInstance = axios.create({
  baseURL: AUTH_API_BASE_URL,
  withCredentials: true,
});

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
 * Whether a failed request should trigger a refresh. A wrong current password (change-password) also answers
 * 401, but with INVALID_CREDENTIALS rather than the UNAUTHORIZED of an expired access token.
 */
export const canRefreshAfter = (url: string | undefined, status: unknown, body: unknown): boolean => {
  if (status !== 401) return false;
  if (url && REFRESH_EXEMPT_PATHS.some((path) => url.includes(path))) return false;
  return (body as { error?: { code?: string } } | undefined)?.error?.code !== 'INVALID_CREDENTIALS';
};

const expireSession = () => {
  removeStoredToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
};

const requestNewAccessToken = async (staleToken: string | null, attempt = 1): Promise<string | null> => {
  try {
    const res = await refreshHttpClient.post('/refresh', undefined, {
      headers: { 'X-CSRF-Protection': '1', accept: '*/*' },
    });
    const token = extractAccessToken(res.data);
    if (!token) {
      expireSession();
      return null;
    }
    setStoredToken(token);
    return token;
  } catch (error) {
    const status = (error as AxiosError).response?.status;
    // 409: a parallel refresh (another tab) rotated the cookie first. The browser now holds the new cookie, and
    // the other tab may already have stored the new access token.
    if (status === 409 && attempt === 1) {
      const latest = getStoredToken();
      if (latest && latest !== staleToken) return latest;
      return requestNewAccessToken(staleToken, attempt + 1);
    }
    // 401: refresh cookie missing, expired, revoked or replayed; only signing in again recovers. Anything else
    // (network error, 403, 409, 429, 5xx) keeps the session so the next request can try again.
    if (status === 401) {
      expireSession();
    } else {
      console.warn('Session refresh failed', status ?? (error as Error).message);
    }
    return null;
  }
};

const withRefreshLock = <T>(fn: () => Promise<T>): Promise<T> => {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return locks ? locks.request(REFRESH_LOCK_NAME, fn) : fn();
};

let inFlight: Promise<string | null> | null = null;

/**
 * Returns a usable access token after a request carrying `staleToken` was rejected, or null when the session
 * is over. Parallel callers share one refresh; a caller whose token was already replaced (by this tab or
 * another) reuses the replacement instead of spending the rotated refresh cookie a second time.
 */
export const refreshAccessToken = (staleToken: string | null): Promise<string | null> => {
  const current = getStoredToken();
  if (current && current !== staleToken) return Promise.resolve(current);

  if (!inFlight) {
    inFlight = withRefreshLock(async () => {
      const latest = getStoredToken();
      if (latest && latest !== staleToken) return latest;
      return requestNewAccessToken(staleToken);
    }).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const bearerToken = (header: unknown): string | null =>
  typeof header === 'string' ? header.match(/^Bearer (.+)$/)?.[1] ?? null : null;

/**
 * For use in an axios response error interceptor. Refreshes once and replays the original request on `client`
 * when the error is an expired access token; resolves undefined when the error should be handled normally.
 */
export const retryWithRefreshedToken = async (
  client: AxiosInstance,
  error: AxiosError
): Promise<AxiosResponse | undefined> => {
  const config = error.config as RetryableRequestConfig | undefined;
  if (!config || config._retry) return undefined;
  const url = `${config.baseURL ?? ''}${config.url ?? ''}`;
  if (!canRefreshAfter(url, error.response?.status, error.response?.data)) return undefined;

  config._retry = true;
  const token = await refreshAccessToken(bearerToken(config.headers?.Authorization));
  if (!token) return undefined;

  config.headers.Authorization = `Bearer ${token}`;
  return client(config);
};
