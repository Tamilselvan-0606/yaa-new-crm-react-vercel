/**
 * Expense & Expense Category Work API Type Definitions
 * Based on OpenAPI Work Specs: /work/expenses and /work/expense-categories
 */

// =========================================================================
// Expense Category Interfaces
// =========================================================================

export interface ApiExpenseCategory {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategoryFilterParams {
  page?: number;
  limit?: number;
  page_no?: number;
  page_size?: number;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  status?: 'Active' | 'Inactive' | 'All';
  pagination_required?: boolean | string;
  organization_id?: string;
}

export interface CreateExpenseCategoryPayload {
  name: string;
  description?: string;
  status?: 'Active' | 'Inactive';
}

export interface UpdateExpenseCategoryPayload {
  name?: string;
  description?: string;
  status?: 'Active' | 'Inactive';
}

export interface PatchExpenseCategoryPayload {
  name?: string;
  description?: string;
  status?: 'Active' | 'Inactive';
}

export interface ExpenseCategoryPagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ExpenseCategoryListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiExpenseCategory[];
  pagination?: ExpenseCategoryPagination;
  meta?: {
    timestamp?: string;
    requestId?: string;
    [key: string]: any;
  };
}

export interface ExpenseCategorySingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiExpenseCategory;
  meta?: {
    timestamp?: string;
    requestId?: string;
    [key: string]: any;
  };
}

export interface ExpenseCategoryDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta?: {
    timestamp?: string;
    requestId?: string;
    [key: string]: any;
  };
}

// =========================================================================
// Expense Interfaces
// =========================================================================

export type ExpensePaymentMethod =
  | 'Cash'
  | 'UPI'
  | 'Bank Transfer'
  | 'Cheque'
  | 'Card'
  | 'Credit Card'
  | 'Debit Card';

export interface ApiExpenseSupplier {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  contactPerson?: string | null;
}

export interface ApiExpenseCategorySummary {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
}

export interface ApiExpense {
  id: string;
  organizationId: string;
  expenseNo: string;
  categoryId: string;
  supplierId?: string | null;
  branchId?: string | null;
  expenseDate: string;
  title: string;
  amount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  referenceNo?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: ApiExpenseCategorySummary | null;
  supplier?: ApiExpenseSupplier | null;
}

export interface ExpenseSummary {
  amount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface ExpenseFilterParams {
  page?: number;
  limit?: number;
  page_no?: number;
  page_size?: number;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  categoryId?: string;
  supplierId?: string;
  branchId?: string;
  paymentMethod?: ExpensePaymentMethod | string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  sortBy?: 'expenseDate' | 'amount' | 'createdAt';
  pagination_required?: boolean | string;
  organization_id?: string;
  sub_organization_id?: string;
}

export interface CreateExpensePayload {
  categoryId: string;
  supplierId?: string | null;
  branchId?: string | null;
  expenseDate: string; // YYYY-MM-DD
  title: string;
  amount: number;
  taxPercent?: number;
  paymentMethod: string;
  referenceNo?: string;
  notes?: string;
}

export interface UpdateExpensePayload {
  categoryId?: string;
  supplierId?: string | null;
  branchId?: string | null;
  expenseDate?: string;
  title?: string;
  amount?: number;
  taxPercent?: number;
  paymentMethod?: string;
  referenceNo?: string;
  notes?: string;
}

export interface PatchExpensePayload {
  categoryId?: string;
  supplierId?: string | null;
  branchId?: string | null;
  expenseDate?: string;
  title?: string;
  amount?: number;
  taxPercent?: number;
  paymentMethod?: string;
  referenceNo?: string;
  notes?: string;
}

export interface ExpensePagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ExpenseListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiExpense[];
  pagination: ExpensePagination;
  summary?: ExpenseSummary;
  meta?: {
    timestamp?: string;
    requestId?: string;
    [key: string]: any;
  };
}

export interface ExpenseSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiExpense;
  meta?: {
    timestamp?: string;
    requestId?: string;
    [key: string]: any;
  };
}

export interface ExpenseDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta?: {
    timestamp?: string;
    requestId?: string;
    [key: string]: any;
  };
}
