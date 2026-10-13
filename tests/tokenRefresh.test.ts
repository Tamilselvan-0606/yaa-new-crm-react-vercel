import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

// Browser globals the API layer touches.
const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};
Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage, configurable: true });
Object.defineProperty(globalThis, 'window', { value: new EventTarget(), configurable: true });

const { baseClient } = await import('../src/api/baseApi.ts');
const { refreshHttpClient, SESSION_EXPIRED_EVENT, canRefreshAfter } = await import('../src/api/tokenRefresh.ts');
const { TOKEN_STORAGE_KEY, USER_CACHE_STORAGE_KEY } = await import('../src/api/config.ts');

type Reply = { status: number; data?: unknown } | Error;
type Handler = (config: InternalAxiosRequestConfig) => Reply | Promise<Reply>;
let handler: Handler;
let calls: InternalAxiosRequestConfig[];

const adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  calls.push(config);
  const reply = await handler(config);
  if (reply instanceof Error) throw new AxiosError(reply.message, 'ERR_NETWORK', config);
  const response: AxiosResponse = { data: reply.data, status: reply.status, statusText: '', headers: {}, config };
  if (reply.status >= 400) throw new AxiosError('failed', 'ERR_BAD_REQUEST', config, undefined, response);
  return response;
};
baseClient.defaults.adapter = adapter;
refreshHttpClient.defaults.adapter = adapter;

