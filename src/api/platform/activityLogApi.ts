import { baseClient, baseApi } from '../baseApi';
import {
  ActivityLogsResponse,
  ActivityLogsQueryParams,
} from './activityLogTypes';

export * from './activityLogTypes';

export const activityLogsEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActivityLogs: builder.query<ActivityLogsResponse, ActivityLogsQueryParams | void>({
      query: (params) => ({
        url: '/settings/activity-logs',
        params: params ? {
          page: params.page,
          limit: params.limit,
          search: params.search || undefined,
          status: params.status && params.status !== 'All' ? params.status : undefined,
          module: params.module || undefined,
          from: params.from || undefined,
          to: params.to || undefined,
        } : undefined,
      }),
      providesTags: ['ActivityLog'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetActivityLogsQuery,
  useLazyGetActivityLogsQuery,
} = activityLogsEndpoints;

export const activityLogsApi = {
  getActivityLogs: async (params?: ActivityLogsQueryParams): Promise<ActivityLogsResponse> => {
    const queryParams: Record<string, any> = {};
    if (params) {
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.search) queryParams.search = params.search;
      if (params.status && params.status !== 'All') queryParams.status = params.status;
      if (params.module) queryParams.module = params.module;
      if (params.from) queryParams.from = params.from;
      if (params.to) queryParams.to = params.to;
    }
    const response = await baseClient.get<ActivityLogsResponse>('/settings/activity-logs', {
      params: queryParams,
    });
    return response.data;
  },
};
