import { baseClient, baseApi } from '../baseApi';
import {
  SalesReturn,
  SalesReturnItem,
  SalesReturnStatus,
  RefundStatus,
  ReturnReason,
} from '../../store/useSalesManagementStore';
import {
  ApiSalesReturn,
  ApiSalesReturnItem,
  SalesReturnFilterParams,
  CommerceSalesReturnListResponse,
  CommerceSalesReturnSingleResponse,
  CommerceSalesReturnDeleteResponse,
  CreateSalesReturnPayload,
  CreateSalesReturnItemPayload,
  UpdateSalesReturnPayload,
  PatchSalesReturnPayload,
  SalesReturnStatusPayload,
} from './salesReturnTypes';

export * from './salesReturnTypes';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Mapper: ApiSalesReturnItem -> SalesReturnItem
 */
export const mapApiReturnItemToSalesReturnItem = (it: ApiSalesReturnItem, idx: number = 0): SalesReturnItem => {
  const retQty = Number(it.returnQuantity) || 1;
  const unitPrice = Number(it.unitPrice) || 0;
  const soldQty = Number(it.soldQuantity) || retQty;
  const retAmount = Number(it.returnAmount ?? retQty * unitPrice);

  return {
    id: it.id || `ret_item_${idx}_${Date.now()}`,
    productId: it.productId || '',
    productName: it.productName || 'Unnamed Product',
    sku: it.sku || undefined,
    batch: it.batch || undefined,
    soldQuantity: soldQty,
    returnQuantity: retQty,
    unitPrice: unitPrice,
    returnAmount: retAmount,
    reason: (it.reason as ReturnReason) || 'Defective',
    notes: it.notes || undefined,
  };
};

/**
 * Mapper: ApiSalesReturn -> SalesReturn
 */
export const mapApiSalesReturnToSalesReturn = (apiRet: ApiSalesReturn): SalesReturn => {
  const items: SalesReturnItem[] = Array.isArray(apiRet.items)
    ? apiRet.items.map((it, idx) => mapApiReturnItemToSalesReturnItem(it, idx))
    : [];

  const retAmount = Number(
    apiRet.returnAmount ?? items.reduce((acc, it) => acc + (it.returnAmount || it.returnQuantity * it.unitPrice), 0)
  );
  const refAmount = Number(apiRet.refundAmount ?? retAmount);

  let dateStr = apiRet.returnDate || (apiRet.createdAt ? apiRet.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }

  const rawReturnStatus = (apiRet.returnStatus || 'Approved') as string;
  let normalizedReturnStatus: SalesReturnStatus = 'Approved';
  if (rawReturnStatus === 'Requested') normalizedReturnStatus = 'Requested';
  else if (rawReturnStatus === 'Approved') normalizedReturnStatus = 'Approved';
  else if (rawReturnStatus === 'Received') normalizedReturnStatus = 'Received';
  else if (rawReturnStatus === 'Refunded') normalizedReturnStatus = 'Refunded';
  else if (rawReturnStatus === 'Rejected') normalizedReturnStatus = 'Rejected';

  const rawRefundStatus = (apiRet.refundStatus || 'Refunded') as string;
  let normalizedRefundStatus: RefundStatus = 'Refunded';
  if (rawRefundStatus === 'Pending') normalizedRefundStatus = 'Pending';
  else if (rawRefundStatus === 'Refunded') normalizedRefundStatus = 'Refunded';
  else if (rawRefundStatus === 'Store Credit') normalizedRefundStatus = 'Store Credit';
  else if (rawRefundStatus === 'Cancelled') normalizedRefundStatus = 'Cancelled';

  return {
    id: apiRet.id,
    returnNo: apiRet.returnNo || `RET-${Date.now().toString().slice(-6)}`,
    invoiceNo: apiRet.invoiceNo || apiRet.invoice?.invoiceNo || 'INV-0000',
    saleId: apiRet.saleId || apiRet.invoiceId || apiRet.invoice?.id || '',
    customerId: apiRet.customerId || '',
    customerName: apiRet.customerName || 'Unnamed Customer',
    customerCompany: apiRet.customerCompany || undefined,
    returnDate: dateStr,
    items,
    returnAmount: retAmount,
    refundMethod: (apiRet.refundMethod as any) || 'Store Credit',
    refundAmount: refAmount,
    refundStatus: normalizedRefundStatus,
    returnStatus: normalizedReturnStatus,
    rejectionReason: apiRet.rejectionReason || undefined,
    notes: apiRet.notes || undefined,
    createdAt: apiRet.createdAt || new Date().toISOString(),
    updatedAt: apiRet.updatedAt || new Date().toISOString(),
  };
};

/**
 * Mapper: SalesReturn -> CreateSalesReturnPayload (Strict backend schema)
 */
