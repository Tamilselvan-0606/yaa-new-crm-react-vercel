export interface ApiPurchaseRequestItem {
  id?: string;
  productId: string;
  productName: string;
  currentStock?: number;
  requestedQuantity: number;
  estimatedUnitPrice?: number;
  requiredDate?: string;
  remarks?: string;
}

/** The supplier attached to a request, as the API returns it. */
export interface ApiPurchaseRequestSupplier {
  id: string;
  supplierCode?: string | null;
  supplierName?: string | null;
  /** Some responses use `name`; both are read. */
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface ApiPurchaseRequest {
  id: string;
  requestNo: string;
  supplierId?: string | null;
  supplier?: ApiPurchaseRequestSupplier | null;
  requestDate: string;
  requestedBy: string;
  department: string;
  requiredDate?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent' | string;
  status:
    | 'Draft'
    | 'Submitted'
    | 'Pending Approval'
    | 'Approved'
    | 'Rejected'
    | 'Purchase Created'
    | 'Completed'
    | string;
  items: ApiPurchaseRequestItem[];
  notes?: string | null;
  organizationId?: string;
  subOrganizationId?: string | null;
  branchId?: string | null;
  totalEstimatedAmount?: number;
  rejectionReason?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdPurchaseId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRequestPagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface PurchaseRequestFilterParams {
  page_no?: number;
  page_size?: number;
  page?: number;
  limit?: number;
  pagination_required?: boolean | string;
  search?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  organization_id?: string;
  sub_organization_id?: string;
  branch_id?: string;
}

export interface PurchaseRequestListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiPurchaseRequest[];
  pagination?: PurchaseRequestPagination;
  summary?: { totalCount: number; draftCount: number; pendingCount: number; approvedCount: number; rejectedCount: number; completedCount: number };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PurchaseRequestSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ApiPurchaseRequest;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PurchaseRequestDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: any;
}

export interface CreatePurchaseRequestPayload {
  supplierId?: string;
  requestNo?: string;
  requestDate?: string;
  requestedBy: string;
  department: string;
  requiredDate?: string;
  priority: string;
  status?: string;
  items: Array<{
    productId: string;
    productName: string;
    currentStock?: number;
    requestedQuantity: number;
    estimatedUnitPrice?: number;
    requiredDate?: string;
    remarks?: string;
  }>;
  notes?: string;
  organization_id?: string;
  sub_organization_id?: string;
  branch_id?: string;
}

export interface UpdatePurchaseRequestPayload {
  /** Only sent when the user picked a different supplier. */
  supplierId?: string;
  department?: string;
  requiredDate?: string;
  priority?: string;
  items?: Array<{
    productId: string;
    productName: string;
    currentStock?: number;
    requestedQuantity: number;
    estimatedUnitPrice?: number;
    requiredDate?: string;
    remarks?: string;
  }>;
  notes?: string;
}

export interface UpdatePurchaseRequestStatusPayload {
  status: 'Approved' | 'Rejected' | 'Pending Approval' | 'Draft' | 'Purchase Created' | string;
  approvedBy?: string;
  rejectionReason?: string;
}
