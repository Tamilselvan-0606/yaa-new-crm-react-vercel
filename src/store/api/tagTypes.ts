/**
 * The ONE definition of every RTK Query cache tag in the app. `baseApi` registers `ALL_TAG_TYPES`; every
 * `providesTags` / `invalidatesTags` / `invalidateTags` (and `api/queryCache.ts`) uses these names and no others.
 *
 * Naming rules: singular PascalCase, one tag per entity. Entities that are stored under /work/purchase-orders are
 * tagged `PurchaseOrder` AND `PurchaseBill` together (the backend has one entity; the app shows it as "Purchase
 * Bills"), so either name evicts it.
 */

/** Sale Management (Inventory, Purchase, Sales Hub), notifications, dashboard and reports. */
export const TAG_TYPES = [
  // Inventory
  'Product',
  'Category',
  'Subcategory',
  'Unit',
  'Stock',
  'Batch',
  // Purchase
  'Supplier',
  'PurchaseRequest',
  'PurchaseOrder',
  'PurchaseBill',
  'PurchaseReturn',
  'PaymentOut',
  'Expense',
  'ExpenseCategory',
  'SupplierLedger',
  // Sales Hub
  'Customer',
  'SalesRepresentative',
  'Estimation',
  'ProformaInvoice',
  'SaleOrder',
  'DeliveryChallan',
  'SalesInvoice',
  'PaymentIn',
  'SalesReturn',
  'Collection',
  'CustomerLedger',
  // Cross-cutting
  'Notification',
  'Dashboard',
  'SalesReport',
] as const;

export type TagType = (typeof TAG_TYPES)[number];

/**
 * Client Management / platform / CRM tags. Kept separate from the Sale Management tags on purpose: a platform
 * quote, proforma, invoice, dashboard, customer or product is a DIFFERENT entity from the Sale Management one, and
 * sharing a name made a Sale Management change refresh Client Management queries and vice versa.
 */
export const PLATFORM_TAG_TYPES = [
  'User',
  'Organization',
  'Branch',
  'Lead',
  'Task',
  'Content',
  'Employee',
  'Reminder',
  'Activity',
  'Setting',
  'Payment',
  'PlatformQuote',
  'PlatformProformaInvoice',
  'PlatformInvoice',
  'PlatformDashboard',
  'PlatformClient',
  'ClientProduct',
  'ClientSubscription',
  'ProductPlan',
  'Subscription',
  'SubscriptionPlan',
  'OrgSubscription',
  'Announcement',
  'AnnouncementTemplate',
  'CrmCustomer',
  'CrmProduct',
  'CrmReport',
] as const;

export type PlatformTagType = (typeof PLATFORM_TAG_TYPES)[number];

export const ALL_TAG_TYPES = [...TAG_TYPES, ...PLATFORM_TAG_TYPES] as const;
export type AnyTagType = (typeof ALL_TAG_TYPES)[number];
