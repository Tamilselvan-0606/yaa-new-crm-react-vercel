import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Lead, Customer, TaskItem, ContentItem, PaymentItem, SubscriptionItem, Product, DigitalMarketingPlan } from '../types';
import { toast } from 'sonner';

export const QUERY_KEYS = {
  dashboardStats: ['dashboard-stats'] as const,
  leads: ['leads'] as const,
  customers: ['customers'] as const,
  customerDetail: (id: string) => ['customers', id] as const,
  products: ['products'] as const,
  productDetail: (id: string) => ['products', id] as const,
  marketingOverview: ['marketing-overview'] as const,
  marketingPlans: ['marketing-plans'] as const,
  tasks: ['tasks'] as const,
  todayWork: ['today-work'] as const,
  content: ['content'] as const,
  payments: ['payments'] as const,
  subscriptions: ['subscriptions'] as const,
  reminders: ['reminders'] as const,
  employees: ['employees'] as const,
  activities: ['activities'] as const,
  reports: ['reports'] as const,
  settings: ['settings'] as const,
};

// ==========================================
// QUERIES
// ==========================================

export function useDashboardStats() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboardStats,
    queryFn: () => api.getDashboardStats(),
    staleTime: 30000,
  });
}

export function useLeads() {
  return useQuery({
    queryKey: QUERY_KEYS.leads,
    queryFn: () => api.getLeads(),
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: QUERY_KEYS.customers,
    queryFn: () => api.getCustomers(),
  });
}

export function useCustomerDetail(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.customerDetail(id),
    queryFn: () => api.getCustomer(id),
    enabled: !!id,
  });
}

export function useProducts() {
  return useQuery({
    queryKey: QUERY_KEYS.products,
    queryFn: () => api.getProducts(),
  });
}

export function useProductDetail(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.productDetail(id),
    queryFn: () => api.getProduct(id),
    enabled: !!id,
  });
}

export function useMarketingOverview() {
  return useQuery({
    queryKey: QUERY_KEYS.marketingOverview,
    queryFn: () => api.getMarketingOverview(),
  });
}

export function useTasks() {
  return useQuery({
    queryKey: QUERY_KEYS.tasks,
    queryFn: () => api.getTasks(),
  });
}

export function useTodayWork() {
  return useQuery({
    queryKey: QUERY_KEYS.todayWork,
    queryFn: () => api.getTodayWork(),
  });
}

export function useContent() {
  return useQuery({
    queryKey: QUERY_KEYS.content,
    queryFn: () => api.getContent(),
  });
}

export function usePayments() {
  return useQuery({
    queryKey: QUERY_KEYS.payments,
    queryFn: () => api.getPayments(),
  });
}

export function useSubscriptions() {
  return useQuery({
    queryKey: QUERY_KEYS.subscriptions,
    queryFn: () => api.getSubscriptions(),
  });
}

export function useReminders() {
  return useQuery({
    queryKey: QUERY_KEYS.reminders,
    queryFn: () => api.getReminders(),
  });
}

export function useEmployees() {
  return useQuery({
    queryKey: QUERY_KEYS.employees,
    queryFn: () => api.getEmployees(),
  });
}

export function useActivities() {
  return useQuery({
    queryKey: QUERY_KEYS.activities,
    queryFn: () => api.getActivities(),
  });
}

export function useReports() {
  return useQuery({
    queryKey: QUERY_KEYS.reports,
    queryFn: () => api.getReports(),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: QUERY_KEYS.settings,
    queryFn: () => api.getSettings(),
  });
}

// ==========================================
// MUTATIONS
// ==========================================

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Lead>) => api.createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leads });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reminders });
      toast.success('Lead created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create lead', { description: error.message });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) => api.updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leads });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      toast.success('Lead updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update lead', { description: error.message });
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.convertLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leads });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      toast.success('Lead converted to Customer successfully');
    },
    onError: (error: any) => {
      toast.error('Lead conversion failed', { description: error.message });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TaskItem>) => api.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todayWork });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      toast.success('Task created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create task', { description: error.message });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskItem> }) => api.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todayWork });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
    },
    onError: (error: any) => {
      toast.error('Failed to update task', { description: error.message });
    },
  });
}

export function useCreateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ContentItem>) => api.createContent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.content });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.marketingOverview });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      toast.success('Content item created');
    },
    onError: (error: any) => {
      toast.error('Failed to create content', { description: error.message });
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PaymentItem>) => api.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      toast.success('Invoice & Payment record created');
    },
    onError: (error: any) => {
      toast.error('Failed to record payment', { description: error.message });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) => api.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      toast.success('Client updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update client', { description: error.message });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      toast.success('Client removed successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete client', { description: error.message });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leads });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      toast.success('Lead deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete lead', { description: error.message });
    },
  });
}

