export interface ClientSubscriptionCustomer {
  id: string;
  customerCode?: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
}

export interface ClientSubscriptionProduct {
  id: string;
  code?: string;
  name: string;
}

export interface ClientSubscriptionPlan {
  id: string;
  code?: string;
  name: string;
  price?: number;
}

export interface ClientSubscriptionApiItem {
  id: string;
  subscriptionNumber?: string;
  organizationId: string;
  customerId: string;
  productId: string;
  planId?: string | null;
  billingCycle: 'Monthly' | 'Quarterly' | 'Yearly' | 'Annually' | 'One-Time' | string;
  amount: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Cancelled' | string;
  autoRenew: boolean;
  notes?: string | null;
  daysRemaining?: number | null;
  cancelledAt?: string | null;
  lastRenewedAt?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  customer?: ClientSubscriptionCustomer;
  product?: ClientSubscriptionProduct;
  plan?: ClientSubscriptionPlan;
}

export interface ClientSubscriptionPagination {
  page?: number;
  limit?: number;
  page_no?: number;
  page_size?: number;
  totalRecords?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface ClientSubscriptionListParams {
  page?: number;
  limit?: number;
  page_no?: number;
  page_size?: number;
  pagination_required?: boolean | string;
  search?: string;
  status?: string;
  productId?: string;
  customerId?: string;
  planId?: string;
  sortBy?: 'createdAt' | 'startDate' | 'endDate' | 'amount' | string;
  sortOrder?: 'asc' | 'desc';
}

export interface ClientSubscriptionListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ClientSubscriptionApiItem[];
  pagination?: ClientSubscriptionPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface ClientSubscriptionSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ClientSubscriptionApiItem;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CreateClientSubscriptionRequest {
  customerId: string;
  productId: string;
  planId?: string;
  billingCycle?: string;
  amount?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  autoRenew?: boolean;
  notes?: string;
}

export interface UpdateClientSubscriptionRequest {
  customerId?: string;
  productId?: string;
  planId?: string;
  billingCycle?: string;
  amount?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  autoRenew?: boolean;
  notes?: string;
}

export interface RenewClientSubscriptionRequest {
  billingCycle?: string;
  amount?: number;
  notes?: string;
  endDate?: string;
}

export interface PatchClientSubscriptionStatusRequest {
  status: string;
}
