import { createContext } from 'react';
import { User, Role, ReminderItem } from '../types';

/**
 * The context object lives in its own module so Vite hot reloads of AuthContext.tsx never create a second
 * context (which made the provider and useAuth() disagree: "useAuth must be used within an AuthProvider").
 */
export interface AuthContextType {
  currentUser: User | null;
  users: User[];
  role: Role;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isOrgSuperAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  unreadRemindersCount: number;
  reminders: ReminderItem[];
  toasts: any[];
  login: (email: string, password?: string) => Promise<boolean>;
  switchUser: (userId: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  refreshReminders: (type?: 'SALES' | 'CLIENT') => Promise<void>;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  removeToast: (id: string) => void;
  markReminderCompleted: (id: string) => Promise<void>;
  markAllRemindersRead: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
