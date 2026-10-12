/**
 * Platform Leads API Types
 * Based on Platform Leads OpenAPI documentation
 */

export type PlatformLeadStatus =
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Proposal'
  | 'Negotiation'
  | 'Won'
  | 'Lost'
  | 'All';

export type PlatformLeadSource =
  | 'Website'
  | 'Referral'
  | 'LinkedIn'
  | 'Cold Call'
  | 'Campaign'
  | 'Event'
  | 'Other';

export type PlatformLeadPriority = 'Low' | 'Medium' | 'High';

export interface PlatformLeadItem {
  id: string;
  leadCode: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  whatsapp?: string | null;
  source: PlatformLeadSource | string;
  status: PlatformLeadStatus | string;
  priority: PlatformLeadPriority | string;
  value: number;
  planInterest?: string | null;
  industry?: string | null;
  location?: string | null;
  assignedTo?: string | null;
  followUpDate?: string | null;
  notes?: string | null;
  convertedOrganizationId?: string | null;
  convertedAt?: string | null;
  convertedOrganization?: {
    id: string;
    code: string;
    name: string;
    status: string;
  } | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PlatformLeadListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  source?: string;
  priority?: string;
  assignedTo?: string;
  followUpFrom?: string;
  followUpTo?: string;
  converted?: 'true' | 'false' | boolean;
  sortBy?: 'createdAt' | 'followUpDate' | 'value' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface PlatformLeadSummary {
  totalLeads: number;
  totalValue: number;
  byStatus: Array<{
    status: string;
    count: number;
    value: number;
  }>;
}

export interface PlatformLeadPagination {
  page: number;
  limit: number;
  page_no?: number;
  page_size?: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PlatformLeadListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: PlatformLeadItem[];
  pagination: PlatformLeadPagination;
  summary: PlatformLeadSummary;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PlatformLeadSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: PlatformLeadItem;
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface CreatePlatformLeadRequest {
  name: string;
  company: string;
  email: string;
  phone: string;
  whatsapp?: string;
  source?: PlatformLeadSource | string;
  status?: PlatformLeadStatus | string;
  priority?: PlatformLeadPriority | string;
  value?: number;
  planInterest?: string;
  industry?: string;
  location?: string;
  assignedTo?: string;
  followUpDate?: string;
  notes?: string;
}

export type UpdatePlatformLeadRequest = Partial<CreatePlatformLeadRequest>;

export interface UpdatePlatformLeadStatusRequest {
  status: string;
  notes?: string;
}

export interface ConvertPlatformLeadRequest {
  code: string;
  organizationType?: number;
  password?: string;
  registrationType?: string;
  gstNumber?: string;
  panNumber?: string;
  subOrganizationSupport?: boolean;
  [key: string]: any;
}

export interface ConvertPlatformLeadResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    lead: PlatformLeadItem;
    organization: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
