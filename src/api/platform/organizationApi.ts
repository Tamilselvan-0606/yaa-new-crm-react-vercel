import { baseClient } from '../baseApi';
import {
  OrganizationListResponse,
  OrganizationSingleResponse,
  OrganizationDeleteResponse,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from './organizationTypes';

export const organizationApi = {
  // GET /api/v1/platform/organizations?page={page}&limit={limit}
  getOrganizations: async (page = 1, limit = 10): Promise<OrganizationListResponse> => {
    const res = await baseClient.get<OrganizationListResponse>('/platform/organizations', {
      params: { page, limit },
    });
    return res.data;
  },

  // POST /api/v1/platform/organizations
  createOrganization: async (payload: CreateOrganizationRequest): Promise<OrganizationSingleResponse> => {
    const res = await baseClient.post<OrganizationSingleResponse>('/platform/organizations', payload);
    return res.data;
  },

  // GET /api/v1/platform/organizations/:id
  getOrganizationById: async (id: string): Promise<OrganizationSingleResponse> => {
    const res = await baseClient.get<OrganizationSingleResponse>(`/platform/organizations/${id}`);
    return res.data;
  },

  // PUT /api/v1/platform/organizations/:id
  updateOrganization: async (
    id: string,
    payload: UpdateOrganizationRequest
  ): Promise<OrganizationSingleResponse> => {
    const res = await baseClient.put<OrganizationSingleResponse>(`/platform/organizations/${id}`, payload);
    return res.data;
  },

  // DELETE /api/v1/platform/organizations/:id (Deactivate organization)
  deleteOrganization: async (id: string): Promise<OrganizationDeleteResponse> => {
    const res = await baseClient.delete<OrganizationDeleteResponse>(`/platform/organizations/${id}`);
    return res.data;
  },
};
