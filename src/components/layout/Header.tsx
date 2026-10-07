import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Repeat,
  Menu,
  User,
  Users,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  MapPin,
  Check,
  ShieldCheck,
  Sparkles,
  KeyRound,
} from 'lucide-react';

import { api } from '../../services/api';
import { Branch } from '../../types';
import { INITIAL_BRANCHES } from '../../data/initialData';

interface HeaderProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  onToggleSidebar?: () => void;
  onOpenAddLead?: () => void;
  onOpenCreateTask?: () => void;
  onOpenCreateContent?: () => void;
  onOpenQuickModal?: (modalType: 'lead' | 'task' | 'content' | 'onboarding') => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onToggleSidebar,
  onOpenAddLead,
  onOpenCreateTask,
  onOpenCreateContent,
  onOpenQuickModal,
  searchQuery = '',
  onSearchChange,
}) => {
  const {
    currentUser,
    role,
    isAdmin,
    isSuperAdmin,
    isOrgSuperAdmin,
    reminders,
    unreadRemindersCount,
    markReminderCompleted,
    logout,
    showToast,
  } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const isBranchAdmin = currentUser?.email?.toLowerCase() === 'branchadmin@gmail.com';

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isOrgTypeDropdownOpen, setIsOrgTypeDropdownOpen] = useState(false);

  // Organization Types for Org Super Admin
  const orgTypeOptions = [
    { id: 'client_management', name: 'Client Management' },
    { id: 'sales_management', name: 'Sales Management' },
  ];

  const [selectedOrgType, setSelectedOrgType] = useState<string>(() => {
    const saved = localStorage.getItem('active_org_type_orgsuperadmin');
    if (saved && (saved === 'Client Management' || saved === 'Sales Management')) {
      return saved;
    }
    return 'Client Management';
  });

  // Organization / Product suites under Yaa Creations
  const [productsList, setProductsList] = useState<any[]>([
    { id: 'all', name: 'All' },
    { id: 'prod_1', name: 'Yaa connect' },
    { id: 'prod_2', name: 'Doc motez' },
    { id: 'prod_3', name: 'Doc DentQ' },
    { id: 'prod_4', name: 'Aarudam AI' },
    { id: 'prod_5', name: 'Turfylock' },
    { id: 'prod_6', name: 'Digital Marketing' },
  ]);

  const [selectedProduct, setSelectedProduct] = useState<string>(() => {
    const saved = localStorage.getItem('active_product');
    if (saved) return saved;
    return 'All';
  });

  const [selectedOrg, setSelectedOrg] = useState<string>(() => {
    if (isOrgSuperAdmin) {
      const savedOrgSuper = localStorage.getItem('active_organization_orgsuperadmin');
      if (savedOrgSuper && savedOrgSuper !== 'All' && !savedOrgSuper.toLowerCase().includes('yaa connect')) {
        return savedOrgSuper;
      }
      return 'yaa Academy';
    }
    const saved = localStorage.getItem('active_organization');
    if (saved) return saved;
    return 'All';
  });

  // Product and branch dropdowns use initialized options without making unintegrated network requests
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    const saved = localStorage.getItem('active_branch');
    if (saved) {
      if (saved.toLowerCase().includes('all')) return 'All';
      if (saved.toLowerCase().includes('chennai')) return 'Chennai';
      if (saved.toLowerCase().includes('bangalore')) return 'Bangalore';
      if (saved.toLowerCase().includes('coimbatore')) return 'Coimbatore';
      if (saved.toLowerCase().includes('mumbai')) return 'Mumbai';
      if (saved.toLowerCase().includes('hyderabad')) return 'Hyderabad';
      if (saved.toLowerCase().includes('kochi')) return 'Kochi';
      return saved;
    }
    return 'All';
  });

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);
  const orgRef = useRef<HTMLDivElement>(null);
  const prodRef = useRef<HTMLDivElement>(null);
  const orgTypeRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setIsUserSwitcherOpen(false);
      }
      if (branchRef.current && !branchRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
      if (orgRef.current && !orgRef.current.contains(event.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
      if (prodRef.current && !prodRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
      if (orgTypeRef.current && !orgTypeRef.current.contains(event.target as Node)) {
        setIsOrgTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to extract clean short name (e.g., Chennai, Bangalore, Coimbatore)
  const getShortBranchName = (name: string, location?: string) => {
    if (name === 'All' || name === 'All Branches') return 'All';
    // Check known cities first
    const knownCities = ['Chennai', 'Bangalore', 'Coimbatore', 'Mumbai', 'Hyderabad', 'Kochi', 'Delhi', 'Pune', 'Kolkata', 'Madurai', 'Trichy', 'Salem'];
    for (const city of knownCities) {
      if (name.toLowerCase().includes(city.toLowerCase()) || (location && location.toLowerCase().includes(city.toLowerCase()))) {
        return city;
      }
    }
    // Fallback: take first word of branch name
    return name.split(' ')[0] || name;
  };

  // Build clean branch options: "All" followed by unique city names
  const branchOptions = useMemo(() => {
    const list: { id: string; name: string; fullBranchName: string; location?: string }[] = [
      { id: 'all', name: 'All', fullBranchName: 'All' }
    ];

    const seenNames = new Set<string>();
    branches.forEach((b) => {
      const short = getShortBranchName(b.name, b.location || b.city);
      if (!seenNames.has(short)) {
        seenNames.add(short);
        list.push({
          id: b.id,
          name: short,
          fullBranchName: b.name,
          location: b.location || b.city,
        });
      }
    });

    return list;
  }, [branches]);

  // Build clean organization options
  const orgOptions = useMemo(() => {
    if (isOrgSuperAdmin) {
      const defaultOrgList = [
        { id: 'org_yaa_academy', name: 'yaa Academy', organizationType: 'Client Management' },
        { id: 'org_fts_academy', name: 'FTS Academy', organizationType: 'Sales Management' },
        { id: 'org_nextgen_academy', name: 'Next Gen Academy', organizationType: 'Client Management' },
        { id: 'org_yaa_care', name: 'yaa Care', organizationType: 'Client Management' },
        { id: 'org_fyndus_academy', name: 'Fyndus Academy', organizationType: 'Sales Management' },
      ];

      let allSuperOrgs = defaultOrgList;
      const saved = localStorage.getItem('organizations_catalog_orgsuperadmin');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            allSuperOrgs = parsed.map((o: any) => ({
              id: o.id || o.name,
              name: o.name,
              organizationType: o.organizationType || (
                ['FTS Academy', 'Fyndus Academy'].includes(o.name) ? 'Sales Management' : 'Client Management'
              ),
            }));
          }
        } catch (e) {
          console.error(e);
        }
      }

      // Filter by selectedOrgType
      const filtered = allSuperOrgs.filter(
        (o) => (o.organizationType || 'Client Management').toLowerCase() === selectedOrgType.toLowerCase()
      );

      return filtered.length > 0 ? filtered : allSuperOrgs;
    }

    // Default for Admin login
    const list: { id: string; name: string; organizationType?: string }[] = [];
    const seen = new Set<string>();
    productsList.forEach((item) => {
      const itemName = item.name;
      if (itemName && !seen.has(itemName.toLowerCase())) {
        seen.add(itemName.toLowerCase());
        list.push({ id: item.id || itemName, name: itemName });
      }
    });
    return list;
  }, [productsList, isOrgSuperAdmin, selectedOrgType]);

  // Build product options
  const productOptions = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    productsList.forEach((item) => {
      const itemName = item.name;
      if (itemName && !seen.has(itemName.toLowerCase())) {
        seen.add(itemName.toLowerCase());
        list.push({ id: item.id || itemName, name: itemName });
      }
    });
    return list;
  }, [productsList]);

  // Ensure Org Super Admin always has a valid organization from orgOptions (defaulting to 1st organization)
  useEffect(() => {
    if (isOrgSuperAdmin) {
      const validNames = orgOptions.map((o) => o.name.toLowerCase());
      if (!selectedOrg || selectedOrg === 'All' || !validNames.includes(selectedOrg.toLowerCase())) {
        const defaultFirstOrg = orgOptions[0]?.name || 'yaa Academy';
        setSelectedOrg(defaultFirstOrg);
        localStorage.setItem('active_organization_orgsuperadmin', defaultFirstOrg);
      }
    }
  }, [isOrgSuperAdmin, selectedOrg, orgOptions]);

  const handleSelectOrgType = (typeName: string) => {
    setSelectedOrgType(typeName);
    localStorage.setItem('active_org_type_orgsuperadmin', typeName);
    setIsOrgTypeDropdownOpen(false);
    showToast?.('success', 'Organisation Type Switched', `Active organisation type set to ${typeName}`);
    window.dispatchEvent(new CustomEvent('orgTypeChanged', { detail: typeName }));
  };

  const handleSelectOrg = (orgName: string) => {
    setSelectedOrg(orgName);
    if (isOrgSuperAdmin) {
      localStorage.setItem('active_organization_orgsuperadmin', orgName);
    } else {
      localStorage.setItem('active_organization', orgName);
    }

    const matched = orgOptions.find((o) => o.name.toLowerCase() === orgName.toLowerCase());
    const orgType = (matched as any)?.organizationType || (
      ['fts academy', 'fyndus academy', 'polihills'].includes(orgName.toLowerCase()) ? 'Sales Management' : 'Client Management'
    );

    if (isOrgSuperAdmin && orgType !== selectedOrgType) {
      setSelectedOrgType(orgType);
      localStorage.setItem('active_org_type_orgsuperadmin', orgType);
    }

    setIsOrgDropdownOpen(false);
    showToast?.('success', 'Organization Switched', `Active organization set to ${orgName} (${orgType})`);
    window.dispatchEvent(new CustomEvent('orgChanged', { detail: { name: orgName, organizationType: orgType } }));
    window.dispatchEvent(new CustomEvent('orgTypeChanged', { detail: orgType }));
  };

  const handleSelectBranch = (branchName: string) => {
    setSelectedBranch(branchName);
    localStorage.setItem('active_branch', branchName);
    setIsBranchDropdownOpen(false);
    showToast?.('success', 'Branch Switched', `Active branch set to ${branchName}`);
  };

  const handleSelectProduct = (productName: string) => {
    setSelectedProduct(productName);
    localStorage.setItem('active_product', productName);
    setIsProductDropdownOpen(false);
    showToast?.('success', 'Product Switched', `Active product set to ${productName}`);
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || currentTab === 'dashboard') return 'Dashboard';
    if (path.startsWith('/branches') || currentTab === 'branches') return 'Branches';
    if (path.startsWith('/organization-subscriptions') || currentTab === 'organization-subscriptions') return 'Organization Subscriptions';
    if (path.startsWith('/organization') || currentTab === 'organization') return isOrgSuperAdmin ? 'Sub Organization' : 'Organizations';
    if (path.startsWith('/subscription-plans') || currentTab === 'subscription-plans') return 'Subscription Plans';
    if (path.startsWith('/products') || currentTab === 'products') return 'Products';
    if (path.startsWith('/leads') || currentTab === 'leads') return 'Clients & leads';
    if (path.startsWith('/quotes') || currentTab === 'quotes') return 'Quotations';
    if (path === '/proforma/new' || path.startsWith('/proforma/new') || currentTab === 'new-proforma-invoice') return 'New Proforma Invoice';
    if (path.startsWith('/proforma') || currentTab === 'proforma-invoices') return 'Proforma Invoices';
    if (path === '/sales/new' || path.startsWith('/sales/new') || currentTab === 'new-sale') return 'New Invoice';
    if (path.startsWith('/sales') || path.startsWith('/customers') || currentTab === 'customers' || currentTab === 'sales-invoices') return 'Invoices';
    if (path.startsWith('/digital-marketing') || currentTab === 'marketing') return 'Digital Marketing';
    if (path.startsWith('/content') || currentTab === 'content') return 'Content Planner';
    if (path.startsWith('/tasks') || currentTab === 'tasks') return "Today's Tasks";
    if (path.startsWith('/payments') || currentTab === 'payments') return 'Payments';
    if (path.startsWith('/subscriptions') || currentTab === 'subscriptions') return 'Subscriptions';
    if (path.startsWith('/reminders') || currentTab === 'reminders') return 'Reminders';
    if (path.startsWith('/reports') || currentTab === 'reports') return 'Reports & Analytics';
    if (path.startsWith('/employees') || currentTab === 'employees') return 'Employees';
    if (path.startsWith('/settings') || currentTab === 'settings') return 'Settings';

    // Sale Management - Inventory
    if (path.startsWith('/sale-management/inventory/category') || currentTab === 'inventory-category') return 'Category';
    if (path.startsWith('/sale-management/inventory/subcategory') || currentTab === 'inventory-subcategory') return 'Subcategory';
    if (path.startsWith('/sale-management/inventory/products') || currentTab === 'inventory-products') return 'Inventory Products';
    if (path.startsWith('/sale-management/inventory/stocks') || currentTab === 'inventory-stocks') return 'Stocks';
    if (path.startsWith('/sale-management/inventory/report') || currentTab === 'inventory-report') return 'Inventory Report';

    // Sale Management - Sales Hub
    if (path.startsWith('/sale-management/sales/quotation') || path.startsWith('/sale-management/sales/estimate') || currentTab === 'sales-hub-quotation') return 'Estimate/Quotation';
    if (path.startsWith('/sale-management/sales/payment-in') || path.startsWith('/sale-management/sales/payment') || currentTab === 'sales-hub-payment-in') return 'Payment-In';
    if (path.startsWith('/sale-management/sales/sale') || currentTab === 'sales-hub-sales') return 'Sales';
    if (path.startsWith('/sale-management/sales/return') || currentTab === 'sales-hub-returns') return 'Sales Return';
    if (path.startsWith('/sale-management/sales/report') || currentTab === 'sales-hub-report') return 'Sales Report';

    // Sale Management - Purchase
    if (path.startsWith('/sale-management/purchase/supplier') || currentTab === 'purchase-supplier') return 'Supplier';
    if (path.startsWith('/sale-management/purchase/request') || currentTab === 'purchase-request') return 'Purchase Request';
    if (path.startsWith('/sale-management/purchase/purchase') || currentTab === 'purchase-order') return 'Purchase Bills';
    if (path.startsWith('/sale-management/purchase/return') || currentTab === 'purchase-returns') return 'Purchase Return';
    if (path.startsWith('/sale-management/purchase/payment-out') || currentTab === 'purchase-payment-out') return 'Payment Out';
    if (path.startsWith('/sale-management/purchase/expense') || currentTab === 'purchase-expense' || currentTab === 'billing-purchase-expense') return 'Expense';

    // Sale Management - Reports
    if (path.startsWith('/sale-management/reports') || currentTab === 'sm-reports') return 'Sale Management Reports';

    return 'Dashboard';
  };

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'Lead Follow-up':
      case 'Overdue Follow-up':
        return <Clock className="w-4 h-4 text-[#4309A2]" />;
      case 'Task Deadline':
        return <CheckCircle2 className="w-4 h-4 text-purple-600" />;
      case 'Payment Due':
      case 'Payment Overdue':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'Subscription Expiry':
        return <Repeat className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <header
      id="app-header"
      className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-3.5 sm:px-6 lg:px-8 shrink-0 z-20 sticky top-0 print:hidden gap-2"
    >
      {/* Left: Mobile Toggle & Clean Page Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <h1 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight whitespace-nowrap">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right: Organization Selector, Branch Selector, Notification Bell & User Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 min-w-0 justify-end">
        {/* Org Super Admin Header Filters: Organization Type, Organization, Branch, Product */}
        {isOrgSuperAdmin ? (
          <>
            {/* Organisation Type Selector */}
            <div className="relative hidden lg:block shrink-0" ref={orgTypeRef}>
              <button
                id="org-type-selector-button"
                type="button"
                onClick={() => setIsOrgTypeDropdownOpen(!isOrgTypeDropdownOpen)}
                className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 bg-transparent hover:bg-slate-100/70 active:scale-[0.98] transition-all duration-150 cursor-pointer select-none text-xs sm:text-[13px] font-semibold text-slate-700 rounded-xl"
                title="Select Organisation Type"
              >
                <span className="whitespace-nowrap truncate max-w-[110px] xl:max-w-none">
                  <span className="hidden xl:inline text-slate-500 font-normal">Type: </span>
                  <span className="text-slate-700 font-semibold">{selectedOrgType}</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isOrgTypeDropdownOpen ? 'rotate-180 text-slate-600' : ''}`}
                />
              </button>

              {isOrgTypeDropdownOpen && (
                <div
                  className="absolute top-full mt-1.5 right-0 min-w-[200px] bg-white shadow-xl border border-slate-200 p-1 z-50 overflow-hidden space-y-0.5 rounded-xl"
                >
                  {orgTypeOptions.map((opt) => {
                    const isActive =
                      selectedOrgType.toLowerCase() === opt.name.toLowerCase();

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOrgType(opt.name)}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold transition-colors text-left cursor-pointer rounded-lg ${
                          isActive
                            ? 'bg-[#33077C]/10 text-[#33077C]'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className="truncate">{opt.name}</span>
                        {isActive && (
                          <Check className="w-3.5 h-3.5 text-[#33077C] shrink-0 stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Organization Selector */}
            <div className="relative hidden sm:block shrink-0" ref={orgRef}>
              <button
                id="organization-selector-button"
                type="button"
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 bg-transparent hover:bg-slate-100/70 active:scale-[0.98] transition-all duration-150 cursor-pointer select-none text-xs sm:text-[13px] font-semibold text-slate-700 rounded-xl"
                title="Select Organization"
              >
                <span className="whitespace-nowrap truncate max-w-[90px] md:max-w-[120px] xl:max-w-none">
                  <span className="hidden xl:inline text-slate-500 font-normal">Org: </span>
                  <span className="text-slate-700 font-semibold">{selectedOrg}</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isOrgDropdownOpen ? 'rotate-180 text-slate-600' : ''}`}
                />
              </button>

              {isOrgDropdownOpen && (
                <div
                  className="absolute top-full mt-1.5 right-0 min-w-[190px] bg-white shadow-xl border border-slate-200 p-1 z-50 overflow-hidden space-y-0.5 rounded-xl"
                >
                  {orgOptions.map((org) => {
                    const isActive =
                      selectedOrg.toLowerCase() === org.name.toLowerCase();

                    return (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => handleSelectOrg(org.name)}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold transition-colors text-left cursor-pointer rounded-lg ${
                          isActive
                            ? 'bg-[#33077C]/10 text-[#33077C]'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className="truncate">{org.name}</span>
                        {isActive && (
                          <Check className="w-3.5 h-3.5 text-[#33077C] shrink-0 stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Branch Selector */}
            <div className="relative shrink-0" ref={branchRef}>
              <button
                id="branch-selector-button"
                type="button"
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 bg-transparent hover:bg-slate-100/70 active:scale-[0.98] transition-all duration-150 cursor-pointer select-none text-xs sm:text-[13px] font-semibold text-slate-700 rounded-xl"
                title="Switch Branch"
              >
                <span className="whitespace-nowrap truncate max-w-[80px] sm:max-w-[100px] xl:max-w-none">
                  <span className="hidden xl:inline text-slate-500 font-normal">Branch: </span>
                  <span className="text-slate-700 font-semibold">{selectedBranch}</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isBranchDropdownOpen ? 'rotate-180 text-slate-600' : ''}`}
                />
              </button>

              {isBranchDropdownOpen && (
                <div
                  className="absolute top-full mt-1.5 right-0 min-w-[170px] bg-white shadow-xl border border-slate-200 p-1 z-50 overflow-hidden space-y-0.5 rounded-xl"
                >
                  {branchOptions.map((b) => {
                    const isActive =
                      selectedBranch.toLowerCase() === b.name.toLowerCase() ||
                      (selectedBranch.toLowerCase().includes(b.name.toLowerCase()) && b.name !== 'All');

                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleSelectBranch(b.name)}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold transition-colors text-left cursor-pointer rounded-lg ${
                          isActive
                            ? 'bg-[#33077C]/10 text-[#33077C]'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className="truncate">{b.name}</span>
                        {isActive && (
                          <Check className="w-3.5 h-3.5 text-[#33077C] shrink-0 stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Product Selector */}
            <div className="relative hidden xl:block shrink-0" ref={prodRef}>
              <button
                id="product-selector-button"
                type="button"
                onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 bg-transparent hover:bg-slate-100/70 active:scale-[0.98] transition-all duration-150 cursor-pointer select-none text-xs sm:text-[13px] font-semibold text-slate-700 rounded-xl"
                title="Select Product"
              >
                <span className="whitespace-nowrap truncate max-w-[100px] xl:max-w-none">
                  <span className="hidden xl:inline text-slate-500 font-normal">Product: </span>
                  <span className="text-slate-700 font-semibold">{selectedProduct}</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isProductDropdownOpen ? 'rotate-180 text-slate-600' : ''}`}
                />
              </button>

              {isProductDropdownOpen && (
                <div
                  className="absolute top-full mt-1.5 right-0 min-w-[170px] bg-white shadow-xl border border-slate-200 p-1 z-50 overflow-hidden space-y-0.5 rounded-xl"
                >
                  {productOptions.map((prod) => {
                    const isActive =
                      selectedProduct.toLowerCase() === prod.name.toLowerCase();

                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleSelectProduct(prod.name)}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold transition-colors text-left cursor-pointer rounded-lg ${
                          isActive
                            ? 'bg-[#33077C]/10 text-[#33077C]'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className="truncate">{prod.name}</span>
                        {isActive && (
                          <Check className="w-3.5 h-3.5 text-[#33077C] shrink-0 stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Branch Selector Dropdown - Visible in Admin (Hidden for Branch Admin) */}
            {!isSuperAdmin && !isBranchAdmin && (
              <div className="relative" ref={branchRef}>
                <button
                  id="branch-selector-button"
                  type="button"
                  onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                  className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 bg-transparent hover:bg-slate-100/70 active:scale-[0.98] transition-all duration-150 cursor-pointer select-none text-xs sm:text-[13px] font-semibold text-slate-700 rounded-xl"
                  title="Switch Branch"
                >
                  <span className="whitespace-nowrap truncate max-w-[110px] sm:max-w-none">
                    <span className="hidden sm:inline text-slate-500 font-normal">Select Branch: </span>
                    <span className="text-slate-700 font-semibold">{selectedBranch}</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isBranchDropdownOpen ? 'rotate-180 text-slate-600' : ''}`}
                  />
                </button>

                {isBranchDropdownOpen && (
                  <div
                    className="absolute top-full mt-1.5 right-0 min-w-[170px] bg-white shadow-xl border border-slate-200 p-1 z-50 overflow-hidden space-y-0.5 rounded-xl"
                  >
                    {branchOptions.map((b) => {
                      const isActive =
                        selectedBranch.toLowerCase() === b.name.toLowerCase() ||
                        (selectedBranch.toLowerCase().includes(b.name.toLowerCase()) && b.name !== 'All');

                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelectBranch(b.name)}
                          className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold transition-colors text-left cursor-pointer rounded-lg ${
                            isActive
                              ? 'bg-[#33077C]/10 text-[#33077C]'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <span className="truncate">{b.name}</span>
                          {isActive && (
                            <Check className="w-3.5 h-3.5 text-[#33077C] shrink-0 stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Product Selector Dropdown - Visible in Admin */}
            {!isSuperAdmin && (
              <div className="relative" ref={prodRef}>
                <button
                  id="product-selector-button"
                  type="button"
                  onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                  className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 bg-transparent hover:bg-slate-100/70 active:scale-[0.98] transition-all duration-150 cursor-pointer select-none text-xs sm:text-[13px] font-semibold text-slate-700 rounded-xl"
                  title="Select Product"
                >
                  <span className="whitespace-nowrap">
                    <span className="text-slate-500 font-normal">Product: </span>
                    <span className="text-slate-700 font-semibold">{selectedProduct}</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isProductDropdownOpen ? 'rotate-180 text-slate-600' : ''}`}
                  />
                </button>

                {isProductDropdownOpen && (
                  <div
                    className="absolute top-full mt-1.5 right-0 min-w-[170px] bg-white shadow-xl border border-slate-200 p-1 z-50 overflow-hidden space-y-0.5 rounded"
                  >
                    {productOptions.map((prod) => {
                      const isActive =
                        selectedProduct.toLowerCase() === prod.name.toLowerCase();

                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleSelectProduct(prod.name)}
                          className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold transition-colors text-left cursor-pointer rounded-xs ${
                            isActive
                              ? 'bg-[#33077C]/10 text-[#33077C]'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <span className="truncate">{prod.name}</span>
                          {isActive && (
                            <Check className="w-3.5 h-3.5 text-[#33077C] shrink-0 stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Notification Icon */}
        <div className="relative" ref={notifRef}>
          <button
            id="notification-bell-button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
            title="Notifications & Reminders"
          >
            <Bell className="w-5 h-5" strokeWidth={1.8} />
            {unreadRemindersCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#00A859] rounded-full ring-2 ring-white" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#E2E8F0] overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 bg-[#33077C] text-white">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#4309A2]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Reminders & Alerts</h4>
                </div>
                <span className="text-[10px] font-semibold bg-white/15 px-2 py-0.5 rounded">
                  {unreadRemindersCount} Active
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {reminders.filter((r) => !r.isCompleted).length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No pending reminders or alerts. You're all caught up!
                  </div>
                ) : (
                  reminders
                    .filter((r) => !r.isCompleted)
                    .slice(0, 6)
                    .map((rem) => (
                      <div
                        key={rem.id}
                        className={`p-3.5 flex items-start gap-3 hover:bg-[#F5F7FA] transition-colors ${!rem.isRead ? 'bg-amber-50/30' : ''
                          }`}
                      >
                        <div className="p-2 rounded-md bg-slate-100 shrink-0">
                          {getReminderIcon(rem.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 leading-snug">{rem.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{rem.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-slate-400 font-mono">
                              Due: {rem.dueDate.replace('T', ' ')}
                            </span>
                            <button
                              onClick={() => markReminderCompleted(rem.id)}
                              className="text-[10px] font-semibold text-[#4309A2] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-[#E2E8F0] text-center">
                <button
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    if (onSelectTab) onSelectTab('reminders');
                    navigate('/reminders');
                  }}
                  className="text-xs font-semibold text-[#33077C] hover:text-[#4309A2] transition-colors cursor-pointer"
                >
                  View All Reminders & Schedule -&gt;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Role Switcher Circular Avatar */}
        <div className="relative" ref={userRef}>
          <button
            id="user-profile-switcher-btn"
            onClick={() => setIsUserSwitcherOpen(!isUserSwitcherOpen)}
            className="w-10 h-10 rounded-full bg-[#00A859] text-white flex items-center justify-center font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            title={`${currentUser?.name || 'User'} (${role}) - Click to switch perspective`}
          >
            {currentUser?.name
              ? currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()
              : 'SA'}
          </button>

          {isUserSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-68 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden z-50 p-2">
              {/* User Summary Header */}
              <div className="px-3.5 py-3 border-b border-slate-100 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#00A859] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  {currentUser?.name
                    ? currentUser.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()
                    : 'SA'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {currentUser?.name || 'James Wilson'}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {currentUser?.email || (role === 'ADMIN' ? 'admin@apexgroup.com' : 'staff@apexgroup.com')}
                  </p>
                </div>
              </div>

              {/* Menu Links */}
              <div className="py-1.5 space-y-1">
                {isSuperAdmin ? (
                  <>
                    <button
                      onClick={() => {
                        setIsUserSwitcherOpen(false);
                        navigate('/organization');
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-800 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <Building2 className="w-4.5 h-4.5 text-slate-600" strokeWidth={1.8} />
                      <span>Organizations</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserSwitcherOpen(false);
                        navigate('/subscription-plans');
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-800 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <Repeat className="w-4.5 h-4.5 text-slate-600" strokeWidth={1.8} />
                      <span>Subscription Plans</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserSwitcherOpen(false);
                        if (onSelectTab) onSelectTab('settings');
                        navigate('/settings?tab=account');
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-800 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <User className="w-4.5 h-4.5 text-slate-600" strokeWidth={1.8} />
                      <span>Account</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserSwitcherOpen(false);
                        if (onSelectTab) onSelectTab('settings');
                        navigate('/settings');
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-800 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <Settings className="w-4.5 h-4.5 text-slate-600" strokeWidth={1.8} />
                      <span>Settings</span>
                    </button>
                  </>
                ) : (
                  <>
                    {isOrgSuperAdmin && (
                      <button
                        onClick={() => {
                          setIsUserSwitcherOpen(false);
                          navigate('/organization');
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-800 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <Building2 className="w-4.5 h-4.5 text-slate-600" strokeWidth={1.8} />
                        <span>Sub Organization</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsUserSwitcherOpen(false);
                        if (onSelectTab) onSelectTab('settings');
                        navigate('/settings?tab=account');
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-800 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <User className="w-4.5 h-4.5 text-slate-600" strokeWidth={1.8} />
                      <span>Account</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserSwitcherOpen(false);
                        if (onSelectTab) onSelectTab('employees');
                        navigate('/employees');
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-800 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <Users className="w-4.5 h-4.5 text-slate-600" strokeWidth={1.8} />
                      <span>Team Members</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserSwitcherOpen(false);
                        if (onSelectTab) onSelectTab('settings');
                        navigate('/settings');
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-800 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <Settings className="w-4.5 h-4.5 text-slate-600" strokeWidth={1.8} />
                      <span>Settings</span>
                    </button>
                  </>
                )}
              </div>

              {/* Instant Role Perspective Switcher for Testing Access */}
              <div className="pt-2 pb-1 border-t border-slate-100">
                <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>Switch Role Perspective</span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {[
                    { email: 'superadmin@gmail.com', name: 'Super Admin', badge: 'Root Global' },
                    { email: 'orgadmin@gmail.com', name: 'Organisation Admin', badge: 'All Modules' },
                    { email: 'suborgadmin@gmail.com', name: 'Sub Org Admin', badge: 'Company Scope' },
                    { email: 'branchadmin@gmail.com', name: 'Branch Admin', badge: 'Branch Scope' },
                    { email: 'sarah.j@apexgroup.com', name: 'Staff / Sales Executive', badge: 'Operator' },
                  ].map((roleOption) => {
                    const isCurrent = (currentUser?.email || '').toLowerCase() === roleOption.email.toLowerCase();
                    return (
                      <button
                        key={roleOption.email}
                        type="button"
                        onClick={async () => {
                          setIsUserSwitcherOpen(false);
                          const ok = await useAuthStore.getState().login(roleOption.email, 'Test@12345');
                          if (ok) {
                            showToast('info', 'Switched View', `Now viewing as ${roleOption.name}`);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left ${
                          isCurrent
                            ? 'bg-purple-50 text-[#33077C] font-bold'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className="truncate">{roleOption.name}</span>
                        <span className="text-[10px] font-mono opacity-60 text-slate-500">
                          {isCurrent ? '• Active' : roleOption.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Logout Button */}
              <div className="pt-1.5 border-t border-slate-100">
                <button
                  onClick={async () => {
                    setIsUserSwitcherOpen(false);
                    await logout();
                    showToast('info', 'Logged Out', 'You have been successfully logged out.');
                    navigate('/login', { replace: true });
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4.5 h-4.5 text-rose-500" strokeWidth={1.8} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

