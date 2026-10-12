import { baseClient, baseApi } from '../baseApi';
import {
  ApiExpense,
  ApiExpenseCategory,
  ExpenseFilterParams,
  ExpenseListResponse,
  ExpenseSingleResponse,
  ExpenseDeleteResponse,
  CreateExpensePayload,
  UpdateExpensePayload,
  PatchExpensePayload,
  ExpenseCategoryFilterParams,
  ExpenseCategoryListResponse,
  ExpenseCategorySingleResponse,
  ExpenseCategoryDeleteResponse,
  CreateExpenseCategoryPayload,
  UpdateExpenseCategoryPayload,
  PatchExpenseCategoryPayload,
} from './expenseTypes';

export * from './expenseTypes';

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Checks if a string is a valid UUID
 */
export const isValidUuid = (id?: string | null): boolean => {
  if (!id) return false;
  return UUID_REGEX.test(id.trim());
};

/**
 * Ensures a valid UUID format for Work API fields.
 */
export const ensureValidUuid = (id?: string): string => {
  if (id && UUID_REGEX.test(id.trim())) return id.trim();
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
 * UI representation of an Expense Item
 */
export interface UiExpenseItem {
  id: string;
  expenseNo: string;
  expenseDate: string;
  category: string;
  categoryId: string;
  supplierId?: string;
  supplierName?: string;
  branchId?: string | null;
  title: string;
  payee: string;
  amount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  paymentMode: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Credit Card' | 'Debit Card';
  referenceNo?: string;
  receiptImage?: string;
  notes?: string;
  status: 'Paid' | 'Pending' | 'Approved';
  createdAt: string;
  updatedAt?: string;
}

/**
 * Normalizes payment method string between API and UI
 */
export const normalizePaymentMode = (
  method?: string
): 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Credit Card' | 'Debit Card' => {
  if (!method) return 'Bank Transfer';
  const m = method.trim().toLowerCase();
  if (m === 'cash') return 'Cash';
  if (m === 'upi') return 'UPI';
  if (m === 'cheque' || m === 'check') return 'Cheque';
  if (m === 'card' || m === 'credit card') return 'Credit Card';
  if (m === 'debit card') return 'Debit Card';
  return 'Bank Transfer';
};

/**
 * Normalizes payment mode from UI to Work API accepted paymentMethod enum:
 * 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card'
 */
export const normalizePaymentMethodForApi = (mode?: string): string => {
  if (!mode) return 'Bank Transfer';
  if (mode === 'Credit Card' || mode === 'Debit Card') return 'Card';
  if (mode === 'Cash' || mode === 'UPI' || mode === 'Cheque' || mode === 'Bank Transfer') {
    return mode;
  }
  return 'Bank Transfer';
};

/**
 * Maps raw ApiExpense from backend Work API to UI ExpenseItem
 */
export const mapApiExpenseToUi = (apiExp: ApiExpense): UiExpenseItem => {
  const expenseDateStr = apiExp.expenseDate
    ? apiExp.expenseDate.split('T')[0]
    : apiExp.createdAt
    ? apiExp.createdAt.split('T')[0]
    : new Date().toISOString().split('T')[0];

  const payeeName =
    apiExp.supplier?.name ||
    apiExp.supplier?.companyName ||
    apiExp.supplier?.contactPerson ||
    '';

  const baseAmt = Number(apiExp.amount || 0);
  const taxPct = Number(apiExp.taxPercent || 0);
  const taxAmt =
    typeof apiExp.taxAmount === 'number'
      ? apiExp.taxAmount
      : Math.round((baseAmt * taxPct) / 100);
  const totalAmt =
    typeof apiExp.totalAmount === 'number'
      ? apiExp.totalAmount
      : baseAmt + taxAmt;

  return {
    id: apiExp.id,
    expenseNo: apiExp.expenseNo || `EXP-${apiExp.id.slice(0, 8).toUpperCase()}`,
    expenseDate: expenseDateStr,
    category: apiExp.category?.name || 'General Expense',
    categoryId: apiExp.categoryId,
    supplierId: apiExp.supplierId || undefined,
    supplierName: payeeName,
    branchId: apiExp.branchId || null,
    title: apiExp.title || '',
    payee: payeeName,
    amount: baseAmt,
    taxPercent: taxPct,
    taxAmount: taxAmt,
    totalAmount: totalAmt,
    paymentMode: normalizePaymentMode(apiExp.paymentMethod),
    referenceNo: apiExp.referenceNo || '',
    receiptImage: '',
    notes: apiExp.notes || '',
    status: 'Paid',
    createdAt: apiExp.createdAt || new Date().toISOString(),
    updatedAt: apiExp.updatedAt || apiExp.createdAt || new Date().toISOString(),
  };
};

