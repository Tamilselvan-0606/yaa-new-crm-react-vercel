import { baseClient, baseApi } from '../baseApi';
import {
  PurchaseOrder,
  PurchaseProductItem,
  PurchaseStatus,
  PurchasePaymentStatus,
} from '../../store/useSalesManagementStore';
import {
  ApiPurchaseOrder,
  ApiPurchaseOrderItem,
  PurchaseOrderFilterParams,
  PurchaseOrderListResponse,
  PurchaseOrderSingleResponse,
  PurchaseOrderDeleteResponse,
  CreatePurchaseOrderPayload,
  UpdatePurchaseOrderPayload,
  PatchPurchaseOrderPayload,
  PatchPurchaseOrderStatusPayload,
} from './purchaseOrderTypes';

export * from './purchaseOrderTypes';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ensures a valid UUID format for Work API fields (e.g. productId, supplierId).
 * If a custom/legacy ID is provided, generates a standard UUID fallback.
 */
export const ensureValidUuid = (id?: string): string => {
  if (id && UUID_REGEX.test(id)) return id;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Maps raw ApiPurchaseOrderItem to UI PurchaseProductItem
 */
export const mapApiItemToUiProductItem = (
  it: ApiPurchaseOrderItem,
  idx: number = 0
): PurchaseProductItem => {
  const qty = Number(it.quantity ?? 1);
  const cost = Number(it.unitCost ?? 0);
  const taxPct = Number(it.taxPercent ?? 0);
  const calculatedTax = (qty * cost * taxPct) / 100;
  const total = Number(it.totalAmount ?? (qty * cost + (it.taxAmount ?? calculatedTax)));

  return {
    id: `po_item_${idx}_${Date.now()}`,
    productId: it.productId,
    productName: it.productName || 'Product',
    batch: '',
    quantity: qty,
    unit: 'NONE',
    purchasePrice: cost,
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: taxPct,
    total: Math.round(total * 100) / 100,
  };
};

/**
 * Maps raw ApiPurchaseOrder from backend to UI PurchaseOrder model
 */
export const mapApiPurchaseOrderToUi = (
  apiPo: ApiPurchaseOrder
): PurchaseOrder => {
  const items: PurchaseProductItem[] = Array.isArray(apiPo.items)
    ? apiPo.items.map((it, idx) => mapApiItemToUiProductItem(it, idx))
    : [];

  const subTotal = Number(apiPo.subTotal ?? 0);
  const taxAmount = Number(apiPo.taxAmount ?? 0);
  const discountAmount = Number(apiPo.discountAmount ?? 0);
  const grandTotal = Number(apiPo.grandTotal ?? (subTotal + taxAmount - discountAmount));

  // Determine status & payment status
  const normalizedStatus = (apiPo.status as PurchaseStatus) || 'Pending';
  const isFulfilled = normalizedStatus === 'Received' || (normalizedStatus as string) === 'Completed';

  // Check if we have an existing local record with payments recorded
  let existingPaid = 0;
  let existingPaymentMethod: any = 'Bank Transfer';
  let existingPaymentTerms = 'Net 30 Days';
  try {
    const rawStored = localStorage.getItem('yaa_crm_purchase_orders');
    if (rawStored) {
      const parsed = JSON.parse(rawStored);
      if (Array.isArray(parsed)) {
        const found = parsed.find((p: any) => p.id === apiPo.id || (apiPo.poNo && p.purchaseNo === apiPo.poNo));
        if (found) {
          existingPaid = Number(found.paidAmount || 0);
          if (found.paymentMethod) existingPaymentMethod = found.paymentMethod;
          if (found.paymentTerms) existingPaymentTerms = found.paymentTerms;
        }
      }
    }
  } catch {}

  const paidAmount = isFulfilled ? grandTotal : Math.min(grandTotal, existingPaid);
  const balance = Math.max(0, grandTotal - paidAmount);
  const paymentStatus: PurchasePaymentStatus =
    balance <= 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Unpaid';

  const orderDateStr = apiPo.orderDate
    ? apiPo.orderDate.split('T')[0]
    : apiPo.createdAt
    ? apiPo.createdAt.split('T')[0]
    : new Date().toISOString().split('T')[0];

  const dueDateStr = apiPo.expectedDeliveryDate
    ? apiPo.expectedDeliveryDate.split('T')[0]
    : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  return {
    id: apiPo.id,
    purchaseNo: apiPo.poNo || `PO-${apiPo.id.slice(0, 8).toUpperCase()}`,
    poNo: apiPo.poNo,
    purchaseInvoiceNo: apiPo.poNo || '',
    supplierId: apiPo.supplierId,
    supplierName: apiPo.supplier?.name || 'Unknown Supplier',
    supplierCode: '',
    purchaseDate: orderDateStr,
    orderDate: apiPo.orderDate,
    expectedDeliveryDate: apiPo.expectedDeliveryDate || undefined,
    dueDate: dueDateStr,
    items,
    subtotal: subTotal,
    subTotal: subTotal,
    discount: discountAmount,
    discountAmount: discountAmount,
    tax: taxAmount,
    taxAmount: taxAmount,
    withGst: taxAmount > 0,
    gstType: 'intra_state',
    cgst: Math.round((taxAmount / 2) * 100) / 100,
    sgst: Math.round((taxAmount / 2) * 100) / 100,
    igst: 0,
    shipping: 0,
    otherCharges: 0,
    grandTotal: grandTotal,
    paidAmount: paidAmount,
    balance: balance,
    paymentMethod: existingPaymentMethod,
    paymentTerms: existingPaymentTerms,
    paymentStatus: paymentStatus,
    purchaseStatus: normalizedStatus,
    status: apiPo.status,
    notes: apiPo.notes || '',
    createdBy: apiPo.createdBy,
    organizationId: apiPo.organizationId,
    supplier: apiPo.supplier,
    createdAt: apiPo.createdAt || new Date().toISOString(),
    updatedAt: apiPo.updatedAt || new Date().toISOString(),
  };
};

/**
 * Maps UI form data into payload for POST /work/purchase-orders
 */
export const mapUiToCreatePurchaseOrderPayload = (
  formData: {
    supplierId: string;
    dueDate?: string;
    expectedDeliveryDate?: string;
    discount?: number;
    discountAmount?: number;
    notes?: string;
  },
  items: PurchaseProductItem[]
): CreatePurchaseOrderPayload => {
  const lineItems = items.map((it) => ({
    productId: ensureValidUuid(it.productId),
    quantity: Math.max(1, Number(it.quantity) || 1),
    unitCost: Math.max(0, Number(it.purchasePrice) || 0),
    taxPercent: Math.max(0, Number(it.taxPercent) || 0),
  }));

  const rawDeliveryDate = formData.expectedDeliveryDate || formData.dueDate;
  const deliveryDate = rawDeliveryDate ? rawDeliveryDate.split('T')[0] : undefined;
  const discountAmount = formData.discountAmount !== undefined ? formData.discountAmount : (formData.discount || 0);

  const payload: CreatePurchaseOrderPayload = {
    supplierId: ensureValidUuid(formData.supplierId),
    discountAmount: Math.max(0, Number(discountAmount) || 0),
    items: lineItems,
  };

  if (deliveryDate) {
    payload.expectedDeliveryDate = deliveryDate;
  }

  const trimmedNotes = formData.notes?.trim();
  if (trimmedNotes) {
    payload.notes = trimmedNotes;
  }

  return payload;
};

/**
 * Maps UI form data into payload for PUT /work/purchase-orders/{id}
 */
export const mapUiToUpdatePurchaseOrderPayload = (
  formData: {
    dueDate?: string;
    expectedDeliveryDate?: string;
    discount?: number;
    discountAmount?: number;
    notes?: string;
  },
  items: PurchaseProductItem[]
): UpdatePurchaseOrderPayload => {
  const lineItems = items.map((it) => ({
    productId: ensureValidUuid(it.productId),
    quantity: Math.max(1, Number(it.quantity) || 1),
    unitCost: Math.max(0, Number(it.purchasePrice) || 0),
    taxPercent: Math.max(0, Number(it.taxPercent) || 0),
  }));

  const rawDeliveryDate = formData.expectedDeliveryDate || formData.dueDate;
  const deliveryDate = rawDeliveryDate ? rawDeliveryDate.split('T')[0] : undefined;
  const discountAmount = formData.discountAmount !== undefined ? formData.discountAmount : (formData.discount || 0);

  const payload: UpdatePurchaseOrderPayload = {
    discountAmount: Math.max(0, Number(discountAmount) || 0),
    items: lineItems,
  };

  if (deliveryDate) {
    payload.expectedDeliveryDate = deliveryDate;
  }

  const trimmedNotes = formData.notes?.trim();
  if (trimmedNotes) {
    payload.notes = trimmedNotes;
  }

  return payload;
};

// =========================================================================
// RTK Query Injected Endpoints for Work Purchase Orders
// =========================================================================

export const workPurchaseOrderEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkPurchaseOrders: builder.query<
      PurchaseOrderListResponse,
      PurchaseOrderFilterParams | void
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
          url: '/work/purchase-orders',
          method: 'GET',
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        };
      },
      providesTags: (result) =>
        result?.data && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'Purchase' as const, id })),
              { type: 'Purchase' as const, id: 'LIST' },
            ]
          : [{ type: 'Purchase' as const, id: 'LIST' }],
    }),

    getWorkPurchaseOrderById: builder.query<PurchaseOrderSingleResponse, string>({
      query: (id) => ({
        url: `/work/purchase-orders/${id}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'Purchase', id }],
    }),

    createWorkPurchaseOrder: builder.mutation<
      PurchaseOrderSingleResponse,
      CreatePurchaseOrderPayload
    >({
      query: (payload) => {
        const cleanPayload: Record<string, any> = {};
        for (const [key, val] of Object.entries(payload)) {
          if (val !== null && val !== undefined) {
            cleanPayload[key] = val;
          }
        }
        return {
          url: '/work/purchase-orders',
          method: 'POST',
          body: cleanPayload,
        };
      },
      invalidatesTags: [
        { type: 'Purchase', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Supplier', id: 'LIST' },
      ],
    }),

    updateWorkPurchaseOrder: builder.mutation<
      PurchaseOrderSingleResponse,
      { id: string; payload: UpdatePurchaseOrderPayload }
    >({
      query: ({ id, payload }) => {
        const cleanPayload: Record<string, any> = {};
        for (const [key, val] of Object.entries(payload)) {
          if (val !== null && val !== undefined) {
            cleanPayload[key] = val;
          }
        }
        return {
          url: `/work/purchase-orders/${id}`,
          method: 'PUT',
          body: cleanPayload,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Purchase', id },
        { type: 'Purchase', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Supplier', id: 'LIST' },
      ],
    }),

    patchWorkPurchaseOrder: builder.mutation<
      PurchaseOrderSingleResponse,
      { id: string; payload: PatchPurchaseOrderPayload }
    >({
      query: ({ id, payload }) => {
        const cleanPayload: Record<string, any> = {};
        for (const [key, val] of Object.entries(payload)) {
          if (val !== null && val !== undefined) {
            cleanPayload[key] = val;
          }
        }
        return {
          url: `/work/purchase-orders/${id}`,
          method: 'PATCH',
          body: cleanPayload,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Purchase', id },
        { type: 'Purchase', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Supplier', id: 'LIST' },
      ],
    }),

    patchWorkPurchaseOrderStatus: builder.mutation<
      PurchaseOrderSingleResponse,
      { id: string; payload: PatchPurchaseOrderStatusPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/work/purchase-orders/${id}/status`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Purchase', id },
        { type: 'Purchase', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Supplier', id: 'LIST' },
      ],
    }),

    deleteWorkPurchaseOrder: builder.mutation<PurchaseOrderDeleteResponse, string>({
      query: (id) => ({
        url: `/work/purchase-orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Purchase', id },
        { type: 'Purchase', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Supplier', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetWorkPurchaseOrdersQuery,
  useLazyGetWorkPurchaseOrdersQuery,
  useGetWorkPurchaseOrderByIdQuery,
  useCreateWorkPurchaseOrderMutation,
  useUpdateWorkPurchaseOrderMutation,
  usePatchWorkPurchaseOrderMutation,
  usePatchWorkPurchaseOrderStatusMutation,
  useDeleteWorkPurchaseOrderMutation,
} = workPurchaseOrderEndpoints;

// =========================================================================
// Imperative API Client for Direct Service / Modal / Custom hooks
// =========================================================================

export const workPurchaseOrderApi = {
  /**
   * List purchase orders (paginated)
   * GET /work/purchase-orders
   */
  getPurchaseOrders: async (
    params?: PurchaseOrderFilterParams
  ): Promise<PurchaseOrderListResponse> => {
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

    const response = await baseClient.get<PurchaseOrderListResponse>(
      '/work/purchase-orders',
      { params: Object.keys(queryParams).length > 0 ? queryParams : undefined }
    );
    return response.data;
  },

  /**
   * Get single purchase order by ID
   * GET /work/purchase-orders/{id}
   */
  getPurchaseOrderById: async (id: string): Promise<PurchaseOrderSingleResponse> => {
    const response = await baseClient.get<PurchaseOrderSingleResponse>(
      `/work/purchase-orders/${id}`
    );
    return response.data;
  },

  /**
   * Create a purchase order
   * POST /work/purchase-orders
   */
  createPurchaseOrder: async (
    payload: CreatePurchaseOrderPayload
  ): Promise<PurchaseOrderSingleResponse> => {
    const cleanPayload: Record<string, any> = {};
    for (const [key, val] of Object.entries(payload)) {
      if (val !== null && val !== undefined) {
        cleanPayload[key] = val;
      }
    }
    const response = await baseClient.post<PurchaseOrderSingleResponse>(
      '/work/purchase-orders',
      cleanPayload
    );
    return response.data;
  },

  /**
   * Update a purchase order
   * PUT /work/purchase-orders/{id}
   */
  updatePurchaseOrder: async (
    id: string,
    payload: UpdatePurchaseOrderPayload
  ): Promise<PurchaseOrderSingleResponse> => {
    const cleanPayload: Record<string, any> = {};
    for (const [key, val] of Object.entries(payload)) {
      if (val !== null && val !== undefined) {
        cleanPayload[key] = val;
      }
    }
    const response = await baseClient.put<PurchaseOrderSingleResponse>(
      `/work/purchase-orders/${id}`,
      cleanPayload
    );
    return response.data;
  },

  /**
   * Partially update a purchase order
   * PATCH /work/purchase-orders/{id}
   */
  patchPurchaseOrder: async (
    id: string,
    payload: PatchPurchaseOrderPayload
  ): Promise<PurchaseOrderSingleResponse> => {
    const cleanPayload: Record<string, any> = {};
    for (const [key, val] of Object.entries(payload)) {
      if (val !== null && val !== undefined) {
        cleanPayload[key] = val;
      }
    }
    const response = await baseClient.patch<PurchaseOrderSingleResponse>(
      `/work/purchase-orders/${id}`,
      cleanPayload
    );
    return response.data;
  },

  /**
   * Change purchase order status
   * PATCH /work/purchase-orders/{id}/status
   */
  patchPurchaseOrderStatus: async (
    id: string,
    status: 'Pending' | 'Approved' | 'Ordered' | 'Received' | 'Cancelled' | string
  ): Promise<PurchaseOrderSingleResponse> => {
    const response = await baseClient.patch<PurchaseOrderSingleResponse>(
      `/work/purchase-orders/${id}/status`,
      { status }
    );
    return response.data;
  },

  /**
   * Delete a purchase order (soft)
   * DELETE /work/purchase-orders/{id}
   */
  deletePurchaseOrder: async (id: string): Promise<PurchaseOrderDeleteResponse> => {
    const response = await baseClient.delete<PurchaseOrderDeleteResponse>(
      `/work/purchase-orders/${id}`
    );
    return response.data;
  },
};
