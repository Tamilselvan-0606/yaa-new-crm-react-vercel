import { baseClient, baseApi } from '../baseApi';
import { Supplier, SupplierStatus } from '../../store/useSalesManagementStore';
import {
  ApiSupplier,
  SupplierFilterParams,
  SupplierListResponse,
  SupplierSingleResponse,
  SupplierDeleteResponse,
  CreateSupplierPayload,
  UpdateSupplierPayload,
} from './supplierTypes';

export * from './supplierTypes';

/**
 * Maps raw ApiSupplier from backend to the frontend Supplier interface
 */
export const mapApiSupplierToSupplier = (apiSup: ApiSupplier): Supplier => {
  return {
    id: apiSup.id,
    supplierCode: apiSup.supplierCode || 'SUP-0001',
    name: apiSup.name || 'Unnamed Supplier',
    contactPerson: apiSup.contactPerson || apiSup.name || '',
    phone: apiSup.phone || '',
    email: apiSup.email || '',
    address: apiSup.address || '',
    city: apiSup.city || '',
    state: apiSup.state || '',
    country: apiSup.country || 'India',
    pincode: apiSup.pincode || '',
    gstNumber: apiSup.gstNumber || '',
    panNumber: apiSup.panNumber || '',
    paymentTerms: apiSup.paymentTerms || 'Net 30 Days',
    creditLimit: Number(apiSup.creditLimit) || 0,
    bankName: apiSup.bankName || '',
    accountNumber: apiSup.accountNumber || '',
    ifscCode: apiSup.ifscCode || '',
    branchName: apiSup.branchName || '',
    status: (apiSup.status as SupplierStatus) || 'Active',
    notes: apiSup.notes || '',
    totalPurchase: Number(apiSup.totalPurchase) || 0,
    paid: Number(apiSup.paid) || 0,
    payable: Number(apiSup.payable) || 0,
    createdAt: apiSup.createdAt || new Date().toISOString(),
    updatedAt: apiSup.updatedAt || new Date().toISOString(),
  };
};

/**
 * Maps frontend Supplier model to CreateSupplierPayload
 */
export const mapSupplierToPayload = (sup: Supplier | Partial<Supplier>): CreateSupplierPayload => {
  const payload: CreateSupplierPayload = {
    name: sup.name?.trim() || '',
    phone: sup.phone?.trim() || '',
    address: sup.address?.trim() || '',
    city: sup.city?.trim() || '',
    state: sup.state?.trim() || '',
    country: sup.country?.trim() || 'India',
    pincode: sup.pincode?.trim() || '',
    status: sup.status || 'Active',
  };

  if ((sup as any).company?.trim()) payload.company = (sup as any).company.trim();
  if (sup.email?.trim()) payload.email = sup.email.trim();
  if (sup.gstNumber?.trim()) payload.gstNumber = sup.gstNumber.trim();
  if (sup.panNumber?.trim()) payload.panNumber = sup.panNumber.trim();
  if (sup.paymentTerms?.trim()) payload.paymentTerms = sup.paymentTerms.trim();

  return payload;
};

// =========================================================================
// RTK Query Injected Endpoints for Work / Commerce Suppliers
// =========================================================================