/**
 * Maps UI form data into payload for POST /work/expenses
 */
export const mapUiToCreateExpensePayload = (formData: {
  categoryId: string;
  supplierId?: string | null;
  branchId?: string | null;
  expenseDate: string;
  title: string;
  amount: number | string;
  taxPercent?: number | string;
  paymentMode?: string;
  paymentMethod?: string;
  referenceNo?: string;
  notes?: string;
}): CreateExpensePayload => {
  const payload: CreateExpensePayload = {
    categoryId: formData.categoryId,
    expenseDate: formData.expenseDate,
    title: formData.title.trim(),
    amount: Math.max(0.01, Number(formData.amount) || 0),
    taxPercent: Number(formData.taxPercent) || 0,
    paymentMethod: normalizePaymentMethodForApi(formData.paymentMethod || formData.paymentMode),
  };

  if (formData.supplierId && isValidUuid(formData.supplierId)) {
    payload.supplierId = formData.supplierId;
  }

  if (formData.branchId && isValidUuid(formData.branchId)) {
    payload.branchId = formData.branchId;
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
 * Maps UI form data into payload for PUT /work/expenses/{id}
 */
export const mapUiToUpdateExpensePayload = (formData: {
  categoryId?: string;
  supplierId?: string | null;
  branchId?: string | null;
  expenseDate?: string;
  title?: string;
  amount?: number | string;
  taxPercent?: number | string;
  paymentMode?: string;
  paymentMethod?: string;
  referenceNo?: string;
  notes?: string;
}): UpdateExpensePayload => {
  const payload: UpdateExpensePayload = {};

  if (formData.categoryId) {
    payload.categoryId = formData.categoryId;
  }

  if (formData.expenseDate) {
    payload.expenseDate = formData.expenseDate;
  }

  if (formData.title) {
    payload.title = formData.title.trim();
  }

  if (formData.amount !== undefined && formData.amount !== '') {
    payload.amount = Math.max(0.01, Number(formData.amount) || 0);
  }

  if (formData.taxPercent !== undefined) {
    payload.taxPercent = Number(formData.taxPercent) || 0;
  }

  const method = formData.paymentMethod || formData.paymentMode;
  if (method) {
    payload.paymentMethod = normalizePaymentMethodForApi(method);
  }

  if (formData.supplierId !== undefined) {
    if (formData.supplierId && isValidUuid(formData.supplierId)) {
      payload.supplierId = formData.supplierId;
    } else {
      payload.supplierId = null;
    }
  }

  if (formData.branchId !== undefined) {
    if (formData.branchId && isValidUuid(formData.branchId)) {
      payload.branchId = formData.branchId;
    } else {
      payload.branchId = null;
    }
  }

  const ref = formData.referenceNo?.trim();
  if (ref !== undefined) {
    payload.referenceNo = ref;
  }

  const notes = formData.notes?.trim();
  if (notes !== undefined) {
    // Only send non-empty string or omit (avoid sending null notes to backend)
    if (notes) {
      payload.notes = notes;
    }
  }

  return payload;
};

// =========================================================================
// RTK Query Injected Endpoints for Work Expenses & Categories
// =========================================================================

export const workExpenseEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Expenses
    getWorkExpenses: builder.query<ExpenseListResponse, ExpenseFilterParams | void>({
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
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
          if (params.categoryId) queryParams.categoryId = params.categoryId;
          if (params.supplierId) queryParams.supplierId = params.supplierId;
          if (params.branchId) queryParams.branchId = params.branchId;
          if (params.paymentMethod && params.paymentMethod !== 'All') {
            queryParams.paymentMethod = normalizePaymentMethodForApi(params.paymentMethod);
          }
          if (params.from) queryParams.from = params.from;
          if (params.to) queryParams.to = params.to;
          if (params.sortBy) queryParams.sortBy = params.sortBy;
          if (params.organization_id) queryParams.organization_id = params.organization_id;
          if (params.sub_organization_id) queryParams.sub_organization_id = params.sub_organization_id;
        }

        return {
          url: '/work/expenses',
          method: 'GET',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Expense' as const, id })),
              { type: 'Expense' as const, id: 'LIST' },
            ]
          : [{ type: 'Expense' as const, id: 'LIST' }],
    }),

    getWorkExpenseById: builder.query<ExpenseSingleResponse, string>({
      query: (id) => ({
        url: `/work/expenses/${id}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'Expense', id }],
    }),

    createWorkExpense: builder.mutation<ExpenseSingleResponse, CreateExpensePayload>({
      query: (payload) => {
        const cleanPayload: Record<string, any> = {};
        for (const [key, val] of Object.entries(payload)) {
          if (val !== null && val !== undefined && val !== '') {
            cleanPayload[key] = val;
          }
        }
        return {
          url: '/work/expenses',
          method: 'POST',
          body: cleanPayload,
        };
      },
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }],
    }),

    updateWorkExpense: builder.mutation<
      ExpenseSingleResponse,
      { id: string; payload: UpdateExpensePayload }
    >({
      query: ({ id, payload }) => {
        const cleanPayload: Record<string, any> = {};
        for (const [key, val] of Object.entries(payload)) {
          if (val !== null && val !== undefined && val !== '') {
            cleanPayload[key] = val;
          }
        }
        return {
          url: `/work/expenses/${id}`,
          method: 'PUT',
          body: cleanPayload,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Expense', id },
        { type: 'Expense', id: 'LIST' },
      ],
    }),

    patchWorkExpense: builder.mutation<
      ExpenseSingleResponse,
      { id: string; payload: PatchExpensePayload }
    >({
      query: ({ id, payload }) => {
        const cleanPayload: Record<string, any> = {};
        for (const [key, val] of Object.entries(payload)) {
          if (val !== null && val !== undefined && val !== '') {
            cleanPayload[key] = val;
          }
        }
        return {
          url: `/work/expenses/${id}`,
          method: 'PATCH',
          body: cleanPayload,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Expense', id },
        { type: 'Expense', id: 'LIST' },
      ],
    }),

    deleteWorkExpense: builder.mutation<ExpenseDeleteResponse, string>({
      query: (id) => ({
        url: `/work/expenses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Expense', id },
        { type: 'Expense', id: 'LIST' },
      ],
    }),

    // Expense Categories
    getWorkExpenseCategories: builder.query<
      ExpenseCategoryListResponse,
      ExpenseCategoryFilterParams | void
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
          if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
          if (params.status && params.status !== 'All') {
            queryParams.status = params.status;
          }
          if (params.organization_id) queryParams.organization_id = params.organization_id;
        }

        return {
          url: '/work/expense-categories',
          method: 'GET',
          params: queryParams,
        };
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'ExpenseCategory' as const, id })),
              { type: 'ExpenseCategory' as const, id: 'LIST' },
            ]
          : [{ type: 'ExpenseCategory' as const, id: 'LIST' }],
    }),

    getWorkExpenseCategoryById: builder.query<ExpenseCategorySingleResponse, string>({
      query: (id) => ({
        url: `/work/expense-categories/${id}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'ExpenseCategory', id }],
    }),

    createWorkExpenseCategory: builder.mutation<
      ExpenseCategorySingleResponse,
      CreateExpenseCategoryPayload
    >({
      query: (payload) => ({
        url: '/work/expense-categories',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'ExpenseCategory', id: 'LIST' }],
    }),

    updateWorkExpenseCategory: builder.mutation<
      ExpenseCategorySingleResponse,
      { id: string; payload: UpdateExpenseCategoryPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/work/expense-categories/${id}`,
        method: 'PUT',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ExpenseCategory', id },
        { type: 'ExpenseCategory', id: 'LIST' },
      ],
    }),

    patchWorkExpenseCategory: builder.mutation<
      ExpenseCategorySingleResponse,
      { id: string; payload: PatchExpenseCategoryPayload }
    >({
      query: ({ id, payload }) => ({
        url: `/work/expense-categories/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ExpenseCategory', id },
        { type: 'ExpenseCategory', id: 'LIST' },
      ],
    }),

    deleteWorkExpenseCategory: builder.mutation<ExpenseCategoryDeleteResponse, string>({
      query: (id) => ({
        url: `/work/expense-categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'ExpenseCategory', id },
        { type: 'ExpenseCategory', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetWorkExpensesQuery,
  useGetWorkExpenseByIdQuery,
  useCreateWorkExpenseMutation,
  useUpdateWorkExpenseMutation,
  usePatchWorkExpenseMutation,
  useDeleteWorkExpenseMutation,
  useGetWorkExpenseCategoriesQuery,
  useGetWorkExpenseCategoryByIdQuery,
  useCreateWorkExpenseCategoryMutation,
  useUpdateWorkExpenseCategoryMutation,
  usePatchWorkExpenseCategoryMutation,
  useDeleteWorkExpenseCategoryMutation,
} = workExpenseEndpoints;

// =========================================================================
// Direct Imperative Clients for Work Expenses & Categories
// =========================================================================

export const workExpenseCategoryApi = {
  /**
   * List expense categories
   * GET /work/expense-categories
   */
  getExpenseCategories: async (
    params?: ExpenseCategoryFilterParams
  ): Promise<ExpenseCategoryListResponse> => {
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
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params.status && params.status !== 'All') {
        queryParams.status = params.status;
      }
      if (params.organization_id) queryParams.organization_id = params.organization_id;
    }

    const response = await baseClient.get<ExpenseCategoryListResponse>(
      '/work/expense-categories',
      {
        params: queryParams,
      }
    );
    return response.data;
  },

  /**
   * Get single expense category by ID
   * GET /work/expense-categories/{id}
   */
  getExpenseCategoryById: async (
    id: string
  ): Promise<ExpenseCategorySingleResponse> => {
    const response = await baseClient.get<ExpenseCategorySingleResponse>(
      `/work/expense-categories/${id}`
    );
    return response.data;
  },

  /**
   * Create an expense category
   * POST /work/expense-categories
   */
  createExpenseCategory: async (
    payload: CreateExpenseCategoryPayload
  ): Promise<ExpenseCategorySingleResponse> => {
    const cleanPayload: Record<string, any> = {
      name: payload.name.trim(),
    };
    if (payload.description && payload.description.trim()) {
      cleanPayload.description = payload.description.trim();
    }
    if (payload.status) {
      cleanPayload.status = payload.status;
    }

    const response = await baseClient.post<ExpenseCategorySingleResponse>(
      '/work/expense-categories',
      cleanPayload
    );
    return response.data;
  },

  /**
   * Update an expense category
   * PUT /work/expense-categories/{id}
   */
  updateExpenseCategory: async (
    id: string,
    payload: UpdateExpenseCategoryPayload
  ): Promise<ExpenseCategorySingleResponse> => {
    const cleanPayload: Record<string, any> = {};
    if (payload.name) cleanPayload.name = payload.name.trim();
    if (payload.description !== undefined) {
      cleanPayload.description = payload.description?.trim() || '';
    }
    if (payload.status) cleanPayload.status = payload.status;

    const response = await baseClient.put<ExpenseCategorySingleResponse>(
      `/work/expense-categories/${id}`,
      cleanPayload
    );
    return response.data;
  },

  /**
   * Partially update an expense category
   * PATCH /work/expense-categories/{id}
   */
  patchExpenseCategory: async (
    id: string,
    payload: PatchExpenseCategoryPayload
  ): Promise<ExpenseCategorySingleResponse> => {
    const cleanPayload: Record<string, any> = {};
    if (payload.name) cleanPayload.name = payload.name.trim();
    if (payload.description !== undefined) {
      cleanPayload.description = payload.description?.trim() || '';
    }
    if (payload.status) cleanPayload.status = payload.status;

    const response = await baseClient.patch<ExpenseCategorySingleResponse>(
      `/work/expense-categories/${id}`,
      cleanPayload
    );
    return response.data;
  },

  /**
   * Delete an expense category
   * DELETE /work/expense-categories/{id}
   */
  deleteExpenseCategory: async (
    id: string
  ): Promise<ExpenseCategoryDeleteResponse> => {
    const response = await baseClient.delete<ExpenseCategoryDeleteResponse>(
      `/work/expense-categories/${id}`
    );
    return response.data;
  },
};

export const workExpenseApi = {
  /**
   * List expenses with summary totals across matching rows
   * GET /work/expenses
   */
  getExpenses: async (
    params?: ExpenseFilterParams
  ): Promise<ExpenseListResponse> => {
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
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params.categoryId && params.categoryId !== 'All') {
        queryParams.categoryId = params.categoryId;
      }
      if (params.supplierId) queryParams.supplierId = params.supplierId;
      if (params.branchId) queryParams.branchId = params.branchId;
      if (params.paymentMethod && params.paymentMethod !== 'All') {
        queryParams.paymentMethod = normalizePaymentMethodForApi(params.paymentMethod);
      }
      if (params.from) queryParams.from = params.from;
      if (params.to) queryParams.to = params.to;
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.organization_id) queryParams.organization_id = params.organization_id;
      if (params.sub_organization_id) queryParams.sub_organization_id = params.sub_organization_id;
    }

    const response = await baseClient.get<ExpenseListResponse>('/work/expenses', {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * Get single expense by ID
   * GET /work/expenses/{id}
   */
  getExpenseById: async (id: string): Promise<ExpenseSingleResponse> => {
    const response = await baseClient.get<ExpenseSingleResponse>(
      `/work/expenses/${id}`
    );
    return response.data;
  },

  /**
   * Record an expense
   * POST /work/expenses
   */
  createExpense: async (
    payload: CreateExpensePayload
  ): Promise<ExpenseSingleResponse> => {
    const cleanPayload: Record<string, any> = {
      categoryId: payload.categoryId,
      expenseDate: payload.expenseDate,
      title: payload.title,
      amount: payload.amount,
      taxPercent: payload.taxPercent ?? 0,
      paymentMethod: payload.paymentMethod,
    };

    if (payload.supplierId && isValidUuid(payload.supplierId)) {
      cleanPayload.supplierId = payload.supplierId;
    }
    if (payload.branchId && isValidUuid(payload.branchId)) {
      cleanPayload.branchId = payload.branchId;
    }
    if (payload.referenceNo && payload.referenceNo.trim()) {
      cleanPayload.referenceNo = payload.referenceNo.trim();
    }
    if (payload.notes && payload.notes.trim()) {
      cleanPayload.notes = payload.notes.trim();
    }

    const response = await baseClient.post<ExpenseSingleResponse>(
      '/work/expenses',
      cleanPayload
    );
    return response.data;
  },

  /**
   * Update an expense
   * PUT /work/expenses/{id}
   */
  updateExpense: async (
    id: string,
    payload: UpdateExpensePayload
  ): Promise<ExpenseSingleResponse> => {
    const cleanPayload: Record<string, any> = {};

    if (payload.categoryId) cleanPayload.categoryId = payload.categoryId;
    if (payload.expenseDate) cleanPayload.expenseDate = payload.expenseDate;
    if (payload.title) cleanPayload.title = payload.title;
    if (payload.amount !== undefined) cleanPayload.amount = payload.amount;
    if (payload.taxPercent !== undefined) cleanPayload.taxPercent = payload.taxPercent;
    if (payload.paymentMethod) cleanPayload.paymentMethod = payload.paymentMethod;

    if (payload.supplierId !== undefined) {
      if (payload.supplierId && isValidUuid(payload.supplierId)) {
        cleanPayload.supplierId = payload.supplierId;
      }
    }
    if (payload.branchId !== undefined) {
      if (payload.branchId && isValidUuid(payload.branchId)) {
        cleanPayload.branchId = payload.branchId;
      }
    }
    if (payload.referenceNo !== undefined) {
      if (payload.referenceNo.trim()) {
        cleanPayload.referenceNo = payload.referenceNo.trim();
      }
    }
    if (payload.notes !== undefined) {
      if (payload.notes.trim()) {
        cleanPayload.notes = payload.notes.trim();
      }
    }

    const response = await baseClient.put<ExpenseSingleResponse>(
      `/work/expenses/${id}`,
      cleanPayload
    );
    return response.data;
  },

  /**
   * Partially update an expense
   * PATCH /work/expenses/{id}
   */
  patchExpense: async (
    id: string,
    payload: PatchExpensePayload
  ): Promise<ExpenseSingleResponse> => {
    const cleanPayload: Record<string, any> = {};

    for (const [key, val] of Object.entries(payload)) {
      if (val !== null && val !== undefined && val !== '') {
        cleanPayload[key] = val;
      }
    }

    const response = await baseClient.patch<ExpenseSingleResponse>(
      `/work/expenses/${id}`,
      cleanPayload
    );
    return response.data;
  },

  /**
   * Delete an expense (soft delete)
   * DELETE /work/expenses/{id}
   */
  deleteExpense: async (id: string): Promise<ExpenseDeleteResponse> => {
    const response = await baseClient.delete<ExpenseDeleteResponse>(
      `/work/expenses/${id}`
    );
    return response.data;
  },
};
