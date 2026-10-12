export interface ProductPlanApiItem {
  id: string;
  organizationId: string;
  productId: string;
  name: string;
  code: string;
  price: number;
  billingCycle: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly' | string;
  features: string[];
  status: 'Active' | 'Inactive' | string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ProductPlanListParams {
  status?: 'Active' | 'Inactive' | 'All' | string;
  xOrganizationId?: string;
}

export interface CreateProductPlanRequest {
  name: string;
  code?: string;
  price: number;
  billingCycle?: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly' | string;
  features?: string[];
  status?: 'Active' | 'Inactive' | string;
}

export interface UpdateProductPlanRequest {
  name?: string;
  code?: string;
  price?: number;
  billingCycle?: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly' | string;
  features?: string[];
  status?: 'Active' | 'Inactive' | string;
}

export interface PatchProductPlanRequest {
  price?: number;
  name?: string;
  code?: string;
  billingCycle?: string;
  features?: string[];
  status?: string;
}

export interface ProductPlanListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ProductPlanApiItem[];
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}

export interface ProductPlanSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ProductPlanApiItem;
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}

export interface ProductPlanDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null | string;
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}
