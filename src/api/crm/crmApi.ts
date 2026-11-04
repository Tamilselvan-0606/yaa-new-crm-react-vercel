import { baseApi } from '../baseApi';
import {
  Lead,
  Customer,
  TaskItem,
  ContentItem,
  PaymentItem,
  SubscriptionItem,
  Product,
  ActivityLog,
  CompanySettings,
} from '../../types';

export const crmApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLeads: builder.query<Lead[], void>({
      query: () => ({
        url: '/platform/leads',
        params: { limit: 100 },
      }),
      transformResponse: (response: any) => {
        const list = Array.isArray(response) ? response : (response?.data || response?.leads || []);
        return list.map((item: any) => ({
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
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Lead' as const, id })),
              { type: 'Lead', id: 'LIST' },
            ]
          : [{ type: 'Lead', id: 'LIST' }],
    }),

    getLeadById: builder.query<Lead, string>({
      query: (id) => `/platform/leads/${id}`,
      transformResponse: (response: any) => {
        const item = response?.data || response;
        return {
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
        };
      },
      providesTags: (_result, _error, id) => [{ type: 'Lead', id }],
    }),

    createLead: builder.mutation<Lead, Partial<Lead>>({
      query: (data) => ({
        url: '/platform/leads',
        method: 'POST',
        body: {
          name: data.name,
          company: data.company,
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp,
          source: data.leadSource || data.source || 'Website',
          status: data.status || 'New',
          priority: data.priority || 'Medium',
          planInterest: data.interestedProductOrService,
          location: data.location,
          notes: data.notes || data.feedback,
        },
      }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }, 'PlatformDashboard', 'Reminder'],
    }),

    updateLead: builder.mutation<Lead, { id: string; data: Partial<Lead> }>({
      query: ({ id, data }) => ({
        url: `/platform/leads/${id}`,
        method: 'PUT',
        body: {
          name: data.name,
          company: data.company,
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp,
          status: data.status,
          priority: data.priority,
          planInterest: data.interestedProductOrService,
          location: data.location,
          notes: data.notes || data.feedback,
          followUpDate: data.nextFollowUpDate,
        },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Lead', id },
        { type: 'Lead', id: 'LIST' },
        'PlatformDashboard',
      ],
    }),

    convertLead: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/platform/leads/${id}/convert`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'Lead', id: 'LIST' },
        { type: 'CrmCustomer', id: 'LIST' },
        'PlatformDashboard',
      ],
    }),

    deleteLead: builder.mutation<any, string>({
      query: (id) => ({
        url: `/platform/leads/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }, 'PlatformDashboard'],
    }),

    getTasks: builder.query<TaskItem[], void>({
      queryFn: () => {
        try {
          const raw = localStorage.getItem('crm_platform_tasks');
          const data: TaskItem[] = raw ? JSON.parse(raw) : [];
          return { data };
        } catch {
          return { data: [] };
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Task' as const, id })),
              { type: 'Task', id: 'LIST' },
            ]
          : [{ type: 'Task', id: 'LIST' }],
    }),

    getTodayWork: builder.query<any, void>({
      queryFn: () => {
        const today = new Date().toISOString().split('T')[0];
        try {
          const raw = localStorage.getItem('crm_platform_tasks');
          const tasks: TaskItem[] = raw ? JSON.parse(raw) : [];
          const todayTasks = tasks.filter((t) => t.dueDate === today);
          return { data: { today, tasks: todayTasks, followUps: [] } };
        } catch {
          return { data: { today, tasks: [], followUps: [] } };
        }
      },
      providesTags: ['Task'],
    }),

    createTask: builder.mutation<TaskItem, Partial<TaskItem>>({
      queryFn: (data) => {
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
          return { data: newTask };
        } catch (e: any) {
          return { error: { status: 'CUSTOM_ERROR', error: e.message } };
        }
      },
      invalidatesTags: [{ type: 'Task', id: 'LIST' }, 'Task', 'PlatformDashboard'],
    }),

    updateTask: builder.mutation<TaskItem, { id: string; data: Partial<TaskItem> }>({
      queryFn: ({ id, data }) => {
        try {
          const raw = localStorage.getItem('crm_platform_tasks');
          const tasks: TaskItem[] = raw ? JSON.parse(raw) : [];
          const idx = tasks.findIndex((t) => t.id === id);
          if (idx !== -1) {
            tasks[idx] = { ...tasks[idx], ...data };
            localStorage.setItem('crm_platform_tasks', JSON.stringify(tasks));
            return { data: tasks[idx] };
          }
          return { data: { id, ...data } as TaskItem };
        } catch (e: any) {
          return { error: { status: 'CUSTOM_ERROR', error: e.message } };
        }
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Task', id },
        { type: 'Task', id: 'LIST' },
        'Task',
        'PlatformDashboard',
      ],
    }),

    getContent: builder.query<ContentItem[], void>({
      queryFn: () => {
        try {
          const raw = localStorage.getItem('crm_platform_content');
          const data: ContentItem[] = raw ? JSON.parse(raw) : [];
          return { data };
        } catch {
          return { data: [] };
        }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Content' as const, id })),
              { type: 'Content', id: 'LIST' },
            ]
          : [{ type: 'Content', id: 'LIST' }],
    }),

    createContent: builder.mutation<ContentItem, Partial<ContentItem>>({
      queryFn: (data) => {
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
          return { data: newItem };
        } catch (e: any) {
          return { error: { status: 'CUSTOM_ERROR', error: e.message } };
        }
      },
      invalidatesTags: [{ type: 'Content', id: 'LIST' }, 'PlatformDashboard'],
    }),

    getPayments: builder.query<PaymentItem[], void>({
      query: () => '/platform/payments',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Payment' as const, id })),
              { type: 'Payment', id: 'LIST' },
            ]
          : [{ type: 'Payment', id: 'LIST' }],
    }),

    createPayment: builder.mutation<PaymentItem, Partial<PaymentItem>>({
      query: (data) => ({
        url: '/platform/payments',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Payment', id: 'LIST' }, 'PlatformDashboard'],
    }),

    getSubscriptions: builder.query<SubscriptionItem[], void>({
      query: () => '/subscriptions',
      providesTags: ['Subscription'],
    }),

    getEmployees: builder.query<any[], void>({
      query: () => '/auth/users',
      providesTags: ['Employee'],
    }),

    getActivities: builder.query<ActivityLog[], void>({
      query: () => '/platform/activities',
      providesTags: ['Activity'],
    }),

    getReports: builder.query<any, void>({
      query: () => '/commerce/sales/dashboard/modules',
      providesTags: ['CrmReport'],
    }),

    getSettings: builder.query<CompanySettings, void>({
      query: () => '/settings',
      providesTags: ['Setting'],
    }),

    getMarketingOverview: builder.query<any, void>({
      query: () => '/marketing/overview',
      providesTags: ['Content', 'PlatformDashboard'],
    }),

    getCrmProducts: builder.query<Product[], void>({
      query: () => '/products',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'CrmProduct' as const, id })),
              { type: 'CrmProduct', id: 'LIST' },
            ]
          : [{ type: 'CrmProduct', id: 'LIST' }],
    }),

    getCrmProductById: builder.query<any, string>({
      query: (id) => `/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'CrmProduct', id }],
    }),

    getCrmCustomers: builder.query<Customer[], void>({
      query: () => '/platform/clients',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'CrmCustomer' as const, id })),
              { type: 'CrmCustomer', id: 'LIST' },
            ]
          : [{ type: 'CrmCustomer', id: 'LIST' }],
    }),

    getCrmCustomerById: builder.query<Customer, string>({
      query: (id) => `/platform/clients/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'CrmCustomer', id }],
    }),

    updateCrmCustomer: builder.mutation<Customer, { id: string; data: Partial<Customer> }>({
      query: ({ id, data }) => ({
        url: `/platform/clients/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'CrmCustomer', id },
        { type: 'CrmCustomer', id: 'LIST' },
        'PlatformDashboard',
      ],
    }),

    deleteCrmCustomer: builder.mutation<any, string>({
      query: (id) => ({
        url: `/platform/clients/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'CrmCustomer', id: 'LIST' }, 'PlatformDashboard'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetLeadsQuery,
  useGetLeadByIdQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useConvertLeadMutation,
  useDeleteLeadMutation,
  useGetTasksQuery,
  useGetTodayWorkQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useGetContentQuery,
  useCreateContentMutation,
  useGetPaymentsQuery,
  useCreatePaymentMutation,
  useGetSubscriptionsQuery,
  useGetEmployeesQuery,
  useGetActivitiesQuery,
  useGetReportsQuery,
  useGetSettingsQuery,
  useGetMarketingOverviewQuery,
  useGetCrmProductsQuery,
  useGetCrmProductByIdQuery,
  useGetCrmCustomersQuery,
  useGetCrmCustomerByIdQuery,
  useUpdateCrmCustomerMutation,
  useDeleteCrmCustomerMutation,
} = crmApi;
