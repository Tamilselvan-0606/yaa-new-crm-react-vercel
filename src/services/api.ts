import axios, { AxiosInstance } from 'axios';
import { jwtDecode } from 'jwt-decode';
import {
  Role,
  User,
  Product,
  ProductPlan,
  DigitalMarketingPlan,
  Lead,
  Customer,
  ContentItem,
  TaskItem,
  PaymentItem,
  SubscriptionItem,
  ReminderItem,
  ActivityLog,
  CompanySettings,
  Branch,
} from '../types';
import {
  API_BASE_URL,
  TOKEN_STORAGE_KEY,
  USER_ID_STORAGE_KEY,
  USER_CACHE_STORAGE_KEY,
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  getStoredOrganizationId,
  setStoredOrganizationId,
} from '../api/config';
import { authApi } from '../api/auth/authApi';
import { ApiUser, ApiLoginResponse } from '../api/auth/authTypes';

import { baseClient } from '../api/baseApi';
import { CreatePlatformLeadRequest, UpdatePlatformLeadRequest } from '../api/platform/leadTypes';
import { retryWithRefreshedToken } from '../api/tokenRefresh';
import { clearApiCache } from '../api/queryCache';

export { authApi };
export type { ApiUser, ApiLoginResponse };

// Create Axios Instance for CRM business operations targeting backend
export const axiosClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Bearer Token
axiosClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const currentUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (currentUserId) {
      config.headers['x-user-id'] = currentUserId;
    }
    const orgId = getStoredOrganizationId();
    if (orgId) {
      config.headers['x-organization-id'] = orgId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format error messages & silent token refresh on 401
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Silent token refresh when the short-lived access token has expired
    const retried = await retryWithRefreshedToken(axiosClient, error);
    if (retried) return retried;

    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: Role | string;
  department?: string;
  exp: number;
}

class ApiService {
  getToken(): string | null {
    return getStoredToken();
  }

  setToken(token: string) {
    setStoredToken(token);
  }

  /**
   * Forgets the header selection (organization, sub-organization, branch, product) and the lists cached for them,
   * so a different login never starts with the previous organization's scope.
   */
  clearOrganizationScope() {
    const prefixes = ['active_sub_organization', 'active_branch', 'active_product', 'active_organization', 'active_sub_orgs_list_cache', 'active_sub_org_seller_cache', 'active_org_seller_cache'];
    const exact = ['yaa_crm_organization_id', 'branches_catalog_orgsuperadmin', 'organizations_catalog_orgsuperadmin', 'organizationId', 'subOrganizationId', 'branchId'];
    Object.keys(localStorage).forEach((key) => {
      if (exact.includes(key) || prefixes.some((p) => key.startsWith(p))) localStorage.removeItem(key);
    });
  }

  removeToken() {
    removeStoredToken();
    clearApiCache();
    this.clearOrganizationScope();
  }

  setUserId(id: string) {
    localStorage.setItem(USER_ID_STORAGE_KEY, id);
  }

  getUserId(): string | null {
    return localStorage.getItem(USER_ID_STORAGE_KEY);
  }

  getUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_CACHE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setUser(user: User): void {
    localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(user));
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  // Format backend API user to application User interface
  mapApiUserToAppUser(apiUser: ApiUser): User {
    const rawRole =
      (typeof apiUser.role === 'object' && apiUser.role?.code)
        ? apiUser.role.code
        : (typeof apiUser.role === 'string' && apiUser.role)
        ? apiUser.role
        : apiUser.memberships?.[0]?.role?.code
        ? apiUser.memberships[0].role.code
        : apiUser.isPlatformAdmin
        ? 'SUPER_ADMIN'
        : 'ORG_ADMIN';

    const normalizedRole = (rawRole || '').toUpperCase();
    let roleCode: Role = 'ORG_ADMIN';

    if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'SUPERADMIN' || apiUser.isPlatformAdmin) {
      roleCode = 'SUPER_ADMIN';
    } else if (
      normalizedRole === 'ORG_ADMIN' ||
      normalizedRole === 'ORGADMIN' ||
      normalizedRole === 'ADMIN' ||
      normalizedRole === 'ORGSUPERADMIN'
    ) {
      roleCode = 'ORG_ADMIN';
    } else if (normalizedRole === 'SUB_ORG_ADMIN' || normalizedRole === 'SUBORGADMIN') {
      roleCode = 'SUB_ORG_ADMIN';
    } else if (normalizedRole === 'BRANCH_ADMIN' || normalizedRole === 'BRANCHADMIN') {
      roleCode = 'BRANCH_ADMIN';
    } else if (normalizedRole === 'STAFF') {
      roleCode = 'STAFF';
    } else {
      roleCode = rawRole as Role;
    }

