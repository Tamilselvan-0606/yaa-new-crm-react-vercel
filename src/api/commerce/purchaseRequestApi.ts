import { baseClient, baseApi } from '../baseApi';
import {
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseRequestPriority,
  PurchaseRequestStatus,
} from '../../store/useSalesManagementStore';
import {
  ApiPurchaseRequest,
  ApiPurchaseRequestItem,
  PurchaseRequestFilterParams,
  PurchaseRequestListResponse,
  PurchaseRequestSingleResponse,
  PurchaseRequestDeleteResponse,
  CreatePurchaseRequestPayload,
  UpdatePurchaseRequestPayload,
} from './purchaseRequestTypes';

export * from './purchaseRequestTypes';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ensures a valid UUID format for Commerce API fields (e.g. productId).
 * If a custom/legacy ID is provided, generates a deterministic/standard UUID.
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
 * Maps raw ApiPurchaseRequestItem to UI PurchaseRequestItem
 */
export const mapApiItemToUiItem = (
  it: ApiPurchaseRequestItem,
  idx: number = 0
): PurchaseRequestItem => {
  return {
    id: it.id || `pr_item_${idx}_${Date.now()}`,
    productId: it.productId || '',
    productName: it.productName || 'Unnamed Item',
    currentStock: Number(it.currentStock ?? 0),
    requestedQuantity: Number(it.requestedQuantity ?? 1),
    estimatedUnitPrice: Number(it.estimatedUnitPrice ?? 0),
    requiredDate: it.requiredDate || new Date().toISOString().split('T')[0],
    remarks: it.remarks || '',
  };
};

/**
 * Maps raw ApiPurchaseRequest from backend to UI PurchaseRequest model
 */
