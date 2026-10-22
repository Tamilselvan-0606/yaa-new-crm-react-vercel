import { baseClient } from '../baseApi';
import { getStoredOrganizationId } from '../config';
import {
  ApiSalesRepresentative,
  ApiRepPortfolio,
  SalesRepListResponse,
  SalesRepSingleResponse,
  SalesRepPortfolioResponse,
  CreateSalesRepPayload,
  UpdateSalesRepPayload,
  SalesRepListParams,
} from './salesRepresentativeTypes';

export * from './salesRepresentativeTypes';

export const salesRepresentativeApi = {
  /**
   * List all sales representatives with performance metrics
   * GET /commerce/sales-representatives
   */
  getList: async (params?: SalesRepListParams): Promise<SalesRepListResponse> => {
    const queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.search?.trim()) queryParams.search = params.search.trim();
    if (params?.status && params.status !== 'ALL') queryParams.status = params.status;

    const response = await baseClient.get<SalesRepListResponse>(
      '/commerce/sales-representatives',
      { params: queryParams }
    );
    return response.data;
  },

  /**
   * Create a new sales representative (with login user in the same transaction)
   * POST /commerce/sales-representatives
   */
  create: async (payload: CreateSalesRepPayload): Promise<SalesRepSingleResponse> => {
    const response = await baseClient.post<SalesRepSingleResponse>(
      '/commerce/sales-representatives',
      payload
    );
    return response.data;
  },

  /**
   * Get the logged-in sales representative's own portfolio
   * GET /commerce/sales-representatives/me
   */
  getMyPortfolio: async (): Promise<SalesRepPortfolioResponse> => {
    const response = await baseClient.get<SalesRepPortfolioResponse>(
      '/commerce/sales-representatives/me'
    );
    return response.data;
  },

  /**
   * Get a specific sales representative by ID
   * GET /commerce/sales-representatives/{id}
   */
  getById: async (id: string): Promise<SalesRepSingleResponse> => {
    const response = await baseClient.get<SalesRepSingleResponse>(
      `/commerce/sales-representatives/${id}`
    );
    return response.data;
  },

  /**
   * Get the full portfolio (customers, invoices, follow-ups, history) for a rep
   * GET /commerce/sales-representatives/{id}/portfolio
   */
  getPortfolio: async (id: string): Promise<SalesRepPortfolioResponse> => {
    const response = await baseClient.get<SalesRepPortfolioResponse>(
      `/commerce/sales-representatives/${id}/portfolio`
    );
    return response.data;
  },

  /**
   * Update an existing sales representative
   * PUT /commerce/sales-representatives/{id}
   */
  update: async (
    id: string,
    payload: UpdateSalesRepPayload,
    organizationId?: string
  ): Promise<SalesRepSingleResponse> => {
    const cleanId = encodeURIComponent(id);
    const orgId = organizationId || getStoredOrganizationId();
    const config: any = {};
    if (orgId) {
      config.headers = { 'x-organization-id': orgId };
    }
    const endpoints = [
      { method: 'put', url: `/commerce/sales-representatives/${cleanId}` },
      { method: 'patch', url: `/commerce/sales-representatives/${cleanId}` },
    ];
    let lastError: any = null;
    for (const ep of endpoints) {
      try {
        const response = ep.method === 'put'
          ? await baseClient.put<SalesRepSingleResponse>(ep.url, payload, config)
          : await baseClient.patch<SalesRepSingleResponse>(ep.url, payload, config);
        return response.data;
      } catch (err: any) {
        lastError = err;
        if (err?.response?.status === 404 || err?.response?.status === 405) {
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  },

  /**
   * Partially update a sales representative
   * PATCH /commerce/sales-representatives/{id}
   */
  patch: async (id: string, payload: Partial<UpdateSalesRepPayload>): Promise<SalesRepSingleResponse> => {
    const response = await baseClient.patch<SalesRepSingleResponse>(
      `/commerce/sales-representatives/${encodeURIComponent(id)}`,
      payload
    );
    return response.data;
  },

  /**
   * Delete a sales representative
   * DELETE /commerce/sales-representatives/{id}
   */
  remove: async (id: string): Promise<{ success: boolean; message?: string }> => {
    const response = await baseClient.delete(
      `/commerce/sales-representatives/${id}`
    );
    return response.data;
  },
};
