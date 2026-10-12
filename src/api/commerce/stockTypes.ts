import { ApiStockBatch } from './productTypes';


export interface ApiStockItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  subcategory?: string;
  unit: string;
  inStock: number;
  reorderLevel: number;
  unitCost: number;
  unitPrice: number;
  stockValue?: number;
  isLowStock?: boolean;
  location?: string | null;
  lastUpdated?: string;
  batches?: ApiStockBatch[];
  shortage?: number;
  outOfStock?: boolean;
}

export interface StockPagination {
  page: number;
  limit: number;
  page_no: number;
  page_size: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface StockFilterParams {
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  productId?: string;
  category?: string;
  subcategory?: string;
  branchId?: string;
  lowStock?: boolean | string;
}

export interface StockListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiStockItem[];
  pagination?: StockPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export type AdjustmentType =
  | 'INWARD'
  | 'OUTWARD'
  | 'DAMAGED'
  | 'CORRECTION'
  | 'SALE'
  | 'SALE_REVERSAL'
  | 'RETURN'
  | 'RETURN_REVERSAL'
  | string;

export interface AdjustStockPayload {
  productId: string;
  branchId?: string | null;
  batchNo?: string;
  adjustmentType: AdjustmentType;
  quantity: number; // positive for INWARD, negative for OUTWARD / DAMAGED
  reason: string;
  adjustedBy?: string;
  costPrice?: number;
  sellingPrice?: number;
  mfgDate?: string;
  expDate?: string;
  supplierName?: string;
}

export interface ApiStockMovement {
  id: string;
  organizationId?: string;
  productId: string;
  productName?: string;
  sku?: string;
  unit?: string;
  branchId?: string | null;
  batchId?: string | null;
  batchNo?: string | null;
  movementType: AdjustmentType;
  quantity: number;
  inward: number;
  outward: number;
  balanceAfter?: number;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceNo?: string | null;
  reason?: string | null;
  createdBy?: string;
  date: string;
  createdAt?: string;
}

export interface AdjustStockResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    stock: ApiStockItem;
    movements?: ApiStockMovement[];
    adjustedBy?: string;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface StockLedgerParams {
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  productId?: string;
  batchNo?: string;
  branchId?: string;
  movementType?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  period?:
    | 'today'
    | 'this_week'
    | 'this_month'
    | 'last_month'
    | 'this_quarter'
    | 'this_year'
    | 'all'
    | string;
}

export interface StockLedgerResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiStockMovement[];
  pagination?: StockPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface StockBatchesParams {
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  productId?: string;
  branchId?: string;
  status?: 'Active' | 'Near Expiry' | 'Expired' | 'Depleted' | 'ALL' | string;
  expiringWithinDays?: number;
}

export interface StockBatchesResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiStockBatch[];
  pagination?: StockPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface LowStockParams {
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean;
  search?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LowStockResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiStockItem[];
  pagination?: StockPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
