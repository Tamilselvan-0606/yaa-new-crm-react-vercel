import { baseClient } from '../baseApi';

export type SalesReportSummaryPeriod =
  | 'all'
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year';

export interface SalesReportSummaryParams {
  period?: SalesReportSummaryPeriod | string;
  from?: string;
  to?: string;
  branchId?: string;
}

export interface SalesReportSummary {
  totalSales: number;
  netSales: number;
  totalDiscount: number;
  totalTax: number;
  totalReturns: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  outstandingAmount: number;
  totalPurchases: number;
  purchaseDue: number;
  stockValuation: number;
}

export interface SalesReportSummaryResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: SalesReportSummary;
}

export const salesReportApi = {
  /**
   * Sales / purchase / stock KPI summary for the reports screens
   * GET /commerce/sales/report-summary
   */
  getReportSummary: async (
    params?: SalesReportSummaryParams,
  ): Promise<SalesReportSummaryResponse> => {
    const queryParams: Record<string, any> = {};
    if (params) {
      if (params.period) queryParams.period = params.period;
      if (params.from) queryParams.from = params.from;
      if (params.to) queryParams.to = params.to;
      if (params.branchId) queryParams.branchId = params.branchId;
    }
    const response = await baseClient.get<SalesReportSummaryResponse>(
      '/commerce/sales/report-summary',
      { params: Object.keys(queryParams).length > 0 ? queryParams : undefined },
    );
    return response.data;
  },
};
