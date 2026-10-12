import { baseClient, baseApi } from '../baseApi';
import {
  SubscriptionPlanListResponse,
  SubscriptionPlanSingleResponse,
  SubscriptionPlanDeleteResponse,
  SubscriptionPlanListParams,
  CreateSubscriptionPlanRequest,
  UpdateSubscriptionPlanRequest,
} from './subscriptionPlanTypes';

export * from './subscriptionPlanTypes';

export const subscriptionPlanEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformSubscriptionPlans: builder.query<SubscriptionPlanListResponse, SubscriptionPlanListParams | void>({
      query: (params) => ({
        url: '/platform/subscription-plans',
        params: params || {},
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'SubscriptionPlan' as const, id })),
              { type: 'SubscriptionPlan', id: 'LIST' },
            ]
          : [{ type: 'SubscriptionPlan', id: 'LIST' }],
    }),

    getPlatformSubscriptionPlanById: builder.query<SubscriptionPlanSingleResponse, string>({
      query: (id) => `/platform/subscription-plans/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'SubscriptionPlan', id }],
    }),

    createPlatformSubscriptionPlan: builder.mutation<SubscriptionPlanSingleResponse, CreateSubscriptionPlanRequest>({
      query: (payload) => ({
        url: '/platform/subscription-plans',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'SubscriptionPlan', id: 'LIST' }],
    }),

    updatePlatformSubscriptionPlan: builder.mutation<
      SubscriptionPlanSingleResponse,
      { id: string; payload: UpdateSubscriptionPlanRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/platform/subscription-plans/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SubscriptionPlan', id },
        { type: 'SubscriptionPlan', id: 'LIST' },
      ],
    }),

    deletePlatformSubscriptionPlan: builder.mutation<SubscriptionPlanDeleteResponse, string>({
      query: (id) => ({
        url: `/platform/subscription-plans/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'SubscriptionPlan', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPlatformSubscriptionPlansQuery,
  useGetPlatformSubscriptionPlanByIdQuery,
  useCreatePlatformSubscriptionPlanMutation,
  useUpdatePlatformSubscriptionPlanMutation,
  useDeletePlatformSubscriptionPlanMutation,
} = subscriptionPlanEndpoints;

export const subscriptionPlanApi = {
  getSubscriptionPlans: async (
    params?: SubscriptionPlanListParams
  ): Promise<SubscriptionPlanListResponse> => {
    const res = await baseClient.get<SubscriptionPlanListResponse>('/platform/subscription-plans', {
      params,
    });
    return res.data;
  },

  createSubscriptionPlan: async (
    payload: CreateSubscriptionPlanRequest
  ): Promise<SubscriptionPlanSingleResponse> => {
    const res = await baseClient.post<SubscriptionPlanSingleResponse>(
      '/platform/subscription-plans',
      payload
    );
    return res.data;
  },

  getSubscriptionPlanById: async (id: string): Promise<SubscriptionPlanSingleResponse> => {
    const res = await baseClient.get<SubscriptionPlanSingleResponse>(
      `/platform/subscription-plans/${id}`
    );
    return res.data;
  },

  updateSubscriptionPlan: async (
    id: string,
    payload: UpdateSubscriptionPlanRequest
  ): Promise<SubscriptionPlanSingleResponse> => {
    const res = await baseClient.put<SubscriptionPlanSingleResponse>(
      `/platform/subscription-plans/${id}`,
      payload
    );
    return res.data;
  },

  deleteSubscriptionPlan: async (id: string): Promise<SubscriptionPlanDeleteResponse> => {
    const res = await baseClient.delete<SubscriptionPlanDeleteResponse>(
      `/platform/subscription-plans/${id}`
    );
    return res.data;
  },
};
