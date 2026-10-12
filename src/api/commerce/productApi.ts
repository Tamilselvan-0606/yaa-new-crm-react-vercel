import { baseClient, baseApi } from '../baseApi';
import {
  ApiProduct,
  ProductFilterParams,
  ProductListResponse,
  ProductSingleResponse,
  ProductDeleteResponse,
  CreateProductPayload,
  UpdateProductPayload,
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
  atPrice: number;
  asOfDate: string;
  minStockAlert: number;
  location?: string;

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
export const mapApiProductToProductItem = (
  apiProd: ApiProduct,
  index?: number
): ProductItemModel => {
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
    category: apiProd.category || 'General',
    subcategory: apiProd.subcategory || undefined,
    itemImage: apiProd.itemImage || undefined,

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
    openingStock: apiProd.openingStock ?? apiProd.currentStock ?? apiProd.inStock ?? 0,
    atPrice: apiProd.atPrice ?? apiProd.purchasePrice ?? 0,
    asOfDate:
      apiProd.asOfDate ||
      (apiProd.createdAt ? apiProd.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
    minStockAlert: apiProd.minStockAlert ?? apiProd.reorderLevel ?? 0,
    location: apiProd.location || undefined,

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
  return {
    itemType: item.itemType || 'Product',
    productCode: item.productCode,
    productName: item.productName || '',
    hsnCode: item.hsnCode || undefined,
    unit: item.unit || 'PCS',
    category: item.category || 'General',
    subcategory: item.subcategory || undefined,
    itemImage: item.itemImage || undefined,

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
          if (params.status && params.status !== 'ALL') {
            queryParams.status = params.status;
          }
          if (params.category && params.category !== 'ALL') {
            queryParams.category = params.category;
          }
          if (params.subcategory && params.subcategory !== 'ALL') {
            queryParams.subcategory = params.subcategory;
          }
          if (params.itemType && params.itemType !== 'ALL') {
            queryParams.itemType = params.itemType;
          }
        }
        return {
          url: '/commerce/products',
          params: queryParams,
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
      ],
    }),

    deleteCommerceProduct: builder.mutation<ProductDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/products/${encodeURIComponent(id)}`,
        method: 'DELETE',
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
      if (params.status && params.status !== 'ALL') {
        queryParams.status = params.status;
      }
      if (params.category && params.category !== 'ALL') {
        queryParams.category = params.category;
      }
      if (params.subcategory && params.subcategory !== 'ALL') {
        queryParams.subcategory = params.subcategory;
      }
      if (params.itemType && params.itemType !== 'ALL') {
        queryParams.itemType = params.itemType;
      }
    }

    const response = await baseClient.get<ProductListResponse>('/commerce/products', {
      params: queryParams,
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
};
