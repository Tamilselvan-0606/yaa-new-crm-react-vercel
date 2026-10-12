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

import { executeTokenRefresh } from '../api/baseApi';

export { authApi };
export type { ApiUser, ApiLoginResponse };

// Create Axios Instance for CRM business operations
export const axiosClient: AxiosInstance = axios.create({
  baseURL: '',
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
    const originalRequest = error.config;
    const is401 = error.response?.status === 401;

    // Silent Token Refresh on 401
    if (is401 && originalRequest && !originalRequest._retry) {
      if (
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/login')
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const newToken = await executeTokenRefresh();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosClient(originalRequest);
      }
    }

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

  removeToken() {
    removeStoredToken();
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
      const appUser = this.mapApiUserToAppUser(userObj);
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
    try {
      const res = await axiosClient.get<User[]>('/api/auth/users');
      return res.data || [];
    } catch {
      return [];
    }
  }

  async switchUser(userId: string): Promise<{ success: boolean; token: string; user: User }> {
    this.setUserId(userId);
    const res = await axiosClient.post<{ success: boolean; token: string; user: User }>('/api/auth/switch-user', { userId });
    if (res.data.token) {
      this.setToken(res.data.token);
    }
    return res.data;
  }

  // Dashboard
  async getDashboardStats(): Promise<any> {
    const res = await axiosClient.get('/api/dashboard/stats');
    return res.data;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    const res = await axiosClient.get<Product[]>('/api/products');
    return res.data;
  }

  async getProduct(id: string): Promise<any> {
    const res = await axiosClient.get(`/api/products/${id}`);
    return res.data;
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    const res = await axiosClient.post<Product>('/api/products', data);
    return res.data;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const res = await axiosClient.put<Product>(`/api/products/${id}`, data);
    return res.data;
  }

  async deleteProduct(id: string): Promise<any> {
    const res = await axiosClient.delete(`/api/products/${id}`);
    return res.data;
  }

  // Branches
  async getBranches(productId?: string): Promise<Branch[]> {
    const url = productId ? `/api/branches?productId=${encodeURIComponent(productId)}` : '/api/branches';
    const res = await axiosClient.get<Branch[]>(url);
    return res.data;
  }

  async createBranch(data: Partial<Branch>): Promise<Branch> {
    const res = await axiosClient.post<Branch>('/api/branches', data);
    return res.data;
  }

  async updateBranch(id: string, data: Partial<Branch>): Promise<Branch> {
    const res = await axiosClient.put<Branch>(`/api/branches/${id}`, data);
    return res.data;
  }

  async deleteBranch(id: string): Promise<any> {
    const res = await axiosClient.delete(`/api/branches/${id}`);
    return res.data;
  }

  async createProductPlan(productId: string, plan: Partial<ProductPlan>): Promise<{ product: Product; plan: ProductPlan }> {
    const res = await axiosClient.post<{ product: Product; plan: ProductPlan }>(`/api/products/${productId}/plans`, plan);
    return res.data;
  }

  async updateProductPlan(productId: string, planId: string, plan: Partial<ProductPlan>): Promise<{ product: Product; plan: ProductPlan }> {
    const res = await axiosClient.put<{ product: Product; plan: ProductPlan }>(`/api/products/${productId}/plans/${planId}`, plan);
    return res.data;
  }

  async deleteProductPlan(productId: string, planId: string): Promise<{ product: Product; deletedPlan: ProductPlan }> {
    const res = await axiosClient.delete<{ product: Product; deletedPlan: ProductPlan }>(`/api/products/${productId}/plans/${planId}`);
    return res.data;
  }

  async uploadProductDocument(id: string, doc: { title: string; fileType: string; fileSize?: string; category: string }): Promise<any> {
    const res = await axiosClient.post(`/api/products/${id}/documents`, doc);
    return res.data;
  }

  // Digital Marketing
  async getMarketingOverview(): Promise<any> {
    const res = await axiosClient.get('/api/marketing/overview');
    return res.data;
  }

  async getMarketingPlans(): Promise<DigitalMarketingPlan[]> {
    const res = await axiosClient.get<DigitalMarketingPlan[]>('/api/marketing/plans');
    return res.data;
  }

  async updateMarketingPlan(id: string, data: Partial<DigitalMarketingPlan>): Promise<DigitalMarketingPlan> {
    const res = await axiosClient.put<DigitalMarketingPlan>(`/api/marketing/plans/${id}`, data);
    return res.data;
  }

  async onboardMarketingClient(data: any): Promise<any> {
    const res = await axiosClient.post('/api/marketing/onboarding', data);
    return res.data;
  }

  // Leads
  async getLeads(): Promise<Lead[]> {
    const res = await axiosClient.get<Lead[]>('/api/leads');
    return res.data;
  }

  async createLead(data: Partial<Lead>): Promise<Lead> {
    const res = await axiosClient.post<Lead>('/api/leads', data);
    return res.data;
  }

  async updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
    const res = await axiosClient.put<Lead>(`/api/leads/${id}`, data);
    return res.data;
  }

  async addLeadFollowUp(id: string, followUp: { type: string; notes: string; outcome: string; nextActionDate?: string }): Promise<any> {
    const res = await axiosClient.post(`/api/leads/${id}/followups`, followUp);
    return res.data;
  }

  async convertLead(id: string, data: { industry?: string; planName?: string; amount?: number } = {}): Promise<any> {
    const res = await axiosClient.post(`/api/leads/${id}/convert`, data);
    return res.data;
  }

  async deleteLead(id: string): Promise<any> {
    const res = await axiosClient.delete(`/api/leads/${id}`);
    return res.data;
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const res = await axiosClient.get<Customer[]>('/api/customers');
    return res.data;
  }

  async getCustomer(id: string): Promise<any> {
    const res = await axiosClient.get(`/api/customers/${id}`);
    return res.data;
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const res = await axiosClient.post<Customer>('/api/customers', data);
    return res.data;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const res = await axiosClient.put<Customer>(`/api/customers/${id}`, data);
    return res.data;
  }

  async linkProductToCustomer(id: string, data: { productId: string; planName?: string; amount?: number }): Promise<Customer> {
    const res = await axiosClient.post<Customer>(`/api/customers/${id}/link-product`, data);
    return res.data;
  }

  async deleteCustomer(id: string): Promise<any> {
    const res = await axiosClient.delete(`/api/customers/${id}`);
    return res.data;
  }

  // Content
  async getContent(): Promise<ContentItem[]> {
    const res = await axiosClient.get<ContentItem[]>('/api/content');
    return res.data;
  }

  async createContent(data: Partial<ContentItem>): Promise<ContentItem> {
    const res = await axiosClient.post<ContentItem>('/api/content', data);
    return res.data;
  }

  async updateContent(id: string, data: Partial<ContentItem>): Promise<ContentItem> {
    const res = await axiosClient.put<ContentItem>(`/api/content/${id}`, data);
    return res.data;
  }

  async deleteContent(id: string): Promise<any> {
    const res = await axiosClient.delete(`/api/content/${id}`);
    return res.data;
  }

  // Tasks
  async getTasks(): Promise<TaskItem[]> {
    const res = await axiosClient.get<TaskItem[]>('/api/tasks');
    return res.data;
  }

  async getTodayWork(): Promise<{ today: string; tasks: TaskItem[]; followUps: Lead[] }> {
    const res = await axiosClient.get('/api/tasks/today');
    return res.data;
  }

  async createTask(data: Partial<TaskItem>): Promise<TaskItem> {
    const res = await axiosClient.post<TaskItem>('/api/tasks', data);
    return res.data;
  }

  async updateTask(id: string, data: Partial<TaskItem>): Promise<TaskItem> {
    const res = await axiosClient.put<TaskItem>(`/api/tasks/${id}`, data);
    return res.data;
  }

  async deleteTask(id: string): Promise<any> {
    const res = await axiosClient.delete(`/api/tasks/${id}`);
    return res.data;
  }

  // Payments
  async getPayments(): Promise<PaymentItem[]> {
    const res = await axiosClient.get<PaymentItem[]>('/api/payments');
    return res.data;
  }

  async createPayment(data: Partial<PaymentItem>): Promise<PaymentItem> {
    const res = await axiosClient.post<PaymentItem>('/api/payments', data);
    return res.data;
  }

  async updatePayment(id: string, data: Partial<PaymentItem>): Promise<PaymentItem> {
    const res = await axiosClient.put<PaymentItem>(`/api/payments/${id}`, data);
    return res.data;
  }

  async deletePayment(id: string): Promise<any> {
    const res = await axiosClient.delete(`/api/payments/${id}`);
    return res.data;
  }

  // Subscriptions
  async getSubscriptions(): Promise<SubscriptionItem[]> {
    const res = await axiosClient.get<SubscriptionItem[]>('/api/subscriptions');
    return res.data;
  }

  async createSubscription(data: Partial<SubscriptionItem>): Promise<SubscriptionItem> {
    const res = await axiosClient.post<SubscriptionItem>('/api/subscriptions', data);
    return res.data;
  }

  async updateSubscription(id: string, data: Partial<SubscriptionItem>): Promise<SubscriptionItem> {
    const res = await axiosClient.put<SubscriptionItem>(`/api/subscriptions/${id}`, data);
    return res.data;
  }

  async deleteSubscription(id: string): Promise<any> {
    const res = await axiosClient.delete(`/api/subscriptions/${id}`);
    return res.data;
  }

  // Reminders
  async getReminders(): Promise<ReminderItem[]> {
    const res = await axiosClient.get<ReminderItem[]>('/api/reminders');
    return res.data;
  }

  async createReminder(data: Partial<ReminderItem>): Promise<ReminderItem> {
    const res = await axiosClient.post<ReminderItem>('/api/reminders', data);
    return res.data;
  }

  async updateReminder(id: string, data: Partial<ReminderItem>): Promise<ReminderItem> {
    const res = await axiosClient.put<ReminderItem>(`/api/reminders/${id}`, data);
    return res.data;
  }

  async markAllRemindersRead(): Promise<any> {
    const res = await axiosClient.post('/api/reminders/mark-all-read');
    return res.data;
  }

  // Employees (Admin)
  async getEmployees(): Promise<any[]> {
    const res = await axiosClient.get<any[]>('/api/employees');
    return res.data;
  }

  async createEmployee(data: Partial<User>): Promise<User> {
    const res = await axiosClient.post<User>('/api/employees', data);
    return res.data;
  }

  async updateEmployee(id: string, data: Partial<User>): Promise<User> {
    const res = await axiosClient.put<User>(`/api/employees/${id}`, data);
    return res.data;
  }

  async deleteEmployee(id: string): Promise<any> {
    const res = await axiosClient.delete(`/api/employees/${id}`);
    return res.data;
  }

  // Activities
  async getActivities(): Promise<ActivityLog[]> {
    const res = await axiosClient.get<ActivityLog[]>('/api/activities');
    return res.data;
  }

  // Reports
  async getReports(): Promise<any> {
    const res = await axiosClient.get('/api/reports');
    return res.data;
  }

  // Settings
  async getSettings(): Promise<CompanySettings> {
    const res = await axiosClient.get<CompanySettings>('/api/settings');
    return res.data;
  }

  async updateSettings(data: Partial<CompanySettings>): Promise<CompanySettings> {
    const res = await axiosClient.put<CompanySettings>('/api/settings', data);
    return res.data;
  }
}

export const api = new ApiService();
