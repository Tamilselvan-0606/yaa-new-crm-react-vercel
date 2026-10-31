import type { ReminderItem } from '../types';

export type NotificationMode = 'SALES' | 'CLIENT';

/** Readable names of the notification modules the API reports (module as recorded by the backend). */
const MODULE_LABELS: Record<string, string> = {
  'purchase-requests': 'Purchase Requests',
  'purchase-orders': 'Purchase Orders',
  'purchase-returns': 'Purchase Returns',
  'payments-in': 'Payments In',
  'payments-out': 'Payments Out',
  'sales-representatives': 'Sales Representatives',
  'sub-organizations': 'Sub Organizations',
  'organization-subscriptions': 'Subscriptions',
  'subscription-plans': 'Subscription Plans',
  'sales-returns': 'Returns',
  'bulk-upload': 'Bulk Upload',
  'bulk-convert': 'Bulk Convert',
  proformas: 'Proforma Invoices',
  'proforma-invoices': 'Proforma Invoices',
  quotations: 'Quotations',
  quotes: 'Quotations',
  returns: 'Returns',
  subscriptions: 'Subscriptions',
  // Older rows were recorded under the URL alias the client used; the backend now stores the canonical name
  sales: 'Invoices',
  'sales-invoices': 'Invoices',
  'sale-orders': 'Orders',
  'sales-orders': 'Orders',
  'delivery-challans': 'Challans',
  stock: 'Stocks',
  purchases: 'Purchase Requests',
};

/** "purchase-requests" -> "Purchase Requests". */
export const moduleLabel = (module?: string | null): string => {
  if (!module) return 'General';
  const key = module.toLowerCase();
  return MODULE_LABELS[key] || key.split(/[-_]/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
};

/** The categories each management type offers in the Reminders filter. */
export const CATEGORIES: Record<NotificationMode, string[]> = {
  CLIENT: [
    'Clients', 'Leads', 'Quotations', 'Proforma Invoices', 'Invoices', 'Payments',
    'Organizations', 'Sub Organizations', 'Branches', 'Products', 'Subscriptions', 'Subscription Plans',
  ],
  SALES: [
    'Customers', 'Quotations', 'Proforma Invoices', 'Orders', 'Challans', 'Invoices', 'Payments In', 'Returns',
    'Collections', 'Sales Representatives', 'Products', 'Categories', 'Subcategories', 'Units', 'Stocks',
    'Purchase Requests', 'Purchase Orders', 'Purchase Returns', 'Suppliers', 'Payments Out', 'Expenses',
    'Bulk Upload', 'Bulk Convert', 'Branches', 'Sub Organizations',
  ],
};

/** Modules that only exist in Client Management (platform clients, leads, billing and subscriptions). */
const CLIENT_ONLY_MODULES = new Set([
  'clients',
  'leads',
  'organizations',
  'subscriptions',
  'subscription-plans',
  'organization-subscriptions',
  'quotes',
  'payments',
  'product-plans',
]);

/** Modules that only exist in Sales Management (commerce & work inventory, sales, and purchase workflows). */
const SALES_ONLY_MODULES = new Set([
  'customers',
  'quotations',
  'proformas',
  'orders',
  'sale-orders',
  'sales-orders',
  'challans',
  'delivery-challans',
  'sales',
  'sales-invoices',
  'payments-in',
  'returns',
  'sales-returns',
  'collections',
  'sales-representatives',
  'categories',
  'subcategories',
  'units',
  'stocks',
  'stock',
  'purchase-requests',
  'purchases',
  'purchase-orders',
  'purchase-returns',
  'suppliers',
  'payments-out',
  'expenses',
  'bulk-upload',
  'bulk-convert',
]);

/** Shared structural modules that exist in both Client and Sales Management under the platform service. */
const SHARED_PLATFORM_MODULES = new Set(['sub-organizations', 'branches']);

/**
 * Whether a notification belongs on the Sales Management or the Client Management screen.
 * - `commerce` and `work` services (or `/commerce` and `/work` paths, or `SALES_ONLY_MODULES`) belong strictly to `SALES`.
 * - `crm` service (or `/crm` path, or `CLIENT_ONLY_MODULES`) belongs strictly to `CLIENT`.
 * - `platform` service belongs to `CLIENT` for all client/billing/product modules (`products`, `invoices`, `proforma-invoices`, etc.),
 *   and is shared with `SALES` only for structural modules (`sub-organizations`, `branches`) unless explicitly tagged for the other mode.
 */
export const isRelevantTo = (
  mode: NotificationMode,
  item: Pick<ReminderItem, 'relatedType'> & { service?: string; notificationType?: string; path?: string }
): boolean => {
  const module = (item.relatedType || '').toLowerCase().trim();
  const service = (item.service || '').toLowerCase().trim();
  const notifType = (item.notificationType || '').toUpperCase().trim();
  const path = (item.path || '').toLowerCase().trim();

  const isSalesServiceOrPath =
    service === 'commerce' ||
    service === 'work' ||
    path.includes('/commerce/') ||
    path.includes('/work/');

  const isCrmServiceOrPath = service === 'crm' || path.includes('/crm/');

  const isPlatformServiceOrPath =
    service === 'platform' ||
    path.includes('/platform/') ||
    path.startsWith('/products') ||
    path.startsWith('/subscriptions');

  if (mode === 'CLIENT') {
    if (isSalesServiceOrPath) return false;
    if (SALES_ONLY_MODULES.has(module)) return false;
    if (notifType === 'SALES') return false;
    return true;
  }

  // mode === 'SALES'
  if (isCrmServiceOrPath) return false;
  if (CLIENT_ONLY_MODULES.has(module)) return false;
  if (notifType === 'CLIENT') return false;

  // Platform service hosts Client Management's products, invoices, proforma-invoices, quotes, payments, etc.
  // Only shared structural modules (sub-organizations, branches) from platform are relevant to Sales Management.
  if (isPlatformServiceOrPath && !isSalesServiceOrPath) {
    return SHARED_PLATFORM_MODULES.has(module);
  }

  return true;
};