export const mapApiPurchaseRequestToUi = (
  apiPR: ApiPurchaseRequest
): PurchaseRequest => {
  const items = Array.isArray(apiPR.items)
    ? apiPR.items.map((it, idx) => mapApiItemToUiItem(it, idx))
    : [];

  const totalCalculated = items.reduce(
    (acc, it) => acc + (it.estimatedUnitPrice || 0) * (it.requestedQuantity || 0),
    0
  );

  return {
    id: apiPR.id,
    requestNo: apiPR.requestNo || `PR-${Date.now()}`,
    requestDate:
      apiPR.requestDate ||
      (apiPR.createdAt ? apiPR.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
    requestedBy: apiPR.requestedBy || 'N/A',
    department: apiPR.department || 'General',
    requiredDate: apiPR.requiredDate || '',
    priority: (apiPR.priority as PurchaseRequestPriority) || 'Medium',
    status: (apiPR.status as PurchaseRequestStatus) || 'Pending Approval',
    items,
    notes: apiPR.notes || '',
    organizationId: apiPR.organizationId,
    totalEstimatedAmount: apiPR.totalEstimatedAmount ?? totalCalculated,
    rejectionReason: apiPR.rejectionReason || undefined,
    approvedBy: apiPR.approvedBy || undefined,
    approvedAt: apiPR.approvedAt || undefined,
    createdPurchaseId: apiPR.createdPurchaseId || undefined,
    createdAt: apiPR.createdAt || new Date().toISOString(),
    updatedAt: apiPR.updatedAt || new Date().toISOString(),
  };
};

/**
 * Maps UI form data / items into payload for POST /commerce/purchase-requests
 */
export const mapUiToCreatePayload = (
  data: {
    requestNo?: string;
    requestDate?: string;
    requestedBy: string;
    department: string;
    requiredDate?: string;
    priority: string;
    status?: string;
    notes?: string;
  },
  items: PurchaseRequestItem[]
): CreatePurchaseRequestPayload => {
  return {
    requestNo: data.requestNo?.trim() || undefined,
    requestDate: data.requestDate || new Date().toISOString().split('T')[0],
    requestedBy: data.requestedBy.trim(),
    department: data.department.trim(),
    requiredDate: data.requiredDate || undefined,
    priority: data.priority,
    status: data.status || 'Pending Approval',
    items: items.map((it) => ({
      productId: ensureValidUuid(it.productId),
      productName: it.productName.trim(),
      currentStock: Number(it.currentStock) || 0,
      requestedQuantity: Math.max(1, Number(it.requestedQuantity) || 1),
      estimatedUnitPrice: Number(it.estimatedUnitPrice) || 0,
      requiredDate: it.requiredDate || data.requiredDate,
      remarks: it.remarks?.trim() || undefined,
    })),
    notes: data.notes?.trim() || undefined,
  };
};

/**
 * Maps UI update data into payload for PUT /commerce/purchase-requests/{id}
 */
export const mapUiToUpdatePayload = (
  req: Partial<PurchaseRequest>
): UpdatePurchaseRequestPayload => {
  const payload: UpdatePurchaseRequestPayload = {};

  if (req.requestNo) payload.requestNo = req.requestNo.trim();
  if (req.requestDate) payload.requestDate = req.requestDate;
  if (req.requestedBy) payload.requestedBy = req.requestedBy.trim();
  if (req.department) payload.department = req.department.trim();
  if (req.requiredDate) payload.requiredDate = req.requiredDate;
  if (req.priority) payload.priority = req.priority;
  if (req.status) payload.status = req.status;
  if (typeof req.notes !== 'undefined') payload.notes = req.notes?.trim() || '';
  if (typeof req.rejectionReason !== 'undefined') payload.rejectionReason = req.rejectionReason;
  if (typeof req.approvedBy !== 'undefined') payload.approvedBy = req.approvedBy;
  if (typeof req.approvedAt !== 'undefined') payload.approvedAt = req.approvedAt;
  if (typeof req.createdPurchaseId !== 'undefined') payload.createdPurchaseId = req.createdPurchaseId;

  if (Array.isArray(req.items)) {
    payload.items = req.items.map((it) => ({
      id: it.id,
      productId: ensureValidUuid(it.productId),
      productName: it.productName.trim(),
      currentStock: Number(it.currentStock) || 0,
      requestedQuantity: Math.max(1, Number(it.requestedQuantity) || 1),
      estimatedUnitPrice: Number(it.estimatedUnitPrice) || 0,
      requiredDate: it.requiredDate,
      remarks: it.remarks?.trim() || undefined,
    }));
  }

  return payload;
};

// =========================================================================
// RTK Query Injected Endpoints for Commerce Purchase Requests
// =========================================================================

export const commercePurchaseRequestEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommercePurchaseRequests: builder.query<
      PurchaseRequestListResponse,
      PurchaseRequestFilterParams | void
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
          if (params.status && params.status !== 'All' && params.status !== 'ALL') {
            queryParams.status = params.status;
          }
          if (params.priority && params.priority !== 'All' && params.priority !== 'ALL') {
            queryParams.priority = params.priority;
          }
          if (params.startDate) queryParams.startDate = params.startDate;
          if (params.endDate) queryParams.endDate = params.endDate;
          if (params.organization_id) queryParams.organization_id = params.organization_id;
          if (params.sub_organization_id) queryParams.sub_organization_id = params.sub_organization_id;
          if (params.branch_id) queryParams.branch_id = params.branch_id;
        }
        return {
          url: '/commerce/purchase-requests',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'PurchaseRequest' as const, id })),
              { type: 'PurchaseRequest', id: 'LIST' },
            ]
          : [{ type: 'PurchaseRequest', id: 'LIST' }],
    }),

    getCommercePurchaseRequestById: builder.query<PurchaseRequestSingleResponse, string>({
      query: (id) => `/commerce/purchase-requests/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'PurchaseRequest', id }],
    }),

    createCommercePurchaseRequest: builder.mutation<
      PurchaseRequestSingleResponse,
      CreatePurchaseRequestPayload
    >({
      query: (payload) => ({
        url: '/commerce/purchase-requests',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'PurchaseRequest', id: 'LIST' }],
    }),

    updateCommercePurchaseRequest: builder.mutation<
      PurchaseRequestSingleResponse,
      { id: string; payload: UpdatePurchaseRequestPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/purchase-requests/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'PurchaseRequest', id },
        { type: 'PurchaseRequest', id: 'LIST' },
      ],
    }),

    deleteCommercePurchaseRequest: builder.mutation<PurchaseRequestDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/purchase-requests/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'PurchaseRequest', id },
        { type: 'PurchaseRequest', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetCommercePurchaseRequestsQuery,
  useLazyGetCommercePurchaseRequestsQuery,
  useGetCommercePurchaseRequestByIdQuery,
  useCreateCommercePurchaseRequestMutation,
  useUpdateCommercePurchaseRequestMutation,
  useDeleteCommercePurchaseRequestMutation,
} = commercePurchaseRequestEndpoints;

// =========================================================================
// Imperative API Client for Direct Service / Modal / Custom hooks
// =========================================================================

export const commercePurchaseRequestApi = {
  /**
   * List purchase requests
   * GET /commerce/purchase-requests
   */
  getPurchaseRequests: async (
    params?: PurchaseRequestFilterParams
  ): Promise<PurchaseRequestListResponse> => {
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
      if (params.status && params.status !== 'All' && params.status !== 'ALL') {
        queryParams.status = params.status;
      }
      if (params.priority && params.priority !== 'All' && params.priority !== 'ALL') {
        queryParams.priority = params.priority;
      }
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.organization_id) queryParams.organization_id = params.organization_id;
      if (params.sub_organization_id) queryParams.sub_organization_id = params.sub_organization_id;
      if (params.branch_id) queryParams.branch_id = params.branch_id;
    }

    const response = await baseClient.get<PurchaseRequestListResponse>(
      '/commerce/purchase-requests',
      {
        params: queryParams,
      }
    );
    return response.data;
  },

  /**
   * Get single purchase request by ID
   * GET /commerce/purchase-requests/{id}
   */
  getPurchaseRequestById: async (id: string): Promise<PurchaseRequestSingleResponse> => {
    const response = await baseClient.get<PurchaseRequestSingleResponse>(
      `/commerce/purchase-requests/${id}`
    );
    return response.data;
  },

  /**
   * Create new purchase request
   * POST /commerce/purchase-requests
   */
  createPurchaseRequest: async (
    payload: CreatePurchaseRequestPayload
  ): Promise<PurchaseRequestSingleResponse> => {
    const response = await baseClient.post<PurchaseRequestSingleResponse>(
      '/commerce/purchase-requests',
      payload
    );
    return response.data;
  },

  /**
   * Update purchase request
   * PUT /commerce/purchase-requests/{id}
   */
  updatePurchaseRequest: async (
    id: string,
    payload: UpdatePurchaseRequestPayload
  ): Promise<PurchaseRequestSingleResponse> => {
    const response = await baseClient.put<PurchaseRequestSingleResponse>(
      `/commerce/purchase-requests/${id}`,
      payload
    );
    return response.data;
  },

  /**
   * Delete purchase request
   * DELETE /commerce/purchase-requests/{id}
   */
  deletePurchaseRequest: async (id: string): Promise<PurchaseRequestDeleteResponse> => {
    const response = await baseClient.delete<PurchaseRequestDeleteResponse>(
      `/commerce/purchase-requests/${id}`
    );
    return response.data;
  },
};
