import { baseClient, baseApi, buildListParams } from '../baseApi';
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
        const queryParams: Record<string, any> = buildListParams(p, { sortBy: 'name' });
        if (p.search && p.search.trim()) queryParams.search = p.search.trim();
        if (p.status && p.status !== 'All' && p.status !== 'ALL') queryParams.status = p.status;
        if (p.sortBy) queryParams.sortBy = p.sortBy;
        if (p.sortOrder) queryParams.sortOrder = p.sortOrder;
        if (p.organizationId) {
          queryParams.organizationId = p.organizationId;
          queryParams.organization_id = p.organizationId;
        }
        const subId = p.subOrganizationId || p.sub_organization_id;
        if (subId) {
          queryParams.subOrganizationId = subId;
          queryParams.sub_organization_id = subId;
        }
        const bId = p.branchId || p.branch_id;
        if (bId) {
          queryParams.branchId = bId;
          queryParams.branch_id = bId;
        }

        const activeOrgId = p.xOrganizationId || getStoredOrganizationId();
        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['x-organization-id'] = activeOrgId;
          if (!queryParams.organizationId && !queryParams.organization_id) {
            queryParams.organization_id = activeOrgId;
          }
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

    const queryParams: Record<string, any> = buildListParams(params, { sortBy: 'name' });
    if (params?.search && params.search.trim()) queryParams.search = params.search.trim();
    if (params?.status && params.status !== 'All' && params.status !== 'ALL') queryParams.status = params.status;
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params?.organizationId) {
      queryParams.organizationId = params.organizationId;
      queryParams.organization_id = params.organizationId;
    } else if (activeOrgId) {
      queryParams.organization_id = activeOrgId;
    }
    const subId = params?.subOrganizationId || params?.sub_organization_id;
    if (subId) {
      queryParams.subOrganizationId = subId;
      queryParams.sub_organization_id = subId;
    }
    const bId = params?.branchId || params?.branch_id;
    if (bId) {
      queryParams.branchId = bId;
      queryParams.branch_id = bId;
    }

    try {
      const response = await baseClient.get<ClientProductListResponse>('/products', {
        params: queryParams,
        headers,
      });
      return response.data;
    } catch (err: any) {
      // Check multiple formats where error information is stored (err.response, err.data, err.status, err.message)
      const errStatus = err?.response?.status ?? err?.status;
      const errData = err?.response?.data ?? err?.data;
      const errCode = errData?.error?.code ?? errData?.code;
      const errMsg = errData?.error?.message ?? errData?.message ?? err?.message ?? '';

      const isInvalidBranch =
        (errStatus === 422 || errStatus === 400) &&
        (errCode === 'INVALID_BRANCH' || /branch/i.test(errMsg) || /branch.*belong/i.test(errMsg));

      if (isInvalidBranch) {
        console.warn('clientProductApi.getProducts: branch does not belong to current organization scope, removing branchId filter and retrying');
        // Clear stale branch id from localStorage so subsequent component calls don't repeat the error
        try {
          localStorage.setItem('active_branch', 'All');
          localStorage.removeItem('active_branch_id');
          localStorage.removeItem('active_branch_id_sales');
        } catch {}

        const fallbackParams = { ...queryParams };
        delete fallbackParams.branchId;
        delete fallbackParams.branch_id;
        const response = await baseClient.get<ClientProductListResponse>('/products', {
          params: fallbackParams,
          headers,
        });
        return response.data;
      }
      throw err;
    }
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

    const { organizationId, subOrganizationId, branchId, ...rest } = payload as any;
    const bodyPayload = {
      ...rest,
      ...(subOrganizationId ? { subOrganizationId } : {}),
      ...(branchId ? { branchId } : {}),
    };

    const response = await baseClient.post<ClientProductSingleResponse>(
      '/products',
      bodyPayload,
      {
        headers,
        params: {
          ...(organizationId ? { organizationId } : {}),
          ...(subOrganizationId ? { subOrganizationId } : {}),
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
