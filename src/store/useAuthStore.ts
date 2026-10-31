import { create } from 'zustand';
import { User, Role, ReminderItem } from '../types';
import { api } from '../services/api';
import { SESSION_EXPIRED_EVENT } from '../api/tokenRefresh';
import { adminNotificationApi, mapNotificationToReminder, type AdminNotificationType } from '../api/platform/adminNotificationApi';
import { isRelevantTo } from '../utils/notificationCategories';
import { toast } from "../utils/toast";

interface AuthState {
  token: string | null;
  currentUser: User | null;
  users: User[];
  role: Role;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isOrgSuperAdmin: boolean;
  isLoading: boolean;
  reminders: ReminderItem[];
  unreadRemindersCount: number;
  /** Which notifications the reminders show: Sales Management or Client Management. */
  reminderType: 'SALES' | 'CLIENT';

  // Actions
  initAuth: () => Promise<void>;
  login: (email: string, password?: string) => Promise<boolean>;
  switchUser: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshReminders: (type?: 'SALES' | 'CLIENT') => Promise<void>;
  markReminderCompleted: (id: string) => Promise<void>;
  markAllRemindersRead: () => Promise<void>;
  setUsers: (users: User[]) => void;
}

/**
 * Notification types to read for the active management type. "ALL" and "SALES" / "CLIENT" leave out what a
 * platform admin did (those rows are SUPER_ADMIN), so a platform admin reads their own rows as well.
 */
const notificationTypesFor = (type: 'SALES' | 'CLIENT', platformAdmin: boolean): AdminNotificationType[] =>
  platformAdmin ? ['SUPER_ADMIN', type] : [type];

