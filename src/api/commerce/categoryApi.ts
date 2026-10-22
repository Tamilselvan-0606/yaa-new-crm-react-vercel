import { baseClient, baseApi } from '../baseApi';
import {
  ApiCategory,
  CategoryFilterParams,
  CategoryListResponse,
  CategorySingleResponse,
  CategoryDeleteResponse,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from './categoryTypes';

export * from './categoryTypes';

export interface CategoryItemModel {
  id: string;
  sNo: number;
  categoryName: string;
  code?: string;
  description?: string | null;
  status: 'Active' | 'Inactive';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Maps raw API category to CategoryItem format used by CategoryView
 */
export const mapApiCategoryToCategoryItem = (apiCat: ApiCategory, index?: number): CategoryItemModel => {
  return {
    id: apiCat.id,
    sNo: apiCat.sNo ?? (index !== undefined ? index + 1 : 1),
    categoryName: apiCat.categoryName || apiCat.name || 'Unnamed Category',
    code: apiCat.code,
    description: apiCat.description,
    status: (apiCat.status === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
    createdAt: apiCat.createdAt,
    updatedAt: apiCat.updatedAt,
  };
};

// =========================================================================
// RTK Query Injected Endpoints for Commerce Category
// =========================================================================

export const categoryEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommerceCategories: builder.query<CategoryListResponse, CategoryFilterParams | void>({
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
        }
        return {
          url: '/commerce/categories',
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Category' as const, id })),
              { type: 'Category', id: 'LIST' },
            ]
          : [{ type: 'Category', id: 'LIST' }],
    }),

    getCommerceCategoryById: builder.query<CategorySingleResponse, string>({
      query: (id) => `/commerce/categories/${encodeURIComponent(id)}`,
      providesTags: (_result, _error, id) => [{ type: 'Category', id }],
    }),

    createCommerceCategory: builder.mutation<CategorySingleResponse, CreateCategoryPayload>({
      query: (payload) => ({
        url: '/commerce/categories',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }, { type: 'Product', id: 'LIST' }],
    }),

    updateCommerceCategory: builder.mutation<CategorySingleResponse, { id: string; payload: UpdateCategoryPayload }>({
      query: ({ id, payload }) => ({
        url: `/commerce/categories/${encodeURIComponent(id)}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Category', id },
        { type: 'Category', id: 'LIST' },
        { type: 'Product', id: 'LIST' },
      ],
    }),

    patchCommerceCategory: builder.mutation<CategorySingleResponse, { id: string; payload: Partial<UpdateCategoryPayload> }>({
      query: ({ id, payload }) => ({
        url: `/commerce/categories/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Category', id },
        { type: 'Category', id: 'LIST' },
        { type: 'Product', id: 'LIST' },
      ],
    }),

    deleteCommerceCategory: builder.mutation<CategoryDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/categories/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }, { type: 'Product', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCommerceCategoriesQuery,
  useGetCommerceCategoryByIdQuery,
  useCreateCommerceCategoryMutation,
  useUpdateCommerceCategoryMutation,
  usePatchCommerceCategoryMutation,
  useDeleteCommerceCategoryMutation,
} = categoryEndpoints;

/**
 * Commerce Category API Service
 * Interacts with /commerce/categories endpoints with automatic JWT token & x-organization-id injection.
 */
export const categoryApi = {
  getCategories: async (params?: CategoryFilterParams): Promise<CategoryListResponse> => {
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
    }

    const response = await baseClient.get<CategoryListResponse>('/commerce/categories', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return response.data;
  },

  getCategoryById: async (id: string): Promise<CategorySingleResponse> => {
    const response = await baseClient.get<CategorySingleResponse>(`/commerce/categories/${encodeURIComponent(id)}`);
    return response.data;
  },

  createCategory: async (payload: CreateCategoryPayload): Promise<CategorySingleResponse> => {
    const response = await baseClient.post<CategorySingleResponse>('/commerce/categories', payload);
    return response.data;
  },

  updateCategory: async (id: string, payload: UpdateCategoryPayload): Promise<CategorySingleResponse> => {
    const response = await baseClient.put<CategorySingleResponse>(`/commerce/categories/${encodeURIComponent(id)}`, payload);
    return response.data;
  },

  patchCategory: async (id: string, payload: Partial<UpdateCategoryPayload>): Promise<CategorySingleResponse> => {
    const response = await baseClient.patch<CategorySingleResponse>(`/commerce/categories/${encodeURIComponent(id)}`, payload);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<CategoryDeleteResponse> => {
    const response = await baseClient.delete<CategoryDeleteResponse>(`/commerce/categories/${encodeURIComponent(id)}`);
    return response.data;
  },
};
