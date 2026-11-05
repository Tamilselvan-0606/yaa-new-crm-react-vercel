import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { baseApi, baseClient } from './baseApi';
import { API_BASE_URL, getStoredOrganizationId, USER_ID_STORAGE_KEY } from './config';
import { ALL_TAG_TYPES, type AnyTagType } from '../store/api/tagTypes';

/**
 * Central API cache for the screens that call the axios API wrappers (Inventory, Purchase, Sales Hub,
 * dashboards). Those screens refetched on every mount because axios has no cache.
 *
 * How it works
 *  - A GET through `baseClient.get` that matches a policy below is served by ONE RTK Query endpoint (`cachedGet`).
 *    RTK Query provides: the cache key (url + params + tenant scope), de-duplication of identical in-flight
 *    requests (React Strict Mode double effects, two components asking for the same thing), `keepUnusedDataFor`
 *    expiry and tag invalidation.
 *  - Leaving a page and coming back inside the policy's freshness window (`ttl`) reuses the cached response.
 *  - A successful POST/PUT/PATCH/DELETE through `baseClient` evicts only what that mutation can change:
 *    the record it touched (by id) and its list, plus the related entities listed in MUTATION_RULES.
 *    Eviction is lazy: it refetches nothing; the next visit fetches fresh data.
 *  - Live data is NEVER cached: stock, batches, ledgers, collections, PDFs, notifications, auth. URLs without a
 *    policy are not cached either (allow-list, not deny-list).
 *  - Tenant isolation: organisation and user ids are part of every cache key, and the cache is wiped on login
 *    and logout (`clearApiCache`).
 *  - The cache returns a deep copy, so callers can sort or mutate a response exactly as they could with axios.
 */


export interface CachePolicy {
  /** Seconds a cached response is considered fresh. */
  ttl: number;
  tags: AnyTagType[];
}

interface PolicyRule extends CachePolicy {
  prefix: string;
  /** Allow sub-paths deeper than `/prefix/{id}` (dashboards, reports). */
  deep?: boolean;
}

export interface TagRef {
  type: string;
  id?: string;
}

