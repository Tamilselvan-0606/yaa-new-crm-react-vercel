import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// The API modules read localStorage when a request is made; give node a minimal one before importing them.
const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};

const BASE = 'https://api.dev.crm.yaacreations.com/api/v1';
const ID1 = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b';
const ID2 = '9a8b7c6d-1e2f-4a3b-8c4d-5e6f7a8b9c0d';

let mod: typeof import('../src/api/queryCache');
let rtk: typeof import('@reduxjs/toolkit');
let baseApiMod: typeof import('../src/api/baseApi');

const types = (refs: Array<{ type: string; id?: string }>) => new Set(refs.map((r) => r.type));
const has = (refs: Array<{ type: string; id?: string }>, type: string, id?: string) =>
  refs.some((r) => r.type === type && (id === undefined ? true : r.id === id));

before(async () => {
  mod = await import('../src/api/queryCache');
  rtk = await import('@reduxjs/toolkit');
  baseApiMod = await import('../src/api/baseApi');
});

describe('cache policy (what may be cached)', () => {
  it('caches lists and single records of master and transaction data', () => {
    assert.deepEqual(mod.getCachePolicy('/commerce/products'), { ttl: 60, tags: ['Product'] });
    assert.deepEqual(mod.getCachePolicy(`/commerce/products/${ID1}`), { ttl: 60, tags: ['Product'] });
    assert.equal(mod.getCachePolicy('/commerce/categories')!.ttl, 300);
    assert.equal(mod.getCachePolicy('/commerce/units')!.ttl, 600);
    assert.equal(mod.getCachePolicy('/work/purchase-orders')!.ttl, 30);
    assert.deepEqual(mod.getCachePolicy('/work/purchase-orders')!.tags, ['PurchaseOrder', 'PurchaseBill']);
    assert.equal(mod.getCachePolicy('/commerce/sales/dashboard/modules')!.ttl, 60);
  });

  it('never caches live data: stock, batches, ledgers, collections, notifications, auth, files', () => {
    for (const u of [
      '/commerce/stocks',
      '/commerce/stocks/batches',
      '/commerce/stocks/ledger',
      '/commerce/stocks/low-stock',
      '/commerce/collections/invoices',
      '/commerce/collections/dashboard-metrics',
      '/admin-notifications',
      '/auth/login',
      '/uploads/base64',
      `/commerce/customers/${ID1}/ledger`,
      `/work/suppliers/${ID1}/purchase-bills`,
      `/commerce/invoices/${ID1}/pdf`,
      `/work/purchase-orders/${ID1}/status`,
    ]) {
      assert.equal(mod.getCachePolicy(u), null, u);
    }
  });

  it('does not cache URLs it has no policy for, or other hosts', () => {
    assert.equal(mod.getCachePolicy('/platform/unmapped-things'), null);
    assert.equal(mod.getCachePolicy('https://evil.example.com/commerce/products'), null);
  });

  it('ignores the query string and accepts absolute URLs of the API host', () => {
    assert.ok(mod.getCachePolicy('/commerce/products?page_no=2&search=abc'));
    assert.ok(mod.getCachePolicy(`${BASE}/commerce/products`));
  });
});

describe('tags provided by a cached GET', () => {
  it('lists provide LIST and single records provide their id (canonical names only)', () => {
    const list = mod.getProvidedTags('/commerce/quotations?page_no=1');
    assert.deepEqual(list, [{ type: 'Estimation', id: 'LIST' }]);
    const one = mod.getProvidedTags(`/commerce/products/${ID1}`);
    assert.deepEqual(one, [{ type: 'Product', id: ID1 }]);
    // one backend entity (/work/purchase-orders) is provided under both of its canonical names
    assert.deepEqual(mod.getProvidedTags('/work/purchase-orders'), [
      { type: 'PurchaseOrder', id: 'LIST' },
      { type: 'PurchaseBill', id: 'LIST' },
    ]);
  });
});

