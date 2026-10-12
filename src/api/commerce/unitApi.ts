import { baseClient, baseApi } from '../baseApi';
import {
  ApiUnit,
  UnitFilterParams,
  UnitListResponse,
  UnitSingleResponse,
  UnitDeleteResponse,
  CreateUnitPayload,
  UpdateUnitPayload,
  UpdateUnitStatusPayload,
} from './unitTypes';

export * from './unitTypes';

export interface UnitItemModel {
  id: string;
  sNo: number;
  name: string;
  shortCode: string;
  formattedName: string; // e.g. "DOZEN (Dz)"
  status: 'Active' | 'Inactive';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Maps raw API unit to UnitItem format
 */
export const mapApiUnitToUnitItem = (apiUnit: ApiUnit, index?: number): UnitItemModel => {
  const short = apiUnit.shortCode || '';
  const fullName = apiUnit.name || '';
  const formattedName = short ? `${fullName.toUpperCase()} (${short})` : fullName.toUpperCase();

  return {
    id: apiUnit.id,
    sNo: index !== undefined ? index + 1 : 1,
    name: fullName,
    shortCode: short,
    formattedName,
    status: apiUnit.status === 1 || String(apiUnit.status).toLowerCase() === 'active' ? 'Active' : 'Inactive',
    createdAt: apiUnit.createdAt,
    updatedAt: apiUnit.updatedAt,
  };
};

// =========================================================================
// RTK Query Injected Endpoints for Commerce Unit
// =========================================================================

export const unitEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommerceUnits: builder.query<UnitListResponse, UnitFilterParams | void>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params) {
          if (params.page_no !== undefined) queryParams.page_no = params.page_no;
          if (params.page_size !== undefined) queryParams.page_size = params.page_size;
          if (params.search && params.search.trim()) {
            queryParams.search = params.search.trim();
          }
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
          if (params.sortBy) queryParams.sortBy = params.sortBy;
          if (params.status !== undefined && params.status !== 'ALL') {
            queryParams.status = params.status;
          }
        }
        return {
          url: '/commerce/units',
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Unit' as const, id })),
              { type: 'Unit', id: 'LIST' },
            ]
          : [{ type: 'Unit', id: 'LIST' }],
    }),

    getCommerceUnitById: builder.query<UnitSingleResponse, string>({
      query: (id) => `/commerce/units/${encodeURIComponent(id)}`,
      providesTags: (_result, _error, id) => [{ type: 'Unit', id }],
    }),

    createCommerceUnit: builder.mutation<UnitSingleResponse, CreateUnitPayload>({
      query: (payload) => ({
        url: '/commerce/units',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Unit', id: 'LIST' }],
    }),

    updateCommerceUnit: builder.mutation<UnitSingleResponse, { id: string; payload: UpdateUnitPayload }>({
      query: ({ id, payload }) => ({
        url: `/commerce/units/${encodeURIComponent(id)}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Unit', id },
        { type: 'Unit', id: 'LIST' },
      ],
    }),

    patchCommerceUnitStatus: builder.mutation<UnitSingleResponse, { id: string; payload: UpdateUnitStatusPayload }>({
      query: ({ id, payload }) => ({
        url: `/commerce/units/${encodeURIComponent(id)}/status`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Unit', id },
        { type: 'Unit', id: 'LIST' },
      ],
    }),

    deleteCommerceUnit: builder.mutation<UnitDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/units/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Unit', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCommerceUnitsQuery,
  useGetCommerceUnitByIdQuery,
  useCreateCommerceUnitMutation,
  useUpdateCommerceUnitMutation,
  usePatchCommerceUnitStatusMutation,
  useDeleteCommerceUnitMutation,
} = unitEndpoints;

/**
 * Commerce Unit API Service
 * Interacts with /commerce/units endpoints with automatic JWT token & x-organization-id injection.
 */
export const unitApi = {
  getUnits: async (params?: UnitFilterParams): Promise<UnitListResponse> => {
    const queryParams: Record<string, any> = {};

    if (params) {
      if (params.page_no !== undefined) queryParams.page_no = params.page_no;
      if (params.page_size !== undefined) queryParams.page_size = params.page_size;
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.status !== undefined && params.status !== 'ALL') {
        queryParams.status = params.status;
      }
    }

    const response = await baseClient.get<UnitListResponse>('/commerce/units', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return response.data;
  },

  getUnitById: async (id: string): Promise<UnitSingleResponse> => {
    const response = await baseClient.get<UnitSingleResponse>(`/commerce/units/${encodeURIComponent(id)}`);
    return response.data;
  },

  createUnit: async (payload: CreateUnitPayload): Promise<UnitSingleResponse> => {
    const response = await baseClient.post<UnitSingleResponse>('/commerce/units', payload);
    return response.data;
  },

  updateUnit: async (id: string, payload: UpdateUnitPayload): Promise<UnitSingleResponse> => {
    const response = await baseClient.put<UnitSingleResponse>(`/commerce/units/${encodeURIComponent(id)}`, payload);
    return response.data;
  },

  patchUnitStatus: async (id: string, status: 0 | 1): Promise<UnitSingleResponse> => {
    const response = await baseClient.patch<UnitSingleResponse>(`/commerce/units/${encodeURIComponent(id)}/status`, {
      status,
    });
    return response.data;
  },

  deleteUnit: async (id: string): Promise<UnitDeleteResponse> => {
    const response = await baseClient.delete<UnitDeleteResponse>(`/commerce/units/${encodeURIComponent(id)}`);
    return response.data;
  },
};
