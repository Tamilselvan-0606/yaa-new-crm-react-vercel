import { create } from 'zustand';
import { User, Role, ReminderItem } from '../types';
import { api } from '../services/api';
import { toast } from 'sonner';

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

  // Actions
  initAuth: () => Promise<void>;
  login: (email: string, password?: string) => Promise<boolean>;
  switchUser: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshReminders: () => Promise<void>;
  markReminderCompleted: (id: string) => Promise<void>;
  markAllRemindersRead: () => Promise<void>;
  setUsers: (users: User[]) => void;
}

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
    set({ isLoading: true });
    try {
      const res = await api.switchUser(userId);
      if (res.success && res.user) {
        const roleFlags = getRoleFlags(res.user.role);

        set({
          currentUser: res.user,
          role: res.user.role,
          ...roleFlags,
          token: res.token || get().token,
          isLoading: false,
        });
        toast.info('Account Switched', {
          description: `Active role: ${res.user.role} (${res.user.name})`,
        });
        await get().refreshReminders();
      }
    } catch (error: any) {
      toast.error('Switch Failed', {
        description: error.message,
      });
      set({ isLoading: false });
    }
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

  refreshReminders: async () => {
    // Retain state without calling unintegrated /api/reminders
  },

  markReminderCompleted: async (id: string) => {
    try {
      await api.updateReminder(id, { isCompleted: true, isRead: true });
      const updated = get().reminders.map((r) =>
        r.id === id ? { ...r, isCompleted: true, isRead: true } : r
      );
      const unreadCount = updated.filter((r) => !r.isCompleted && !r.isRead).length;
      set({ reminders: updated, unreadRemindersCount: unreadCount });
      toast.success('Reminder marked as completed');
    } catch (e: any) {
      toast.error('Failed to update reminder', { description: e.message });
    }
  },

  markAllRemindersRead: async () => {
    try {
      await api.markAllRemindersRead();
      const updated = get().reminders.map((r) => ({ ...r, isRead: true }));
      set({ reminders: updated, unreadRemindersCount: 0 });
      toast.success('All reminders marked as read');
    } catch (e: any) {
      toast.error('Failed to update reminders', { description: e.message });
    }
  },

  setUsers: (users: User[]) => set({ users }),
}));