    const primaryMembership =
      apiUser.memberships?.find((m) => m.organizationId === apiUser.organizationId) ||
      apiUser.memberships?.[0];
    const membershipOrgId = primaryMembership?.organizationId || apiUser.organizationId;
    if (membershipOrgId) {
      setStoredOrganizationId(membershipOrgId);
    }

    const organization =
      apiUser.organization ||
      primaryMembership?.organization;

    const orgType =
      organization?.organizationType ??
      apiUser.organizationType ??
      primaryMembership?.organization?.organizationType;

    const orgTypeName =
      organization?.organizationTypeName ??
      apiUser.organizationTypeName ??
      primaryMembership?.organization?.organizationTypeName;

    const orgName = organization?.name || apiUser.name;
    if (orgName) {
      localStorage.setItem('active_organization', orgName);
      localStorage.setItem('active_organization_orgsuperadmin', orgName);
    }

    const normOrgTypeStr = orgType !== undefined && orgType !== null ? String(orgType).trim() : '';
    const normOrgTypeName = String(orgTypeName ?? '').replace(/_/g, ' ').toUpperCase().trim();

    if (normOrgTypeStr !== '') {
      localStorage.setItem('user_organization_type', normOrgTypeStr);
      if (orgTypeName) localStorage.setItem('user_organization_type_name', String(orgTypeName));
    }

    // Immediately synchronize active suite mode based on organization capability
    if (normOrgTypeStr === '1' || normOrgTypeName === 'CLIENT MANAGEMENT') {
      localStorage.setItem('active_org_type_view', 'Client Management');
      localStorage.setItem('active_org_type_orgsuperadmin', 'Client Management');
      localStorage.setItem('user_organization_type', '1');
      localStorage.setItem('user_organization_type_name', 'CLIENT_MANAGEMENT');
      window.dispatchEvent(new CustomEvent('orgTypeChanged', { detail: 'Client Management' }));
    } else if (normOrgTypeStr === '2' || normOrgTypeName === 'SALE MANAGEMENT' || normOrgTypeName === 'SALES MANAGEMENT') {
      localStorage.setItem('active_org_type_view', 'Sales Management');
      localStorage.setItem('active_org_type_orgsuperadmin', 'Sales Management');
      localStorage.setItem('user_organization_type', '2');
      localStorage.setItem('user_organization_type_name', 'SALE_MANAGEMENT');
      window.dispatchEvent(new CustomEvent('orgTypeChanged', { detail: 'Sales Management' }));
    } else if (normOrgTypeStr === '0' || normOrgTypeName === 'ALL') {
      localStorage.setItem('user_organization_type', '0');
      localStorage.setItem('user_organization_type_name', 'ALL');
      if (!localStorage.getItem('active_org_type_view')) {
        localStorage.setItem('active_org_type_view', 'Client Management');
      }
    }

    const getRoleTitle = (r: string) => {
      switch (r) {
        case 'SUPER_ADMIN':
          return 'Platform Super Administrator';
        case 'ORG_ADMIN':
          return 'Organisation Administrator';
        case 'SUB_ORG_ADMIN':
          return 'Sub Organisation Administrator';
        case 'BRANCH_ADMIN':
          return 'Branch Administrator';
        case 'STAFF':
          return 'Operational Staff';
        default:
          return 'Administrator';
      }
    };