// ---------------------------------------------------------------------------------------------
// What may be cached (allow-list) and for how long.
//   master data     : 300-600 s  (categories, units, expense categories)
//   shared lists    : 120 s      (suppliers, sales reps)
//   items/customers : 60 s       (they carry stock figures / balances)
//   transactions    : 30 s       (documents with balances and statuses)
//   dashboards      : 60 s
// ---------------------------------------------------------------------------------------------
const POLICIES: PolicyRule[] = [
  { prefix: '/commerce/categories', ttl: 300, tags: ['Category'] },
  { prefix: '/commerce/subcategories', ttl: 300, tags: ['Subcategory'] },
  { prefix: '/commerce/units', ttl: 600, tags: ['Unit'] },
  { prefix: '/work/expense-categories', ttl: 300, tags: ['ExpenseCategory'] },
  { prefix: '/work/suppliers', ttl: 120, tags: ['Supplier'] },
  { prefix: '/commerce/sales-representatives', ttl: 120, tags: ['SalesRepresentative'] },
  { prefix: '/commerce/products', ttl: 60, tags: ['Product'] },
  { prefix: '/commerce/customers', ttl: 60, tags: ['Customer'] },
  { prefix: '/commerce/quotations', ttl: 30, tags: ['Estimation'] },
  { prefix: '/commerce/proformas', ttl: 30, tags: ['ProformaInvoice'] },
  { prefix: '/commerce/orders', ttl: 30, tags: ['SaleOrder'] },
  { prefix: '/commerce/challans', ttl: 30, tags: ['DeliveryChallan'] },
  { prefix: '/commerce/invoices', ttl: 30, tags: ['SalesInvoice'] },
  { prefix: '/commerce/payments-in', ttl: 30, tags: ['PaymentIn'] },
  { prefix: '/commerce/returns', ttl: 30, tags: ['SalesReturn'] },
  { prefix: '/work/purchase-orders', ttl: 30, tags: ['PurchaseOrder', 'PurchaseBill'] }, // one backend entity
  { prefix: '/work/payments-out', ttl: 30, tags: ['PaymentOut'] },
  { prefix: '/commerce/purchase-requests', ttl: 30, tags: ['PurchaseRequest'] },
  { prefix: '/commerce/purchase-returns', ttl: 30, tags: ['PurchaseReturn'] },
  { prefix: '/work/expenses', ttl: 30, tags: ['Expense'] },
  { prefix: '/commerce/sales/dashboard', ttl: 60, tags: ['Dashboard'], deep: true },
  { prefix: '/commerce/sales/report', ttl: 60, tags: ['SalesReport'], deep: true },

  // ---- Client Management (platform / CRM) --------------------------------------------------------
  //   master data 300 s (organizations, sub-orgs, branches, plans) | client products 120 s
  //   clients / leads / subscriptions / dashboard 60 s | quotes, proformas, invoices, payments 30 s
  //   Same as Sale Management: the timer bounds staleness, and a create/update/delete/status/convert
  //   evicts the related tags immediately (see MUTATION_RULES).
  { prefix: '/platform/organizations', ttl: 300, tags: ['Organization'] },
  { prefix: '/platform/sub-organizations', ttl: 300, tags: ['Organization'] }, // shares the Organization tag with the RTK endpoints
  { prefix: '/sub-organizations', ttl: 300, tags: ['Organization'] },
  { prefix: '/branches', ttl: 300, tags: ['Branch'] },
  { prefix: '/platform/branches', ttl: 300, tags: ['Branch'] },
  { prefix: '/platform/subscription-plans', ttl: 300, tags: ['SubscriptionPlan'] },
  { prefix: '/products', ttl: 120, tags: ['ClientProduct'] },
  { prefix: '/platform/clients', ttl: 60, tags: ['PlatformClient'] },
  { prefix: '/platform/leads', ttl: 60, tags: ['Lead'] },
  { prefix: '/subscriptions', ttl: 60, tags: ['ClientSubscription'] },
  { prefix: '/platform/organization-subscriptions', ttl: 60, tags: ['OrgSubscription'] },
  { prefix: '/platform/quotes', ttl: 30, tags: ['PlatformQuote'] },
  { prefix: '/platform/proforma-invoices', ttl: 30, tags: ['PlatformProformaInvoice'] },
  { prefix: '/platform/invoices', ttl: 30, tags: ['PlatformInvoice'] },
  { prefix: '/platform/payments', ttl: 30, tags: ['Payment'] },
  { prefix: '/platform/dashboard', ttl: 60, tags: ['PlatformDashboard'], deep: true },
  // Platform Administrator announcements: the list and a single record. A send or delete clears them at once.
  // (The organization inbox and the recipient count are live: see BYPASS_PREFIXES.)
  { prefix: '/platform/announcements', ttl: 60, tags: ['Announcement'] },
  { prefix: '/platform/announcement-templates', ttl: 300, tags: ['AnnouncementTemplate'] },
];

/** Never cached: must always be live (stock availability, money owed, files, notifications, auth). */
const BYPASS_PREFIXES = [
  '/auth',
  '/uploads',
  '/ai',
  '/admin-notifications',
  '/commerce/stocks', // stock list, batches, ledger, low-stock: availability must be exact
  '/commerce/collections', // amounts due, follow-ups, history
  '/platform/announcements/inbox', // read / unread state of the organization's announcements
  '/platform/announcements/recipient-count',
];

// ---------------------------------------------------------------------------------------------
// What a successful mutation evicts. Based on measured backend behaviour (QA run, 2026-11-03):
//  - a purchase bill with a paid amount does NOT create a Payment Out record -> bills never evict PaymentOut
//  - a purchase return changes the bill balance and the supplier's outstanding, stock and batches, but does NOT
//    create or change Payment Out records
//  - a sales invoice changes the customer's totals and stock but creates no Payment In record
//  - renaming a category changes `category` on every product
//  - creating a product with opening stock creates stock and a batch
// `primary` is evicted precisely (the touched record by id + the list). `related` is evicted by type.
// ---------------------------------------------------------------------------------------------
const SALES_DOC_CHAIN: AnyTagType[] = ['Estimation', 'ProformaInvoice', 'SaleOrder', 'DeliveryChallan', 'SalesInvoice'];
const STOCK_TAGS: AnyTagType[] = ['Stock', 'Batch', 'Product'];
const CUSTOMER_MONEY: AnyTagType[] = ['Customer', 'CustomerLedger', 'Collection', 'SalesRepresentative'];
const REPORTING: AnyTagType[] = ['Dashboard', 'SalesReport'];

