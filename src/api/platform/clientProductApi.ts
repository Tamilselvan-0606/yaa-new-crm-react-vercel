import { baseClient, baseApi } from '../baseApi';
import { getStoredOrganizationId } from '../config';
import {
  ClientProductApiItem,
  ClientProductListParams,
  ClientProductListResponse,
  ClientProductSingleResponse,
  ClientProductDeleteResponse,
  CreateClientProductRequest,
  UpdateClientProductRequest,
  PatchClientProductRequest,
  PatchClientProductStatusRequest,
} from './clientProductTypes';

export * from './clientProductTypes';

export const clientProductEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getClientProducts: builder.query<
      ClientProductListResponse,
      ClientProductListParams | void
    >({
      query: (params) => {
        const p = params || {};
        const queryParams: Record<string, any> = {
          page: p.page ?? 1,
          limit: p.limit ?? 10,
        };
        if (p.search && p.search.trim()) queryParams.search = p.search.trim();
        if (p.status && p.status !== 'All' && p.status !== 'ALL') queryParams.status = p.status;
        if (p.sortBy) queryParams.sortBy = p.sortBy;
        if (p.sortOrder) queryParams.sortOrder = p.sortOrder;
        if (p.organizationId) queryParams.organizationId = p.organizationId;
        const subId = p.subOrganizationId || p.sub_organization_id;
        if (subId) {
          queryParams.sub_organization_id = subId;
          queryParams.subOrganizationId = subId;
        }
        const bId = p.branchId || p.branch_id;
        if (bId) {
          queryParams.branch_id = bId;
          queryParams.branchId = bId;
        }

        const activeOrgId = p.xOrganizationId || getStoredOrganizationId();
        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['x-organization-id'] = activeOrgId;
        }

        return {
          url: '/products',
          params: queryParams,
          headers,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'ClientProduct' as const, id })),
              { type: 'ClientProduct', id: 'LIST' },
            ]
          : [{ type: 'ClientProduct', id: 'LIST' }],
    }),

    getClientProductById: builder.query<
      ClientProductSingleResponse,
      { id: string; orgId?: string }
    >({
      query: ({ id, orgId }) => {
        const activeOrgId = orgId || getStoredOrganizationId();
        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['x-organization-id'] = activeOrgId;
        }

        return {
          url: `/products/${encodeURIComponent(id)}`,
          headers,
        };
      },
      providesTags: (_result, _error, { id }) => [{ type: 'ClientProduct', id }],
    }),

    createClientProduct: builder.mutation<
      ClientProductSingleResponse,
      { payload: CreateClientProductRequest; orgId?: string }
    >({
      query: ({ payload, orgId }) => {
        const activeOrgId = orgId || getStoredOrganizationId();
        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['x-organization-id'] = activeOrgId;
        }

        return {
          url: '/products',
          method: 'POST',
          body: payload,
          headers,
        };
      },
      invalidatesTags: [{ type: 'ClientProduct', id: 'LIST' }],
    }),

    updateClientProduct: builder.mutation<
      ClientProductSingleResponse,
      { id: string; payload: UpdateClientProductRequest; orgId?: string }
    >({
      query: ({ id, payload, orgId }) => {
        const activeOrgId = orgId || payload.organizationId || getStoredOrganizationId();
        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['x-organization-id'] = activeOrgId;
        }

        const { organizationId, subOrganizationId, branchId, ...rest } = payload as any;
        const bodyPayload = {
          ...rest,
          ...(subOrganizationId ? { subOrganizationId } : {}),
          ...(branchId ? { branchId } : {}),
        };

        return {
          url: `/products/${encodeURIComponent(id)}`,
          method: 'PUT',
          body: bodyPayload,
          params: {
            ...(organizationId ? { organizationId } : {}),
            ...(subOrganizationId ? { subOrganizationId } : {}),
            ...(branchId ? { branchId } : {}),
          },
          headers,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ClientProduct', id },
        { type: 'ClientProduct', id: 'LIST' },
      ],
    }),

    patchClientProduct: builder.mutation<
      ClientProductSingleResponse,
      { id: string; payload: PatchClientProductRequest; orgId?: string }
    >({
      query: ({ id, payload, orgId }) => {
        const activeOrgId = orgId || getStoredOrganizationId();
        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['x-organization-id'] = activeOrgId;
        }

        return {
          url: `/products/${encodeURIComponent(id)}`,
          method: 'PATCH',
          body: payload,
          headers,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ClientProduct', id },
        { type: 'ClientProduct', id: 'LIST' },
      ],
    }),

    patchClientProductStatus: builder.mutation<
      ClientProductSingleResponse,
      { id: string; payload: PatchClientProductStatusRequest; orgId?: string }
    >({
      query: ({ id, payload, orgId }) => {
        const activeOrgId = orgId || getStoredOrganizationId();
        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['x-organization-id'] = activeOrgId;
        }

        return {
          url: `/products/${encodeURIComponent(id)}/status`,
          method: 'PATCH',
          body: payload,
          headers,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ClientProduct', id },
        { type: 'ClientProduct', id: 'LIST' },
      ],
    }),

    deleteClientProduct: builder.mutation<
      ClientProductDeleteResponse,
      { id: string; orgId?: string }
    >({
      query: ({ id, orgId }) => {
        const activeOrgId = orgId || getStoredOrganizationId();
        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['x-organization-id'] = activeOrgId;
        }

        return {
          url: `/products/${encodeURIComponent(id)}`,
          method: 'DELETE',
          headers,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ClientProduct', id },
        { type: 'ClientProduct', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetClientProductsQuery,
  useGetClientProductByIdQuery,
  useCreateClientProductMutation,
  useUpdateClientProductMutation,
  usePatchClientProductMutation,
  usePatchClientProductStatusMutation,
  useDeleteClientProductMutation,
} = clientProductEndpoints;

/**
 * Direct async service client with axios
 */
export const clientProductApi = {
  /**
   * GET /products
   */
  getProducts: async (
    params?: ClientProductListParams,
    orgId?: string
  ): Promise<ClientProductListResponse> => {
    const activeOrgId = orgId || params?.xOrganizationId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const queryParams: Record<string, any> = {
      page: params?.page ?? 1,
      limit: params?.limit ?? 10,
    };
    if (params?.search && params.search.trim()) queryParams.search = params.search.trim();
    if (params?.status && params.status !== 'All' && params.status !== 'ALL') queryParams.status = params.status;
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params?.organizationId) queryParams.organizationId = params.organizationId;
    const subId = params?.subOrganizationId || params?.sub_organization_id;
    if (subId) {
      queryParams.sub_organization_id = subId;
      queryParams.subOrganizationId = subId;
    }
    const bId = params?.branchId || params?.branch_id;
    if (bId) {
      queryParams.branch_id = bId;
      queryParams.branchId = bId;
    }

    const response = await baseClient.get<ClientProductListResponse>('/products', {
      params: queryParams,
      headers,
    });
    return response.data;
  },

  /**
   * GET /products/:id
   */
  getProductById: async (
    id: string,
    orgId?: string
  ): Promise<ClientProductSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const response = await baseClient.get<ClientProductSingleResponse>(
      `/products/${encodeURIComponent(id)}`,
      { headers }
    );
    return response.data;
  },

  /**
   * POST /products
   */
  createProduct: async (
    payload: CreateClientProductRequest,
    orgId?: string
  ): Promise<ClientProductSingleResponse> => {
    const activeOrgId = orgId || payload.organizationId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    // Backend rejects unrecognized keys in POST body: "organizationId", "subOrganizationId", "branchId"
    const { organizationId, subOrganizationId, branchId, ...bodyPayload } = payload as any;

    const response = await baseClient.post<ClientProductSingleResponse>(
      '/products',
      bodyPayload,
      {
        headers,
        params: {
          ...(organizationId ? { organizationId } : {}),
          ...(subOrganizationId ? { subOrganizationId, sub_organization_id: subOrganizationId } : {}),
          ...(branchId ? { branchId, branch_id: branchId } : {}),
        },
      }
    );
    return response.data;
  },

  /**
   * PUT /products/:id
   */
  updateProduct: async (
    id: string,
    payload: UpdateClientProductRequest,
    orgId?: string
  ): Promise<ClientProductSingleResponse> => {
    const activeOrgId = orgId || payload.organizationId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const { organizationId, subOrganizationId, branchId, ...rest } = payload as any;
    const bodyPayload = {
      ...rest,
      ...(subOrganizationId ? { subOrganizationId } : {}),
      ...(branchId ? { branchId } : {}),
    };

    const response = await baseClient.put<ClientProductSingleResponse>(
      `/products/${encodeURIComponent(id)}`,
      bodyPayload,
      {
        headers,
        params: {
          ...(organizationId ? { organizationId } : {}),
          ...(subOrganizationId ? { subOrganizationId } : {}),
          ...(branchId ? { branchId } : {}),
        },
      }
    );
    return response.data;
  },

  /**
   * PATCH /products/:id
   */
  patchProduct: async (
    id: string,
    payload: PatchClientProductRequest,
    orgId?: string
  ): Promise<ClientProductSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const response = await baseClient.patch<ClientProductSingleResponse>(
      `/products/${encodeURIComponent(id)}`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * PATCH /products/:id/status
   */
  patchProductStatus: async (
    id: string,
    payload: PatchClientProductStatusRequest,
    orgId?: string
  ): Promise<ClientProductSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const response = await baseClient.patch<ClientProductSingleResponse>(
      `/products/${encodeURIComponent(id)}/status`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * DELETE /products/:id
   */
  deleteProduct: async (
    id: string,
    orgId?: string
  ): Promise<ClientProductDeleteResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const response = await baseClient.delete<ClientProductDeleteResponse>(
      `/products/${encodeURIComponent(id)}`,
      { headers }
    );
    return response.data;
  },
};
