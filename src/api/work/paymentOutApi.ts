import { baseClient, baseApi } from '../baseApi';
import {
  PaymentOut,
  PaymentOutMode,
} from '../../store/useSalesManagementStore';
import {
  ApiPaymentOut,
  PaymentOutFilterParams,
  PaymentOutListResponse,
  PaymentOutSingleResponse,
  PaymentOutDeleteResponse,
  CreatePaymentOutPayload,
  UpdatePaymentOutPayload,
  PatchPaymentOutPayload,
} from './paymentOutTypes';
import { UUID_REGEX, ensureValidUuid } from './purchaseOrderApi';

export * from './paymentOutTypes';

/**
 * Maps raw ApiPaymentOut from backend Work API to UI PaymentOut model
 */
export const mapApiPaymentOutToUi = (apiPout: ApiPaymentOut): PaymentOut => {
  const paymentDateStr = apiPout.paymentDate
    ? apiPout.paymentDate.split('T')[0]
    : apiPout.createdAt
    ? apiPout.createdAt.split('T')[0]
    : new Date().toISOString().split('T')[0];

  const rawRef = apiPout.referenceNo || '';
  const rawNotes = apiPout.notes || '';
  const poMatch =
    rawRef.match(/\bPO-\d{4}-\d+\b/i) ||
    rawNotes.match(/\bPO-\d{4}-\d+\b/i);
  let inferredPurchaseNo: string | undefined = poMatch ? poMatch[0].toUpperCase() : undefined;
  let inferredPurchaseId: string | undefined = undefined;

  try {
    const rawStoredPos = localStorage.getItem('yaa_crm_purchase_orders');
    if (rawStoredPos) {
      const parsedPos = JSON.parse(rawStoredPos);
      if (Array.isArray(parsedPos)) {
        const matchedPo = parsedPos.find(
          (p: any) =>
            (inferredPurchaseNo && (p.purchaseNo === inferredPurchaseNo || p.poNo === inferredPurchaseNo)) ||
            (rawRef && (p.purchaseNo === rawRef || p.poNo === rawRef || p.purchaseInvoiceNo === rawRef))
        );
        if (matchedPo) {
          inferredPurchaseId = matchedPo.id;
          inferredPurchaseNo = matchedPo.purchaseNo || matchedPo.poNo || inferredPurchaseNo;
        }
      }
    }
  } catch {}

  return {
    id: apiPout.id,
    paymentNo: apiPout.paymentNo || '',
    paymentDate: paymentDateStr,
    supplierId: apiPout.supplierId,
    supplierName: apiPout.supplier?.name || 'Unknown Supplier',
    supplierCode: '',
    purchaseId: apiPout.purchaseOrderId || undefined,
    purchaseNo: apiPout.purchaseOrder?.poNo || undefined,
    amount: Number(apiPout.amount || 0),
    paymentMode: (apiPout.paymentType as PaymentOutMode) || 'Bank Transfer',
    referenceNo: rawRef,
    notes: rawNotes,
    status: (apiPout.status as any) || 'Completed',
    organizationId: apiPout.organizationId,
    paymentType: apiPout.paymentType,
    createdBy: apiPout.createdBy,
    supplier: apiPout.supplier,
    createdAt: apiPout.createdAt || new Date().toISOString(),
    updatedAt: apiPout.updatedAt || apiPout.createdAt || new Date().toISOString(),
  };
};

/**
 * Maps UI form data into payload for POST /work/payments-out
 */
export const mapUiToCreatePaymentOutPayload = (formData: {
  supplierId: string;
  purchaseOrderId?: string;
  paymentMode?: string;
  paymentType?: string;
  amount: number | string;
  referenceNo?: string;
  notes?: string;
}): CreatePaymentOutPayload => {
  const payload: CreatePaymentOutPayload = {
    supplierId: ensureValidUuid(formData.supplierId),
    paymentType: formData.paymentType || formData.paymentMode || 'Bank Transfer',
    amount: Math.max(0.01, Number(formData.amount) || 0),
  };

  if (formData.purchaseOrderId && UUID_REGEX.test(formData.purchaseOrderId)) {
    payload.purchaseOrderId = formData.purchaseOrderId;
  }

  const ref = formData.referenceNo?.trim();
  if (ref) {
    payload.referenceNo = ref;
  }

  const notes = formData.notes?.trim();
  if (notes) {
    payload.notes = notes;
  }

  return payload;
};

