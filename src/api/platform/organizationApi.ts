import { baseClient, baseApi } from '../baseApi';
import {
  OrganizationListResponse,
  OrganizationSingleResponse,
  OrganizationDeleteResponse,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from './organizationTypes';

export * from './organizationTypes';

export const organizationEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformOrganizations: builder.query<OrganizationListResponse, { page?: number; limit?: number } | void>({
      query: (params) => {
        const p = params || {};
        return {
          url: '/platform/organizations',
          params: {
            page: p.page ?? 1,
            limit: p.limit ?? 10,
          },
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Organization' as const, id })),
              { type: 'Organization', id: 'LIST' },
            ]
          : [{ type: 'Organization', id: 'LIST' }],
    }),

    getPlatformOrganizationById: builder.query<OrganizationSingleResponse, string>({
      query: (id) => `/platform/organizations/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Organization', id }],
    }),

    createPlatformOrganization: builder.mutation<OrganizationSingleResponse, CreateOrganizationRequest>({
      query: (payload) => ({
        url: '/platform/organizations',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Organization', id: 'LIST' }],
    }),

    updatePlatformOrganization: builder.mutation<
      OrganizationSingleResponse,
      { id: string; payload: UpdateOrganizationRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/platform/organizations/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Organization', id },
        { type: 'Organization', id: 'LIST' },
      ],
    }),

    updatePlatformOrganizationStatus: builder.mutation<
      OrganizationSingleResponse,
      { id: string; status: 'Active' | 'Inactive' | 'Suspend' }
    >({
      query: ({ id, status }) => ({
        url: `/platform/organizations/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Organization', id },
        { type: 'Organization', id: 'LIST' },
      ],
    }),

    deletePlatformOrganization: builder.mutation<OrganizationDeleteResponse, string>({
      query: (id) => ({
        url: `/platform/organizations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Organization', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPlatformOrganizationsQuery,
  useGetPlatformOrganizationByIdQuery,
  useCreatePlatformOrganizationMutation,
  useUpdatePlatformOrganizationMutation,
  useUpdatePlatformOrganizationStatusMutation,
  useDeletePlatformOrganizationMutation,
} = organizationEndpoints;

export const organizationApi = {
  getOrganizations: async (page = 1, limit = 10): Promise<OrganizationListResponse> => {
    const res = await baseClient.get<OrganizationListResponse>('/platform/organizations', {
      params: { page, limit },
    });
    return res.data;
  },

  createOrganization: async (payload: CreateOrganizationRequest): Promise<OrganizationSingleResponse> => {
    const res = await baseClient.post<OrganizationSingleResponse>('/platform/organizations', payload);
    return res.data;
  },

  getOrganizationById: async (id: string): Promise<OrganizationSingleResponse> => {
    const res = await baseClient.get<OrganizationSingleResponse>(`/platform/organizations/${id}`);
    return res.data;
  },

  updateOrganization: async (
    id: string,
    payload: UpdateOrganizationRequest
  ): Promise<OrganizationSingleResponse> => {
    const res = await baseClient.patch<OrganizationSingleResponse>(`/platform/organizations/${id}`, payload);
    return res.data;
  },

  updateOrganizationStatus: async (
    id: string,
    status: 'Active' | 'Inactive' | 'Suspend'
  ): Promise<OrganizationSingleResponse> => {
    const res = await baseClient.patch<OrganizationSingleResponse>(`/platform/organizations/${id}/status`, { status });
    return res.data;
  },

  deleteOrganization: async (id: string): Promise<OrganizationDeleteResponse> => {
    const res = await baseClient.delete<OrganizationDeleteResponse>(`/platform/organizations/${id}`);
    return res.data;
  },
};
