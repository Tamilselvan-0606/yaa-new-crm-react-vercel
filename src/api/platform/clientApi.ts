import { baseClient, baseApi } from '../baseApi';
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
          if (params.organization_id) queryParams.organization_id = params.organization_id;
        }

        return {
          url: '/platform/clients',
          params: queryParams,
          headers: {
            'x-organization-id': (params && typeof params === 'object' && 'organization_id' in params && params.organization_id) ? params.organization_id : '',
          },
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

    getPlatformClientById: builder.query<PlatformClientSingleResponse, string>({
      query: (id) => ({
        url: `/platform/clients/${id}`,
        headers: {
          'x-organization-id': '',
        },
      }),
      providesTags: (_result, _error, id) => [{ type: 'PlatformClient', id }],
    }),

    createPlatformClient: builder.mutation<PlatformClientSingleResponse, CreatePlatformClientRequest>({
      query: (payload) => ({
        url: '/platform/clients',
        method: 'POST',
        body: payload,
        headers: {
          'x-organization-id': '',
        },
      }),
      invalidatesTags: [{ type: 'PlatformClient', id: 'LIST' }, 'Dashboard'],
    }),

    updatePlatformClient: builder.mutation<
      PlatformClientSingleResponse,
      { id: string; payload: UpdatePlatformClientRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/platform/clients/${id}`,
        method: 'PATCH',
        body: payload,
        headers: {
          'x-organization-id': '',
        },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PlatformClient', id },
        { type: 'PlatformClient', id: 'LIST' },
      ],
    }),

    deletePlatformClient: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/platform/clients/${id}`,
        method: 'DELETE',
        headers: {
          'x-organization-id': '',
        },
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'PlatformClient', id },
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
    const res = await baseClient.get<PlatformClientListResponse>('/platform/clients', {
      params,
      headers: {
        'x-organization-id': params?.organization_id || '',
      },
    });
    return res.data;
  },

  getClientById: async (id: string): Promise<PlatformClientSingleResponse> => {
    const res = await baseClient.get<PlatformClientSingleResponse>(`/platform/clients/${id}`, {
      headers: {
        'x-organization-id': '',
      },
    });
    return res.data;
  },

  createClient: async (payload: CreatePlatformClientRequest): Promise<PlatformClientSingleResponse> => {
    const res = await baseClient.post<PlatformClientSingleResponse>('/platform/clients', payload, {
      headers: {
        'x-organization-id': '',
      },
    });
    return res.data;
  },

  updateClient: async (
    id: string,
    payload: UpdatePlatformClientRequest
  ): Promise<PlatformClientSingleResponse> => {
    const res = await baseClient.patch<PlatformClientSingleResponse>(`/platform/clients/${id}`, payload, {
      headers: {
        'x-organization-id': '',
      },
    });
    return res.data;
  },

  deleteClient: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await baseClient.delete<{ success: boolean; message: string }>(`/platform/clients/${id}`, {
      headers: {
        'x-organization-id': '',
      },
    });
    return res.data;
  },
};
