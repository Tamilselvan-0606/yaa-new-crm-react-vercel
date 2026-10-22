import { baseClient, baseApi } from '../baseApi';
import {
  PurchaseReturn,
  PurchaseReturnItem,
  PurchaseReturnStatus,
} from '../../store/useSalesManagementStore';
import {
  ApiPurchaseReturn,
  ApiPurchaseReturnItem,
  PurchaseReturnFilterParams,
  PurchaseReturnListResponse,
  PurchaseReturnSingleResponse,
  PurchaseReturnDeleteResponse,
  CreatePurchaseReturnPayload,
  UpdatePurchaseReturnPayload,
} from './purchaseReturnTypes';

export * from './purchaseReturnTypes';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ensures a valid UUID format for Commerce API fields (e.g. productId, supplierId).
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
 * Maps raw ApiPurchaseReturnItem to UI PurchaseReturnItem
 */
export const mapApiItemToUiItem = (
  it: ApiPurchaseReturnItem,
  idx: number = 0
): PurchaseReturnItem => {
  return {
    id: it.id || `pr_ret_it_${idx}_${Date.now()}`,
    productId: it.productId || '',
    productName: it.productName || 'Unnamed Product',
    batch: it.batch,
    purchasedQuantity: Number(it.purchasedQuantity ?? 0),
    returnQuantity: Number(it.returnQuantity ?? 0),
    unitPrice: Number(it.unitPrice ?? 0),
    returnAmount: Number(it.returnAmount ?? 0),
    reason: (it.reason as any) || 'Damaged',
    remarks: it.remarks || '',
  };
};

/**
 * Maps raw ApiPurchaseReturn from backend to UI PurchaseReturn model
 */
