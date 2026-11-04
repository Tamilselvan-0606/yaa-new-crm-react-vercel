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
          if (params.status !== undefined && String(params.status).toUpperCase() !== 'ALL') {
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
      invalidatesTags: [{ type: 'Unit', id: 'LIST' }, { type: 'Product', id: 'LIST' }],
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
        { type: 'Product', id: 'LIST' },
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
        { type: 'Product', id: 'LIST' },
      ],
    }),

    deleteCommerceUnit: builder.mutation<UnitDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/units/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Unit', id: 'LIST' }, { type: 'Product', id: 'LIST' }],
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
      if (params.status !== undefined && String(params.status).toUpperCase() !== 'ALL') {
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
    clearUnitsCache();
    const response = await baseClient.post<UnitSingleResponse>('/commerce/units', payload);
    return response.data;
  },

  updateUnit: async (id: string, payload: UpdateUnitPayload): Promise<UnitSingleResponse> => {
    clearUnitsCache();
    const response = await baseClient.put<UnitSingleResponse>(`/commerce/units/${encodeURIComponent(id)}`, payload);
    return response.data;
  },

  patchUnitStatus: async (id: string, status: 0 | 1): Promise<UnitSingleResponse> => {
    clearUnitsCache();
    const response = await baseClient.patch<UnitSingleResponse>(`/commerce/units/${encodeURIComponent(id)}/status`, {
      status,
    });
    return response.data;
  },

  deleteUnit: async (id: string): Promise<UnitDeleteResponse> => {
    clearUnitsCache();
    const response = await baseClient.delete<UnitDeleteResponse>(`/commerce/units/${encodeURIComponent(id)}`);
    return response.data;
  },
};

// =========================================================================
// In-Memory Unit Cache and Auto-Resolution Helpers
// =========================================================================

let cachedUnits: ApiUnit[] | null = null;
let cachedUnitsPromise: Promise<ApiUnit[]> | null = null;

export const clearUnitsCache = () => {
  cachedUnits = null;
  cachedUnitsPromise = null;
};

export const fetchAllUnitsCached = async (forceRefresh = false): Promise<ApiUnit[]> => {
  if (cachedUnits && cachedUnits.length > 0 && !forceRefresh) return cachedUnits;
  if (cachedUnitsPromise && !forceRefresh) return cachedUnitsPromise;

  cachedUnitsPromise = (async () => {
    try {
      const res = await unitApi.getUnits({ sortOrder: 'asc' });
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.data?.data)
            ? (res as any).data.data
            : [];
      if (list && list.length > 0) {
        cachedUnits = list;
      }
      return cachedUnits || list || [];
    } catch (err) {
      console.warn('Failed to fetch units:', err);
      return cachedUnits || [];
    } finally {
      cachedUnitsPromise = null;
    }
  })();

  return cachedUnitsPromise;
};

export const resolveBaseUnitId = async (
  preferredUnit?: string
): Promise<{ baseUnitId: string; unitCode: string } | null> => {
  let units = await fetchAllUnitsCached();

  // If units list is empty, try forcing refresh once
  if (!units || units.length === 0) {
    units = await fetchAllUnitsCached(true);
  }

  // If still empty, try to create default "Pieces" (PCS) unit in the org
  if (!units || units.length === 0) {
    try {
      const created = await unitApi.createUnit({
        name: 'Pieces',
        shortCode: 'PCS',
        status: 1,
      });
      const createdUnit = created?.data || (created as any)?.id ? (created as any) : null;
      if (createdUnit && createdUnit.id) {
        units = [createdUnit];
        cachedUnits = units;
      }
    } catch (createErr) {
      console.warn('Failed to auto-create default unit:', createErr);
    }
  }

  if (!units || units.length === 0) {
    return null;
  }

  const pref = (preferredUnit || '').trim().toUpperCase();

  // 1. Direct ID match
  if (pref) {
    const byId = units.find((u) => u.id === preferredUnit);
    if (byId) return { baseUnitId: byId.id, unitCode: byId.shortCode || byId.name };
  }

  // 2. ShortCode or Name match
  if (pref) {
    const byCodeOrName = units.find(
      (u) =>
        (u.shortCode && u.shortCode.toUpperCase() === pref) ||
        (u.name && u.name.toUpperCase() === pref)
    );
    if (byCodeOrName) {
      return {
        baseUnitId: byCodeOrName.id,
        unitCode: byCodeOrName.shortCode || byCodeOrName.name,
      };
    }
  }

  // 3. Fallback to "PCS" or "PIECES"
  const pcsMatch = units.find(
    (u) =>
      (u.shortCode && u.shortCode.toUpperCase() === 'PCS') ||
      (u.name && u.name.toUpperCase().includes('PIECE'))
  );
  if (pcsMatch) {
    return {
      baseUnitId: pcsMatch.id,
      unitCode: pcsMatch.shortCode || pcsMatch.name,
    };
  }

  // 4. Fallback to first unit in the list
  const first = units[0];
  return {
    baseUnitId: first.id,
    unitCode: first.shortCode || first.name,
  };
};
