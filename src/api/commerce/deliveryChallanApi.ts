import { baseClient, baseApi } from '../baseApi';
import { SaleProductItem } from '../../store/useSalesManagementStore';
import {
  ApiDeliveryChallan,
  ApiDeliveryChallanItem,
  DeliveryChallanFilterParams,
  DeliveryChallanListResponse,
  DeliveryChallanSingleResponse,
  DeliveryChallanDeleteResponse,
  ConvertDeliveryChallanResponse,
  BulkConvertDeliveryChallanResponse,
  CreateDeliveryChallanPayload,
  UpdateDeliveryChallanPayload,
  PatchDeliveryChallanPayload,
  DeliveryChallanStatusUpdatePayload,
  ConvertDeliveryChallanPayload,
  BulkConvertDeliveryChallanPayload,
} from './deliveryChallanTypes';

export * from './deliveryChallanTypes';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Line item shape expected in UI
 */
export interface ExtendedChallanItem extends SaleProductItem {
  unit?: string;
  discountAmount?: number;
  taxAmount?: number;
  category?: string;
  itemCode?: string;
  hsnCode?: string;
  description?: string;
}

/**
 * UI Delivery Challan Model used by Sales Hub DeliveryChallanView
 */
export interface DeliveryChallanRecord {
  id: string;
  challanNo: string;
  referenceNo?: string;
  invoiceDate: string;
  dueDate: string;
  customerId: string;
  partyName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCompany?: string;
  billingAddress: string;
  shippingAddress?: string;
  stateOfSupply?: string;
  items: ExtendedChallanItem[];
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
  balance: number;
  status: 'Open' | 'Converted' | 'Delivered' | 'Cancelled';
  convertedToInvoiceNo?: string;
  convertedToType?: 'Invoice' | string | null;
  convertedToId?: string | null;
  notes?: string;
  terms?: string;
  attachedImageName?: string;
  attachedDocName?: string;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mapper: ApiDeliveryChallanItem -> ExtendedChallanItem
 */
export const mapApiDeliveryChallanItemToExtendedItem = (
  it: ApiDeliveryChallanItem,
  idx: number = 0
): ExtendedChallanItem => {
  const qty = Number(it.quantity) || 0;
  const rate = Number(it.unitPrice) || 0;
  const discPct = Number(it.discountPercent) || 0;
  const discAmt = Number(it.discountAmount ?? ((qty * rate * discPct) / 100));
  const taxable = Math.max(0, qty * rate - discAmt);
  const taxRate = Number(it.taxPercent) || 0;
  const taxAmt = Number(it.taxAmount ?? ((taxable * taxRate) / 100));
  const lineTotal = Number(it.totalAmount ?? it.total ?? taxable + taxAmt);

  return {
    id: it.id || `challan_item_${idx}_${Date.now()}`,
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
 * Mapper: ApiDeliveryChallan -> DeliveryChallanRecord
 */
export const mapApiDeliveryChallanToRecord = (apiC: ApiDeliveryChallan): DeliveryChallanRecord => {
  const items: ExtendedChallanItem[] = Array.isArray(apiC.items)
    ? apiC.items.map((it, idx) => mapApiDeliveryChallanItemToExtendedItem(it, idx))
    : [];

  const subtotal = Number(apiC.subtotal ?? apiC.subTotal ?? 0);
  const cgst = Number(apiC.cgst ?? 0);
  const sgst = Number(apiC.sgst ?? 0);
  const igst = Number(apiC.igst ?? 0);
  const totalTax = Number(apiC.taxAmount ?? cgst + sgst + igst);
  const discount = Number(apiC.discount ?? apiC.discountAmount ?? 0);
  const roundOff = Number(apiC.roundOff ?? 0);
  const amount = Number(apiC.amount ?? apiC.grandTotal ?? subtotal - discount + totalTax + roundOff);
  const balance = Number(apiC.balance ?? amount);

  let dateStr = apiC.invoiceDate || (apiC.challanDate ? apiC.challanDate.split('T')[0] : apiC.createdAt ? apiC.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }

  let dueDateStr = apiC.dueDate || dateStr;
  if (dueDateStr.includes('T')) {
    dueDateStr = dueDateStr.split('T')[0];
  }

  const rawStatus = (apiC.status || 'Open') as string;
  let normalizedStatus: 'Open' | 'Converted' | 'Delivered' | 'Cancelled' = 'Open';
  if (rawStatus === 'Converted') normalizedStatus = 'Converted';
  else if (rawStatus === 'Delivered' || rawStatus === 'Completed') normalizedStatus = 'Delivered';
  else if (rawStatus === 'Cancelled' || rawStatus === 'Deleted') normalizedStatus = 'Cancelled';
  else normalizedStatus = 'Open';

  return {
    id: apiC.id,
    challanNo: apiC.challanNo || 'DC-0000',
    referenceNo: apiC.referenceNo || undefined,
    invoiceDate: dateStr,
    dueDate: dueDateStr,
    customerId: apiC.customerId || apiC.customer?.id || '',
    partyName: apiC.partyName || apiC.customer?.name || 'Unnamed Party',
    customerPhone: apiC.customerPhone || apiC.customer?.phone || undefined,
    customerEmail: apiC.customerEmail || apiC.customer?.email || undefined,
    customerCompany: apiC.customerCompany || apiC.customer?.company || undefined,
    billingAddress: apiC.billingAddress || '',
    shippingAddress: apiC.shippingAddress || apiC.billingAddress || undefined,
    stateOfSupply: apiC.stateOfSupply || undefined,
    items,
    subtotal,
    withGst: apiC.withGst ?? totalTax > 0,
    gstType: (apiC.gstType as 'intra_state' | 'inter_state') || (cgst > 0 ? 'intra_state' : 'inter_state'),
    cgst,
    sgst,
    igst,
    discount,
    taxAmount: totalTax,
    roundOff,
    amount,
    balance,
    status: normalizedStatus,
    convertedToInvoiceNo: apiC.convertedToInvoiceNo || undefined,
    convertedToType: apiC.convertedToType || undefined,
    convertedToId: apiC.convertedToId || undefined,
    notes: apiC.notes || undefined,
    terms: apiC.terms || undefined,
    attachedImageName: apiC.attachedImageName || undefined,
    attachedDocName: apiC.attachedDocName || undefined,
    vehicleNo: apiC.vehicleNo || undefined,
    driverName: apiC.driverName || undefined,
    driverPhone: apiC.driverPhone || undefined,
    createdAt: apiC.createdAt || new Date().toISOString(),
    updatedAt: apiC.updatedAt || new Date().toISOString(),
  };
};

/**
 * Mapper: DeliveryChallanRecord -> CreateDeliveryChallanPayload (Strict schema)
 */
export const mapDeliveryChallanRecordToPayload = (
  challan: Partial<DeliveryChallanRecord> & {
    items: any[];
    partyName: string;
    stateOfSupply?: string;
  },
  isCreate: boolean = false
): CreateDeliveryChallanPayload => {
  const payload: CreateDeliveryChallanPayload = {
    partyName: challan.partyName.trim(),
    items: (challan.items || []).map((it: any) => {
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

  // On creation, omit temporary client-generated challanNo so backend sequence assigns official number
  if (!isCreate && challan.challanNo && challan.challanNo.trim()) {
    payload.challanNo = challan.challanNo.trim();
  }
  if (challan.referenceNo && challan.referenceNo.trim()) {
    payload.referenceNo = challan.referenceNo.trim();
  }
  if (challan.invoiceDate) {
    payload.invoiceDate = challan.invoiceDate.includes('T') ? challan.invoiceDate.split('T')[0] : challan.invoiceDate;
  }
  if (challan.dueDate) {
    payload.dueDate = challan.dueDate.includes('T') ? challan.dueDate.split('T')[0] : challan.dueDate;
  }
  if (challan.customerId && UUID_REGEX.test(challan.customerId)) {
    payload.customerId = challan.customerId;
  }
  if (challan.customerCompany && challan.customerCompany.trim()) {
    payload.customerCompany = challan.customerCompany.trim();
  }
  if (challan.customerPhone && challan.customerPhone.trim()) {
    payload.customerPhone = challan.customerPhone.trim();
  }
  if (challan.customerEmail && challan.customerEmail.trim()) {
    payload.customerEmail = challan.customerEmail.trim();
  }
  if (challan.billingAddress && challan.billingAddress.trim()) {
    payload.billingAddress = challan.billingAddress.trim();
  }
  if (challan.shippingAddress && challan.shippingAddress.trim()) {
    payload.shippingAddress = challan.shippingAddress.trim();
  }
  if (typeof challan.withGst === 'boolean') {
    payload.withGst = challan.withGst;
  }
  if (challan.gstType) {
    payload.gstType = challan.gstType;
  }
  if (typeof challan.roundOff === 'number' && !isNaN(challan.roundOff)) {
    payload.roundOff = Number(challan.roundOff.toFixed(2));
  }
  if (challan.vehicleNo && challan.vehicleNo.trim()) {
    payload.vehicleNo = challan.vehicleNo.trim();
  }
  if (challan.driverName && challan.driverName.trim()) {
    payload.driverName = challan.driverName.trim();
  }
  if (challan.driverPhone && challan.driverPhone.trim()) {
    payload.driverPhone = challan.driverPhone.trim();
  }
  if (challan.notes && challan.notes.trim()) {
    payload.notes = challan.notes.trim();
  }
  if (challan.terms && challan.terms.trim()) {
    payload.terms = challan.terms.trim();
  }
  if (challan.stateOfSupply && challan.stateOfSupply !== 'Select State') {
    payload.stateOfSupply = challan.stateOfSupply;
  }
  if (challan.attachedImageName && challan.attachedImageName.trim()) {
    payload.attachedImageName = challan.attachedImageName.trim();
  }
  if (challan.attachedDocName && challan.attachedDocName.trim()) {
    payload.attachedDocName = challan.attachedDocName.trim();
  }

  return payload;
};

// =========================================================================
// RTK Query Endpoints Injection
// =========================================================================

export const commerceDeliveryChallanEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommerceDeliveryChallans: builder.query<
      DeliveryChallanListResponse,
      DeliveryChallanFilterParams | void
    >({
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
          url: '/commerce/challans',
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'DeliveryChallan' as const, id })),
              { type: 'DeliveryChallan', id: 'LIST' },
            ]
          : [{ type: 'DeliveryChallan', id: 'LIST' }],
    }),

    getCommerceDeliveryChallanById: builder.query<DeliveryChallanSingleResponse, string>({
      query: (id) => `/commerce/challans/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'DeliveryChallan', id }],
    }),

    createCommerceDeliveryChallan: builder.mutation<
      DeliveryChallanSingleResponse,
      CreateDeliveryChallanPayload
    >({
      query: (payload) => ({
        url: '/commerce/challans',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'DeliveryChallan', id: 'LIST' }],
    }),

    updateCommerceDeliveryChallan: builder.mutation<
      DeliveryChallanSingleResponse,
      { id: string; payload: UpdateDeliveryChallanPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/challans/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'DeliveryChallan', id },
        { type: 'DeliveryChallan', id: 'LIST' },
      ],
    }),

    patchCommerceDeliveryChallan: builder.mutation<
      DeliveryChallanSingleResponse,
      { id: string; payload: PatchDeliveryChallanPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/challans/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'DeliveryChallan', id },
        { type: 'DeliveryChallan', id: 'LIST' },
      ],
    }),

    deleteCommerceDeliveryChallan: builder.mutation<DeliveryChallanDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/challans/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'DeliveryChallan', id },
        { type: 'DeliveryChallan', id: 'LIST' },
      ],
    }),

    updateCommerceDeliveryChallanStatus: builder.mutation<
      DeliveryChallanSingleResponse,
      { id: string; payload: DeliveryChallanStatusUpdatePayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/challans/${id}/status`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'DeliveryChallan', id },
        { type: 'DeliveryChallan', id: 'LIST' },
      ],
    }),

    convertCommerceDeliveryChallan: builder.mutation<
      ConvertDeliveryChallanResponse,
      { id: string; payload: ConvertDeliveryChallanPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/challans/${id}/convert`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'DeliveryChallan', id },
        { type: 'DeliveryChallan', id: 'LIST' },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Customer', id: 'LIST' },
      ],
    }),

    bulkConvertCommerceDeliveryChallans: builder.mutation<
      BulkConvertDeliveryChallanResponse,
      BulkConvertDeliveryChallanPayload
    >({
      query: (payload) => ({
        url: '/commerce/challans/bulk-convert',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'DeliveryChallan', id: 'LIST' },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Customer', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetCommerceDeliveryChallansQuery,
  useLazyGetCommerceDeliveryChallansQuery,
  useGetCommerceDeliveryChallanByIdQuery,
  useCreateCommerceDeliveryChallanMutation,
  useUpdateCommerceDeliveryChallanMutation,
  usePatchCommerceDeliveryChallanMutation,
  useDeleteCommerceDeliveryChallanMutation,
  useUpdateCommerceDeliveryChallanStatusMutation,
  useConvertCommerceDeliveryChallanMutation,
  useBulkConvertCommerceDeliveryChallansMutation,
} = commerceDeliveryChallanEndpoints;

// =========================================================================
// Imperative API Client for Direct Service / Modal / Custom Hooks
// =========================================================================

export const commerceDeliveryChallanApi = {
  /**
   * List delivery challans
   * GET /commerce/challans
   */
  getChallans: async (
    params?: DeliveryChallanFilterParams
  ): Promise<DeliveryChallanListResponse> => {
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

    const response = await baseClient.get<DeliveryChallanListResponse>('/commerce/challans', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return response.data;
  },

  /**
   * Get single delivery challan with line items
   * GET /commerce/challans/{id}
   */
  getChallanById: async (id: string): Promise<DeliveryChallanSingleResponse> => {
    const response = await baseClient.get<DeliveryChallanSingleResponse>(
      `/commerce/challans/${id}`
    );
    return response.data;
  },

  /**
   * Create new delivery challan
   * POST /commerce/challans
   */
  createChallan: async (
    payload: CreateDeliveryChallanPayload
  ): Promise<DeliveryChallanSingleResponse> => {
    const response = await baseClient.post<DeliveryChallanSingleResponse>(
      '/commerce/challans',
      payload
    );
    return response.data;
  },

  /**
   * Edit / Replace delivery challan
   * PUT /commerce/challans/{id}
   */
  updateChallan: async (
    id: string,
    payload: UpdateDeliveryChallanPayload
  ): Promise<DeliveryChallanSingleResponse> => {
    const response = await baseClient.put<DeliveryChallanSingleResponse>(
      `/commerce/challans/${id}`,
      payload
    );
    return response.data;
  },

  /**
   * Partially update delivery challan
   * PATCH /commerce/challans/{id}
   */
  patchChallan: async (
    id: string,
    payload: PatchDeliveryChallanPayload
  ): Promise<DeliveryChallanSingleResponse> => {
    const response = await baseClient.patch<DeliveryChallanSingleResponse>(
      `/commerce/challans/${id}`,
      payload
    );
    return response.data;
  },

  /**
   * Delete / Cancel delivery challan
   * DELETE /commerce/challans/{id}
   */
  deleteChallan: async (id: string): Promise<DeliveryChallanDeleteResponse> => {
    const response = await baseClient.delete<DeliveryChallanDeleteResponse>(
      `/commerce/challans/${id}`
    );
    return response.data;
  },

  /**
   * Update delivery challan status
   * PATCH /commerce/challans/{id}/status
   */
  updateStatus: async (
    id: string,
    status: string
  ): Promise<DeliveryChallanSingleResponse> => {
    const response = await baseClient.patch<DeliveryChallanSingleResponse>(
      `/commerce/challans/${id}/status`,
      { status }
    );
    return response.data;
  },

  /**
   * Convert delivery challan to invoice
   * POST /commerce/challans/{id}/convert
   */
  convertChallan: async (
    id: string,
    payload: ConvertDeliveryChallanPayload
  ): Promise<ConvertDeliveryChallanResponse> => {
    const response = await baseClient.post<ConvertDeliveryChallanResponse>(
      `/commerce/challans/${id}/convert`,
      payload
    );
    return response.data;
  },

  /**
   * Bulk convert delivery challans to invoices
   * POST /commerce/challans/bulk-convert
   */
  bulkConvertChallans: async (
    payload: BulkConvertDeliveryChallanPayload
  ): Promise<BulkConvertDeliveryChallanResponse> => {
    const response = await baseClient.post<BulkConvertDeliveryChallanResponse>(
      '/commerce/challans/bulk-convert',
      payload
    );
    return response.data;
  },
};
