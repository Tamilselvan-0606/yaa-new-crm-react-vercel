import { baseClient, baseApi } from '../baseApi';
import { SaleProductItem } from '../../store/useSalesManagementStore';
import {
  ApiProformaInvoice,
  ApiProformaInvoiceItem,
  ProformaFilterParams,
  ProformaListResponse,
  ProformaSingleResponse,
  ProformaDeleteResponse,
  ConvertProformaResponse,
  CreateProformaPayload,
  UpdateProformaPayload,
  PatchProformaPayload,
  ProformaStatusUpdatePayload,
  ConvertProformaPayload,
} from './proformaTypes';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Line item shape expected in the UI
 */
export interface ExtendedProformaItem extends SaleProductItem {
  unit?: string;
  discountAmount?: number;
  taxAmount?: number;
  category?: string;
  itemCode?: string;
  hsnCode?: string;
  description?: string;
}

/**
 * UI Proforma Invoice Model used by Sales Hub ProformaInvoiceView
 */
export interface SaleProformaInvoice {
  id: string;
  proformaNo: string;
  referenceNo?: string;
  date: string;
  validUntil: string;
  customerId: string;
  partyName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  billingAddress: string;
  shippingAddress?: string;
  stateOfSupply?: string;
  items: ExtendedProformaItem[];
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
  status: 'Open' | 'Converted' | 'Expired' | 'Cancelled';
  convertedToInvoiceNo?: string;
  convertedToType?: 'Invoice' | string | null;
  convertedToId?: string | null;
  notes?: string;
  terms?: string;
  attachedImageName?: string;
  attachedDocName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mapper: ApiProformaInvoiceItem -> ExtendedProformaItem
 */
export const mapApiProformaItemToSaleProductItem = (
  it: ApiProformaInvoiceItem,
  idx: number = 0
): ExtendedProformaItem => {
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
 * Mapper: ApiProformaInvoice -> SaleProformaInvoice
 */
export const mapApiProformaToSaleProforma = (apiP: ApiProformaInvoice): SaleProformaInvoice => {
  const rawDate = apiP.date || apiP.proformaDate || new Date().toISOString();
  const dateFormatted = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
  const validUntilFormatted = apiP.validUntil?.includes('T')
    ? apiP.validUntil.split('T')[0]
    : apiP.validUntil || '';

  const mappedItems: ExtendedProformaItem[] = Array.isArray(apiP.items)
    ? apiP.items.map((it, idx) => mapApiProformaItemToSaleProductItem(it, idx))
    : [];

  const subtotal = Number(apiP.subtotal ?? apiP.subTotal ?? 0);
  const totalDiscount = Number(apiP.discount ?? apiP.discountAmount ?? apiP.overallDiscount ?? 0);
  const totalTax = Number(apiP.taxAmount ?? 0);
  const totalAmount = Number(apiP.amount ?? apiP.grandTotal ?? 0);
  const balance = Number(apiP.balance ?? totalAmount);

  // Status mapping
  let normStatus: 'Open' | 'Converted' | 'Expired' | 'Cancelled' = 'Open';
  const st = String(apiP.status || '').toLowerCase();
  if (st.includes('convert')) normStatus = 'Converted';
  else if (st.includes('cancel')) normStatus = 'Cancelled';
  else if (st.includes('expire')) normStatus = 'Expired';
  else normStatus = 'Open';

  const gstTypeNorm: 'intra_state' | 'inter_state' =
    apiP.gstType === 'inter_state' || String(apiP.stateOfSupply || '').toLowerCase().includes('inter')
      ? 'inter_state'
      : 'intra_state';

  return {
    id: apiP.id,
    proformaNo: apiP.proformaNo || 'PRO-2026-0001',
    referenceNo: apiP.referenceNo || '',
    date: dateFormatted,
    validUntil: validUntilFormatted,
    customerId: apiP.customerId || apiP.customer?.id || '',
    partyName: apiP.partyName || apiP.customer?.name || 'Unnamed Customer',
    customerCompany: apiP.customerCompany || apiP.customer?.company || undefined,
    customerPhone: apiP.customerPhone || apiP.customer?.phone || undefined,
    customerEmail: apiP.customerEmail || apiP.customer?.email || undefined,
    billingAddress: apiP.billingAddress || '',
    shippingAddress: apiP.shippingAddress || apiP.billingAddress || '',
    items: mappedItems,
    subtotal,
    withGst: apiP.withGst ?? totalTax > 0,
    gstType: gstTypeNorm,
    cgst: Number(apiP.cgst ?? (gstTypeNorm === 'intra_state' ? totalTax / 2 : 0)),
    sgst: Number(apiP.sgst ?? (gstTypeNorm === 'intra_state' ? totalTax / 2 : 0)),
    igst: Number(apiP.igst ?? (gstTypeNorm === 'inter_state' ? totalTax : 0)),
    discount: totalDiscount,
    taxAmount: totalTax,
    roundOff: Number(apiP.roundOff || 0),
    amount: totalAmount,
    balance: balance,
    status: normStatus,
    convertedToInvoiceNo: apiP.convertedToInvoiceNo || undefined,
    convertedToType: apiP.convertedToType || undefined,
    convertedToId: apiP.convertedToId || undefined,
    notes: apiP.notes || undefined,
    terms: apiP.terms || undefined,
    attachedImageName: apiP.attachedImageName || undefined,
    attachedDocName: apiP.attachedDocName || undefined,
    stateOfSupply: apiP.stateOfSupply || undefined,
    createdAt: apiP.createdAt || new Date().toISOString(),
    updatedAt: apiP.updatedAt || new Date().toISOString(),
  };
};

/**
 * Mapper: SaleProformaInvoice -> CreateProformaPayload (Strictly matches Commerce API schema)
 */
export const mapSaleProformaToPayload = (
  proforma: Partial<SaleProformaInvoice> & {
    items: any[];
    partyName: string;
    stateOfSupply?: string;
  }
): CreateProformaPayload => {
  const payload: CreateProformaPayload = {
    partyName: proforma.partyName.trim(),
    items: (proforma.items || []).map((it: any) => {
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
      return itemPayload;
    }),
  };

  if (proforma.proformaNo && proforma.proformaNo.trim()) {
    payload.proformaNo = proforma.proformaNo.trim();
  }
  if (proforma.referenceNo && proforma.referenceNo.trim()) {
    payload.referenceNo = proforma.referenceNo.trim();
  }
  if (proforma.date) {
    payload.date = proforma.date;
  }
  if (proforma.validUntil) {
    payload.validUntil = proforma.validUntil;
  }
  // Only include customerId if it is a valid UUID
  if (proforma.customerId && UUID_REGEX.test(proforma.customerId)) {
    payload.customerId = proforma.customerId;
  }
  if (proforma.customerCompany) {
    payload.customerCompany = proforma.customerCompany.trim();
  }
  if (proforma.customerPhone) {
    payload.customerPhone = proforma.customerPhone.trim();
  }
  if (proforma.customerEmail) {
    payload.customerEmail = proforma.customerEmail.trim();
  }
  if (proforma.billingAddress) {
    payload.billingAddress = proforma.billingAddress.trim();
  }
  if (proforma.shippingAddress) {
    payload.shippingAddress = proforma.shippingAddress.trim();
  }
  if (typeof proforma.withGst === 'boolean') {
    payload.withGst = proforma.withGst;
  }
  if (proforma.gstType) {
    payload.gstType = proforma.gstType;
  }
  if (typeof proforma.roundOff === 'number') {
    payload.roundOff = proforma.roundOff;
  }
  if (proforma.notes) {
    payload.notes = proforma.notes;
  }
  if (proforma.terms) {
    payload.terms = proforma.terms;
  }
  if (proforma.stateOfSupply) {
    payload.stateOfSupply = proforma.stateOfSupply;
  }
  if (proforma.attachedImageName) {
    payload.attachedImageName = proforma.attachedImageName;
  }
  if (proforma.attachedDocName) {
    payload.attachedDocName = proforma.attachedDocName;
  }

  return payload;
};

// =========================================================================
// RTK Query Injected Endpoints for Commerce Proforma Invoice
// =========================================================================

export const commerceProformaEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommerceProformaInvoices: builder.query<ProformaListResponse, ProformaFilterParams | void>({
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
          url: '/commerce/proformas',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Proforma' as const, id })),
              { type: 'Proforma', id: 'LIST' },
            ]
          : [{ type: 'Proforma', id: 'LIST' }],
    }),

