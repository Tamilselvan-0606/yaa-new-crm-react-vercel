import { baseClient, baseApi, buildListParams } from '../baseApi';
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
  /**
   * GET /platform/organizations?page_no&page_size&pagination_required&search&status&page&limit&sortBy
   * (page/limit are sent alongside page_no/page_size because the backend accepts either form).
   */
  getOrganizations: async (
    page = 1,
    limit = 10,
    options: { search?: string; status?: string; sortBy?: string } = {}
  ): Promise<OrganizationListResponse> => {
    const search = options.search?.trim();
    const res = await baseClient.get<OrganizationListResponse>('/platform/organizations', {
      params: buildListParams({ page, limit, search, status: options.status, sortBy: options.sortBy }, { sortBy: 'name' }),
    });
    return res.data;
  },

  createOrganization: async (payload: CreateOrganizationRequest): Promise<OrganizationSingleResponse> => {
    const res = await baseClient.post<OrganizationSingleResponse>('/platform/organizations', payload);
    return res.data;
  },

  getOrganizationById: async (id: string): Promise<OrganizationSingleResponse> => {
    if (!id || id === '11111111-1111-4111-8111-111111111111') {
      return { success: false, statusCode: 400, message: 'Invalid organization ID', data: null as any, meta: {} as any };
    }
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
