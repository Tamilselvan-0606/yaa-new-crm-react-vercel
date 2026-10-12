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
    getDashboardStats: builder.query<any, void>({
      query: () => '/api/dashboard/stats',
      providesTags: ['Dashboard'],
      keepUnusedDataFor: 30,
    }),

    getLeads: builder.query<Lead[], void>({
      query: () => '/api/leads',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Lead' as const, id })),
              { type: 'Lead', id: 'LIST' },
            ]
          : [{ type: 'Lead', id: 'LIST' }],
    }),

    getLeadById: builder.query<Lead, string>({
      query: (id) => `/api/leads/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Lead', id }],
    }),

    createLead: builder.mutation<Lead, Partial<Lead>>({
      query: (data) => ({
        url: '/api/leads',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }, 'Dashboard', 'Reminder'],
    }),

    updateLead: builder.mutation<Lead, { id: string; data: Partial<Lead> }>({
      query: ({ id, data }) => ({
        url: `/api/leads/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Lead', id },
        { type: 'Lead', id: 'LIST' },
        'Dashboard',
      ],
    }),

    convertLead: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/api/leads/${id}/convert`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'Lead', id: 'LIST' },
        { type: 'Customer', id: 'LIST' },
        'Dashboard',
      ],
    }),

    deleteLead: builder.mutation<any, string>({
      query: (id) => ({
        url: `/api/leads/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }, 'Dashboard'],
    }),

    getTasks: builder.query<TaskItem[], void>({
      query: () => '/api/tasks',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Task' as const, id })),
              { type: 'Task', id: 'LIST' },
            ]
          : [{ type: 'Task', id: 'LIST' }],
    }),

    getTodayWork: builder.query<any, void>({
      query: () => '/api/work/today',
      providesTags: ['Task'],
    }),

    createTask: builder.mutation<TaskItem, Partial<TaskItem>>({
      query: (data) => ({
        url: '/api/tasks',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Task', id: 'LIST' }, 'Task', 'Dashboard'],
    }),

    updateTask: builder.mutation<TaskItem, { id: string; data: Partial<TaskItem> }>({
      query: ({ id, data }) => ({
        url: `/api/tasks/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Task', id },
        { type: 'Task', id: 'LIST' },
        'Task',
        'Dashboard',
      ],
    }),

    getContent: builder.query<ContentItem[], void>({
      query: () => '/api/content',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Content' as const, id })),
              { type: 'Content', id: 'LIST' },
            ]
          : [{ type: 'Content', id: 'LIST' }],
    }),

    createContent: builder.mutation<ContentItem, Partial<ContentItem>>({
      query: (data) => ({
        url: '/api/content',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Content', id: 'LIST' }, 'Dashboard'],
    }),

    getPayments: builder.query<PaymentItem[], void>({
      query: () => '/api/payments',
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
        url: '/api/payments',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Payment', id: 'LIST' }, 'Dashboard'],
    }),

    getSubscriptions: builder.query<SubscriptionItem[], void>({
      query: () => '/api/subscriptions',
      providesTags: ['Subscription'],
    }),

    getReminders: builder.query<any[], void>({
      query: () => '/api/reminders',
      providesTags: ['Reminder'],
    }),

    getEmployees: builder.query<any[], void>({
      query: () => '/api/employees',
      providesTags: ['Employee'],
    }),

    getActivities: builder.query<ActivityLog[], void>({
      query: () => '/api/activities',
      providesTags: ['Activity'],
    }),

    getReports: builder.query<any, void>({
      query: () => '/api/reports',
      providesTags: ['Report'],
    }),

    getSettings: builder.query<CompanySettings, void>({
      query: () => '/api/settings',
      providesTags: ['Setting'],
    }),

    getMarketingOverview: builder.query<any, void>({
      query: () => '/api/marketing/overview',
      providesTags: ['Content', 'Dashboard'],
    }),

    getCrmProducts: builder.query<Product[], void>({
      query: () => '/api/products',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Product' as const, id })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
    }),

    getCrmProductById: builder.query<any, string>({
      query: (id) => `/api/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),

    getCrmCustomers: builder.query<Customer[], void>({
      query: () => '/api/customers',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Customer' as const, id })),
              { type: 'Customer', id: 'LIST' },
            ]
          : [{ type: 'Customer', id: 'LIST' }],
    }),

    getCrmCustomerById: builder.query<Customer, string>({
      query: (id) => `/api/customers/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Customer', id }],
    }),

    updateCrmCustomer: builder.mutation<Customer, { id: string; data: Partial<Customer> }>({
      query: ({ id, data }) => ({
        url: `/api/customers/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Customer', id },
        { type: 'Customer', id: 'LIST' },
        'Dashboard',
      ],
    }),

    deleteCrmCustomer: builder.mutation<any, string>({
      query: (id) => ({
        url: `/api/customers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }, 'Dashboard'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDashboardStatsQuery,
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
  useUpdateCrmCustomerMutation,
  useDeleteCrmCustomerMutation,
} = crmApi;
