import { baseClient } from '../baseApi';
import { getStoredOrganizationId } from '../config';
import type { ReminderItem, ReminderType } from '../../types';
import { moduleLabel } from '../../utils/notificationCategories';

/** Which notifications a screen asks for: Sales Management or Client Management. */
export type AdminNotificationType = 'ALL' | 'SALES' | 'CLIENT' | 'BOTH' | 'SUPER_ADMIN';

export interface AdminNotification {
  id: string;
  organizationId?: string | null;
  subOrganizationId?: string | null;
  branchId?: string | null;
  userId?: string | null;
  actorId?: string | null;
  notifyBy?: string | null;
  type: AdminNotificationType;
  title: string;
  message: string;
  service?: string | null;
  module?: string | null;
  action?: string | null;
  entityId?: string | null;
  method?: string | null;
  path?: string | null;
  link?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminNotificationListParams {
  type?: AdminNotificationType;
  isRead?: boolean;
  module?: string;
  action?: string;
  service?: string;
  from?: string;
  to?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  page_no?: number;
  page_size?: number;
  organization_id?: string;
  sub_organization_id?: string;
  branch_id?: string;
}

export interface AdminNotificationListResponse {
  success: boolean;
  data: AdminNotification[];
  pagination?: { page: number; limit: number; totalRecords: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean };
  summary?: { totalCount: number; unreadCount: number; readCount: number };
}

const orgHeaders = () => {
  const orgId = getStoredOrganizationId() || undefined;
  return orgId ? { 'x-organization-id': orgId } : undefined;
};

export const adminNotificationApi = {
  list: async (params: AdminNotificationListParams = {}): Promise<AdminNotificationListResponse> => {
    const orgId = params.organization_id || getStoredOrganizationId() || undefined;
    const res = await baseClient.get<AdminNotificationListResponse>('/admin-notifications', {
      params: { ...params, ...(orgId && { organization_id: orgId }) },
      headers: orgHeaders(),
    });
    return res.data;
  },

  unreadCount: async (type: AdminNotificationType = 'ALL'): Promise<number> => {
    const res = await baseClient.get<{ data: { count: number } }>('/admin-notifications/unread-count', {
      params: { type },
      headers: orgHeaders(),
    });
    return res.data?.data?.count ?? 0;
  },

  getById: async (id: string): Promise<AdminNotification> => {
    const res = await baseClient.get<{ data: AdminNotification }>(`/admin-notifications/${id}`, { headers: orgHeaders() });
    return res.data.data;
  },

  markRead: async (id: string): Promise<AdminNotification> => {
    const res = await baseClient.patch<{ data: AdminNotification }>(`/admin-notifications/${id}/read`, undefined, { headers: orgHeaders() });
    return res.data.data;
  },

  markAllRead: async (body: { type?: AdminNotificationType; module?: string } = {}): Promise<number> => {
    const res = await baseClient.patch<{ data: { updatedCount: number } }>('/admin-notifications/read-all', body, { headers: orgHeaders() });
    return res.data?.data?.updatedCount ?? 0;
  },
};

/** 31/10/2026, 04:18 PM (local time). */
export const formatDateTimeAmPm = (iso?: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  const hours = d.getHours();
  const hour12 = hours % 12 || 12;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(hour12)}:${pad(d.getMinutes())} ${hours >= 12 ? 'PM' : 'AM'}`;
};

const UUID = /\s*\(?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)?/gi;

/** The server message names records by id; drop the ids so the sentence reads naturally. */
const cleanMessage = (message: string) => message.replace(UUID, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,])/g, '$1').trim();

const reminderTypeOf = (module?: string | null): ReminderType => {
  const m = (module || '').toLowerCase();
  if (m.includes('lead')) return 'Lead Follow-up';
  if (m.includes('task')) return 'Task Deadline';
  if (m.includes('payment') || m.includes('invoice') || m.includes('collection')) return 'Payment Due';
  if (m.includes('subscription')) return 'Subscription Expiry';
  return 'Notification';
};

/** A notification as the reminders UI shows it: the server only tracks read/unread, so read means done. */
export const mapNotificationToReminder = (n: AdminNotification): ReminderItem => ({
  id: n.id,
  type: reminderTypeOf(n.module),
  title: n.title,
  description: cleanMessage(n.message || ''),
  relatedId: n.entityId || undefined,
  relatedType: n.module || undefined,
  category: moduleLabel(n.module),
  service: n.service || undefined,
  notificationType: n.type || undefined,
  path: n.path || n.link || undefined,
  dueDate: n.createdAt,
  isRead: n.isRead,
  isCompleted: n.isRead,
  priority: n.action === 'DELETE' ? 'High' : 'Medium',
  createdAt: n.createdAt,
});
