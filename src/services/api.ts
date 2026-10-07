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
} from '../api/config';
import { authApi } from '../api/auth/authApi';
import { ApiUser, ApiLoginResponse } from '../api/auth/authTypes';

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
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format error messages
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
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

  decodeToken(token: string): JwtPayload | null {
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  // Format backend API user to application User interface
  private mapApiUserToAppUser(apiUser: ApiUser): User {
    const roleCode =
      typeof apiUser.role === 'object' && apiUser.role?.code
        ? apiUser.role.code
        : typeof apiUser.role === 'string'
        ? apiUser.role
        : apiUser.isPlatformAdmin
        ? 'SUPER_ADMIN'
        : 'ADMIN';

    return {
      id: apiUser.id,
      name: apiUser.name || apiUser.email?.split('@')[0] || 'Platform Administrator',
      email: apiUser.email,
      role: roleCode as Role,
      department: apiUser.isPlatformAdmin ? 'Platform Management' : 'Administration',
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      active: apiUser.active ?? true,
      status: apiUser.active === false ? 'Inactive' : 'Active',
      joinedDate: apiUser.emailVerifiedAt ? new Date(apiUser.emailVerifiedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      title: apiUser.isPlatformAdmin ? 'Platform Administrator' : 'Administrator',
      assignedProducts: ['PROD_1', 'PROD_2'],
      performanceMetrics: {
        leadsHandled: 0,
        tasksCompleted: 0,
        contentCreated: 0,
      },
    };
  }

  // Auth: Delegated to centralized src/api/auth/authApi.ts
  async login(email: string, password?: string): Promise<{ success: boolean; token: string; user: User }> {
    const data = await authApi.login({ email, password });
    if (data && data.accessToken) {
      const appUser = this.mapApiUserToAppUser(data.user);
      this.setToken(data.accessToken);
      this.setUserId(appUser.id);
      localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(appUser));
      return {
        success: true,
        token: data.accessToken,
        user: appUser,
      };
    }
    throw new Error('Invalid response from login API');
  }

  async refreshToken(): Promise<{ success: boolean; token: string; user: User }> {
    const data = await authApi.refreshToken();
    if (data && data.accessToken) {
      const appUser = this.mapApiUserToAppUser(data.user);
      this.setToken(data.accessToken);
      this.setUserId(appUser.id);
      localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(appUser));
      return {
        success: true,
        token: data.accessToken,
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
    const data = await authApi.getCurrentUser();
    if (data && data.user) {
      const appUser = this.mapApiUserToAppUser(data.user);
      this.setUserId(appUser.id);
      localStorage.setItem(USER_CACHE_STORAGE_KEY, JSON.stringify(appUser));
      return appUser;
    }
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
