import { baseClient, baseApi } from '../baseApi';
import { getStoredOrganizationId } from '../config';
import {
  ClientSubscriptionListParams,
  ClientSubscriptionListResponse,
  ClientSubscriptionSingleResponse,
  CreateClientSubscriptionRequest,
  UpdateClientSubscriptionRequest,
  RenewClientSubscriptionRequest,
  PatchClientSubscriptionStatusRequest,
} from './clientSubscriptionTypes';

export * from './clientSubscriptionTypes';

export const clientSubscriptionEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getClientSubscriptions: builder.query<
      ClientSubscriptionListResponse,
      ClientSubscriptionListParams | void
    >({
      query: (params) => ({
        url: '/subscriptions',
        params: params || {},
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'ClientSubscription' as const, id })),
              { type: 'ClientSubscription', id: 'LIST' },
            ]
          : [{ type: 'ClientSubscription', id: 'LIST' }],
    }),

    getClientSubscriptionById: builder.query<ClientSubscriptionSingleResponse, string>({
      query: (id) => `/subscriptions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ClientSubscription', id }],
    }),

    createClientSubscription: builder.mutation<
      ClientSubscriptionSingleResponse,
      CreateClientSubscriptionRequest
    >({
      query: (payload) => ({
        url: '/subscriptions',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'ClientSubscription', id: 'LIST' }],
    }),

    updateClientSubscription: builder.mutation<
      ClientSubscriptionSingleResponse,
      { id: string; payload: UpdateClientSubscriptionRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/subscriptions/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ClientSubscription', id },
        { type: 'ClientSubscription', id: 'LIST' },
      ],
    }),

    patchClientSubscription: builder.mutation<
      ClientSubscriptionSingleResponse,
      { id: string; payload: Partial<UpdateClientSubscriptionRequest> }
    >({
      query: ({ id, payload }) => ({
        url: `/subscriptions/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ClientSubscription', id },
        { type: 'ClientSubscription', id: 'LIST' },
      ],
    }),

    patchClientSubscriptionStatus: builder.mutation<
      ClientSubscriptionSingleResponse,
      { id: string; payload: PatchClientSubscriptionStatusRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/subscriptions/${id}/status`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ClientSubscription', id },
        { type: 'ClientSubscription', id: 'LIST' },
      ],
    }),

    renewClientSubscription: builder.mutation<
      ClientSubscriptionSingleResponse,
      { id: string; payload?: RenewClientSubscriptionRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/subscriptions/${id}/renew`,
        method: 'POST',
        body: payload || {},
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ClientSubscription', id },
        { type: 'ClientSubscription', id: 'LIST' },
      ],
    }),

    deleteClientSubscription: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/subscriptions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'ClientSubscription', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetClientSubscriptionsQuery,
  useGetClientSubscriptionByIdQuery,
  useCreateClientSubscriptionMutation,
  useUpdateClientSubscriptionMutation,
  usePatchClientSubscriptionMutation,
  usePatchClientSubscriptionStatusMutation,
  useRenewClientSubscriptionMutation,
  useDeleteClientSubscriptionMutation,
} = clientSubscriptionEndpoints;

export const clientSubscriptionApi = {
  getClientSubscriptions: async (
    params?: ClientSubscriptionListParams,
    orgId?: string
  ): Promise<ClientSubscriptionListResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const queryParams: Record<string, any> = {
      page: params?.page ?? params?.page_no ?? 1,
      limit: params?.limit ?? params?.page_size ?? 10,
    };
    if (params?.search) queryParams.search = params.search;
    if (params?.status && params.status !== 'ALL' && params.status !== 'All') {
      queryParams.status = params.status;
    }
    if (params?.productId && params.productId !== 'ALL' && params.productId !== 'All') {
      queryParams.productId = params.productId;
    }
    if (params?.customerId) queryParams.customerId = params.customerId;
    if (params?.planId) queryParams.planId = params.planId;
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

    const res = await baseClient.get<ClientSubscriptionListResponse>('/subscriptions', {
      params: queryParams,
      headers,
    });
    return res.data;
  },

  getClientSubscriptionById: async (
    id: string,
    orgId?: string
  ): Promise<ClientSubscriptionSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const res = await baseClient.get<ClientSubscriptionSingleResponse>(`/subscriptions/${id}`, {
      headers,
    });
    return res.data;
  },

  createClientSubscription: async (
    payload: CreateClientSubscriptionRequest,
    orgId?: string
  ): Promise<ClientSubscriptionSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const res = await baseClient.post<ClientSubscriptionSingleResponse>(
      '/subscriptions',
      payload,
      { headers }
    );
    return res.data;
  },

  updateClientSubscription: async (
    id: string,
    payload: UpdateClientSubscriptionRequest,
    orgId?: string
  ): Promise<ClientSubscriptionSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const res = await baseClient.put<ClientSubscriptionSingleResponse>(
      `/subscriptions/${id}`,
      payload,
      { headers }
    );
    return res.data;
  },

  patchClientSubscription: async (
    id: string,
    payload: Partial<UpdateClientSubscriptionRequest>,
    orgId?: string
  ): Promise<ClientSubscriptionSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const res = await baseClient.patch<ClientSubscriptionSingleResponse>(
      `/subscriptions/${id}`,
      payload,
      { headers }
    );
    return res.data;
  },

  updateClientSubscriptionStatus: async (
    id: string,
    status: string,
    orgId?: string
  ): Promise<ClientSubscriptionSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const res = await baseClient.patch<ClientSubscriptionSingleResponse>(
      `/subscriptions/${id}/status`,
      { status },
      { headers }
    );
    return res.data;
  },

  renewClientSubscription: async (
    id: string,
    payload?: RenewClientSubscriptionRequest,
    orgId?: string
  ): Promise<ClientSubscriptionSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const res = await baseClient.post<ClientSubscriptionSingleResponse>(
      `/subscriptions/${id}/renew`,
      payload || {},
      { headers }
    );
    return res.data;
  },

  deleteClientSubscription: async (
    id: string,
    orgId?: string
  ): Promise<{ success: boolean; message: string }> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const res = await baseClient.delete<{ success: boolean; message: string }>(
      `/subscriptions/${id}`,
      { headers }
    );
    return res.data;
  },
};
