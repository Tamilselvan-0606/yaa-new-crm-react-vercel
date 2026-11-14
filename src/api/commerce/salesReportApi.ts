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

const inFlightSummary = new Map<string, Promise<SalesReportSummaryResponse>>();

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
    // Identical requests made while one is already in flight (several widgets / re-renders asking for the same
    // range at login) share a single network call.
    const key = JSON.stringify(queryParams);
    const pending = inFlightSummary.get(key);
    if (pending) return pending;
    const request = baseClient
      .get<SalesReportSummaryResponse>('/commerce/sales/report-summary', {
        params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      })
      .then((response) => response.data)
      .finally(() => {
        inFlightSummary.delete(key);
      });
    inFlightSummary.set(key, request);
    return request;
  },
};
