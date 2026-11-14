import { CommonTableHead } from '../../components/common/CommonTableHead';
import React, { useState, useEffect, useRef } from 'react';
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
  Users,
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
import {
  alphabetsOnly,  lettersOnly,
  digitsOnly,
  emailAddress,
  phoneNumber,
  PHONE_MAX_DIGITS,
  liveMobileStartError,
  minLength,
  required,
  requiredWhen,
  pincodeMatching,
  cleanPincode,
  validateFields,
  when,
} from '../../utils/fieldValidators';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useRowActionMenu } from '../../hooks/useRowActionMenu';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ReadOnlyField, TextField } from '../../components/common/FormField';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { PhoneField } from '../../components/common/PhoneField';
import { LocationFields, LocationMeta } from '../../components/common/LocationFields';
import { confirmButtonLabel, nextStatus } from '../../utils/statusActions';
import { ContactCopyButtons } from '../../components/common/ContactCopyButtons';
import { useActiveOrgType } from '../../hooks/useActiveOrgType';
import { normalizeSuite } from '../../utils/branchSuite';

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
    country: (item as any).countryName || item.country || '',
    state: (item as any).stateName || item.state || '',
    district: (item as any).districtName || item.district || '',
    pincode: item.pincode || '',
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
    subOrganizationName:
      (item as any).subOrganizationName || (item as any).sub_organization_name || (item as any).subOrganization?.name || '',
    organizationType:
      normalizeSuite((item as any).organizationType ?? (item as any).organization_type ?? (item as any).branchType) ||
      readSuiteMap()[item.id],
    productId: item.productId,
    productName: item.productName,
  };
};

// Same two suites as the sub-organization type.
const SUITE_MAP_KEY = 'yaa_crm_branch_suites';

/** Suite (Client / Sales Management) remembered for a branch id, for when the API does not send the type back. */
const readSuiteMap = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(SUITE_MAP_KEY) || '{}') || {};
  } catch {
    return {};
  }
};
const rememberSuite = (id: string | undefined, suite: string) => {
  if (!id) return;
  try {
    localStorage.setItem(SUITE_MAP_KEY, JSON.stringify({ ...readSuiteMap(), [id]: suite }));
  } catch {
    /* storage unavailable */
  }
};