describe('invalidation after a mutation (what gets evicted)', () => {
  it('create evicts the list only, update/delete the record and the list', () => {
    const create = mod.getInvalidationTags('/commerce/products', 'post');
    assert.ok(has(create, 'Product', 'LIST'));
    assert.ok(!create.some((r) => r.type === 'Product' && r.id === ID1));

    const update = mod.getInvalidationTags(`/commerce/products/${ID1}`, 'put');
    assert.ok(has(update, 'Product', ID1));
    assert.ok(has(update, 'Product', 'LIST'));
    assert.ok(!has(update, 'Product', ID2));

    const del = mod.getInvalidationTags(`/commerce/products/${ID1}`, 'delete');
    assert.ok(has(del, 'Product', ID1) && has(del, 'Product', 'LIST'));
  });

  it('product create also evicts stock and batches (the API creates them with the opening stock)', () => {
    const t = types(mod.getInvalidationTags('/commerce/products', 'post'));
    assert.ok(t.has('Stock') && t.has('Batch'));
  });

  it('purchase return evicts bill, supplier ledger, stock and batch but NOT payment out', () => {
    const t = types(mod.getInvalidationTags('/commerce/purchase-returns', 'post'));
    for (const need of ['PurchaseReturn', 'PurchaseBill', 'PurchaseOrder', 'Supplier', 'SupplierLedger', 'Stock', 'Batch']) {
      assert.ok(t.has(need), need);
    }
    assert.ok(!t.has('PaymentOut'));
  });

  it('a purchase bill evicts neither payment out nor stock, unless its status changes', () => {
    const create = types(mod.getInvalidationTags('/work/purchase-orders', 'post'));
    assert.ok(!create.has('PaymentOut') && !create.has('Stock') && !create.has('Batch'));
    assert.ok(create.has('PurchaseBill') && create.has('SupplierLedger'));
    const status = types(mod.getInvalidationTags(`/work/purchase-orders/${ID1}/status`, 'patch'));
    assert.ok(status.has('Stock') && status.has('Batch'));
    assert.ok(!status.has('PaymentOut'));
  });

  it('payment out evicts the bill and supplier ledger', () => {
    const t = types(mod.getInvalidationTags('/work/payments-out', 'post'));
    assert.ok(t.has('PaymentOut') && t.has('PurchaseBill') && t.has('SupplierLedger'));
  });

  it('a sales invoice evicts stock and the customer but not payment in', () => {
    const t = types(mod.getInvalidationTags('/commerce/invoices', 'post'));
    assert.ok(t.has('SalesInvoice') && t.has('Stock') && t.has('Customer') && t.has('CustomerLedger'));
    assert.ok(!t.has('PaymentIn'));
  });

  it('renaming a category also evicts products (they carry the category name)', () => {
    const t = types(mod.getInvalidationTags(`/commerce/categories/${ID1}`, 'put'));
    assert.ok(t.has('Category') && t.has('Product') && t.has('Subcategory'));
  });

  it('converting a document evicts the document chain; a plain edit does not', () => {
    const edit = types(mod.getInvalidationTags(`/commerce/quotations/${ID1}`, 'put'));
    assert.ok(!edit.has('SalesInvoice') && !edit.has('Stock'));
    const convert = types(mod.getInvalidationTags(`/commerce/quotations/${ID1}/convert`, 'post'));
    assert.ok(convert.has('SalesInvoice') && convert.has('SaleOrder') && convert.has('Stock'));
  });

  it('mutations that cannot change cached data evict nothing; unknown API mutations evict everything', () => {
    assert.deepEqual(mod.getInvalidationTags('/auth/login', 'post'), []);
    assert.deepEqual(mod.getInvalidationTags('/admin-notifications/mark-read', 'post'), []);
    assert.ok(types(mod.getInvalidationTags('/something/new', 'post')).size > 20);
  });
});

