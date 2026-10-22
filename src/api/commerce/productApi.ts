import { baseClient, baseApi } from '../baseApi';
import {
  ApiProduct,
  ProductFilterParams,
  ProductListResponse,
  ProductSingleResponse,
  ProductDeleteResponse,
  CreateProductPayload,
  UpdateProductPayload,
  BulkProductStatusPayload,
  BulkProductStatusResponse,
  BulkUpdateProductsPayload,
  BulkUpdateProductsResponse,
} from './productTypes';

export * from './productTypes';

export interface ProductItemModel {
  id: string;
  sNo: number;
  itemType: 'Product' | 'Service';
  productCode: string;
  productName: string;
  hsnCode: string;
  unit: string;
  category: string;
  subcategory?: string;
  itemImage?: string;
  image?: string;
  imageBase64?: string;

  // Pricing
  salePrice: number;
  salePriceTaxType: 'Excluded' | 'Included';
  discountValue: number;
  discountType: 'Percentage' | 'Amount';

  // Wholesale
  hasWholesale: boolean;
  wholesalePrice: number;
  wholesaleTaxType: 'Excluded' | 'Included';
  minWholesaleQty: number;

  // Purchase & Tax
  purchasePrice: number;
  purchasePriceTaxType: 'Excluded' | 'Included';
  taxRate: string;

  // Stock
  openingStock: number;
  currentStock?: number;
  inStock?: number;
  atPrice: number;
  asOfDate: string;
  minStockAlert: number;
  location?: string;

  // Batch Tracking
  isBatchTracking?: boolean;
  batchNo?: string;
  mfgDate?: string;
  expDate?: string;

  status: 'Active' | 'Inactive';

  // Units
  baseUnitId?: string;
  secondaryUnitId?: string | null;

  // Metadata
  createdAt?: string;
  updatedAt?: string;
  categoryId?: string;
  subcategoryId?: string;
}

/**
 * Maps raw API product to ProductItem format used by InventoryProductsView
 */
export const cleanProductImage = (img?: string | null): string | undefined => {
  if (!img || typeof img !== 'string') return undefined;
  const trimmed = img.trim();
  if (
    trimmed === '' ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed === '[object Object]' ||
    trimmed === 'None' ||
    trimmed === 'none'
  ) {
    return undefined;
  }
  return trimmed;
};

