/**
 * Sales Dashboard Types for Commerce Sales Operations
 * Endpoints:
 * - GET /commerce/sales/dashboard/modules
 * - GET /commerce/sales/dashboard/low-stock
 * - GET /commerce/sales/dashboard/top-products
 * - GET /commerce/sales/dashboard/recent-transactions
 */

export type SalesDashboardPeriod =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'all'
  | 'week'
  | 'month'
  | 'year';

export interface SalesDashboardCommonParams {
  period?: SalesDashboardPeriod | string;
  from?: string; // YYYY-MM-DD format (overrides period)
  to?: string;   // YYYY-MM-DD format
  organization_id?: string;
  sub_organization_id?: string;
  branch_id?: string;
}

// -------------------------------------------------------------
// 1. GET /commerce/sales/dashboard/modules
// -------------------------------------------------------------
export interface SalesDashboardModulesParams extends SalesDashboardCommonParams {}

export interface SalesDashboardInventoryModules {
  sections: number;
  categories: number;
  subcategories: number;
  stockValuation: number;
  products: number;
  lowStockItems: number;
  outOfStockItems: number;
}

export interface SalesDashboardSalesHubModules {
  sections: number;
  activeCustomers: number;
  quotations: {
    total: number;
    open: number;
    converted: number;
  };
  salesRepresentatives: {
    active: number;
    assigned: number;
  };
}

export interface SalesDashboardPurchaseModules {
  sections: number;
  suppliers: number;
  purchaseRequests: {
    total: number;
    pending: number;
    approved: number;
  };
  paymentOutSettled: number;
  paymentsOut: number;
}

export interface SalesDashboardSaleReportModules {
  netSales: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
}

export interface SalesDashboardModulesData {
  period?: string;
  from?: string | null;
  to?: string | null;
  inventory: SalesDashboardInventoryModules;
  salesHub: SalesDashboardSalesHubModules;
  purchase: SalesDashboardPurchaseModules;
  saleReport: SalesDashboardSaleReportModules;
}

// -------------------------------------------------------------
// 2. GET /commerce/sales/dashboard/low-stock
// -------------------------------------------------------------
export interface SalesDashboardLowStockParams {
  limit?: number; // 1 to 50
  organization_id?: string;
  sub_organization_id?: string;
  branch_id?: string;
}

export interface SalesDashboardLowStockItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  category: string;
  inStock: number;
  reorderLevel: number;
  shortage: number;
  status: string;
  reorderCost?: number;
}

export interface SalesDashboardLowStockData {
  totalLowStock: number;
  items: SalesDashboardLowStockItem[];
}

// -------------------------------------------------------------
// 3. GET /commerce/sales/dashboard/top-products
// -------------------------------------------------------------
export interface SalesDashboardTopProductsParams extends SalesDashboardCommonParams {
  limit?: number; // 1 to 50
}

export interface SalesDashboardTopProductItem {
  rank: number;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  category: string;
  quantitySold: number;
  invoiceLines: number;
  revenue: number;
  sharePercent: number;
}

export interface SalesDashboardTopProductsData {
  period?: string;
  from?: string | null;
  to?: string | null;
  totalRevenue: number;
  items: SalesDashboardTopProductItem[];
}

// -------------------------------------------------------------
// 4. GET /commerce/sales/dashboard/recent-transactions
// -------------------------------------------------------------
export type RecentTransactionType = 'sales_invoices' | 'purchase_bills' | 'payments_in';

export interface SalesDashboardRecentTransactionsParams extends SalesDashboardCommonParams {
  type?: RecentTransactionType | string;
  limit?: number; // 1 to 50
}

export interface SalesDashboardRecentSalesInvoiceRow {
  id: string;
  invoiceNo: string;
  customerId?: string;
  customerName?: string;
  date: string;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
}

export interface SalesDashboardRecentPurchaseBillRow {
  id: string;
  billNo?: string;
  purchaseNo?: string;
  supplierName?: string;
  date: string;
  grandTotal: number;
  status: string;
}

export interface SalesDashboardRecentPaymentInRow {
  id: string;
  receiptNo?: string;
  invoiceNo?: string;
  customerName?: string;
  date: string;
  paymentType?: string;
  amount: number;
  status: string;
}

export type SalesDashboardRecentTransactionRow =
  | SalesDashboardRecentSalesInvoiceRow
  | SalesDashboardRecentPurchaseBillRow
  | SalesDashboardRecentPaymentInRow;

export interface SalesDashboardRecentTransactionsCounts {
  salesInvoices: number;
  purchaseBills: number;
  paymentsIn: number;
}

export interface SalesDashboardRecentTransactionsData {
  period?: string;
  from?: string | null;
  to?: string | null;
  type: RecentTransactionType | string;
  counts: SalesDashboardRecentTransactionsCounts;
  rows: SalesDashboardRecentTransactionRow[];
}

// -------------------------------------------------------------
// Generic ApiResponse envelope
// -------------------------------------------------------------
export interface SalesDashboardApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}
