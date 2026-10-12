import { baseClient, baseApi } from '../baseApi';
import {
  PlatformLeadListParams,
  PlatformLeadListResponse,
  PlatformLeadSingleResponse,
  PlatformLeadItem,
  CreatePlatformLeadRequest,
  UpdatePlatformLeadRequest,
  UpdatePlatformLeadStatusRequest,
  ConvertPlatformLeadRequest,
  ConvertPlatformLeadResponse,
} from './leadTypes';

export * from './leadTypes';

export const leadEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformLeads: builder.query<PlatformLeadListResponse, PlatformLeadListParams | void>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params) {
          if (params.page !== undefined) queryParams.page = params.page;
          if (params.limit !== undefined) queryParams.limit = params.limit;
          if (params.search) queryParams.search = params.search;
          if (params.status && params.status !== 'All') queryParams.status = params.status;
          if (params.source && params.source !== 'All') queryParams.source = params.source;
          if (params.priority && params.priority !== 'All') queryParams.priority = params.priority;
          if (params.assignedTo) queryParams.assignedTo = params.assignedTo;
          if (params.followUpFrom) queryParams.followUpFrom = params.followUpFrom;
          if (params.followUpTo) queryParams.followUpTo = params.followUpTo;
          if (params.converted !== undefined && params.converted !== null) queryParams.converted = String(params.converted);
          if (params.sortBy) queryParams.sortBy = params.sortBy;
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
        }
        return {
          url: '/platform/leads',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Lead' as const, id })),
              { type: 'Lead', id: 'LIST' },
            ]
          : [{ type: 'Lead', id: 'LIST' }],
    }),

    getPlatformLeadById: builder.query<PlatformLeadSingleResponse, string>({
      query: (id) => `/platform/leads/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Lead', id }],
    }),

    createPlatformLead: builder.mutation<PlatformLeadSingleResponse, CreatePlatformLeadRequest>({
      query: (payload) => ({
        url: '/platform/leads',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }, 'Dashboard'],
    }),

    updatePlatformLead: builder.mutation<
      PlatformLeadSingleResponse,
      { id: string; payload: UpdatePlatformLeadRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/platform/leads/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Lead', id },
        { type: 'Lead', id: 'LIST' },
        'Dashboard',
      ],
    }),

    patchPlatformLead: builder.mutation<
      PlatformLeadSingleResponse,
      { id: string; payload: Partial<CreatePlatformLeadRequest> }
    >({
      query: ({ id, payload }) => ({
        url: `/platform/leads/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Lead', id },
        { type: 'Lead', id: 'LIST' },
        'Dashboard',
      ],
    }),

    updatePlatformLeadStatus: builder.mutation<
      PlatformLeadSingleResponse,
      { id: string; payload: UpdatePlatformLeadStatusRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/platform/leads/${id}/status`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Lead', id },
        { type: 'Lead', id: 'LIST' },
        'Dashboard',
      ],
    }),

    convertPlatformLead: builder.mutation<
      ConvertPlatformLeadResponse,
      { id: string; payload: ConvertPlatformLeadRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/platform/leads/${id}/convert`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'Lead', id: 'LIST' },
        { type: 'Organization', id: 'LIST' },
        'Dashboard',
      ],
    }),

    deletePlatformLead: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/platform/leads/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }, 'Dashboard'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPlatformLeadsQuery,
  useGetPlatformLeadByIdQuery,
  useCreatePlatformLeadMutation,
  useUpdatePlatformLeadMutation,
  usePatchPlatformLeadMutation,
  useUpdatePlatformLeadStatusMutation,
  useConvertPlatformLeadMutation,
  useDeletePlatformLeadMutation,
} = leadEndpoints;

export const platformLeadApi = {
  getLeads: async (params?: PlatformLeadListParams): Promise<PlatformLeadListResponse> => {
    const res = await baseClient.get<PlatformLeadListResponse>('/platform/leads', { params });
    return res.data;
  },

  getLeadById: async (id: string): Promise<PlatformLeadSingleResponse> => {
    const res = await baseClient.get<PlatformLeadSingleResponse>(`/platform/leads/${id}`);
    return res.data;
  },

  createLead: async (payload: CreatePlatformLeadRequest): Promise<PlatformLeadSingleResponse> => {
    const res = await baseClient.post<PlatformLeadSingleResponse>('/platform/leads', payload);
    return res.data;
  },

  updateLead: async (
    id: string,
    payload: UpdatePlatformLeadRequest
  ): Promise<PlatformLeadSingleResponse> => {
    const res = await baseClient.put<PlatformLeadSingleResponse>(`/platform/leads/${id}`, payload);
    return res.data;
  },

  patchLead: async (
    id: string,
    payload: Partial<CreatePlatformLeadRequest>
  ): Promise<PlatformLeadSingleResponse> => {
    const res = await baseClient.patch<PlatformLeadSingleResponse>(`/platform/leads/${id}`, payload);
    return res.data;
  },

  updateLeadStatus: async (
    id: string,
    payload: UpdatePlatformLeadStatusRequest
  ): Promise<PlatformLeadSingleResponse> => {
    const res = await baseClient.patch<PlatformLeadSingleResponse>(
      `/platform/leads/${id}/status`,
      payload
    );
    return res.data;
  },

  convertLead: async (
    id: string,
    payload: ConvertPlatformLeadRequest
  ): Promise<ConvertPlatformLeadResponse> => {
    const res = await baseClient.post<ConvertPlatformLeadResponse>(
      `/platform/leads/${id}/convert`,
      payload
    );
    return res.data;
  },

  deleteLead: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await baseClient.delete(`/platform/leads/${id}`);
    return res.data;
  },
};
