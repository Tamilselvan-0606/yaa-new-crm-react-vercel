import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Boxes,
  UsersRound,
  Building2,
  Film,
  CheckSquare,
  CreditCard,
  Repeat,
  Bell,
  BarChart3,
  ChevronDown,
  X,
  PlusCircle,
  Receipt,
  FileText,
  FileSpreadsheet,
  Layers,
  Sparkles,
  GitBranch,
  ShoppingBag,
  RotateCcw,
  ShoppingCart,
  Package,
  FolderTree,
  Tag,
  Warehouse,
  Truck,
  FilePlus,
  ArrowDownLeft,
  Clock,
} from 'lucide-react';

interface SubNavItem {
  id: string;
  path?: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: string;
  count?: number;
  children?: SubNavItem[];
}

interface NavItem {
  id: string;
  path?: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  adminOnly?: boolean;
  badge?: string;
  count?: number;
  children?: SubNavItem[];
}

interface SidebarProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen = true,
  onClose,
  collapsed = false,
}) => {
  const { currentUser, role, isAdmin, isSuperAdmin, isOrgSuperAdmin, unreadRemindersCount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isTasksRouteActive =
    location.pathname.startsWith('/content') ||
    location.pathname.startsWith('/tasks') ||
    currentTab === 'content' ||
    currentTab === 'tasks';

  const isSalesRouteActive =
    location.pathname.startsWith('/sales') ||
    location.pathname.startsWith('/customers') ||
    currentTab === 'customers' ||
    currentTab === 'new-sale' ||
    currentTab === 'sales-invoices';

  const isProformaRouteActive =
    location.pathname.startsWith('/proforma') ||
    currentTab === 'new-proforma-invoice' ||
    currentTab === 'proforma-invoices';

  const isSaleManagementRouteActive =
    location.pathname.startsWith('/sale-management');

  const isBillingPartiesRouteActive =
    location.pathname.startsWith('/sale-management/sales/customer') ||
    location.pathname.startsWith('/sale-management/purchase/supplier') ||
    location.pathname.startsWith('/customers');

  const isBillingInventoryRouteActive =
    location.pathname.startsWith('/sale-management/inventory');

  const isBillingSalesRouteActive =
    location.pathname.startsWith('/sale-management/sales/sale') ||
    location.pathname.startsWith('/sale-management/sales/quotation') ||
    location.pathname.startsWith('/sale-management/sales/estimate') ||
    location.pathname.startsWith('/sale-management/sales/proforma') ||
    location.pathname.startsWith('/sale-management/sales/sale-order') ||
    location.pathname.startsWith('/sale-management/sales/order') ||
    location.pathname.startsWith('/sale-management/sales/delivery-challan') ||
    location.pathname.startsWith('/sale-management/sales/challan') ||
    location.pathname.startsWith('/sale-management/sales/payment-in') ||
    location.pathname.startsWith('/sale-management/sales/return');

  const isBillingPurchaseRouteActive =
    location.pathname.startsWith('/sale-management/purchase/purchase') ||
    location.pathname.startsWith('/sale-management/purchase/request') ||
    location.pathname.startsWith('/sale-management/purchase/return');

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'tasks-group': isTasksRouteActive,
    'sales-group': isSalesRouteActive,
    'proforma-group': isProformaRouteActive,
    'sale-management-group': isSaleManagementRouteActive,
    'sm-inventory': location.pathname.startsWith('/sale-management/inventory'),
    'sm-sales-hub': location.pathname.startsWith('/sale-management/sales'),
    'sm-purchase': location.pathname.startsWith('/sale-management/purchase'),
    'billing-parties-group': isBillingPartiesRouteActive,
    'billing-inventory-group': isBillingInventoryRouteActive,
    'billing-sales-group': isBillingSalesRouteActive,
    'billing-purchase-group': isBillingPurchaseRouteActive,
  });

  useEffect(() => {
    if (isTasksRouteActive) {
      setOpenGroups((prev) => ({ ...prev, 'tasks-group': true }));
    }
  }, [isTasksRouteActive]);

  useEffect(() => {
    if (isSalesRouteActive) {
      setOpenGroups((prev) => ({ ...prev, 'sales-group': true }));
    }
  }, [isSalesRouteActive]);

  useEffect(() => {
    if (isProformaRouteActive) {
      setOpenGroups((prev) => ({ ...prev, 'proforma-group': true }));
    }
  }, [isProformaRouteActive]);

  useEffect(() => {
    if (isSaleManagementRouteActive) {
      setOpenGroups((prev) => ({
        ...prev,
        'sale-management-group': true,
        'sm-inventory': location.pathname.startsWith('/sale-management/inventory') ? true : prev['sm-inventory'],
        'sm-sales-hub': location.pathname.startsWith('/sale-management/sales') ? true : prev['sm-sales-hub'],
        'sm-purchase': location.pathname.startsWith('/sale-management/purchase') ? true : prev['sm-purchase'],
      }));
    }
  }, [isSaleManagementRouteActive, location.pathname]);

  useEffect(() => {
    setOpenGroups((prev) => ({
      ...prev,
      'billing-parties-group': isBillingPartiesRouteActive ? true : prev['billing-parties-group'],
      'billing-inventory-group': isBillingInventoryRouteActive ? true : prev['billing-inventory-group'],
      'billing-sales-group': isBillingSalesRouteActive ? true : prev['billing-sales-group'],
      'billing-purchase-group': isBillingPurchaseRouteActive ? true : prev['billing-purchase-group'],
    }));
  }, [isBillingPartiesRouteActive, isBillingInventoryRouteActive, isBillingSalesRouteActive, isBillingPurchaseRouteActive, location.pathname]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const saleManagementSubModules: SubNavItem[] = [
    {
      id: 'sm-inventory',
      label: 'Inventory',
      icon: Package,
      children: [
        { id: 'inventory-category', path: '/sale-management/inventory/category', label: 'Category', icon: Tag },
        { id: 'inventory-subcategory', path: '/sale-management/inventory/subcategory', label: 'Subcategory', icon: FolderTree },
        { id: 'inventory-products', path: '/sale-management/inventory/products', label: 'Products', icon: Boxes },
        { id: 'inventory-stocks', path: '/sale-management/inventory/stocks', label: 'Stocks', icon: Warehouse },
      ],
    },
    {
      id: 'sm-sales-hub',
      label: 'Sales Hub',
      icon: ShoppingCart,
      children: [
        { id: 'sales-hub-customer', path: '/sale-management/sales/customer', label: 'Customer', icon: UsersRound },
        { id: 'sales-hub-quotation', path: '/sale-management/sales/quotation', label: 'Estimate / Quotation', icon: FileSpreadsheet },
        { id: 'sales-hub-proforma', path: '/sale-management/sales/proforma', label: 'Proforma Invoice', icon: FileText },
        { id: 'sales-hub-order', path: '/sale-management/sales/sale-order', label: 'Sales Order', icon: ShoppingBag },
        { id: 'sales-hub-challan', path: '/sale-management/sales/delivery-challan', label: 'Delivery Challan', icon: Truck },
        { id: 'sales-hub-sales', path: '/sale-management/sales/sale', label: 'Sales Invoice', icon: ShoppingCart },
        { id: 'sales-hub-payment-in', path: '/sale-management/sales/payment-in', label: 'Payment-In', icon: CreditCard },
        { id: 'sales-hub-returns', path: '/sale-management/sales/return', label: 'Sales Return / Credit Note', icon: RotateCcw },
      ],
    },
    {
      id: 'sm-purchase',
      label: 'Purchase',
      icon: Truck,
      children: [
        { id: 'purchase-supplier', path: '/sale-management/purchase/supplier', label: 'Supplier', icon: UsersRound },
        { id: 'purchase-request', path: '/sale-management/purchase/request', label: 'Purchase Request', icon: FilePlus },
        { id: 'purchase-order', path: '/sale-management/purchase/purchase', label: 'Purchase Bills', icon: ShoppingBag },
        { id: 'purchase-returns', path: '/sale-management/purchase/return', label: 'Purchase Return', icon: ArrowDownLeft },
        { id: 'purchase-payment-out', path: '/sale-management/purchase/payment-out', label: 'Payment Out', icon: CreditCard },
        { id: 'purchase-expense', path: '/sale-management/purchase/expense', label: 'Expense', icon: Receipt },
      ],
    },
    {
      id: 'sm-reports',
      path: '/sale-management/reports',
      label: 'Reports',
      icon: BarChart3,
    },
  ];

  // Active Organization Type Detection
  const getActiveOrgType = (): string => {
    if (isOrgSuperAdmin) {
      const savedType = localStorage.getItem('active_org_type_orgsuperadmin');
      if (savedType) return savedType;
      const activeOrg = localStorage.getItem('active_organization_orgsuperadmin') || '';
      if (['fts academy', 'fyndus academy', 'polihills'].includes(activeOrg.toLowerCase())) {
        return 'Sales Management';
      }
      return 'Client Management';
    }
    const activeOrg = localStorage.getItem('active_organization') || '';
    if (['polihills', 'fts academy', 'fyndus academy'].includes(activeOrg.toLowerCase())) {
      return 'Sales Management';
    }
    const savedCatalog = localStorage.getItem('organizations_catalog');
    if (savedCatalog) {
      try {
        const parsed = JSON.parse(savedCatalog);
        const found = parsed.find((o: any) => o.name?.toLowerCase() === activeOrg.toLowerCase());
        if (found?.organizationType) return found.organizationType;
      } catch {}
    }
    return 'Client Management';
  };

  const [activeOrgType, setActiveOrgType] = useState<string>(getActiveOrgType);

  useEffect(() => {
    const handleOrgTypeChange = (e: any) => {
      if (e?.detail) {
        setActiveOrgType(typeof e.detail === 'string' ? e.detail : e.detail.organizationType || getActiveOrgType());
      } else {
        setActiveOrgType(getActiveOrgType());
      }
    };

    const handleOrgChange = (e: any) => {
      if (e?.detail?.organizationType) {
        setActiveOrgType(e.detail.organizationType);
      } else {
        setActiveOrgType(getActiveOrgType());
      }
    };

    window.addEventListener('orgTypeChanged', handleOrgTypeChange);
    window.addEventListener('orgChanged', handleOrgChange);
    window.addEventListener('storage', handleOrgTypeChange);

    return () => {
      window.removeEventListener('orgTypeChanged', handleOrgTypeChange);
      window.removeEventListener('orgChanged', handleOrgChange);
      window.removeEventListener('storage', handleOrgTypeChange);
    };
  }, [isOrgSuperAdmin]);

  // Billing Software Specialized Module Groups for Sales Management
  const billingPartiesGroup: NavItem = {
    id: 'billing-parties-group',
    label: 'Parties',
    icon: UsersRound,
    children: [
      { id: 'billing-customers', path: '/sale-management/sales/customer', label: 'Customers', icon: UsersRound },
      { id: 'billing-suppliers', path: '/sale-management/purchase/supplier', label: 'Suppliers', icon: Truck },
    ],
  };

  const billingInventoryGroup: NavItem = {
    id: 'billing-inventory-group',
    label: 'Items & Inventory',
    icon: Package,
    children: [
      { id: 'billing-products', path: '/sale-management/inventory/products', label: 'Items & Products', icon: Boxes },
      { id: 'billing-stocks', path: '/sale-management/inventory/stocks', label: 'Stock Summary', icon: Warehouse },
      { id: 'billing-category', path: '/sale-management/inventory/category', label: 'Categories', icon: Tag },
      { id: 'billing-subcategory', path: '/sale-management/inventory/subcategory', label: 'Subcategories', icon: FolderTree },
    ],
  };

  const billingSalesGroup: NavItem = {
    id: 'billing-sales-group',
    label: 'Sales & Invoices',
    icon: ShoppingCart,
    children: [
      { id: 'billing-customers', path: '/sale-management/sales/customer', label: 'Customer', icon: UsersRound },
      { id: 'billing-quotes', path: '/sale-management/sales/quotation', label: 'Estimate / Quotation', icon: FileSpreadsheet },
      { id: 'billing-proforma', path: '/sale-management/sales/proforma', label: 'Proforma Invoice', icon: FileText },
      { id: 'billing-sale-order', path: '/sale-management/sales/sale-order', label: 'Sales Order', icon: ShoppingBag },
      { id: 'billing-challan', path: '/sale-management/sales/delivery-challan', label: 'Delivery Challan', icon: Truck },
      { id: 'billing-sales-list', path: '/sale-management/sales/sale', label: 'Sales Invoice', icon: Receipt },
      { id: 'billing-payment-in', path: '/sale-management/sales/payment-in', label: 'Payment-In', icon: CreditCard },
      { id: 'billing-sales-returns', path: '/sale-management/sales/return', label: 'Sales Return / Credit Note', icon: RotateCcw },
    ],
  };

  const billingPurchaseGroup: NavItem = {
    id: 'billing-purchase-group',
    label: 'Purchase & Bills',
    icon: ShoppingBag,
    children: [
      { id: 'billing-purchase-bills', path: '/sale-management/purchase/purchase', label: 'Purchase Bills', icon: ShoppingBag },
      { id: 'billing-purchase-request', path: '/sale-management/purchase/request', label: 'Purchase Orders / Req', icon: FilePlus },
      { id: 'billing-purchase-returns', path: '/sale-management/purchase/return', label: 'Purchase Return (Debit Note)', icon: ArrowDownLeft },
      { id: 'billing-purchase-expense', path: '/sale-management/purchase/expense', label: 'Expense', icon: Receipt },
    ],
  };

  // Sales Management (Billing Software Suite) Navigation Items
  const salesManagementNavItems: NavItem[] = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard },
    ...(isOrgSuperAdmin
      ? [{ id: 'organization', path: '/organization', label: 'Sub Organization', icon: Building2 }]
      : []),
    { id: 'branches', path: '/branches', label: 'Branches', icon: GitBranch, adminOnly: true },
    billingPartiesGroup,
    billingInventoryGroup,
    billingSalesGroup,
    billingPurchaseGroup,
    { id: 'pending-dues', path: '/pending-dues', label: 'Pending Dues & Aging', icon: Clock },
    { id: 'payments', path: '/payments', label: 'Payments & Receipts', icon: CreditCard },
    { id: 'reports', path: '/sale-management/reports', label: 'Reports & GST', icon: BarChart3 },
    { id: 'reminders', path: '/reminders', label: 'Reminders', icon: Bell, count: unreadRemindersCount },
  ];

  // Client Management Suite Menu Items (Includes Client Management + Sale Management)
  const clientManagementNavItems: NavItem[] = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    ...(isOrgSuperAdmin
      ? [{ id: 'organization', path: '/organization', label: 'Sub Organization', icon: Building2 }]
      : []),
    { id: 'branches', path: '/branches', label: 'Branches', icon: GitBranch, adminOnly: true },
    { id: 'products', path: '/products', label: 'Products', icon: Boxes, adminOnly: false },
    { id: 'leads', path: '/leads', label: 'Clients & leads', icon: UsersRound, adminOnly: false },
    { id: 'quotes', path: '/quotes', label: 'Quotations', icon: FileText, adminOnly: false },
    {
      id: 'proforma-group',
      label: 'Proforma Invoices',
      icon: FileSpreadsheet,
      adminOnly: false,
      children: [
        { id: 'new-proforma-invoice', path: '/proforma/new', label: 'New Proforma Invoice', icon: PlusCircle },
        { id: 'proforma-invoices', path: '/proforma/invoices', label: 'Proforma Invoices', icon: Receipt },
      ],
    },
    {
      id: 'sales-group',
      label: 'Invoices',
      icon: Building2,
      adminOnly: false,
      children: [
        { id: 'new-sale', path: '/sales/new', label: 'New Invoice', icon: PlusCircle },
        { id: 'sales-invoices', path: '/sales/invoices', label: 'Invoices', icon: Receipt },
      ],
    },
    {
      id: 'tasks-group',
      label: 'Work Management',
      icon: CheckSquare,
      adminOnly: false,
      children: [
        { id: 'content', path: '/content', label: 'Content Planner', icon: Film },
        { id: 'tasks', path: '/tasks', label: "Today's Tasks", icon: CheckSquare },
      ],
    },
    { id: 'payments', path: '/payments', label: 'Payments', icon: CreditCard, adminOnly: false },
    { id: 'subscriptions', path: '/subscriptions', label: 'Subscriptions', icon: Repeat, adminOnly: false },
    { id: 'reminders', path: '/reminders', label: 'Reminders', icon: Bell, adminOnly: false, count: unreadRemindersCount },
    { id: 'reports', path: '/reports', label: 'Reports & Analytics', icon: BarChart3, adminOnly: true },
    {
      id: 'sale-management-group',
      label: 'Sale Management',
      icon: ShoppingBag,
      adminOnly: false,
      children: saleManagementSubModules,
    },
    {
      id: 'pending-dues',
      path: '/pending-dues',
      label: 'Pending Dues',
      icon: Clock,
      adminOnly: false,
    },
  ];

  // Specific navigation modules for Super Admin:
  // Order: Dashboard, Organization, Quotes, Proforma Invoices, Invoices, Subscription Plans, Organization Subscriptions
  const superAdminNavItems: NavItem[] = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'organization', path: '/organization', label: 'Organizations', icon: Building2 },
    { id: 'quotes', path: '/quotes', label: 'Quotations', icon: FileText },
    {
      id: 'proforma-group',
      label: 'Proforma Invoices',
      icon: FileSpreadsheet,
      children: [
        { id: 'new-proforma-invoice', path: '/proforma/new', label: 'New Proforma Invoice', icon: PlusCircle },
        { id: 'proforma-invoices', path: '/proforma/invoices', label: 'Proforma Invoices', icon: Receipt },
      ],
    },
    {
      id: 'sales-group',
      label: 'Invoices',
      icon: Building2,
      children: [
        { id: 'new-sale', path: '/sales/new', label: 'New Invoice', icon: PlusCircle },
        { id: 'sales-invoices', path: '/sales/invoices', label: 'Invoices', icon: Receipt },
      ],
    },
    { id: 'subscription-plans', path: '/subscription-plans', label: 'Subscription Plans', icon: Sparkles },
    { id: 'organization-subscriptions', path: '/organization-subscriptions', label: 'Organization Subscriptions', icon: Repeat },
  ];

  const isBranchAdmin = currentUser?.email?.toLowerCase() === 'branchadmin@gmail.com';
  const isSubOrgAdmin = currentUser?.email?.toLowerCase() === 'suborgadmin@gmail.com' || currentUser?.email?.toLowerCase() === 'yaaadmin@gmail.com';
  const isOrgAdminUser = isOrgSuperAdmin || currentUser?.email?.toLowerCase() === 'orgadmin@gmail.com';
  const isStaffUser = role === 'STAFF' || (!isAdmin && !isSuperAdmin && !isOrgSuperAdmin);

  // Dynamic visible items based on logged in user role & organization type
  const getRoleBasedItems = (): NavItem[] => {
    // 1. Super Admin: Full multi-tenant governance, root licensing, quotations, proforma, and global subscriptions
    if (isSuperAdmin) {
      return superAdminNavItems;
    }

    // 2. Organisation Admin: Multi-branch, Sub-organizations, and complete Client / Sales ERP suites
    if (isOrgAdminUser) {
      return activeOrgType.toLowerCase() === 'sales management'
        ? salesManagementNavItems
        : clientManagementNavItems;
    }

    // 3. Sub Organisation Admin (e.g. Yaa Creations / Company Admin): Company CRM, leads, quotes, invoices, tasks, inventory
    if (isSubOrgAdmin) {
      const items = activeOrgType.toLowerCase() === 'sales management'
        ? salesManagementNavItems
        : clientManagementNavItems;
      return items.filter((item) => item.id !== 'organization');
    }

    // 4. Branch Admin: Location-scoped leads, quotes, invoices, inventory, payments, reminders
    if (isBranchAdmin) {
      const items = activeOrgType.toLowerCase() === 'sales management'
        ? salesManagementNavItems
        : clientManagementNavItems;
      return items.filter((item) => item.id !== 'organization' && item.id !== 'branches');
    }

    // 5. Staff / Sales Executive: Operational execution (Dashboard, Leads, Quotes, Invoices, Tasks, Inventory)
    if (isStaffUser) {
      const staffAllowedIds = [
        'dashboard',
        'leads',
        'quotes',
        'proforma-group',
        'sales-group',
        'tasks-group',
        'products',
        'billing-parties-group',
        'billing-inventory-group',
        'billing-sales-group',
        'sale-management-group',
        'reminders',
        'pending-dues',
      ];
      const items = activeOrgType.toLowerCase() === 'sales management'
        ? salesManagementNavItems
        : clientManagementNavItems;
      return items.filter((item) => staffAllowedIds.includes(item.id) && !item.adminOnly);
    }

    // Default Fallback
    return activeOrgType.toLowerCase() === 'sales management'
      ? salesManagementNavItems
      : clientManagementNavItems;
  };

  const visibleItems = getRoleBasedItems();

  const isCurrentActive = (item: NavItem | SubNavItem): boolean => {
    if (item.children && item.children.length > 0) {
      return item.children.some((child) => isCurrentActive(child));
    }
    if (currentTab) {
      return currentTab === item.id;
    }
    if (item.path === '/') {
      return location.pathname === '/';
    }
    if (item.id === 'new-proforma-invoice') {
      return location.pathname === '/proforma/new' || location.pathname === '/proforma';
    }
    if (item.id === 'proforma-invoices') {
      return location.pathname === '/proforma/invoices';
    }
    if (item.id === 'new-sale') {
      return location.pathname === '/sales/new' || location.pathname === '/sales';
    }
    if (item.id === 'sales-invoices') {
      return location.pathname === '/customers' || location.pathname === '/sales/invoices';
    }
    if (item.id === 'organization') {
      return location.pathname === '/organization' || location.pathname.startsWith('/organization/');
    }
    return item.path ? location.pathname === item.path || location.pathname.startsWith(item.path) : false;
  };

  const handleNavClick = (item: NavItem | SubNavItem) => {
    if (!item.path) return;
    if (onSelectTab) {
      onSelectTab(item.id);
    }
    navigate(item.path);
    if (onClose) {
      onClose();
    }
  };

  const renderSubNav = (items: SubNavItem[], level: number = 1) => {
    return items.map((subItem) => {
      const SubIcon = subItem.icon;
      const hasChildren = subItem.children && subItem.children.length > 0;
      const active = isCurrentActive(subItem);
      const isSubOpen = !!openGroups[subItem.id];

      if (hasChildren) {
        return (
          <div key={subItem.id} className="mt-1 mb-0.5 first:mt-0.5">
            <button
              id={`sidebar-subgroup-${subItem.id}`}
              onClick={() => toggleGroup(subItem.id)}
              className={`w-full text-left cursor-pointer flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 ${
                active || isSubOpen
                  ? 'bg-white/10 text-white font-bold shadow-xs'
                  : 'text-white/80 hover:bg-white/5 hover:text-white font-semibold'
              }`}
              style={{
                marginLeft: '12px',
                width: 'calc(100% - 12px)',
              }}
            >
              <div className="flex items-center flex-1 min-w-0">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                    active || isSubOpen ? 'bg-white/20 text-white' : 'bg-white/5 text-white/70'
                  }`}
                >
                  <SubIcon className="w-3.5 h-3.5" />
                </div>
                <span className="ml-2.5 flex-1 text-[13.5px] truncate tracking-wide">
                  {subItem.label}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-white/60 transition-transform duration-200 shrink-0 ${
                  isSubOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <div
              className={`grid transition-all duration-200 ease-in-out ${
                isSubOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
              }`}
            >
              <div className="overflow-hidden">
                <div
                  className="space-y-0.5 pt-1 pb-1 my-0.5 ml-6 pl-2.5 border-l-2 border-white/15"
                >
                  {renderSubNav(subItem.children!, level + 1)}
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <button
          key={subItem.id}
          id={`sidebar-sublink-${subItem.id}`}
          onClick={() => handleNavClick(subItem)}
          className={`sidebar-link sidebar-sublink w-full text-left cursor-pointer flex items-center py-2 px-2.5 rounded-lg transition-all ${
            active ? 'active font-bold text-white bg-white/15' : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center w-full min-w-0">
            <SubIcon
              className={`w-4 h-4 shrink-0 transition-colors mr-2.5 ${
                active ? 'text-white' : 'text-white/60'
              }`}
            />
            <span
              className={`text-[13px] truncate leading-relaxed ${
                active ? 'font-bold text-white' : 'font-normal text-white/80'
              }`}
            >
              {subItem.label}
            </span>
          </div>
        </button>
      );
    });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && onClose && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        id="main-sidebar"
        style={{
          backgroundColor: '#33077C',
          color: '#FFFFFF',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        }}
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col shrink-0 transition-transform duration-200 ease-in-out border-r select-none overflow-x-hidden print:hidden ${
          collapsed ? 'w-20' : 'w-72'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => visibleItems[0] && handleNavClick(visibleItems[0])}
          >
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
              }}
              className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base shadow-xs shrink-0 border border-white/20"
            >
              C
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold tracking-tight text-lg leading-tight text-white">
                  CoreCentral
                </span>
                <span className="text-[11px] font-semibold tracking-wider uppercase mt-0.5 text-white/70">
                  Enterprise Suite
                </span>
              </div>
            )}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-white/70 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="mt-2 flex-1 overflow-y-auto overflow-x-hidden space-y-1 px-3 py-2 no-scrollbar">
          {visibleItems.map((item) => {
            const Icon = item.icon;

            // Handle Dropdown with Children (e.g. Sales group, Tasks group)
            if (item.children && item.children.length > 0) {
              const isGroupActive = item.children.some((child) => isCurrentActive(child));
              const isGroupOpen = !!openGroups[item.id];

              return (
                <div key={item.id} className="space-y-0.5">
                  <button
                    id={`sidebar-link-${item.id}`}
                    onClick={() => toggleGroup(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`sidebar-link sidebar-group-toggle w-full text-left cursor-pointer flex items-center justify-between ${
                      isGroupActive ? 'active' : ''
                    }`}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <Icon
                        className="w-5 h-5 shrink-0 transition-colors"
                        style={{
                          color: isGroupActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
                        }}
                      />
                      {!collapsed && (
                        <span className={`ml-3.5 flex-1 text-[15px] truncate leading-relaxed ${
                          isGroupActive ? 'font-extrabold text-white' : 'font-medium text-white/80'
                        }`}>
                          {item.label}
                        </span>
                      )}
                    </div>

                    {!collapsed && (
                      <ChevronDown
                        className={`w-4.5 h-4.5 text-white/70 transition-transform duration-200 shrink-0 ${
                          isGroupOpen ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </button>

                  {/* Dropdown Children with smooth height & opacity transition */}
                  {!collapsed && (
                    <div
                      className={`grid transition-all duration-200 ease-in-out ${
                        isGroupOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="space-y-0.5 pt-0.5 pb-0.5">
                          {renderSubNav(item.children, 1)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            const active = isCurrentActive(item);

            return (
              <button
                key={item.id}
                id={`sidebar-link-${item.id}`}
                onClick={() => handleNavClick(item)}
                title={collapsed ? item.label : undefined}
                className={`sidebar-link w-full text-left cursor-pointer ${
                  active ? 'active' : ''
                }`}
              >
                <Icon
                  className="w-5 h-5 shrink-0 transition-colors"
                  style={{
                    color: active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
                  }}
                />

                {!collapsed && (
                  <span className={`ml-3.5 flex-1 text-[15px] truncate leading-relaxed ${
                    active ? 'font-extrabold text-white' : 'font-medium text-white/80'
                  }`}>
                    {item.label}
                  </span>
                )}

                {!collapsed && item.badge && (
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                      color: '#FFFFFF',
                    }}
                  >
                    {item.badge}
                  </span>
                )}

                {item.count !== undefined && item.count > 0 && (
                  <span
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-contrast)',
                    }}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      active ? '' : 'animate-pulse'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div
          className="mt-auto border-t p-4"
          style={{
            borderColor: 'rgba(255, 255, 255, 0.12)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
              }}
              className="w-9.5 h-9.5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ring-2 ring-white/20 border border-white/20"
            >
              {currentUser?.name
                ? currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()
                : 'JD'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold truncate tracking-wide text-white">
                  {isOrgSuperAdmin
                    ? 'Org Super Administrator'
                    : isSuperAdmin
                    ? 'Super Administrator'
                    : currentUser?.role === 'ADMIN'
                    ? 'Administrator'
                    : 'Staff Member'}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
