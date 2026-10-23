import { baseClient, baseApi } from '../baseApi';
import { getStoredOrganizationId } from '../config';
import {
  PlatformClientListParams,
  PlatformClientListResponse,
  PlatformClientSingleResponse,
  PlatformClientItem,
  CreatePlatformClientRequest,
  UpdatePlatformClientRequest,
} from './clientTypes';

export * from './clientTypes';

export const clientEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformClients: builder.query<PlatformClientListResponse, PlatformClientListParams | void>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        const targetOrgId =
          (params && typeof params === 'object' && 'organization_id' in params && params.organization_id)
            ? params.organization_id
            : getStoredOrganizationId() || undefined;

        if (params) {
          if (params.page !== undefined) queryParams.page = params.page;
          if (params.limit !== undefined) queryParams.limit = params.limit;
          if (params.search) queryParams.search = params.search;
          if (params.status && params.status !== 'All') queryParams.status = params.status;
          if (params.organizationType && params.organizationType !== 'All') {
            queryParams.organizationType = params.organizationType;
          }
          if (params.subscriptionStatus && params.subscriptionStatus !== 'All') {
            queryParams.subscriptionStatus = params.subscriptionStatus;
          }
          if (params.hasOutstanding !== undefined) {
            queryParams.hasOutstanding = String(params.hasOutstanding);
          }
          if (params.sortBy) queryParams.sortBy = params.sortBy;
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
          if (targetOrgId) queryParams.organization_id = targetOrgId;
        }

        return {
          url: '/platform/clients',
          params: queryParams,
          headers: targetOrgId ? { 'x-organization-id': targetOrgId } : undefined,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'PlatformClient' as const, id })),
              { type: 'PlatformClient', id: 'LIST' },
            ]
          : [{ type: 'PlatformClient', id: 'LIST' }],
    }),

    getPlatformClientById: builder.query<PlatformClientSingleResponse, { id: string; organizationId?: string } | string>({
      query: (arg) => {
        const id = typeof arg === 'string' ? arg : arg.id;
        const orgId = typeof arg === 'object' ? arg.organizationId : getStoredOrganizationId();
        return {
          url: `/platform/clients/${id}`,
          headers: orgId ? { 'x-organization-id': orgId } : undefined,
        };
      },
      providesTags: (_result, _error, arg) => [
        { type: 'PlatformClient', id: typeof arg === 'string' ? arg : arg.id },
      ],
    }),

    createPlatformClient: builder.mutation<PlatformClientSingleResponse, CreatePlatformClientRequest>({
      query: (payload) => {
        const targetOrgId = payload.organizationId || getStoredOrganizationId() || undefined;
        return {
          url: '/platform/clients',
          method: 'POST',
          body: payload,
          headers: targetOrgId ? { 'x-organization-id': targetOrgId } : undefined,
          params: targetOrgId ? { organization_id: targetOrgId } : undefined,
        };
      },
      invalidatesTags: [{ type: 'PlatformClient', id: 'LIST' }, 'Dashboard'],
    }),

    updatePlatformClient: builder.mutation<
      PlatformClientSingleResponse,
      { id: string; payload: UpdatePlatformClientRequest; organizationId?: string }
    >({
      query: ({ id, payload, organizationId }) => {
        const targetOrgId = organizationId || payload.organizationId || getStoredOrganizationId() || undefined;
        return {
          url: `/platform/clients/${id}`,
          method: 'PATCH',
          body: payload,
          headers: targetOrgId ? { 'x-organization-id': targetOrgId } : undefined,
          params: targetOrgId ? { organization_id: targetOrgId } : undefined,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PlatformClient', id },
        { type: 'PlatformClient', id: 'LIST' },
      ],
    }),

    deletePlatformClient: builder.mutation<{ success: boolean; message: string }, { id: string; organizationId?: string } | string>({
      query: (arg) => {
        const id = typeof arg === 'string' ? arg : arg.id;
        const orgId = typeof arg === 'object' ? arg.organizationId : getStoredOrganizationId();
        return {
          url: `/platform/clients/${id}`,
          method: 'DELETE',
          headers: orgId ? { 'x-organization-id': orgId } : undefined,
        };
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: 'PlatformClient', id: typeof arg === 'string' ? arg : arg.id },
        { type: 'PlatformClient', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPlatformClientsQuery,
  useGetPlatformClientByIdQuery,
  useCreatePlatformClientMutation,
  useUpdatePlatformClientMutation,
  useDeletePlatformClientMutation,
} = clientEndpoints;

export const platformClientApi = {
  getClients: async (params?: PlatformClientListParams): Promise<PlatformClientListResponse> => {
    const targetOrgId = params?.organization_id || getStoredOrganizationId() || undefined;
    const res = await baseClient.get<PlatformClientListResponse>('/platform/clients', {
      params,
      headers: targetOrgId ? { 'x-organization-id': targetOrgId } : undefined,
    });
    return res.data;
  },

  getClientById: async (id: string, organizationId?: string): Promise<PlatformClientSingleResponse> => {
    const targetOrgId = organizationId || getStoredOrganizationId() || undefined;
    const res = await baseClient.get<PlatformClientSingleResponse>(`/platform/clients/${id}`, {
      headers: targetOrgId ? { 'x-organization-id': targetOrgId } : undefined,
    });
    return res.data;
  },

  createClient: async (payload: CreatePlatformClientRequest): Promise<PlatformClientSingleResponse> => {
    const targetOrgId = payload.organizationId || getStoredOrganizationId() || undefined;
    const res = await baseClient.post<PlatformClientSingleResponse>('/platform/clients', payload, {
      headers: targetOrgId ? { 'x-organization-id': targetOrgId } : undefined,
      params: targetOrgId ? { organization_id: targetOrgId } : undefined,
    });
    return res.data;
  },

  updateClient: async (
    id: string,
    payload: UpdatePlatformClientRequest,
    organizationId?: string
  ): Promise<PlatformClientSingleResponse> => {
    const targetOrgId = organizationId || payload.organizationId || getStoredOrganizationId() || undefined;
    const res = await baseClient.patch<PlatformClientSingleResponse>(`/platform/clients/${id}`, payload, {
      headers: targetOrgId ? { 'x-organization-id': targetOrgId } : undefined,
      params: targetOrgId ? { organization_id: targetOrgId } : undefined,
    });
    return res.data;
  },

  deleteClient: async (id: string, organizationId?: string): Promise<{ success: boolean; message: string }> => {
    const targetOrgId = organizationId || getStoredOrganizationId() || undefined;
    const res = await baseClient.delete<{ success: boolean; message: string }>(`/platform/clients/${id}`, {
      headers: targetOrgId ? { 'x-organization-id': targetOrgId } : undefined,
    });
    return res.data;
  },
};
