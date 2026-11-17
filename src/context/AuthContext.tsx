import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { User, Role, ReminderItem } from '../types';
import { toast } from "../utils/toast";

import { AuthContext, AuthContextType } from './authContextObject';


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentUser,
    users,
    role,
    isAdmin,
    isSuperAdmin,
    isOrgSuperAdmin,
    isLoading,
    unreadRemindersCount,
    reminders,
    initAuth,
    login,
    switchUser,
    refreshReminders,
    markReminderCompleted,
    markAllRemindersRead,
    logout,
  } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
    switch (type) {
      case 'success':
        toast.success(title, { description: message });
        break;
      case 'error':
        toast.error(title, { description: message });
        break;
      case 'info':
        toast.info(title, { description: message });
        break;
      case 'warning':
        toast.warning(title, { description: message });
        break;
    }
  };

  const removeToast = () => {};

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        role,
        isAdmin,
        isSuperAdmin,
        isOrgSuperAdmin,
        isLoading,
        isAuthenticated: !!currentUser,
        unreadRemindersCount,
        reminders,
        toasts: [],
        login,
        switchUser,
        refreshAuth: initAuth,
        refreshReminders,
        showToast,
        removeToast,
        markReminderCompleted,
        markAllRemindersRead,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
