import { baseClient, baseApi } from '../baseApi';
import {
  SaleTransaction,
  SaleProductItem,
  PaymentSplitItem,
  SalePaymentRecord,
  SaleStatus,
  SalePaymentStatus,
} from '../../store/useSalesManagementStore';
import {
  ApiSalesInvoice,
  ApiSalesInvoiceItem,
  ApiInvoicePaymentItem,
  InvoiceFilterParams,
  CommerceInvoiceListResponse,
  CommerceInvoiceSingleResponse,
  CommerceInvoiceDeleteResponse,
  CommerceInvoicePdfResponse,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  PatchInvoicePayload,
  InvoiceStatusUpdatePayload,
} from './invoiceTypes';

export * from './invoiceTypes';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Mapper: ApiSalesInvoiceItem -> SaleProductItem
 */
export const mapApiInvoiceItemToSaleProductItem = (
  it: ApiSalesInvoiceItem,
  idx: number = 0
): SaleProductItem => {
  const qty = Number(it.quantity) || 0;
  const rate = Number(it.unitPrice) || 0;
  const discPct = Number(it.discountPercent) || 0;
  const discAmt = Number(it.discountAmount ?? ((qty * rate * discPct) / 100));
  const taxable = Math.max(0, qty * rate - discAmt);
  const taxRate = Number(it.taxPercent) || 0;
  const taxAmt = Number(it.taxAmount ?? ((taxable * taxRate) / 100));
  const lineTotal = Number(it.totalAmount ?? it.total ?? taxable + taxAmt);

  return {
    id: it.id || `inv_item_${idx}_${Date.now()}`,
    productId: it.productId || '',
    productName: it.productName || 'Unnamed Item',
    name: it.productName || 'Unnamed Item',
    sku: it.sku || undefined,
    batch: it.batch || undefined,
    quantity: qty,
    purchasePrice: 0,
    salesPrice: rate,
    unitPrice: rate,
    rate: rate,
    discountPercent: discPct,
    taxPercent: taxRate,
    total: lineTotal,
  };
};

/**
 * Mapper: ApiInvoicePaymentItem -> SalePaymentRecord
 */
export const mapApiPaymentToSalePaymentRecord = (p: ApiInvoicePaymentItem): SalePaymentRecord => {
  const amount = Number(p.amount ?? p.receivedAmount ?? 0);
  const dateStr = p.date || p.paymentDate || p.createdAt || new Date().toISOString();
  return {
    id: p.id || p.receiptNo || `pay_${Date.now()}`,
    invoiceNo: p.invoiceNo || '',
    paymentDate: dateStr.includes('T') ? dateStr.split('T')[0] : dateStr,
    paymentTime: dateStr.includes('T') ? dateStr.split('T')[1]?.slice(0, 5) : undefined,
    method: p.paymentType || 'Bank Transfer',
    referenceNo: p.referenceNo || undefined,
    amount,
    status: p.status === 'Completed' ? 'Paid' : 'Partial',
    recordedBy: p.createdBy || 'System User',
    notes: p.notes || p.description || undefined,
    createdAt: p.createdAt || new Date().toISOString(),
  };
};

/**
 * Mapper: ApiSalesInvoice -> SaleTransaction
 */
