import { baseClient, baseApi } from '../baseApi';
import {
  ApiSubcategory,
  SubcategoryFilterParams,
  SubcategoryListResponse,
  SubcategorySingleResponse,
  SubcategoryDeleteResponse,
  CreateSubcategoryPayload,
  UpdateSubcategoryPayload,
} from './subcategoryTypes';

export * from './subcategoryTypes';

export interface SubcategoryItemModel {
  id: string;
  sNo: number;
  category: string;
  subcategory: string;
  status: 'Active' | 'Inactive';
  categoryId?: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  productCount?: number;
}

/**
 * Maps raw API subcategory to SubcategoryItem format used by SubcategoryView
 */
export const mapApiSubcategoryToSubcategoryItem = (
  apiSub: ApiSubcategory,
  index?: number
): SubcategoryItemModel => {
  return {
    id: apiSub.id,
    sNo: apiSub.sNo ?? (index !== undefined ? index + 1 : 1),
    category: apiSub.category || apiSub.categoryName || '',
    subcategory: apiSub.subcategory || apiSub.name || '',
    status: (apiSub.status === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive',
    categoryId: apiSub.categoryId,
    description: apiSub.description,
    createdAt: apiSub.createdAt,
    updatedAt: apiSub.updatedAt,
    productCount: apiSub.productCount,
  };
};

// =========================================================================
// RTK Query Injected Endpoints for Commerce Subcategory
// =========================================================================

export const subcategoryEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommerceSubcategories: builder.query<SubcategoryListResponse, SubcategoryFilterParams | void>({
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
        }
        return {
          url: '/commerce/subcategories',
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Subcategory' as const, id })),
              { type: 'Subcategory', id: 'LIST' },
            ]
          : [{ type: 'Subcategory', id: 'LIST' }],
    }),

    getCommerceSubcategoryById: builder.query<SubcategorySingleResponse, string>({
      query: (id) => `/commerce/subcategories/${encodeURIComponent(id)}`,
      providesTags: (_result, _error, id) => [{ type: 'Subcategory', id }],
    }),

    createCommerceSubcategory: builder.mutation<SubcategorySingleResponse, CreateSubcategoryPayload>({
      query: (payload) => ({
        url: '/commerce/subcategories',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Subcategory', id: 'LIST' }, { type: 'Category', id: 'LIST' }, { type: 'Product', id: 'LIST' }],
    }),

    updateCommerceSubcategory: builder.mutation<SubcategorySingleResponse, { id: string; payload: UpdateSubcategoryPayload }>({
      query: ({ id, payload }) => ({
        url: `/commerce/subcategories/${encodeURIComponent(id)}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Subcategory', id },
        { type: 'Subcategory', id: 'LIST' },
        { type: 'Category', id: 'LIST' },
        { type: 'Product', id: 'LIST' },
      ],
    }),

    patchCommerceSubcategory: builder.mutation<SubcategorySingleResponse, { id: string; payload: Partial<UpdateSubcategoryPayload> }>({
      query: ({ id, payload }) => ({
        url: `/commerce/subcategories/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Subcategory', id },
        { type: 'Subcategory', id: 'LIST' },
        { type: 'Product', id: 'LIST' },
      ],
    }),

    deleteCommerceSubcategory: builder.mutation<SubcategoryDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/subcategories/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Subcategory', id: 'LIST' }, { type: 'Category', id: 'LIST' }, { type: 'Product', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCommerceSubcategoriesQuery,
  useGetCommerceSubcategoryByIdQuery,
  useCreateCommerceSubcategoryMutation,
  useUpdateCommerceSubcategoryMutation,
  usePatchCommerceSubcategoryMutation,
  useDeleteCommerceSubcategoryMutation,
} = subcategoryEndpoints;

/**
 * Commerce Subcategory API Service
 * Interacts with /commerce/subcategories endpoints with automatic JWT token & x-organization-id injection.
 */
export const subcategoryApi = {
  getSubcategories: async (params?: SubcategoryFilterParams): Promise<SubcategoryListResponse> => {
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
    }

    const response = await baseClient.get<SubcategoryListResponse>('/commerce/subcategories', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return response.data;
  },

  getSubcategoryById: async (id: string): Promise<SubcategorySingleResponse> => {
    const response = await baseClient.get<SubcategorySingleResponse>(`/commerce/subcategories/${encodeURIComponent(id)}`);
    return response.data;
  },

  createSubcategory: async (payload: CreateSubcategoryPayload): Promise<SubcategorySingleResponse> => {
    const response = await baseClient.post<SubcategorySingleResponse>('/commerce/subcategories', payload);
    return response.data;
  },

  updateSubcategory: async (id: string, payload: UpdateSubcategoryPayload): Promise<SubcategorySingleResponse> => {
    const response = await baseClient.put<SubcategorySingleResponse>(`/commerce/subcategories/${encodeURIComponent(id)}`, payload);
    return response.data;
  },

  patchSubcategory: async (id: string, payload: Partial<UpdateSubcategoryPayload>): Promise<SubcategorySingleResponse> => {
    const response = await baseClient.patch<SubcategorySingleResponse>(`/commerce/subcategories/${encodeURIComponent(id)}`, payload);
    return response.data;
  },

  deleteSubcategory: async (id: string): Promise<SubcategoryDeleteResponse> => {
    const response = await baseClient.delete<SubcategoryDeleteResponse>(`/commerce/subcategories/${encodeURIComponent(id)}`);
    return response.data;
  },
};