export const mapSalesReturnToApiPayload = (
  ret: Partial<SalesReturn> & {
    items: SalesReturnItem[];
    returnDate: string;
  }
): CreateSalesReturnPayload => {
  const dateVal = ret.returnDate || new Date().toISOString().split('T')[0];
  const dateStr = dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;

  const itemPayloads: CreateSalesReturnItemPayload[] = (ret.items || []).map((it) => {
    const itm: CreateSalesReturnItemPayload = {
      productId: it.productId || '',
      returnQuantity: Math.max(1, Number(it.returnQuantity) || 1),
      reason: it.reason || 'Defective',
    };
    if (it.productName && it.productName.trim()) {
      itm.productName = it.productName.trim();
    }
    if (it.sku && String(it.sku).trim()) {
      itm.sku = String(it.sku).trim();
    }
    if (it.batch && String(it.batch).trim()) {
      itm.batch = String(it.batch).trim();
    }
    if (it.notes && it.notes.trim()) {
      itm.notes = it.notes.trim();
    }
    return itm;
  });

  const payload: CreateSalesReturnPayload = {
    returnDate: dateStr,
    items: itemPayloads,
    refundMethod: ret.refundMethod || 'Store Credit',
    refundStatus: ret.refundStatus || 'Refunded',
    returnStatus: ret.returnStatus || 'Approved',
  };

  if (ret.returnNo && ret.returnNo.trim()) {
    payload.returnNo = ret.returnNo.trim();
  }
  if (ret.invoiceNo && ret.invoiceNo.trim()) {
    payload.invoiceNo = ret.invoiceNo.trim();
  }
  if (ret.saleId && UUID_REGEX.test(ret.saleId)) {
    payload.saleId = ret.saleId;
    payload.invoiceId = ret.saleId;
  }
  if (ret.customerId && UUID_REGEX.test(ret.customerId)) {
    payload.customerId = ret.customerId;
  }
  if (ret.customerName && ret.customerName.trim()) {
    payload.customerName = ret.customerName.trim();
  }
  if (ret.customerCompany && ret.customerCompany.trim()) {
    payload.customerCompany = ret.customerCompany.trim();
  }
  if (ret.notes && ret.notes.trim()) {
    payload.notes = ret.notes.trim();
  }

  return payload;
};

// =========================================================================
// RTK Query Injected Endpoints for Commerce Sales Returns
// =========================================================================