const getRoleFlags = (role: Role | string | undefined) => {
  const normalized = (role || '').toString().toUpperCase();
  const isPlatformSuper = normalized === 'SUPER_ADMIN' || normalized === 'SUPERADMIN';
  const isOrgSuper =
    normalized === 'ORG_ADMIN' ||
    normalized === 'ORGADMIN' ||
    normalized === 'ADMIN' ||
    normalized === 'ORGSUPERADMIN';
  const isSubOrg = normalized === 'SUB_ORG_ADMIN' || normalized === 'SUBORGADMIN';
  const isBranch = normalized === 'BRANCH_ADMIN' || normalized === 'BRANCHADMIN';

  return {
    isAdmin: isPlatformSuper || isOrgSuper || isSubOrg || isBranch,
    isSuperAdmin: isPlatformSuper,
    isOrgSuperAdmin: isOrgSuper,
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: api.getToken(),
  currentUser: null,
  users: [],
  role: 'ADMIN',
  isAdmin: true,
  isSuperAdmin: false,
  isOrgSuperAdmin: false,
  isLoading: true,
  reminders: [],
  unreadRemindersCount: 0,
  reminderType: 'CLIENT',

  initAuth: async () => {
    set({ isLoading: true });
    try {
      const storedToken = api.getToken();
      const storedUserId = localStorage.getItem('nexus_crm_user_id');

      if (!storedToken && !storedUserId) {
        set({
          currentUser: null,
          token: null,
          isAdmin: false,
          isSuperAdmin: false,
          isOrgSuperAdmin: false,
          isLoading: false,
        });
        return;
      }

      const curr = await api.getCurrentUser();

      const token = (curr as any).token || api.getToken();
      if (token) {
        api.setToken(token);
      }
      const roleFlags = getRoleFlags(curr.role);

      set({
        currentUser: curr,
        users: [curr],
        role: curr.role,
        ...roleFlags,
        token,
        reminders: [],
        unreadRemindersCount: 0,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Failed to init auth:', error);
      api.removeToken();
      set({
        currentUser: null,
        token: null,
        isAdmin: false,
        isSuperAdmin: false,
        isOrgSuperAdmin: false,
        isLoading: false,
      });
    }
  },

  login: async (email: string, password?: string) => {
    set({ isLoading: true });
    try {
      const res = await api.login(email, password);
      if (res.success && res.user) {
        const roleFlags = getRoleFlags(res.user.role);

        set({
          currentUser: res.user,
          role: res.user.role,
          ...roleFlags,
          token: res.token,
          isLoading: false,
        });
        toast.success(`Welcome back, ${res.user.name}`, {
          description: `Logged in as ${res.user.role} (${res.user.department})`,
        });
        get().refreshReminders();
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error('Login Failed', {
        description: error.message || 'Invalid credentials or connection error.',
      });
      set({ isLoading: false });
      return false;
    }
  },

  switchUser: async (userId: string) => {
    const user = get().users.find((u) => u.id === userId);
    if (!user) {
      toast.error('Switch Failed', { description: 'User not found' });
      return;
    }
    const roleFlags = getRoleFlags(user.role);
    set({
      currentUser: user,
      role: user.role,
      ...roleFlags,
    });
    toast.info('Account Switched', {
      description: `Active role: ${user.role} (${user.name})`,
    });
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn('Backend logout error:', err);
    } finally {
      api.removeToken();
      set({
        token: null,
        currentUser: null,
        role: 'STAFF',
        isAdmin: false,
        isSuperAdmin: false,
        isOrgSuperAdmin: false,
      });
      toast.info('Logged out', {
        description: 'Your session has been ended.',
      });
    }
  },

  refreshReminders: async (type) => {
    const reminderType = type ?? get().reminderType;
    set({ reminderType });
    if (!get().token) return;
    try {
      const { isSuperAdmin, isOrgSuperAdmin } = get();
      const types = notificationTypesFor(reminderType, isSuperAdmin && !isOrgSuperAdmin);
      const results = await Promise.all(types.map((t) => adminNotificationApi.list({ type: t, page_size: 100, sortOrder: 'desc' })));
      const byId = new Map<string, ReminderItem>();
      for (const res of results) for (const n of res.data || []) byId.set(n.id, mapNotificationToReminder(n));
      // Shared (BOTH) rows are kept only where they belong, so Sales and Client Management each see their own.
      const reminders = [...byId.values()]
        .filter((r) => isRelevantTo(reminderType, r))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 100);
      set({ reminders, unreadRemindersCount: reminders.filter((r) => !r.isRead).length });
    } catch (error) {
      console.warn('Failed to load notifications:', error);
    }
  },

  markReminderCompleted: async (id: string) => {
    try {
      await adminNotificationApi.markRead(id);
    } catch (error: any) {
      toast.error('Could not mark the notification as read', {
        description: error?.response?.data?.error?.message || error?.message,
      });
      return;
    }
    const updated = get().reminders.map((r) =>
      r.id === id ? { ...r, isCompleted: true, isRead: true } : r
    );
    set({ reminders: updated, unreadRemindersCount: updated.filter((r) => !r.isRead).length });
    toast.success('Marked as read');
  },

  markAllRemindersRead: async () => {
    const { isSuperAdmin, isOrgSuperAdmin, reminderType } = get();
    const types = notificationTypesFor(reminderType, isSuperAdmin && !isOrgSuperAdmin);
    await Promise.all(types.map((type) => adminNotificationApi.markAllRead({ type })));
    const updated = get().reminders.map((r) => ({ ...r, isRead: true, isCompleted: true }));
    set({ reminders: updated, unreadRemindersCount: 0 });
    toast.success('All notifications marked as read');
  },

  setUsers: (users: User[]) => set({ users }),
}));

// The refresh cookie is gone or rejected: stored credentials were already cleared, so drop to the login screen.
if (typeof window !== 'undefined') {
  window.addEventListener(SESSION_EXPIRED_EVENT, () => {
    if (!useAuthStore.getState().currentUser) return;
    useAuthStore.setState({
      token: null,
      currentUser: null,
      role: 'STAFF',
      isAdmin: false,
      isSuperAdmin: false,
      isOrgSuperAdmin: false,
    });
    toast.error('Session expired', {
      description: 'Please sign in again.',
    });
  });
}
