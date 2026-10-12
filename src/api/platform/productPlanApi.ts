import { baseClient, baseApi } from '../baseApi';
import { getStoredOrganizationId } from '../config';
import {
  ProductPlanApiItem,
  ProductPlanListParams,
  ProductPlanListResponse,
  ProductPlanSingleResponse,
  ProductPlanDeleteResponse,
  CreateProductPlanRequest,
  UpdateProductPlanRequest,
  PatchProductPlanRequest,
} from './productPlanTypes';

export * from './productPlanTypes';

export const productPlanEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProductPlans: builder.query<
      ProductPlanListResponse,
      { productId: string; params?: ProductPlanListParams; orgId?: string }
    >({
      query: ({ productId, params, orgId }) => {
        const queryParams: Record<string, any> = {};
        if (params?.status && params.status !== 'All') {
          queryParams.status = params.status;
        }

        const activeOrgId = orgId || params?.xOrganizationId || getStoredOrganizationId();
        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['x-organization-id'] = activeOrgId;
        }

        return {
          url: `/products/${encodeURIComponent(productId)}/plans`,
          params: queryParams,
          headers,
        };
      },
      providesTags: (result, _error, { productId }) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'ProductPlan' as const, id })),
              { type: 'ProductPlan', id: `LIST_${productId}` },
            ]
          : [{ type: 'ProductPlan', id: `LIST_${productId}` }],
    }),

    getProductPlanById: builder.query<
      ProductPlanSingleResponse,
      { productId: string; planId: string; orgId?: string }
    >({
      query: ({ productId, planId, orgId }) => {
        const activeOrgId = orgId || getStoredOrganizationId();
        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['x-organization-id'] = activeOrgId;
        }

        return {
          url: `/products/${encodeURIComponent(productId)}/plans/${encodeURIComponent(planId)}`,
          headers,
        };
      },
      providesTags: (_result, _error, { planId }) => [{ type: 'ProductPlan', id: planId }],
    }),

    createProductPlan: builder.mutation<
      ProductPlanSingleResponse,
      { productId: string; payload: CreateProductPlanRequest; orgId?: string }
    >({
      query: ({ productId, payload, orgId }) => {
        const activeOrgId = orgId || getStoredOrganizationId();
        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['x-organization-id'] = activeOrgId;
        }

        return {
          url: `/products/${encodeURIComponent(productId)}/plans`,
          method: 'POST',
          body: payload,
          headers,
        };
      },
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'ProductPlan', id: `LIST_${productId}` },
      ],
    }),

    updateProductPlan: builder.mutation<
      ProductPlanSingleResponse,
      { productId: string; planId: string; payload: UpdateProductPlanRequest; orgId?: string }
    >({
      query: ({ productId, planId, payload, orgId }) => {
        const activeOrgId = orgId || getStoredOrganizationId();
        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['x-organization-id'] = activeOrgId;
        }

        return {
          url: `/products/${encodeURIComponent(productId)}/plans/${encodeURIComponent(planId)}`,
          method: 'PUT',
          body: payload,
          headers,
        };
      },
      invalidatesTags: (_result, _error, { productId, planId }) => [
        { type: 'ProductPlan', id: planId },
        { type: 'ProductPlan', id: `LIST_${productId}` },
      ],
    }),

    patchProductPlan: builder.mutation<
      ProductPlanSingleResponse,
      { productId: string; planId: string; payload: PatchProductPlanRequest; orgId?: string }
    >({
      query: ({ productId, planId, payload, orgId }) => {
        const activeOrgId = orgId || getStoredOrganizationId();
        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['x-organization-id'] = activeOrgId;
        }

        return {
          url: `/products/${encodeURIComponent(productId)}/plans/${encodeURIComponent(planId)}`,
          method: 'PATCH',
          body: payload,
          headers,
        };
      },
      invalidatesTags: (_result, _error, { productId, planId }) => [
        { type: 'ProductPlan', id: planId },
        { type: 'ProductPlan', id: `LIST_${productId}` },
      ],
    }),

    deleteProductPlan: builder.mutation<
      ProductPlanDeleteResponse,
      { productId: string; planId: string; orgId?: string }
    >({
      query: ({ productId, planId, orgId }) => {
        const activeOrgId = orgId || getStoredOrganizationId();
        const headers: Record<string, string> = {};
        if (activeOrgId) {
          headers['x-organization-id'] = activeOrgId;
        }

        return {
          url: `/products/${encodeURIComponent(productId)}/plans/${encodeURIComponent(planId)}`,
          method: 'DELETE',
          headers,
        };
      },
      invalidatesTags: (_result, _error, { productId, planId }) => [
        { type: 'ProductPlan', id: planId },
        { type: 'ProductPlan', id: `LIST_${productId}` },
      ],
    }),
  }),
});