export const mapApiPurchaseReturnToUi = (
  apiRet: ApiPurchaseReturn
): PurchaseReturn => {
  const items = Array.isArray(apiRet.items)
    ? apiRet.items.map((it, idx) => mapApiItemToUiItem(it, idx))
    : [];

  const totalCalculated = items.reduce(
    (acc, it) => acc + (it.returnAmount || (it.unitPrice * it.returnQuantity)),
    0
  );

  return {
    id: apiRet.id,
    returnNo: apiRet.returnNo || `PRN-${Date.now()}`,
    purchaseId: apiRet.purchaseId || '',
    purchaseNo: apiRet.purchaseNo || '',
    supplierId: apiRet.supplierId || '',
    supplierName: apiRet.supplierName || 'Unknown Supplier',
    returnDate:
      apiRet.returnDate ||
      (apiRet.createdAt ? apiRet.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
    items,
    returnAmount: Number(apiRet.returnAmount ?? totalCalculated),
    refundStatus: (apiRet.refundStatus as any) || 'Supplier Credit',
    returnStatus: (apiRet.returnStatus as PurchaseReturnStatus) || 'Requested',
    notes: apiRet.notes || '',
    organizationId: apiRet.organizationId,
    stockDeducted: apiRet.stockDeducted,
    createdAt: apiRet.createdAt || new Date().toISOString(),
    updatedAt: apiRet.updatedAt || new Date().toISOString(),
  };
};

/**
 * Maps UI form data / items into payload for POST /commerce/purchase-returns
 */
export const mapUiToCreatePayload = (
  data: {
    returnNo?: string;
    purchaseId?: string;
    purchaseNo?: string;
    supplierId: string;
    supplierName?: string;
    returnDate?: string;
    refundStatus?: string;
    returnStatus?: string;
    notes?: string;
  },
  items: PurchaseReturnItem[]
): CreatePurchaseReturnPayload => {
  const lineItems = items.map((it) => {
    const retAmt =
      it.returnAmount > 0
        ? it.returnAmount
        : Math.round(it.returnQuantity * it.unitPrice * 100) / 100;

    return {
      productId: ensureValidUuid(it.productId),
      productName: it.productName.trim(),
      batch: it.batch?.trim() || undefined,
      purchasedQuantity: Number(it.purchasedQuantity) || 0,
      returnQuantity: Math.max(0, Number(it.returnQuantity) || 0),
      unitPrice: Number(it.unitPrice) || 0,
      returnAmount: retAmt,
      reason: it.reason || 'Damaged',
      remarks: it.remarks?.trim() || undefined,
    };
  });

  const totalReturnAmount = lineItems.reduce((acc, it) => acc + (it.returnAmount || 0), 0);

  const payload: CreatePurchaseReturnPayload = {
    returnNo: data.returnNo?.trim() || undefined,
    purchaseNo: data.purchaseNo?.trim() || undefined,
    supplierId: ensureValidUuid(data.supplierId),
    supplierName: data.supplierName?.trim() || undefined,
    returnDate: data.returnDate || new Date().toISOString().split('T')[0],
    items: lineItems,
    returnAmount: totalReturnAmount,
    refundStatus: data.refundStatus || 'Supplier Credit',
    returnStatus: data.returnStatus || 'Requested',
    notes: data.notes?.trim() || undefined,
  };

  // Only include purchaseId if it's a valid UUID and explicitly provided
  if (data.purchaseId && UUID_REGEX.test(data.purchaseId)) {
    payload.purchaseId = data.purchaseId;
  }

  return payload;
};

/**
 * Maps UI update data into payload for PUT /commerce/purchase-returns/{id}
 */
export const mapUiToUpdatePayload = (
  ret: Partial<PurchaseReturn>
): UpdatePurchaseReturnPayload => {
  const payload: UpdatePurchaseReturnPayload = {};

  if (ret.returnDate) payload.returnDate = ret.returnDate;
  if (ret.refundStatus) payload.refundStatus = ret.refundStatus;
  if (ret.returnStatus) payload.returnStatus = ret.returnStatus;
  if (typeof ret.notes !== 'undefined') payload.notes = ret.notes?.trim() || '';

  if (Array.isArray(ret.items)) {
    payload.items = ret.items.map((it) => ({
      productId: it.productId && UUID_REGEX.test(it.productId) ? it.productId : undefined,
      productName: it.productName.trim(),
      batch: it.batch?.trim() || undefined,
      purchasedQuantity: Number(it.purchasedQuantity) || 0,
      returnQuantity: Math.max(0, Number(it.returnQuantity) || 0),
      unitPrice: Number(it.unitPrice) || 0,
      returnAmount: Number(it.returnAmount) || 0,
      reason: it.reason || 'Damaged',
      remarks: it.remarks?.trim() || undefined,
    }));
  }

  return payload;
};

// =========================================================================
// RTK Query Injected Endpoints for Commerce Purchase Returns
// =========================================================================

export const commercePurchaseReturnEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommercePurchaseReturns: builder.query<
      PurchaseReturnListResponse,
      PurchaseReturnFilterParams | void
    >({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params) {
          if (typeof params.page_no === 'number') queryParams.page_no = params.page_no;
          if (typeof params.page_size === 'number') queryParams.page_size = params.page_size;
          if (typeof params.page === 'number') queryParams.page = params.page;
          if (typeof params.limit === 'number') queryParams.limit = params.limit;
          if (typeof params.pagination_required !== 'undefined') {
            queryParams.pagination_required = String(params.pagination_required);
          }
          if (params.search && params.search.trim()) {
            queryParams.search = params.search.trim();
          }
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
          if (params.supplierId) queryParams.supplierId = params.supplierId;
          if (params.returnStatus && params.returnStatus !== 'All' && params.returnStatus !== 'ALL') {
            queryParams.returnStatus = params.returnStatus;
          }
          if (params.refundStatus && params.refundStatus !== 'All' && params.refundStatus !== 'ALL') {
            queryParams.refundStatus = params.refundStatus;
          }
          if (params.status && params.status !== 'All' && params.status !== 'ALL') {
            queryParams.status = params.status;
          }
          if (params.startDate) queryParams.startDate = params.startDate;
          if (params.endDate) queryParams.endDate = params.endDate;
          if (params.organization_id) queryParams.organization_id = params.organization_id;
          if (params.sub_organization_id) queryParams.sub_organization_id = params.sub_organization_id;
          if (params.branch_id) queryParams.branch_id = params.branch_id;
        }
        return {
          url: '/commerce/purchase-returns',
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'PurchaseReturn' as const, id })),
              { type: 'PurchaseReturn', id: 'LIST' },
            ]
          : [{ type: 'PurchaseReturn', id: 'LIST' }],
    }),

    getCommercePurchaseReturnById: builder.query<PurchaseReturnSingleResponse, string>({
      query: (id) => `/commerce/purchase-returns/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'PurchaseReturn', id }],
    }),

    createCommercePurchaseReturn: builder.mutation<
      PurchaseReturnSingleResponse,
      CreatePurchaseReturnPayload
    >({
      query: (payload) => ({
        url: '/commerce/purchase-returns',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'PurchaseReturn', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Supplier', id: 'LIST' },
        { type: 'Purchase', id: 'LIST' },
      ],
    }),

    updateCommercePurchaseReturn: builder.mutation<
      PurchaseReturnSingleResponse,
      { id: string; payload: UpdatePurchaseReturnPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/purchase-returns/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PurchaseReturn', id },
        { type: 'PurchaseReturn', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Supplier', id: 'LIST' },
        { type: 'Purchase', id: 'LIST' },
      ],
    }),

    deleteCommercePurchaseReturn: builder.mutation<PurchaseReturnDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/purchase-returns/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'PurchaseReturn', id },
        { type: 'PurchaseReturn', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Supplier', id: 'LIST' },
        { type: 'Purchase', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetCommercePurchaseReturnsQuery,
  useLazyGetCommercePurchaseReturnsQuery,
  useGetCommercePurchaseReturnByIdQuery,
  useCreateCommercePurchaseReturnMutation,
  useUpdateCommercePurchaseReturnMutation,
  useDeleteCommercePurchaseReturnMutation,
} = commercePurchaseReturnEndpoints;

// =========================================================================
// Imperative API Client for Direct Service / Modal / Custom hooks
// =========================================================================

export const commercePurchaseReturnApi = {
  /**
   * List purchase returns
   * GET /commerce/purchase-returns
   */
  getPurchaseReturns: async (
    params?: PurchaseReturnFilterParams
  ): Promise<PurchaseReturnListResponse> => {
    const queryParams: Record<string, any> = {};

    if (params) {
      if (typeof params.page_no === 'number') queryParams.page_no = params.page_no;
      if (typeof params.page_size === 'number') queryParams.page_size = params.page_size;
      if (typeof params.page === 'number') queryParams.page = params.page;
      if (typeof params.limit === 'number') queryParams.limit = params.limit;
      if (typeof params.pagination_required !== 'undefined') {
        queryParams.pagination_required = String(params.pagination_required);
      }
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params.supplierId) queryParams.supplierId = params.supplierId;
      if (params.returnStatus && params.returnStatus !== 'All' && params.returnStatus !== 'ALL') {
        queryParams.returnStatus = params.returnStatus;
      }
      if (params.refundStatus && params.refundStatus !== 'All' && params.refundStatus !== 'ALL') {
        queryParams.refundStatus = params.refundStatus;
      }
      if (params.status && params.status !== 'All' && params.status !== 'ALL') {
        queryParams.status = params.status;
      }
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.organization_id) queryParams.organization_id = params.organization_id;
      if (params.sub_organization_id) queryParams.sub_organization_id = params.sub_organization_id;
      if (params.branch_id) queryParams.branch_id = params.branch_id;
    }

    const response = await baseClient.get<PurchaseReturnListResponse>(
      '/commerce/purchase-returns',
      {
        params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      }
    );
    return response.data;
  },

  /**
   * Get single purchase return by ID
   * GET /commerce/purchase-returns/{id}
   */
  getPurchaseReturnById: async (id: string): Promise<PurchaseReturnSingleResponse> => {
    const response = await baseClient.get<PurchaseReturnSingleResponse>(
      `/commerce/purchase-returns/${id}`
    );
    return response.data;
  },

  /**
   * Create new purchase return (debit note)
   * POST /commerce/purchase-returns
   */
  createPurchaseReturn: async (
    payload: CreatePurchaseReturnPayload
  ): Promise<PurchaseReturnSingleResponse> => {
    const response = await baseClient.post<PurchaseReturnSingleResponse>(
      '/commerce/purchase-returns',
      payload
    );
    return response.data;
  },

  /**
   * Update purchase return
   * PUT /commerce/purchase-returns/{id}
   */
  updatePurchaseReturn: async (
    id: string,
    payload: UpdatePurchaseReturnPayload
  ): Promise<PurchaseReturnSingleResponse> => {
    const response = await baseClient.put<PurchaseReturnSingleResponse>(
      `/commerce/purchase-returns/${id}`,
      payload
    );
    return response.data;
  },

  /**
   * Delete purchase return
   * DELETE /commerce/purchase-returns/{id}
   */
  deletePurchaseReturn: async (id: string): Promise<PurchaseReturnDeleteResponse> => {
    const response = await baseClient.delete<PurchaseReturnDeleteResponse>(
      `/commerce/purchase-returns/${id}`
    );
    return response.data;
  },
};