export const mapApiProductToProductItem = (
  apiProd: ApiProduct,
  index?: number
): ProductItemModel => {
  const rawBase64 = cleanProductImage(apiProd.imageBase64);
  const rawImage =
    cleanProductImage(apiProd.itemImage) ||
    cleanProductImage(apiProd.image) ||
    cleanProductImage((apiProd as any).imageUrl) ||
    cleanProductImage((apiProd as any).productImage) ||
    cleanProductImage((apiProd as any).photo) ||
    cleanProductImage((apiProd as any).thumbnail);

  const effectiveImage = rawImage || rawBase64;
  return {
    id: apiProd.id,
    sNo: apiProd.sNo ?? (index !== undefined ? index + 1 : 1),
    itemType: apiProd.itemType || 'Product',
    productCode: apiProd.productCode || apiProd.sku || '',
    productName: apiProd.productName || apiProd.name || '',
    hsnCode: apiProd.hsnCode || '',
    unit: apiProd.unit || 'PCS',
    baseUnitId: apiProd.baseUnitId || undefined,
    secondaryUnitId: apiProd.secondaryUnitId || undefined,
    category:
      (typeof apiProd.category === 'string' && apiProd.category) ||
      (apiProd.category as any)?.name ||
      (apiProd as any).categoryName ||
      'General',
    subcategory:
      (typeof apiProd.subcategory === 'string' && apiProd.subcategory) ||
      (apiProd.subcategory as any)?.name ||
      (apiProd as any).subcategoryName ||
      (apiProd as any).subCategory ||
      undefined,
    itemImage: effectiveImage,
    image: effectiveImage,
    imageBase64: rawBase64 || effectiveImage,

    // Pricing
    salePrice: apiProd.salePrice ?? apiProd.sellingPrice ?? 0,
    salePriceTaxType: apiProd.salePriceTaxType || 'Excluded',
    discountValue: apiProd.discountValue ?? 0,
    discountType: apiProd.discountType || 'Percentage',

    // Wholesale
    hasWholesale: apiProd.hasWholesale ?? false,
    wholesalePrice: apiProd.wholesalePrice ?? 0,
    wholesaleTaxType: apiProd.wholesaleTaxType || 'Excluded',
    minWholesaleQty: apiProd.minWholesaleQty ?? 0,

    // Purchase & Tax
    purchasePrice: apiProd.purchasePrice ?? apiProd.costPrice ?? 0,
    purchasePriceTaxType: apiProd.purchasePriceTaxType || 'Excluded',
    taxRate: apiProd.taxRate || (apiProd.taxPercent ? `GST @ ${apiProd.taxPercent}%` : 'None'),

    // Stock
    openingStock: Number(apiProd.openingStock ?? 0),
    currentStock: typeof apiProd.currentStock === 'number' ? apiProd.currentStock : (typeof apiProd.inStock === 'number' ? apiProd.inStock : undefined),
    inStock: typeof apiProd.inStock === 'number' ? apiProd.inStock : (typeof apiProd.currentStock === 'number' ? apiProd.currentStock : undefined),
    atPrice: apiProd.atPrice ?? apiProd.purchasePrice ?? 0,
    asOfDate:
      apiProd.asOfDate ||
      (apiProd.createdAt ? apiProd.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
    minStockAlert: apiProd.minStockAlert ?? apiProd.reorderLevel ?? 0,
    location: apiProd.location || undefined,

    // Batch Tracking
    isBatchTracking: Boolean(apiProd.isBatchTracking ?? apiProd.is_batch_tracking ?? false),
    batchNo: apiProd.batchNo || undefined,
    mfgDate: apiProd.mfgDate || undefined,
    expDate: apiProd.expDate || undefined,

    status: (apiProd.status === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
    createdAt: apiProd.createdAt,
    updatedAt: apiProd.updatedAt,
    categoryId: apiProd.categoryId,
    subcategoryId: apiProd.subcategoryId,
  };
};

/**
 * Maps form data from InventoryProductsView into API creation/update payload
 */
export const mapProductItemToPayload = (item: Partial<ProductItemModel>): CreateProductPayload => {
  const base64Img = item.itemImage || item.image || item.imageBase64 || undefined;
  return {
    itemType: item.itemType || 'Product',
    productCode: item.productCode,
    productName: item.productName || '',
    hsnCode: item.hsnCode || undefined,
    unit: item.unit || 'PCS',
    category: item.category || 'General',
    subcategory: item.subcategory || undefined,
    itemImage: base64Img,
    image: base64Img,
    imageBase64: base64Img,

    salePrice: Number(item.salePrice) || 0,
    salePriceTaxType: item.salePriceTaxType || 'Excluded',
    discountValue: Number(item.discountValue) || 0,
    discountType: item.discountType || 'Percentage',

    hasWholesale: Boolean(item.hasWholesale),
    wholesalePrice: Number(item.wholesalePrice) || 0,
    wholesaleTaxType: item.wholesaleTaxType || 'Excluded',
    minWholesaleQty: Number(item.minWholesaleQty) || 0,

    purchasePrice: Number(item.purchasePrice) || 0,
    purchasePriceTaxType: item.purchasePriceTaxType || 'Excluded',
    taxRate: item.taxRate || 'None',

    openingStock: Number(item.openingStock) || 0,
    atPrice: Number(item.atPrice) || Number(item.purchasePrice) || 0,
    asOfDate: item.asOfDate || new Date().toISOString().split('T')[0],
    minStockAlert: Number(item.minStockAlert) || 0,
    location: item.location || undefined,

    // Batch Tracking
    isBatchTracking: Boolean(item.isBatchTracking),
    is_batch_tracking: Boolean(item.isBatchTracking),
    batchNo: item.batchNo || undefined,
    mfgDate: item.mfgDate || undefined,
    expDate: item.expDate || undefined,

    status: (item.status === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
  };
};

// =========================================================================
// RTK Query Injected Endpoints for Commerce Product
// =========================================================================

export const productEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommerceProducts: builder.query<ProductListResponse, ProductFilterParams | void>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params) {
          if (params.page_no !== undefined) queryParams.page_no = params.page_no;
          if (params.page_size !== undefined) queryParams.page_size = params.page_size;
          if (params.pagination_required !== undefined) {
            queryParams.pagination_required = String(params.pagination_required);
          }
          if (params.search && params.search.trim()) {
            queryParams.search = params.search.trim();
          }
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
          if (params.status && params.status.toUpperCase() !== 'ALL') {
            queryParams.status = params.status;
          }
          if (params.category && params.category.toUpperCase() !== 'ALL') {
            queryParams.category = params.category;
          }
          if (params.subcategory && params.subcategory.toUpperCase() !== 'ALL') {
            queryParams.subcategory = params.subcategory;
          }
          if (params.itemType && params.itemType.toUpperCase() !== 'ALL') {
            queryParams.itemType = params.itemType;
          }
        }
        return {
          url: '/commerce/products',
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Product' as const, id })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
    }),

    getCommerceProductById: builder.query<ProductSingleResponse, string>({
      query: (id) => `/commerce/products/${encodeURIComponent(id)}`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),

    createCommerceProduct: builder.mutation<ProductSingleResponse, CreateProductPayload>({
      query: (payload) => ({
        url: '/commerce/products',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }, { type: 'Stock', id: 'LIST' }],
    }),

    updateCommerceProduct: builder.mutation<ProductSingleResponse, { id: string; payload: UpdateProductPayload }>({
      query: ({ id, payload }) => ({
        url: `/commerce/products/${encodeURIComponent(id)}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
      ],
    }),

    patchCommerceProduct: builder.mutation<ProductSingleResponse, { id: string; payload: Partial<UpdateProductPayload> }>({
      query: ({ id, payload }) => ({
        url: `/commerce/products/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
      ],
    }),

    deleteCommerceProduct: builder.mutation<ProductDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/products/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }, { type: 'Stock', id: 'LIST' }],
    }),

    bulkUpdateProductStatus: builder.mutation<BulkProductStatusResponse, BulkProductStatusPayload>({
      query: (payload) => ({
        url: '/commerce/products/bulk-status',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),

    bulkUpdateProducts: builder.mutation<BulkUpdateProductsResponse, BulkUpdateProductsPayload>({
      query: (payload) => ({
        url: '/commerce/products/bulk',
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }, { type: 'Stock', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCommerceProductsQuery,
  useGetCommerceProductByIdQuery,
  useCreateCommerceProductMutation,
  useUpdateCommerceProductMutation,
  usePatchCommerceProductMutation,
  useDeleteCommerceProductMutation,
  useBulkUpdateProductStatusMutation,
  useBulkUpdateProductsMutation,
} = productEndpoints;

/**
 * Commerce Product API Service
 * Interacts with /commerce/products endpoints with automatic JWT token & x-organization-id injection.
 */
export const productApi = {
  /**
   * List products with pagination, sorting, search, category, subcategory, itemType, and status filter
   * GET /commerce/products
   */
  getProducts: async (params?: ProductFilterParams): Promise<ProductListResponse> => {
    const queryParams: Record<string, any> = {};

    if (params) {
      if (params.page_no !== undefined) queryParams.page_no = params.page_no;
      if (params.page_size !== undefined) queryParams.page_size = params.page_size;
      if (params.pagination_required !== undefined) {
        queryParams.pagination_required = String(params.pagination_required);
      }
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params.status && params.status.toUpperCase() !== 'ALL') {
        queryParams.status = params.status;
      }
      if (params.category && params.category.toUpperCase() !== 'ALL') {
        queryParams.category = params.category;
      }
      if (params.subcategory && params.subcategory.toUpperCase() !== 'ALL') {
        queryParams.subcategory = params.subcategory;
      }
      if (params.itemType && params.itemType.toUpperCase() !== 'ALL') {
        queryParams.itemType = params.itemType;
      }
    }

    const response = await baseClient.get<ProductListResponse>('/commerce/products', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return response.data;
  },

  /**
   * Get single product details (including stock batches)
   * GET /commerce/products/:id
   */
  getProductById: async (id: string): Promise<ProductSingleResponse> => {
    const response = await baseClient.get<ProductSingleResponse>(
      `/commerce/products/${encodeURIComponent(id)}`
    );
    return response.data;
  },

  /**
   * Create a new product
   * POST /commerce/products
   */
  createProduct: async (payload: CreateProductPayload): Promise<ProductSingleResponse> => {
    const response = await baseClient.post<ProductSingleResponse>('/commerce/products', payload);
    return response.data;
  },

  /**
   * Update full/partial product record
   * PUT /commerce/products/:id
   */
  updateProduct: async (
    id: string,
    payload: UpdateProductPayload
  ): Promise<ProductSingleResponse> => {
    const response = await baseClient.put<ProductSingleResponse>(
      `/commerce/products/${encodeURIComponent(id)}`,
      payload
    );
    return response.data;
  },

  /**
   * Partially update product record (e.g. status toggle)
   * PATCH /commerce/products/:id
   */
  patchProduct: async (
    id: string,
    payload: Partial<UpdateProductPayload>
  ): Promise<ProductSingleResponse> => {
    const response = await baseClient.patch<ProductSingleResponse>(
      `/commerce/products/${encodeURIComponent(id)}`,
      payload
    );
    return response.data;
  },

  /**
   * Soft-delete product
   * DELETE /commerce/products/:id
   */
  deleteProduct: async (id: string): Promise<ProductDeleteResponse> => {
    const response = await baseClient.delete<ProductDeleteResponse>(
      `/commerce/products/${encodeURIComponent(id)}`
    );
    return response.data;
  },

  /**
   * Bulk update status of multiple products
   * PATCH /commerce/products/bulk-status
   */
  bulkUpdateProductStatus: async (
    payload: BulkProductStatusPayload
  ): Promise<BulkProductStatusResponse> => {
    const response = await baseClient.patch<BulkProductStatusResponse>(
      '/commerce/products/bulk-status',
      payload
    );
    return response.data;
  },

  /**
   * Bulk update items (grid editor)
   * PUT /commerce/products/bulk
   */
  bulkUpdateProducts: async (
    payload: BulkUpdateProductsPayload
  ): Promise<BulkUpdateProductsResponse> => {
    const response = await baseClient.put<BulkUpdateProductsResponse>(
      '/commerce/products/bulk',
      payload
    );
    return response.data;
  },
};
