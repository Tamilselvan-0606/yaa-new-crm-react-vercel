import { baseClient, baseApi } from '../baseApi';
import { getStoredOrganizationId } from '../config';
import {
  SubOrganizationListResponse,
  SubOrganizationSingleResponse,
  SubOrganizationListParams,
  CreateSubOrganizationRequest,
  UpdateSubOrganizationRequest,
  UpdateSubOrganizationStatusRequest,
} from './subOrganizationTypes';

export * from './subOrganizationTypes';

export const subOrganizationEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubOrganizations: builder.query<
      SubOrganizationListResponse,
      { parentOrgId?: string; params?: SubOrganizationListParams } | void
    >({
      query: (arg) => {
        const payload = arg && typeof arg === 'object' ? arg : undefined;
        const p = payload?.params || {};
        const orgId = p.organization_id || payload?.parentOrgId || getStoredOrganizationId();

        return {
          url: '/platform/sub-organizations',
          headers: orgId ? { 'x-organization-id': orgId } : undefined,
          params: {
            ...(orgId ? { organization_id: orgId } : {}),
            page_no: p.page_no ?? 1,
            page_size: p.page_size ?? 10,
            pagination_required: p.pagination_required ?? 'true',
            search: p.search || undefined,
            status: p.status && p.status !== 'All' ? p.status : undefined,
          },
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Organization' as const, id })),
              { type: 'Organization', id: 'SUB_ORG_LIST' },
            ]
          : [{ type: 'Organization', id: 'SUB_ORG_LIST' }],
    }),

    createSubOrganization: builder.mutation<
      SubOrganizationSingleResponse,
      { parentOrgId?: string; payload: CreateSubOrganizationRequest }
    >({
      query: ({ parentOrgId, payload }) => {
        const targetOrgId = parentOrgId || getStoredOrganizationId();
        const { organization_id, organizationId, subscriptionPlan, ...cleanPayload } = payload as any;
        return {
          url: '/platform/sub-organizations',
          method: 'POST',
          headers: targetOrgId ? { 'x-organization-id': targetOrgId } : undefined,
          params: targetOrgId ? { organization_id: targetOrgId } : undefined,
          body: cleanPayload,
        };
      },
      invalidatesTags: [
        { type: 'Organization', id: 'SUB_ORG_LIST' },
        { type: 'Organization', id: 'LIST' },
      ],
    }),

    updateSubOrganization: builder.mutation<
      SubOrganizationSingleResponse,
      { id: string; payload: UpdateSubOrganizationRequest; parentOrgId?: string }
    >({
      query: ({ id, payload, parentOrgId }) => {
        const targetOrgId = parentOrgId || getStoredOrganizationId();
        return {
          url: `/platform/sub-organizations/${id}`,
          method: 'PATCH',
          headers: targetOrgId ? { 'x-organization-id': targetOrgId } : undefined,
          params: targetOrgId ? { organization_id: targetOrgId } : undefined,
          body: payload,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Organization', id },
        { type: 'Organization', id: 'SUB_ORG_LIST' },
        { type: 'Organization', id: 'LIST' },
      ],
    }),

    updateSubOrganizationStatus: builder.mutation<
      SubOrganizationSingleResponse,
      { id: string; status: 'Active' | 'Inactive' | 'Suspended' | 'Suspend' | 'Pending'; parentOrgId?: string }
    >({
      query: ({ id, status, parentOrgId }) => {
        const apiStatus = status === 'Suspend' ? 'Suspended' : status;
        const targetOrgId = parentOrgId || getStoredOrganizationId();
        return {
          url: `/platform/sub-organizations/${id}/status`,
          method: 'PATCH',
          headers: targetOrgId ? { 'x-organization-id': targetOrgId } : undefined,
          params: targetOrgId ? { organization_id: targetOrgId } : undefined,
          body: { status: apiStatus },
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Organization', id },
        { type: 'Organization', id: 'SUB_ORG_LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSubOrganizationsQuery,
  useCreateSubOrganizationMutation,
  useUpdateSubOrganizationMutation,
  useUpdateSubOrganizationStatusMutation,
} = subOrganizationEndpoints;

const inFlightSubOrgRequests = new Map<string, Promise<SubOrganizationListResponse>>();

export const subOrganizationApi = {
  /**
   * List sub-organizations
   * Supports /platform/sub-organizations?organization_id={id} and fallback /organizations/{id}/sub-organizations
   */
  getSubOrganizations: async (
    params?: SubOrganizationListParams,
    parentOrgId?: string
  ): Promise<SubOrganizationListResponse> => {
    const orgId = params?.organization_id || parentOrgId || getStoredOrganizationId();
    const queryParams: Record<string, any> = {
      ...(orgId ? { organization_id: orgId } : {}),
      page_no: params?.page_no ?? 1,
      page_size: params?.page_size ?? 10,
      pagination_required: params?.pagination_required ?? 'true',
    };
    if (params?.search) queryParams.search = params.search;
    if (params?.status && params.status !== 'All') queryParams.status = params.status;

    const headers: Record<string, string> = {};
    if (orgId) {
      headers['x-organization-id'] = orgId;
    }

    const cacheKey = JSON.stringify({ queryParams, headers });
    if (inFlightSubOrgRequests.has(cacheKey)) {
      return inFlightSubOrgRequests.get(cacheKey)!;
    }

    const requestPromise = (async () => {
      // Call /platform/sub-organizations with query parameters
      try {
        const res = await baseClient.get<SubOrganizationListResponse>('/platform/sub-organizations', {
          params: queryParams,
          headers,
        });
        return res.data;
      } catch (err: any) {
        // Fallback to /organizations/{orgId}/sub-organizations if platform endpoint fails
        if (orgId && (err?.response?.status === 404 || err?.response?.status === 403)) {
          const fallbackRes = await baseClient.get<SubOrganizationListResponse>(
            `/organizations/${orgId}/sub-organizations`,
            { params: queryParams, headers }
          );
          return fallbackRes.data;
        }
        throw err;
      }
    })().finally(() => {
      inFlightSubOrgRequests.delete(cacheKey);
    });

    inFlightSubOrgRequests.set(cacheKey, requestPromise);
    return requestPromise;
  },

  /**
   * Create a sub-organization under an active organization
   * Supports POST /platform/sub-organizations (with organization_id) and fallback POST /organizations/{id}/sub-organizations
   */
  createSubOrganization: async (
    payload: CreateSubOrganizationRequest,
    parentOrgId?: string
  ): Promise<SubOrganizationSingleResponse> => {
    const orgId = parentOrgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (orgId) {
      headers['x-organization-id'] = orgId;
    }

    // Backend Zod schema validates strictly - organization_id goes in query params/headers, subscriptionPlan is not a sub-org field
    const { organization_id, organizationId, subscriptionPlan, ...cleanPayload } = payload as any;

    // First attempt: POST /platform/sub-organizations
    try {
      const res = await baseClient.post<SubOrganizationSingleResponse>(
        '/platform/sub-organizations',
        cleanPayload,
        {
          headers,
          params: orgId ? { organization_id: orgId } : undefined,
        }
      );
      return res.data;
    } catch (err: any) {
      // If 404 or unsupported, fallback to /organizations/{orgId}/sub-organizations
      if (orgId && (err?.response?.status === 404 || err?.response?.status === 405)) {
        const fallbackRes = await baseClient.post<SubOrganizationSingleResponse>(
          `/organizations/${orgId}/sub-organizations`,
          cleanPayload,
          { headers }
        );
        return fallbackRes.data;
      }
      throw err;
    }
  },

  /**
   * Update sub-organization details
   * Supports PATCH and PUT via /platform/sub-organizations/{id} and /sub-organizations/{id}
   */
  updateSubOrganization: async (
    id: string,
    payload: UpdateSubOrganizationRequest,
    parentOrgId?: string
  ): Promise<SubOrganizationSingleResponse> => {
    const orgId = parentOrgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (orgId) {
      headers['x-organization-id'] = orgId;
    }

    const { organization_id, organizationId, subscriptionPlan, ...cleanPayload } = payload as any;

    const endpoints = [
      { method: 'patch', url: `/platform/sub-organizations/${id}` },
      { method: 'put', url: `/platform/sub-organizations/${id}` },
      { method: 'patch', url: `/sub-organizations/${id}` },
      { method: 'put', url: `/sub-organizations/${id}` },
      ...(orgId
        ? [
            { method: 'patch', url: `/organizations/${orgId}/sub-organizations/${id}` },
            { method: 'put', url: `/organizations/${orgId}/sub-organizations/${id}` },
          ]
        : []),
    ];

    let lastError: any = null;
    for (const ep of endpoints) {
      try {
        const res = ep.method === 'patch'
          ? await baseClient.patch<SubOrganizationSingleResponse>(ep.url, cleanPayload, {
              headers,
              params: orgId ? { organization_id: orgId } : undefined,
            })
          : await baseClient.put<SubOrganizationSingleResponse>(ep.url, cleanPayload, {
              headers,
              params: orgId ? { organization_id: orgId } : undefined,
            });
        return res.data;
      } catch (err: any) {
        lastError = err;
        // If route not found or method not allowed, try next endpoint pattern
        if (err?.response?.status === 404 || err?.response?.status === 405) {
          continue;
        }
        // If validation/other error, throw directly
        throw err;
      }
    }
    throw lastError;
  },

  /**
   * Change sub-organization status (Active, Inactive, Suspended)
   * Supports PATCH /platform/sub-organizations/{id}/status, /sub-organizations/{id}/status, etc.
   */
  updateSubOrganizationStatus: async (
    id: string,
    status: 'Active' | 'Inactive' | 'Suspended' | 'Suspend' | 'Pending',
    parentOrgId?: string
  ): Promise<SubOrganizationSingleResponse> => {
    const apiStatus = status === 'Suspend' ? 'Suspended' : status;
    const orgId = parentOrgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (orgId) {
      headers['x-organization-id'] = orgId;
    }

    const endpoints = [
      `/platform/sub-organizations/${id}/status`,
      `/sub-organizations/${id}/status`,
      ...(orgId ? [`/organizations/${orgId}/sub-organizations/${id}/status`] : []),
    ];

    let lastError: any = null;
    for (const ep of endpoints) {
      try {
        const res = await baseClient.patch<SubOrganizationSingleResponse>(
          ep,
          { status: apiStatus },
          {
            headers,
            params: orgId ? { organization_id: orgId } : undefined,
          }
        );
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
};