export const supplierEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query<SupplierListResponse, SupplierFilterParams | void>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params) {
          if (params.page !== undefined) queryParams.page = params.page;
          if (params.limit !== undefined) queryParams.limit = params.limit;
          if (params.page_no !== undefined) queryParams.page_no = params.page_no;
          if (params.page_size !== undefined) queryParams.page_size = params.page_size;
          if (params.pagination_required !== undefined) {
            queryParams.pagination_required = String(params.pagination_required);
          }
          if (params.search && params.search.trim()) {
            queryParams.search = params.search.trim();
          }
          if (params.status && params.status !== 'All' && params.status !== 'ALL') {
            queryParams.status = params.status;
          }
          if (params.organization_id) queryParams.organization_id = params.organization_id;
          if (params.sub_organization_id) queryParams.sub_organization_id = params.sub_organization_id;
          if (params.branch_id) queryParams.branch_id = params.branch_id;
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
        }
        return {
          url: '/work/suppliers',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Supplier' as const, id })),
              { type: 'Supplier', id: 'LIST' },
            ]
          : [{ type: 'Supplier', id: 'LIST' }],
    }),

    getSupplierById: builder.query<SupplierSingleResponse, string>({
      query: (id) => `/work/suppliers/${encodeURIComponent(id)}`,
      providesTags: (_result, _error, id) => [{ type: 'Supplier', id }],
    }),

    createSupplier: builder.mutation<SupplierSingleResponse, CreateSupplierPayload>({
      query: (payload) => ({
        url: '/work/suppliers',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Supplier', id: 'LIST' }, 'Dashboard'],
    }),

    updateSupplier: builder.mutation<SupplierSingleResponse, { id: string; payload: UpdateSupplierPayload }>({
      query: ({ id, payload }) => ({
        url: `/work/suppliers/${encodeURIComponent(id)}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Supplier', id },
        { type: 'Supplier', id: 'LIST' },
      ],
    }),

    patchSupplier: builder.mutation<SupplierSingleResponse, { id: string; payload: Partial<UpdateSupplierPayload> }>({
      query: ({ id, payload }) => ({
        url: `/work/suppliers/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Supplier', id },
        { type: 'Supplier', id: 'LIST' },
      ],
    }),

    deleteSupplier: builder.mutation<SupplierDeleteResponse, string>({
      query: (id) => ({
        url: `/work/suppliers/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Supplier', id: 'LIST' }, 'Dashboard'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSuppliersQuery,
  useGetSupplierByIdQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  usePatchSupplierMutation,
  useDeleteSupplierMutation,
} = supplierEndpoints;

/**
 * Supplier API Service
 * Interacts with /work/suppliers endpoints with automatic JWT token & x-organization-id injection.
 */
export const supplierApi = {
  getSuppliers: async (params?: SupplierFilterParams): Promise<SupplierListResponse> => {
    const queryParams: Record<string, any> = {};

    if (params) {
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.page_no !== undefined) queryParams.page_no = params.page_no;
      if (params.page_size !== undefined) queryParams.page_size = params.page_size;
      if (params.pagination_required !== undefined) {
        queryParams.pagination_required = String(params.pagination_required);
      }
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params.status && params.status !== 'All' && params.status !== 'ALL') {
        queryParams.status = params.status;
      }
      if (params.organization_id) queryParams.organization_id = params.organization_id;
      if (params.sub_organization_id) queryParams.sub_organization_id = params.sub_organization_id;
      if (params.branch_id) queryParams.branch_id = params.branch_id;
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
    }

    const response = await baseClient.get<SupplierListResponse>('/work/suppliers', {
      params: queryParams,
    });
    return response.data;
  },

  getSupplierById: async (id: string): Promise<SupplierSingleResponse> => {
    const response = await baseClient.get<SupplierSingleResponse>(`/work/suppliers/${encodeURIComponent(id)}`);
    return response.data;
  },

  createSupplier: async (payload: CreateSupplierPayload): Promise<SupplierSingleResponse> => {
    const response = await baseClient.post<SupplierSingleResponse>('/work/suppliers', payload);
    return response.data;
  },

  updateSupplier: async (id: string, payload: UpdateSupplierPayload): Promise<SupplierSingleResponse> => {
    const response = await baseClient.put<SupplierSingleResponse>(`/work/suppliers/${encodeURIComponent(id)}`, payload);
    return response.data;
  },

  patchSupplier: async (id: string, payload: Partial<UpdateSupplierPayload>): Promise<SupplierSingleResponse> => {
    const response = await baseClient.patch<SupplierSingleResponse>(`/work/suppliers/${encodeURIComponent(id)}`, payload);
    return response.data;
  },

  deleteSupplier: async (id: string): Promise<SupplierDeleteResponse> => {
    const response = await baseClient.delete<SupplierDeleteResponse>(`/work/suppliers/${encodeURIComponent(id)}`);
    return response.data;
  },
};