    getCommerceProformaInvoiceById: builder.query<ProformaSingleResponse, string>({
      query: (id) => `/commerce/proformas/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Proforma', id }],
    }),

    createCommerceProformaInvoice: builder.mutation<ProformaSingleResponse, CreateProformaPayload>({
      query: (payload) => ({
        url: '/commerce/proformas',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Proforma', id: 'LIST' }],
    }),

    updateCommerceProformaInvoice: builder.mutation<
      ProformaSingleResponse,
      { id: string; payload: UpdateProformaPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/proformas/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Proforma', id },
        { type: 'Proforma', id: 'LIST' },
      ],
    }),

    patchCommerceProformaInvoice: builder.mutation<
      ProformaSingleResponse,
      { id: string; payload: PatchProformaPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/proformas/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Proforma', id },
        { type: 'Proforma', id: 'LIST' },
      ],
    }),

    deleteCommerceProformaInvoice: builder.mutation<ProformaDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/proformas/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Proforma', id },
        { type: 'Proforma', id: 'LIST' },
      ],
    }),

    updateCommerceProformaStatus: builder.mutation<
      ProformaSingleResponse,
      { id: string; payload: ProformaStatusUpdatePayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/proformas/${id}/status`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Proforma', id },
        { type: 'Proforma', id: 'LIST' },
      ],
    }),

    convertCommerceProformaInvoice: builder.mutation<
      ConvertProformaResponse,
      { id: string; payload: ConvertProformaPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/proformas/${id}/convert`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Proforma', id },
        { type: 'Proforma', id: 'LIST' },
        { type: 'SalesInvoice', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetCommerceProformaInvoicesQuery,
  useLazyGetCommerceProformaInvoicesQuery,
  useGetCommerceProformaInvoiceByIdQuery,
  useCreateCommerceProformaInvoiceMutation,
  useUpdateCommerceProformaInvoiceMutation,
  usePatchCommerceProformaInvoiceMutation,
  useDeleteCommerceProformaInvoiceMutation,
  useUpdateCommerceProformaStatusMutation,
  useConvertCommerceProformaInvoiceMutation,
} = commerceProformaEndpoints;

// =========================================================================
// Imperative API Client for Direct Service / Modal / Custom hooks
// =========================================================================

export const commerceProformaApi = {
  /**
   * List proforma invoices
   * GET /commerce/proformas
   */
  getProformas: async (params?: ProformaFilterParams): Promise<ProformaListResponse> => {
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

    const response = await baseClient.get<ProformaListResponse>('/commerce/proformas', {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * Get single proforma invoice with line items
   * GET /commerce/proformas/{id}
   */
  getProformaById: async (id: string): Promise<ProformaSingleResponse> => {
    const response = await baseClient.get<ProformaSingleResponse>(`/commerce/proformas/${id}`);
    return response.data;
  },

  /**
   * Create proforma invoice
   * POST /commerce/proformas
   */
  createProforma: async (payload: CreateProformaPayload): Promise<ProformaSingleResponse> => {
    const response = await baseClient.post<ProformaSingleResponse>('/commerce/proformas', payload);
    return response.data;
  },

  /**
   * Edit proforma invoice (replaces all lines and re-computes totals)
   * PUT /commerce/proformas/{id}
   */
  updateProforma: async (
    id: string,
    payload: UpdateProformaPayload
  ): Promise<ProformaSingleResponse> => {
    const response = await baseClient.put<ProformaSingleResponse>(
      `/commerce/proformas/${id}`,
      payload
    );
    return response.data;
  },

  /**
   * Partially update proforma invoice
   * PATCH /commerce/proformas/{id}
   */
  patchProforma: async (
    id: string,
    payload: PatchProformaPayload
  ): Promise<ProformaSingleResponse> => {
    const response = await baseClient.patch<ProformaSingleResponse>(
      `/commerce/proformas/${id}`,
      payload
    );
    return response.data;
  },

  /**
   * Delete / cancel proforma invoice (soft-deletes and marks Cancelled)
   * DELETE /commerce/proformas/{id}
   */
  deleteProforma: async (id: string): Promise<ProformaDeleteResponse> => {
    const response = await baseClient.delete<ProformaDeleteResponse>(`/commerce/proformas/${id}`);
    return response.data;
  },

  /**
   * Update proforma invoice status
   * PATCH /commerce/proformas/{id}/status
   */
  updateStatus: async (
    id: string,
    statusOrPayload: 'Open' | 'Converted' | 'Cancelled' | 'Expired' | string | ProformaStatusUpdatePayload
  ): Promise<ProformaSingleResponse> => {
    const payload =
      typeof statusOrPayload === 'string' ? { status: statusOrPayload } : statusOrPayload;
    const response = await baseClient.patch<ProformaSingleResponse>(
      `/commerce/proformas/${id}/status`,
      payload
    );
    return response.data;
  },

  /**
   * Convert proforma invoice to Invoice
   * POST /commerce/proformas/{id}/convert
   */
  convertProforma: async (
    id: string,
    payload: ConvertProformaPayload
  ): Promise<ConvertProformaResponse> => {
    const response = await baseClient.post<ConvertProformaResponse>(
      `/commerce/proformas/${id}/convert`,
      payload
    );
    return response.data;
  },
};