interface MutationRule {
  prefix: string;
  primary: AnyTagType[];
  related: AnyTagType[];
  /** Used instead of `related` for a plain create (POST without an id). */
  createRelated?: AnyTagType[];
  /** Added for `/convert` and `/bulk-convert` actions (a conversion creates another document and moves stock). */
  convertRelated?: AnyTagType[];
  /** Added for `/status` changes. */
  statusRelated?: AnyTagType[];
}

const MUTATION_RULES: MutationRule[] = [
  { prefix: '/commerce/categories', primary: ['Category'], related: ['Subcategory', 'Product'] },
  { prefix: '/commerce/subcategories', primary: ['Subcategory'], related: ['Product'] },
  { prefix: '/commerce/units', primary: ['Unit'], related: ['Product'] },
  { prefix: '/commerce/products', primary: ['Product'], related: ['Stock', 'Batch', ...REPORTING] },
  { prefix: '/commerce/stocks', primary: ['Stock'], related: ['Batch', 'Product', ...REPORTING] },
  { prefix: '/work/expense-categories', primary: ['ExpenseCategory'], related: ['Expense'] },
  { prefix: '/work/expenses', primary: ['Expense'], related: [...REPORTING] },
  {
    prefix: '/work/suppliers',
    primary: ['Supplier'],
    related: ['SupplierLedger', 'PurchaseOrder', 'PurchaseBill', 'PurchaseRequest', 'PurchaseReturn', 'PaymentOut', 'Dashboard'],
    createRelated: ['Dashboard'],
  },
  {
    prefix: '/work/purchase-orders',
    primary: ['PurchaseOrder', 'PurchaseBill'],
    related: ['Supplier', 'SupplierLedger', ...REPORTING],
    statusRelated: [...STOCK_TAGS], // receiving / cancelling moves stock; create, edit and delete do not
  },
  { prefix: '/work/payments-out', primary: ['PaymentOut'], related: ['PurchaseOrder', 'PurchaseBill', 'Supplier', 'SupplierLedger', ...REPORTING] },
  { prefix: '/commerce/purchase-requests', primary: ['PurchaseRequest'], related: ['Dashboard'] },
  {
    prefix: '/commerce/purchase-returns',
    primary: ['PurchaseReturn'],
    related: ['PurchaseOrder', 'PurchaseBill', 'Supplier', 'SupplierLedger', ...STOCK_TAGS, ...REPORTING], // not PaymentOut
  },
  {
    prefix: '/commerce/customers',
    primary: ['Customer'],
    related: ['CustomerLedger', 'Collection', 'SalesRepresentative', ...SALES_DOC_CHAIN, 'PaymentIn', 'SalesReturn', 'Dashboard'],
    createRelated: ['SalesRepresentative', 'Dashboard'],
  },
  { prefix: '/commerce/sales-representatives', primary: ['SalesRepresentative'], related: ['Customer', 'Collection', 'Dashboard'] },
  { prefix: '/commerce/quotations', primary: ['Estimation'], related: ['Dashboard'], convertRelated: [...SALES_DOC_CHAIN, ...STOCK_TAGS, ...CUSTOMER_MONEY, 'SalesReport'] },
  { prefix: '/commerce/proformas', primary: ['ProformaInvoice'], related: ['Dashboard'], convertRelated: [...SALES_DOC_CHAIN, ...STOCK_TAGS, ...CUSTOMER_MONEY, 'SalesReport'] },
  { prefix: '/commerce/orders', primary: ['SaleOrder'], related: ['Dashboard'], convertRelated: [...SALES_DOC_CHAIN, ...STOCK_TAGS, ...CUSTOMER_MONEY, 'SalesReport'] },
  { prefix: '/commerce/challans', primary: ['DeliveryChallan'], related: ['Dashboard'], convertRelated: [...SALES_DOC_CHAIN, ...STOCK_TAGS, ...CUSTOMER_MONEY, 'SalesReport'] },
  { prefix: '/commerce/invoices', primary: ['SalesInvoice'], related: [...STOCK_TAGS, ...CUSTOMER_MONEY, ...REPORTING] }, // not PaymentIn
  { prefix: '/commerce/payments-in', primary: ['PaymentIn'], related: ['SalesInvoice', ...CUSTOMER_MONEY, ...REPORTING] },
  { prefix: '/commerce/returns', primary: ['SalesReturn'], related: ['SalesInvoice', ...STOCK_TAGS, ...CUSTOMER_MONEY, ...REPORTING] },
  { prefix: '/commerce/collections', primary: ['Collection'], related: ['Customer', 'CustomerLedger', 'SalesInvoice', 'PaymentIn', 'SalesRepresentative', 'Dashboard'] },

  // ---- Client Management (platform / CRM). `primary` = the touched record + its list; `related` = by type. ----
  { prefix: '/platform/organizations', primary: ['Organization'], related: ['PlatformClient', 'OrgSubscription', 'Branch', 'PlatformDashboard'] },
  { prefix: '/platform/sub-organizations', primary: ['Organization'], related: ['Branch', 'PlatformDashboard'] },
  { prefix: '/sub-organizations', primary: ['Organization'], related: ['Branch', 'PlatformDashboard'] },
  { prefix: '/branches', primary: ['Branch'], related: ['Organization', 'PlatformDashboard'] },
  { prefix: '/platform/branches', primary: ['Branch'], related: ['Organization', 'PlatformDashboard'] },
  { prefix: '/platform/subscription-plans', primary: ['SubscriptionPlan'], related: ['OrgSubscription'] },
  { prefix: '/products', primary: ['ClientProduct'], related: ['ProductPlan', 'ClientSubscription', 'PlatformDashboard'] },
  {
    prefix: '/platform/clients',
    primary: ['PlatformClient'],
    related: ['Lead', 'PlatformQuote', 'PlatformProformaInvoice', 'PlatformInvoice', 'ClientSubscription', 'Payment', 'PlatformDashboard'],
  },
  { prefix: '/platform/leads', primary: ['Lead'], related: ['PlatformDashboard'], convertRelated: ['PlatformClient', 'Organization'] },
  { prefix: '/subscriptions', primary: ['ClientSubscription'], related: ['ClientProduct', 'PlatformClient', 'PlatformInvoice', 'PlatformDashboard'] },
  { prefix: '/platform/organization-subscriptions', primary: ['OrgSubscription'], related: ['Organization', 'SubscriptionPlan', 'PlatformDashboard'] },
  { prefix: '/platform/announcements', primary: ['Announcement'], related: [] },
  { prefix: '/platform/announcement-templates', primary: ['AnnouncementTemplate'], related: [] },
  { prefix: '/platform/quotes', primary: ['PlatformQuote'], related: ['PlatformDashboard'], convertRelated: ['PlatformProformaInvoice', 'PlatformInvoice'] },
  { prefix: '/platform/proforma-invoices', primary: ['PlatformProformaInvoice'], related: ['PlatformDashboard'], convertRelated: ['PlatformQuote', 'PlatformInvoice'] },
  { prefix: '/platform/invoices', primary: ['PlatformInvoice'], related: ['Payment', 'PlatformClient', 'ClientSubscription', 'PlatformDashboard'] },
  { prefix: '/platform/payments', primary: ['Payment'], related: ['PlatformInvoice', 'PlatformClient', 'PlatformDashboard'] },
];