export const mapApiInvoiceToSaleTransaction = (apiInv: ApiSalesInvoice): SaleTransaction => {
  const items: SaleProductItem[] = Array.isArray(apiInv.items)
    ? apiInv.items.map((it, idx) => mapApiInvoiceItemToSaleProductItem(it, idx))
    : [];

  const subtotal = Number(apiInv.subtotal ?? apiInv.subTotal ?? 0);
  const cgst = Number(apiInv.cgst ?? 0);
  const sgst = Number(apiInv.sgst ?? 0);
  const igst = Number(apiInv.igst ?? 0);
  const totalTax = Number(apiInv.totalTax ?? apiInv.taxAmount ?? cgst + sgst + igst);
  const totalDiscount = Number(apiInv.totalDiscount ?? apiInv.discountAmount ?? apiInv.discount ?? 0);
  const shippingCharges = Number(apiInv.shippingCharges ?? 0);
  const otherCharges = Number(apiInv.otherCharges ?? 0);
  const roundOff = Number(apiInv.roundOff ?? 0);
  const grandTotal = Number(
    apiInv.grandTotal ?? apiInv.amount ?? subtotal - totalDiscount + totalTax + shippingCharges + otherCharges + roundOff
  );
  const paidAmount = Number(apiInv.paidAmount ?? 0);
  const balance = Number(apiInv.balanceAmount ?? apiInv.balance ?? Math.max(0, grandTotal - paidAmount));

  let saleDateStr = apiInv.saleDate || (apiInv.invoiceDate ? apiInv.invoiceDate.split('T')[0] : apiInv.createdAt ? apiInv.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
  if (saleDateStr.includes('T')) {
    saleDateStr = saleDateStr.split('T')[0];
  }

  let dueDateStr = apiInv.dueDate || saleDateStr;
  if (dueDateStr.includes('T')) {
    dueDateStr = dueDateStr.split('T')[0];
  }

  const rawSaleStatus = (apiInv.saleStatus || apiInv.status || 'Confirmed') as string;
  let normalizedSaleStatus: SaleStatus = 'Confirmed';
  if (rawSaleStatus === 'Draft') normalizedSaleStatus = 'Draft';
  else if (rawSaleStatus === 'Completed') normalizedSaleStatus = 'Completed';
  else if (rawSaleStatus === 'Cancelled') normalizedSaleStatus = 'Cancelled';
  else normalizedSaleStatus = 'Confirmed';

  const rawPayStatus = (apiInv.paymentStatus || (balance <= 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Unpaid')) as string;
  let normalizedPayStatus: SalePaymentStatus = 'Unpaid';
  if (rawPayStatus === 'Paid') normalizedPayStatus = 'Paid';
  else if (rawPayStatus === 'Partial') normalizedPayStatus = 'Partial';
  else if (rawPayStatus === 'Pending') normalizedPayStatus = 'Pending';
  else normalizedPayStatus = 'Unpaid';

  const paymentRecords: SalePaymentRecord[] = Array.isArray(apiInv.payments)
    ? apiInv.payments.map((p) => mapApiPaymentToSalePaymentRecord(p))
    : [];

  const splits: PaymentSplitItem[] = Array.isArray(apiInv.paymentSplits) && apiInv.paymentSplits.length > 0
    ? apiInv.paymentSplits
    : paidAmount > 0
      ? [{ id: 'ps_1', method: (apiInv.paymentMethod as any) || 'Bank Transfer', amount: paidAmount }]
      : [];

  const rawInvoiceStatus = (apiInv.invoiceStatus || 'Invoiced') as string;
  let normalizedInvoiceStatus: 'Draft' | 'Generated' | 'Invoiced' = 'Invoiced';
  if (rawInvoiceStatus === 'Draft') normalizedInvoiceStatus = 'Draft';
  else if (rawInvoiceStatus === 'Generated') normalizedInvoiceStatus = 'Generated';
  else normalizedInvoiceStatus = 'Invoiced';

  return {
    id: apiInv.id,
    invoiceNo: apiInv.invoiceNo || 'INV-0000',
    invoiceStatus: normalizedInvoiceStatus,
    referenceNo: apiInv.referenceNo || undefined,
    saleDate: saleDateStr,
    dueDate: dueDateStr,
    customerId: apiInv.customerId || apiInv.customer?.id || '',
    customerName: apiInv.customerName || apiInv.partyName || apiInv.customer?.name || 'Unnamed Customer',
    customerCompany: apiInv.customerCompany || apiInv.customer?.company || undefined,
    customerPhone: apiInv.customerPhone || apiInv.customer?.phone || undefined,
    customerEmail: apiInv.customerEmail || apiInv.customer?.email || undefined,
    billingAddress: apiInv.billingAddress || '',
    shippingAddress: apiInv.shippingAddress || apiInv.billingAddress || '',
    items,
    subtotal,
    withGst: apiInv.withGst ?? totalTax > 0,
    gstType: (apiInv.gstType as 'intra_state' | 'inter_state') || (cgst > 0 ? 'intra_state' : 'inter_state'),
    cgst,
    sgst,
    igst,
    overallDiscount: Number(apiInv.overallDiscount ?? 0),
    totalDiscount,
    totalTax,
    shippingCharges,
    otherCharges,
    grandTotal,
    paidAmount,
    balance,
    paymentMethod: (apiInv.paymentMethod as any) || 'Bank Transfer',
    paymentSplits: splits,
    paymentRecords,
    paymentTerms: apiInv.paymentTerms || 'Net 15 Days',
    paymentStatus: normalizedPayStatus,
    saleStatus: normalizedSaleStatus,
    createdBy: apiInv.createdBy || 'James Wilson',
    salesperson: apiInv.salesperson || 'Alex Rivera',
    notes: apiInv.notes || undefined,
    createdAt: apiInv.createdAt || new Date().toISOString(),
    updatedAt: apiInv.updatedAt || new Date().toISOString(),
  };
};

/**
 * Mapper: SaleTransaction -> CreateInvoicePayload (Strict backend schema)
 */
export const mapSaleTransactionToInvoicePayload = (
  sale: Partial<SaleTransaction> & {
    items: SaleProductItem[];
    customerName: string;
    saleDate: string;
  }
): CreateInvoicePayload => {
  const payload: CreateInvoicePayload = {
    saleDate: sale.saleDate.includes('T') ? sale.saleDate.split('T')[0] : sale.saleDate,
    customerName: sale.customerName.trim(),
    items: (sale.items || []).map((it) => {
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
      }
      if (it.batch && String(it.batch).trim()) {
        itemPayload.batch = String(it.batch).trim();
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

  if (sale.invoiceNo && sale.invoiceNo.trim()) {
    payload.invoiceNo = sale.invoiceNo.trim();
  }
  if (sale.invoiceStatus) {
    payload.invoiceStatus = sale.invoiceStatus;
  }
  if (sale.referenceNo && sale.referenceNo.trim()) {
    payload.referenceNo = sale.referenceNo.trim();
  }
  if (sale.dueDate) {
    payload.dueDate = sale.dueDate.includes('T') ? sale.dueDate.split('T')[0] : sale.dueDate;
  }
  if (sale.customerId && UUID_REGEX.test(sale.customerId)) {
    payload.customerId = sale.customerId;
  }
  if (sale.customerCompany && sale.customerCompany.trim()) {
    payload.customerCompany = sale.customerCompany.trim();
  }
  if (sale.customerPhone && sale.customerPhone.trim()) {
    payload.customerPhone = sale.customerPhone.trim();
  }
  if (sale.customerEmail && sale.customerEmail.trim()) {
    payload.customerEmail = sale.customerEmail.trim();
  }
  if (sale.billingAddress && sale.billingAddress.trim()) {
    payload.billingAddress = sale.billingAddress.trim();
  }
  if (sale.shippingAddress && sale.shippingAddress.trim()) {
    payload.shippingAddress = sale.shippingAddress.trim();
  }
  if (typeof sale.withGst === 'boolean') {
    payload.withGst = sale.withGst;
  }
  if (sale.gstType) {
    payload.gstType = sale.gstType;
  }
  if (typeof sale.overallDiscount === 'number' && !isNaN(sale.overallDiscount)) {
    payload.overallDiscount = sale.overallDiscount;
  }
  if (typeof sale.shippingCharges === 'number' && !isNaN(sale.shippingCharges)) {
    payload.shippingCharges = sale.shippingCharges;
  }
  if (typeof sale.otherCharges === 'number' && !isNaN(sale.otherCharges)) {
    payload.otherCharges = sale.otherCharges;
  }
  if (sale.paymentMethod) {
    payload.paymentMethod = sale.paymentMethod;
  }
  if (Array.isArray(sale.paymentSplits) && sale.paymentSplits.length > 0) {
    payload.paymentSplits = sale.paymentSplits.filter((p) => Number(p.amount) > 0);
  }
  if (sale.paymentTerms && sale.paymentTerms.trim()) {
    payload.paymentTerms = sale.paymentTerms.trim();
  }
  if (sale.saleStatus) {
    payload.saleStatus = sale.saleStatus;
  }
  if (sale.salesperson && sale.salesperson.trim()) {
    payload.salesperson = sale.salesperson.trim();
  }
  if (sale.notes && sale.notes.trim()) {
    payload.notes = sale.notes.trim();
  }

  return payload;
};

// =========================================================================
// RTK Query Injected Endpoints for Commerce Sales Invoices
// =========================================================================

export const commerceSalesInvoiceEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCommerceInvoices: builder.query<CommerceInvoiceListResponse, InvoiceFilterParams | void>({
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
          if (params.paymentStatus && params.paymentStatus !== 'ALL' && params.paymentStatus !== 'All') {
            queryParams.paymentStatus = params.paymentStatus;
          }
          if (params.invoiceStatus && params.invoiceStatus !== 'ALL' && params.invoiceStatus !== 'All') {
            queryParams.invoiceStatus = params.invoiceStatus;
          }
        }
        return {
          url: '/commerce/invoices',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'SalesInvoice' as const, id })),
              { type: 'SalesInvoice', id: 'LIST' },
            ]
          : [{ type: 'SalesInvoice', id: 'LIST' }],
    }),

    getCommerceInvoiceById: builder.query<CommerceInvoiceSingleResponse, string>({
      query: (id) => `/commerce/invoices/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'SalesInvoice', id }],
    }),

    createCommerceInvoice: builder.mutation<CommerceInvoiceSingleResponse, CreateInvoicePayload>({
      query: (payload) => ({
        url: '/commerce/invoices',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Customer', id: 'LIST' },
        'SalesRepresentative',
        'Dashboard',
      ],
    }),

    updateCommerceInvoice: builder.mutation<
      CommerceInvoiceSingleResponse,
      { id: string; payload: UpdateInvoicePayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/invoices/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalesInvoice', id },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Customer', id: 'LIST' },
        'SalesRepresentative',
        'Dashboard',
      ],
    }),

    patchCommerceInvoice: builder.mutation<
      CommerceInvoiceSingleResponse,
      { id: string; payload: PatchInvoicePayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/invoices/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalesInvoice', id },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'Customer', id: 'LIST' },
        'SalesRepresentative',
        'Dashboard',
      ],
    }),

    deleteCommerceInvoice: builder.mutation<CommerceInvoiceDeleteResponse, string>({
      query: (id) => ({
        url: `/commerce/invoices/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'SalesInvoice', id },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Customer', id: 'LIST' },
        'SalesRepresentative',
        'Dashboard',
      ],
    }),

    updateCommerceInvoiceStatus: builder.mutation<
      CommerceInvoiceSingleResponse,
      { id: string; payload: InvoiceStatusUpdatePayload }
    >({
      query: ({ id, payload }) => ({
        url: `/commerce/invoices/${id}/status`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalesInvoice', id },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'Stock', id: 'LIST' },
        { type: 'Customer', id: 'LIST' },
        'SalesRepresentative',
        'Dashboard',
      ],
    }),

    getCommerceInvoicePdf: builder.query<CommerceInvoicePdfResponse, string>({
      query: (id) => `/commerce/invoices/${id}/pdf`,
    }),
  }),
});