export const {
  useGetProductPlansQuery,
  useGetProductPlanByIdQuery,
  useCreateProductPlanMutation,
  useUpdateProductPlanMutation,
  usePatchProductPlanMutation,
  useDeleteProductPlanMutation,
} = productPlanEndpoints;

/**
 * Direct async service client with axios
 */
export const productPlanApi = {
  /**
   * GET /products/:productId/plans
   */
  getProductPlans: async (
    productId: string,
    params?: ProductPlanListParams,
    orgId?: string
  ): Promise<ProductPlanListResponse> => {
    const activeOrgId = orgId || params?.xOrganizationId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const queryParams: Record<string, any> = {};
    if (params?.status && params.status !== 'All') {
      queryParams.status = params.status;
    }

    const response = await baseClient.get<ProductPlanListResponse>(
      `/products/${encodeURIComponent(productId)}/plans`,
      {
        params: queryParams,
        headers,
      }
    );
    return response.data;
  },

  /**
   * GET /products/:productId/plans/:planId
   */
  getProductPlanById: async (
    productId: string,
    planId: string,
    orgId?: string
  ): Promise<ProductPlanSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const response = await baseClient.get<ProductPlanSingleResponse>(
      `/products/${encodeURIComponent(productId)}/plans/${encodeURIComponent(planId)}`,
      { headers }
    );
    return response.data;
  },

  /**
   * POST /products/:productId/plans
   */
  createProductPlan: async (
    productId: string,
    payload: CreateProductPlanRequest,
    orgId?: string
  ): Promise<ProductPlanSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const response = await baseClient.post<ProductPlanSingleResponse>(
      `/products/${encodeURIComponent(productId)}/plans`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * PUT /products/:productId/plans/:planId
   */
  updateProductPlan: async (
    productId: string,
    planId: string,
    payload: UpdateProductPlanRequest,
    orgId?: string
  ): Promise<ProductPlanSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const response = await baseClient.put<ProductPlanSingleResponse>(
      `/products/${encodeURIComponent(productId)}/plans/${encodeURIComponent(planId)}`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * PATCH /products/:productId/plans/:planId
   */
  patchProductPlan: async (
    productId: string,
    planId: string,
    payload: PatchProductPlanRequest,
    orgId?: string
  ): Promise<ProductPlanSingleResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const response = await baseClient.patch<ProductPlanSingleResponse>(
      `/products/${encodeURIComponent(productId)}/plans/${encodeURIComponent(planId)}`,
      payload,
      { headers }
    );
    return response.data;
  },

  /**
   * DELETE /products/:productId/plans/:planId
   */
  deleteProductPlan: async (
    productId: string,
    planId: string,
    orgId?: string
  ): Promise<ProductPlanDeleteResponse> => {
    const activeOrgId = orgId || getStoredOrganizationId();
    const headers: Record<string, string> = {};
    if (activeOrgId) {
      headers['x-organization-id'] = activeOrgId;
    }

    const response = await baseClient.delete<ProductPlanDeleteResponse>(
      `/products/${encodeURIComponent(productId)}/plans/${encodeURIComponent(planId)}`,
      { headers }
    );
    return response.data;
  },
};
