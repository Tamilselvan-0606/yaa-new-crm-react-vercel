import { baseApi } from '../baseApi';

export interface SuperAdminDetail {
  id: string;
  companyName: string;
  logoUrl: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  website?: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SuperAdminDetailSingleResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: SuperAdminDetail;
  meta?: any;
}

export interface SuperAdminDetailListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: SuperAdminDetail[];
  pagination?: any;
  meta?: any;
}

export interface SuperAdminDetailListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: 'createdAt' | 'companyName';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateSuperAdminDetailRequest {
  companyName?: string;
  /** base64 data URI (data:image/png;base64,...), an http(s) URL (kept unchanged), or '' to clear. */
  logoUrl?: string;
  gstNumber?: string;
  panNumber?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  isDefault?: boolean;
}

/**
 * Platform administrator (super admin) company details: the "Sale Configuration" / "Billing From" card.
 * Cached by RTK Query (tag 'SuperAdminDetail'); the default row is fetched once and reused until an update
 * invalidates it. Screens only call it while they need it (`skip`).
 */
export const superAdminDetailEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /auth/admin/super-admin-details (default row comes first)
    getSuperAdminDetails: builder.query<SuperAdminDetailListResponse, SuperAdminDetailListParams | void>({
      query: (params) => ({ url: '/auth/admin/super-admin-details', params: params || undefined }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'SuperAdminDetail' as const, id })),
              { type: 'SuperAdminDetail', id: 'LIST' },
            ]
          : [{ type: 'SuperAdminDetail', id: 'LIST' }],
    }),

    // GET /auth/admin/super-admin-details/default (404 until company details exist)
    getDefaultSuperAdminDetail: builder.query<SuperAdminDetailSingleResponse, void>({
      query: () => '/auth/admin/super-admin-details/default',
      providesTags: (result) =>
        result?.data
          ? [{ type: 'SuperAdminDetail', id: 'DEFAULT' }, { type: 'SuperAdminDetail', id: result.data.id }]
          : [{ type: 'SuperAdminDetail', id: 'DEFAULT' }],
    }),

    // GET /auth/admin/super-admin-details/{id}
    getSuperAdminDetailById: builder.query<SuperAdminDetailSingleResponse, string>({
      query: (id) => `/auth/admin/super-admin-details/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'SuperAdminDetail', id }],
    }),

    // PATCH /auth/admin/super-admin-details/{id} (send only the fields to change)
    updateSuperAdminDetail: builder.mutation<
      SuperAdminDetailSingleResponse,
      { id: string; payload: UpdateSuperAdminDetailRequest }
    >({
      query: ({ id, payload }) => ({
        url: `/auth/admin/super-admin-details/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SuperAdminDetail', id },
        { type: 'SuperAdminDetail', id: 'DEFAULT' },
        { type: 'SuperAdminDetail', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSuperAdminDetailsQuery,
  useGetDefaultSuperAdminDetailQuery,
  useGetSuperAdminDetailByIdQuery,
  useUpdateSuperAdminDetailMutation,
} = superAdminDetailEndpoints;

/** The company-details id a document carries (if the backend ever stores one); otherwise the default is used. */
export const getDocSuperAdminDetailId = (doc?: any): string =>
  doc?.superAdminDetailId || doc?.superAdminDetailsId || doc?.companyDetailId || doc?.sellerDetailId || '';

export const getApiErrorMessage = (e: any, fallback: string): string =>
  e?.data?.error?.message ||
  e?.data?.message ||
  e?.response?.data?.error?.message ||
  e?.response?.data?.message ||
  e?.message ||
  fallback;