export const {
  useGetCommerceInvoicesQuery,
  useLazyGetCommerceInvoicesQuery,
  useGetCommerceInvoiceByIdQuery,
  useCreateCommerceInvoiceMutation,
  useUpdateCommerceInvoiceMutation,
  usePatchCommerceInvoiceMutation,
  useDeleteCommerceInvoiceMutation,
  useUpdateCommerceInvoiceStatusMutation,
  useGetCommerceInvoicePdfQuery,
} = commerceSalesInvoiceEndpoints;

// =========================================================================
// Imperative API Client for Commerce Sales Invoices
// =========================================================================

export const commerceInvoiceApi = {
  /**
   * List sales invoices
   * GET /commerce/invoices
   */
  getInvoices: async (params?: InvoiceFilterParams): Promise<CommerceInvoiceListResponse> => {
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
      if (params.paymentStatus && params.paymentStatus !== 'ALL' && params.paymentStatus !== 'All') {
        queryParams.paymentStatus = params.paymentStatus;
      }
      if (params.invoiceStatus && params.invoiceStatus !== 'ALL' && params.invoiceStatus !== 'All') {
        queryParams.invoiceStatus = params.invoiceStatus;
      }
    }

    const response = await baseClient.get<CommerceInvoiceListResponse>('/commerce/invoices', {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * Get single invoice with payments & line items
   * GET /commerce/invoices/{id}
   */
  getInvoiceById: async (id: string): Promise<CommerceInvoiceSingleResponse> => {
    const response = await baseClient.get<CommerceInvoiceSingleResponse>(`/commerce/invoices/${id}`);
    return response.data;
  },

  /**
   * Create new sales invoice (deducts stock)
   * POST /commerce/invoices
   */
  createInvoice: async (payload: CreateInvoicePayload): Promise<CommerceInvoiceSingleResponse> => {
    const response = await baseClient.post<CommerceInvoiceSingleResponse>('/commerce/invoices', payload);
    return response.data;
  },

  /**
   * Edit / Replace sales invoice
   * PUT /commerce/invoices/{id}
   */
  updateInvoice: async (
    id: string,
    payload: UpdateInvoicePayload
  ): Promise<CommerceInvoiceSingleResponse> => {
    const response = await baseClient.put<CommerceInvoiceSingleResponse>(`/commerce/invoices/${id}`, payload);
    return response.data;
  },

  /**
   * Partially update sales invoice
   * PATCH /commerce/invoices/{id}
   */
  patchInvoice: async (
    id: string,
    payload: PatchInvoicePayload
  ): Promise<CommerceInvoiceSingleResponse> => {
    const response = await baseClient.patch<CommerceInvoiceSingleResponse>(`/commerce/invoices/${id}`, payload);
    return response.data;
  },

  /**
   * Void / Cancel invoice (returns goods to stock)
   * DELETE /commerce/invoices/{id}
   */
  deleteInvoice: async (id: string): Promise<CommerceInvoiceDeleteResponse> => {
    const response = await baseClient.delete<CommerceInvoiceDeleteResponse>(`/commerce/invoices/${id}`);
    return response.data;
  },

  /**
   * Update invoice status
   * PATCH /commerce/invoices/{id}/status
   */
  updateStatus: async (
    id: string,
    saleStatus: string
  ): Promise<CommerceInvoiceSingleResponse> => {
    const response = await baseClient.patch<CommerceInvoiceSingleResponse>(`/commerce/invoices/${id}/status`, {
      saleStatus,
    });
    return response.data;
  },

  /**
   * Get printable invoice structured data
   * GET /commerce/invoices/{id}/pdf
   */
  getInvoicePdf: async (id: string): Promise<CommerceInvoicePdfResponse> => {
    const response = await baseClient.get<CommerceInvoicePdfResponse>(`/commerce/invoices/${id}/pdf`);
    return response.data;
  },
};
