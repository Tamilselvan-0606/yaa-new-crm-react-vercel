import { baseClient, baseApi } from '../baseApi';
import { getStoredOrganizationId } from '../config';
import {
  BranchListResponse,
  BranchSingleResponse,
  BranchListParams,
  CreateBranchRequest,
  UpdateBranchRequest,
} from './branchTypes';

export * from './branchTypes';

export const branchEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformBranches: builder.query<
      BranchListResponse,
      { params?: BranchListParams; orgId?: string } | void
    >({
      query: (arg) => {
        const payload = arg && typeof arg === 'object' ? arg : undefined;
        const p = payload?.params || {};
        const queryParams: Record<string, any> = {
          page_no: p.page_no ?? 1,
          page_size: p.page_size ?? 10,
          pagination_required: p.pagination_required ?? 'true',
        };
        if (p.search) queryParams.search = p.search;
        if (p.status && p.status !== 'ALL') queryParams.status = p.status;
        if (p.organization_id) queryParams.organization_id = p.organization_id;
        if (p.sub_organization_id) queryParams.sub_organization_id = p.sub_organization_id;
        if (p.branch_id) queryParams.branch_id = p.branch_id;

        return {
          url: '/branches',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Branch' as const, id })),
              { type: 'Branch', id: 'LIST' },
            ]
          : [{ type: 'Branch', id: 'LIST' }],
    }),

    createPlatformBranch: builder.mutation<BranchSingleResponse, CreateBranchRequest>({
      query: (payload) => ({
        url: '/branches',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Branch', id: 'LIST' }],
    }),

    updatePlatformBranch: builder.mutation<
      BranchSingleResponse,
      { id: string; payload: UpdateBranchRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/branches/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Branch', id },
        { type: 'Branch', id: 'LIST' },
      ],
    }),

    updatePlatformBranchStatus: builder.mutation<
      BranchSingleResponse,
      { id: string; status: 'Active' | 'Inactive' | 'Suspended' }
    >({
      query: ({ id, status }) => ({
        url: `/branches/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Branch', id },
        { type: 'Branch', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPlatformBranchesQuery,
  useCreatePlatformBranchMutation,
  useUpdatePlatformBranchMutation,
  useUpdatePlatformBranchStatusMutation,
} = branchEndpoints;

const inFlightBranchRequests = new Map<string, Promise<BranchListResponse>>();

export const branchApi = {
  /**
   * List branches
   * GET /branches?page_no=1&page_size=10&pagination_required=true&search=...
   * Header: x-organization-id is automatically injected by baseClient interceptor
   */
  getBranches: async (
    params?: BranchListParams,
    orgId?: string
  ): Promise<BranchListResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const queryParams: Record<string, any> = {
      page_no: params?.page_no ?? 1,
      page_size: params?.page_size ?? 10,
      pagination_required: params?.pagination_required ?? 'true',
    };
    if (params?.search) queryParams.search = params.search;
    if (params?.status && params.status !== 'ALL') queryParams.status = params.status;
    if (params?.organization_id || activeOrgId) {
      queryParams.organization_id = params?.organization_id || activeOrgId;
    }
    const subId = params?.sub_organization_id || (params as any)?.subOrganizationId;
    if (subId) queryParams.sub_organization_id = subId;
    const bId = params?.branch_id || (params as any)?.branchId;
    if (bId) queryParams.branch_id = bId;

    const cacheKey = JSON.stringify({ queryParams, activeOrgId });
    if (inFlightBranchRequests.has(cacheKey)) {
      return inFlightBranchRequests.get(cacheKey)!;
    }

    const urls = [
      '/branches',
      '/platform/branches',
    ];

    const requestPromise = (async () => {
      let lastError: any = null;
      for (const url of urls) {
        try {
          const res = await baseClient.get<BranchListResponse>(url, {
            params: queryParams,
          });
          return res.data;
        } catch (err: any) {
          lastError = err;
          if (err?.response?.status === 404) {
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    })().finally(() => {
      inFlightBranchRequests.delete(cacheKey);
    });

    inFlightBranchRequests.set(cacheKey, requestPromise);
    return requestPromise;
  },

  /**
   * Create branch
   * POST /branches
   */
  createBranch: async (payload: CreateBranchRequest): Promise<BranchSingleResponse> => {
    const urls = ['/branches', '/platform/branches'];
    let lastError: any = null;
    for (const url of urls) {
      try {
        const res = await baseClient.post<BranchSingleResponse>(url, payload);
        return res.data;
      } catch (err: any) {
        lastError = err;
        if (err?.response?.status === 404) {
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  },

  /**
   * Update branch
   * PUT /branches/{id} or PATCH /branches/{id}
   */
  updateBranch: async (
    id: string,
    payload: UpdateBranchRequest,
    orgId?: string
  ): Promise<BranchSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const endpoints = [
      { method: 'put', url: `/branches/${encodeURIComponent(id)}` },
      { method: 'patch', url: `/branches/${encodeURIComponent(id)}` },
      { method: 'put', url: `/platform/branches/${encodeURIComponent(id)}` },
      { method: 'patch', url: `/platform/branches/${encodeURIComponent(id)}` },
    ];
    let lastError: any = null;
    for (const ep of endpoints) {
      try {
        const res = ep.method === 'put'
          ? await baseClient.put<BranchSingleResponse>(ep.url, payload, { headers })
          : await baseClient.patch<BranchSingleResponse>(ep.url, payload, { headers });
        return res.data;
      } catch (err: any) {
        lastError = err;
        if (err?.response?.status === 404 || err?.response?.status === 405) {
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  },

  /**
   * Update branch status
   * PATCH /branches/{id}/status
   */
  updateBranchStatus: async (
    id: string,
    status: 'Active' | 'Inactive' | 'Suspended' | string,
    orgId?: string
  ): Promise<BranchSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const urls = [
      `/branches/${encodeURIComponent(id)}/status`,
      `/platform/branches/${encodeURIComponent(id)}/status`,
    ];
    let lastError: any = null;
    for (const url of urls) {
      try {
        const res = await baseClient.patch<BranchSingleResponse>(url, { status }, { headers });
        return res.data;
      } catch (err: any) {
        lastError = err;
        if (err?.response?.status === 404) {
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  },

  /**
   * Delete branch (soft delete)
   * DELETE /branches/{id}
   */
  deleteBranch: async (
    id: string,
    orgId?: string
  ): Promise<{ success: boolean; statusCode?: number; message?: string; data: null | string }> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const urls = [
      `/branches/${encodeURIComponent(id)}`,
      `/platform/branches/${encodeURIComponent(id)}`,
    ];
    let lastError: any = null;
    for (const url of urls) {
      try {
        const res = await baseClient.delete(url, { headers });
        return res.data;
      } catch (err: any) {
        lastError = err;
        if (err?.response?.status === 404) {
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  },
};
