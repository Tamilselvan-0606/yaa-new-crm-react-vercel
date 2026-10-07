import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { SearchBar } from '../../components/common/SearchBar';
import { CustomSelect } from '../../components/common/CustomSelect';
import { authApi } from '../../api/auth/authApi';
import {
  Building2,
  Bell,
  Database,
  Palette,
  Save,
  Download,
  RotateCcw,
  Check,
  Type,
  Sun,
  Moon,
  Sparkles,
  Sliders,
  User,
  ShieldCheck,
  Users,
  Lock,
  Mail,
  Key,
  Shield,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Globe,
  Clock,
  Laptop,
  Layers,
  FileText,
  CreditCard,
  Package,
  FileSpreadsheet,
  BarChart3,
  Settings as SettingsIcon,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Loader2,
  Trash,
  UserCheck,
  Briefcase,
  Store,
  Compass,
  FileCheck2,
  FolderTree,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  ArrowLeft,
} from 'lucide-react';

interface RolePermissionActions {
  add: boolean;
  view: boolean;
  edit: boolean;
  delete: boolean;
  approval: boolean;
}

interface ModulePermissionItem {
  moduleId: string;
  moduleName: string;
  isSubModule?: boolean;
  parentModuleId?: string;
  actions: RolePermissionActions;
}

interface RoleRecord {
  id: string;
  serialNo: string;
  roleName: string;
  type: 'Custom' | 'System';
  createdOn: string;
  status: 'Active' | 'Inactive';
  adminAccess: boolean;
  modulePermissions: ModulePermissionItem[];
}

