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
    outstandingAmount: (() => {
      const openingBal = Number(apiCust.openingBalance) || 0;
      const raw = (apiCust as any).outstandingAmount ?? (apiCust.outstandingBalance);
      const parsed = raw !== undefined && raw !== null ? Number(raw) : NaN;
      return !isNaN(parsed) && parsed > 0 ? parsed : openingBal;
    })(),
    salesRepresentativeId: apiCust.salesRepresentativeId || (apiCust as any).salesRepresentative?.id || undefined,
    salesRepresentativeName: apiCust.salesRepresentativeName || (apiCust as any).salesRepresentative?.name || undefined,
    salesRepresentativeType: (apiCust.salesRepresentativeType as 'Primary' | 'Temporary') || undefined,
    activities: [],
    createdAt: apiCust.createdAt || new Date().toISOString(),
    updatedAt: apiCust.updatedAt || new Date().toISOString(),
  };
};

/**
 * Strips fields unrecognized by the backend /commerce/customers endpoint.
 * (e.g. salesRepresentativeId, salesRepresentativeType which belong to /commerce/collections/assign-customer).
 */
export const sanitizeCommerceCustomerPayload = <T extends Record<string, any>>(payload: T): T => {
  const sanitized = { ...payload };
  delete (sanitized as any).salesRepresentativeId;
  delete (sanitized as any).salesRepresentativeType;
  delete (sanitized as any).salesRepresentativeName;
  delete (sanitized as any).salesRepresentative;
  if (!sanitized.customerCode || !String(sanitized.customerCode).trim()) {
    delete (sanitized as any).customerCode;
  }
  return sanitized;
};

export const mapSalesCustomerToPayload = (cust: SalesCustomer): CreateCustomerPayload => {
  const cleanStr = (val?: string | null) => (val && val.trim() ? val.trim() : undefined);

  return {
    customerCode: cleanStr(cust.customerCode),
    name: cust.name.trim(),
    company: cleanStr(cust.company),
    customerType: cust.customerType === 'Individual' ? 'Individual' : 'Business',
    phone: cust.phone.trim(),
    alternatePhone: cleanStr(cust.alternatePhone),
    email: cleanStr(cust.email),
    gender: cleanStr(cust.gender),
    dateOfBirth: cleanStr(cust.dateOfBirth),
    address: cleanStr(cust.address),
    city: cleanStr(cust.city),
    state: cleanStr(cust.state),
    country: cleanStr(cust.country) || 'India',
    pincode: cleanStr(cust.pincode),
    gstNumber: cleanStr(cust.gstNumber)?.toUpperCase(),
    panNumber: cleanStr(cust.panNumber)?.toUpperCase(),
    billingAddress: cleanStr(cust.billingAddress) || cleanStr(cust.address),
    shippingAddress: cleanStr(cust.shippingAddress) || cleanStr(cust.address),
    sameAsBilling: cust.sameAsBilling ?? true,
    creditLimit: typeof cust.creditLimit === 'number' ? cust.creditLimit : Number(cust.creditLimit) || 0,
    paymentTerms: cleanStr(cust.paymentTerms) || 'Net 30 Days',
    openingBalance: typeof cust.openingBalance === 'number' ? cust.openingBalance : Number(cust.openingBalance) || 0,
    preferredPaymentMethod: cleanStr(cust.preferredPaymentMethod) || 'Bank Transfer',
    notes: cleanStr(cust.notes),
    tags: Array.isArray(cust.tags) ? cust.tags : [],
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
          if (params.page_size !== undefined) {
            queryParams.page_size = Math.min(params.page_size, 200);
          }
          if (params.pagination_required !== undefined) {
            queryParams.pagination_required = String(params.pagination_required);
          }
          if (params.search && params.search.trim()) {
            queryParams.search = params.search.trim();
          }
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
          if (params.status && params.status.toUpperCase() !== 'ALL') {
            queryParams.status = params.status;
          }
          if (params.customerType && params.customerType.toUpperCase() !== 'ALL') {
            queryParams.customerType = params.customerType;
          }
          if (params.branchId) queryParams.branchId = params.branchId;
        }
        return {
          url: '/commerce/customers',
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
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
        body: sanitizeCommerceCustomerPayload(payload),
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }, 'Dashboard'],
    }),

    updateCommerceCustomer: builder.mutation<CustomerSingleResponse, { id: string; payload: UpdateCustomerPayload }>({
      query: ({ id, payload }) => ({
        url: `/commerce/customers/${encodeURIComponent(id)}`,
        method: 'PUT',
        body: sanitizeCommerceCustomerPayload(payload),
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
        body: sanitizeCommerceCustomerPayload(payload),
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
      if (params.page_size !== undefined) {
        queryParams.page_size = Math.min(params.page_size, 200);
      }
      if (params.pagination_required !== undefined) {
        queryParams.pagination_required = String(params.pagination_required);
      }
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params.status && params.status.toUpperCase() !== 'ALL') {
        queryParams.status = params.status;
      }
      if (params.customerType && params.customerType.toUpperCase() !== 'ALL') {
        queryParams.customerType = params.customerType;
      }
      if (params.branchId) queryParams.branchId = params.branchId;
    }

    const response = await baseClient.get<CustomerListResponse>('/commerce/customers', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return response.data;
  },

  getCustomerById: async (id: string): Promise<CustomerSingleResponse> => {
    const response = await baseClient.get<CustomerSingleResponse>(`/commerce/customers/${encodeURIComponent(id)}`);
    return response.data;
  },

  createCustomer: async (payload: CreateCustomerPayload): Promise<CustomerSingleResponse> => {
    const cleanPayload = sanitizeCommerceCustomerPayload(payload);
    const response = await baseClient.post<CustomerSingleResponse>('/commerce/customers', cleanPayload);
    return response.data;
  },

  updateCustomer: async (id: string, payload: UpdateCustomerPayload): Promise<CustomerSingleResponse> => {
    const cleanPayload = sanitizeCommerceCustomerPayload(payload);
    const response = await baseClient.put<CustomerSingleResponse>(`/commerce/customers/${encodeURIComponent(id)}`, cleanPayload);
    return response.data;
  },

  patchCustomer: async (id: string, payload: Partial<UpdateCustomerPayload>): Promise<CustomerSingleResponse> => {
    const cleanPayload = sanitizeCommerceCustomerPayload(payload);
    const response = await baseClient.patch<CustomerSingleResponse>(`/commerce/customers/${encodeURIComponent(id)}`, cleanPayload);
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
