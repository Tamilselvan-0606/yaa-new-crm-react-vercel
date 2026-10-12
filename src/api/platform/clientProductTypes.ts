import { ProductPlanApiItem } from './productPlanTypes';

export interface ClientProductApiItem {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  contactPerson?: string;
  mobileNumber?: string;
  supportPhone?: string;
  supportWhatsapp?: string;
  supportEmail?: string;
  gstNumber?: string;
  panNumber?: string;
  hqCity?: string;
  address?: string;
  status: 'Active' | 'Inactive' | 'Suspended' | string;
  tagline?: string;
  description?: string;
  websiteUrl?: string;
  applicationUrl?: string;
  badge?: string;
  color?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  plansCount?: number;
  activeSubscriptions?: number;
  plans?: ProductPlanApiItem[];
}

export interface ClientProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'Active' | 'Inactive' | 'Suspended' | 'All' | string;
  sortBy?: 'name' | 'code' | 'createdAt' | 'updatedAt' | string;
  sortOrder?: 'asc' | 'desc';
  organizationId?: string;
  xOrganizationId?: string;
}

export interface CreateClientProductRequest {
  name: string;
  code?: string;
  contactPerson?: string;
  mobileNumber?: string;
  supportPhone?: string;
  supportWhatsapp?: string;
  supportEmail?: string;
  gstNumber?: string;
  panNumber?: string;
  hqCity?: string;
  address?: string;
  status?: 'Active' | 'Inactive' | 'Suspended' | string;
  tagline?: string;
  description?: string;
  websiteUrl?: string;
  applicationUrl?: string;
  badge?: string;
  color?: string;
}

export interface UpdateClientProductRequest {
  name?: string;
  code?: string;
  contactPerson?: string;
  mobileNumber?: string;
  supportPhone?: string;
  supportWhatsapp?: string;
  supportEmail?: string;
  gstNumber?: string;
  panNumber?: string;
  hqCity?: string;
  address?: string;
  status?: 'Active' | 'Inactive' | 'Suspended' | string;
  tagline?: string;
  description?: string;
  websiteUrl?: string;
  applicationUrl?: string;
  badge?: string;
  color?: string;
}

export interface PatchClientProductRequest {
  name?: string;
  code?: string;
  contactPerson?: string;
  mobileNumber?: string;
  supportPhone?: string;
  supportWhatsapp?: string;
  supportEmail?: string;
  gstNumber?: string;
  panNumber?: string;
  hqCity?: string;
  address?: string;
  status?: 'Active' | 'Inactive' | 'Suspended' | string;
  tagline?: string;
  description?: string;
  websiteUrl?: string;
  applicationUrl?: string;
  badge?: string;
  color?: string;
}

export interface PatchClientProductStatusRequest {
  status: 'Active' | 'Inactive' | 'Suspended' | string;
}

export interface ClientProductListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ClientProductApiItem[];
  pagination?: {
    page?: number;
    limit?: number;
    page_no?: number;
    page_size?: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}

export interface ClientProductSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: ClientProductApiItem;
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}

export interface ClientProductDeleteResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: null | string;
  meta?: {
    timestamp?: string;
    requestId?: string;
  };
}
