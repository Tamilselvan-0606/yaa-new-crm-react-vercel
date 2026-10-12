import { toast } from 'sonner';
import { Lead, Customer, TaskItem, ContentItem, PaymentItem } from '../types';
import {
  useGetDashboardStatsQuery,
  useGetLeadsQuery,
  useGetTasksQuery,
  useGetTodayWorkQuery,
  useGetContentQuery,
  useGetPaymentsQuery,
  useGetSubscriptionsQuery,
  useGetRemindersQuery,
  useGetEmployeesQuery,
  useGetActivitiesQuery,
  useGetReportsQuery,
  useGetSettingsQuery,
  useGetMarketingOverviewQuery,
  useGetCrmProductsQuery,
  useGetCrmProductByIdQuery,
  useGetCrmCustomersQuery,
  useGetCrmCustomerByIdQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useConvertLeadMutation,
  useDeleteLeadMutation,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useCreateContentMutation,
  useCreatePaymentMutation,
  useUpdateCrmCustomerMutation,
  useDeleteCrmCustomerMutation,
} from '../api/crm/crmApi';

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
// QUERIES (RTK Query backed)
// ==========================================

export function useDashboardStats() {
  return useGetDashboardStatsQuery();
}

export function useLeads() {
  return useGetLeadsQuery();
}

export function useCustomers() {
  return useGetCrmCustomersQuery();
}

export function useCustomerDetail(id: string) {
  return useGetCrmCustomerByIdQuery(id, { skip: !id });
}

export function useProducts() {
  return useGetCrmProductsQuery();
}

export function useProductDetail(id: string) {
  return useGetCrmProductByIdQuery(id, { skip: !id });
}

export function useMarketingOverview() {
  return useGetMarketingOverviewQuery();
}

export function useTasks() {
  return useGetTasksQuery();
}

export function useTodayWork() {
  return useGetTodayWorkQuery();
}

export function useContent() {
  return useGetContentQuery();
}

export function usePayments() {
  return useGetPaymentsQuery();
}

export function useSubscriptions() {
  return useGetSubscriptionsQuery();
}

export function useReminders() {
  return useGetRemindersQuery();
}

export function useEmployees() {
  return useGetEmployeesQuery();
}

export function useActivities() {
  return useGetActivitiesQuery();
}

export function useReports() {
  return useGetReportsQuery();
}

export function useSettings() {
  return useGetSettingsQuery();
}

// ==========================================
// MUTATIONS (RTK Query backed with TanStack-compatible interface)
// ==========================================

function wrapMutation<TData, TVariables>(
  trigger: (arg: TVariables) => { unwrap: () => Promise<TData> },
  result: any,
  successMessage?: string,
  errorMessage: string = 'Operation failed'
) {
  return {
    ...result,
    isPending: result.isLoading,
    mutate: (data: TVariables) => {
      trigger(data)
        .unwrap()
        .then(() => {
          if (successMessage) toast.success(successMessage);
        })
        .catch((error: any) =>
          toast.error(errorMessage, {
            description: error?.data?.message || error?.message || 'Error occurred',
          })
        );
    },
    mutateAsync: async (data: TVariables) => {
      try {
        const res = await trigger(data).unwrap();
        if (successMessage) toast.success(successMessage);
        return res;
      } catch (error: any) {
        toast.error(errorMessage, {
          description: error?.data?.message || error?.message || 'Error occurred',
        });
        throw error;
      }
    },
  };
}

export function useCreateLead() {
  const [trigger, result] = useCreateLeadMutation();
  return wrapMutation(trigger, result, 'Lead created successfully', 'Failed to create lead');
}

export function useUpdateLead() {
  const [trigger, result] = useUpdateLeadMutation();
  return wrapMutation(trigger, result, 'Lead updated successfully', 'Failed to update lead');
}

export function useConvertLead() {
  const [trigger, result] = useConvertLeadMutation();
  return wrapMutation(trigger, result, 'Lead converted to Customer successfully', 'Lead conversion failed');
}

export function useCreateTask() {
  const [trigger, result] = useCreateTaskMutation();
  return wrapMutation(trigger, result, 'Task created successfully', 'Failed to create task');
}

export function useUpdateTask() {
  const [trigger, result] = useUpdateTaskMutation();
  return wrapMutation(trigger, result, undefined, 'Failed to update task');
}

export function useCreateContent() {
  const [trigger, result] = useCreateContentMutation();
  return wrapMutation(trigger, result, 'Content item created', 'Failed to create content');
}

export function useCreatePayment() {
  const [trigger, result] = useCreatePaymentMutation();
  return wrapMutation(trigger, result, 'Invoice & Payment record created', 'Failed to record payment');
}

export function useUpdateCustomer() {
  const [trigger, result] = useUpdateCrmCustomerMutation();
  return wrapMutation(trigger, result, 'Client updated successfully', 'Failed to update client');
}

export function useDeleteCustomer() {
  const [trigger, result] = useDeleteCrmCustomerMutation();
  return wrapMutation(trigger, result, 'Client removed successfully', 'Failed to delete client');
}

export function useDeleteLead() {
  const [trigger, result] = useDeleteLeadMutation();
  return wrapMutation(trigger, result, 'Lead deleted successfully', 'Failed to delete lead');
}