describe('Client Management policies', () => {
  it('caches platform lists and records, keeps actions live', () => {
    assert.ok(mod.getCachePolicy('/platform/organizations?page=1'));
    assert.ok(mod.getCachePolicy('/platform/sub-organizations'));
    assert.ok(mod.getCachePolicy('/platform/leads'));
    assert.ok(mod.getCachePolicy('/platform/quotes'));
    assert.ok(mod.getCachePolicy(`/platform/organizations/${ID1}`));
    for (const u of [`/platform/organizations/${ID1}/status`, `/platform/quotes/${ID1}/convert`]) {
      assert.equal(mod.getCachePolicy(u), null, u);
    }
  });

  it('a platform mutation evicts only related data, never Sale Management data', () => {
    const quote = mod.getInvalidationTags('/platform/quotes', 'post');
    assert.ok(has(quote, 'PlatformQuote', 'LIST'));
    assert.ok(!types(quote).has('Lead') && !types(quote).has('Product') && !types(quote).has('Customer'));
    const org = mod.getInvalidationTags(`/platform/organizations/${ID1}`, 'patch');
    assert.ok(has(org, 'Organization', 'LIST'));
    assert.ok(!types(org).has('PlatformQuote') && !types(org).has('Product'));
  });
});

describe('announcements', () => {
  it('caches the admin list and a record, keeps the inbox and counts live', () => {
    assert.ok(mod.getCachePolicy('/platform/announcements?page_no=1'));
    assert.ok(mod.getCachePolicy(`/platform/announcements/${ID1}`));
    for (const u of ['/platform/announcements/inbox', '/platform/announcements/inbox/unread-count', `/platform/announcements/inbox/${ID1}`, '/platform/announcements/recipient-count', `/platform/announcements/${ID1}/recipients`]) {
      assert.equal(mod.getCachePolicy(u), null, u);
    }
  });

  it('a send or delete evicts the announcement list', () => {
    assert.ok(has(mod.getInvalidationTags('/platform/announcements', 'post'), 'Announcement', 'LIST'));
    assert.ok(has(mod.getInvalidationTags(`/platform/announcements/${ID1}`, 'delete'), 'Announcement', 'LIST'));
  });
});

describe('announcement templates', () => {
  it('caches the list and a record; a change evicts them', () => {
    assert.ok(mod.getCachePolicy('/platform/announcement-templates?page_no=1'));
    assert.ok(mod.getCachePolicy('/platform/announcement-templates/maintenance'));
    assert.ok(has(mod.getInvalidationTags('/platform/announcement-templates', 'post'), 'AnnouncementTemplate', 'LIST'));
    assert.ok(has(mod.getInvalidationTags(`/platform/announcement-templates/${ID1}`, 'patch'), 'AnnouncementTemplate', 'LIST'));
  });
});

describe('request helpers', () => {
  it('normalizes params: sorted, no undefined/null', () => {
    assert.deepEqual(mod.normalizeParams({ b: 2, a: 1, c: undefined, d: null }), { a: 1, b: 2 });
    assert.equal(mod.normalizeParams({ a: undefined }), undefined);
    assert.equal(mod.normalizeParams(undefined), undefined);
  });
  it('only plain { params } configs are cacheable', () => {
    assert.equal(mod.isCacheableConfig(undefined), true);
    assert.equal(mod.isCacheableConfig({ params: { a: 1 } }), true);
    assert.equal(mod.isCacheableConfig({ params: {}, headers: { 'x-organization-id': 'x' } }), true); // tenant scope is part of the key
    assert.equal(mod.isCacheableConfig({ params: {}, headers: { 'x-custom': 'x' } }), false);
    assert.equal(mod.isCacheableConfig({ responseType: 'blob' }), false);
  });
});