    return {
      id: apiUser.id,
      name: apiUser.name || apiUser.email?.split('@')[0] || 'User',
      email: apiUser.email,
      role: roleCode,
      organizationId: membershipOrgId,
      subOrganizationId:
        apiUser.subOrganizationId || primaryMembership?.subOrganizationId || undefined,
      accessibleBranchIds: apiUser.accessibleBranchIds || [],
      department: apiUser.isPlatformAdmin
        ? 'Platform Management'
        : roleCode === 'ORG_ADMIN'
        ? 'Enterprise Management'
        : roleCode === 'SUB_ORG_ADMIN'
        ? 'Company Administration'
        : roleCode === 'BRANCH_ADMIN'
        ? 'Branch Operations'
        : 'Administration',
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      active: apiUser.active ?? true,
      status: apiUser.active === false ? 'Inactive' : 'Active',
      joinedDate: apiUser.emailVerifiedAt ? new Date(apiUser.emailVerifiedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      title: getRoleTitle(roleCode),
      assignedProducts: ['PROD_1', 'PROD_2'],
      performanceMetrics: {
        leadsHandled: 0,
        tasksCompleted: 0,
        contentCreated: 0,
      },
      organization: organization
        ? {
            id: organization.id || membershipOrgId || '',
            name: organization.name || '',
            organizationType: orgType,
            organizationTypeName: orgTypeName,
          }
        : undefined,
      organizationType: orgType,
      organizationTypeName: orgTypeName,
      memberships: apiUser.memberships,
    };
  }

  /** Message to show when the user's organization / sub-organization is Inactive or Suspend(ed); null when allowed. */
  private getBlockedAccountReason(apiUser: any): string | null {
    const isBlocked = (s: unknown) => /^(inactive|suspend|suspended)$/i.test(String(s ?? '').trim());
    const candidates: Array<{ kind: string; status: unknown }> = [
      { kind: 'organization', status: apiUser?.organization?.status ?? apiUser?.organizationStatus },
      { kind: 'sub-organization', status: apiUser?.subOrganization?.status ?? apiUser?.subOrganizationStatus },
    ];
    for (const m of apiUser?.memberships || []) {
      candidates.push({ kind: 'organization', status: m?.organization?.status });
      candidates.push({ kind: 'sub-organization', status: m?.subOrganization?.status });
    }
    const hit = candidates.find((c) => isBlocked(c.status));
    if (!hit) return null;
    return `Your ${hit.kind} is ${String(hit.status).toLowerCase().startsWith('suspend') ? 'suspended' : 'inactive'}. Please contact your administrator.`;
  }

