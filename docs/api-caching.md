# API caching (RTK Query)

## Why this exists
Most Inventory, Purchase and Sales Hub screens call the axios API wrappers directly, not RTK Query hooks, so
nothing was cached: every visit to a page called the API again. `src/api/queryCache.ts` puts those GETs behind one
RTK Query endpoint, so they get a cache, in-flight de-duplication, expiry and tag invalidation without rewriting
the screens. Screens that already use RTK hooks (dashboards, leads, payments, reports) use the same store and tags.

## How it behaves
- First visit: the API is called and the response is cached (key = url + params + organisation + user).
- Leave and come back inside the freshness window: the cached response is used, no request.
- Search, page, filter, branch and organisation values are part of the key, so each gets its own entry.
- A successful create / update / delete evicts only what it can change (the record by id, its list, and related data).
  Eviction refetches nothing by itself; the next visit fetches fresh data.
- Explicit refresh (Refresh / Sync buttons, or clicking the sidebar item of the page you are already on) bypasses the cache.
- Login and logout wipe the whole cache.
- Callers receive a private copy of the data, so sorting or editing a response cannot corrupt the cache.

## Freshness windows (`ttl`, seconds)
| Data | ttl | Why |
|---|---|---|
| Units | 600 | Rarely changes |
| Categories, subcategories, expense categories | 300 | Master data |
| Suppliers, sales representatives | 120 | Shared lists |
| Products, customers | 60 | Carry stock figures / balances |
| Estimates, proformas, sale orders, challans, invoices, payments in/out, purchase bills/requests/returns, returns, expenses | 30 | Transactions with balances and statuses |
| Sale-management dashboard and reports | 60 | Summaries |

RTK endpoints that read live data (`/commerce/stocks`, batches, ledgers, low stock) keep unused data for 5 s only.
All other RTK endpoints keep unused data for 300 s. Refetch on focus is off; refetch on reconnect is on.

## Never cached (always live)
Stock list, batches, stock ledger and low-stock (`/commerce/stocks*`); collections (`/commerce/collections*`);
customer and supplier ledgers and a supplier's bills; PDFs; `/admin-notifications`; `/auth`; `/uploads`; `/ai`;
any request with custom headers, `signal` or `responseType`; any URL with no policy.

## What a mutation evicts (measured against the dev API, 2026-11-03)
| Mutation | Evicts |
|---|---|
| Product create | Product list, Stock, Batch (creating a product with opening stock creates both), dashboards |
| Product update / delete | That product, the Product list, Stock, Batch, dashboards |
| Category / subcategory / unit change | Itself, plus Product (products carry the category name) |
| Purchase bill create / edit / delete | Bill list and record, Supplier, SupplierLedger, dashboards. **Not** PaymentOut, **not** Stock |
| Purchase bill status change (receive / cancel) | The above plus Stock, Batch, Product |
| Payment out | PaymentOut, the bill, Supplier, SupplierLedger, dashboards |
| Purchase return | PurchaseReturn, the bill, Supplier, SupplierLedger, Stock, Batch, Product, dashboards. **Not** PaymentOut (returns create no payment record) |
| Sales invoice | SalesInvoice, Stock, Batch, Product, Customer, CustomerLedger, Collection, dashboards. **Not** PaymentIn |
| Payment in | PaymentIn, SalesInvoice, Customer, CustomerLedger, Collection, dashboards |
| Document conversion (`/convert`) | The whole document chain plus stock and customer data |
| Unknown API mutation | Everything cached (safe default) |

Notifications: after any mutation that evicts something, the bell refreshes once (debounced 1.5 s).

## Tags
One definition in `src/api/tags.ts`. Canonical names: Product, Category, Subcategory, Unit, Stock, Batch, Supplier,
PurchaseRequest, PurchaseOrder, PurchaseBill, PurchaseReturn, PaymentOut, Expense, ExpenseCategory, SupplierLedger,
Customer, SalesRepresentative, Estimation, ProformaInvoice, SaleOrder, DeliveryChallan, SalesInvoice, PaymentIn,
SalesReturn, Collection, CustomerLedger, Notification, Dashboard, SalesReport.

About 100 existing endpoints still use the older names Quotation, Proforma, SalesOrder, Purchase and Report. They stay
registered, and each canonical tag with an old twin is provided and invalidated together with it, so either side
evicts the other. PurchaseOrder and PurchaseBill are one backend entity (`/work/purchase-orders`).

## Checking it in the browser
1. In DevTools run `localStorage.setItem('debug_api_cache','1')` and reload. The console then logs `HIT`, `MISS`,
   `BYPASS` and `EVICT` for every API call.
2. `window.__apiCache` shows running counts of hits, misses, bypasses and evictions.
3. Filter the Network tab to Fetch/XHR and walk through: open Products, open Purchase, go back to Products (no new
   request inside 60 s), create a product (list refetches on the next visit), search and page (new requests with the
   new parameters), click Refresh (request goes out), switch organisation (separate entries).

## Known limits
- Another user's change shows up after the freshness window, or on an explicit refresh, not instantly.
- Eviction after a mutation follows the table above; a new backend side effect needs a new rule in `MUTATION_RULES`.
- The cache is in memory: a full page reload starts empty.