describe('cache behaviour through a real RTK store (counting the network)', () => {
  let store: any;
  const calls: string[] = [];
  let failNext = false;

  before(() => {
    const { baseClient, baseApi } = baseApiMod;
    // Count real requests at the transport level, below every interceptor.
    (baseClient.defaults as any).adapter = async (config: any) => {
      const url = String(config.url) + (config.params ? '?' + new URLSearchParams(Object.entries(config.params).map(([k, v]) => [k, String(v)])).toString() : '');
      calls.push(`${String(config.method).toUpperCase()} ${url}`);
      if (failNext) {
        failNext = false;
        const err: any = new Error('Request failed with status code 422');
        err.response = { status: 422, data: { error: { code: 'X', message: 'Bad thing' } }, config };
        err.isAxiosError = true;
        throw err;
      }
      return { data: { data: [{ id: 1, n: calls.length }] }, status: 200, statusText: 'OK', headers: {}, config };
    };
    store = rtk.configureStore({
      reducer: { [baseApi.reducerPath]: baseApi.reducer },
      middleware: (gdm) => gdm({ serializableCheck: false }).concat(baseApi.middleware),
    });
    mod.installApiCache(store);
    localStorage.setItem('yaa_crm_organization_id', 'org-A');
    localStorage.setItem('nexus_crm_user_id', 'user-1');
  });

  after(() => {
    store.dispatch(baseApiMod.baseApi.util.resetApiState()); // clears RTK's keepUnusedDataFor timers so node can exit
  });

  const get = (url: string, params?: any) => baseApiMod.baseClient.get(url, params ? { params } : undefined);
  const count = (needle: string) => calls.filter((c) => c.includes(needle)).length;

  it('first visit calls the API; returning reuses the cached response', async () => {
    calls.length = 0;
    await get('/commerce/categories', { page_no: 1 });
    await get('/commerce/categories', { page_no: 1 });
    await get('/commerce/categories', { page_no: 1 });
    assert.equal(count('GET /commerce/categories'), 1);
  });

  it('a parallel identical request (Strict Mode double effect) shares one network call', async () => {
    calls.length = 0;
    await Promise.all([get('/commerce/units'), get('/commerce/units')]);
    assert.equal(count('GET /commerce/units'), 1);
  });

  it('search, pagination and filters produce separate cache entries', async () => {
    calls.length = 0;
    await get('/commerce/customers', { page_no: 1, search: 'a' });
    await get('/commerce/customers', { page_no: 2, search: 'a' });
    await get('/commerce/customers', { page_no: 1, search: 'ab' });
    await get('/commerce/customers', { search: 'a', page_no: 1 }); // same as the first, different key order
    assert.equal(count('GET /commerce/customers'), 3);
  });

  it('stock and batches are never served from the cache', async () => {
    calls.length = 0;
    await get('/commerce/stocks', { page_no: 1 });
    await get('/commerce/stocks', { page_no: 1 });
    await get('/commerce/stocks/batches', { productId: ID1 });
    await get('/commerce/stocks/batches', { productId: ID1 });
    assert.equal(count('GET /commerce/stocks'), 4);
  });

  it('a mutation evicts only the affected data', async () => {
    calls.length = 0;
    await get('/commerce/categories', { page_no: 9 });
    await get('/work/expenses', { page_no: 9 });
    await get('/commerce/units', { page_no: 9 });
    assert.equal(calls.length, 3);
    calls.length = 0;
    // Updating a category: categories/subcategories/products are evicted; expenses and units are not
    await baseApiMod.baseClient.put(`/commerce/categories/${ID1}`, { categoryName: 'x' });
    await get('/commerce/categories', { page_no: 9 });
    await get('/work/expenses', { page_no: 9 });
    await get('/commerce/units', { page_no: 9 });
    assert.equal(count('GET /commerce/categories'), 1, 'category list refetched');
    assert.equal(count('GET /work/expenses'), 0, 'expenses untouched');
    assert.equal(count('GET /commerce/units'), 0, 'units untouched');
  });

  it('a purchase return refreshes the bill but leaves payment out cached', async () => {
    await get('/work/purchase-orders', { page_no: 5 });
    await get('/work/payments-out', { page_no: 5 });
    calls.length = 0;
    await baseApiMod.baseClient.post('/commerce/purchase-returns', { x: 1 });
    await get('/work/purchase-orders', { page_no: 5 });
    await get('/work/payments-out', { page_no: 5 });
    assert.equal(count('GET /work/purchase-orders'), 1);
    assert.equal(count('GET /work/payments-out'), 0);
  });

  it('data from one organisation is never served to another', async () => {
    localStorage.setItem('yaa_crm_organization_id', 'org-A');
    calls.length = 0;
    await get('/commerce/subcategories', { page_no: 1 });
    localStorage.setItem('yaa_crm_organization_id', 'org-B');
    await get('/commerce/subcategories', { page_no: 1 });
    assert.equal(count('GET /commerce/subcategories'), 2);
    localStorage.setItem('yaa_crm_organization_id', 'org-A');
    await get('/commerce/subcategories', { page_no: 1 });
    assert.equal(count('GET /commerce/subcategories'), 2, 'org A still cached');
  });

  it('clearing the cache (login / logout) forces a fresh fetch', async () => {
    await get('/commerce/units', { page_no: 77 });
    calls.length = 0;
    mod.clearApiCache();
    await get('/commerce/units', { page_no: 77 });
    assert.equal(count('GET /commerce/units'), 1);
  });

  it('explicit refresh (evict everything) refetches on the next visit', async () => {
    await get('/commerce/categories', { page_no: 55 });
    calls.length = 0;
    mod.evictApiCache();
    await get('/commerce/categories', { page_no: 55 });
    assert.equal(count('GET /commerce/categories'), 1);
  });

  it('callers get a private copy they may mutate without corrupting the cache', async () => {
    const a: any = await get('/commerce/expense-categories-copy-check-not-cached');
    assert.ok(a);
    const first: any = await get('/work/expense-categories', { page_no: 3 });
    first.data.data.push({ id: 'junk' });
    first.data.data[0].id = 'changed';
    const second: any = await get('/work/expense-categories', { page_no: 3 });
    assert.equal(second.data.data.length, 1);
    assert.equal(second.data.data[0].id, 1);
  });

  it('errors keep the same shape as plain axios errors and are not cached', async () => {
    calls.length = 0;
    failNext = true;
    await assert.rejects(get('/commerce/purchase-requests', { page_no: 42 }), (e: any) => {
      assert.equal(e.response.status, 422);
      assert.equal(e.response.data.error.message, 'Bad thing');
      assert.equal(e.status, 422);
      return true;
    });
    await get('/commerce/purchase-requests', { page_no: 42 }); // retried on the network, not a cached failure
    assert.equal(count('GET /commerce/purchase-requests'), 2);
  });

  it('a request with custom headers or response type goes straight to the network', async () => {
    calls.length = 0;
    await baseApiMod.baseClient.get('/commerce/categories', { params: { page_no: 123 }, headers: { 'x-custom': 'o' } } as any);
    await baseApiMod.baseClient.get('/commerce/categories', { params: { page_no: 123 }, headers: { 'x-custom': 'o' } } as any);
    assert.equal(count('GET /commerce/categories'), 2);
  });

  it('Client Management: returning to a module reuses the response; a change refreshes only its own data', async () => {
    calls.length = 0;
    for (const u of ['/platform/organizations', '/platform/quotes', '/platform/leads']) await get(u, { page: 1 });
    for (const u of ['/platform/organizations', '/platform/quotes', '/platform/leads']) await get(u, { page: 1 });
    assert.equal(calls.length, 3, 'one network call per module');

    calls.length = 0;
    await baseApiMod.baseClient.post('/platform/quotes', { x: 1 });
    calls.length = 0;
    await get('/platform/organizations', { page: 1 });
    await get('/platform/leads', { page: 1 });
    await get('/platform/quotes', { page: 1 });
    assert.equal(count('GET /platform/quotes'), 1, 'quotes refetched after creating a quote');
    assert.equal(count('GET /platform/organizations'), 0, 'organizations untouched');
    assert.equal(count('GET /platform/leads'), 0, 'leads untouched');
  });

  it('Client Management: editing an organization refreshes organizations, not quotes', async () => {
    await get('/platform/organizations', { page: 2 });
    await get('/platform/quotes', { page: 2 });
    await baseApiMod.baseClient.patch(`/platform/organizations/${ID1}`, { name: 'x' });
    calls.length = 0;
    await get('/platform/organizations', { page: 2 });
    await get('/platform/quotes', { page: 2 });
    assert.equal(count('GET /platform/organizations'), 1);
    assert.equal(count('GET /platform/quotes'), 0);
  });

  it('Client Management: the organization header is part of the cache key', async () => {
    calls.length = 0;
    const scoped = (org: string) =>
      baseApiMod.baseClient.get('/platform/sub-organizations', { params: { page_no: 1 }, headers: { 'x-organization-id': org } } as any);
    await scoped('org-A');
    await scoped('org-A');
    await scoped('org-B');
    assert.equal(count('GET /platform/sub-organizations'), 2);
  });
});
