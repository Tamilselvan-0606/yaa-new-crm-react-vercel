export interface ApiCategory {
  id: string;
  sNo?: number;
  organizationId: string;
  code?: string;
  name?: string;
  categoryName: string;
  description?: string | null;
  status: 'Active' | 'Inactive';
  createdAt?: string;
  updatedAt?: string;
  subcategories?: ApiSubcategory[];
  productCount?: number;
}

import type { ApiSubcategory } from './subcategoryTypes';
export type { ApiSubcategory };

export interface CategoryFilterParams {
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
}

export interface CategoryPagination {
  page: number;
  limit: number;
  page_no: number;
  page_size: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CategoryListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiCategory[];
  pagination?: CategoryPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CategorySingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiCategory;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CategoryDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CreateCategoryPayload {
  categoryName: string;
  status?: 'Active' | 'Inactive';
  description?: string | null;
}

export interface UpdateCategoryPayload {
  categoryName?: string;
  status?: 'Active' | 'Inactive';
  description?: string | null;
}
