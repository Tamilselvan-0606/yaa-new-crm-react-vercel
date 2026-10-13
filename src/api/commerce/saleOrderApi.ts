import { baseClient, baseApi } from '../baseApi';
import { SaleProductItem } from '../../store/useSalesManagementStore';
import {
  ApiSaleOrder,
  ApiSaleOrderItem,
  SaleOrderFilterParams,
  SaleOrderListResponse,
  SaleOrderSingleResponse,
  SaleOrderDeleteResponse,
  ConvertSaleOrderResponse,
  BulkConvertSaleOrderResponse,
  CreateSaleOrderPayload,
  UpdateSaleOrderPayload,
  PatchSaleOrderPayload,
  SaleOrderStatusUpdatePayload,
  ConvertSaleOrderPayload,
  BulkConvertSaleOrderPayload,
} from './saleOrderTypes';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Line item shape expected in the UI
 */
export interface ExtendedSaleOrderItem extends SaleProductItem {
  unit?: string;
  discountAmount?: number;
  taxAmount?: number;
  category?: string;
  itemCode?: string;
  hsnCode?: string;
  description?: string;
}

/**
 * UI Sales Order Model used by Sales Hub SaleOrderView
 */
export interface SaleOrderRecord {
  id: string;
  orderNo: string;
  referenceNo?: string;
  orderDate: string;
  dueDate: string;
  customerId: string;
  partyName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCompany?: string;
  billingAddress: string;
  shippingAddress?: string;
  stateOfSupply?: string;
  paymentType: string;
  items: ExtendedSaleOrderItem[];
  subtotal: number;
  withGst?: boolean;
  gstType?: 'intra_state' | 'inter_state';
  cgst?: number;
  sgst?: number;
  igst?: number;
  discount?: number;
  taxAmount?: number;
  roundOff?: number;
  amount: number;
  advanceAmount?: number;
  balance: number;
  status: 'Open' | 'Converted' | 'Completed' | 'Cancelled';
  convertedToInvoiceNo?: string;
  convertedToType?: 'Invoice' | string | null;
  convertedToId?: string | null;
  notes?: string;
  terms?: string;
  attachedImageName?: string;
  attachedDocName?: string;
  expectedDeliveryDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mapper: ApiSaleOrderItem -> ExtendedSaleOrderItem
 */
export const mapApiSaleOrderItemToSaleProductItem = (
  it: ApiSaleOrderItem,
  idx: number = 0
): ExtendedSaleOrderItem => {
  const qty = Number(it.quantity) || 0;
  const rate = Number(it.unitPrice) || 0;
  const discPct = Number(it.discountPercent) || 0;
  const discAmt = Number(it.discountAmount ?? ((qty * rate * discPct) / 100));
  const taxable = Math.max(0, qty * rate - discAmt);
  const taxRate = Number(it.taxPercent) || 0;
  const taxAmt = Number(it.taxAmount ?? ((taxable * taxRate) / 100));
  const lineTotal = Number(it.totalAmount ?? it.total ?? taxable + taxAmt);

  return {
    id: it.id || `item_${idx}_${Date.now()}`,
    productId: it.productId || '',
    productName: it.productName || 'Unnamed Item',
    sku: it.sku || undefined,
    batch: it.batch || undefined,
    quantity: qty,
    unitPrice: rate,
    discountPercent: discPct,
    taxPercent: taxRate,
    total: lineTotal,
    unit: it.unit || 'PCS',
    discountAmount: discAmt,
    taxAmount: taxAmt,
    category: it.category || '',
    itemCode: it.itemCode || it.sku || '',
    hsnCode: it.hsnCode || '',
    description: it.description || '',
  };
};

/**
 * Mapper: ApiSaleOrder -> SaleOrderRecord
 */
export const mapApiSaleOrderToSaleOrderRecord = (apiO: ApiSaleOrder): SaleOrderRecord => {
  const items: ExtendedSaleOrderItem[] = Array.isArray(apiO.items)
    ? apiO.items.map((it, idx) => mapApiSaleOrderItemToSaleProductItem(it, idx))
    : [];

  const subtotal = Number(apiO.subtotal ?? apiO.subTotal ?? 0);
  const cgst = Number(apiO.cgst ?? 0);
  const sgst = Number(apiO.sgst ?? 0);
  const igst = Number(apiO.igst ?? 0);
  const totalTax = Number(apiO.taxAmount ?? cgst + sgst + igst);
  const discount = Number(apiO.discount ?? apiO.discountAmount ?? 0);
  const roundOff = Number(apiO.roundOff ?? 0);
  const amount = Number(apiO.amount ?? apiO.grandTotal ?? subtotal - discount + totalTax + roundOff);
  const advanceAmount = Number(apiO.advanceAmount ?? 0);
  const balance = Number(apiO.balance ?? Math.max(0, amount - advanceAmount));

  let orderDateStr = apiO.orderDate || (apiO.createdAt ? apiO.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
  if (orderDateStr.includes('T')) {
    orderDateStr = orderDateStr.split('T')[0];
  }

  let dueDateStr = apiO.dueDate || (apiO.expectedDeliveryDate ? apiO.expectedDeliveryDate.split('T')[0] : orderDateStr);
  if (dueDateStr.includes('T')) {
    dueDateStr = dueDateStr.split('T')[0];
  }

  const rawStatus = (apiO.status || 'Open') as string;
  let normalizedStatus: 'Open' | 'Converted' | 'Completed' | 'Cancelled' = 'Open';
  if (rawStatus === 'Converted') normalizedStatus = 'Converted';
  else if (rawStatus === 'Completed' || rawStatus === 'Delivered') normalizedStatus = 'Completed';
  else if (rawStatus === 'Cancelled' || rawStatus === 'Deleted') normalizedStatus = 'Cancelled';
  else normalizedStatus = 'Open';

  return {
    id: apiO.id,
    orderNo: apiO.orderNo || 'SO-0000',
    referenceNo: apiO.referenceNo || undefined,
    orderDate: orderDateStr,
    dueDate: dueDateStr,
    customerId: apiO.customerId || apiO.customer?.id || '',
    partyName: apiO.partyName || apiO.customer?.name || 'Unnamed Party',
    customerPhone: apiO.customerPhone || apiO.customer?.phone || undefined,
    customerEmail: apiO.customerEmail || apiO.customer?.email || undefined,
    customerCompany: apiO.customerCompany || apiO.customer?.company || undefined,
    billingAddress: apiO.billingAddress || '',
    shippingAddress: apiO.shippingAddress || apiO.billingAddress || undefined,
    stateOfSupply: apiO.stateOfSupply || undefined,
    paymentType: apiO.paymentType || 'Credit',
    items,
    subtotal,
    withGst: apiO.withGst ?? totalTax > 0,
    gstType: (apiO.gstType as 'intra_state' | 'inter_state') || (cgst > 0 ? 'intra_state' : 'inter_state'),
    cgst,
    sgst,
    igst,
    discount,
    taxAmount: totalTax,
    roundOff,
    amount,
    advanceAmount,
    balance,
    status: normalizedStatus,
    convertedToInvoiceNo: apiO.convertedToInvoiceNo || undefined,
    convertedToType: apiO.convertedToType || undefined,
    convertedToId: apiO.convertedToId || undefined,
    notes: apiO.notes || undefined,
    terms: apiO.terms || undefined,
    attachedImageName: apiO.attachedImageName || undefined,
    attachedDocName: apiO.attachedDocName || undefined,
    expectedDeliveryDate: apiO.expectedDeliveryDate || undefined,
    createdAt: apiO.createdAt || new Date().toISOString(),
    updatedAt: apiO.updatedAt || new Date().toISOString(),
  };
};

/**
 * Mapper: SaleOrderRecord -> CreateSaleOrderPayload (Matches Commerce API schema)
 */
export const mapSaleOrderRecordToPayload = (
  order: Partial<SaleOrderRecord> & {
    items: any[];
    partyName: string;
    stateOfSupply?: string;
  },
  isCreate: boolean = false
): CreateSaleOrderPayload => {
  const payload: CreateSaleOrderPayload = {
    partyName: order.partyName.trim(),
    items: (order.items || []).map((it: any) => {
      const itemPayload: any = {
        productId: it.productId || '',
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      };
      if (it.productName && it.productName.trim()) {
        itemPayload.productName = it.productName.trim();
      }
      if (it.sku && String(it.sku).trim()) {
        itemPayload.sku = String(it.sku).trim();
      } else if (it.itemCode && String(it.itemCode).trim()) {
        itemPayload.sku = String(it.itemCode).trim();
      }
      if (typeof it.discountPercent === 'number' && !isNaN(it.discountPercent) && it.discountPercent > 0) {
        itemPayload.discountPercent = it.discountPercent;
      }
      if (typeof it.taxPercent === 'number' && !isNaN(it.taxPercent) && it.taxPercent > 0) {
        itemPayload.taxPercent = it.taxPercent;
      }
      if (it.batch && String(it.batch).trim()) {
        itemPayload.batch = String(it.batch).trim();
        itemPayload.batchNo = String(it.batch).trim();
      }
      return itemPayload;
    }),
  };

  // On creation, omit client-generated temporary orderNo so backend sequence assigns the official document number
  if (!isCreate && order.orderNo && order.orderNo.trim()) {
    payload.orderNo = order.orderNo.trim();
  }
  if (order.referenceNo && order.referenceNo.trim()) {
    payload.referenceNo = order.referenceNo.trim();
  }
  if (order.orderDate) {
    payload.orderDate = order.orderDate.includes('T') ? order.orderDate.split('T')[0] : order.orderDate;
  }
  if (order.dueDate) {
    payload.dueDate = order.dueDate.includes('T') ? order.dueDate.split('T')[0] : order.dueDate;
  }
  if (order.customerId && UUID_REGEX.test(order.customerId)) {
    payload.customerId = order.customerId;
  }
  if (order.customerCompany && order.customerCompany.trim()) {
    payload.customerCompany = order.customerCompany.trim();
  }
  if (order.customerPhone && order.customerPhone.trim()) {
    payload.customerPhone = order.customerPhone.trim();
  }
  if (order.customerEmail && order.customerEmail.trim()) {
    payload.customerEmail = order.customerEmail.trim();
  }
  if (order.billingAddress && order.billingAddress.trim()) {
    payload.billingAddress = order.billingAddress.trim();
  }
  if (order.shippingAddress && order.shippingAddress.trim()) {
    payload.shippingAddress = order.shippingAddress.trim();
  }
  if (typeof order.withGst === 'boolean') {
    payload.withGst = order.withGst;
  }
  if (order.gstType) {
    payload.gstType = order.gstType;
  }
  if (typeof order.roundOff === 'number' && !isNaN(order.roundOff)) {
    payload.roundOff = Number(order.roundOff.toFixed(2));
  }
  if (typeof order.advanceAmount === 'number' && !isNaN(order.advanceAmount) && order.advanceAmount >= 0) {
    payload.advanceAmount = order.advanceAmount;
  }
  if (order.paymentType && order.paymentType.trim()) {
    payload.paymentType = order.paymentType.trim();
  }
  if (order.notes && order.notes.trim()) {
    payload.notes = order.notes.trim();
  }
  if (order.terms && order.terms.trim()) {
    payload.terms = order.terms.trim();
  }
  if (order.stateOfSupply && order.stateOfSupply !== 'Select State') {
    payload.stateOfSupply = order.stateOfSupply;
  }
  if (order.attachedImageName && order.attachedImageName.trim()) {
    payload.attachedImageName = order.attachedImageName.trim();
  }
  if (order.attachedDocName && order.attachedDocName.trim()) {
    payload.attachedDocName = order.attachedDocName.trim();
  }

  return payload;
};

// =========================================================================
// RTK Query Endpoints Injection
// =========================================================================

export const commerceSaleOrderEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommerceSaleOrders: builder.query<SaleOrderListResponse, SaleOrderFilterParams | void>({
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
        }
        return {
          url: '/commerce/orders',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'SalesOrder' as const, id })),
              { type: 'SalesOrder', id: 'LIST' },
            ]
          : [{ type: 'SalesOrder', id: 'LIST' }],
    }),

    getCommerceSaleOrderById: builder.query<SaleOrderSingleResponse, string>({
      query: (id) => `/commerce/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'SalesOrder', id }],
    }),

    createCommerceSaleOrder: builder.mutation<SaleOrderSingleResponse, CreateSaleOrderPayload>({
      query: (payload) => ({
        url: '/commerce/orders',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'SalesOrder', id: 'LIST' }],
    }),

    updateCommerceSaleOrder: builder.mutation<
      SaleOrderSingleResponse,
      { id: string; payload: UpdateSaleOrderPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/orders/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalesOrder', id },
        { type: 'SalesOrder', id: 'LIST' },
      ],
    }),

    patchCommerceSaleOrder: builder.mutation<
      SaleOrderSingleResponse,
      { id: string; payload: PatchSaleOrderPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/orders/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalesOrder', id },
        { type: 'SalesOrder', id: 'LIST' },
      ],
    }),

    deleteCommerceSaleOrder: builder.mutation<SaleOrderDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'SalesOrder', id },
        { type: 'SalesOrder', id: 'LIST' },
      ],
    }),

    updateCommerceSaleOrderStatus: builder.mutation<
      SaleOrderSingleResponse,
      { id: string; payload: SaleOrderStatusUpdatePayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/orders/${id}/status`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalesOrder', id },
        { type: 'SalesOrder', id: 'LIST' },
      ],
    }),

    convertCommerceSaleOrder: builder.mutation<
      ConvertSaleOrderResponse,
      { id: string; payload: ConvertSaleOrderPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/orders/${id}/convert`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalesOrder', id },
        { type: 'SalesOrder', id: 'LIST' },
        { type: 'SalesInvoice', id: 'LIST' },
      ],
    }),

    bulkConvertCommerceSaleOrders: builder.mutation<
      BulkConvertSaleOrderResponse,
      BulkConvertSaleOrderPayload
    >({
      query: (payload) => ({
        url: '/commerce/orders/bulk-convert',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'SalesOrder', id: 'LIST' },
        { type: 'SalesInvoice', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetCommerceSaleOrdersQuery,
  useLazyGetCommerceSaleOrdersQuery,
  useGetCommerceSaleOrderByIdQuery,
  useCreateCommerceSaleOrderMutation,
  useUpdateCommerceSaleOrderMutation,
  usePatchCommerceSaleOrderMutation,
  useDeleteCommerceSaleOrderMutation,
  useUpdateCommerceSaleOrderStatusMutation,
  useConvertCommerceSaleOrderMutation,
  useBulkConvertCommerceSaleOrdersMutation,
} = commerceSaleOrderEndpoints;

// =========================================================================
// Imperative API Client for Direct Service / Modal / Custom hooks
// =========================================================================

export const commerceSaleOrderApi = {
  /**
   * List sales orders
   * GET /commerce/orders
   */
  getOrders: async (params?: SaleOrderFilterParams): Promise<SaleOrderListResponse> => {
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
    }

    const response = await baseClient.get<SaleOrderListResponse>('/commerce/orders', {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * Get single sales order with line items
   * GET /commerce/orders/{id}
   */
  getOrderById: async (id: string): Promise<SaleOrderSingleResponse> => {
    const response = await baseClient.get<SaleOrderSingleResponse>(`/commerce/orders/${id}`);
    return response.data;
  },

  /**
   * Create new sales order
   * POST /commerce/orders
   */
  createOrder: async (payload: CreateSaleOrderPayload): Promise<SaleOrderSingleResponse> => {
    const response = await baseClient.post<SaleOrderSingleResponse>('/commerce/orders', payload);
    return response.data;
  },

  /**
   * Edit / Replace sales order
   * PUT /commerce/orders/{id}
   */
  updateOrder: async (
    id: string,
    payload: UpdateSaleOrderPayload
  ): Promise<SaleOrderSingleResponse> => {
    const response = await baseClient.put<SaleOrderSingleResponse>(`/commerce/orders/${id}`, payload);
    return response.data;
  },

  /**
   * Partially update sales order
   * PATCH /commerce/orders/{id}
   */
  patchOrder: async (
    id: string,
    payload: PatchSaleOrderPayload
  ): Promise<SaleOrderSingleResponse> => {
    const response = await baseClient.patch<SaleOrderSingleResponse>(`/commerce/orders/${id}`, payload);
    return response.data;
  },

  /**
   * Delete / Cancel sales order
   * DELETE /commerce/orders/{id}
   */
  deleteOrder: async (id: string): Promise<SaleOrderDeleteResponse> => {
    const response = await baseClient.delete<SaleOrderDeleteResponse>(`/commerce/orders/${id}`);
    return response.data;
  },

  /**
   * Update sales order status
   * PATCH /commerce/orders/{id}/status
   */
  updateStatus: async (
    id: string,
    status: string
  ): Promise<SaleOrderSingleResponse> => {
    const response = await baseClient.patch<SaleOrderSingleResponse>(`/commerce/orders/${id}/status`, {
      status,
    });
    return response.data;
  },

  /**
   * Convert sales order to invoice
   * POST /commerce/orders/{id}/convert
   */
  convertOrder: async (
    id: string,
    payload: ConvertSaleOrderPayload
  ): Promise<ConvertSaleOrderResponse> => {
    const response = await baseClient.post<ConvertSaleOrderResponse>(
      `/commerce/orders/${id}/convert`,
      payload
    );
    return response.data;
  },

  /**
   * Bulk convert sales orders to invoices
   * POST /commerce/orders/bulk-convert
   */
  bulkConvertOrders: async (
    payload: BulkConvertSaleOrderPayload
  ): Promise<BulkConvertSaleOrderResponse> => {
    const response = await baseClient.post<BulkConvertSaleOrderResponse>(
      '/commerce/orders/bulk-convert',
      payload
    );
    return response.data;
  },
};
