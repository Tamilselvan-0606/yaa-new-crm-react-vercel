export interface ApiSubcategory {
  id: string;
  sNo?: number;
  organizationId: string;
  categoryId?: string;
  category?: string;
  categoryName?: string;
  name?: string;
  subcategory: string;
  description?: string | null;
  status: 'Active' | 'Inactive';
  createdAt?: string;
  updatedAt?: string;
  productCount?: number;
}

export interface SubcategoryFilterParams {
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  category?: string;
}

export interface SubcategoryPagination {
  page: number;
  limit: number;
  page_no: number;
  page_size: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SubcategoryListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiSubcategory[];
  pagination?: SubcategoryPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface SubcategorySingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiSubcategory;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface SubcategoryDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CreateSubcategoryPayload {
  category: string;
  subcategory: string;
  status?: 'Active' | 'Inactive';
}

export interface UpdateSubcategoryPayload {
  category?: string;
  subcategory?: string;
  status?: 'Active' | 'Inactive';
}
