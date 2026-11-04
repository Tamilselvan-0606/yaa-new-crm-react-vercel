export type OrgSubscriptionStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Cancelled' | 'All';
export type OrgSubscriptionBillingCycle = 'Monthly' | 'Quarterly' | 'Annually' | 'One-Time';
export type OrgSubscriptionSortBy = 'endDate' | 'startDate' | 'amount' | 'createdAt';
export type OrgSubscriptionSortOrder = 'asc' | 'desc';

export interface OrganizationSubscriptionApiItem {
  id: string;
  subscriptionNumber: string;
  organizationId: string;
  orgName: string;
  orgCode: string;
  industry?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  planId: string;
  planName: string;
  planCode: string;
  billingCycle: OrgSubscriptionBillingCycle | string;
  amount: number;
  /** Discount given on the plan price (₹). */
  discount?: number;
  /** Final payable amount including GST (₹). */
  /** GST rate (%) applied on the amount after discount. */
  gstRate?: number;
  amountWithGst?: number;
  /** Extra free months added to the subscription. */
  bonusMonths?: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Cancelled' | string;
  daysRemaining?: number | null;
  autoRenew: boolean;
  notes?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  lastRenewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSubscriptionPagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface OrganizationSubscriptionListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  organizationId?: string;
  planId?: string;
  billingCycle?: string;
  autoRenew?: boolean | string;
  endDateFrom?: string;
  endDateTo?: string;
  sortBy?: OrgSubscriptionSortBy | string;
  sortOrder?: OrgSubscriptionSortOrder | string;
}

export interface OrganizationSubscriptionListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: OrganizationSubscriptionApiItem[];
  pagination: OrganizationSubscriptionPagination;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface OrganizationSubscriptionSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: OrganizationSubscriptionApiItem;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CreateOrganizationSubscriptionRequest {
  organizationId: string;
  planId: string;
  billingCycle: OrgSubscriptionBillingCycle | string;
  startDate: string;
  endDate?: string;
  autoRenew?: boolean;
  notes?: string;
  discount?: number;
  gstRate?: number;
  amountWithGst?: number;
  bonusMonths?: number;
}

export interface RenewOrganizationSubscriptionRequest {
  billingCycle?: OrgSubscriptionBillingCycle | string;
  autoRenew?: boolean;
}

export interface CancelOrganizationSubscriptionRequest {
  reason?: string;
}
