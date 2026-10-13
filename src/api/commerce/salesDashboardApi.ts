import { baseClient, baseApi } from '../baseApi';
import {
  SalesDashboardApiResponse,
  SalesDashboardModulesParams,
  SalesDashboardModulesData,
  SalesDashboardLowStockParams,
  SalesDashboardLowStockData,
  SalesDashboardTopProductsParams,
  SalesDashboardTopProductsData,
  SalesDashboardRecentTransactionsParams,
  SalesDashboardRecentTransactionsData,
} from './salesDashboardTypes';

export * from './salesDashboardTypes';

/**
 * Builds clean query parameters object omitting empty/undefined values
 */
const buildSalesDashboardParams = (params?: Record<string, any>): Record<string, any> => {
  const queryParams: Record<string, any> = {};
  if (!params) return queryParams;

  if (params.period) queryParams.period = params.period;
  if (params.from) queryParams.from = params.from;
  if (params.to) queryParams.to = params.to;
  if (params.limit !== undefined && params.limit !== null) queryParams.limit = params.limit;
  if (params.type) queryParams.type = params.type;
  if (params.organization_id) queryParams.organization_id = params.organization_id;
  if (params.organizationId) queryParams.organization_id = params.organizationId;
  if (params.sub_organization_id) queryParams.sub_organization_id = params.sub_organization_id;
  if (params.subOrganizationId) queryParams.sub_organization_id = params.subOrganizationId;
  if (params.branch_id) queryParams.branch_id = params.branch_id;
  if (params.branchId) queryParams.branch_id = params.branchId;

  return queryParams;
};

// =========================================================================
// Direct Axios Service for Sales Dashboard
// =========================================================================

export const salesDashboardApi = {
  /**
   * Row 3: Module cards (Inventory, Sales Hub, Purchase, Sale Report)
   * GET /commerce/sales/dashboard/modules
   */
  getModules: async (
    params?: SalesDashboardModulesParams
  ): Promise<SalesDashboardApiResponse<SalesDashboardModulesData>> => {
    const response = await baseClient.get<SalesDashboardApiResponse<SalesDashboardModulesData>>(
      '/commerce/sales/dashboard/modules',
      { params: buildSalesDashboardParams(params) }
    );
    return response.data;
  },

  /**
   * Row 4: Inventory Stock Health & Critical Reorder
   * GET /commerce/sales/dashboard/low-stock
   */
  getLowStock: async (
    params?: SalesDashboardLowStockParams
  ): Promise<SalesDashboardApiResponse<SalesDashboardLowStockData>> => {
    const response = await baseClient.get<SalesDashboardApiResponse<SalesDashboardLowStockData>>(
      '/commerce/sales/dashboard/low-stock',
      { params: buildSalesDashboardParams(params) }
    );
    return response.data;
  },

  /**
   * Row 4: Top Revenue Drivers (Products)
   * GET /commerce/sales/dashboard/top-products
   */
  getTopProducts: async (
    params?: SalesDashboardTopProductsParams
  ): Promise<SalesDashboardApiResponse<SalesDashboardTopProductsData>> => {
    const response = await baseClient.get<SalesDashboardApiResponse<SalesDashboardTopProductsData>>(
      '/commerce/sales/dashboard/top-products',
      { params: buildSalesDashboardParams(params) }
    );
    return response.data;
  },

  /**
   * Row 5: Recent Operations & Transactions
   * GET /commerce/sales/dashboard/recent-transactions
   */
  getRecentTransactions: async (
    params?: SalesDashboardRecentTransactionsParams
  ): Promise<SalesDashboardApiResponse<SalesDashboardRecentTransactionsData>> => {
    const response = await baseClient.get<SalesDashboardApiResponse<SalesDashboardRecentTransactionsData>>(
      '/commerce/sales/dashboard/recent-transactions',
      { params: buildSalesDashboardParams(params) }
    );
    return response.data;
  },
};

// =========================================================================
// RTK Query Injected Endpoints for Commerce Sales Dashboard
// =========================================================================

export const salesDashboardEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSalesDashboardModules: builder.query<
      SalesDashboardApiResponse<SalesDashboardModulesData>,
      SalesDashboardModulesParams | void
    >({
      query: (params) => ({
        url: '/commerce/sales/dashboard/modules',
        params: buildSalesDashboardParams(params || {}),
      }),
      providesTags: [{ type: 'Dashboard', id: 'SALES_MODULES' }],
    }),

    getSalesDashboardLowStock: builder.query<
      SalesDashboardApiResponse<SalesDashboardLowStockData>,
      SalesDashboardLowStockParams | void
    >({
      query: (params) => ({
        url: '/commerce/sales/dashboard/low-stock',
        params: buildSalesDashboardParams(params || {}),
      }),
      providesTags: [{ type: 'Dashboard', id: 'SALES_LOW_STOCK' }],
    }),

    getSalesDashboardTopProducts: builder.query<
      SalesDashboardApiResponse<SalesDashboardTopProductsData>,
      SalesDashboardTopProductsParams | void
    >({
      query: (params) => ({
        url: '/commerce/sales/dashboard/top-products',
        params: buildSalesDashboardParams(params || {}),
      }),
      providesTags: [{ type: 'Dashboard', id: 'SALES_TOP_PRODUCTS' }],
    }),

    getSalesDashboardRecentTransactions: builder.query<
      SalesDashboardApiResponse<SalesDashboardRecentTransactionsData>,
      SalesDashboardRecentTransactionsParams | void
    >({
      query: (params) => ({
        url: '/commerce/sales/dashboard/recent-transactions',
        params: buildSalesDashboardParams(params || {}),
      }),
      providesTags: [{ type: 'Dashboard', id: 'SALES_RECENT_TRANSACTIONS' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSalesDashboardModulesQuery,
  useGetSalesDashboardLowStockQuery,
  useGetSalesDashboardTopProductsQuery,
  useGetSalesDashboardRecentTransactionsQuery,
} = salesDashboardEndpoints;
