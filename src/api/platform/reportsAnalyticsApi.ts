import { baseApi } from '../baseApi';

export type ReportsRange = '30d' | '90d' | '1y';

export interface ReportsAnalyticsParams {
  range: ReportsRange;
  organizationId?: string;
  subOrganizationId?: string;
  branchId?: string;
}

export interface ReportsAnalytics {
  range: ReportsRange;
  rangeLabel: string;
  from: string;
  to: string;
  kpis: {
    totalRevenue: number;
    previousRevenue: number;
    /** null when there was no revenue in the prior period to compare against. */
    revenueChangePercent: number | null;
    leadConversionRate: number;
    leadsConverted: number;
    leadsTotal: number;
    avgRevenuePerClient: number;
    payingClients: number;
    collectionRate: number;
    totalBilled: number;
  };
  revenueByProduct: { name: string; value: number }[];
  revenueTrend: {
    products: string[];
    rows: ({ key: string; month: string } & Record<string, string | number>)[];
  };
  funnel: { stage: string; count: number; percentage: number }[];
  paymentStatus: { name: string; value: number }[];
  subscriptionsByProduct: { name: string; active: number; expiring: number; expired: number; value: number }[];
  topClients: { name: string; payments: number; total: number }[];
}

export interface ReportsAnalyticsResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ReportsAnalytics;
}

export const reportsAnalyticsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReportsAnalytics: builder.query<ReportsAnalyticsResponse, ReportsAnalyticsParams>({
      query: ({ range, organizationId, subOrganizationId, branchId }) => {
        const headers: Record<string, string> = {};
        if (organizationId) headers['x-organization-id'] = organizationId;
        if (subOrganizationId) headers['x-sub-organization-id'] = subOrganizationId;
        if (branchId) headers['x-branch-id'] = branchId;
        return {
          url: '/platform/dashboard/reports/analytics',
          params: {
            range,
            organization_id: organizationId,
            sub_organization_id: subOrganizationId,
            branch_id: branchId,
          },
          headers,
        };
      },
      providesTags: ['Dashboard'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetReportsAnalyticsQuery } = reportsAnalyticsEndpoints;
