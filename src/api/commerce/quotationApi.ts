import { baseClient, baseApi } from '../baseApi';
import { QuotationStatus, SaleProductItem, SaleQuotation } from '../../store/useSalesManagementStore';
import {
  ApiQuotation,
  ApiQuotationItem,
  QuotationFilterParams,
  QuotationListResponse,
  QuotationSingleResponse,
  QuotationDeleteResponse,
  ConvertQuotationResponse,
  CreateQuotationItemPayload,
  CreateQuotationPayload,
  UpdateQuotationPayload,
  PatchQuotationPayload,
  QuotationStatusUpdatePayload,
  ConvertQuotationPayload,
} from './quotationTypes';

export * from './quotationTypes';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Mapper: ApiQuotationItem -> SaleProductItem (with extended fields)
 */
export const mapApiQuotationItemToSaleProductItem = (
  it: ApiQuotationItem,
  idx: number = 0
): SaleProductItem & {
  unit?: string;
  discountAmount?: number;
  taxAmount?: number;
  category?: string;
  itemCode?: string;
  hsnCode?: string;
  description?: string;
} => {
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
 * Mapper: ApiQuotation -> SaleQuotation
 */
export const mapApiQuotationToSaleQuotation = (apiQ: ApiQuotation): SaleQuotation => {
  const rawDate = apiQ.date || apiQ.quotationDate || new Date().toISOString();
  const dateFormatted = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
  const validUntilFormatted = apiQ.validUntil?.includes('T')
    ? apiQ.validUntil.split('T')[0]
    : apiQ.validUntil || '';

  const mappedItems: SaleProductItem[] = Array.isArray(apiQ.items)
    ? apiQ.items.map((it, idx) => mapApiQuotationItemToSaleProductItem(it, idx))
    : [];

  const subtotal = Number(apiQ.subtotal ?? apiQ.subTotal ?? 0);
  const totalDiscount = Number(apiQ.discount ?? apiQ.discountAmount ?? apiQ.overallDiscount ?? 0);
  const totalTax = Number(apiQ.taxAmount ?? 0);
  const totalAmount = Number(apiQ.amount ?? apiQ.grandTotal ?? 0);
  const balance = Number(apiQ.balance ?? totalAmount);

  return {
    id: apiQ.id,
    quotationNo: apiQ.quotationNo || 'EST-0001',
    referenceNo: apiQ.referenceNo || '',
    date: dateFormatted,
    validUntil: validUntilFormatted,
    customerId: apiQ.customerId || apiQ.customer?.id || '',
    partyName: apiQ.partyName || apiQ.customer?.name || 'Unnamed Customer',
    customerCompany: apiQ.customerCompany || apiQ.customer?.company || undefined,
    customerPhone: apiQ.customerPhone || apiQ.customer?.phone || undefined,
    customerEmail: apiQ.customerEmail || apiQ.customer?.email || undefined,
    billingAddress: apiQ.billingAddress || '',
    shippingAddress: apiQ.shippingAddress || apiQ.billingAddress || '',
    items: mappedItems,
    subtotal,
    withGst: apiQ.withGst ?? true,
    gstType: (apiQ.gstType as any) || 'intra_state',
    cgst: Number(apiQ.cgst ?? 0),
    sgst: Number(apiQ.sgst ?? 0),
    igst: Number(apiQ.igst ?? 0),
    discount: totalDiscount,
    taxAmount: totalTax,
    roundOff: Number(apiQ.roundOff ?? 0),
    amount: totalAmount,
    balance: balance,
    status: (apiQ.status as QuotationStatus) || 'Open',
    convertedToType: (apiQ.convertedToType as any) || null,
    convertedToId: apiQ.convertedToId || null,
    convertedToInvoiceNo: apiQ.convertedToInvoiceNo || null,
    stateOfSupply: apiQ.stateOfSupply || '33-Tamil Nadu',
    notes: apiQ.notes || '',
    terms: apiQ.terms || '',
    createdAt: apiQ.createdAt || new Date().toISOString(),
    updatedAt: apiQ.updatedAt || new Date().toISOString(),
  };
};

/**
 * Mapper: SaleQuotation -> CreateQuotationPayload
 */
export const mapSaleQuotationToPayload = (
  quotation: Partial<SaleQuotation> & {
    items: any[];
    partyName: string;
    stateOfSupply?: string;
  },
  isCreate: boolean = false
): CreateQuotationPayload => {
  const payload: CreateQuotationPayload = {
    partyName: quotation.partyName.trim(),
    items: (quotation.items || []).map((it: any) => {
      const item: CreateQuotationItemPayload = {
        productId: it.productId || '',
        productName: it.productName || 'Item',
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      };
      if (it.sku && String(it.sku).trim()) {
        item.sku = String(it.sku).trim();
      } else if (it.itemCode && String(it.itemCode).trim()) {
        item.sku = String(it.itemCode).trim();
      }
      if (it.batch && String(it.batch).trim()) {
        item.batch = String(it.batch).trim();
      }
      if (typeof it.discountPercent === 'number' && !isNaN(it.discountPercent) && it.discountPercent > 0) {
        item.discountPercent = Number(it.discountPercent);
      }
      if (typeof it.taxPercent === 'number' && !isNaN(it.taxPercent) && it.taxPercent > 0) {
        item.taxPercent = Number(it.taxPercent);
      }
      // Strictly omit 'unit' or any unrecognized fields
      return item;
    }),
  };

  // On creation, omit temporary client-generated quotationNo so backend sequence assigns official unique number
  if (!isCreate && quotation.quotationNo && quotation.quotationNo.trim()) {
    payload.quotationNo = quotation.quotationNo.trim();
  }
  if (quotation.referenceNo && quotation.referenceNo.trim()) {
    payload.referenceNo = quotation.referenceNo.trim();
  }
  if (quotation.date) {
    payload.date = quotation.date;
  }
  if (quotation.validUntil) {
    payload.validUntil = quotation.validUntil;
  }
  // Only include customerId if it is a valid UUID
  if (quotation.customerId && UUID_REGEX.test(quotation.customerId)) {
    payload.customerId = quotation.customerId;
  }
  if (quotation.customerCompany) {
    payload.customerCompany = quotation.customerCompany.trim();
  }
  if (quotation.customerPhone) {
    payload.customerPhone = quotation.customerPhone.trim();
  }
  if (quotation.customerEmail) {
    payload.customerEmail = quotation.customerEmail.trim();
  }
  if (quotation.billingAddress) {
    payload.billingAddress = quotation.billingAddress.trim();
  }
  if (quotation.shippingAddress) {
    payload.shippingAddress = quotation.shippingAddress.trim();
  }
  if (typeof quotation.withGst === 'boolean') {
    payload.withGst = quotation.withGst;
  }
  if (quotation.gstType) {
    payload.gstType = quotation.gstType;
  }
  if (quotation.notes) {
    payload.notes = quotation.notes;
  }
  if (quotation.terms) {
    payload.terms = quotation.terms;
  }
  if (quotation.stateOfSupply) {
    payload.stateOfSupply = quotation.stateOfSupply;
  }

  return payload;
};

/**
 * Sanitizes quotation payload for POST / PUT / PATCH
 * Strictly adheres to backend schema by stripping 'unit' and any unrecognized line item keys
 */
export const sanitizeCommerceQuotationPayload = <
  T extends Partial<CreateQuotationPayload> | Partial<UpdateQuotationPayload>
>(
  payload: T
): T => {
  const sanitized = { ...payload } as any;

  if (Array.isArray(sanitized.items)) {
    sanitized.items = sanitized.items.map((it: any) => {
      const cleanItem: CreateQuotationItemPayload = {
        productId: it.productId || '',
        productName: it.productName || 'Item',
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      };
      if (it.sku && String(it.sku).trim()) {
        cleanItem.sku = String(it.sku).trim();
      } else if (it.itemCode && String(it.itemCode).trim()) {
        cleanItem.sku = String(it.itemCode).trim();
      }
      if (it.batch && String(it.batch).trim()) {
        cleanItem.batch = String(it.batch).trim();
      }
      if (typeof it.discountPercent === 'number' && !isNaN(it.discountPercent) && it.discountPercent > 0) {
        cleanItem.discountPercent = Number(it.discountPercent);
      }
      if (typeof it.taxPercent === 'number' && !isNaN(it.taxPercent) && it.taxPercent > 0) {
        cleanItem.taxPercent = Number(it.taxPercent);
      }
      // Explicitly delete 'unit' if present in incoming raw item object
      delete (cleanItem as any).unit;
      return cleanItem;
    });
  }

  // Validate customerId format if provided
  if (sanitized.customerId && !UUID_REGEX.test(sanitized.customerId)) {
    delete sanitized.customerId;
  }

  return sanitized as T;
};

// =========================================================================
// RTK Query Injected Endpoints for Commerce Quotation
// =========================================================================

export const quotationEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommerceQuotations: builder.query<QuotationListResponse, QuotationFilterParams | void>({
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
          url: '/commerce/quotations',
          params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Quotation' as const, id })),
              { type: 'Quotation', id: 'LIST' },
            ]
          : [{ type: 'Quotation', id: 'LIST' }],
    }),

    getCommerceQuotationById: builder.query<QuotationSingleResponse, string>({
      query: (id) => `/commerce/quotations/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Quotation', id }],
    }),

    createCommerceQuotation: builder.mutation<QuotationSingleResponse, CreateQuotationPayload>({
      query: (payload) => ({
        url: '/commerce/quotations',
        method: 'POST',
        body: sanitizeCommerceQuotationPayload(payload),
      }),
      invalidatesTags: [{ type: 'Quotation', id: 'LIST' }, 'Dashboard'],
    }),

    updateCommerceQuotation: builder.mutation<QuotationSingleResponse, { id: string; payload: UpdateQuotationPayload }>({
      query: ({ id, payload }) => ({
        url: `/commerce/quotations/${id}`,
        method: 'PUT',
        body: sanitizeCommerceQuotationPayload(payload),
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
      ],
    }),

    patchCommerceQuotation: builder.mutation<QuotationSingleResponse, { id: string; payload: PatchQuotationPayload }>({
      query: ({ id, payload }) => ({
        url: `/commerce/quotations/${id}`,
        method: 'PATCH',
        body: sanitizeCommerceQuotationPayload(payload),
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
      ],
    }),

    deleteCommerceQuotation: builder.mutation<QuotationDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/quotations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Quotation', id: 'LIST' }, 'Dashboard'],
    }),

    updateCommerceQuotationStatus: builder.mutation<QuotationSingleResponse, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/commerce/quotations/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
      ],
    }),

    convertCommerceQuotation: builder.mutation<ConvertQuotationResponse, { id: string; payload: ConvertQuotationPayload }>({
      query: ({ id, payload }) => ({
        url: `/commerce/quotations/${id}/convert`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Proforma', id: 'LIST' },
        { type: 'SalesOrder', id: 'LIST' },
        { type: 'SalesInvoice', id: 'LIST' },
        'Dashboard',
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCommerceQuotationsQuery,
  useGetCommerceQuotationByIdQuery,
  useCreateCommerceQuotationMutation,
  useUpdateCommerceQuotationMutation,
  usePatchCommerceQuotationMutation,
  useDeleteCommerceQuotationMutation,
  useUpdateCommerceQuotationStatusMutation,
  useConvertCommerceQuotationMutation,
} = quotationEndpoints;

/**
 * Commerce Quotations API Service
 */
export const quotationApi = {
  /**
   * List quotations
   * GET /commerce/quotations
   */
  getQuotations: async (params?: QuotationFilterParams): Promise<QuotationListResponse> => {
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

    const response = await baseClient.get<QuotationListResponse>('/commerce/quotations', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    return response.data;
  },

  /**
   * Get single quotation with line items
   * GET /commerce/quotations/{id}
   */
  getQuotationById: async (id: string): Promise<QuotationSingleResponse> => {
    const response = await baseClient.get<QuotationSingleResponse>(`/commerce/quotations/${id}`);
    return response.data;
  },

  /**
   * Create quotation
   * POST /commerce/quotations
   */
  createQuotation: async (payload: CreateQuotationPayload): Promise<QuotationSingleResponse> => {
    const cleanPayload = sanitizeCommerceQuotationPayload(payload);
    const response = await baseClient.post<QuotationSingleResponse>('/commerce/quotations', cleanPayload);
    return response.data;
  },

  /**
   * Edit quotation (replaces all lines and re-computes totals)
   * PUT /commerce/quotations/{id}
   */
  updateQuotation: async (
    id: string,
    payload: UpdateQuotationPayload
  ): Promise<QuotationSingleResponse> => {
    const cleanPayload = sanitizeCommerceQuotationPayload(payload);
    const response = await baseClient.put<QuotationSingleResponse>(
      `/commerce/quotations/${id}`,
      cleanPayload
    );
    return response.data;
  },

  /**
   * Partially update quotation
   * PATCH /commerce/quotations/{id}
   */
  patchQuotation: async (
    id: string,
    payload: PatchQuotationPayload
  ): Promise<QuotationSingleResponse> => {
    const cleanPayload = sanitizeCommerceQuotationPayload(payload);
    const response = await baseClient.patch<QuotationSingleResponse>(
      `/commerce/quotations/${id}`,
      cleanPayload
    );
    return response.data;
  },

  /**
   * Delete / cancel quotation (soft deletes and marks Cancelled)
   * DELETE /commerce/quotations/{id}
   */
  deleteQuotation: async (id: string): Promise<QuotationDeleteResponse> => {
    const response = await baseClient.delete<QuotationDeleteResponse>(`/commerce/quotations/${id}`);
    return response.data;
  },

  updateStatus: async (
    id: string,
    statusOrPayload: 'Open' | 'Converted' | 'Cancelled' | 'Expired' | string | QuotationStatusUpdatePayload
  ): Promise<QuotationSingleResponse> => {
    const payload =
      typeof statusOrPayload === 'string' ? { status: statusOrPayload } : statusOrPayload;
    const response = await baseClient.patch<QuotationSingleResponse>(
      `/commerce/quotations/${id}/status`,
      payload
    );
    return response.data;
  },

  /**
   * Convert quotation to Invoice / Order / Proforma
   * POST /commerce/quotations/{id}/convert
   */
  convertQuotation: async (
    id: string,
    payload: ConvertQuotationPayload
  ): Promise<ConvertQuotationResponse> => {
    const response = await baseClient.post<ConvertQuotationResponse>(
      `/commerce/quotations/${id}/convert`,
      payload
    );
    return response.data;
  },
};