const BRANCH_TYPES = ['Client Management', 'Sales Management'];

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

  // 3-dots row menu + click-to-copy contact buttons (shared hooks)
  const rowMenu = useRowActionMenu(220);
  const { copiedKey, copy: handleCopy } = useCopyToClipboard((label, text) =>
    showToast?.('success', 'Copied to Clipboard', `${label}: ${text}`)
  );

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // View Modal State
  const [viewBranch, setViewBranch] = useState<Branch | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const viewBranchId = isViewModalOpen ? viewBranch?.id : undefined;

  // Opening "View" shows the list row at once, then loads the full record (GET branch by id) so the
  // details are accurate. The detail never blanks a field the row already has (e.g. GST, sub-org name).
  // The response is cached (Branch tag) and refreshed after any branch change.
  useEffect(() => {
    if (!viewBranchId) return;
    let cancelled = false;
    branchApi
      .getBranchById(viewBranchId, viewBranch?.organizationId)
      .then((res) => {
        if (cancelled || !res?.success || !res.data) return;
        const detail = mapApiBranchToBranch(res.data);
        const kept = Object.fromEntries(Object.entries(detail).filter(([, v]) => v !== '' && v != null));
        setViewBranch((cur) => (cur && cur.id === detail.id ? ({ ...cur, ...kept } as Branch) : cur));
      })
      .catch(() => {
        /* keep the list data */
      });
    return () => {
      cancelled = true;
    };
  }, [viewBranchId]);

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
    country: '',
    state: '',
    district: '',
    countryId: '',
    stateId: '',
    districtId: '',
    cityId: '',
    pincode: '',
    address: '',
    status: 'Active' as BranchStatus,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [locationMeta, setLocationMeta] = useState<LocationMeta>({ stateRequired: true, districtRequired: true });

  /** Updates one form field and sets (or clears) its inline error in a single call. */
  const updateField = (key: keyof typeof formData, value: string, error = '') => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => (prev[key] === error ? prev : { ...prev, [key]: error }));
  };

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
  const loadOrganizationAndSubOrgs = async (includeOrgName = true) => {
    try {
      setLoadingSubOrgs(true);
      const activeOrgId = currentUser?.organizationId || getStoredOrganizationId();

      // 1. Try to get parent organization details if available
      if (includeOrgName && activeOrgId) {
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

      // subOrganizationType: 1 = client, 2 = sales, 3 = both (older records may carry a text organizationType instead)
      const isSubForSuite = (s: SubOrganizationApiItem) => {
        const code = Number(s.subOrganizationType);
        if (code === 3) return true;
        if (code === 1) return !isSaleManagement;
        if (code === 2) return isSaleManagement;
        const t = (s.organizationType || '').toLowerCase();
        return isSaleManagement ? t.includes('sale') : !t.includes('sale');
      };

      const loadedSubsFromApi = apiSubs.filter(isSubForSuite);
      const subMap = new Map<string, SubOrganizationApiItem>();
      loadedSubsFromApi.forEach((s) => {
        subMap.set(s.name.toLowerCase(), s);
      });

      // Only use API sub-organizations

      const loadedSubs = Array.from(subMap.values());
      setSubOrganizations(loadedSubs);

    } catch (err) {
      console.error('Failed to load sub-organizations:', err);
      setSubOrganizations([]);
    } finally {
      setLoadingSubOrgs(false);
    }
  };

  // The organization name and sub-organization list only feed the Add / Edit / View forms (and the sub-organization
  // column, when the branch API sends just an id). So they load the first time one of those needs them, not when
  // the page opens: the page load calls the branch API only.
  const formDataRequested = useRef(false);
  const subOrgsRequested = useRef(false);
  /** includeOrgName: also fetch the organization's name (only the forms need it). Without it, only the sub-organizations load. */
  const ensureOrgAndSubOrgs = (includeOrgName = true) => {
    if (includeOrgName) {
      if (formDataRequested.current) return;
      formDataRequested.current = true;
      subOrgsRequested.current = true;
      loadOrganizationAndSubOrgs(true);
    } else {
      if (formDataRequested.current || subOrgsRequested.current) return;
      subOrgsRequested.current = true;
      loadOrganizationAndSubOrgs(false);
    }
  };

  useEffect(() => {
    if (isModalOpen || isViewModalOpen) ensureOrgAndSubOrgs(true);
  }, [isModalOpen, isViewModalOpen]);


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
    if (typeStr === 'all') return true;
    if (isSaleManagement) {
      return typeStr.includes('sale');
    }
    return typeStr.includes('client') || !typeStr.includes('sale');
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

      const currentSubs = providedSubs && providedSubs.length > 0 ? providedSubs : subOrganizations;

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
          branchMap.set(br.id || br.code || br.name.toLowerCase(), {
            ...br,
            organizationType: br.organizationType || (isSaleManagement ? 'Sales Management' : 'Client Management'),
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
      const pageItems = allItems.slice(startIdx, startIdx + targetPageSize);
      setBranches(pageItems);
      // The branch API only sometimes includes the sub-organization name; fetch the list only when a name is missing.
      if (pageItems.some((b) => b.subOrganizationId && !b.subOrganizationName)) ensureOrgAndSubOrgs(false);
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
      subOrganizationId: '',
      organizationType: isSaleManagement ? 'Sales Management' : 'Client Management',
      contactPerson: '',
      mobileNumber: '',
      whatsapp: '',
      email: '',
      password: '',
      roleId: '',
      location: '',
      country: '',
      state: '',
      district: '',
      countryId: '',
      stateId: '',
      districtId: '',
      cityId: '',
      pincode: '',
      address: '',
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
      // A branch with no sub-organization belongs directly to the main organization
      subOrganizationId: branch.subOrganizationId || '__PARENT_ORG__',
      organizationType: branch.organizationType || (isSaleManagement ? 'Sales Management' : 'Client Management'),
      contactPerson: branch.contactPerson || '',
      mobileNumber: branch.mobileNumber || '',
      whatsapp: branch.whatsapp || '',
      email: branch.email || '',
      password: '',
      roleId: '',
      location: branch.location || branch.city || branch.address || '',
      country: branch.country || '',
      state: branch.state || '',
      district: branch.district || '',
      countryId: '',
      stateId: '',
      districtId: '',
      cityId: '',
      pincode: branch.pincode || '',
      address: branch.address || '',
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

    const isCreate = !editingBranch;
    const errors = validateFields([
      ['name', formData.name, [required('Branch Name is required')]],
      ['contactPerson', formData.contactPerson, [required('Contact Person Name is required'), alphabetsOnly('Contact Person Name')]],
      ['mobileNumber', formData.mobileNumber, [required('Mobile Number is required'), phoneNumber('Mobile Number')]],
      ['whatsapp', formData.whatsapp, [phoneNumber('WhatsApp Number')]],
      ['location', formData.location, requiredWhen(locationMeta.cityRequired ?? true, 'City is required')],
      ['country', formData.country, [required('Country is required')]],
      ['state', formData.state, requiredWhen(locationMeta.stateRequired, 'State is required')],
      ['district', formData.district, requiredWhen(locationMeta.districtRequired, 'District is required')],
      ['organizationType', formData.organizationType, [required('Branch Type is required')]],
      ['address', formData.address, [required('Address is required')]],
      ['pincode', formData.pincode, [required('Pincode is required'), pincodeMatching()]],
      ['email', formData.email, [required('Email is required'), emailAddress]],
      ['password', formData.password, when(isCreate, [required('Password is required'), minLength(8, 'Password must be at least 8 characters')])],
      ['status', formData.status, [required('Status is required')]],
    ]);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSubmitting(true);
      const activeOrgId = currentUser?.organizationId || getStoredOrganizationId();
      const suiteType = formData.organizationType || (isSaleManagement ? 'Sales Management' : 'Client Management');

      if (editingBranch) {
        rememberSuite(editingBranch.id, suiteType);
        const effectiveSubOrgId = (formData.subOrganizationId && formData.subOrganizationId !== '__PARENT_ORG__') ? formData.subOrganizationId : undefined;
        await branchApi.updateBranch(editingBranch.id, {
          name: formData.name.trim(),
          organizationId: activeOrgId || undefined,
          subOrganizationId: effectiveSubOrgId,
          contactPerson: formData.contactPerson.trim(),
          phone: formData.mobileNumber.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          whatsapp: formData.whatsapp.trim(),
          email: formData.email.trim(),
          location: formData.location.trim(),
          city: formData.location.trim(),
          countryId: formData.countryId || undefined,
          stateId: formData.stateId || undefined,
          districtId: formData.districtId || undefined,
          pincode: formData.pincode.trim(),
          branchType: suiteType === 'Sales Management' ? 2 : 1, // 1 = Client Management, 2 = Sales Management
          address: formData.address.trim(),
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
          subOrganizationId: effectiveSubOrgId,
          organizationType: suiteType,
          contactPerson: formData.contactPerson.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          whatsapp: formData.whatsapp.trim(),
          email: formData.email.trim(),
          location: formData.location.trim(),
          city: formData.location.trim(),
          country: formData.country.trim(),
          state: formData.state.trim(),
          district: formData.district.trim(),
          pincode: formData.pincode.trim(),
          address: formData.address.trim(),
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

        const effectiveSubOrgId = (formData.subOrganizationId && formData.subOrganizationId !== '__PARENT_ORG__') ? formData.subOrganizationId : undefined;
        const createdRes: any = await branchApi.createBranch({
          name: trimmedName,
          email: trimmedEmail,
          password: trimmedPassword,
          roleId: formData.roleId.trim() || undefined,
          organizationId: activeOrgId || undefined,
          subOrganizationId: effectiveSubOrgId,
          contactPerson: formData.contactPerson.trim() || undefined,
          phone: formData.mobileNumber.trim() || undefined,
          mobileNumber: formData.mobileNumber.trim() || undefined,
          whatsapp: formData.whatsapp.trim() || undefined,
          location: formData.location.trim() || undefined,
          city: formData.location.trim() || undefined,
          countryId: formData.countryId || undefined,
          stateId: formData.stateId || undefined,
          districtId: formData.districtId || undefined,
          pincode: formData.pincode.trim(),
          branchType: suiteType === 'Sales Management' ? 2 : 1, // 1 = Client Management, 2 = Sales Management
          address: formData.address.trim(),
          status: formData.status,
          user: {
            email: trimmedEmail,
            password: trimmedPassword,
            name: formData.contactPerson.trim() || trimmedName,
            roleId: formData.roleId.trim() || undefined,
          },
        });

        rememberSuite(createdRes?.data?.id, suiteType); // so the branch stays in its own module even if the API does not return the type
        // Add to local catalog tagged with suite
        const newBranchObj: Branch = {
          id: `br_${Date.now()}`,
          name: trimmedName,
          code: trimmedCode,
          email: trimmedEmail,
          organizationId: activeOrgId || undefined,
          subOrganizationId: effectiveSubOrgId,
          organizationType: suiteType,
          contactPerson: formData.contactPerson.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          whatsapp: formData.whatsapp.trim(),
          location: formData.location.trim(),
          city: formData.location.trim(),
          country: formData.country.trim(),
          state: formData.state.trim(),
          district: formData.district.trim(),
          pincode: formData.pincode.trim(),
          address: formData.address.trim(),
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
      const backendMsg = getApiErrorMessage(err, 'Could not save branch');
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
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Branches
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
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
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CITY</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
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
                            {branch.subOrganizationName || subOrganizations.find((s) => s.id === branch.subOrganizationId)?.name || 'Direct Organization'}
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
                        <ContactCopyButtons
                          id={branch.id}
                          phone={branch.mobileNumber}
                          whatsapp={branch.whatsapp}
                          email={branch.email}
                          copiedKey={copiedKey}
                          onCopy={handleCopy}
                        />
                      </td>

                      {/* 4. CITY */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#33077C] shrink-0" />
                          <span>{branch.location || branch.city || branch.address || 'N/A'}{branch.state && !branch.location?.includes(branch.state) ? `, ${branch.state}` : ''}</span>
                        </div>
                      </td>

                      {/* 5. STATUS */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <StatusBadge status={branch.status} />
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
                        <div className="relative inline-block text-left" data-row-menu-trigger>
                          <button
                            type="button"
                            onClick={(e) => rowMenu.toggle(e, branch.id)}
                            className="w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4 fill-white text-white" />
                          </button>

                          {rowMenu.activeId === branch.id && rowMenu.pos && (
                            <div
                              data-row-menu className="fixed z-[9999] w-48 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                              style={{
                                top: rowMenu.pos.top !== undefined ? `${rowMenu.pos.top}px` : 'auto',
                                bottom: rowMenu.pos.bottom !== undefined ? `${rowMenu.pos.bottom}px` : 'auto',
                                right: `${rowMenu.pos.right}px`,
                              }}
                            >
                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => {
                                  rowMenu.close();
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
                                  rowMenu.close();
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
                                  rowMenu.close();
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
                                  rowMenu.close();
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
                                  rowMenu.close();
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

      {/* 4. Add / Edit Branch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBranch ? 'Edit Branch' : 'Add New Branch'}
        subtitle={
          editingBranch
            ? 'Update branch location and contact specifications'
            : 'Create a regional branch under your organization'
        }
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsModalOpen(false)}
      >
        <form noValidate onSubmit={handleSaveBranch} className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150">

          {/* Branch Fields: 3 fields per row throughout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Select Sub-Organization
              </label>
              {editingBranch ? (
                <input
                  type="text"
                  readOnly
                  disabled
                  value={
                    formData.subOrganizationId === '__PARENT_ORG__' || !formData.subOrganizationId
                      ? (defaultOrgName ? `${defaultOrgName} (Main Organization)` : 'Main Organization')
                      : subOrganizations.find((s) => s.id === formData.subOrganizationId)?.name ||
                        (loadingSubOrgs ? 'Loading...' : '')
                  }
                  title="Sub-organization cannot be modified"
                  className="w-full h-11 px-4 bg-slate-100/80 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-600 cursor-not-allowed select-none outline-none"
                />
              ) : (
              <CustomSelect
                value={formData.subOrganizationId}
                onChange={(val) => {
                  setFormData({ ...formData, subOrganizationId: val });
                  if (formErrors.subOrganizationId) setFormErrors((prev) => ({ ...prev, subOrganizationId: '' }));
                }}
                options={(() => {
                  const parentOrgLabel = defaultOrgName ? `${defaultOrgName} (Main Organization)` : 'Main Organization';
                  const list: { value: string; label: string }[] = [];
                  if (defaultOrgName) {
                    list.push({ value: '__PARENT_ORG__', label: parentOrgLabel });
                  }
                  if (subOrganizations.length > 0) {
                    subOrganizations.forEach((sub) => {
                      list.push({
                        value: sub.id,
                        label: `${sub.name}${sub.code ? ` (${sub.code})` : ''}`,
                      });
                    });
                  }
                  if (list.length === 0) {
                    return [{ value: '', label: loadingSubOrgs ? 'Loading Sub-Organizations...' : 'No Sub-Organizations found' }];
                  }
                  return list;
                })()}
                optionVariant="strong"
                placeholder="Select Sub-Organization"
                error={!!formErrors.subOrganizationId}
              />
              )}
              {formErrors.subOrganizationId && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.subOrganizationId}</p>
              )}
            </div>

            <TextField
              label="Branch Name"
              required
              value={formData.name}
              error={formErrors.name}
              placeholder="Enter branch name"
              onValueChange={(v) => updateField('name', v)}
            />

            <ReadOnlyField label="Branch Code" value={formData.code} placeholder="Auto-generated" />

            {/* Row 2 */}
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Branch Type <span className="text-rose-500 font-bold">*</span>
              </label>
              <CustomSelect
                value={formData.organizationType}
                onChange={(val) => updateField('organizationType', val)}
                options={BRANCH_TYPES}
                placeholder="Select branch type"
                optionVariant="strong"
                activeColor="brand"
                error={!!formErrors.organizationType}
              />
              {formErrors.organizationType && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.organizationType}</p>
              )}
            </div>

            <TextField
              label="Contact Person Name"
              required
              value={formData.contactPerson}
              error={formErrors.contactPerson}
              placeholder="Enter contact person name"
              onValueChange={(v) => updateField('contactPerson', lettersOnly(v))}
            />

            <PhoneField
              label="Mobile Number"
              required
              placeholder="e.g. 9876543210"
              value={formData.mobileNumber}
              error={formErrors.mobileNumber}
              onChange={(v) => updateField('mobileNumber', v)}
            />

            {/* Row 3 */}
            <PhoneField
              label="WhatsApp Number"
              placeholder="e.g. 9876543210"
              value={formData.whatsapp}
              error={formErrors.whatsapp}
              onChange={(v) => updateField('whatsapp', v)}
            />

            <TextField
              label="Email"
              required
              type="email"
              value={formData.email}
              error={formErrors.email}
              placeholder="e.g. branch@organization.com"
              onValueChange={(v) => updateField('email', v)}
            />

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

            {/* Row 4 */}
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

            {/* Row 4, 5: LocationFields (Country, State, District, City, Pincode) */}
            <LocationFields
              country={formData.country}
              state={formData.state}
              district={formData.district}
              city={formData.location}
              errors={{ country: formErrors.country, state: formErrors.state, district: formErrors.district, city: formErrors.location }}
              onMeta={setLocationMeta}
              onChange={(patch) => {
                const { city, ...rest } = patch;
                setFormData((prev) => ({ ...prev, ...rest, ...(city !== undefined ? { location: city } : {}) }));
                setFormErrors((prev) => ({
                  ...prev,
                  ...Object.fromEntries(Object.keys(patch).map((k) => [k === 'city' ? 'location' : k, ''])),
                }));
              }}
            />
            <TextField
              label="Pincode"
              required
              inputMode="numeric"
              maxLength={6}
              value={formData.pincode}
              error={formErrors.pincode}
              placeholder="e.g. 600001"
              onValueChange={(v) => updateField('pincode', cleanPincode(v))}
            />
            {/* Address */}
            <div className="md:col-span-3">
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Address <span className="text-rose-500 font-bold">*</span>
              </label>
              <textarea
                rows={3}
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Enter complete address"
                className={`w-full min-h-[88px] px-4 py-3 bg-white rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all resize-y ${
                  formErrors.address
                    ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                }`}
              />
              {formErrors.address && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.address}</p>
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
            <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
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
          <div className="space-y-5">
            {/* Top Overview / Profile Header Card (Matching Reference Design) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                  {getBranchInitials(viewBranch.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{viewBranch.name}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {viewBranch.code}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">
                      {viewBranch.organizationType || (isSaleManagement ? 'Sales Management' : 'Client Management')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{viewBranch.location || viewBranch.city || viewBranch.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                {viewBranch.status === 'Inactive' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Inactive
                  </span>
                ) : viewBranch.status === 'Suspended' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Suspended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                )}
              </div>
            </div>

            {/* Two Column Layout Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Left Column: Branch Overview */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center font-bold">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Branch Overview</span>
                </div>

                <div className="space-y-3 text-xs sm:text-[13px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 font-medium shrink-0">Branch Name</span>
                    <span className="font-bold text-slate-800 text-right">{viewBranch.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Branch Code</span>
                    <span className="font-bold text-slate-800 text-right">{viewBranch.code}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Suite Type</span>
                    <span className="font-bold text-slate-800 text-right">
                      {viewBranch.organizationType || (isSaleManagement ? 'Sales Management' : 'Client Management')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Organization</span>
                    <span className="font-bold text-slate-800 text-right">{defaultOrgName}</span>
                  </div>
                  {viewBranch.subOrganizationId && (
                    <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-medium shrink-0">Sub-Organization</span>
                      <span className="font-bold text-slate-800 text-right">
                        {subOrganizations.find((s) => s.id === viewBranch.subOrganizationId)?.name || 'Linked Sub-Org'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">GST Number</span>
                    <span className="font-bold text-slate-800 text-right">{viewBranch.gstNumber || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Created Date</span>
                    <span className="font-bold text-slate-800 text-right">{formatCreatedDate(viewBranch.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact & Location */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center font-bold">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span>Contact & Location</span>
                </div>

                <div className="space-y-3 text-xs sm:text-[13px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 font-medium shrink-0">Contact Person</span>
                    <span className="font-bold text-slate-800 text-right">{viewBranch.contactPerson || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Mobile Number</span>
                    <span className="font-bold text-slate-800 text-right">{viewBranch.mobileNumber || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">WhatsApp Number</span>
                    <span className="font-bold text-slate-800 text-right">{viewBranch.whatsapp || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Official Email</span>
                    <span className="font-bold text-slate-800 text-right break-all">{viewBranch.email || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">City</span>
                    <span className="font-bold text-slate-800 text-right leading-snug">{viewBranch.location || viewBranch.city || viewBranch.address || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Country</span>
                    <span className="font-bold text-slate-800 text-right leading-snug">{viewBranch.country || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">State</span>
                    <span className="font-bold text-slate-800 text-right leading-snug">{viewBranch.state || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">District</span>
                    <span className="font-bold text-slate-800 text-right leading-snug">{viewBranch.district || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Pincode</span>
                    <span className="font-bold text-slate-800 text-right leading-snug">{viewBranch.pincode || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Branch Type</span>
                    <span className="font-bold text-slate-800 text-right leading-snug">{viewBranch.organizationType || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Address</span>
                    <span className="font-bold text-slate-800 text-right leading-snug">{viewBranch.address || '-'}</span>
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
            : confirmAction && confirmButtonLabel(confirmAction.type, confirmAction.branch.status)
        }
        isLoading={isProcessingAction}
        onConfirm={async () => {
          if (!confirmAction) return;
          setIsProcessingAction(true);
          try {
            const { type, branch } = confirmAction;
            await (type === 'Delete' ? handleDeleteBranch(branch) : handleUpdateStatus(branch, nextStatus(type, branch.status)));
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
