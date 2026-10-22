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
  UsersRound,
  ShoppingCart,
} from 'lucide-react';

import { api } from '../../services/api';
import { Branch } from '../../types';
import { subOrganizationApi, branchApi, clientProductApi, getStoredOrganizationId } from '../../api';
import { useActiveOrgType } from '../../hooks/useActiveOrgType';

// Helper to extract the branch location only (e.g., Chennai, Rasipuram, Coimbatore)
const getBranchLocationName = (name: string, location?: string, city?: string) => {
  if (!name || name === 'All' || name === 'All Branches') return 'All';

  // 1. Prioritize explicit location or city field from the branch record
  const rawLoc = (location || city || '').trim();
  if (rawLoc && !['all', 'n/a', 'na', 'none', '-', 'direct organization'].includes(rawLoc.toLowerCase())) {
    // If comma-separated (e.g. "Rasipuram, Namakkal"), take primary location
    const firstPart = rawLoc.split(/[,/\\-]/)[0].trim();
    const cleanWord = firstPart.replace(/\b(Branch|City|Office|Campus)\b/gi, '').trim();
    const candidate = cleanWord || firstPart;
    if (candidate && candidate.length > 1) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
  }

  // 2. Comprehensive check for known locations/cities across Tamil Nadu & Indian hubs
  const knownPlaces = [
    'Chennai', 'Rasipuram', 'Bangalore', 'Coimbatore', 'Mumbai', 'Hyderabad',
    'Kochi', 'Delhi', 'Pune', 'Kolkata', 'Madurai', 'Trichy', 'Salem',
    'Namakkal', 'Erode', 'Tirupur', 'Tirunelveli', 'Vellore', 'Thanjavur',
    'Karur', 'Dindigul', 'Nagercoil', 'Kanchipuram', 'Hosur', 'Pondicherry',
    'Cuddalore', 'Villupuram', 'Kumbakonam', 'Tuticorin', 'Thoothukudi',
    'Tirupati', 'Noida', 'Gurgaon', 'Ahmedabad', 'Mysore'
  ];
  for (const place of knownPlaces) {
    if (
      name.toLowerCase().includes(place.toLowerCase()) ||
      (rawLoc && rawLoc.toLowerCase().includes(place.toLowerCase()))
    ) {
      return place;
    }
  }

  // 3. If location is embedded in name after hyphen, slash, comma, or in parentheses
  // e.g. "NextGen - Rasipuram", "NextGen (Rasipuram)"
  if (name.includes('-')) {
    const parts = name.split('-');
    const afterDash = parts[parts.length - 1].trim();
    const clean = afterDash.replace(/\b(Branch|Office|Campus|HQ)\b/gi, '').trim();
    if (clean && clean.length > 1) {
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }
  }

  const parenMatch = name.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    const inParen = parenMatch[1].trim();
    const clean = inParen.replace(/\b(Branch|Office|Campus)\b/gi, '').trim();
    if (clean && clean.length > 1) {
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }
  }

  // 4. Strip generic branch/org suffix words if any
  const stripped = name
    .replace(/\b(Branch|Main Branch|Regional Office|Office|Campus|Center|Centre)\b/gi, '')
    .trim();
  if (stripped && stripped.length > 1) {
    return stripped.charAt(0).toUpperCase() + stripped.slice(1);
  }

  return name;
};

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

  const userRole = (currentUser?.role || role || '').toString().toUpperCase();
  const isBranchAdmin =
    (userRole === 'BRANCH_ADMIN' ||
      userRole === 'BRANCHADMIN' ||
      currentUser?.email?.toLowerCase() === 'branchadmin@gmail.com') &&
    userRole !== 'ORG_ADMIN' &&
    userRole !== 'ORGADMIN' &&
    userRole !== 'ADMIN' &&
    userRole !== 'SUPER_ADMIN' &&
    userRole !== 'SUPERADMIN';

  const isOrgAdmin =
    isOrgSuperAdmin ||
    userRole === 'ORG_ADMIN' ||
    userRole === 'ORGADMIN' ||
    userRole === 'ADMIN' ||
    currentUser?.email?.toLowerCase() === 'orgadmin@gmail.com' ||
    currentUser?.email?.toLowerCase() === 'orgsuperadmin@gmail.com';

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isSubOrgDropdownOpen, setIsSubOrgDropdownOpen] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isOrgTypeDropdownOpen, setIsOrgTypeDropdownOpen] = useState(false);

  // Organization Types for Org Super Admin
  const orgTypeOptions = [
    { id: 'client_management', name: 'Client Management' },
    { id: 'sales_management', name: 'Sales Management' },
  ];

  const {
    activeOrgType,
    setOrgType,
    isSaleManagement,
    isClientManagement,
    isAll: isOrgAll,
    isSaleOnly,
    isClientOnly,
  } = useActiveOrgType();

  const selectedOrgType = activeOrgType;
  const orgCaps = {
    isAll: isOrgAll,
    isSaleOnly,
    isClientOnly,
  };

  // 1. Organization selector state
  const [selectedOrg, setSelectedOrg] = useState<string>(() => {
    if (isOrgSuperAdmin || isOrgAdmin) {
      const savedOrgSuper = localStorage.getItem('active_organization_orgsuperadmin');
      if (savedOrgSuper && savedOrgSuper !== 'All' && !savedOrgSuper.toLowerCase().includes('yaa connect')) {
        return savedOrgSuper;
      }
      return currentUser?.name || 'Yaa Creations';
    }
    const saved = localStorage.getItem('active_organization');
    if (saved) return saved;
    return currentUser?.name || 'All';
  });

  const isSalesMode = isSaleManagement;

  // Track trigger events
  const [subOrgChangeTrigger, setSubOrgChangeTrigger] = useState(0);
  const [branchChangeTrigger, setBranchChangeTrigger] = useState(0);

  useEffect(() => {
    const handleSubOrgChanged = () => setSubOrgChangeTrigger((prev) => prev + 1);
    const handleBranchesChanged = () => setBranchChangeTrigger((prev) => prev + 1);

    window.addEventListener('orgChanged', handleSubOrgChanged);
    window.addEventListener('organizationsChanged', handleSubOrgChanged);
    window.addEventListener('subOrganizationsChanged', handleSubOrgChanged);
    window.addEventListener('branchesChanged', handleBranchesChanged);
    window.addEventListener('storage', handleSubOrgChanged);

    return () => {
      window.removeEventListener('orgChanged', handleSubOrgChanged);
      window.removeEventListener('organizationsChanged', handleSubOrgChanged);
      window.removeEventListener('subOrganizationsChanged', handleSubOrgChanged);
      window.removeEventListener('branchesChanged', handleBranchesChanged);
      window.removeEventListener('storage', handleSubOrgChanged);
    };
  }, []);

  // 2. Fetch API Sub-Organizations (Real API only)
  const [apiSubOrgs, setApiSubOrgs] = useState<{ id: string; name: string; organizationType?: string }[]>([]);

  useEffect(() => {
    if (isSuperAdmin) return;
    let isMounted = true;
    const fetchApiSubOrgs = async () => {
      try {
        const activeOrgId = currentUser?.organizationId || getStoredOrganizationId();
        const res = await subOrganizationApi.getSubOrganizations(
          {
            page_no: 1,
            page_size: 100,
            pagination_required: 'false',
          },
          activeOrgId || undefined
        );
        if (isMounted && res && Array.isArray(res.data)) {
          const mapped = res.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            organizationType: item.organizationType || item.organizationTypeName,
          }));
          setApiSubOrgs(mapped);
        }
      } catch (err) {
        // Fallback gracefully
      }
    };
    fetchApiSubOrgs();
    return () => {
      isMounted = false;
    };
  }, [subOrgChangeTrigger, currentUser, isSuperAdmin]);

  // Clean sub-organization options strictly from API
  const subOrgOptions = useMemo(() => {
    const list: { id: string; name: string; organizationType?: string }[] = [
      { id: 'all', name: 'All' },
    ];
    const isSales = isSalesMode;
    const seenNames = new Set<string>(['all']);

    const isMatch = (typeStr?: string) => {
      const t = (typeStr || '').toLowerCase();
      if (isSales) {
        return t.includes('sale');
      } else {
        return t.includes('client') || !t.includes('sale');
      }
    };

    apiSubOrgs.forEach((s) => {
      const lower = (s.name || '').toLowerCase().trim();
      if (isMatch(s.organizationType) && lower && !seenNames.has(lower)) {
        seenNames.add(lower);
        list.push({
          id: s.id,
          name: s.name.trim(),
          organizationType: isSales ? 'Sales Management' : 'Client Management',
        });
      }
    });

    return list;
  }, [isSalesMode, apiSubOrgs]);

  const [selectedSubOrg, setSelectedSubOrg] = useState<string>(() => {
    const isSales = selectedOrgType.toLowerCase().includes('sale');
    const savedKey = isSales ? 'active_sub_organization_sales' : 'active_sub_organization_client';
    return localStorage.getItem(savedKey) || localStorage.getItem('active_sub_organization') || 'All';
  });

  useEffect(() => {
    const savedKey = isSalesMode ? 'active_sub_organization_sales' : 'active_sub_organization_client';
    const saved = localStorage.getItem(savedKey) || 'All';
    setSelectedSubOrg(saved);
    localStorage.setItem('active_sub_organization', saved);
  }, [isSalesMode]);

  // Resolve active sub-organization ID
  const currentSubOrgId = useMemo(() => {
    if (!selectedSubOrg || selectedSubOrg === 'All') return undefined;
    const match = subOrgOptions.find((s) => s.name.toLowerCase() === selectedSubOrg.toLowerCase());
    return match && match.id !== 'all' ? match.id : undefined;
  }, [selectedSubOrg, subOrgOptions]);

  const lastBroadcastRef = useRef<{ id?: string; name?: string; isSales?: boolean }>({});

  // Keep active_sub_organization_id persisted and broadcast when resolved on mount/refresh
  useEffect(() => {
    if (isSuperAdmin) return;
    const last = lastBroadcastRef.current;
    if (last.id === currentSubOrgId && last.name === selectedSubOrg && last.isSales === isSalesMode) {
      return;
    }
    lastBroadcastRef.current = { id: currentSubOrgId, name: selectedSubOrg, isSales: isSalesMode };

    if (currentSubOrgId) {
      localStorage.setItem('active_sub_organization_id', currentSubOrgId);
      window.dispatchEvent(
        new CustomEvent('subOrgChanged', {
          detail: {
            name: selectedSubOrg,
            id: currentSubOrgId,
            subOrganizationId: currentSubOrgId,
            organizationType: isSalesMode ? 'Sales Management' : 'Client Management',
          },
        })
      );
    } else if (selectedSubOrg === 'All') {
      localStorage.removeItem('active_sub_organization_id');
    }
  }, [currentSubOrgId, selectedSubOrg, isSalesMode, isSuperAdmin]);
  useEffect(() => {
    if (currentSubOrgId) {
      localStorage.setItem('active_sub_organization_id', currentSubOrgId);
      if (isSalesMode) {
        localStorage.setItem('active_sub_organization_id_sales', currentSubOrgId);
      }
    } else {
      localStorage.removeItem('active_sub_organization_id');
      if (isSalesMode) {
        localStorage.removeItem('active_sub_organization_id_sales');
      }
    }
  }, [currentSubOrgId, isSalesMode]);

  // 3. Fetch API Branches filtered by active sub-organization (Real API only)
  const [apiBranches, setApiBranches] = useState<Branch[]>([]);

  useEffect(() => {
    if (isSuperAdmin) return;
    let isMounted = true;
    const fetchApiBranches = async () => {
      try {
        const activeOrgId = currentUser?.organizationId || getStoredOrganizationId();
        const res = await branchApi.getBranches(
          {
            page_no: 1,
            page_size: 100,
            pagination_required: 'false',
            sub_organization_id: currentSubOrgId,
            organization_id: activeOrgId || undefined,
          },
          activeOrgId || undefined
        );

        if (isMounted && res && Array.isArray(res.data)) {
          const mapped: Branch[] = res.data.map((item: any) => ({
            id: item.id || '',
            name: item.name || '',
            code: item.code || item.id || '',
            createdAt: item.createdAt || '',
            location:
              item.location ||
              item.city ||
              item.branch_location ||
              item.branchLocation ||
              item.address ||
              item.location_name ||
              '',
            city:
              item.city ||
              item.location ||
              item.branch_location ||
              '',
            organizationType: item.organizationType || item.organizationTypeName || '',
            status: item.status || 'Active',
            subOrganizationId:
              item.subOrganizationId ||
              item.sub_organization_id ||
              item.subOrganization?.id ||
              '',
          }));
          setApiBranches(mapped);
        } else if (isMounted) {
          setApiBranches([]);
        }
      } catch (err) {
        if (isMounted) setApiBranches([]);
      }
    };
    fetchApiBranches();
    return () => {
      isMounted = false;
    };
  }, [currentSubOrgId, branchChangeTrigger, currentUser, isSalesMode, isSuperAdmin]);

  const branches = useMemo<Branch[]>(() => {
    const isMatch = (bTypeStr?: string) => {
      const bType = (bTypeStr || '').toLowerCase();
      return isSalesMode
        ? bType.includes('sale')
        : bType.includes('client') || !bType.includes('sale');
    };
    return apiBranches.filter((b) => {
      if (!isMatch(b.organizationType)) return false;
      if (currentSubOrgId) {
        return b.subOrganizationId === currentSubOrgId;
      }
      return true;
    });
  }, [isSalesMode, apiBranches, currentSubOrgId]);

  const branchOptions = useMemo(() => {
    const list: { id: string; name: string; fullBranchName: string; location?: string }[] = [
      { id: 'all', name: 'All', fullBranchName: 'All' },
    ];
    const seenNames = new Set<string>(['all']);

    branches.forEach((b) => {
      const locName = getBranchLocationName(b.name, b.location, b.city);
      if (!seenNames.has(locName.toLowerCase())) {
        seenNames.add(locName.toLowerCase());
        list.push({
          id: b.id,
          name: locName,
          fullBranchName: b.name,
          location: b.location || b.city,
        });
      }
    });
    return list;
  }, [branches]);

  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    const isSales = selectedOrgType.toLowerCase().includes('sale');
    const savedKey = isSales ? 'active_branch_sales' : 'active_branch_client';
    return localStorage.getItem(savedKey) || localStorage.getItem('active_branch') || 'All';
  });

  useEffect(() => {
    const savedKey = isSalesMode ? 'active_branch_sales' : 'active_branch_client';
    const saved = localStorage.getItem(savedKey) || 'All';
    setSelectedBranch(saved);
    localStorage.setItem('active_branch', saved);
  }, [isSalesMode]);

  // Resolve active branch ID
  const currentBranchId = useMemo(() => {
    if (!selectedBranch || selectedBranch === 'All') return undefined;
    const match = branchOptions.find(
      (b) =>
        b.name.toLowerCase() === selectedBranch.toLowerCase() ||
        b.fullBranchName?.toLowerCase() === selectedBranch.toLowerCase() ||
        (b.location && b.location.toLowerCase() === selectedBranch.toLowerCase())
    );
    return match && match.id !== 'all' ? match.id : undefined;
  }, [selectedBranch, branchOptions]);

  useEffect(() => {
    if (currentBranchId) {
      localStorage.setItem('active_branch_id', currentBranchId);
      if (isSalesMode) {
        localStorage.setItem('active_branch_id_sales', currentBranchId);
      }
    } else {
      localStorage.removeItem('active_branch_id');
      if (isSalesMode) {
        localStorage.removeItem('active_branch_id_sales');
      }
    }
  }, [currentBranchId, isSalesMode]);

  // 4. Fetch Products filtered by active branch & sub-organization (Real API only)
  const [productsList, setProductsList] = useState<any[]>([]);

  useEffect(() => {
    if (isSuperAdmin || isSalesMode) return;
    let isMounted = true;
    const fetchApiProducts = async () => {
      try {
        const activeOrgId = currentUser?.organizationId || getStoredOrganizationId();
        const res = await clientProductApi.getProducts(
          {
            page: 1,
            limit: 100,
            organizationId: activeOrgId || undefined,
            subOrganizationId: currentSubOrgId,
            branchId: currentBranchId,
          },
          activeOrgId || undefined
        );

        if (isMounted && res && Array.isArray(res.data)) {
          setProductsList(res.data);
        } else if (isMounted) {
          setProductsList([]);
        }
      } catch (err) {
        if (isMounted) setProductsList([]);
      }
    };
    fetchApiProducts();
    return () => {
      isMounted = false;
    };
  }, [currentBranchId, currentSubOrgId, currentUser, isSuperAdmin, isSalesMode]);

  const productOptions = useMemo(() => {
    const list: { id: string; name: string }[] = [{ id: 'all', name: 'All' }];
    const seen = new Set<string>(['all']);
    productsList.forEach((item) => {
      const itemName = (item.name || '').trim();
      if (itemName && !seen.has(itemName.toLowerCase())) {
        seen.add(itemName.toLowerCase());
        list.push({ id: item.id || itemName, name: itemName });
      }
    });
    return list;
  }, [productsList]);

  const [selectedProduct, setSelectedProduct] = useState<string>(() => {
    return localStorage.getItem('active_product') || 'All';
  });

  // Keep branch & product valid when options change
  useEffect(() => {
    if (selectedBranch !== 'All' && branchOptions.length > 0) {
      const exists = branchOptions.some(
        (b) =>
          b.name.toLowerCase() === selectedBranch.toLowerCase() ||
          b.fullBranchName?.toLowerCase() === selectedBranch.toLowerCase() ||
          (b.location && b.location.toLowerCase() === selectedBranch.toLowerCase())
      );
      if (!exists) {
        setSelectedBranch('All');
        localStorage.setItem('active_branch', 'All');
      }
    }
  }, [branchOptions, selectedBranch]);

  useEffect(() => {
    if (selectedProduct !== 'All' && productOptions.length > 0) {
      const exists = productOptions.some(
        (p) => p.name.toLowerCase() === selectedProduct.toLowerCase()
      );
      if (!exists) {
        setSelectedProduct('All');
        localStorage.setItem('active_product', 'All');
      }
    }
  }, [productOptions, selectedProduct]);

  // Handlers for switching
  const handleSelectSubOrg = (subOrgName: string) => {
    setSelectedSubOrg(subOrgName);
    localStorage.setItem('active_sub_organization', subOrgName);
    if (isSalesMode) {
      localStorage.setItem('active_sub_organization_sales', subOrgName);
    } else {
      localStorage.setItem('active_sub_organization_client', subOrgName);
    }

    // Reset branch and product
    setSelectedBranch('All');
    localStorage.setItem('active_branch', 'All');
    if (isSalesMode) {
      localStorage.setItem('active_branch_sales', 'All');
    } else {
      localStorage.setItem('active_branch_client', 'All');
    }
    setSelectedProduct('All');
    localStorage.setItem('active_product', 'All');

    const matchedSub = subOrgOptions.find(
      (s) => s.name.toLowerCase() === subOrgName.toLowerCase()
    );
    const subId = matchedSub && matchedSub.id !== 'all' ? matchedSub.id : undefined;

    if (subId) {
      localStorage.setItem('active_sub_organization_id', subId);
    } else {
      localStorage.removeItem('active_sub_organization_id');
    }

    setIsSubOrgDropdownOpen(false);
    showToast?.('success', 'Sub-Organization Switched', `Active sub-organization set to ${subOrgName}`);
    window.dispatchEvent(
      new CustomEvent('subOrgChanged', {
        detail: {
          name: subOrgName,
          id: subId,
          subOrganizationId: subId,
          organizationType: isSalesMode ? 'Sales Management' : 'Client Management',
        },
      })
    );
    window.dispatchEvent(
      new CustomEvent('branchChanged', {
        detail: { branch: 'All', name: 'All', id: undefined, branchId: undefined },
      })
    );
    window.dispatchEvent(
      new CustomEvent('productChanged', {
        detail: { product: 'All', name: 'All', id: undefined, productId: undefined },
      })
    );
  };

  const handleSelectBranch = (branchName: string) => {
    setSelectedBranch(branchName);
    localStorage.setItem('active_branch', branchName);
    if (isSalesMode) {
      localStorage.setItem('active_branch_sales', branchName);
    } else {
      localStorage.setItem('active_branch_client', branchName);
    }

    // Reset product
    setSelectedProduct('All');
    localStorage.setItem('active_product', 'All');

    const matchedBranch = branchOptions.find(
      (b) =>
        b.name.toLowerCase() === branchName.toLowerCase() ||
        b.fullBranchName?.toLowerCase() === branchName.toLowerCase() ||
        (b.location && b.location.toLowerCase() === branchName.toLowerCase())
    );
    const branchId = matchedBranch && matchedBranch.id !== 'all' ? matchedBranch.id : undefined;

    if (branchId) {
      localStorage.setItem('active_branch_id', branchId);
    } else {
      localStorage.removeItem('active_branch_id');
    }

    setIsBranchDropdownOpen(false);
    showToast?.('success', 'Branch Switched', `Active branch set to ${branchName}`);
    window.dispatchEvent(
      new CustomEvent('branchChanged', {
        detail: {
          branch: branchName,
          name: branchName,
          id: branchId,
          branchId: branchId,
        },
      })
    );
    window.dispatchEvent(
      new CustomEvent('productChanged', {
        detail: { product: 'All', name: 'All', id: undefined, productId: undefined },
      })
    );
  };

  const handleSelectProduct = (productName: string) => {
    setSelectedProduct(productName);
    localStorage.setItem('active_product', productName);
    setIsProductDropdownOpen(false);
    showToast?.('success', 'Product Switched', `Active product set to ${productName}`);
    const matchedProduct = productOptions.find(
      (p) => p.name.toLowerCase() === productName.toLowerCase()
    );
    const prodId = matchedProduct && matchedProduct.id !== 'all' ? matchedProduct.id : undefined;
    window.dispatchEvent(
      new CustomEvent('productChanged', {
        detail: {
          product: productName,
          name: productName,
          id: prodId,
          productId: prodId,
        },
      })
    );
  };

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);
  const subOrgRef = useRef<HTMLDivElement>(null);
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
      if (subOrgRef.current && !subOrgRef.current.contains(event.target as Node)) {
        setIsSubOrgDropdownOpen(false);
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

  // Only sync suite mode if user navigates to an exclusive suite-specific sub-route
  useEffect(() => {
    if (location.pathname.startsWith('/sale-management')) {
      if (isClientOnly) {
        navigate('/');
      } else if (!isSaleManagement) {
        setOrgType('Sales Management');
      }
    } else if (
      location.pathname.startsWith('/leads') ||
      location.pathname.startsWith('/quotes') ||
      location.pathname.startsWith('/proforma') ||
      location.pathname.startsWith('/sales') ||
      location.pathname.startsWith('/customers') ||
      location.pathname.startsWith('/digital-marketing') ||
      location.pathname.startsWith('/content') ||
      location.pathname.startsWith('/tasks') ||
      location.pathname.startsWith('/payments') ||
      location.pathname.startsWith('/subscriptions')
    ) {
      if (isSaleOnly) {
        navigate('/');
      } else if (isSaleManagement) {
        setOrgType('Client Management');
      }
    }
  }, [location.pathname, isSaleManagement, isClientOnly, isSaleOnly, setOrgType, navigate]);

  // Build clean organization options
  const orgOptions = useMemo(() => {
    if (isOrgSuperAdmin || isOrgAdmin) {
      const currentOrgName = currentUser?.name || 'Yaa Creations';
      const isSales = selectedOrgType.toLowerCase().includes('sale');

      const targetList: { id: string; name: string; organizationType?: string }[] = [
        {
          id: 'org_current',
          name: currentOrgName,
          organizationType: isSales ? 'Sales Management' : 'Client Management',
        },
      ];
      return targetList;
    }

    const list: { id: string; name: string; organizationType?: string }[] = [
      {
        id: 'org_current',
        name: currentUser?.name || 'Yaa Creations',
        organizationType: selectedOrgType,
      },
    ];
    return list;
  }, [isOrgSuperAdmin, isOrgAdmin, currentUser, selectedOrgType]);

  // Ensure Org Super Admin always has a valid organization from orgOptions (defaulting to 1st organization)
  useEffect(() => {
    if (isOrgSuperAdmin || isOrgAdmin) {
      const validNames = orgOptions.map((o) => o.name.toLowerCase());
      if (!selectedOrg || selectedOrg === 'All' || !validNames.includes(selectedOrg.toLowerCase())) {
        const defaultFirstOrg = orgOptions[0]?.name || currentUser?.name || 'Yaa Creations';
        setSelectedOrg(defaultFirstOrg);
        localStorage.setItem('active_organization_orgsuperadmin', defaultFirstOrg);
      }
    }
  }, [isOrgSuperAdmin, isOrgAdmin, selectedOrg, orgOptions, currentUser]);

  const handleSelectOrgType = (typeName: string) => {
    setOrgType(typeName as any);
    setSelectedBranch('All');
    localStorage.setItem('active_branch', 'All');
    setIsOrgTypeDropdownOpen(false);
    showToast?.('success', 'Organisation Type Switched', `Active organisation type set to ${typeName}`);
  };

  const handleSelectOrg = (orgName: string) => {
    setSelectedOrg(orgName);
    if (isOrgSuperAdmin) {
      localStorage.setItem('active_organization_orgsuperadmin', orgName);
    } else {
      localStorage.setItem('active_organization', orgName);
    }

    const matched = orgOptions.find((o) => o.name.toLowerCase() === orgName.toLowerCase());
    const orgType =
      (matched as any)?.organizationType ||
      (orgName.toLowerCase().includes('sale') ? 'Sales Management' : 'Client Management');

    if (isOrgSuperAdmin && orgType !== selectedOrgType) {
      setOrgType(orgType);
      localStorage.setItem('active_org_type_orgsuperadmin', orgType);
    }

    setIsOrgDropdownOpen(false);
    showToast?.('success', 'Organization Switched', `Active organization set to ${orgName} (${orgType})`);
    window.dispatchEvent(
      new CustomEvent('orgChanged', { detail: { name: orgName, organizationType: orgType } })
    );
    window.dispatchEvent(new CustomEvent('orgTypeChanged', { detail: orgType }));
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
    if (path.startsWith('/sale-management/sales/customer') || currentTab === 'sales-hub-customer') return 'Customer';
    if (path.startsWith('/sale-management/sales/sales-representatives') || currentTab === 'sales-hub-sales-representative') return 'Sales Representatives';
    if (path.startsWith('/sale-management/sales/quotation') || path.startsWith('/sale-management/sales/estimate') || currentTab === 'sales-hub-quotation') return 'Estimate/Quotation';
    if (path.startsWith('/sale-management/sales/proforma') || currentTab === 'sales-hub-proforma') return 'Proforma Invoice';
    if (path.startsWith('/sale-management/sales/sale-order') || currentTab === 'sales-hub-order') return 'Sales Order';
    if (path.startsWith('/sale-management/sales/delivery-challan') || currentTab === 'sales-hub-challan') return 'Delivery Challan';
    if (path === '/sale-management/sales/sale' || path.startsWith('/sale-management/sales/sale/') || currentTab === 'sales-hub-sales') return 'Sales Invoice';
    if (path.startsWith('/sale-management/sales/payment-in') || path.startsWith('/sale-management/sales/payment') || currentTab === 'sales-hub-payment-in') return 'Payment-In';
    if (path.startsWith('/sale-management/sales/return') || currentTab === 'sales-hub-returns') return 'Sales Return';
    if (path.startsWith('/sale-management/sales/collections') || currentTab === 'sales-hub-collections') return 'Collections';
    if (path.startsWith('/sale-management/sales/report') || currentTab === 'sales-hub-report') return 'Sales Report';

    // Sale Management - Purchase
    if (path.startsWith('/sale-management/purchase/supplier') || currentTab === 'purchase-supplier') return 'Supplier';
    if (path.startsWith('/sale-management/purchase/request') || currentTab === 'purchase-request') return 'Purchase Request';
    if (path.startsWith('/sale-management/purchase/purchase') || currentTab === 'purchase-order') return 'Purchase Bills';
    if (path.startsWith('/sale-management/purchase/return') || currentTab === 'purchase-returns') return 'Purchase Return';
    if (path.startsWith('/sale-management/purchase/payment-out') || currentTab === 'purchase-payment-out') return 'Payment Out';
    if (path.startsWith('/sale-management/purchase/expense') || currentTab === 'purchase-expense' || currentTab === 'billing-purchase-expense') return 'Expense';

    // Sale Management - Reports
    if (path.startsWith('/sale-management/reports') || currentTab === 'sm-reports') return 'Sale Report';

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

        {/* Organisation Admin Header Filters: Sub-Org Dropdown, Branch Dropdown, Products Dropdown (Client only) */}
        {isOrgSuperAdmin || isOrgAdmin ? (
          <>
            {/* Sub-Organization Selector (Converted from Org Dropdown) */}
            <div className="relative shrink-0" ref={subOrgRef}>
              <button
                id="suborg-selector-button"
                type="button"
                onClick={() => setIsSubOrgDropdownOpen(!isSubOrgDropdownOpen)}
                className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 bg-transparent hover:bg-slate-100/70 active:scale-[0.98] transition-all duration-150 cursor-pointer select-none text-xs sm:text-[13px] font-semibold text-slate-700 rounded-xl"
                title="Select Sub-Organization"
              >
                <span className="whitespace-nowrap truncate max-w-[100px] sm:max-w-[130px] xl:max-w-none">
                  <span className="hidden xl:inline text-slate-500 font-normal">Sub Org: </span>
                  <span className="text-slate-700 font-semibold">{selectedSubOrg}</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isSubOrgDropdownOpen ? 'rotate-180 text-slate-600' : ''}`}
                />
              </button>

              {isSubOrgDropdownOpen && (
                <div
                  className="absolute top-full mt-1.5 right-0 min-w-[190px] bg-white shadow-xl border border-slate-200 p-1 z-50 overflow-hidden space-y-0.5 rounded-xl max-h-72 overflow-y-auto"
                >
                  {subOrgOptions.map((sub) => {
                    const isActive =
                      selectedSubOrg.toLowerCase() === sub.name.toLowerCase();

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSelectSubOrg(sub.name)}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold transition-colors text-left cursor-pointer rounded-lg ${isActive
                            ? 'bg-[#33077C]/10 text-[#33077C]'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                      >
                        <span className="truncate">{sub.name}</span>
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
                  className="absolute top-full mt-1.5 right-0 min-w-[170px] bg-white shadow-xl border border-slate-200 p-1 z-50 overflow-hidden space-y-0.5 rounded-xl max-h-72 overflow-y-auto"
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
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold transition-colors text-left cursor-pointer rounded-lg ${isActive
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

            {/* Products Selector: Only Rendered in Client Management, Removed in Sale Management */}
            {!isSalesMode && (
              <div className="relative shrink-0" ref={prodRef}>
                <button
                  id="product-selector-button"
                  type="button"
                  onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                  className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 bg-transparent hover:bg-slate-100/70 active:scale-[0.98] transition-all duration-150 cursor-pointer select-none text-xs sm:text-[13px] font-semibold text-slate-700 rounded-xl"
                  title="Select Products"
                >
                  <span className="whitespace-nowrap truncate max-w-[90px] xl:max-w-none">
                    <span className="hidden xl:inline text-slate-500 font-normal">Products: </span>
                    <span className="text-slate-700 font-semibold">{selectedProduct}</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isProductDropdownOpen ? 'rotate-180 text-slate-600' : ''}`}
                  />
                </button>

                {isProductDropdownOpen && (
                  <div
                    className="absolute top-full mt-1.5 right-0 min-w-[170px] bg-white shadow-xl border border-slate-200 p-1 z-50 overflow-hidden space-y-0.5 rounded-xl max-h-72 overflow-y-auto"
                  >
                    {productOptions.map((prod) => {
                      const isActive =
                        selectedProduct.toLowerCase() === prod.name.toLowerCase();

                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleSelectProduct(prod.name)}
                          className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold transition-colors text-left cursor-pointer rounded-lg ${isActive
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
                          className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold transition-colors text-left cursor-pointer rounded-lg ${isActive
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
                          className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold transition-colors text-left cursor-pointer rounded-xs ${isActive
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
                    {(isOrgSuperAdmin || isOrgAdmin) && (
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
                        className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left ${isCurrent
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