/** Mutations that cannot change anything we cache. */
const NO_EVICT_PREFIXES = ['/auth', '/uploads', '/ai', '/admin-notifications'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------------------------
// Pure helpers (unit tested)
// ---------------------------------------------------------------------------------------------

/** "/commerce/products?x=1" or "https://host/api/v1/commerce/products" -> "/commerce/products" (null for foreign hosts). */
export const normalizePath = (url: string, base: string = API_BASE_URL): string | null => {
  let path = String(url || '').trim();
  if (/^https?:\/\//i.test(path)) {
    if (!path.startsWith(base)) return null;
    path = path.slice(base.length);
  }
  path = path.split('?')[0].split('#')[0];
  if (!path.startsWith('/')) path = '/' + path;
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
};

const matchesPrefix = (path: string, prefix: string): boolean => path === prefix || path.startsWith(prefix + '/');
const segmentsAfter = (path: string, prefix: string): string[] =>
  path === prefix ? [] : path.slice(prefix.length + 1).split('/').filter(Boolean);

export const getCachePolicy = (url: string, base: string = API_BASE_URL): CachePolicy | null => {
  const path = normalizePath(url, base);
  if (!path) return null;
  if (BYPASS_PREFIXES.some((p) => matchesPrefix(path, p))) return null;
  const rule = POLICIES.find((p) => matchesPrefix(path, p.prefix));
  if (!rule) return null;
  // List or single record only; sub-resources (ledger, pdf, status, a supplier's bills...) stay live.
  if (!rule.deep && segmentsAfter(path, rule.prefix).length > 1) return null;
  return { ttl: rule.ttl, tags: rule.tags };
};

/** Tags a cached GET provides: its list or its single record, plus the legacy twin names. */
export const getProvidedTags = (url: string, base: string = API_BASE_URL): TagRef[] => {
  const path = normalizePath(url, base);
  const policy = getCachePolicy(url, base);
  if (!path || !policy) return [];
  const rule = POLICIES.find((p) => matchesPrefix(path, p.prefix))!;
  const segs = segmentsAfter(path, rule.prefix);
  const id = !rule.deep && segs.length === 1 ? segs[0] : 'LIST';
  const out: TagRef[] = [];
  for (const t of policy.tags) out.push({ type: t, id });
  return out;
};

const toRefs = (tags: AnyTagType[], id?: string | string[]): TagRef[] => {
  const ids = id === undefined ? [undefined] : Array.isArray(id) ? id : [id];
  const out: TagRef[] = [];
  for (const t of tags) {
    for (const i of ids) {
      out.push(i === undefined ? { type: t } : { type: t, id: i });
    }
  }
  return out;
};

const dedupe = (refs: TagRef[]): TagRef[] => {
  const seen = new Set<string>();
  return refs.filter((r) => {
    const k = `${r.type}|${r.id ?? ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/**
 * What a successful mutation must evict.
 *  - the touched record (by id) and its list, when the url carries an id; only the list for a plain create;
 *    the whole type for bulk/action urls whose ids are unknown;
 *  - the related entities of the rule, by type;
 *  - an unknown API mutation evicts every cached tag (safe default, still lazy).
 */
export const getInvalidationTags = (url: string, method: string = 'post', base: string = API_BASE_URL): TagRef[] => {
  const path = normalizePath(url, base);
  if (!path) return [];
  if (NO_EVICT_PREFIXES.some((p) => matchesPrefix(path, p))) return [];
  const rule = MUTATION_RULES.find((r) => matchesPrefix(path, r.prefix));
  if (!rule) return toRefs([...ALL_TAG_TYPES]);

  const segs = segmentsAfter(path, rule.prefix);
  const first = segs[0];
  const hasId = !!first && UUID_RE.test(first);
  const isCreate = method.toLowerCase() === 'post' && segs.length === 0;
  const isConvert = segs.some((s) => /convert/i.test(s));
  const isStatus = segs[segs.length - 1] === 'status';

  const primary = hasId ? toRefs(rule.primary, [first, 'LIST']) : isCreate ? toRefs(rule.primary, 'LIST') : toRefs(rule.primary);
  let related = isCreate && rule.createRelated ? rule.createRelated : rule.related;
  if (isConvert && rule.convertRelated) related = [...related, ...rule.convertRelated];
  if (isStatus && rule.statusRelated) related = [...related, ...rule.statusRelated];
  return dedupe([...primary, ...toRefs(Array.from(new Set(related)))]);
};

/** Stable, order-independent params without undefined/null (axios omits those, so they must not split the key). */
export const normalizeParams = (params: unknown): Record<string, unknown> | undefined => {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return undefined;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(params as Record<string, unknown>).sort()) {
    const v = (params as Record<string, unknown>)[key];
    if (v === undefined || v === null) continue;
    out[key] = v;
  }
  return Object.keys(out).length ? out : undefined;
};

/** Headers that only carry the tenant scope. They become part of the cache key, so they may be cached safely. */
const SCOPE_HEADERS = ['x-organization-id', 'x-sub-organization-id', 'x-branch-id'];

/** Scope headers of a request, sorted by name ('' is kept: it means "send no organization header"). */
export const scopeHeadersOf = (config?: AxiosRequestConfig): Record<string, string> | undefined => {
  const raw = (config?.headers || {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of Object.keys(raw).sort()) {
    const value = raw[key];
    if (value === undefined || value === null) continue;
    if (SCOPE_HEADERS.includes(key.toLowerCase())) out[key.toLowerCase()] = String(value);
  }
  return Object.keys(out).length ? out : undefined;
};

/**
 * Only plain `{ params }` requests (optionally with tenant-scope headers) are cached; custom headers, signal,
 * responseType, etc. always go to the network.
 */
export const isCacheableConfig = (config?: AxiosRequestConfig): boolean => {
  if (!config) return true;
  return Object.keys(config).every((k) => {
    const value = config[k as keyof AxiosRequestConfig] as unknown;
    if (k === 'params' || value === undefined) return true;
    if (k === 'headers' && value && typeof value === 'object') {
      return Object.keys(value as object).every((h) => SCOPE_HEADERS.includes(h.toLowerCase()) || (value as any)[h] === undefined);
    }
    return false;
  });
};

const deepClone = <T,>(value: T): T => {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const readScope = (): string => {
  try {
    return `${getStoredOrganizationId() || '-'}|${localStorage.getItem(USER_ID_STORAGE_KEY) || '-'}`;
  } catch {
    return '-|-';
  }
};

// ---------------------------------------------------------------------------------------------
// RTK Query endpoint + axios integration
// ---------------------------------------------------------------------------------------------

interface CachedGetArgs {
  url: string;
  params?: Record<string, unknown>;
  /** organisation|user: part of the cache key so tenants can never share an entry. */
  scope: string;
  provides: TagRef[];
  /** Tenant-scope headers (x-organization-id ...) sent with the request; part of the cache key. */
  headers?: Record<string, string>;
}

const originalGet = baseClient.get.bind(baseClient) as typeof baseClient.get;

const cacheApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    cachedGet: builder.query<unknown, CachedGetArgs>({
      // Uses the same axios client (auth header, silent token refresh, error shaping) as every other call.
      queryFn: async ({ url, params, headers }) => {
        try {
          const res = await originalGet(url, params || headers ? { ...(params ? { params } : {}), ...(headers ? { headers } : {}) } : undefined);
          return { data: res.data };
        } catch (e: any) {
          return {
            error: {
              status: e?.status ?? e?.response?.status ?? 0,
              data: e?.data ?? e?.response?.data ?? null,
              message: e?.message ?? 'Request failed',
            } as any,
          };
        }
      },
      providesTags: (_r, _e, arg) => arg.provides as any,
      keepUnusedDataFor: 86400, // RTK memory only; freshness is governed by the policy ttl
    }),
  }),
  overrideExisting: false,
});

type Dispatch = (action: any) => any;
type GetState = () => any;
let dispatch: Dispatch | null = null;
let getState: GetState | null = null;
let installed = false;

const typeEpochs: Record<string, number> = {};
const epochOf = (provides: TagRef[]) => provides.map((t) => typeEpochs[t.type] || 0).join('.');

export const apiCacheStats = { hits: 0, misses: 0, bypass: 0, evictions: 0 };
const debug = (kind: string, url: string, extra = '') => {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('debug_api_cache') === '1') {
      // eslint-disable-next-line no-console
      console.debug(`[api-cache] ${kind} ${url}${extra ? ' ' + extra : ''}`);
    }
  } catch {
    /* ignore */
  }
};

const toAxiosLike = (data: unknown, config?: AxiosRequestConfig): AxiosResponse =>
  ({ data, status: 200, statusText: 'OK', headers: {}, config: (config ?? {}) as any, request: undefined }) as AxiosResponse;

const cachedGet = async (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> => {
  const policy = dispatch ? getCachePolicy(url) : null;
  if (!policy || !dispatch || !isCacheableConfig(config)) {
    apiCacheStats.bypass += 1;
    debug('BYPASS', url);
    return originalGet(url, config);
  }

  const args: CachedGetArgs = {
    url,
    params: normalizeParams(config?.params),
    headers: scopeHeadersOf(config),
    scope: readScope(),
    provides: getProvidedTags(url),
  };

  // Hit/miss bookkeeping (diagnostics only).
  try {
    const entry = getState ? cacheApi.endpoints.cachedGet.select(args)(getState()) : undefined;
    const fresh = entry && entry.status === 'fulfilled' && entry.fulfilledTimeStamp && Date.now() - entry.fulfilledTimeStamp < policy.ttl * 1000;
    if (fresh) apiCacheStats.hits += 1;
    else apiCacheStats.misses += 1;
    debug(fresh ? 'HIT ' : 'MISS', url);
  } catch {
    /* ignore */
  }

  const epochAtStart = epochOf(args.provides);
  // forceRefetch as a number = "refetch if the cached data is older than this many seconds".
  const sub = dispatch(cacheApi.endpoints.cachedGet.initiate(args, { forceRefetch: policy.ttl, subscribe: true }));
  try {
    const data = await sub.unwrap();
    // A mutation finished while this request was in flight: do not keep a possibly stale entry.
    if (epochOf(args.provides) !== epochAtStart) dispatch(baseApi.util.invalidateTags(args.provides as any));
    return toAxiosLike(deepClone(data), config);
  } catch (e: any) {
    const status = e?.status ?? 0;
    const err: any = new Error(e?.message || 'Request failed');
    err.status = status;
    err.data = e?.data ?? null;
    err.response = { status, data: e?.data ?? null };
    throw err;
  } finally {
    sub.unsubscribe();
  }
};

/** Evicts cached responses for the given tags (default: everything). Lazy: refetches nothing by itself. */
export const evictApiCache = (tags: Array<AnyTagType | TagRef> = [...ALL_TAG_TYPES]): void => {
  if (!dispatch || tags.length === 0) return;
  const refs: TagRef[] = tags.map((t) => (typeof t === 'string' ? { type: t } : t));
  refs.forEach((r) => {
    typeEpochs[r.type] = (typeEpochs[r.type] || 0) + 1;
  });
  apiCacheStats.evictions += 1;
  debug('EVICT', refs.map((r) => r.type + (r.id ? ':' + r.id : '')).join(','));
  dispatch(baseApi.util.invalidateTags(refs as any));
  // Server-side side effects of a mutation (e.g. a notification) can now exist: let the app refresh them once.
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('crm:data-mutated', { detail: { tags: refs } }));
};

/** Wipes every cached response. Called on login, logout and when the organisation changes. */
export const clearApiCache = (): void => {
  if (!dispatch) return;
  Object.keys(typeEpochs).forEach((k) => delete typeEpochs[k]);
  debug('CLEAR', 'all');
  dispatch(baseApi.util.resetApiState());
};

/**
 * Wires the cache into the app. Call once, right after the store is created.
 *  - GETs through `baseClient.get` are served by the cache when a policy allows it.
 *  - Successful mutations through `baseClient` evict the affected tags.
 *  - Clicking the sidebar item of the page you are already on is an explicit refresh and evicts the cache.
 */
export const installApiCache = (store: { dispatch: Dispatch; getState: GetState }): void => {
  dispatch = store.dispatch;
  getState = store.getState;
  if (installed) return;
  installed = true;

  (baseClient as any).get = (url: string, config?: AxiosRequestConfig) => cachedGet(url, config);

  baseClient.interceptors.response.use((response) => {
    const method = String(response.config?.method || 'get').toLowerCase();
    if (method !== 'get' && method !== 'head' && method !== 'options') {
      const tags = getInvalidationTags(String(response.config?.url || ''), method, response.config?.baseURL || API_BASE_URL);
      if (tags.length) evictApiCache(tags);
    }
    return response;
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('crm:sidebar-navigate', (e: Event) => {
      const path = (e as CustomEvent<{ path?: string }>).detail?.path;
      if (path && path === window.location.pathname) evictApiCache();
    });
    (window as any).__apiCache = apiCacheStats;
  }
};

/** Test helper. */
export const __resetApiCacheForTests = (): void => {
  Object.keys(typeEpochs).forEach((k) => delete typeEpochs[k]);
  apiCacheStats.hits = apiCacheStats.misses = apiCacheStats.bypass = apiCacheStats.evictions = 0;
};
