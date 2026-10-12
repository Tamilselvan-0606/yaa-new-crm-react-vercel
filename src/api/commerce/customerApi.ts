import { baseClient, baseApi } from '../baseApi';
import { CustomerStatus, CustomerType, SalesCustomer } from '../../store/useSalesManagementStore';
import {
  ApiCustomer,
  CustomerFilterParams,
  CustomerListResponse,
  CustomerSingleResponse,
  CustomerDeleteResponse,
  CustomerLedgerResponse,
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from './customerTypes';

export * from './customerTypes';

export const mapApiCustomerToSalesCustomer = (apiCust: ApiCustomer): SalesCustomer => {
  return {
    id: apiCust.id,
    customerCode: apiCust.customerCode || 'CUST-0001',
    name: apiCust.name || 'Unnamed Customer',
    company: apiCust.company || '',
    customerType: (apiCust.customerType as CustomerType) || 'Business',
    phone: apiCust.phone || '',
    alternatePhone: apiCust.alternatePhone || '',
    email: apiCust.email || '',
    gender: apiCust.gender || 'Not Specified',
    dateOfBirth: apiCust.dateOfBirth || '',
    address: apiCust.address || '',
    city: apiCust.city || '',
    state: apiCust.state || '',
    country: apiCust.country || 'India',
    pincode: apiCust.pincode || '',
    gstNumber: apiCust.gstNumber || '',
    panNumber: apiCust.panNumber || '',
    billingAddress: apiCust.billingAddress || apiCust.address || '',
    shippingAddress: apiCust.shippingAddress || apiCust.address || '',
    sameAsBilling: apiCust.sameAsBilling ?? true,
    creditLimit: Number(apiCust.creditLimit) || 0,
    paymentTerms: apiCust.paymentTerms || 'Net 30 Days',
    openingBalance: Number(apiCust.openingBalance) || 0,
    preferredPaymentMethod: apiCust.preferredPaymentMethod || 'Bank Transfer',
    notes: apiCust.notes || '',
    tags: Array.isArray(apiCust.tags) ? apiCust.tags : [],
    status: (apiCust.status as CustomerStatus) || 'Active',
    totalSales: (apiCust as any).totalSales ?? 0,
    paidAmount: (apiCust as any).paidAmount ?? 0,
    outstandingAmount: (apiCust as any).outstandingAmount ?? (apiCust.outstandingBalance || 0),
    activities: [],
    createdAt: apiCust.createdAt || new Date().toISOString(),
    updatedAt: apiCust.updatedAt || new Date().toISOString(),
  };
};

export const mapSalesCustomerToPayload = (cust: SalesCustomer): CreateCustomerPayload => {
  return {
    customerCode: cust.customerCode || undefined,
    name: cust.name,
    company: cust.company || undefined,
    customerType: cust.customerType === 'Individual' ? 'Individual' : 'Business',
    phone: cust.phone,
    alternatePhone: cust.alternatePhone || undefined,
    email: cust.email || undefined,
    gender: cust.gender || undefined,
    dateOfBirth: cust.dateOfBirth || undefined,
    address: cust.address || undefined,
    city: cust.city || undefined,
    state: cust.state || undefined,
    country: cust.country || 'India',
    pincode: cust.pincode || undefined,
    gstNumber: cust.gstNumber || undefined,
    panNumber: cust.panNumber || undefined,
    billingAddress: cust.billingAddress || cust.address || undefined,
    shippingAddress: cust.shippingAddress || cust.address || undefined,
    sameAsBilling: cust.sameAsBilling ?? true,
    creditLimit: cust.creditLimit ?? 0,
    paymentTerms: cust.paymentTerms || 'Net 30 Days',
    openingBalance: cust.openingBalance ?? 0,
    preferredPaymentMethod: cust.preferredPaymentMethod || 'Bank Transfer',
    notes: cust.notes || undefined,
    tags: cust.tags || [],
    status: cust.status || 'Active',
  };
};

// =========================================================================
// RTK Query Injected Endpoints for Commerce Customer
// =========================================================================

export const customerEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommerceCustomers: builder.query<CustomerListResponse, CustomerFilterParams | void>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params) {
          if (params.page_no !== undefined) queryParams.page_no = params.page_no;
          if (params.page_size !== undefined) queryParams.page_size = params.page_size;
          if (params.pagination_required !== undefined) {
            queryParams.pagination_required = String(params.pagination_required);
          }
          if (params.search && params.search.trim()) {
            queryParams.search = params.search.trim();
          }
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
          if (params.status && params.status !== 'All') {
            queryParams.status = params.status;
          }
          if (params.customerType && params.customerType !== 'All') {
            queryParams.customerType = params.customerType;
          }
          if (params.branchId) queryParams.branchId = params.branchId;
        }
        return {
          url: '/commerce/customers',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Customer' as const, id })),
              { type: 'Customer', id: 'LIST' },
            ]
          : [{ type: 'Customer', id: 'LIST' }],
    }),

    getCommerceCustomerById: builder.query<CustomerSingleResponse, string>({
      query: (id) => `/commerce/customers/${encodeURIComponent(id)}`,
      providesTags: (_result, _error, id) => [{ type: 'Customer', id }],
    }),

    createCommerceCustomer: builder.mutation<CustomerSingleResponse, CreateCustomerPayload>({
      query: (payload) => ({
        url: '/commerce/customers',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }, 'Dashboard'],
    }),

    updateCommerceCustomer: builder.mutation<CustomerSingleResponse, { id: string; payload: UpdateCustomerPayload }>({
      query: ({ id, payload }) => ({
        url: `/commerce/customers/${encodeURIComponent(id)}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Customer', id },
        { type: 'Customer', id: 'LIST' },
        'Dashboard',
      ],
    }),

    patchCommerceCustomer: builder.mutation<CustomerSingleResponse, { id: string; payload: Partial<UpdateCustomerPayload> }>({
      query: ({ id, payload }) => ({
        url: `/commerce/customers/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Customer', id },
        { type: 'Customer', id: 'LIST' },
      ],
    }),

    deleteCommerceCustomer: builder.mutation<CustomerDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/customers/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }, 'Dashboard'],
    }),

    getCommerceCustomerLedger: builder.query<CustomerLedgerResponse, string>({
      query: (id) => `/commerce/customers/${encodeURIComponent(id)}/ledger`,
      providesTags: (_result, _error, id) => [{ type: 'Customer', id: `LEDGER_${id}` }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCommerceCustomersQuery,
  useGetCommerceCustomerByIdQuery,
  useCreateCommerceCustomerMutation,
  useUpdateCommerceCustomerMutation,
  usePatchCommerceCustomerMutation,
  useDeleteCommerceCustomerMutation,
  useGetCommerceCustomerLedgerQuery,
} = customerEndpoints;

/**
 * Commerce Customer API Service
 * Interacts with /commerce/customers endpoints with automatic JWT token & x-organization-id injection.
 */
export const customerApi = {
  getCustomers: async (params?: CustomerFilterParams): Promise<CustomerListResponse> => {
    const queryParams: Record<string, any> = {};

    if (params) {
      if (params.page_no !== undefined) queryParams.page_no = params.page_no;
      if (params.page_size !== undefined) queryParams.page_size = params.page_size;
      if (params.pagination_required !== undefined) {
        queryParams.pagination_required = String(params.pagination_required);
      }
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params.status && params.status !== 'All') {
        queryParams.status = params.status;
      }
      if (params.customerType && params.customerType !== 'All') {
        queryParams.customerType = params.customerType;
      }
      if (params.branchId) queryParams.branchId = params.branchId;
    }

    const response = await baseClient.get<CustomerListResponse>('/commerce/customers', {
      params: queryParams,
    });
    return response.data;
  },

  getCustomerById: async (id: string): Promise<CustomerSingleResponse> => {
    const response = await baseClient.get<CustomerSingleResponse>(`/commerce/customers/${encodeURIComponent(id)}`);
    return response.data;
  },

  createCustomer: async (payload: CreateCustomerPayload): Promise<CustomerSingleResponse> => {
    const response = await baseClient.post<CustomerSingleResponse>('/commerce/customers', payload);
    return response.data;
  },

  updateCustomer: async (id: string, payload: UpdateCustomerPayload): Promise<CustomerSingleResponse> => {
    const response = await baseClient.put<CustomerSingleResponse>(`/commerce/customers/${encodeURIComponent(id)}`, payload);
    return response.data;
  },

  patchCustomer: async (id: string, payload: Partial<UpdateCustomerPayload>): Promise<CustomerSingleResponse> => {
    const response = await baseClient.patch<CustomerSingleResponse>(`/commerce/customers/${encodeURIComponent(id)}`, payload);
    return response.data;
  },

  deleteCustomer: async (id: string): Promise<CustomerDeleteResponse> => {
    const response = await baseClient.delete<CustomerDeleteResponse>(`/commerce/customers/${encodeURIComponent(id)}`);
    return response.data;
  },

  getCustomerLedger: async (id: string): Promise<CustomerLedgerResponse> => {
    const response = await baseClient.get<CustomerLedgerResponse>(`/commerce/customers/${encodeURIComponent(id)}/ledger`);
    return response.data;
  },
};
