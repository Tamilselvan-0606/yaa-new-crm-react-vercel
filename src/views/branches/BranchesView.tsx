import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  branchApi,
  BranchApiItem,
  getStoredOrganizationId,
  subOrganizationApi,
  SubOrganizationApiItem,
  organizationApi,
  OrganizationApiItem,
} from '../../api';
import { Branch, BranchStatus } from '../../types';
import {
  GitBranch,
  Plus,
  Phone,
  MessageCircle,
  Mail,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Ban,
  PauseCircle,
  CheckCircle2,
  X,
  Building2,
  MapPin,
  UserRound,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import { Modal } from '../../components/common/Modal';
import { CustomSelect } from '../../components/common/CustomSelect';
import { ConfirmationModal } from '../../utils/confirmationModal';
import { useActiveOrgType } from '../../hooks/useActiveOrgType';

const mapApiBranchToBranch = (item: BranchApiItem): Branch => {
  const rawStatus = (item.status || 'Active').toString();
  const normalizedStatus: BranchStatus =
    rawStatus.toLowerCase().startsWith('suspend')
      ? 'Suspended'
      : rawStatus.toLowerCase().startsWith('inact')
      ? 'Inactive'
      : 'Active';

  return {
    id: item.id,
    name: item.name || 'Unnamed Branch',
    code: item.code || 'BR',
    contactPerson: item.contactPerson || item.user?.name || '',
    mobileNumber: item.mobileNumber || item.phone || '',
    whatsapp: item.whatsapp || item.mobileNumber || item.phone || '',
    email: item.email || item.user?.email || '',
    location: item.location || item.city || item.address || '',
    city: item.city || item.location || '',
    state: item.state || '',
    address: item.address || item.location || '',
    gstNumber: item.gstNumber || '',
    status: normalizedStatus,
    createdAt: item.createdAt || new Date().toISOString(),
    organizationId: item.organizationId || (item as any).organization_id,
    subOrganizationId:
      item.subOrganizationId ||
      (item as any).sub_organization_id ||
      (item as any).subOrganization?.id ||
      '',
    organizationType: (item as any).organizationType || (item as any).organization_type,
    productId: item.productId,
    productName: item.productName,
  };
};

export const BranchesView: React.FC = () => {
  const { showToast, currentUser } = useAuth();
  const { isSaleManagement, isClientManagement, activeOrgType, setOrgType, isAll } = useActiveOrgType();
  const canSwitch = isAll;

  // Data states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter States
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 3-Dots Action Dropdown State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, key: string, label: string) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast?.('success', 'Copied to Clipboard', `${label}: ${text}`);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // View Modal State
  const [viewBranch, setViewBranch] = useState<Branch | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Confirmation Modal State (Inactive / Suspend / Delete)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'Inactive' | 'Suspend' | 'Delete';
    branch: Branch;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    organizationId: '',
    subOrganizationId: '',
    organizationType: isSaleManagement ? 'Sales Management' : 'Client Management',
    contactPerson: '',
    mobileNumber: '',
    whatsapp: '',
    email: '',
    password: '',
    roleId: '',
    location: '',
    status: 'Active' as BranchStatus,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Organizations & Sub-Organizations state
  const [subOrganizations, setSubOrganizations] = useState<SubOrganizationApiItem[]>([]);
  const [loadingSubOrgs, setLoadingSubOrgs] = useState<boolean>(false);
  const [defaultOrgName, setDefaultOrgName] = useState<string>(() => {
    return (
      localStorage.getItem('active_organization_orgsuperadmin') ||
      localStorage.getItem('active_organization') ||
      currentUser?.name ||
      'Yaa Creations'
    );
  });

  // Fetch active Organization name & Sub-Organizations list strictly segregated by Suite
  const loadOrganizationAndSubOrgs = async () => {
    try {
      setLoadingSubOrgs(true);
      const activeOrgId = currentUser?.organizationId || getStoredOrganizationId();

      // 1. Try to get parent organization details if available
      if (activeOrgId) {
        try {
          const orgRes = await organizationApi.getOrganizationById(activeOrgId);
          if (orgRes && orgRes.data && orgRes.data.name) {
            setDefaultOrgName(orgRes.data.name);
          }
        } catch {
          // Fallback to stored names or user name
        }
      }

      // 2. Fetch Sub-Organizations list
      let apiSubs: SubOrganizationApiItem[] = [];
      try {
        const subRes = await subOrganizationApi.getSubOrganizations(
          { page_no: 1, page_size: 100, pagination_required: 'false' },
          activeOrgId || undefined
        );

        if (subRes && subRes.success && Array.isArray(subRes.data)) {
          apiSubs = subRes.data;
        } else if (subRes && Array.isArray(subRes.data)) {
          apiSubs = subRes.data;
        }
      } catch (err) {
        console.warn('API getSubOrganizations notice:', err);
      }

      const isSubForSuite = (name: string, type?: string) => {
        const t = (type || '').toLowerCase();
        if (isSaleManagement) {
          return t.includes('sale');
        } else {
          return t.includes('client') || !t.includes('sale');
        }
      };

      const loadedSubsFromApi = apiSubs.filter((s) => isSubForSuite(s.name, (s as any).organizationType));
      const subMap = new Map<string, SubOrganizationApiItem>();
      loadedSubsFromApi.forEach((s) => {
        subMap.set(s.name.toLowerCase(), s);
      });

      // Only fallback to locally created sub-orgs if API returned nothing
      if (loadedSubsFromApi.length === 0) {
        const savedOrgs = localStorage.getItem('organizations_catalog_orgsuperadmin');
        if (savedOrgs) {
          try {
            const parsed = JSON.parse(savedOrgs);
            if (Array.isArray(parsed)) {
              const mockNames = ['yaa academy', 'next gen academy', 'yaa care', 'yaa tech solutions', 'fts academy', 'fyndus academy', 'polihills', 'apex mart & retail', 'apex mart'];
              const filtered = parsed.filter((so: any) => !mockNames.includes((so.name || '').toLowerCase()));
              if (filtered.length !== parsed.length) {
                localStorage.setItem('organizations_catalog_orgsuperadmin', JSON.stringify(filtered));
              }
              filtered.forEach((so: any) => {
                if (isSubForSuite(so.name || '', so.organizationType)) {
                  subMap.set((so.name || '').toLowerCase(), {
                    id: so.id || `sub_${Date.now()}`,
                    organizationId: activeOrgId || 'org_main',
                    name: so.name,
                    code: so.code || `SUB-${so.name.slice(0, 3).toUpperCase()}`,
                    status: so.status || 'Active',
                    createdAt: so.createdAt || new Date().toISOString(),
                  });
                }
              });
            }
          } catch {}
        }
      }

      const loadedSubs = Array.from(subMap.values());
      setSubOrganizations(loadedSubs);

      // Immediately trigger loadData with loaded sub-orgs so refresh never encounters an empty sub-org list
      const activeSubOrgName = localStorage.getItem('active_sub_organization');
      const matched =
        activeSubOrgName && activeSubOrgName !== 'All'
          ? loadedSubs.find((s) => s.name.toLowerCase() === activeSubOrgName.toLowerCase())
          : undefined;
      const effectiveSubId = matched?.id || localStorage.getItem('active_sub_organization_id') || undefined;
      loadData(page, pageSize, appliedSearch, appliedStatus, effectiveSubId, loadedSubs);
    } catch (err) {
      console.error('Failed to load sub-organizations:', err);
      setSubOrganizations([]);
    } finally {
      setLoadingSubOrgs(false);
    }
  };

  useEffect(() => {
    loadOrganizationAndSubOrgs();
  }, [currentUser?.organizationId, isSaleManagement]);

  // Listen to subOrgChanged and branchChanged events to reload branches based on header selections
  useEffect(() => {
    const handleSubOrgChanged = (e: any) => {
      const subId = e?.detail?.subOrganizationId || e?.detail?.id;
      loadData(1, pageSize, appliedSearch, appliedStatus, subId);
    };
    const handleBranchChanged = () => {
      loadData(1, pageSize, appliedSearch, appliedStatus);
    };
    window.addEventListener('subOrgChanged', handleSubOrgChanged);
    window.addEventListener('branchChanged', handleBranchChanged);
    return () => {
      window.removeEventListener('subOrgChanged', handleSubOrgChanged);
      window.removeEventListener('branchChanged', handleBranchChanged);
    };
  }, [subOrganizations, pageSize, appliedSearch, appliedStatus]);

  const isBranchForSuite = (b: Branch) => {
    const typeStr = (b.organizationType || '').toLowerCase();
    if (isSaleManagement) {
      return typeStr.includes('sale');
    } else {
      return typeStr.includes('client') || !typeStr.includes('sale');
    }
  };

  const loadData = async (
    targetPage = page,
    targetPageSize = pageSize,
    searchTerm = appliedSearch,
    statusTerm = appliedStatus,
    targetSubOrgId?: string,
    providedSubs?: SubOrganizationApiItem[]
  ) => {
    try {
      setLoading(true);
      const activeOrgId = currentUser?.organizationId || getStoredOrganizationId();

      const activeSubOrgName = localStorage.getItem('active_sub_organization');
      const storedSubOrgId = localStorage.getItem('active_sub_organization_id');

      let currentSubs = providedSubs && providedSubs.length > 0 ? providedSubs : subOrganizations;
      if (currentSubs.length === 0 && activeOrgId) {
        try {
          const subRes = await subOrganizationApi.getSubOrganizations(
            { page_no: 1, page_size: 100, pagination_required: 'false' },
            activeOrgId || undefined
          );
          if (subRes && Array.isArray(subRes.data)) {
            currentSubs = subRes.data;
            setSubOrganizations(currentSubs);
          }
        } catch {}
      }

      const matchedSub =
        activeSubOrgName && activeSubOrgName !== 'All'
          ? currentSubs.find(
              (s) => s.name.toLowerCase() === activeSubOrgName.toLowerCase()
            )
          : undefined;

      const subIdToFilter =
        targetSubOrgId !== undefined
          ? targetSubOrgId
          : (matchedSub?.id || (activeSubOrgName && activeSubOrgName !== 'All' && storedSubOrgId ? storedSubOrgId : undefined));

      let apiBranches: Branch[] = [];
      try {
        const res = await branchApi.getBranches(
          {
            page_no: 1,
            page_size: 100,
            pagination_required: 'false',
            sub_organization_id: subIdToFilter,
          },
          activeOrgId || undefined
        );

        if (res && (res.success || Array.isArray(res.data))) {
          const list = Array.isArray(res.data) ? res.data : [];
          apiBranches = list.map(mapApiBranchToBranch);
        }
      } catch (err) {
        console.warn('API getBranches notice:', err);
      }

      const branchMap = new Map<string, Branch>();

      // 1. Add API branches strictly matching this suite and selected sub-organization
      apiBranches
        .filter(isBranchForSuite)
        .filter((br) => {
          if (subIdToFilter) {
            return br.subOrganizationId === subIdToFilter;
          }
          if (activeSubOrgName && activeSubOrgName !== 'All') {
            const brSub = currentSubs.find((s) => s.id === br.subOrganizationId);
            return brSub ? brSub.name.toLowerCase() === activeSubOrgName.toLowerCase() : true;
          }
          return true;
        })
        .forEach((br) => {
          branchMap.set(br.name.toLowerCase(), {
            ...br,
            organizationType: isSaleManagement ? 'Sales Management' : 'Client Management',
          });
        });

      let allItems = Array.from(branchMap.values());

      // Filter by active branch from header if a specific branch is selected
      const activeBranchName = localStorage.getItem('active_branch');
      const activeBranchId = localStorage.getItem('active_branch_id');
      if (activeBranchName && activeBranchName !== 'All') {
        allItems = allItems.filter((b) => {
          if (activeBranchId && b.id === activeBranchId) return true;
          const loc = (b.location || '').toLowerCase();
          const city = (b.city || '').toLowerCase();
          const name = (b.name || '').toLowerCase();
          const target = activeBranchName.toLowerCase();
          return loc === target || city === target || name.includes(target);
        });
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        allItems = allItems.filter(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            b.code.toLowerCase().includes(q) ||
            (b.contactPerson && b.contactPerson.toLowerCase().includes(q)) ||
            (b.location && b.location.toLowerCase().includes(q)) ||
            (b.city && b.city.toLowerCase().includes(q)) ||
            (b.email && b.email.toLowerCase().includes(q))
        );
      }

      // Status filter
      if (statusTerm !== 'ALL') {
        allItems = allItems.filter((b) => b.status === statusTerm);
      }

      setTotalRecords(allItems.length);
      const startIdx = (targetPage - 1) * targetPageSize;
      setBranches(allItems.slice(startIdx, startIdx + targetPageSize));
    } catch (err: any) {
      console.error('Failed to load branches data:', err);
      setBranches([]);
      setTotalRecords(0);
      showToast?.('error', 'Error', err?.response?.data?.message || err.message || 'Failed to load branches data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedSubId = localStorage.getItem('active_sub_organization_id') || undefined;
    loadData(page, pageSize, appliedSearch, appliedStatus, storedSubId);
  }, [page, pageSize, appliedSearch, appliedStatus, isSaleManagement]);

  // Listen for cross-component branch changes
  useEffect(() => {
    const handleBranchesChanged = () => {
      loadData(page, pageSize, appliedSearch, appliedStatus);
    };
    window.addEventListener('branchesChanged', handleBranchesChanged);
    return () => window.removeEventListener('branchesChanged', handleBranchesChanged);
  }, [page, pageSize, appliedSearch, appliedStatus, isSaleManagement]);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.branch-action-dropdown-container') && !target.closest('.branch-action-dropdown-menu')) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    };
    const handleScroll = () => {
      if (activeDropdownId) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeDropdownId]);

  // Modal Handlers
  const handleOpenAddModal = () => {
    setEditingBranch(null);
    setShowPassword(false);
    setFormErrors({});
    const activeOrgId = currentUser?.organizationId || getStoredOrganizationId() || '';
    setFormData({
      name: '',
      code: '',
      organizationId: activeOrgId,
      subOrganizationId: subOrganizations[0]?.id || '',
      organizationType: isSaleManagement ? 'Sales Management' : 'Client Management',
      contactPerson: '',
      mobileNumber: '',
      whatsapp: '',
      email: '',
      password: '',
      roleId: '',
      location: '',
      status: 'Active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setShowPassword(false);
    setFormErrors({});
    const activeOrgId = branch.organizationId || currentUser?.organizationId || getStoredOrganizationId() || '';
    setFormData({
      name: branch.name || '',
      code: branch.code || '',
      organizationId: activeOrgId,
      subOrganizationId: branch.subOrganizationId || '',
      organizationType: branch.organizationType || (isSaleManagement ? 'Sales Management' : 'Client Management'),
      contactPerson: branch.contactPerson || '',
      mobileNumber: branch.mobileNumber || '',
      whatsapp: branch.whatsapp || '',
      email: branch.email || '',
      password: '',
      roleId: '',
      location: branch.location || branch.city || branch.address || '',
      status: branch.status || 'Active',
    });
    setIsModalOpen(true);
  };

  const handleViewBranch = (branch: Branch) => {
    setViewBranch(branch);
    setIsViewModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Branch Name is required';
    }
    if (!formData.code.trim()) {
      errors.code = 'Branch Code is required';
    }
    if (!formData.organizationId && !defaultOrgName.trim()) {
      errors.organizationId = 'Select Organization is required';
    }
    if (subOrganizations.length > 0 && !formData.subOrganizationId) {
      errors.subOrganizationId = 'Select Sub-Organization is required';
    }
    if (!formData.contactPerson.trim()) {
      errors.contactPerson = 'Contact Person Name is required';
    }
    if (!formData.mobileNumber.trim()) {
      errors.mobileNumber = 'Mobile Number is required';
    } else if (formData.mobileNumber.trim().length !== 10) {
      errors.mobileNumber = 'Mobile Number must be exactly 10 digits';
    }
    if (formData.whatsapp.trim() && formData.whatsapp.trim().length !== 10) {
      errors.whatsapp = 'WhatsApp Number must be exactly 10 digits';
    }
    if (!formData.location.trim()) {
      errors.location = 'Location is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!editingBranch && !formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (!editingBranch && formData.password.trim().length < 12) {
      errors.password = 'Password must be at least 12 characters';
    }
    if (!formData.status) {
      errors.status = 'Status is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      setSubmitting(true);
      const activeOrgId = currentUser?.organizationId || getStoredOrganizationId();
      const suiteType = formData.organizationType || (isSaleManagement ? 'Sales Management' : 'Client Management');

      if (editingBranch) {
        await branchApi.updateBranch(editingBranch.id, {
          name: formData.name.trim(),
          code: formData.code.trim(),
          organizationId: activeOrgId || undefined,
          subOrganizationId: formData.subOrganizationId || undefined,
          contactPerson: formData.contactPerson.trim(),
          phone: formData.mobileNumber.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          whatsapp: formData.whatsapp.trim(),
          email: formData.email.trim(),
          location: formData.location.trim(),
          city: formData.location.trim(),
          status: formData.status,
        });

        // Update local catalog
        const savedCatalog = localStorage.getItem('branches_catalog_orgsuperadmin');
        let catalogList: Branch[] = [];
        if (savedCatalog) {
          try {
            catalogList = JSON.parse(savedCatalog);
            if (!Array.isArray(catalogList)) catalogList = [];
          } catch {}
        }
        const updatedBranchObj: Branch = {
          ...editingBranch,
          name: formData.name.trim(),
          code: formData.code.trim(),
          organizationId: activeOrgId || undefined,
          subOrganizationId: formData.subOrganizationId || undefined,
          organizationType: suiteType,
          contactPerson: formData.contactPerson.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          whatsapp: formData.whatsapp.trim(),
          email: formData.email.trim(),
          location: formData.location.trim(),
          city: formData.location.trim(),
          status: formData.status,
        };
        const idx = catalogList.findIndex((b) => b.id === editingBranch.id || b.name.toLowerCase() === editingBranch.name.toLowerCase());
        if (idx >= 0) {
          catalogList[idx] = updatedBranchObj;
        } else {
          catalogList.push(updatedBranchObj);
        }
        localStorage.setItem('branches_catalog_orgsuperadmin', JSON.stringify(catalogList));
        window.dispatchEvent(new CustomEvent('branchesChanged'));

        showToast?.('success', 'Branch Updated', `Branch "${formData.name}" updated successfully`);
      } else {
        const trimmedEmail = formData.email.trim();
        const trimmedPassword = formData.password.trim();
        const trimmedCode = formData.code.trim();
        const trimmedName = formData.name.trim();

        await branchApi.createBranch({
          code: trimmedCode,
          name: trimmedName,
          email: trimmedEmail,
          password: trimmedPassword,
          roleId: formData.roleId.trim() || undefined,
          organizationId: activeOrgId || undefined,
          subOrganizationId: formData.subOrganizationId || undefined,
          contactPerson: formData.contactPerson.trim() || undefined,
          phone: formData.mobileNumber.trim() || undefined,
          mobileNumber: formData.mobileNumber.trim() || undefined,
          whatsapp: formData.whatsapp.trim() || undefined,
          location: formData.location.trim() || undefined,
          city: formData.location.trim() || undefined,
          status: formData.status,
          user: {
            email: trimmedEmail,
            password: trimmedPassword,
            name: formData.contactPerson.trim() || trimmedName,
            roleId: formData.roleId.trim() || undefined,
          },
        });

        // Add to local catalog tagged with suite
        const newBranchObj: Branch = {
          id: `br_${Date.now()}`,
          name: trimmedName,
          code: trimmedCode,
          email: trimmedEmail,
          organizationId: activeOrgId || undefined,
          subOrganizationId: formData.subOrganizationId || undefined,
          organizationType: suiteType,
          contactPerson: formData.contactPerson.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          whatsapp: formData.whatsapp.trim(),
          location: formData.location.trim(),
          city: formData.location.trim(),
          status: formData.status,
          createdAt: new Date().toISOString(),
        };

        const savedCatalog = localStorage.getItem('branches_catalog_orgsuperadmin');
        let catalogList: Branch[] = [];
        if (savedCatalog) {
          try {
            catalogList = JSON.parse(savedCatalog);
            if (!Array.isArray(catalogList)) catalogList = [];
          } catch {}
        }
        catalogList.push(newBranchObj);
        localStorage.setItem('branches_catalog_orgsuperadmin', JSON.stringify(catalogList));
        window.dispatchEvent(new CustomEvent('branchesChanged'));

        showToast?.('success', 'Branch Created', `Branch "${formData.name}" created successfully`);
      }
      setIsModalOpen(false);
      loadData(page, pageSize, appliedSearch, appliedStatus);
    } catch (err: any) {
      console.error('Failed to save branch:', err);
      const backendMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.response?.data?.error?.fields?.[0]?.message ||
        err.message ||
        'Could not save branch';
      showToast?.('error', 'Operation Failed', backendMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (branch: Branch, newStatus: BranchStatus) => {
    try {
      try {
        await branchApi.updateBranchStatus(branch.id, newStatus);
      } catch (apiErr) {
        console.warn('API updateBranchStatus notice (updating locally):', apiErr);
      }

      // Update in local catalog
      const savedCatalog = localStorage.getItem('branches_catalog_orgsuperadmin');
      if (savedCatalog) {
        try {
          const catalogList: Branch[] = JSON.parse(savedCatalog);
          if (Array.isArray(catalogList)) {
            const updated = catalogList.map((b) => {
              if (b.id === branch.id || b.name.toLowerCase() === branch.name.toLowerCase()) {
                return { ...b, status: newStatus };
              }
              return b;
            });
            localStorage.setItem('branches_catalog_orgsuperadmin', JSON.stringify(updated));
          }
        } catch {}
      }
      window.dispatchEvent(new CustomEvent('branchesChanged'));

      showToast?.('success', 'Status Updated', `Branch status changed to ${newStatus}`);
      loadData(page, pageSize, appliedSearch, appliedStatus);
    } catch (err: any) {
      showToast?.('error', 'Error', err?.response?.data?.message || err.message || 'Failed to update status');
    }
  };

  const handleDeleteBranch = async (branch: Branch) => {
    try {
      try {
        await branchApi.deleteBranch(branch.id);
      } catch (delErr: any) {
        if (delErr?.response?.status === 404 || delErr?.response?.status === 405) {
          try {
            await branchApi.updateBranchStatus(branch.id, 'Inactive');
          } catch {}
        }
      }

      // Remove from local catalog
      const savedCatalog = localStorage.getItem('branches_catalog_orgsuperadmin');
      if (savedCatalog) {
        try {
          const catalogList: Branch[] = JSON.parse(savedCatalog);
          if (Array.isArray(catalogList)) {
            const updated = catalogList.filter((b) => b.id !== branch.id && b.name.toLowerCase() !== branch.name.toLowerCase());
            localStorage.setItem('branches_catalog_orgsuperadmin', JSON.stringify(updated));
          }
        } catch {}
      }
      window.dispatchEvent(new CustomEvent('branchesChanged'));

      showToast?.('success', 'Branch Deleted', `Branch "${branch.name}" deleted successfully`);
      loadData(page, pageSize, appliedSearch, appliedStatus);
    } catch (err: any) {
      const backendMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to delete branch';
      showToast?.('error', 'Error', backendMsg);
    }
  };

  const formatCreatedDate = (dateStr?: string): string => {
    if (!dateStr) return '15 Jan, 2023';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month}, ${year}`;
    } catch {
      return dateStr;
    }
  };

  const getBranchInitials = (name?: string): string => {
    if (!name) return 'BR';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(page, totalPages);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Top Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <GitBranch className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Branches
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            List and manage regional branches and office locations
          </p>
        </div>

        {/* Top Right Action Button: Add Branch */}
        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAddModal}
            icon={<Plus className="w-4 h-4 text-white" />}
            className="w-full sm:w-auto justify-center"
          >
            Add Branch
          </Button>
        </div>
      </div>

      {/* 2. Search Bar & Dropdown Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search branches by name, code, contact person..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedStatus(pendingStatus);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingStatus('ALL');
          setAppliedStatus('ALL');
          setPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Dropdown */}
            <FilterDropdown
              options={[
                { label: 'Status : All', value: 'ALL' },
                { label: 'Active', value: 'Active', dotColor: '#10b981' },
                { label: 'Inactive', value: 'Inactive', dotColor: '#64748b' },
                { label: 'Suspended', value: 'Suspended', dotColor: '#f59e0b' },
              ]}
              value={pendingStatus}
              onChange={(val) => setPendingStatus(val)}
              placeholder="Status : All"
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Branches :{' '}
              <span className="text-[#33077C] font-bold">{totalRecords}</span>
            </span>
          </div>
        }
      />

      {/* 3. Branches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[1100px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">BRANCH & CODE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">SUB-ORGANIZATION & TYPE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CONTACT PERSON</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">CONTACT INFO</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">LOCATION</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CREATED DATE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-2 border-purple-200 border-t-[#33077C] rounded-full animate-spin" />
                      <span className="text-xs text-slate-500">Loading branches...</span>
                    </div>
                  </td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    No branches found matching your criteria.
                  </td>
                </tr>
              ) : (
                branches.map((branch) => {
                  const initials = getBranchInitials(branch.name);

                  return (
                    <tr
                      key={branch.id}
                      className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans"
                    >
                      {/* 1. BRANCH & CODE */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-medium text-xs tracking-wider shadow-xs shrink-0 select-none">
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-xs sm:text-[14px]">
                              {branch.name}
                            </span>
                            <span className="text-[11px] font-bold text-[#33077C] tracking-wide mt-0.5">
                              {branch.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. SUB-ORGANIZATION & TYPE */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                            {subOrganizations.find((s) => s.id === branch.subOrganizationId)?.name || 'Direct Organization'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {branch.organizationType || (isSaleManagement ? 'Sales Management' : 'Client Management')}
                          </span>
                        </div>
                      </td>

                      {/* 2. CONTACT PERSON */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <UserRound className="w-4 h-4 text-[#33077C]" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-xs sm:text-[13px] block">
                              {branch.contactPerson || '-'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              Branch In-charge
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. CONTACT INFO */}
                      <td className="py-4 px-4 border border-slate-200 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {/* Mobile / Phone */}
                          {branch.mobileNumber ? (
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={(e) => handleCopy(e, branch.mobileNumber!, `${branch.id}-phone`, 'Phone Number')}
                                className="w-8 h-8 rounded-lg bg-[#EBF3FF] hover:bg-[#dbeafe] flex items-center justify-center text-[#2563EB] hover:scale-110 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                title="Click to copy phone number"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </button>
                              <div
                                className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 text-white text-[11px] font-semibold rounded-md shadow-md whitespace-nowrap z-30 ${
                                  copiedKey === `${branch.id}-phone`
                                    ? 'opacity-100 bg-emerald-600 scale-100'
                                    : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                }`}
                              >
                                {copiedKey === `${branch.id}-phone` ? 'Copied!' : branch.mobileNumber}
                              </div>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 opacity-40">
                              <Phone className="w-3.5 h-3.5" />
                            </div>
                          )}

                          {/* WhatsApp */}
                          {branch.whatsapp ? (
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={(e) => handleCopy(e, branch.whatsapp!, `${branch.id}-wa`, 'WhatsApp Number')}
                                className="w-8 h-8 rounded-lg bg-[#ECFDF5] hover:bg-[#d1fae5] flex items-center justify-center text-[#059669] hover:scale-110 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                title="Click to copy WhatsApp number"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                              <div
                                className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 text-white text-[11px] font-semibold rounded-md shadow-md whitespace-nowrap z-30 ${
                                  copiedKey === `${branch.id}-wa`
                                    ? 'opacity-100 bg-emerald-600 scale-100'
                                    : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                }`}
                              >
                                {copiedKey === `${branch.id}-wa` ? 'Copied!' : branch.whatsapp}
                              </div>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 opacity-40">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </div>
                          )}

                          {/* Email */}
                          {branch.email ? (
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={(e) => handleCopy(e, branch.email!, `${branch.id}-email`, 'Email Address')}
                                className="w-8 h-8 rounded-lg bg-[#FEEFEE] hover:bg-[#fee2e2] flex items-center justify-center text-[#EF4444] hover:scale-110 active:scale-95 transition-all shadow-2xs cursor-pointer"
                                title="Click to copy email address"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                              <div
                                className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 text-white text-[11px] font-semibold rounded-md shadow-md whitespace-nowrap z-30 ${
                                  copiedKey === `${branch.id}-email`
                                    ? 'opacity-100 bg-emerald-600 scale-100'
                                    : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                }`}
                              >
                                {copiedKey === `${branch.id}-email` ? 'Copied!' : branch.email}
                              </div>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 opacity-40">
                              <Mail className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. LOCATION */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#33077C] shrink-0" />
                          <span>{branch.location || branch.city || branch.address || 'N/A'}{branch.state && !branch.location?.includes(branch.state) ? `, ${branch.state}` : ''}</span>
                        </div>
                      </td>

                      {/* 5. STATUS */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        {branch.status === 'Inactive' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span>Inactive</span>
                          </span>
                        ) : branch.status === 'Suspended' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>Suspended</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-300/80 text-xs font-bold shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      {/* 6. CREATED DATE */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div>
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px] block">
                            {formatCreatedDate(branch.createdAt)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                            {branch.status === 'Suspended' ? 'Suspended Branch' : branch.status === 'Inactive' ? 'Inactive Branch' : 'Active Branch'}
                          </span>
                        </div>
                      </td>

                      {/* 7. ACTIONS */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                        <div className="relative inline-block text-left branch-action-dropdown-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeDropdownId === branch.id) {
                                setActiveDropdownId(null);
                                setDropdownPos(null);
                              } else {
                                const btnRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                const spaceBelow = window.innerHeight - btnRect.bottom;
                                const dropdownHeight = 220;
                                if (spaceBelow < dropdownHeight) {
                                  setDropdownPos({
                                    bottom: window.innerHeight - btnRect.top + 4,
                                    right: window.innerWidth - btnRect.right,
                                  });
                                } else {
                                  setDropdownPos({
                                    top: btnRect.bottom + 4,
                                    right: window.innerWidth - btnRect.right,
                                  });
                                }
                                setActiveDropdownId(branch.id);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4 fill-white text-white" />
                          </button>

                          {activeDropdownId === branch.id && dropdownPos && (
                            <div
                              className="branch-action-dropdown-menu fixed z-[9999] w-48 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                              style={{
                                top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
                                bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
                                right: `${dropdownPos.right}px`,
                              }}
                            >
                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleOpenEditModal(branch);
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-[#3B82F6] flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  <Pencil style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                </span>
                                <span>Edit</span>
                              </button>

                              {/* View */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleViewBranch(branch);
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-[#33077C] flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  <Eye style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                </span>
                                <span>View</span>
                              </button>

                              {/* Inactive / Active Toggle */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setConfirmAction({
                                    type: 'Inactive',
                                    branch,
                                  });
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-slate-500 flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  {branch.status === 'Inactive' ? (
                                    <CheckCircle2 style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  ) : (
                                    <Ban style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  )}
                                </span>
                                <span>{branch.status === 'Inactive' ? 'Active' : 'Inactive'}</span>
                              </button>

                              {/* Suspend / Resume */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setConfirmAction({
                                    type: 'Suspend',
                                    branch,
                                  });
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-amber-800 hover:bg-amber-50/60 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  {branch.status === 'Suspended' ? (
                                    <CheckCircle2 style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  ) : (
                                    <PauseCircle style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  )}
                                </span>
                                <span>{branch.status === 'Suspended' ? 'Resume' : 'Suspend'}</span>
                              </button>

                              <div className="my-1 mx-2 border-t border-slate-100" />

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setConfirmAction({
                                    type: 'Delete',
                                    branch,
                                  });
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-[#E11D48] hover:bg-rose-50/70 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-[#E11D48] flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  <Trash2 style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                </span>
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalRecords > 0 && (
        <Pagination
          total={totalRecords}
          currentPage={safePage}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {/* 4. Add / Edit Branch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBranch ? 'Edit Branch' : 'Add New Branch'}
        subtitle={
          <span className="text-white/80 text-xs font-normal">
            {editingBranch ? 'Update branch location and contact specifications' : 'Create a regional branch under your organization'}
          </span>
        }
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSaveBranch} className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150">

          {/* Row 1: Organization (Read-Only) | Sub-Organization | Branch Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Select Organization <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={defaultOrgName}
                  title="Default organization cannot be modified"
                  className={`w-full h-11 px-4 bg-slate-100/80 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-600 cursor-not-allowed select-none outline-none ${
                    formErrors.organizationId
                      ? 'border border-red-500'
                      : 'border border-slate-200'
                  }`}
                />
              </div>
              {formErrors.organizationId ? (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.organizationId}</p>
              ) : (
                <span className="text-[11px] text-slate-400 mt-1 block">Default organization (non-editable)</span>
              )}
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Select Sub-Organization {subOrganizations.length > 0 && <span className="text-rose-500 font-bold">*</span>}
              </label>
              <CustomSelect
                value={formData.subOrganizationId}
                onChange={(val) => {
                  setFormData({ ...formData, subOrganizationId: val });
                  if (formErrors.subOrganizationId) setFormErrors((prev) => ({ ...prev, subOrganizationId: '' }));
                }}
                options={
                  subOrganizations.length > 0
                    ? subOrganizations.map((sub) => ({
                        value: sub.id,
                        label: `${sub.name}${sub.code ? ` (${sub.code})` : ''}`,
                      }))
                    : [{ value: '', label: loadingSubOrgs ? 'Loading Sub-Organizations...' : 'No Sub-Organizations found' }]
                }
                placeholder="Select Sub-Organization"
                error={!!formErrors.subOrganizationId}
              />
              {formErrors.subOrganizationId && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.subOrganizationId}</p>
              )}
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Branch Name <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Enter branch name"
                className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  formErrors.name
                    ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              {formErrors.name && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.name}</p>
              )}
            </div>
          </div>

          {/* Row 2: Branch Code | Contact Person Name | Mobile Number */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Branch Code <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => {
                  setFormData({ ...formData, code: e.target.value.toUpperCase() });
                  if (formErrors.code) setFormErrors((prev) => ({ ...prev, code: '' }));
                }}
                placeholder="e.g. BR-001"
                className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all uppercase ${
                  formErrors.code
                    ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              {formErrors.code && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.code}</p>
              )}
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Contact Person Name <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => {
                  setFormData({ ...formData, contactPerson: e.target.value });
                  if (formErrors.contactPerson) setFormErrors((prev) => ({ ...prev, contactPerson: '' }));
                }}
                placeholder="Enter contact person name"
                className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  formErrors.contactPerson
                    ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              {formErrors.contactPerson && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.contactPerson}</p>
              )}
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Mobile Number <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="e.g. 9876543210"
                value={formData.mobileNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, mobileNumber: val });
                  if (formErrors.mobileNumber) setFormErrors((prev) => ({ ...prev, mobileNumber: '' }));
                }}
                className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  formErrors.mobileNumber
                    ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              {formErrors.mobileNumber && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.mobileNumber}</p>
              )}
            </div>
          </div>

          {/* Row 3: WhatsApp Number | Email | Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                WhatsApp Number
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="e.g. 9876543210"
                value={formData.whatsapp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, whatsapp: val });
                  if (formErrors.whatsapp) setFormErrors((prev) => ({ ...prev, whatsapp: '' }));
                }}
                className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  formErrors.whatsapp
                    ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              {formErrors.whatsapp && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.whatsapp}</p>
              )}
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Email <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="e.g. branch@organization.com"
                className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  formErrors.email
                    ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              {formErrors.email && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.email}</p>
              )}
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Location <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => {
                  setFormData({ ...formData, location: e.target.value });
                  if (formErrors.location) setFormErrors((prev) => ({ ...prev, location: '' }));
                }}
                placeholder="e.g. Chennai, Tamil Nadu"
                className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                  formErrors.location
                    ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              {formErrors.location && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.location}</p>
              )}
            </div>
          </div>

          {/* Row 4: Status | Password */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Status <span className="text-rose-500 font-bold">*</span>
              </label>
              <CustomSelect
                value={formData.status}
                onChange={(val) => {
                  setFormData({ ...formData, status: val as BranchStatus });
                  if (formErrors.status) setFormErrors((prev) => ({ ...prev, status: '' }));
                }}
                options={[
                  { label: 'Active', value: 'Active' },
                  { label: 'Inactive', value: 'Inactive' },
                  { label: 'Suspended', value: 'Suspended' },
                ]}
                placeholder="Select Status"
                error={!!formErrors.status}
              />
              {formErrors.status && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.status}</p>
              )}
            </div>
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Password {!editingBranch && <span className="text-rose-500 font-bold">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={editingBranch ? 'Leave empty to keep unchanged' : '••••••••••••'}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  className={`w-full h-11 pl-4 pr-10 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                    formErrors.password
                      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.password}</p>
              )}
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="md"
              icon={<X className="w-4 h-4 text-slate-500" />}
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto justify-center"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting}
              icon={<Check className="w-4 h-4 stroke-[2.5]" />}
              className="w-full sm:w-auto justify-center"
            >
              {submitting ? 'Saving...' : editingBranch ? 'Save Changes' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. View Branch Modal */}
      {viewBranch && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewBranch(null);
          }}
          title={viewBranch.name}
          subtitle={
            <div className="flex items-center gap-2 text-white/80 text-xs font-normal">
              <span>Branch Details & Overview</span>
              <span>•</span>
              <span className="font-semibold text-white">{viewBranch.code}</span>
            </div>
          }
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => {
            setIsViewModalOpen(false);
            setViewBranch(null);
          }}
        >
          <div className="p-4 sm:p-6 space-y-6 font-sans">
            {/* Top Profile Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#33077C] text-white flex items-center justify-center font-semibold text-lg tracking-wider shrink-0 shadow-md select-none">
                  {getBranchInitials(viewBranch.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {viewBranch.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFEBFF] text-[#33077C] border border-[#33077C]/20">
                      {viewBranch.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    {viewBranch.location && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-[#33077C]" />
                        {viewBranch.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {viewBranch.status === 'Inactive' ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Inactive
                  </span>
                ) : viewBranch.status === 'Suspended' ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-xs font-bold shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Suspended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Active Branch
                  </span>
                )}
              </div>
            </div>

            {/* Detail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card 1: Branch Info */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#33077C]" />
                  Branch Overview
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Branch Name</span>
                    <span className="font-bold text-slate-900">{viewBranch.name}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Branch Code</span>
                    <span className="font-bold text-[#33077C]">{viewBranch.code}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Suite Type</span>
                    <span className="font-bold text-[#33077C]">
                      {viewBranch.organizationType || (isSaleManagement ? 'Sales Management' : 'Client Management')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Organization</span>
                    <span className="font-bold text-slate-900">{defaultOrgName}</span>
                  </div>
                  {viewBranch.subOrganizationId && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Sub-Organization</span>
                      <span className="font-bold text-[#33077C]">
                        {subOrganizations.find((s) => s.id === viewBranch.subOrganizationId)?.name || 'Linked Sub-Org'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">GST Number</span>
                    <span className="font-bold text-slate-900">{viewBranch.gstNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Created Date</span>
                    <span className="font-bold text-slate-900">{formatCreatedDate(viewBranch.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Contact & Location */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <UserRound className="w-4 h-4 text-[#33077C]" />
                  Contact & Location
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Contact Person</span>
                    <span className="font-bold text-slate-900">{viewBranch.contactPerson || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Mobile Number</span>
                    <span className="font-bold text-slate-900">{viewBranch.mobileNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">WhatsApp Number</span>
                    <span className="font-bold text-slate-900">{viewBranch.whatsapp || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Email</span>
                    <span className="font-bold text-slate-900">{viewBranch.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Location</span>
                    <span className="font-bold text-slate-900 text-right max-w-[200px] truncate" title={viewBranch.location || viewBranch.city || viewBranch.address}>
                      {viewBranch.location || viewBranch.city || viewBranch.address || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                icon={<X className="w-4 h-4 text-slate-500" />}
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewBranch(null);
                }}
                className="w-full sm:w-auto justify-center"
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={<Pencil className="w-4 h-4 stroke-[2.2]" />}
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEditModal(viewBranch);
                }}
                className="w-full sm:w-auto justify-center"
              >
                Edit Branch
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reusable Confirmation Modal: Suspend / Inactive / Delete */}
      <ConfirmationModal
        isOpen={!!confirmAction}
        onClose={() => {
          if (!isProcessingAction) setConfirmAction(null);
        }}
        type={confirmAction?.type}
        itemTypeLabel="Branch"
        itemName={confirmAction?.branch.name}
        title={
          confirmAction?.type === 'Delete'
            ? 'Delete Branch'
            : confirmAction?.type === 'Suspend'
              ? (confirmAction.branch.status === 'Suspended' ? 'Resume Branch' : 'Suspend Branch')
              : (confirmAction?.branch.status === 'Inactive' ? 'Activate Branch' : 'Deactivate Branch')
        }
        description={
          confirmAction?.type === 'Delete' ? (
            <>
              Are you sure you want to delete <span className="font-semibold text-slate-700">{confirmAction.branch.name}</span>? This action cannot be undone.
            </>
          ) : confirmAction?.type === 'Suspend' ? (
            <>
              Are you sure you want to {confirmAction.branch.status === 'Suspended' ? 'resume' : 'mark'} <span className="font-semibold text-slate-700">{confirmAction.branch.name}</span> {confirmAction.branch.status === 'Suspended' ? 'as Active' : 'as Suspended'}?
            </>
          ) : confirmAction?.type === 'Inactive' ? (
            <>
              Are you sure you want to mark <span className="font-semibold text-slate-700">{confirmAction.branch.name}</span> as <span className="font-semibold text-slate-700">{confirmAction.branch.status === 'Inactive' ? 'Active' : 'Inactive'}</span>?
            </>
          ) : undefined
        }
        confirmButtonText={
          confirmAction?.type === 'Delete'
            ? 'Yes, Delete'
            : confirmAction?.type === 'Suspend'
              ? (confirmAction.branch.status === 'Suspended' ? 'Yes, Resume' : 'Yes, Suspend')
              : (confirmAction?.branch.status === 'Inactive' ? 'Yes, Activate' : 'Yes, Inactive')
        }
        isLoading={isProcessingAction}
        onConfirm={async () => {
          if (!confirmAction) return;
          setIsProcessingAction(true);
          try {
            if (confirmAction.type === 'Delete') {
              await handleDeleteBranch(confirmAction.branch);
            } else if (confirmAction.type === 'Suspend') {
              await handleUpdateStatus(
                confirmAction.branch,
                confirmAction.branch.status === 'Suspended' ? 'Active' : 'Suspended'
              );
            } else if (confirmAction.type === 'Inactive') {
              await handleUpdateStatus(
                confirmAction.branch,
                confirmAction.branch.status === 'Inactive' ? 'Active' : 'Inactive'
              );
            }
            setConfirmAction(null);
          } catch (err: any) {
            console.error('Action failed:', err);
          } finally {
            setIsProcessingAction(false);
          }
        }}
      />
    </div>
  );
};
