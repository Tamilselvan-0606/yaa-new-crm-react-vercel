export interface ApiStockBatch {
  id: string;
  organizationId: string;
  batchNo: string;
  productId: string;
  branchId?: string | null;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  mfgDate?: string | null;
  expDate?: string | null;
  supplierName?: string | null;
  status: 'Active' | 'Inactive' | 'Near Expiry' | 'Expired' | 'Depleted' | string;
  receivedDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  productName?: string;
  sku?: string;
  unit?: string;
}

export interface ApiProduct {
  id: string;
  organizationId: string;
  sNo?: number;
  itemType: 'Product' | 'Service';
  productCode: string;
  productName: string;
  hsnCode?: string | null;
  unit: string;
  baseUnitId?: string;
  secondaryUnitId?: string | null;
  category: string;
  subcategory?: string | null;
  itemImage?: string | null;
  image?: string | null;
  imageBase64?: string | null;

  // Pricing
  salePrice: number;
  salePriceTaxType: 'Excluded' | 'Included';
  discountValue?: number;
  discountType?: 'Percentage' | 'Amount';

  // Wholesale
  hasWholesale?: boolean;
  wholesalePrice?: number;
  wholesaleTaxType?: 'Excluded' | 'Included';
  minWholesaleQty?: number;

  // Purchase & Tax
  purchasePrice?: number;
  purchasePriceTaxType?: 'Excluded' | 'Included';
  taxRate?: string;

  // Stock
  openingStock?: number;
  atPrice?: number;
  asOfDate?: string;
  minStockAlert?: number;
  location?: string | null;

  // Batch Tracking
  isBatchTracking?: boolean;
  is_batch_tracking?: boolean;
  batchNo?: string | null;
  mfgDate?: string | null;
  expDate?: string | null;

  status: 'Active' | 'Inactive';

  // Additional API aliases / fields returned by backend
  categoryId?: string;
  subcategoryId?: string;
  sku?: string;
  name?: string;
  sellingPrice?: number;
  costPrice?: number;
  taxPercent?: number;
  reorderLevel?: number;
  currentStock?: number;
  inStock?: number;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  stockBatches?: ApiStockBatch[];
}

export interface ProductFilterParams {
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  category?: string;
  subcategory?: string;
  itemType?: 'Product' | 'Service' | 'ALL' | string;
}

export interface ProductPagination {
  page: number;
  limit: number;
  page_no: number;
  page_size: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ProductListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiProduct[];
  pagination?: ProductPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface ProductSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiProduct;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface ProductDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CreateProductPayload {
  itemType?: 'Product' | 'Service';
  productCode?: string;
  productName: string;
  hsnCode?: string;
  unit: string;
  baseUnitId?: string;
  secondaryUnitId?: string | null;
  category: string;
  subcategory?: string;
  itemImage?: string | null;
  image?: string;
  imageBase64?: string;
  salePrice: number;
  salePriceTaxType?: 'Excluded' | 'Included';
  discountValue?: number;
  discountType?: 'Percentage' | 'Amount';
  hasWholesale?: boolean;
  wholesalePrice?: number;
  wholesaleTaxType?: 'Excluded' | 'Included';
  minWholesaleQty?: number;
  purchasePrice?: number;
  purchasePriceTaxType?: 'Excluded' | 'Included';
  taxRate?: string;
  openingStock?: number;
  atPrice?: number;
  asOfDate?: string;
  minStockAlert?: number;
  location?: string;
  isBatchTracking?: boolean;
  is_batch_tracking?: boolean;
  batchNo?: string;
  mfgDate?: string;
  expDate?: string;
  status?: 'Active' | 'Inactive';
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export interface BulkProductStatusPayload {
  productIds: string[];
  status: 'Active' | 'Inactive';
}

export interface BulkProductStatusResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: {
    updatedCount: number;
    affectedIds: string[];
  };
  errors?: Array<{
    productId: string;
    reason: string;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

export interface BulkProductCommonRow {
  id: string;
  productName?: string;
  category?: string;
  hsnCode?: string;
}

export interface BulkProductPricingRow {
  id: string;
  productName?: string;
  category?: string;
  purchasePrice?: number;
  purchasePriceTaxType?: 'Excluded' | 'Included';
  salePrice?: number;
  salePriceTaxType?: 'Excluded' | 'Included';
  discountValue?: number;
  discountType?: 'Percentage' | 'Amount';
  taxRate?: string;
}

export interface BulkProductStockRow {
  id: string;
  openingStock?: number;
  atPrice?: number;
  asOfDate?: string;
  minStockAlert?: number;
  location?: string;
}

export interface BulkProductItemInfoRow {
  id: string;
  productCode?: string;
  unit?: string;
  status?: 'Active' | 'Inactive';
}

export interface BulkUpdateProductsPayload {
  common?: BulkProductCommonRow[];
  pricing?: BulkProductPricingRow[];
  stock?: BulkProductStockRow[];
  itemInformation?: BulkProductItemInfoRow[];
  products?: any[];
}

export interface BulkUpdateProductsResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: {
    totalSubmitted: number;
    totalRows: number;
    totalUpdated: number;
    updatedIds: string[];
    products?: any[];
    failed?: Array<{
      id: string;
      productCode?: string;
      rows: Array<{ group: string; index: number }>;
      errors: Array<{
        field: string;
        code: string;
        message: string;
        group?: string;
        index?: number;
      }>;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}
