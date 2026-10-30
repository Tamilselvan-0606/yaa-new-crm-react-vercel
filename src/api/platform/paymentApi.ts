import { baseClient, baseApi } from '../baseApi';
import {
  PlatformPaymentListParams,
  PlatformPaymentListResponse,
  PlatformPaymentSingleResponse,
  PlatformPaymentItem,
  CreatePlatformPaymentRequest,
  DeletePlatformPaymentResponse,
} from './paymentTypes';

export * from './paymentTypes';

function getStoredOrgId(): string | undefined {
  return (
    localStorage.getItem('active_organization_id') ||
    localStorage.getItem('organizationId') ||
    undefined
  );
}

function getStoredSubOrgId(): string | undefined {
  return (
    localStorage.getItem('active_sub_organization_id') ||
    localStorage.getItem('subOrganizationId') ||
    undefined
  );
}

function getStoredBranchId(): string | undefined {
  return (
    localStorage.getItem('active_branch_id') ||
    localStorage.getItem('branchId') ||
    undefined
  );
}

export const platformPaymentEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformPayments: builder.query<PlatformPaymentListResponse, PlatformPaymentListParams | void>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        const p = params || undefined;
        const orgId = p?.organization_id || getStoredOrgId();
        const subOrgId = p?.sub_organization_id || getStoredSubOrgId();
        const branchId = p?.branch_id || getStoredBranchId();

        if (p) {
          if (p.page !== undefined) queryParams.page = p.page;
          if (p.limit !== undefined) queryParams.limit = p.limit;
          if (p.search) queryParams.search = p.search;
          if (p.product && p.product !== 'ALL') queryParams.product = p.product;
          if (p.productId || p.product_id) queryParams.product_id = p.productId || p.product_id;
          if (p.status && p.status !== 'ALL') queryParams.status = p.status;
          if (p.pagination_required !== undefined) queryParams.pagination_required = p.pagination_required;
        }

        if (orgId) queryParams.organization_id = orgId;
        if (subOrgId) queryParams.sub_organization_id = subOrgId;
        if (branchId) queryParams.branch_id = branchId;

        const headers: Record<string, string> = {};
        if (orgId) headers['x-organization-id'] = orgId;
        if (subOrgId) headers['x-sub-organization-id'] = subOrgId;
        if (branchId) headers['x-branch-id'] = branchId;

        return {
          url: '/platform/payments',
          params: queryParams,
          headers,
        };
      },
      providesTags: (result) => {
        const items = Array.isArray(result?.data)
          ? result.data
          : Array.isArray((result?.data as any)?.items)
            ? (result.data as any).items
            : [];
        return items.length > 0
          ? [
              ...items.map(({ id }: any) => ({ type: 'Payment' as const, id })),
              { type: 'Payment', id: 'LIST' },
            ]
          : [{ type: 'Payment', id: 'LIST' }];
      },
    }),

    getPlatformPaymentById: builder.query<PlatformPaymentSingleResponse, string>({
      query: (id) => ({
        url: `/platform/payments/${id}`,
        headers: getStoredOrgId() ? { 'x-organization-id': getStoredOrgId()! } : undefined,
      }),
      providesTags: (_result, _error, id) => [{ type: 'Payment', id }],
    }),

    createPlatformPayment: builder.mutation<PlatformPaymentSingleResponse, CreatePlatformPaymentRequest>({
      query: (payload) => {
        const orgId = payload.organizationId || getStoredOrgId();
        const subOrgId = payload.subOrganizationId || getStoredSubOrgId();
        const branchId = payload.branchId || getStoredBranchId();

        const headers: Record<string, string> = {};
        if (orgId) headers['x-organization-id'] = orgId;
        if (subOrgId) headers['x-sub-organization-id'] = subOrgId;
        if (branchId) headers['x-branch-id'] = branchId;

        return {
          url: '/platform/payments',
          method: 'POST',
          body: {
            ...payload,
            organizationId: orgId,
            subOrganizationId: subOrgId,
            branchId: branchId,
          },
          headers,
        };
      },
      invalidatesTags: [{ type: 'Payment', id: 'LIST' }, 'Dashboard'],
    }),

    deletePlatformPayment: builder.mutation<DeletePlatformPaymentResponse, string>({
      query: (id) => ({
        url: `/platform/payments/${id}`,
        method: 'DELETE',
        headers: getStoredOrgId() ? { 'x-organization-id': getStoredOrgId()! } : undefined,
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Payment', id },
        { type: 'Payment', id: 'LIST' },
        'Dashboard',
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPlatformPaymentsQuery,
  useGetPlatformPaymentByIdQuery,
  useCreatePlatformPaymentMutation,
  useDeletePlatformPaymentMutation,
} = platformPaymentEndpoints;

export const platformPaymentApi = {
  getPayments: async (params?: PlatformPaymentListParams): Promise<PlatformPaymentListResponse> => {
    const orgId = params?.organization_id || getStoredOrgId();
    const subOrgId = params?.sub_organization_id || getStoredSubOrgId();
    const branchId = params?.branch_id || getStoredBranchId();

    const headers: Record<string, string> = {};
    if (orgId) headers['x-organization-id'] = orgId;
    if (subOrgId) headers['x-sub-organization-id'] = subOrgId;
    if (branchId) headers['x-branch-id'] = branchId;

    const res = await baseClient.get<PlatformPaymentListResponse>('/platform/payments', {
      params: {
        ...params,
        organization_id: orgId,
        sub_organization_id: subOrgId,
        branch_id: branchId,
      },
      headers,
    });
    return res.data;
  },

  getPaymentById: async (id: string): Promise<PlatformPaymentSingleResponse> => {
    const orgId = getStoredOrgId();
    const headers: Record<string, string> = {};
    if (orgId) headers['x-organization-id'] = orgId;

    const res = await baseClient.get<PlatformPaymentSingleResponse>(`/platform/payments/${id}`, {
      headers,
    });
    return res.data;
  },

  createPayment: async (payload: CreatePlatformPaymentRequest): Promise<PlatformPaymentSingleResponse> => {
    const orgId = payload.organizationId || getStoredOrgId();
    const subOrgId = payload.subOrganizationId || getStoredSubOrgId();
    const branchId = payload.branchId || getStoredBranchId();

    const headers: Record<string, string> = {};
    if (orgId) headers['x-organization-id'] = orgId;
    if (subOrgId) headers['x-sub-organization-id'] = subOrgId;
    if (branchId) headers['x-branch-id'] = branchId;

    const res = await baseClient.post<PlatformPaymentSingleResponse>(
      '/platform/payments',
      {
        ...payload,
        organizationId: orgId,
        subOrganizationId: subOrgId,
        branchId: branchId,
      },
      { headers }
    );
    return res.data;
  },

  deletePayment: async (id: string): Promise<DeletePlatformPaymentResponse> => {
    const orgId = getStoredOrgId();
    const headers: Record<string, string> = {};
    if (orgId) headers['x-organization-id'] = orgId;

    const res = await baseClient.delete<DeletePlatformPaymentResponse>(`/platform/payments/${id}`, {
      headers,
    });
    return res.data;
  },
};
