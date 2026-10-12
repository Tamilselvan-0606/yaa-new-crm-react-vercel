import { baseClient, baseApi } from '../baseApi';
import {
  OrganizationSubscriptionListParams,
  OrganizationSubscriptionListResponse,
  OrganizationSubscriptionSingleResponse,
  CreateOrganizationSubscriptionRequest,
  RenewOrganizationSubscriptionRequest,
  CancelOrganizationSubscriptionRequest,
} from './organizationSubscriptionTypes';

export * from './organizationSubscriptionTypes';

export const organizationSubscriptionEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformOrgSubscriptions: builder.query<
      OrganizationSubscriptionListResponse,
      OrganizationSubscriptionListParams | void
    >({
      query: (params) => ({
        url: '/platform/organization-subscriptions',
        params: params || {},
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'OrgSubscription' as const, id })),
              { type: 'OrgSubscription', id: 'LIST' },
            ]
          : [{ type: 'OrgSubscription', id: 'LIST' }],
    }),

    getPlatformOrgSubscriptionById: builder.query<OrganizationSubscriptionSingleResponse, string>({
      query: (id) => `/platform/organization-subscriptions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'OrgSubscription', id }],
    }),

    createPlatformOrgSubscription: builder.mutation<
      OrganizationSubscriptionSingleResponse,
      CreateOrganizationSubscriptionRequest
    >({
      query: (payload) => ({
        url: '/platform/organization-subscriptions',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'OrgSubscription', id: 'LIST' }],
    }),

    renewPlatformOrgSubscription: builder.mutation<
      OrganizationSubscriptionSingleResponse,
      { id: string; payload?: RenewOrganizationSubscriptionRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/platform/organization-subscriptions/${id}/renew`,
        method: 'POST',
        body: payload || {},
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'OrgSubscription', id },
        { type: 'OrgSubscription', id: 'LIST' },
      ],
    }),

    cancelPlatformOrgSubscription: builder.mutation<
      OrganizationSubscriptionSingleResponse,
      { id: string; payload?: CancelOrganizationSubscriptionRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/platform/organization-subscriptions/${id}/cancel`,
        method: 'POST',
        body: payload || {},
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'OrgSubscription', id },
        { type: 'OrgSubscription', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPlatformOrgSubscriptionsQuery,
  useGetPlatformOrgSubscriptionByIdQuery,
  useCreatePlatformOrgSubscriptionMutation,
  useRenewPlatformOrgSubscriptionMutation,
  useCancelPlatformOrgSubscriptionMutation,
} = organizationSubscriptionEndpoints;

export const organizationSubscriptionApi = {
  getOrganizationSubscriptions: async (
    params?: OrganizationSubscriptionListParams
  ): Promise<OrganizationSubscriptionListResponse> => {
    const res = await baseClient.get<OrganizationSubscriptionListResponse>(
      '/platform/organization-subscriptions',
      {
        params,
      }
    );
    return res.data;
  },

  getOrganizationSubscriptionById: async (
    id: string
  ): Promise<OrganizationSubscriptionSingleResponse> => {
    const res = await baseClient.get<OrganizationSubscriptionSingleResponse>(
      `/platform/organization-subscriptions/${id}`
    );
    return res.data;
  },

  createOrganizationSubscription: async (
    payload: CreateOrganizationSubscriptionRequest
  ): Promise<OrganizationSubscriptionSingleResponse> => {
    const res = await baseClient.post<OrganizationSubscriptionSingleResponse>(
      '/platform/organization-subscriptions',
      payload
    );
    return res.data;
  },

  renewOrganizationSubscription: async (
    id: string,
    payload?: RenewOrganizationSubscriptionRequest
  ): Promise<OrganizationSubscriptionSingleResponse> => {
    const res = await baseClient.post<OrganizationSubscriptionSingleResponse>(
      `/platform/organization-subscriptions/${id}/renew`,
      payload || {}
    );
    return res.data;
  },

  cancelOrganizationSubscription: async (
    id: string,
    payload?: CancelOrganizationSubscriptionRequest
  ): Promise<OrganizationSubscriptionSingleResponse> => {
    const res = await baseClient.post<OrganizationSubscriptionSingleResponse>(
      `/platform/organization-subscriptions/${id}/cancel`,
      payload || {}
    );
    return res.data;
  },
};
