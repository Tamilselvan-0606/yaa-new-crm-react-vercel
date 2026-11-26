import { baseClient } from '../baseApi';
import {
  ApiFirm,
  FirmFilterParams,
  FirmListResponse,
  FirmSingleResponse,
  FirmDeleteResponse,
  CreateFirmPayload,
  UpdateFirmPayload,
  UpdateFirmStatusPayload,
  FirmItem,
} from './firmTypes';

export * from './firmTypes';

export const mapApiFirmToFirmItem = (apiFirm: ApiFirm): FirmItem => {
  const name = apiFirm.firm_name || apiFirm.firmName || 'Unnamed Firm';
  const code = apiFirm.firm_code || apiFirm.firmCode || '-';
  const mobile = apiFirm.mobile_number || apiFirm.mobileNumber || '';
  const subOrgId = apiFirm.sub_organization_id ?? apiFirm.subOrganizationId ?? null;
  const subOrgName = apiFirm.sub_organization_name ?? null;
  const branchId = apiFirm.branch_id ?? apiFirm.branchId ?? null;
  const branchName = apiFirm.branch_name ?? null;
  const status = apiFirm.status || 'Active';
  const createdAt = apiFirm.created_at || apiFirm.createdAt || new Date().toISOString();
  const updatedAt = apiFirm.updated_at || apiFirm.updatedAt;

  return {
    id: apiFirm.id,
    name,
    code,
    mobileNumber: mobile,
    phone: mobile,
    subOrganizationId: subOrgId,
    subOrganizationName: subOrgName,
    branchId: branchId,
    branchName: branchName,
    status,
    createdAt,
    updatedAt,
  };
};

export const firmApi = {
  /**
   * GET /firms - List firms with search, filters and pagination
   */
  async getFirms(params: FirmFilterParams = {}): Promise<FirmListResponse> {
    const queryParams: Record<string, any> = {};

    if (params.page_no !== undefined) queryParams.page_no = params.page_no;
    else if (params.page !== undefined) queryParams.page_no = params.page;

    if (params.page_size !== undefined) queryParams.page_size = params.page_size;
    else if (params.limit !== undefined) queryParams.page_size = params.limit;

    if (params.pagination_required !== undefined) {
      queryParams.pagination_required = String(params.pagination_required);
    }

    if (params.search?.trim()) queryParams.search = params.search.trim();
    if (params.status && params.status !== 'All') queryParams.status = params.status;

    if (params.sort_by) queryParams.sort_by = params.sort_by;
    else if (params.sortBy) queryParams.sort_by = params.sortBy;

    if (params.sort_order) queryParams.sort_order = params.sort_order;
    else if (params.sortOrder) queryParams.sort_order = params.sortOrder;

    if (params.organization_id) queryParams.organization_id = params.organization_id;
    else if (params.organizationId) queryParams.organization_id = params.organizationId;

    if (params.sub_organization_id) queryParams.sub_organization_id = params.sub_organization_id;
    else if (params.subOrganizationId) queryParams.sub_organization_id = params.subOrganizationId;

    if (params.branch_id) queryParams.branch_id = params.branch_id;
    else if (params.branchId) queryParams.branch_id = params.branchId;

    const response = await baseClient.get<FirmListResponse>('/firms', {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * GET /firms/:id - Get firm details by UUID
   */
  async getFirmById(id: string): Promise<FirmSingleResponse> {
    const response = await baseClient.get<FirmSingleResponse>(`/firms/${id}`);
    return response.data;
  },

  /**
   * POST /firms - Create a new firm
   */
  async createFirm(payload: CreateFirmPayload): Promise<FirmSingleResponse> {
    const body = {
      firm_name: payload.firm_name.trim(),
      mobile_number: payload.mobile_number.trim(),
      sub_organization_id: payload.sub_organization_id || null,
      branch_id: payload.branch_id || null,
      status: payload.status || 'Active',
    };
    const response = await baseClient.post<FirmSingleResponse>('/firms', body);
    return response.data;
  },

  /**
   * PUT /firms/:id - Full update of firm
   */
  async updateFirm(id: string, payload: UpdateFirmPayload): Promise<FirmSingleResponse> {
    const body: Record<string, any> = {};
    if (payload.firm_name !== undefined) body.firm_name = payload.firm_name.trim();
    if (payload.mobile_number !== undefined) body.mobile_number = payload.mobile_number.trim();
    if (payload.sub_organization_id !== undefined) body.sub_organization_id = payload.sub_organization_id || null;
    if (payload.branch_id !== undefined) body.branch_id = payload.branch_id || null;
    if (payload.status !== undefined) body.status = payload.status;

    const response = await baseClient.put<FirmSingleResponse>(`/firms/${id}`, body);
    return response.data;
  },

  /**
   * PATCH /firms/:id - Partially update firm
   */
  async patchFirm(id: string, payload: Partial<UpdateFirmPayload>): Promise<FirmSingleResponse> {
    const body: Record<string, any> = {};
    if (payload.firm_name !== undefined) body.firm_name = payload.firm_name.trim();
    if (payload.mobile_number !== undefined) body.mobile_number = payload.mobile_number.trim();
    if (payload.sub_organization_id !== undefined) body.sub_organization_id = payload.sub_organization_id || null;
    if (payload.branch_id !== undefined) body.branch_id = payload.branch_id || null;
    if (payload.status !== undefined) body.status = payload.status;

    const response = await baseClient.patch<FirmSingleResponse>(`/firms/${id}`, body);
    return response.data;
  },

  /**
   * PATCH /firms/:id/status - Update firm status (Active/Inactive/Suspended)
   */
  async updateFirmStatus(id: string, payload: UpdateFirmStatusPayload): Promise<FirmSingleResponse> {
    const response = await baseClient.patch<FirmSingleResponse>(`/firms/${id}/status`, {
      status: payload.status,
    });
    return response.data;
  },

  /**
   * DELETE /firms/:id - Soft-deletes the firm
   */
  async deleteFirm(id: string): Promise<FirmDeleteResponse> {
    const response = await baseClient.delete<FirmDeleteResponse>(`/firms/${id}`);
    return response.data;
  },
};