export const commerceSalesReturnEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommerceSalesReturns: builder.query<CommerceSalesReturnListResponse, SalesReturnFilterParams | void>({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        if (params) {
          if (typeof params.page_no === 'number') queryParams.page_no = params.page_no;
          if (typeof params.page_size === 'number') queryParams.page_size = params.page_size;
          if (typeof params.pagination_required !== 'undefined') {
            queryParams.pagination_required = String(params.pagination_required);
          }
          if (params.search && params.search.trim()) {
            queryParams.search = params.search.trim();
          }
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
          if (params.status && params.status !== 'ALL' && params.status !== 'All') {
            queryParams.status = params.status;
          }
          if (params.customerId && UUID_REGEX.test(params.customerId)) {
            queryParams.customerId = params.customerId;
          }
          if (params.branchId && UUID_REGEX.test(params.branchId)) {
            queryParams.branchId = params.branchId;
          }
          if (params.from) queryParams.from = params.from;
          if (params.to) queryParams.to = params.to;
          if (params.period && params.period !== 'all' && params.period !== 'All Time') {
            queryParams.period = params.period;
          }
          if (params.invoiceId && UUID_REGEX.test(params.invoiceId)) {
            queryParams.invoiceId = params.invoiceId;
          }
          if (params.refundStatus && params.refundStatus !== 'ALL' && params.refundStatus !== 'All') {
            queryParams.refundStatus = params.refundStatus;
          }
        }
        return {
          url: '/commerce/returns',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'SalesReturn' as const, id })),
              { type: 'SalesReturn', id: 'LIST' },
            ]
          : [{ type: 'SalesReturn', id: 'LIST' }],
    }),

    getCommerceSalesReturnById: builder.query<CommerceSalesReturnSingleResponse, string>({
      query: (id) => `/commerce/returns/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'SalesReturn', id }],
    }),

    createCommerceSalesReturn: builder.mutation<CommerceSalesReturnSingleResponse, CreateSalesReturnPayload>({
      query: (payload) => ({
        url: '/commerce/returns',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'SalesReturn', id: 'LIST' },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
      ],
    }),

    updateCommerceSalesReturn: builder.mutation<
      CommerceSalesReturnSingleResponse,
      { id: string; payload: UpdateSalesReturnPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/returns/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalesReturn', id },
        { type: 'SalesReturn', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
      ],
    }),

    patchCommerceSalesReturn: builder.mutation<
      CommerceSalesReturnSingleResponse,
      { id: string; payload: PatchSalesReturnPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/returns/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalesReturn', id },
        { type: 'SalesReturn', id: 'LIST' },
      ],
    }),

    deleteCommerceSalesReturn: builder.mutation<CommerceSalesReturnDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/returns/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'SalesReturn', id },
        { type: 'SalesReturn', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
      ],
    }),

    updateCommerceSalesReturnStatus: builder.mutation<
      CommerceSalesReturnSingleResponse,
      { id: string; payload: SalesReturnStatusPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/returns/${id}/status`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalesReturn', id },
        { type: 'SalesReturn', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetCommerceSalesReturnsQuery,
  useLazyGetCommerceSalesReturnsQuery,
  useGetCommerceSalesReturnByIdQuery,
  useCreateCommerceSalesReturnMutation,
  useUpdateCommerceSalesReturnMutation,
  usePatchCommerceSalesReturnMutation,
  useDeleteCommerceSalesReturnMutation,
  useUpdateCommerceSalesReturnStatusMutation,
} = commerceSalesReturnEndpoints;

// =========================================================================
// Imperative API Client for Commerce Sales Returns
// =========================================================================

export const commerceSalesReturnApi = {
  /**
   * List sales returns
   * GET /commerce/returns
   */
  getSalesReturns: async (params?: SalesReturnFilterParams): Promise<CommerceSalesReturnListResponse> => {
    const queryParams: Record<string, any> = {};

    if (params) {
      if (typeof params.page_no === 'number') queryParams.page_no = params.page_no;
      if (typeof params.page_size === 'number') queryParams.page_size = params.page_size;
      if (typeof params.pagination_required !== 'undefined') {
        queryParams.pagination_required = String(params.pagination_required);
      }
      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params.status && params.status !== 'ALL' && params.status !== 'All') {
        queryParams.status = params.status;
      }
      if (params.customerId && UUID_REGEX.test(params.customerId)) {
        queryParams.customerId = params.customerId;
      }
      if (params.branchId && UUID_REGEX.test(params.branchId)) {
        queryParams.branchId = params.branchId;
      }
      if (params.from) queryParams.from = params.from;
      if (params.to) queryParams.to = params.to;
      if (params.period && params.period !== 'all' && params.period !== 'All Time') {
        queryParams.period = params.period;
      }
      if (params.invoiceId && UUID_REGEX.test(params.invoiceId)) {
        queryParams.invoiceId = params.invoiceId;
      }
      if (params.refundStatus && params.refundStatus !== 'ALL' && params.refundStatus !== 'All') {
        queryParams.refundStatus = params.refundStatus;
      }
    }

    const response = await baseClient.get<CommerceSalesReturnListResponse>('/commerce/returns', {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * Get single sales return
   * GET /commerce/returns/{id}
   */
  getSalesReturnById: async (id: string): Promise<CommerceSalesReturnSingleResponse> => {
    const response = await baseClient.get<CommerceSalesReturnSingleResponse>(`/commerce/returns/${id}`);
    return response.data;
  },

  /**
   * Create sales return (restores stock when Approved/Received/Refunded)
   * POST /commerce/returns
   */
  createSalesReturn: async (payload: CreateSalesReturnPayload): Promise<CommerceSalesReturnSingleResponse> => {
    const response = await baseClient.post<CommerceSalesReturnSingleResponse>('/commerce/returns', payload);
    return response.data;
  },

  /**
   * Update sales return
   * PUT /commerce/returns/{id}
   */
  updateSalesReturn: async (
    id: string,
    payload: UpdateSalesReturnPayload
  ): Promise<CommerceSalesReturnSingleResponse> => {
    const response = await baseClient.put<CommerceSalesReturnSingleResponse>(`/commerce/returns/${id}`, payload);
    return response.data;
  },

  /**
   * Partially update sales return
   * PATCH /commerce/returns/{id}
   */
  patchSalesReturn: async (
    id: string,
    payload: PatchSalesReturnPayload
  ): Promise<CommerceSalesReturnSingleResponse> => {
    const response = await baseClient.patch<CommerceSalesReturnSingleResponse>(`/commerce/returns/${id}`, payload);
    return response.data;
  },

  /**
   * Delete / void sales return (removes any restored stock)
   * DELETE /commerce/returns/{id}
   */
  deleteSalesReturn: async (id: string): Promise<CommerceSalesReturnDeleteResponse> => {
    const response = await baseClient.delete<CommerceSalesReturnDeleteResponse>(`/commerce/returns/${id}`);
    return response.data;
  },

  /**
   * Update return status
   * PATCH /commerce/returns/{id}/status
   */
  updateStatus: async (
    id: string,
    status: string,
    rejectionReason?: string
  ): Promise<CommerceSalesReturnSingleResponse> => {
    const body: SalesReturnStatusPayload = { status };
    if (rejectionReason && rejectionReason.trim()) {
      body.rejectionReason = rejectionReason.trim();
    }
    const response = await baseClient.patch<CommerceSalesReturnSingleResponse>(`/commerce/returns/${id}/status`, body);
    return response.data;
  },
};
