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
  CustomerBulkUploadResponse,
  CustomerBulkUploadResult,
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
    paymentTerms: apiCust.paymentTerms || (apiCust as any).paymentDuePeriod || 'Net 30 Days',
    paymentDuePeriod: (apiCust as any).paymentDuePeriod || apiCust.paymentTerms || 'Net 30 Days',
    openingBalance: Number(apiCust.openingBalance) || 0,
    preferredPaymentMethod: apiCust.preferredPaymentMethod || 'Bank Transfer',
    notes: apiCust.notes || '',
    tags: Array.isArray(apiCust.tags) ? apiCust.tags : [],
    status: (apiCust.status as CustomerStatus) || 'Active',
    totalSales: (apiCust as any).totalSales ?? 0,
    paidAmount: (apiCust as any).paidAmount ?? 0,
    paidAmountDate:
      (apiCust as any).paidAmountDate ||
      (apiCust as any).lastPaymentDate ||
      (apiCust as any).paidDate ||
      (apiCust as any).lastPayment?.date ||
      (apiCust as any).paymentDate ||
      null,
    lastPaymentDate:
      (apiCust as any).lastPaymentDate ||
      (apiCust as any).paidAmountDate ||
      (apiCust as any).paidDate ||
      (apiCust as any).lastPayment?.date ||
      null,
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
  const sanitized: Record<string, any> = {};

  const forbiddenKeys = new Set([
    'salesRepresentativeId',
    'salesRepresentativeType',
    'salesRepresentativeName',
    'salesRepresentative',
    'paymentDuePeriod',
    'id',
    'activities',
    'createdAt',
    'updatedAt',
    'totalSales',
    'paidAmount',
    'paidAmountDate',
    'lastPaymentDate',
    'outstandingAmount',
    'outstandingBalance',
  ]);

  for (const [key, value] of Object.entries(payload)) {
    if (forbiddenKeys.has(key)) {
      continue;
    }
    // Only pass values that were actually entered
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) continue;
      sanitized[key] = trimmed;
      continue;
    }
    if (typeof value === 'number') {
      if (isNaN(value)) continue;
      // Do not pass zero or negative defaults for credit limit or opening balance unless entered as positive number
      if ((key === 'creditLimit' || key === 'openingBalance') && value <= 0) {
        continue;
      }
      sanitized[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      const filtered = value.map((v) => (typeof v === 'string' ? v.trim() : v)).filter(Boolean);
      if (filtered.length === 0) continue;
      sanitized[key] = filtered;
      continue;
    }
    sanitized[key] = value;
  }

  // Ensure forbidden keys are guaranteed to be absent
  delete (sanitized as any).paymentDuePeriod;
  delete (sanitized as any).salesRepresentativeId;
  delete (sanitized as any).salesRepresentativeType;
  delete (sanitized as any).salesRepresentativeName;
  delete (sanitized as any).salesRepresentative;

  return sanitized as T;
};

export const mapSalesCustomerToPayload = (cust: SalesCustomer): CreateCustomerPayload => {
  const cleanStr = (val?: string | null) => (val && val.trim() ? val.trim() : undefined);

  const payload: CreateCustomerPayload = {
    name: cust.name.trim(),
    phone: cust.phone.trim(),
    customerType: cust.customerType === 'Individual' ? 'Individual' : 'Business',
  };

  const code = cleanStr(cust.customerCode);
  if (code) payload.customerCode = code;

  const company = cleanStr(cust.company);
  if (company) payload.company = company;

  const altPhone = cleanStr(cust.alternatePhone);
  if (altPhone) payload.alternatePhone = altPhone;

  const email = cleanStr(cust.email);
  if (email) payload.email = email;

  const gender = cleanStr(cust.gender);
  if (gender) payload.gender = gender;

  const dob = cleanStr(cust.dateOfBirth);
  if (dob) payload.dateOfBirth = dob;

  const addr = cleanStr(cust.address);
  if (addr) payload.address = addr;

  const city = cleanStr(cust.city);
  if (city) payload.city = city;

  const state = cleanStr(cust.state);
  if (state) payload.state = state;

  const country = cleanStr(cust.country);
  if (country) payload.country = country;

  const pin = cleanStr(cust.pincode);
  if (pin) payload.pincode = pin;

  const gst = cleanStr(cust.gstNumber);
  if (gst) payload.gstNumber = gst.toUpperCase();

  const pan = cleanStr(cust.panNumber);
  if (pan) payload.panNumber = pan.toUpperCase();

  const bill = cleanStr(cust.billingAddress);
  if (bill) payload.billingAddress = bill;

  const ship = cleanStr(cust.shippingAddress);
  if (ship) payload.shippingAddress = ship;

  if (typeof cust.sameAsBilling === 'boolean') {
    payload.sameAsBilling = cust.sameAsBilling;
  }

  if (cust.creditLimit !== undefined && cust.creditLimit !== null && cust.creditLimit !== ('' as any)) {
    const num = Number(cust.creditLimit);
    if (!isNaN(num) && num > 0) {
      payload.creditLimit = num;
    }
  }

  const terms = cleanStr(cust.paymentTerms) || cleanStr((cust as any).paymentDuePeriod);
  if (terms) payload.paymentTerms = terms;

  if (cust.openingBalance !== undefined && cust.openingBalance !== null && cust.openingBalance !== ('' as any)) {
    const num = Number(cust.openingBalance);
    if (!isNaN(num) && num > 0) {
      payload.openingBalance = num;
    }
  }

  const method = cleanStr(cust.preferredPaymentMethod);
  if (method) payload.preferredPaymentMethod = method;

  const notes = cleanStr(cust.notes);
  if (notes) payload.notes = notes;

  if (Array.isArray(cust.tags) && cust.tags.length > 0) {
    const cleanTags = cust.tags.map((t) => t.trim()).filter(Boolean);
    if (cleanTags.length > 0) payload.tags = cleanTags;
  }

  if (cust.status) {
    payload.status = cust.status;
  }

  return payload;
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

    bulkUploadCommerceCustomers: builder.mutation<CustomerBulkUploadResponse, FormData>({
      query: (formData) => ({
        url: '/commerce/customers/bulk-upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [
        { type: 'Customer', id: 'LIST' },
        'Dashboard',
      ],
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
  useBulkUploadCommerceCustomersMutation,
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

  bulkUploadCustomers: async (fileOrFormData: File | FormData | Blob): Promise<CustomerBulkUploadResponse> => {
    const formData = fileOrFormData instanceof FormData ? fileOrFormData : new FormData();
    if (!(fileOrFormData instanceof FormData)) {
      formData.append('file', fileOrFormData as any);
    }
    const response = await baseClient.post<CustomerBulkUploadResponse>(
      '/commerce/customers/bulk-upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};

