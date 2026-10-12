export interface SubscriptionPlanLimits {
  adminUsers?: number;
  staffUsers?: number;
  branches?: number;
  storageGB?: number;
  [key: string]: any;
}

export interface SubscriptionPlanApiItem {
  id: string;
  code: string;
  name: string;
  tier: string;
  description?: string;
  monthlyPrice: number;
  annualPrice: number;
  gstRate: number;
  billingCycle: 'Monthly' | 'Quarterly' | 'Annually' | 'One-Time' | string;
  pricingType: 'Fixed' | 'Per-User' | 'Usage-Based' | 'Tiered' | string;
  status: 'Active' | 'Inactive' | string;
  features: string[];
  limits?: SubscriptionPlanLimits;
  isPopular?: boolean;
  activeSubscriptions?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface SubscriptionPlanPagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SubscriptionPlanListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'Active' | 'Inactive' | 'All' | string;
  billingCycle?: 'Monthly' | 'Quarterly' | 'Annually' | 'One-Time' | string;
  pricingType?: 'Fixed' | 'Per-User' | 'Usage-Based' | 'Tiered' | string;
  isPopular?: boolean | string;
  sortBy?: 'name' | 'monthlyPrice' | 'annualPrice' | 'createdAt' | string;
  sortOrder?: 'asc' | 'desc' | string;
}

export interface SubscriptionPlanListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: SubscriptionPlanApiItem[];
  pagination: SubscriptionPlanPagination;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface SubscriptionPlanSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: SubscriptionPlanApiItem;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface SubscriptionPlanDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface CreateSubscriptionPlanRequest {
  name: string;
  code: string;
  tier?: string;
  description?: string;
  monthlyPrice: number;
  annualPrice: number;
  gstRate?: number;
  billingCycle?: 'Monthly' | 'Quarterly' | 'Annually' | 'One-Time' | string;
  pricingType?: 'Fixed' | 'Per-User' | 'Usage-Based' | 'Tiered' | string;
  status?: 'Active' | 'Inactive' | string;
  features?: string[];
  limits?: SubscriptionPlanLimits;
  isPopular?: boolean;
}

export interface UpdateSubscriptionPlanRequest {
  name?: string;
  code?: string;
  tier?: string;
  description?: string;
  monthlyPrice?: number;
  annualPrice?: number;
  gstRate?: number;
  billingCycle?: 'Monthly' | 'Quarterly' | 'Annually' | 'One-Time' | string;
  pricingType?: 'Fixed' | 'Per-User' | 'Usage-Based' | 'Tiered' | string;
  status?: 'Active' | 'Inactive' | string;
  features?: string[];
  limits?: SubscriptionPlanLimits;
  isPopular?: boolean;
}