const isRefresh = (c: InternalAxiosRequestConfig) => `${c.baseURL}${c.url}`.endsWith('/auth/refresh');
const authOf = (c: InternalAxiosRequestConfig) => AxiosHeaders.from(c.headers).get('Authorization');
const expired = { status: 401, data: { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' } } };
const refreshed = (token: string) => ({ status: 200, data: { success: true, data: { token, tokenType: 'Bearer', expiresIn: 120 } } });

let expiredEvents = 0;
window.addEventListener(SESSION_EXPIRED_EVENT, () => { expiredEvents++; });

beforeEach(() => {
  store.clear();
  store.set(TOKEN_STORAGE_KEY, 'old-token');
  store.set(USER_CACHE_STORAGE_KEY, '{"id":"u1"}');
  calls = [];
  expiredEvents = 0;
});

test('expired access token is refreshed with the cookie + CSRF header and the request is retried once', async () => {
  handler = (c) => isRefresh(c) ? refreshed('new-token')
    : authOf(c) === 'Bearer new-token' ? { status: 200, data: { ok: true } } : expired;

  const res = await baseClient.get('/customers');

  assert.deepEqual(res.data, { ok: true });
  assert.equal(store.get(TOKEN_STORAGE_KEY), 'new-token');
  const refresh = calls.filter(isRefresh);
  assert.equal(refresh.length, 1);
  assert.equal(refresh[0].method, 'post');
  assert.equal(refresh[0].withCredentials, true, 'browser must send the HttpOnly refresh cookie');
  assert.equal(AxiosHeaders.from(refresh[0].headers).get('X-CSRF-Protection'), '1');
  assert.equal(authOf(refresh[0]), undefined, 'the expired access token is not sent to /refresh');
  assert.equal(refresh[0].data, undefined, 'no refresh token in the request body');
  assert.equal(calls.length, 3); // original, refresh, retry
  assert.equal(expiredEvents, 0);
});

test('failed refresh clears auth state, signals session expiry and does not retry', async () => {
  handler = (c) => isRefresh(c)
    ? { status: 401, data: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials or session' } } }
    : expired;

  await assert.rejects(baseClient.get('/customers'), /Invalid or expired access token/);

  assert.equal(calls.length, 2); // original + one refresh, no retry
  assert.equal(store.get(TOKEN_STORAGE_KEY), undefined);
  assert.equal(store.get(USER_CACHE_STORAGE_KEY), undefined);
  assert.equal(expiredEvents, 1);
});

test('a transient refresh failure keeps the session', async () => {
  handler = (c) => isRefresh(c) ? new Error('Network Error') : expired;

  await assert.rejects(baseClient.get('/customers'));

  assert.equal(store.get(TOKEN_STORAGE_KEY), 'old-token');
  assert.equal(expiredEvents, 0);
});

test('a retried request that is still unauthorized does not refresh again', async () => {
  handler = (c) => isRefresh(c) ? refreshed('new-token') : expired;

  await assert.rejects(baseClient.get('/customers'));

  assert.equal(calls.filter(isRefresh).length, 1);
  assert.equal(calls.length, 3);
});

test('login, refresh and wrong-password 401s never trigger a refresh', async () => {
  handler = () => ({ status: 401, data: { error: { code: 'INVALID_CREDENTIALS' } } });

  await assert.rejects(baseClient.post('/auth/login', { email: 'a@b.c', password: 'x' }));
  await assert.rejects(baseClient.post('/auth/refresh'));
  await assert.rejects(baseClient.post('/auth/change-password', {}));

  assert.equal(calls.filter(isRefresh).length, 1, 'only the explicit /auth/refresh call itself');
  assert.equal(calls.length, 3);
  assert.equal(canRefreshAfter('/auth/logout', 401, undefined), false);
  assert.equal(canRefreshAfter('/customers', 403, undefined), false);
  assert.equal(canRefreshAfter('/customers', 401, expired.data), true);
});

test('parallel expired requests share a single refresh call', async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  handler = async (c) => {
    if (isRefresh(c)) { await gate; return refreshed('new-token'); }
    return authOf(c) === 'Bearer new-token' ? { status: 200, data: c.url } : expired;
  };

  const pending = Promise.all(['/customers', '/organizations', '/subscriptions'].map((u) => baseClient.get(u)));
  setTimeout(release, 20);
  const results = await pending;

  assert.deepEqual(results.map((r) => r.data), ['/customers', '/organizations', '/subscriptions']);
  assert.equal(calls.filter(isRefresh).length, 1, 'rotation means a second refresh would replay a spent cookie');
});

test('a 401 that arrives after another request already refreshed reuses the new token', async () => {
  let refreshDone!: () => void;
  const afterRefresh = new Promise<void>((r) => { refreshDone = r; });
  handler = async (c) => {
    if (isRefresh(c)) { setTimeout(refreshDone, 0); return refreshed('new-token'); }
    if (authOf(c) === 'Bearer new-token') return { status: 200, data: c.url };
    // /organizations left with the old token, but its 401 only arrives once the refresh has completed
    if (c.url === '/organizations') await afterRefresh;
    return expired;
  };

  const results = await Promise.all([baseClient.get('/customers'), baseClient.get('/organizations')]);

  assert.deepEqual(results.map((r) => r.data), ['/customers', '/organizations']);
  assert.equal(calls.filter(isRefresh).length, 1);
});

test('a refresh that lost a race with another tab (409) is retried once with the rotated cookie', async () => {
  let refreshes = 0;
  handler = (c) => {
    if (isRefresh(c)) return ++refreshes === 1 ? { status: 409, data: { error: { code: 'REFRESH_TOKEN_ROTATED' } } } : refreshed('new-token');
    return authOf(c) === 'Bearer new-token' ? { status: 200, data: { ok: true } } : expired;
  };

  const res = await baseClient.get('/customers');

  assert.deepEqual(res.data, { ok: true });
  assert.equal(refreshes, 2);
  assert.equal(expiredEvents, 0);
});

test('a refused refresh (403) does not log the user out', async () => {
  handler = (c) => isRefresh(c) ? { status: 403, data: { error: { code: 'CSRF_REQUIRED' } } } : expired;

  await assert.rejects(baseClient.get('/customers'));

  assert.equal(store.get(TOKEN_STORAGE_KEY), 'old-token');
  assert.equal(expiredEvents, 0);
});