export const SettingsView: React.FC = () => {
  const { isAdmin, isSuperAdmin, currentUser, showToast } = useAuth();
  const {
    theme,
    setTheme,
    resetTheme,
    applyPreset,
    presets,
    primaryContrast,
    accentContrast,
    bgContrast,
    surfaceContrast,
    isBgDark,
    isPrimaryDark,
  } = useTheme();

  // Super Admin sidebar tab
  const [superAdminTab, setSuperAdminTab] = useState<
    'general' | 'theme' | 'account' | 'permission' | 'staff'
  >(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'account' || tabParam === 'general' || tabParam === 'theme' || tabParam === 'permission' || tabParam === 'staff') {
      return tabParam as any;
    }
    return 'general';
  });

  // Standard Admin tab
  const [activeTab, setActiveTab] = useState<'account' | 'branding' | 'company' | 'reminders' | 'backup'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'account' || tabParam === 'company' || tabParam === 'branding' || tabParam === 'reminders' || tabParam === 'backup') {
      return tabParam as any;
    }
    return 'account';
  });

  // General Settings State
  const [systemName, setSystemName] = useState('Nexus CRM & ERP Platform');
  const [supportEmail, setSupportEmail] = useState('superadmin@gmail.com');
  const [billingEmail, setBillingEmail] = useState('billing@yaacreations.com');
  const [supportPhone, setSupportPhone] = useState('+91 98200 12345');
  const [timezone, setTimezone] = useState('UTC+05:30 (India Standard Time)');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [currency, setCurrency] = useState('INR (₹)');
  const [defaultLanguage, setDefaultLanguage] = useState('English (US)');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Account Settings State
  const [accountName, setAccountName] = useState(currentUser?.name || 'Super Admin');
  const [accountEmail, setAccountEmail] = useState(currentUser?.email || 'superadmin@gmail.com');
  const [accountPhone, setAccountPhone] = useState('+91 98765 43210');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);

  // Company Information State (For Standard Admin)
  const [companyName, setCompanyName] = useState('Yaa Creations');

  // Notification & Automated Reminder settings
  const [leadFollowUpDays, setLeadFollowUpDays] = useState(2);
  const [paymentDueReminderDays, setPaymentDueReminderDays] = useState(3);
  const [subscriptionExpiryDays, setSubscriptionExpiryDays] = useState(14);

  // -------------------------------------------------------------------------
  // Role Management Modules & Sub-modules Structure (Exact Sidebar Hierarchy)
  // -------------------------------------------------------------------------
  interface SystemModuleDef {
    id: string;
    name: string;
    subModules?: { id: string; name: string }[];
  }

  const systemModuleCatalog: SystemModuleDef[] = [
    {
      id: 'dashboard',
      name: 'DASHBOARD',
    },
    {
      id: 'organizations',
      name: 'ORGANIZATIONS & SUB-ORGANIZATIONS',
      subModules: [
        { id: 'org_directory', name: 'Organizations List' },
        { id: 'sub_organizations', name: 'Sub Organizations' },
      ],
    },
    {
      id: 'branches',
      name: 'BRANCHES & LOCATIONS',
    },
    {
      id: 'products',
      name: 'PRODUCTS & ITEMS',
      subModules: [
        { id: 'prod_items', name: 'Products Catalog' },
        { id: 'prod_categories', name: 'Categories' },
        { id: 'prod_subcategories', name: 'Subcategories' },
        { id: 'prod_stock', name: 'Stock Summary & Inventory' },
      ],
    },
    {
      id: 'leads',
      name: 'CLIENTS & LEADS (CRM)',
      subModules: [
        { id: 'leads_pipeline', name: 'Leads & Inquiries' },
        { id: 'clients_customers', name: 'Customers & Clients' },
        { id: 'suppliers_parties', name: 'Suppliers & Vendors' },
      ],
    },
    {
      id: 'quotes',
      name: 'QUOTATIONS & ESTIMATES',
    },
    {
      id: 'proforma',
      name: 'PROFORMA INVOICES',
      subModules: [
        { id: 'proforma_create', name: 'New Proforma Invoice' },
        { id: 'proforma_list', name: 'Proforma Invoices List' },
      ],
    },
    {
      id: 'invoices',
      name: 'INVOICES & BILLING',
      subModules: [
        { id: 'sales_new_invoice', name: 'Create New Invoice' },
        { id: 'sales_invoices_list', name: 'Sales Invoices List' },
        { id: 'sales_returns_credit', name: 'Sales Return (Credit Note)' },
      ],
    },
    {
      id: 'work_mgmt',
      name: 'WORK MANAGEMENT',
      subModules: [
        { id: 'content_planner', name: 'Content Planner' },
        { id: 'today_tasks', name: "Today's Tasks" },
      ],
    },
    {
      id: 'payments',
      name: 'PAYMENTS & RECEIPTS',
    },
    {
      id: 'subscriptions',
      name: 'SUBSCRIPTIONS & PLANS',
      subModules: [
        { id: 'subscription_plans', name: 'Subscription Plans' },
        { id: 'org_subscriptions', name: 'Organization Subscriptions' },
      ],
    },
    {
      id: 'reminders',
      name: 'REMINDERS & NOTIFICATIONS',
    },
    {
      id: 'reports',
      name: 'REPORTS & ANALYTICS',
      subModules: [
        { id: 'rep_sales_gst', name: 'Sales & GST Reports' },
        { id: 'rep_inventory', name: 'Stock & Inventory Reports' },
        { id: 'rep_financial', name: 'Financial Statements' },
      ],
    },
    {
      id: 'sale_management',
      name: 'SALE MANAGEMENT (ERP & PURCHASE)',
      subModules: [
        { id: 'sm_sales_hub', name: 'Sales Hub & Orders' },
        { id: 'sm_purchase_bills', name: 'Purchase Bills & PO' },
        { id: 'sm_purchase_returns', name: 'Purchase Return (Debit Note)' },
      ],
    },
    {
      id: 'pending_dues',
      name: 'PENDING DUES & AGING',
    },
    {
      id: 'system_settings',
      name: 'SYSTEM SETTINGS',
      subModules: [
        { id: 'set_general', name: 'General Platform Settings' },
        { id: 'set_theme', name: 'Theme & Branding Colors' },
        { id: 'set_security', name: 'Account & Security Protocols' },
        { id: 'set_staff_roles', name: 'Staff & Roles Management' },
      ],
    },
  ];

  // Flattened list helper of all modules and submodules
  const generateFullModulePermissionsList = (allEnabled = true): ModulePermissionItem[] => {
    const list: ModulePermissionItem[] = [];
    systemModuleCatalog.forEach((mod) => {
      // Main Module Entry
      list.push({
        moduleId: mod.id,
        moduleName: mod.name,
        isSubModule: false,
        actions: {
          add: allEnabled,
          view: allEnabled,
          edit: allEnabled,
          delete: allEnabled,
          approval: allEnabled,
        },
      });

      // Sub Modules Entries
      if (mod.subModules && mod.subModules.length > 0) {
        mod.subModules.forEach((sub) => {
          list.push({
            moduleId: sub.id,
            moduleName: sub.name,
            isSubModule: true,
            parentModuleId: mod.id,
            actions: {
              add: allEnabled,
              view: allEnabled,
              edit: allEnabled,
              delete: allEnabled,
              approval: allEnabled,
            },
          });
        });
      }
    });
    return list;
  };

  const defaultRoleRecords: RoleRecord[] = [
    {
      id: 'role-1',
      serialNo: 'YC-YAA-005',
      roleName: 'CEO',
      type: 'Custom',
      createdOn: '9/21/2026',
      status: 'Active',
      adminAccess: true,
      modulePermissions: generateFullModulePermissionsList(true),
    },
    {
      id: 'role-2',
      serialNo: 'YC-004',
      roleName: 'Staff',
      type: 'Custom',
      createdOn: '9/10/2026',
      status: 'Active',
      adminAccess: false,
      modulePermissions: generateFullModulePermissionsList(false).map((item) => {
        const allowed = ['dashboard', 'products', 'prod_items', 'leads', 'leads_pipeline', 'clients_customers', 'quotes', 'invoices', 'sales_invoices_list', 'reminders', 'pending_dues'].includes(item.moduleId);
        return {
          ...item,
          actions: {
            add: allowed,
            view: allowed,
            edit: false,
            delete: false,
            approval: false,
          },
        };
      }),
    },
    {
      id: 'role-3',
      serialNo: 'YC-003',
      roleName: 'Branch Manager',
      type: 'Custom',
      createdOn: '9/05/2026',
      status: 'Active',
      adminAccess: true,
      modulePermissions: generateFullModulePermissionsList(false).map((item) => {
        const excluded = ['organizations', 'org_directory', 'sub_organizations', 'subscriptions', 'subscription_plans', 'org_subscriptions', 'system_settings', 'set_general', 'set_theme', 'set_security', 'set_staff_roles'].includes(item.moduleId);
        return {
          ...item,
          actions: {
            add: !excluded,
            view: !excluded,
            edit: !excluded,
            delete: false,
            approval: !excluded,
          },
        };
      }),
    },
  ];

  const [roleList, setRoleList] = useState<RoleRecord[]>(defaultRoleRecords);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [activeRoleDropdownId, setActiveRoleDropdownId] = useState<string | null>(null);
  const [roleDropdownPos, setRoleDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  
  // Modal state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add'>('view');
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);

  // Form Fields for Add / Edit / View Role Modal
  const [formRoleName, setFormRoleName] = useState('');
  const [formRoleStatus, setFormRoleStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formAdminAccess, setFormAdminAccess] = useState<boolean>(true);
  const [formModulePermissions, setFormModulePermissions] = useState<ModulePermissionItem[]>([]);

  // Open View Role Modal
  const handleOpenViewRole = (role: RoleRecord) => {
    setEditingRole(role);
    setFormRoleName(role.roleName);
    setFormRoleStatus(role.status);
    setFormAdminAccess(role.adminAccess);
    setFormModulePermissions(JSON.parse(JSON.stringify(role.modulePermissions)));
    setModalMode('view');
    setIsRoleModalOpen(true);
  };

  // Open Edit Role Modal
  const handleOpenEditRole = (role: RoleRecord) => {
    setEditingRole(role);
    setFormRoleName(role.roleName);
    setFormRoleStatus(role.status);
    setFormAdminAccess(role.adminAccess);
    setFormModulePermissions(JSON.parse(JSON.stringify(role.modulePermissions)));
    setModalMode('edit');
    setIsRoleModalOpen(true);
  };

  // Open Add Role Modal
  const handleOpenAddRole = () => {
    setEditingRole(null);
    setFormRoleName('');
    setFormRoleStatus('Active');
    setFormAdminAccess(true);
    setFormModulePermissions(generateFullModulePermissionsList(true));
    setModalMode('add');
    setIsRoleModalOpen(true);
  };

  // Delete Role
  const handleDeleteRole = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete role "${name}"?`)) {
      setRoleList((prev) => prev.filter((r) => r.id !== id));
      showToast('success', 'Role Removed', `Role "${name}" has been deleted.`);
    }
  };

  // Toggle specific action for a module in modal
  const handleToggleModuleAction = (moduleId: string, actionKey: keyof RolePermissionActions) => {
    setFormModulePermissions((prev) =>
      prev.map((item) => {
        if (item.moduleId !== moduleId) return item;
        return {
          ...item,
          actions: {
            ...item.actions,
            [actionKey]: !item.actions[actionKey],
          },
        };
      })
    );
  };

  // Toggle ALL ACCESS ON / OFF for a module (and its submodules if it's a parent)
  const handleToggleAllAccess = (moduleId: string, enableAll: boolean) => {
    setFormModulePermissions((prev) => {
      // Check if this module is a parent module with submodules
      const isParent = prev.some((item) => item.parentModuleId === moduleId);

      return prev.map((item) => {
        // If this item is the target module OR a child of this parent module
        if (item.moduleId === moduleId || (isParent && item.parentModuleId === moduleId)) {
          return {
            ...item,
            actions: {
              add: enableAll,
              view: enableAll,
              edit: enableAll,
              delete: enableAll,
              approval: enableAll,
            },
          };
        }
        return item;
      });
    });
  };

  // Save Role from Modal
  const handleSaveRoleModal = () => {
    if (!formRoleName.trim()) {
      showToast('error', 'Validation Error', 'Please enter a valid role name.');
      return;
    }

    if (modalMode === 'edit' && editingRole) {
      setRoleList((prev) =>
        prev.map((r) =>
          r.id === editingRole.id
            ? {
                ...r,
                roleName: formRoleName,
                status: formRoleStatus,
                adminAccess: formAdminAccess,
                modulePermissions: formModulePermissions,
              }
            : r
        )
      );
      showToast('success', 'Role Updated', `Permissions for "${formRoleName}" updated successfully.`);
    } else if (modalMode === 'add') {
      const newRole: RoleRecord = {
        id: `role-${Date.now()}`,
        serialNo: `YC-00${roleList.length + 5}`,
        roleName: formRoleName,
        type: 'Custom',
        createdOn: new Date().toLocaleDateString('en-US'),
        status: formRoleStatus,
        adminAccess: formAdminAccess,
        modulePermissions: formModulePermissions,
      };
      setRoleList((prev) => [newRole, ...prev]);
      showToast('success', 'Role Created', `New role "${formRoleName}" added successfully.`);
    }

    setIsRoleModalOpen(false);
  };

  // Filtered Roles
  const filteredRoles = roleList.filter((r) =>
    roleSearchQuery
      ? r.roleName.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
        r.serialNo.toLowerCase().includes(roleSearchQuery.toLowerCase())
      : true
  );



  // Staff / Super Admin Team State
  const [staffMembers, setStaffMembers] = useState([
    {
      id: 'staff-1',
      name: 'Super Admin',
      email: 'superadmin@gmail.com',
      role: 'Platform Owner',
      department: 'Executive Administration',
      status: 'Active',
      lastActive: 'Just now',
    },
    {
      id: 'staff-2',
      name: 'Eswaran A',
      email: 'eswaran@yaacreations.com',
      role: 'Lead Architect',
      department: 'Engineering & DevOps',
      status: 'Active',
      lastActive: '12 mins ago',
    },
    {
      id: 'staff-3',
      name: 'Aditi Sharma',
      email: 'aditi.sharma@platform.com',
      role: 'Security Officer',
      department: 'Compliance & Audit',
      status: 'Active',
      lastActive: '2 hours ago',
    },
    {
      id: 'staff-4',
      name: 'Vikram Malhotra',
      email: 'vikram.m@platform.com',
      role: 'Support Manager',
      department: 'Customer Success',
      status: 'Active',
      lastActive: 'Yesterday',
    },
  ]);

  // New staff modal state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('System Admin');
  const [newStaffDept, setNewStaffDept] = useState('Technical Support');

  const fontOptions = [
    { label: 'Inter (Modern Standard UI)', value: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    { label: 'Poppins (Modern Clean Sans-Serif)', value: '"Poppins", sans-serif' },
    { label: 'EB Garamond (Classic Editorial Serif)', value: '"EB Garamond", serif' },
    { label: 'Plus Jakarta Sans (Sleek Geometric)', value: '"Plus Jakarta Sans", sans-serif' },
    { label: 'JetBrains Mono (Technical Monospace)', value: '"JetBrains Mono", monospace' },
  ];

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('error', 'Unauthorized', 'Only Administrators can update system configuration.');
      return;
    }
    showToast('success', 'Configuration Saved', 'Settings updated successfully across the system.');
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('error', 'Validation Error', 'Please enter your current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Password Mismatch', 'New password and confirmation do not match.');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      showToast('success', 'Password Updated', 'Your password has been changed and other sessions revoked.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast('error', 'Update Failed', err?.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      showToast('error', 'Validation Error', 'Please enter staff name and email.');
      return;
    }
    const newMember = {
      id: `staff-${Date.now()}`,
      name: newStaffName.trim(),
      email: newStaffEmail.trim(),
      role: newStaffRole,
      department: newStaffDept,
      status: 'Active',
      lastActive: 'Just added',
    };
    setStaffMembers([newMember, ...staffMembers]);
    setIsStaffModalOpen(false);
    setNewStaffName('');
    setNewStaffEmail('');
    showToast('success', 'Staff Member Added', `${newMember.name} added to platform staff.`);
  };

  const handleDeleteStaff = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    setStaffMembers(staffMembers.filter((s) => s.id !== id));
    showToast('success', 'Staff Removed', `${name} has been removed.`);
  };

  const handleExportDatabase = () => {
    showToast('info', 'Database Backup Created', 'apex_management_backup_2026.json ready for download.');
  };

  if (!isAdmin) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <h3 className="text-sm font-bold text-slate-800">Restricted Access</h3>
        <p className="text-xs text-slate-500 mt-1">System settings and administration are reserved for Admins.</p>
      </div>
    );
  }

  // =========================================================================
  // SUPER ADMIN LAYOUT WITH SIDEBAR NAVIGATION (General, Theme, Account, Permission, Staff)
  // =========================================================================
  if (isSuperAdmin) {
    const superAdminSidebarItems = [
      { id: 'general', label: 'General', icon: Sliders },
      { id: 'theme', label: 'Theme', icon: Palette },
      { id: 'account', label: 'Account', icon: User },
      { id: 'permission', label: 'Permission', icon: ShieldCheck },
      { id: 'staff', label: 'Staff', icon: Users },
    ] as const;

    return (
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
                <Sliders className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Super Admin Settings
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Configure platform parameters, branding themes, security protocols, roles and administration staff.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {superAdminTab === 'theme' && (
              <button
                type="button"
                onClick={resetTheme}
                className="h-10 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-[13px] font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                title="Reset theme and colors to default"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Colors</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveSettings}
              className="h-10 px-5 bg-[#33077C] hover:bg-[#432eb5] text-white text-xs sm:text-[13px] font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Unified Single Card Container */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
            {/* Left Settings Sidebar (Compact width) */}
            <div className="lg:col-span-2 p-3.5 border-b lg:border-b-0 lg:border-r border-slate-200/80 space-y-1.5 bg-slate-50/30">
              <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Settings
              </div>
              {superAdminSidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = superAdminTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSuperAdminTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#33077C] text-white shadow-md shadow-[#33077C]/15 font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-600 border border-slate-200/60 shadow-2xs'
                      }`}
                    >
                      <Icon className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold leading-tight">{item.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Content Area (col-span-10) */}
            <div className="lg:col-span-10 p-6 space-y-6">
            {/* 1. GENERAL TAB */}
            {superAdminTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">General Platform Configuration</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Basic identification, time zones, standard formatting, and maintenance controls.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      value={systemName}
                      onChange={(e) => setSystemName(e.target.value)}
                      className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                      Timezone
                    </label>
                    <input
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                      Default Currency
                    </label>
                    <input
                      type="text"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                      Date Format
                    </label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] transition-all cursor-pointer"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 01/10/2026)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/01/2026)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-10-01)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                      Default Language
                    </label>
                    <select
                      value={defaultLanguage}
                      onChange={(e) => setDefaultLanguage(e.target.value)}
                      className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] transition-all cursor-pointer"
                    >
                      <option value="English (US)">English (US)</option>
                      <option value="English (UK)">English (UK)</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                    </select>
                  </div>
                </div>

                {/* Maintenance Mode Box */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs sm:text-[13px] font-bold text-slate-900">Platform Maintenance Mode</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      When enabled, all organization users see a maintenance screen. Super Admins retain full access.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={maintenanceMode}
                    onClick={() => setMaintenanceMode(!maintenanceMode)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      maintenanceMode ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* 2. THEME TAB */}
            {superAdminTab === 'theme' && (
              <div className="space-y-6">
                {/* 1-Click Curated Presets */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        1-Click Color & Theme Presets
                      </h3>
                      <p className="text-xs text-slate-500">
                        Select a curated palette or customize every individual color with automated contrast below.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                    {presets.map((p) => {
                      const isSelected =
                        theme.primary.toLowerCase() === p.theme.primary.toLowerCase() &&
                        theme.bg.toLowerCase() === p.theme.bg.toLowerCase();

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPreset(p.id)}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#33077C] ring-2 ring-[#33077C]/20 bg-purple-50/20'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900">{p.name}</span>
                              {isSelected && (
                                <span className="w-5 h-5 rounded-full bg-[#33077C] text-white flex items-center justify-center shrink-0">
                                  <Check className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 leading-snug">{p.description}</p>
                          </div>

                          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-5 h-5 rounded-md border border-slate-200 shadow-2xs"
                                style={{ backgroundColor: p.theme.primary }}
                                title={`Primary: ${p.theme.primary}`}
                              />
                              <span
                                className="w-5 h-5 rounded-md border border-slate-200 shadow-2xs"
                                style={{ backgroundColor: p.theme.accent }}
                                title={`Accent: ${p.theme.accent}`}
                              />
                              <span
                                className="w-5 h-5 rounded-md border border-slate-200 shadow-2xs"
                                style={{ backgroundColor: p.theme.bg }}
                                title={`Canvas Background: ${p.theme.bg}`}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 ml-auto">
                              {p.theme.primary}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Centralized Color Controls with Live Contrast Text Feedback */}
                <div className="pt-6 border-t border-slate-100 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Custom Color Calibration & Contrast Engine</h3>
                    <p className="text-xs text-slate-500">
                      Change any color in one place. The system computes WCAG relative luminance and automatically sets contrast text.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Primary Color Card */}
                    <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-slate-900 block">Primary Brand Color</label>
                          <span className="text-[11px] text-slate-500">Sidebar, major headings & brand badges</span>
                        </div>
                        <input
                          type="color"
                          value={theme.primary}
                          onChange={(e) => setTheme({ primary: e.target.value })}
                          className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">HEX:</span>
                        <input
                          type="text"
                          value={theme.primary}
                          onChange={(e) => setTheme({ primary: e.target.value })}
                          className="w-32 px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-lg uppercase font-bold"
                        />
                      </div>

                      <div
                        className="p-3 rounded-lg flex items-center justify-between text-xs font-semibold transition-all shadow-2xs"
                        style={{
                          backgroundColor: theme.primary,
                          color: primaryContrast,
                        }}
                      >
                        <span>Auto Contrast Result:</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-current/30">
                          {primaryContrast === '#FFFFFF' ? 'Light Text (#FFFFFF)' : 'Dark Text (#0F172A)'}
                        </span>
                      </div>
                    </div>

                    {/* Accent Color Card */}
                    <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-slate-900 block">Accent / Action Color</label>
                          <span className="text-[11px] text-slate-500">Buttons, active tabs, alerts & highlights</span>
                        </div>
                        <input
                          type="color"
                          value={theme.accent}
                          onChange={(e) => setTheme({ accent: e.target.value })}
                          className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">HEX:</span>
                        <input
                          type="text"
                          value={theme.accent}
                          onChange={(e) => setTheme({ accent: e.target.value })}
                          className="w-32 px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-lg uppercase font-bold"
                        />
                      </div>

                      <div
                        className="p-3 rounded-lg flex items-center justify-between text-xs font-semibold transition-all shadow-2xs"
                        style={{
                          backgroundColor: theme.accent,
                          color: accentContrast,
                        }}
                      >
                        <span>Auto Contrast Result:</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-current/30">
                          {accentContrast === '#FFFFFF' ? 'Light Text (#FFFFFF)' : 'Dark Text (#0F172A)'}
                        </span>
                      </div>
                    </div>

                    {/* Main Canvas Background */}
                    <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-slate-900 block">Canvas Background</label>
                          <span className="text-[11px] text-slate-500">Main viewport and page backdrop</span>
                        </div>
                        <input
                          type="color"
                          value={theme.bg}
                          onChange={(e) => setTheme({ bg: e.target.value })}
                          className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">HEX:</span>
                        <input
                          type="text"
                          value={theme.bg}
                          onChange={(e) => setTheme({ bg: e.target.value })}
                          className="w-32 px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-lg uppercase font-bold"
                        />
                      </div>

                      <div
                        className="p-3 rounded-lg flex items-center justify-between text-xs font-semibold transition-all border"
                        style={{
                          backgroundColor: theme.bg,
                          color: bgContrast,
                          borderColor: theme.border || '#E2E8F0',
                        }}
                      >
                        <span>Canvas Contrast Result:</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-current/30">
                          {bgContrast === '#FFFFFF' ? 'Dark Mode (Light Text)' : 'Light Mode (Dark Text)'}
                        </span>
                      </div>
                    </div>

                    {/* Surface / Card Background */}
                    <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-slate-900 block">Card & Surface Background</label>
                          <span className="text-[11px] text-slate-500">Data tables, modal dialogs, and cards</span>
                        </div>
                        <input
                          type="color"
                          value={theme.surface}
                          onChange={(e) => setTheme({ surface: e.target.value })}
                          className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">HEX:</span>
                        <input
                          type="text"
                          value={theme.surface}
                          onChange={(e) => setTheme({ surface: e.target.value })}
                          className="w-32 px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-lg uppercase font-bold"
                        />
                      </div>

                      <div
                        className="p-3 rounded-lg flex items-center justify-between text-xs font-semibold transition-all border"
                        style={{
                          backgroundColor: theme.surface,
                          color: surfaceContrast,
                          borderColor: theme.border || '#E2E8F0',
                        }}
                      >
                        <span>Surface Contrast Result:</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-current/30">
                          {surfaceContrast === '#FFFFFF' ? 'Light Text (#FFFFFF)' : 'Dark Text (#0F172A)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Typography Selector */}
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Type className="w-4 h-4 text-slate-600" />
                      Global Font Family
                    </label>
                    <select
                      value={theme.fontFamily}
                      onChange={(e) => setTheme({ fontFamily: e.target.value })}
                      className="w-full md:w-96 px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none font-medium bg-white"
                    >
                      {fontOptions.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      Updating this single option immediately changes typography across the whole application.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. ACCOUNT TAB */}
            {superAdminTab === 'account' && (
              <div className="space-y-8">
                {/* Account Profile Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Super Admin Profile</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Manage your administrative profile credentials and contact preferences.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={accountEmail}
                        onChange={(e) => setAccountEmail(e.target.value)}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Direct Phone
                      </label>
                      <input
                        type="text"
                        value={accountPhone}
                        onChange={(e) => setAccountPhone(e.target.value)}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Password & Security Form */}
                <form onSubmit={handlePasswordUpdate} className="pt-6 border-t border-slate-100 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#33077C]" />
                      Password & Security
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Keep your administrative account secure with a strong password and multi-factor authentication.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full h-11 pl-4 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                          aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full h-11 pl-4 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                          aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-[13px] font-medium text-slate-600 mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full h-11 pl-4 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-600" />
                        Two-Factor Authentication (2FA)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Requires an authenticator code (TOTP) on every login to ensure utmost security.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={twoFactorAuth}
                      onClick={() => setTwoFactorAuth(!twoFactorAuth)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        twoFactorAuth ? 'bg-[#33077C]' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          twoFactorAuth ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="h-10 px-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-[13px] font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      {isUpdatingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          <span>Update Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 4. PERMISSION & ROLE MANAGEMENT TAB */}
            {superAdminTab === 'permission' && (
              <div className="space-y-6">
                {/* Header & Add Role */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">Roles & Permissions</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure granular role permissions and module access across the platform.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenAddRole}
                    className="h-10 px-4 bg-[#33077C] hover:bg-[#432eb5] text-white text-xs sm:text-[13px] font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Add Role</span>
                  </button>
                </div>

                {/* Default Search Bar Component with Total Roles on Top Right */}
                <SearchBar
                  value={roleSearchQuery}
                  onChange={(val) => setRoleSearchQuery(val)}
                  placeholder="Search by role name, type, or status..."
                  onSubmit={(val) => setRoleSearchQuery(val)}
                  onReset={() => setRoleSearchQuery('')}
                  rightSlot={
                    <span className="text-xs sm:text-[13px] font-semibold text-slate-500 pr-2">
                      Total Roles :{' '}
                      <span className="text-[#33077C] font-bold">{filteredRoles.length}</span>
                    </span>
                  }
                  className="w-full !p-0 !border-0 !shadow-none !bg-transparent"
                />

                {/* Roles Table matching reference UI */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left border-collapse border border-slate-200 min-w-[750px]">
                    <thead>
                      <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">SERIAL NO</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">ROLE NAME</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">TYPE</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CREATED DATE</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ADMIN ACCESS</th>
                        <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {filteredRoles.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                            No roles found matching "{roleSearchQuery}".
                          </td>
                        </tr>
                      ) : (
                        filteredRoles.map((role) => (
                          <tr key={role.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-5 border border-slate-200 font-bold text-slate-800 text-xs sm:text-sm">{role.serialNo}</td>
                            <td className="py-4 px-5 border border-slate-200">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">{role.roleName}</span>
                            </td>
                            <td className="py-4 px-5 border border-slate-200">
                              <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                                {role.type}
                              </span>
                            </td>
                            <td className="py-4 px-5 border border-slate-200">
                              <div className="font-bold text-slate-900 text-xs">
                                {role.createdOn}
                              </div>
                              <span className="text-[11px] text-slate-400 block mt-0.5 font-normal">
                                Active Account
                              </span>
                            </td>
                            <td className="py-4 px-5 border border-slate-200 text-center">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {role.status}
                              </span>
                            </td>
                            <td className="py-4 px-5 border border-slate-200 text-center">
                              <span className={`text-xs sm:text-sm font-bold ${role.adminAccess ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {role.adminAccess ? 'True' : 'False'}
                              </span>
                            </td>
                            {/* 7. Action: Three Dots Dropdown */}
                            <td className="py-4 px-5 border border-slate-200 text-center relative">
                              <div className="inline-block text-left">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (activeRoleDropdownId === role.id) {
                                      setActiveRoleDropdownId(null);
                                      setRoleDropdownPos(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const spaceBelow = window.innerHeight - rect.bottom;
                                      const dropdownHeight = 180;

                                      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                        setRoleDropdownPos({
                                          bottom: window.innerHeight - rect.top + 6,
                                          right: window.innerWidth - rect.right,
                                        });
                                      } else {
                                        setRoleDropdownPos({
                                          top: rect.bottom + 6,
                                          right: window.innerWidth - rect.right,
                                        });
                                      }
                                      setActiveRoleDropdownId(role.id);
                                    }
                                  }}
                                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-[#33077C] hover:bg-[#432eb5] text-white shadow-xs active:scale-95"
                                  title="More Actions"
                                >
                                  <MoreVertical className="w-4 h-4 text-white" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Role Action Dropdown Menu Portal */}
                {activeRoleDropdownId && roleDropdownPos && (() => {
                  const targetRole = roleList.find((r) => r.id === activeRoleDropdownId);
                  if (!targetRole) return null;

                  return (
                    <>
                      <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => {
                          setActiveRoleDropdownId(null);
                          setRoleDropdownPos(null);
                        }}
                      />
                      <div
                        style={{
                          position: 'fixed',
                          ...(roleDropdownPos.bottom !== undefined
                            ? { bottom: `${roleDropdownPos.bottom}px` }
                            : { top: `${roleDropdownPos.top}px` }),
                          right: `${roleDropdownPos.right}px`,
                        }}
                        className="w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[9999] animate-in fade-in zoom-in-95 duration-100 text-left"
                      >
                        {/* 1. View */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRoleDropdownId(null);
                            setRoleDropdownPos(null);
                            handleOpenViewRole(targetRole);
                          }}
                          className="w-full px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                            <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                          <span className="font-semibold text-slate-800 text-[13px]">View</span>
                        </button>

                        {/* 2. Edit */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRoleDropdownId(null);
                            setRoleDropdownPos(null);
                            handleOpenEditRole(targetRole);
                          }}
                          className="w-full px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full bg-[#7C3AED] flex items-center justify-center text-white shrink-0 shadow-xs">
                            <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                          <span className="font-semibold text-slate-800 text-[13px]">Edit</span>
                        </button>

                        {/* 3. Delete */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRoleDropdownId(null);
                            setRoleDropdownPos(null);
                            handleDeleteRole(targetRole.id, targetRole.roleName);
                          }}
                          className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                          <span className="font-semibold text-rose-600 text-[13px]">Delete</span>
                        </button>
                      </div>
                    </>
                  );
                })()}

                {/* MODAL: VIEW / EDIT / ADD ROLE WITH MODULE ON/OFF BUTTONS */}
                {isRoleModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
                      {/* Modal Header exactly matching Add Organization */}
                      <div
                        className="flex items-center justify-between px-6 py-4.5 text-white shrink-0"
                        style={{ background: '#33077C' }}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setIsRoleModalOpen(false)}
                            className="p-1.5 -ml-1 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                            title="Go back"
                          >
                            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                          </button>
                          <div>
                            <h3 className="text-xl font-bold tracking-tight text-white">
                              {modalMode === 'view' ? 'View Role' : modalMode === 'edit' ? 'Edit Role' : 'Add Role'}
                            </h3>
                            <p className="text-xs sm:text-[13px] mt-0.5 text-white/90 font-medium">
                              Configure role profile, system permissions, and module access
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Modal Scrollable Body */}
                      <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-white">
                        {/* 3 Fields Per Row matching Reference Image */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* 1. Role Name */}
                          <div>
                            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                              Role Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              disabled={modalMode === 'view'}
                              value={formRoleName}
                              onChange={(e) => setFormRoleName(e.target.value)}
                              placeholder="Enter role name"
                              className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 disabled:bg-slate-50 disabled:text-slate-600 transition-all placeholder:text-slate-400"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">Enter role name</p>
                          </div>

                          {/* 2. Role Status */}
                          <div>
                            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                              Role Status <span className="text-rose-500">*</span>
                            </label>
                            <CustomSelect
                              value={formRoleStatus}
                              onChange={(val) => setFormRoleStatus(val as 'Active' | 'Inactive')}
                              options={[
                                { value: 'Active', label: 'Active' },
                                { value: 'Inactive', label: 'Inactive' },
                              ]}
                              placeholder="Select role status"
                              activeColor="brand"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">Set the active status for this role</p>
                          </div>

                          {/* 3. Admin Access */}
                          <div>
                            <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                              Admin Access <span className="text-rose-500">*</span>
                            </label>
                            <CustomSelect
                              value={formAdminAccess ? 'true' : 'false'}
                              onChange={(val) => setFormAdminAccess(val === 'true')}
                              options={[
                                { value: 'true', label: 'True' },
                                { value: 'false', label: 'False' },
                              ]}
                              placeholder="Select admin access"
                              activeColor="brand"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">Enable admin screens for employee login with this role</p>
                          </div>
                        </div>

                        {/* Section 2: Role Permissions Table with Checkboxes */}
                        <div className="space-y-4 pt-2 border-t border-slate-100">
                          {/* Permissions Table with Checkboxes and Header Background */}
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-[#f2f9ed] border-b border-slate-200 text-slate-800 font-bold text-[11px] uppercase tracking-wider">
                                  <th className="py-3.5 px-4 min-w-[200px] text-slate-800 font-extrabold">MODULE ACCESS</th>
                                  <th className="py-3.5 px-3 text-center text-slate-800 font-extrabold">ADD</th>
                                  <th className="py-3.5 px-3 text-center text-slate-800 font-extrabold">VIEW</th>
                                  <th className="py-3.5 px-3 text-center text-slate-800 font-extrabold">EDIT</th>
                                  <th className="py-3.5 px-3 text-center text-slate-800 font-extrabold">DELETE</th>
                                  <th className="py-3.5 px-3 text-center text-slate-800 font-extrabold">APPROVAL</th>
                                  <th className="py-3.5 px-3 text-center text-slate-800 font-extrabold">ALL ACCESS</th>
                                  <th className="py-3.5 px-3 text-center text-slate-800 font-extrabold">NO ACCESS</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                                {formModulePermissions.map((mod) => {
                                  const allActionsEnabled =
                                    mod.actions.add &&
                                    mod.actions.view &&
                                    mod.actions.edit &&
                                    mod.actions.delete &&
                                    mod.actions.approval;

                                  const noActionsEnabled =
                                    !mod.actions.add &&
                                    !mod.actions.view &&
                                    !mod.actions.edit &&
                                    !mod.actions.delete &&
                                    !mod.actions.approval;

                                  const isSub = Boolean(mod.isSubModule);

                                  return (
                                    <tr
                                      key={mod.moduleId}
                                      className={`transition-colors ${
                                        !isSub
                                          ? 'bg-slate-50/80 font-bold border-t border-slate-200'
                                          : 'hover:bg-slate-50/50 bg-white'
                                      }`}
                                    >
                                      {/* Module Name with Distinct Sub-Module Tree Styling */}
                                      <td className={`py-3 px-4 ${isSub ? 'pl-10' : 'pl-4'}`}>
                                        <div className="flex items-center gap-2">
                                          {isSub ? (
                                            <span className="text-slate-300 font-mono text-xs select-none">↳</span>
                                          ) : (
                                            <span className="w-2 h-2 rounded-full bg-[#33077C]" />
                                          )}
                                          <span
                                            className={`text-xs ${
                                              !isSub
                                                ? 'font-bold text-slate-900 tracking-wide uppercase'
                                                : 'font-medium text-slate-700'
                                            }`}
                                          >
                                            {mod.moduleName}
                                          </span>
                                        </div>
                                      </td>

                                      {/* ADD Checkbox */}
                                      <td className="py-3 px-3 text-center">
                                        <label className="inline-flex items-center justify-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={mod.actions.add}
                                            onChange={() => handleToggleModuleAction(mod.moduleId, 'add')}
                                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]/20 accent-[#33077C] cursor-pointer"
                                          />
                                        </label>
                                      </td>

                                      {/* VIEW Checkbox */}
                                      <td className="py-3 px-3 text-center">
                                        <label className="inline-flex items-center justify-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={mod.actions.view}
                                            onChange={() => handleToggleModuleAction(mod.moduleId, 'view')}
                                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]/20 accent-[#33077C] cursor-pointer"
                                          />
                                        </label>
                                      </td>

                                      {/* EDIT Checkbox */}
                                      <td className="py-3 px-3 text-center">
                                        <label className="inline-flex items-center justify-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={mod.actions.edit}
                                            onChange={() => handleToggleModuleAction(mod.moduleId, 'edit')}
                                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]/20 accent-[#33077C] cursor-pointer"
                                          />
                                        </label>
                                      </td>

                                      {/* DELETE Checkbox */}
                                      <td className="py-3 px-3 text-center">
                                        <label className="inline-flex items-center justify-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={mod.actions.delete}
                                            onChange={() => handleToggleModuleAction(mod.moduleId, 'delete')}
                                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]/20 accent-[#33077C] cursor-pointer"
                                          />
                                        </label>
                                      </td>

                                      {/* APPROVAL Checkbox */}
                                      <td className="py-3 px-3 text-center">
                                        <label className="inline-flex items-center justify-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={mod.actions.approval}
                                            onChange={() => handleToggleModuleAction(mod.moduleId, 'approval')}
                                            className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C]/20 accent-[#33077C] cursor-pointer"
                                          />
                                        </label>
                                      </td>

                                      {/* ALL ACCESS Checkbox */}
                                      <td className="py-3 px-3 text-center">
                                        <label className="inline-flex items-center justify-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={allActionsEnabled}
                                            onChange={() => handleToggleAllAccess(mod.moduleId, !allActionsEnabled)}
                                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600/20 accent-emerald-600 cursor-pointer"
                                          />
                                        </label>
                                      </td>

                                      {/* NO ACCESS Checkbox */}
                                      <td className="py-3 px-3 text-center">
                                        <label className="inline-flex items-center justify-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={noActionsEnabled}
                                            onChange={() => handleToggleAllAccess(mod.moduleId, false)}
                                            className="w-4 h-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500/20 accent-rose-500 cursor-pointer"
                                          />
                                        </label>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Modal Footer Actions matching 2nd Reference Image */}
                      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-white">
                        <button
                          type="button"
                          onClick={() => setIsRoleModalOpen(false)}
                          className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
                        >
                          <X className="w-4 h-4 text-slate-500" />
                          <span>Cancel</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveRoleModal}
                          className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. STAFF TAB */}
            {superAdminTab === 'staff' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Super Admin Administrative Staff</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Platform engineers, support personnel, and security officers with administrative rights.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(true)}
                    className="h-10 px-4 bg-[#33077C] hover:bg-[#432eb5] text-white text-xs sm:text-[13px] font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Add Staff Member</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4">Member Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role / Department</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                      {staffMembers.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                {m.name.substring(0, 2).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-900 text-xs sm:text-[13px]">{m.name}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 font-medium">{m.email}</td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800">{m.role}</div>
                            <div className="text-[11px] text-slate-400 font-normal">{m.department}</div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {m.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {m.email !== 'superadmin@gmail.com' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(m.id, m.name)}
                                className="w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Remove staff"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Add Staff Modal */}
        {isStaffModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Add Platform Staff</h3>
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddStaff} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs sm:text-[13px] outline-none focus:border-[#33077C]"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs sm:text-[13px] outline-none focus:border-[#33077C]"
                    placeholder="e.g. john.doe@platform.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Role Title</label>
                    <input
                      type="text"
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs sm:text-[13px] outline-none focus:border-[#33077C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
                    <input
                      type="text"
                      value={newStaffDept}
                      onChange={(e) => setNewStaffDept(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs sm:text-[13px] outline-none focus:border-[#33077C]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#33077C] hover:bg-[#432eb5] text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // STANDARD ADMIN LAYOUT (UNCHANGED)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-brand">
            System Settings & Enterprise Configuration
          </h2>
          <p className="text-xs text-slate-500">
            Brand styling, automated contrast colors, global font family, and organization profiles.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={resetTheme}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Reset theme and colors to default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Colors
          </button>

          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-accent text-accent-contrast text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'account', label: 'My Account', icon: User },
          { id: 'branding', label: 'Theme, Colors & Typography', icon: Palette },
          { id: 'company', label: 'Company Profile', icon: Building2 },
          { id: 'reminders', label: 'Automated Reminders & SLA', icon: Bell },
          { id: 'backup', label: 'Data Management & Export', icon: Database },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-brand text-primary-contrast shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: MY ACCOUNT */}
      {activeTab === 'account' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-8">
          {/* Account Profile Details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-brand">Account Profile</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your administrative credentials, contact details, and account preferences.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Direct Phone
                </label>
                <input
                  type="text"
                  value={accountPhone}
                  onChange={(e) => setAccountPhone(e.target.value)}
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Password & Security Form */}
          <form onSubmit={handlePasswordUpdate} className="pt-6 border-t border-slate-100 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-brand flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand" />
                Password & Security
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Keep your account secure with a strong password and multi-factor authentication.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-10 pl-3.5 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-10 pl-3.5 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 pl-3.5 pr-10 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Two-Factor Authentication (2FA)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Requires an authenticator code (TOTP) on every login to ensure utmost security.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={twoFactorAuth}
                onClick={() => setTwoFactorAuth(!twoFactorAuth)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  twoFactorAuth ? 'bg-brand' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    twoFactorAuth ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="h-10 px-5 bg-brand text-primary-contrast text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT: THEME & BRANDING */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          {/* 1-Click Curated Presets */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  1-Click Color & Theme Presets
                </h3>
                <p className="text-xs text-slate-500">
                  Select a curated palette or customize every individual color with automated contrast below.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {presets.map((p) => {
                const isSelected =
                  theme.primary.toLowerCase() === p.theme.primary.toLowerCase() &&
                  theme.bg.toLowerCase() === p.theme.bg.toLowerCase();

                return (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">{p.name}</span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{p.description}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-5 h-5 rounded-md border border-slate-200 shadow-2xs"
                          style={{ backgroundColor: p.theme.primary }}
                          title={`Primary: ${p.theme.primary}`}
                        />
                        <span
                          className="w-5 h-5 rounded-md border border-slate-200 shadow-2xs"
                          style={{ backgroundColor: p.theme.accent }}
                          title={`Accent: ${p.theme.accent}`}
                        />
                        <span
                          className="w-5 h-5 rounded-md border border-slate-200 shadow-2xs"
                          style={{ backgroundColor: p.theme.bg }}
                          title={`Canvas Background: ${p.theme.bg}`}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 ml-auto">
                        {p.theme.primary}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Centralized Color Controls with Live Contrast Text Feedback */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Custom Color Calibration & Contrast Engine</h3>
              <p className="text-xs text-slate-500">
                Change any color in one place. The system computes WCAG relative luminance and automatically sets contrast text (like MUI contrast text).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Color Card */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-900 block">Primary Brand Color</label>
                    <span className="text-[11px] text-slate-500">Sidebar, major headings & brand badges</span>
                  </div>
                  <input
                    type="color"
                    value={theme.primary}
                    onChange={(e) => setTheme({ primary: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">HEX:</span>
                  <input
                    type="text"
                    value={theme.primary}
                    onChange={(e) => setTheme({ primary: e.target.value })}
                    className="w-32 px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-lg uppercase font-bold"
                  />
                </div>

                {/* Auto Contrast Indicator */}
                <div
                  className="p-3 rounded-lg flex items-center justify-between text-xs font-semibold transition-all shadow-2xs"
                  style={{
                    backgroundColor: theme.primary,
                    color: primaryContrast,
                  }}
                >
                  <span>Auto Contrast Result:</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-current/30">
                    {primaryContrast === '#FFFFFF' ? 'Light Text (#FFFFFF)' : 'Dark Text (#0F172A)'}
                  </span>
                </div>
              </div>

              {/* Accent Color Card */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-900 block">Accent / Action Color</label>
                    <span className="text-[11px] text-slate-500">Buttons, active tabs, alerts & highlights</span>
                  </div>
                  <input
                    type="color"
                    value={theme.accent}
                    onChange={(e) => setTheme({ accent: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">HEX:</span>
                  <input
                    type="text"
                    value={theme.accent}
                    onChange={(e) => setTheme({ accent: e.target.value })}
                    className="w-32 px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-lg uppercase font-bold"
                  />
                </div>

                {/* Auto Contrast Indicator */}
                <div
                  className="p-3 rounded-lg flex items-center justify-between text-xs font-semibold transition-all shadow-2xs"
                  style={{
                    backgroundColor: theme.accent,
                    color: accentContrast,
                  }}
                >
                  <span>Auto Contrast Result:</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-current/30">
                    {accentContrast === '#FFFFFF' ? 'Light Text (#FFFFFF)' : 'Dark Text (#0F172A)'}
                  </span>
                </div>
              </div>

              {/* Main Canvas Background */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-900 block">Canvas Background</label>
                    <span className="text-[11px] text-slate-500">Main viewport and page backdrop</span>
                  </div>
                  <input
                    type="color"
                    value={theme.bg}
                    onChange={(e) => setTheme({ bg: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">HEX:</span>
                  <input
                    type="text"
                    value={theme.bg}
                    onChange={(e) => setTheme({ bg: e.target.value })}
                    className="w-32 px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-lg uppercase font-bold"
                  />
                </div>

                <div
                  className="p-3 rounded-lg flex items-center justify-between text-xs font-semibold transition-all border"
                  style={{
                    backgroundColor: theme.bg,
                    color: bgContrast,
                    borderColor: theme.border || '#E2E8F0',
                  }}
                >
                  <span>Canvas Contrast Result:</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-current/30">
                    {bgContrast === '#FFFFFF' ? 'Dark Mode (Light Text)' : 'Light Mode (Dark Text)'}
                  </span>
                </div>
              </div>

              {/* Surface / Card Background */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-900 block">Card & Surface Background</label>
                    <span className="text-[11px] text-slate-500">Data tables, modal dialogs, and cards</span>
                  </div>
                  <input
                    type="color"
                    value={theme.surface}
                    onChange={(e) => setTheme({ surface: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">HEX:</span>
                  <input
                    type="text"
                    value={theme.surface}
                    onChange={(e) => setTheme({ surface: e.target.value })}
                    className="w-32 px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-lg uppercase font-bold"
                  />
                </div>

                <div
                  className="p-3 rounded-lg flex items-center justify-between text-xs font-semibold transition-all border"
                  style={{
                    backgroundColor: theme.surface,
                    color: surfaceContrast,
                    borderColor: theme.border || '#E2E8F0',
                  }}
                >
                  <span>Surface Contrast Result:</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-current/30">
                    {surfaceContrast === '#FFFFFF' ? 'Light Text (#FFFFFF)' : 'Dark Text (#0F172A)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Typography Selector */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-slate-600" />
                Global Font Family
              </label>
              <select
                value={theme.fontFamily}
                onChange={(e) => setTheme({ fontFamily: e.target.value })}
                className="w-full md:w-96 px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none font-medium bg-white"
              >
                {fontOptions.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Updating this single option immediately changes typography across the whole application.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: COMPANY PROFILE */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-brand">Organization Profile</h3>
            <p className="text-xs text-slate-500">General business identity used on customer invoices and reports.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company Legal Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Support Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Billing Inquiries Email</label>
              <input
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Direct Phone</label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: REMINDERS & SLA */}
      {activeTab === 'reminders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-brand">Automated Reminder Automation Engine</h3>
            <p className="text-xs text-slate-500">Configure trigger conditions for automated notifications across products and agency clients.</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Lead Follow-up Schedule Window</h4>
                <p className="text-xs text-slate-500">Trigger follow-up reminder after lead ingestion</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={leadFollowUpDays}
                  onChange={(e) => setLeadFollowUpDays(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs border border-slate-300 rounded-lg text-center font-bold"
                />
                <span className="text-xs text-slate-600">days</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Payment Due Notice Window</h4>
                <p className="text-xs text-slate-500">Generate invoice reminder alert prior to invoice due date</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={paymentDueReminderDays}
                  onChange={(e) => setPaymentDueReminderDays(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs border border-slate-300 rounded-lg text-center font-bold"
                />
                <span className="text-xs text-slate-600">days</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Subscription Renewal Alert Window</h4>
                <p className="text-xs text-slate-500">Trigger renewal reminder before SaaS contract or Retainer expires</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={subscriptionExpiryDays}
                  onChange={(e) => setSubscriptionExpiryDays(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs border border-slate-300 rounded-lg text-center font-bold"
                />
                <span className="text-xs text-slate-600">days</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BACKUP */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-brand">Data Portability & Database Archival</h3>
            <p className="text-xs text-slate-500">Export JSON state of products, customers, leads, payments, and marketing content.</p>
          </div>

          <div className="p-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Full System Snapshot</h4>
              <p className="text-xs text-slate-500 mt-0.5">Includes all product records, customer relationships, content calendar, and billing log.</p>
            </div>

            <button
              onClick={handleExportDatabase}
              className="px-4 py-2 bg-brand text-primary-contrast text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Snapshot (.JSON)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
