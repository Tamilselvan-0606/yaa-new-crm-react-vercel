import { baseClient } from '../baseApi';

// Route group for the organization-banks endpoints (the API docs list them as /organization-banks;
// the server returns 404 for the bare path, so they are served under the platform group).
const BASE = '/platform/organization-banks';

export interface OrganizationBankItem {
  id: string;
  bankName: string;
  accountHolderName?: string | null;
  accountNumber: string;
  ifscCode?: string | null;
  swiftCode?: string | null;
  accountType?: string | null;
  branchName?: string | null;
  upiId?: string | null;
  isDefault?: boolean;
  status?: 'Active' | 'Inactive' | string;
  organizationId?: string | null;
  subOrganizationId?: string | null;
  accountName?: string | null;
  accountHolder?: string | null;
  ifsc?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationBankListParams {
  page?: number;
  limit?: number;
  organizationId?: string;
  subOrganizationId?: string;
  search?: string;
  status?: 'Active' | 'Inactive' | 'All';
  isDefault?: boolean;
  accountType?: string;
  sortBy?: 'createdAt' | 'bankName' | 'accountHolderName' | 'accountNumber' | 'isDefault' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateOrganizationBankRequest {
  bankName: string;
  accountHolderName?: string;
  accountNumber: string;
  ifscCode?: string;
  swiftCode?: string | null;
  accountType?: string;
  branchName?: string;
  upiId?: string;
  isDefault?: boolean;
  status?: 'Active' | 'Inactive';
  organizationId?: string;
  subOrganizationId?: string | null;
}

export type UpdateOrganizationBankRequest = Partial<Omit<CreateOrganizationBankRequest, 'organizationId' | 'subOrganizationId'>>;

interface Envelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const organizationBankApi = {
  list: async (params: OrganizationBankListParams = {}): Promise<Envelope<OrganizationBankItem[]>> => {
    const query: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query[k] = v;
    });
    const res = await baseClient.get<Envelope<OrganizationBankItem[]>>(BASE, { params: query });
    return res.data;
  },

  getById: async (id: string): Promise<Envelope<OrganizationBankItem>> => {
    const res = await baseClient.get<Envelope<OrganizationBankItem>>(`${BASE}/${id}`);
    return res.data;
  },

  create: async (payload: CreateOrganizationBankRequest): Promise<Envelope<OrganizationBankItem>> => {
    const res = await baseClient.post<Envelope<OrganizationBankItem>>(BASE, payload);
    return res.data;
  },

  update: async (id: string, payload: UpdateOrganizationBankRequest): Promise<Envelope<OrganizationBankItem>> => {
    const res = await baseClient.put<Envelope<OrganizationBankItem>>(`${BASE}/${id}`, payload);
    return res.data;
  },

  patch: async (
    id: string,
    payload: { isDefault?: boolean; status?: 'Active' | 'Inactive' },
  ): Promise<Envelope<OrganizationBankItem>> => {
    const res = await baseClient.patch<Envelope<OrganizationBankItem>>(`${BASE}/${id}`, payload);
    return res.data;
  },

  setDefault: async (id: string): Promise<Envelope<OrganizationBankItem>> => {
    const res = await baseClient.patch<Envelope<OrganizationBankItem>>(`${BASE}/${id}/default`);
    return res.data;
  },

  remove: async (id: string): Promise<Envelope<null>> => {
    const res = await baseClient.delete<Envelope<null>>(`${BASE}/${id}`);
    return res.data;
  },
};