  // Auth: Delegated to centralized src/api/auth/authApi.ts
  async login(email: string, password?: string): Promise<{ success: boolean; token: string; user: User }> {
    const data = await authApi.login({ email, password });
    const token =
      data?.accessToken ||
      data?.data?.token ||
      data?.data?.accessToken ||
      (data as any)?.token;
    const userObj = data?.user || data?.data?.user;

    if (token && userObj) {
      // An inactive / suspended organization or sub-organization must not get a session: every API call would fail.
      const blocked = this.getBlockedAccountReason(userObj);
      if (blocked) {
        this.removeToken();
        try { await authApi.logout(); } catch { /* the session may not exist */ }
        throw new Error(blocked);
      }
      // The previous login's organization scope must not leak into this one (set before the user is mapped,
      // because mapping stores this login's own organization).
      this.clearOrganizationScope();
      const appUser = this.mapApiUserToAppUser(userObj);
      // A new session must never see another user's or organisation's cached responses.
      clearApiCache();
      this.setToken(token);
      this.setUserId(appUser.id);
      localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(appUser));
      return {
        success: true,
        token: token,
        user: appUser,
      };
    }
    throw new Error('Invalid response from login API');
  }

  async refreshToken(): Promise<{ success: boolean; token: string; user: User }> {
    const data = await authApi.refreshToken();
    const token =
      data?.accessToken ||
      data?.data?.token ||
      data?.data?.accessToken ||
      (data as any)?.token;
    const userObj = data?.user || data?.data?.user;

    if (token) {
      const appUser = userObj ? this.mapApiUserToAppUser(userObj) : (this.getUser() as User);
      this.setToken(token);
      if (appUser?.id) this.setUserId(appUser.id);
      if (appUser) localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(appUser));
      return {
        success: true,
        token: token,
        user: appUser,
      };
    }
    throw new Error('Failed to rotate session');
  }

  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } finally {
      this.removeToken();
    }
  }

  async logoutAll(): Promise<void> {
    try {
      await authApi.logoutAll();
    } finally {
      this.removeToken();
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return authApi.forgotPassword({ email });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await authApi.resetPassword({ token, password });
  }

  async verifyToken(): Promise<{ valid: boolean; userId: string }> {
    return authApi.verifyToken();
  }

  async getCurrentUser(): Promise<User> {
    try {
      const data = await authApi.getCurrentUser();
      const userObj = data?.user || (data as any)?.data?.user || (data as any);
      if (userObj && (userObj.id || userObj.email)) {
        const appUser = this.mapApiUserToAppUser(userObj);
        if (appUser?.id) this.setUserId(appUser.id);
        localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(appUser));
        return appUser;
      }
    } catch {
      // Fall through to cached user
    }

    const cached = this.getUser();
    if (cached) return cached;
    throw new Error('Could not retrieve current user profile');
  }

  async requestEmailVerification(): Promise<{ message: string }> {
    return authApi.requestEmailVerification();
  }

  async verifyEmail(token: string): Promise<void> {
    await authApi.verifyEmail(token);
  }

  async getUsers(): Promise<User[]> {
    const cached = this.getUser();
    return cached ? [cached] : [];
  }

  async switchUser(userId: string): Promise<{ success: boolean; token: string; user: User }> {
    this.setUserId(userId);
    const user = this.getUser();
    const token = this.getToken() || '';
    return { success: true, token, user: user || ({} as User) };
  }

  // Products (targets remote backend https://api.dev.crm.yaacreations.com)
  async getProducts(): Promise<Product[]> {
    const res = await baseClient.get<any>('/products', { params: { limit: 100 } });
    return res.data?.data || [];
  }

  async getProduct(id: string): Promise<any> {
    const res = await baseClient.get<any>(`/products/${id}`);
    return res.data;
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    const res = await baseClient.post<any>('/products', data);
    return res.data?.data || res.data;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const res = await baseClient.put<any>(`/products/${id}`, data);
    return res.data?.data || res.data;
  }

  async deleteProduct(id: string): Promise<any> {
    const res = await baseClient.delete(`/products/${id}`);
    return res.data;
  }

  // Branches (targets remote backend https://api.dev.crm.yaacreations.com)
  async getBranches(productId?: string): Promise<Branch[]> {
    const res = await baseClient.get<any>('/branches', {
      params: { pagination_required: 'false', page_size: 100, ...(productId ? { productId } : {}) },
    });
    return res.data?.data || [];
  }

  async createBranch(data: Partial<Branch>): Promise<Branch> {
    const res = await baseClient.post<any>('/branches', data);
    return res.data?.data || res.data;
  }

  async updateBranch(id: string, data: Partial<Branch>): Promise<Branch> {
    const res = await baseClient.put<any>(`/branches/${id}`, data);
    return res.data?.data || res.data;
  }

  async deleteBranch(id: string): Promise<any> {
    const res = await baseClient.delete(`/branches/${id}`);
    return res.data;
  }

  async createProductPlan(productId: string, plan: Partial<ProductPlan>): Promise<{ product: Product; plan: ProductPlan }> {
    const res = await baseClient.post<any>(`/products/${productId}/plans`, plan);
    return res.data;
  }

  async updateProductPlan(productId: string, planId: string, plan: Partial<ProductPlan>): Promise<{ product: Product; plan: ProductPlan }> {
    const res = await baseClient.put<any>(`/products/${productId}/plans/${planId}`, plan);
    return res.data;
  }

  async deleteProductPlan(productId: string, planId: string): Promise<{ product: Product; deletedPlan: ProductPlan }> {
    const res = await baseClient.delete<any>(`/products/${productId}/plans/${planId}`);
    return res.data;
  }

  async uploadProductDocument(id: string, doc: { title: string; fileType: string; fileSize?: string; category: string }): Promise<any> {
    const res = await baseClient.post<any>(`/products/${id}/documents`, doc);
    return res.data;
  }

  // Digital Marketing
  async getMarketingOverview(): Promise<any> {
    const res = await baseClient.get<any>('/marketing/overview').catch(() => ({ data: {} }));
    return res.data?.data || res.data;
  }

  async getMarketingPlans(): Promise<DigitalMarketingPlan[]> {
    const res = await baseClient.get<any>('/marketing/plans').catch(() => ({ data: [] }));
    return res.data?.data || [];
  }

  async updateMarketingPlan(id: string, data: Partial<DigitalMarketingPlan>): Promise<DigitalMarketingPlan> {
    const res = await baseClient.put<any>(`/marketing/plans/${id}`, data);
    return res.data?.data || res.data;
  }

  async onboardMarketingClient(data: any): Promise<any> {
    const res = await baseClient.post<any>('/marketing/onboarding', data);
    return res.data?.data || res.data;
  }

  // Leads
  async getLeads(): Promise<Lead[]> {
    const res = await baseClient.get<any>('/platform/leads', {
      params: { limit: 100 },
    });
    const items = res.data?.data || [];
    return items.map((item: any) => ({
      id: item.id,
      leadId: item.leadCode || item.id,
      name: item.name || '',
      company: item.company || '',
      phone: item.phone || '',
      whatsapp: item.whatsapp || item.phone || '',
      email: item.email || '',
      location: item.location || '',
      source: item.source || 'Website',
      leadSource: item.source || 'Website',
      interestedProductOrService: item.planInterest || 'Standard',
      assignedStaffId: item.assignedTo || '',
      assignedStaffName: item.assignedTo || 'Unassigned',
      status: item.status || 'New',
      priority: item.priority || 'Medium',
      interest: item.priority || 'Medium',
      feedback: item.notes || '',
      nextFollowUpDate: item.followUpDate || '',
      notes: item.notes || '',
      createdAt: item.createdAt || '',
    }));
  }

  async createLead(data: Partial<Lead>): Promise<any> {
    const payload: CreatePlatformLeadRequest = {
      name: data.name || '',
      company: data.company || '',
      email: data.email || '',
      phone: data.phone || '',
      whatsapp: data.whatsapp || data.phone || '',
      source: data.leadSource || 'Website',
      status: data.status || 'New',
      priority: data.priority || 'Medium',
      planInterest: data.interestedProductOrService || 'Standard',
      location: data.location || '',
      notes: data.notes || data.requirements || '',
    };
    const res = await baseClient.post('/platform/leads', payload);
    return res.data;
  }

  async updateLead(id: string, data: Partial<Lead>): Promise<any> {
    const payload: UpdatePlatformLeadRequest = {};
    if (data.name) payload.name = data.name;
    if (data.company) payload.company = data.company;
    if (data.email) payload.email = data.email;
    if (data.phone) payload.phone = data.phone;
    if (data.status) payload.status = data.status;
    if (data.priority) payload.priority = data.priority;
    if (data.nextFollowUpDate) payload.followUpDate = data.nextFollowUpDate;
    if (data.feedback || data.notes) payload.notes = data.notes || data.feedback;
    const res = await baseClient.put(`/platform/leads/${id}`, payload);
    return res.data;
  }

  async addLeadFollowUp(id: string, followUp: { type: string; notes: string; outcome: string; nextActionDate?: string }): Promise<any> {
    try {
      const res = await baseClient.patch(`/platform/leads/${id}`, {
        followUpDate: followUp.nextActionDate ? new Date(followUp.nextActionDate).toISOString() : undefined,
        notes: `[${followUp.type}] ${followUp.outcome || ''} - ${followUp.notes || ''}`.trim(),
      });
      return res.data;
    } catch (e) {
      return { success: true };
    }
  }

  async convertLead(id: string, data: any = {}): Promise<any> {
    const res = await baseClient.post(`/platform/leads/${id}/convert`, data);
    return res.data;
  }

  async deleteLead(id: string): Promise<any> {
    const res = await baseClient.delete(`/platform/leads/${id}`);
    return res.data;
  }

  // Customers
  // Customers (targets remote backend https://api.dev.crm.yaacreations.com)
  async getCustomers(): Promise<Customer[]> {
    const res = await baseClient.get<any>('/platform/clients', { params: { limit: 100 } });
    return res.data?.data || [];
  }

  async getCustomer(id: string): Promise<any> {
    const res = await baseClient.get<any>(`/platform/clients/${id}`);
    return res.data?.data || res.data;
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const res = await baseClient.post<any>('/platform/clients', data);
    return res.data?.data || res.data;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const res = await baseClient.patch<any>(`/platform/clients/${id}`, data);
    return res.data?.data || res.data;
  }

  async linkProductToCustomer(id: string, data: { productId: string; planName?: string; amount?: number }): Promise<Customer> {
    const res = await baseClient.post<any>(`/platform/clients/${id}/link-product`, data);
    return res.data?.data || res.data;
  }

  async deleteCustomer(id: string): Promise<any> {
    const res = await baseClient.delete(`/platform/clients/${id}`);
    return res.data;
  }

  // Content (Local storage backed, since remote backend does not host /platform/content)
  async getContent(): Promise<ContentItem[]> {
    try {
      const raw = localStorage.getItem('crm_platform_content');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async createContent(data: Partial<ContentItem>): Promise<ContentItem> {
    try {
      const raw = localStorage.getItem('crm_platform_content');
      const items: ContentItem[] = raw ? JSON.parse(raw) : [];
      const newItem: ContentItem = {
        id: `cnt_${Date.now()}`,
        title: data.title || '',
        clientName: data.clientName || '',
        contentType: data.contentType || 'Reel',
        platform: data.platform || 'Instagram',
        status: data.status || 'Draft',
        approvalStatus: data.approvalStatus || 'Pending Upload',
        scheduledDate: data.scheduledDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        ...data,
      } as ContentItem;
      items.unshift(newItem);
      localStorage.setItem('crm_platform_content', JSON.stringify(items));
      return newItem;
    } catch {
      return data as ContentItem;
    }
  }

  async updateContent(id: string, data: Partial<ContentItem>): Promise<ContentItem> {
    try {
      const raw = localStorage.getItem('crm_platform_content');
      const items: ContentItem[] = raw ? JSON.parse(raw) : [];
      const idx = items.findIndex((it) => it.id === id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...data };
        localStorage.setItem('crm_platform_content', JSON.stringify(items));
        return items[idx];
      }
    } catch {}
    return { id, ...data } as ContentItem;
  }

  async deleteContent(id: string): Promise<any> {
    try {
      const raw = localStorage.getItem('crm_platform_content');
      const items: ContentItem[] = raw ? JSON.parse(raw) : [];
      const filtered = items.filter((it) => it.id !== id);
      localStorage.setItem('crm_platform_content', JSON.stringify(filtered));
    } catch {}
    return { success: true };
  }

  // Tasks (Local storage backed, since remote backend does not host /platform/tasks)
  async getTasks(): Promise<TaskItem[]> {
    try {
      const raw = localStorage.getItem('crm_platform_tasks');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async getTodayWork(): Promise<{ today: string; tasks: TaskItem[]; followUps: Lead[] }> {
    const today = new Date().toISOString().split('T')[0];
    try {
      const raw = localStorage.getItem('crm_platform_tasks');
      const tasks: TaskItem[] = raw ? JSON.parse(raw) : [];
      const todayTasks = tasks.filter((t) => t.dueDate === today);
      return { today, tasks: todayTasks, followUps: [] };
    } catch {
      return { today, tasks: [], followUps: [] };
    }
  }

  async createTask(data: Partial<TaskItem>): Promise<TaskItem> {
    try {
      const raw = localStorage.getItem('crm_platform_tasks');
      const tasks: TaskItem[] = raw ? JSON.parse(raw) : [];
      const newTask: TaskItem = {
        id: `task_${Date.now()}`,
        title: data.title || '',
        description: data.description || '',
        targetType: data.targetType || 'Product',
        targetId: data.targetId || '',
        targetName: data.targetName || '',
        clientId: data.clientId || '',
        clientName: data.clientName || '',
        assignedStaffId: data.assignedStaffId || '',
        dueDate: data.dueDate || new Date().toISOString().split('T')[0],
        priority: data.priority || 'Medium',
        status: data.status || 'Pending',
        notes: data.notes || '',
        createdAt: new Date().toISOString(),
      } as TaskItem;
      tasks.unshift(newTask);
      localStorage.setItem('crm_platform_tasks', JSON.stringify(tasks));
      return newTask;
    } catch {
      return data as TaskItem;
    }
  }

  async updateTask(id: string, data: Partial<TaskItem>): Promise<TaskItem> {
    try {
      const raw = localStorage.getItem('crm_platform_tasks');
      const tasks: TaskItem[] = raw ? JSON.parse(raw) : [];
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx !== -1) {
        tasks[idx] = { ...tasks[idx], ...data };
        localStorage.setItem('crm_platform_tasks', JSON.stringify(tasks));
        return tasks[idx];
      }
    } catch {}
    return { id, ...data } as TaskItem;
  }

  async deleteTask(id: string): Promise<any> {
    try {
      const raw = localStorage.getItem('crm_platform_tasks');
      const tasks: TaskItem[] = raw ? JSON.parse(raw) : [];
      const filtered = tasks.filter((t) => t.id !== id);
      localStorage.setItem('crm_platform_tasks', JSON.stringify(filtered));
    } catch {}
    return { success: true };
  }

  // Payments (targets remote backend https://api.dev.crm.yaacreations.com)
  async getPayments(): Promise<PaymentItem[]> {
    const res = await baseClient.get<any>('/platform/payments', { params: { limit: 100 } });
    return res.data?.data || [];
  }

  async createPayment(data: Partial<PaymentItem>): Promise<PaymentItem> {
    const res = await baseClient.post<any>('/platform/payments', data);
    return res.data?.data || res.data;
  }

  async updatePayment(id: string, data: Partial<PaymentItem>): Promise<PaymentItem> {
    const res = await baseClient.patch<any>(`/platform/payments/${id}`, data);
    return res.data?.data || res.data;
  }

  async deletePayment(id: string): Promise<any> {
    const res = await baseClient.delete(`/platform/payments/${id}`);
    return res.data;
  }

  // Subscriptions (targets remote backend https://api.dev.crm.yaacreations.com)
  async getSubscriptions(): Promise<SubscriptionItem[]> {
    const res = await baseClient.get<any>('/subscriptions', { params: { limit: 100 } });
    return res.data?.data || [];
  }

  async createSubscription(data: Partial<SubscriptionItem>): Promise<SubscriptionItem> {
    const res = await baseClient.post<any>('/subscriptions', data);
    return res.data?.data || res.data;
  }

  async updateSubscription(id: string, data: Partial<SubscriptionItem>): Promise<SubscriptionItem> {
    const res = await baseClient.patch<any>(`/subscriptions/${id}`, data);
    return res.data?.data || res.data;
  }

  async deleteSubscription(id: string): Promise<any> {
    const res = await baseClient.delete(`/subscriptions/${id}`);
    return res.data;
  }

  // Employees (targets remote backend https://api.dev.crm.yaacreations.com)
  async getEmployees(): Promise<any[]> {
    const res = await baseClient.get<any>('/auth/users', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } }));
    return res.data?.data || [];
  }

  async createEmployee(data: Partial<User>): Promise<User> {
    const res = await baseClient.post<any>('/auth/users', data);
    return res.data?.data || res.data;
  }

  async updateEmployee(id: string, data: Partial<User>): Promise<User> {
    const res = await baseClient.patch<any>(`/auth/users/${id}`, data);
    return res.data?.data || res.data;
  }

  async deleteEmployee(id: string): Promise<any> {
    const res = await baseClient.delete(`/auth/users/${id}`);
    return res.data;
  }

  // Activities (targets remote backend https://api.dev.crm.yaacreations.com)
  async getActivities(): Promise<ActivityLog[]> {
    const res = await baseClient.get<any>('/platform/activities').catch(() => ({ data: { data: [] } }));
    return res.data?.data || [];
  }

  // Reports (targets remote backend https://api.dev.crm.yaacreations.com)
  async getReports(): Promise<any> {
    const res = await baseClient.get<any>('/commerce/sales/dashboard/modules').catch(() => ({ data: {} }));
    return res.data?.data || res.data;
  }

  // Settings (targets remote backend https://api.dev.crm.yaacreations.com)
  async getSettings(): Promise<CompanySettings> {
    const res = await baseClient.get<any>('/settings').catch(() => ({ data: {} }));
    return res.data?.data || ({} as CompanySettings);
  }

  async updateSettings(data: Partial<CompanySettings>): Promise<CompanySettings> {
    const res = await baseClient.put<any>('/settings', data);
    return res.data?.data || res.data;
  }
}

export const api = new ApiService();