/**
 * Maps UI form data into payload for PUT /work/payments-out/{id}
 */
export const mapUiToUpdatePaymentOutPayload = (formData: {
  amount?: number | string;
  referenceNo?: string;
  paymentType?: string;
  paymentMode?: string;
  notes?: string;
}): UpdatePaymentOutPayload => {
  const payload: UpdatePaymentOutPayload = {};

  if (formData.amount !== undefined && formData.amount !== '') {
    payload.amount = Math.max(0.01, Number(formData.amount) || 0);
  }

  const pType = formData.paymentType || formData.paymentMode;
  if (pType) {
    payload.paymentType = pType;
  }

  const ref = formData.referenceNo?.trim();
  if (ref) {
    payload.referenceNo = ref;
  }

  const notes = formData.notes?.trim();
  if (notes) {
    payload.notes = notes;
  }

  return payload;
};

// =========================================================================
// RTK Query Injected Endpoints for Work Payments Out
// =========================================================================

export const workPaymentOutEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkPaymentsOut: builder.query<
      PaymentOutListResponse,
      PaymentOutFilterParams | void
    >({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params) {
          if (typeof params.page === 'number') queryParams.page = params.page;
          if (typeof params.limit === 'number') queryParams.limit = params.limit;
          if (typeof params.page_no === 'number') queryParams.page = params.page_no;
          if (typeof params.page_size === 'number') queryParams.limit = params.page_size;
          if (typeof params.pagination_required !== 'undefined') {
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
        }

        return {
          url: '/work/payments-out',
          method: 'GET',
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'PaymentOut' as const, id })),
              { type: 'PaymentOut' as const, id: 'LIST' },
            ]
          : [{ type: 'PaymentOut' as const, id: 'LIST' }],
    }),

    getWorkPaymentOutById: builder.query<PaymentOutSingleResponse, string>({
      query: (id) => ({
        url: `/work/payments-out/${id}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'PaymentOut', id }],
    }),

    createWorkPaymentOut: builder.mutation<
      PaymentOutSingleResponse,
      CreatePaymentOutPayload
    >({
      query: (payload) => {
        const cleanPayload: Record<string, any> = {};
        for (const [key, val] of Object.entries(payload)) {
          if (val !== null && val !== undefined) {
            cleanPayload[key] = val;
          }
        }
        return {
          url: '/work/payments-out',
          method: 'POST',
          body: cleanPayload,
        };
      },
      invalidatesTags: [
        { type: 'PaymentOut', id: 'LIST' },
        { type: 'PurchaseOrder', id: 'LIST' },

        { type: 'PurchaseBill', id: 'LIST' },

        { type: 'SupplierLedger' },
        { type: 'Supplier', id: 'LIST' },
      ],
    }),

    updateWorkPaymentOut: builder.mutation<
      PaymentOutSingleResponse,
      { id: string; payload: UpdatePaymentOutPayload }
    >({
      query: ({ id, payload }) => {
        const cleanPayload: Record<string, any> = {};
        for (const [key, val] of Object.entries(payload)) {
          if (val !== null && val !== undefined) {
            cleanPayload[key] = val;
          }
        }
        return {
          url: `/work/payments-out/${id}`,
          method: 'PUT',
          body: cleanPayload,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PaymentOut', id },
        { type: 'PaymentOut', id: 'LIST' },
        { type: 'PurchaseOrder', id: 'LIST' },

        { type: 'PurchaseBill', id: 'LIST' },

        { type: 'SupplierLedger' },
        { type: 'Supplier', id: 'LIST' },
      ],
    }),

    patchWorkPaymentOut: builder.mutation<
      PaymentOutSingleResponse,
      { id: string; payload: PatchPaymentOutPayload }
    >({
      query: ({ id, payload }) => {
        const cleanPayload: Record<string, any> = {};
        for (const [key, val] of Object.entries(payload)) {
          if (val !== null && val !== undefined) {
            cleanPayload[key] = val;
          }
        }
        return {
          url: `/work/payments-out/${id}`,
          method: 'PATCH',
          body: cleanPayload,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PaymentOut', id },
        { type: 'PaymentOut', id: 'LIST' },
        { type: 'PurchaseOrder', id: 'LIST' },

        { type: 'PurchaseBill', id: 'LIST' },

        { type: 'SupplierLedger' },
        { type: 'Supplier', id: 'LIST' },
      ],
    }),

    deleteWorkPaymentOut: builder.mutation<PaymentOutDeleteResponse, string>({
      query: (id) => ({
        url: `/work/payments-out/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'PaymentOut', id },
        { type: 'PaymentOut', id: 'LIST' },
        { type: 'PurchaseOrder', id: 'LIST' },

        { type: 'PurchaseBill', id: 'LIST' },

        { type: 'SupplierLedger' },
        { type: 'Supplier', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetWorkPaymentsOutQuery,
  useGetWorkPaymentOutByIdQuery,
  useCreateWorkPaymentOutMutation,
  useUpdateWorkPaymentOutMutation,
  usePatchWorkPaymentOutMutation,
  useDeleteWorkPaymentOutMutation,
} = workPaymentOutEndpoints;

// =========================================================================
// Direct Imperative Client for Work Payments Out
// =========================================================================

export const workPaymentOutApi = {
  /**
   * List outward payments (paginated)
   * GET /work/payments-out
   */
  getPaymentsOut: async (
    params?: PaymentOutFilterParams
  ): Promise<PaymentOutListResponse> => {
    const queryParams: Record<string, any> = {};

    if (params) {
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.page_no !== undefined) queryParams.page = params.page_no;
      if (params.page_size !== undefined) queryParams.limit = params.page_size;
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
    }

    const response = await baseClient.get<PaymentOutListResponse>(
      '/work/payments-out',
      {
        params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      }
    );
    return response.data;
  },

  /**
   * Get single outward payment by ID
   * GET /work/payments-out/{id}
   */
  getPaymentOutById: async (
    id: string
  ): Promise<PaymentOutSingleResponse> => {
    const response = await baseClient.get<PaymentOutSingleResponse>(
      `/work/payments-out/${id}`,
      // `timeout: 0` (axios default = none) makes the request non-cacheable, so every View calls GET /work/payments-out/:id.
      { timeout: 0 }
    );
    return response.data;
  },

  /**
   * Record a supplier payment
   * POST /work/payments-out
   */
  createPaymentOut: async (
    payload: CreatePaymentOutPayload
  ): Promise<PaymentOutSingleResponse> => {
    const cleanPayload: Record<string, any> = {};
    for (const [key, val] of Object.entries(payload)) {
      if (val !== null && val !== undefined) {
        cleanPayload[key] = val;
      }
    }
    const response = await baseClient.post<PaymentOutSingleResponse>(
      '/work/payments-out',
      cleanPayload
    );
    return response.data;
  },

  /**
   * Update an outward payment
   * PUT /work/payments-out/{id}
   */
  updatePaymentOut: async (
    id: string,
    payload: UpdatePaymentOutPayload
  ): Promise<PaymentOutSingleResponse> => {
    const cleanPayload: Record<string, any> = {};
    for (const [key, val] of Object.entries(payload)) {
      if (val !== null && val !== undefined) {
        cleanPayload[key] = val;
      }
    }
    const response = await baseClient.put<PaymentOutSingleResponse>(
      `/work/payments-out/${id}`,
      cleanPayload
    );
    return response.data;
  },

  /**
   * Partially update an outward payment
   * PATCH /work/payments-out/{id}
   */
  patchPaymentOut: async (
    id: string,
    payload: PatchPaymentOutPayload
  ): Promise<PaymentOutSingleResponse> => {
    const cleanPayload: Record<string, any> = {};
    for (const [key, val] of Object.entries(payload)) {
      if (val !== null && val !== undefined) {
        cleanPayload[key] = val;
      }
    }
    const response = await baseClient.patch<PaymentOutSingleResponse>(
      `/work/payments-out/${id}`,
      cleanPayload
    );
    return response.data;
  },

  /**
   * Cancel an outward payment (voids with status Cancelled)
   * DELETE /work/payments-out/{id}
   */
  deletePaymentOut: async (
    id: string
  ): Promise<PaymentOutDeleteResponse> => {
    const response = await baseClient.delete<PaymentOutDeleteResponse>(
      `/work/payments-out/${id}`
    );
    return response.data;
  },
};
