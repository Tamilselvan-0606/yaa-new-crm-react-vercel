import { baseApi } from '../baseApi';

export interface OverviewScope {
  organizationId?: string;
  subOrganizationId?: string;
  branchId?: string;
}

interface Envelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface OverviewPeriod { from: string; to: string }
export interface Totals { total: number; active: number }

export interface PlatformOverview {
  period: OverviewPeriod;
  organizations: { total: number; active: number; inactive: number; suspended: number; createdThisMonth: number };
  subscriptions: { active: number; expiring: number; expired: number; noSubscription: number };
  organizationTypes: { all: number; client: number; sale: number; other: number };
  subOrganizationSupport: { supports: number; notSupported: number };
  subOrganizationsByOrganization: { id: string; name: string; count: number }[];
  totalSubOrganizations: number;
  planWise: { name: string; active: number; expiring: number; total: number }[];
  upcomingExpiry: {
    id: string;
    organizationId: string;
    orgName: string;
    logo: string | null;
    planName: string;
    status: string;
    endDate: string;
    daysLeft: number;
  }[];
}

/** Sections shared by the organization and sub-organization client dashboards. */
export interface ClientBusinessOverview {
  leads: {
    total: number;
    converted: number;
    funnel: { open: number; contacted: number; qualified: number; converted: number; lost: number };
  };
  subscriptions: { active: number; expiring: number; expired: number; total: number };
  payments: {
    paid: number; pending: number; overdue: number; partial: number;
    paidAmt: number; pendingAmt: number; overdueAmt: number; total: number;
  };
  productWise: { id: string; name: string; active: number }[];
  quotationsInvoices: {
    monthly: { key: string; label: string; Quotations: number; Invoices: number }[];
    totals: { quotes: number; accepted: number; invoices: number; invoiced: number; outstanding: number };
  };
  upcomingExpiries: { id: string; customerName: string | null; productName: string | null; endDate: string; daysLeft: number }[];
  upcomingFollowUps: { id: string; name: string; company: string | null; status: string; followUpDate: string | null }[];
  recentPayments: { id: string; customerName: string; amount: number; status: string; paymentDate: string | null; dueDate: string | null }[];
}

export interface OrganizationOverview extends ClientBusinessOverview {
  period: OverviewPeriod;
  structure: { subOrganizations: Totals; branches: Totals; products: Totals; clients: Totals };
}

export interface SubOrganizationOverview extends ClientBusinessOverview {
  period: OverviewPeriod;
  overview: { branches: Totals; products: Totals; clients: Totals };
  branchRows: { id: string; name: string; code: string; status: string; leads: number; converted: number; products: number }[];
}

const scopeArgs = (s: OverviewScope = {}) => {
  const headers: Record<string, string> = {};
  if (s.organizationId) headers['x-organization-id'] = s.organizationId;
  if (s.subOrganizationId) headers['x-sub-organization-id'] = s.subOrganizationId;
  if (s.branchId) headers['x-branch-id'] = s.branchId;
  return {
    params: {
      organization_id: s.organizationId,
      sub_organization_id: s.subOrganizationId,
      branch_id: s.branchId,
    },
    headers,
  };
};

export const dashboardOverviewEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformOverview: builder.query<Envelope<PlatformOverview>, void>({
      query: () => ({ url: '/platform/dashboard/overview/platform' }),
      providesTags: ['PlatformDashboard'],
    }),
    getOrganizationOverview: builder.query<Envelope<OrganizationOverview>, OverviewScope>({
      query: (scope) => ({ url: '/platform/dashboard/overview/organization', ...scopeArgs(scope) }),
      providesTags: ['PlatformDashboard'],
    }),
    getSubOrganizationOverview: builder.query<Envelope<SubOrganizationOverview>, OverviewScope>({
      query: (scope) => ({ url: '/platform/dashboard/overview/sub-organization', ...scopeArgs(scope) }),
      providesTags: ['PlatformDashboard'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPlatformOverviewQuery,
  useGetOrganizationOverviewQuery,
  useGetSubOrganizationOverviewQuery,
} = dashboardOverviewEndpoints;
