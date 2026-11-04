import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Users,
  Calendar,
  ShieldCheck,
  Edit2,
  Trash2,
  Globe,
  Tag,
  Briefcase,
  Layers,
  Zap,
  MoreVertical,
  Eye,
  EyeOff,
  Loader2,
  Ban,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  X,
  Check,
  Network,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { Pagination } from '../../components/common/Pagination';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { ConfirmationModal } from '../../utils/confirmationModal';
import { CustomSelect } from '../../components/common/CustomSelect';
import { useActiveOrgType } from '../../hooks/useActiveOrgType';

import { organizationApi, subOrganizationApi, SubOrganizationApiItem } from '../../api';
import { OrganizationApiItem } from '../../api/platform/organizationTypes';
import { subscriptionPlanApi } from '../../api/platform/subscriptionPlanApi';
import { getStoredOrganizationId } from '../../api/config';
import { extractApiFieldErrors } from '../../utils/formValidation';
import {
  alphabetsOnly,  lettersOnly,
  alphanumericUpper,
  digitsOnly,
  emailAddress,
  validGst,
  indianMobile,
  liveGstError,
  livePanError,
  liveMobileStartError,
  validPan,
  pincodeMatching,
  cleanPincode,
  pickFieldErrors,
  required,
  requiredWhen,
  validateFields,
} from '../../utils/fieldValidators';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useRowActionMenu } from '../../hooks/useRowActionMenu';
import { ORGANIZATION_STATUS_TONES, StatusBadge } from '../../components/common/StatusBadge';
import { ContactCopyButtons } from '../../components/common/ContactCopyButtons';
import { ReadOnlyField, TextField } from '../../components/common/FormField';
import { LocationFields, LocationMeta } from '../../components/common/LocationFields';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

interface OrganizationItem {
  id: string;
  name: string;
  code: string;
  country: string;
  state: string;
  district: string;
  pincode: string;
  subOrganizationType?: number | string | null;
  organizationType?: string;
  industry: string;
  location: string;
  subscriptionPlan?: string;
  branchesCount: number;
  membersCount: number;
  status: 'Active' | 'Pending' | 'Inactive' | 'Suspend';
  createdAt: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  contactPerson?: string;
  logo?: string;
  gstNumber?: string;
  panNumber?: string;
  registrationType?: string;
  address?: string;
  subOrganizationSupport?: boolean;
  /** Login user of a sub-organization (only known after the detail call). */
  adminName?: string;
  adminEmail?: string;
  adminRole?: string;
}

const ORGANIZATION_TYPE_OPTIONS = [
  'All',
  'Client Management',
  'Sales Management',
];

export const parseOrganizationTypeNumber = (type: string | number | undefined): number => {
  if (typeof type === 'number') return type;
  if (!type) return 0;
  const lower = type.toString().trim().toLowerCase();
  if (lower === '1' || lower === 'client management' || lower === 'client') return 1;
  if (lower === '2' || lower === 'sales management' || lower === 'sale management' || lower === 'sales') return 2;
  return 0; // 'All' or other defaults to 0
};

export const formatOrganizationTypeName = (type: string | number | undefined): string => {
  if (type === 1 || type === '1' || type === 'Client Management') return 'Client Management';
  if (type === 2 || type === '2' || type === 'Sales Management' || type === 'Sale Management') return 'Sales Management';
  return 'All';
};

const REGISTRATION_TYPE_OPTIONS = [
  'Proprietorship',
  'Partnership',
  'LLP',
  'Pvt Ltd',
  'Public Ltd',
  'Other',
];

// Subscription plan options are loaded dynamically from the API

const STATUS_OPTIONS: ('Active' | 'Inactive' | 'Suspend')[] = [
  'Active',
  'Inactive',
  'Suspend',
];

const mapApiOrgToItem = (apiOrg: OrganizationApiItem): OrganizationItem => {
  return {
    id: apiOrg.id,
    name: apiOrg.name || 'Unnamed Organization',
    code: apiOrg.code || 'ORG',
    country: apiOrg.country || '',
    state: apiOrg.state || '',
    district: apiOrg.district || '',
    pincode: apiOrg.pincode || '',
    organizationType: formatOrganizationTypeName(apiOrg.organizationType),
    industry: apiOrg.industry || '',
    location: apiOrg.location || '',
    subscriptionPlan: apiOrg.subscriptionPlan || '',
    branchesCount: apiOrg.branchesCount ?? 0,
    membersCount: apiOrg.membersCount ?? 0,
    status: (apiOrg.status as OrganizationItem['status']) || (apiOrg.active ? 'Active' : 'Inactive'),
    createdAt: apiOrg.createdAt ? new Date(apiOrg.createdAt).toISOString().split('T')[0] : '',
    email: apiOrg.email || '',
    phone: apiOrg.phone || '',
    whatsapp: apiOrg.whatsapp || '',
    contactPerson: apiOrg.contactPerson || apiOrg.user?.name || '',
    gstNumber: apiOrg.gstNumber || '',
    panNumber: apiOrg.panNumber || '',
    registrationType: apiOrg.registrationType || '',
    address: apiOrg.address || '',
    logo: apiOrg.logo || '',
    subOrganizationSupport: apiOrg.subOrganizationSupport ?? false,
  };
};

const mapSubOrgToItem = (sub: SubOrganizationApiItem): OrganizationItem => {
  const rawStatus = (sub.status || 'Active').toString();
  const normalizedStatus: OrganizationItem['status'] =
    rawStatus.toLowerCase().startsWith('suspend')
      ? 'Suspend'
      : rawStatus.toLowerCase().startsWith('inact')
        ? 'Inactive'
        : rawStatus.toLowerCase().startsWith('pend')
          ? 'Pending'
          : 'Active';

  return {
    id: sub.id,
    name: sub.name || 'Unnamed Sub-Organization',
    code: sub.code || 'SUB-01',
    country: sub.country || '',
    state: sub.state || '',
    district: sub.district || '',
    pincode: sub.pincode || '',
    subOrganizationType: sub.subOrganizationType,
    organizationType: formatOrganizationTypeName(sub.organizationType),
    industry: sub.industry || '',
    location: sub.location || sub.address || '',
    subscriptionPlan: sub.subscriptionPlan || '',
    branchesCount: sub.branchesCount ?? 0,
    membersCount: sub.membersCount ?? 0,
    status: normalizedStatus,
    createdAt: sub.createdAt ? new Date(sub.createdAt).toISOString().split('T')[0] : '',
    email: sub.email || sub.user?.email || '',
    phone: sub.phone || '',
    whatsapp: sub.whatsapp || sub.phone || '',
    contactPerson: sub.contactPerson || sub.user?.name || '',
    gstNumber: sub.gstNumber || '',
    panNumber: sub.panNumber || '',
    registrationType: sub.registrationType || '',
    address: sub.address || '',
    logo: sub.logo || '',
    subOrganizationSupport: sub.subOrganizationSupport ?? false,
    adminName: sub.user?.name || '',
    adminEmail: sub.user?.email || '',
    adminRole: sub.user?.role?.name || '',
  };
};


/**
 * Whether a sub-organization belongs to the active suite.
 * subOrganizationType: 1 = Client Management, 2 = Sales Management, 3 = Both.
 * Without a numeric type it falls back to the organization type text.
 */
const matchesActiveSuite = (item: OrganizationItem, isSaleManagement: boolean): boolean => {
  const code = Number(item.subOrganizationType);
  if (code === 3) return true;
  if (code === 1) return !isSaleManagement;
  if (code === 2) return isSaleManagement;
  const text = String(item.organizationType || '').toLowerCase();
  if (text.includes('all') || text.includes('both')) return true;
  return isSaleManagement ? text.includes('sale') : !text.includes('sale');
};

/** Server-reported errors with these keys are shown under the matching input. */
const API_FORM_FIELDS = ['name', 'email', 'gstNumber', 'panNumber', 'phone', 'whatsapp'] as const;

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month}, ${year}`;
  } catch {
    return dateStr;
  }
};

const DEFAULT_CLIENT_SUB_ORGS: OrganizationItem[] = [];

const DEFAULT_SALE_SUB_ORGS: OrganizationItem[] = [];

export const OrganizationView: React.FC = () => {
  const { currentUser, isSuperAdmin, showToast } = useAuth();
  const { activeOrgType, setOrgType, isSaleManagement, isClientManagement } = useActiveOrgType();

  const userRole = (currentUser?.role || '').toString().toUpperCase();
  const isOrgSuperAdmin =
    userRole === 'ORG_ADMIN' ||
    userRole === 'ORGADMIN' ||
    userRole === 'ADMIN' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'Admin' ||
    currentUser?.email?.toLowerCase() === 'orgadmin@gmail.com' ||
    currentUser?.email?.toLowerCase() === 'orgsuperadmin@gmail.com';

  const [searchParams, setSearchParams] = useSearchParams();
  const parentOrgIdParam = searchParams.get('parentOrgId');
  const parentOrgNameParam = searchParams.get('parentOrgName');
  const parentOrgCodeParam = searchParams.get('parentOrgCode');

  // In-page parent organization context for Sub-Organizations mode
  const [parentOrgContext, setParentOrgContext] = useState<{
    id: string;
    name: string;
    code: string;
    subscriptionPlan?: string;
  } | null>(() => {
    if (parentOrgIdParam) {
      return {
        id: parentOrgIdParam,
        name: parentOrgNameParam || 'Organization',
        code: parentOrgCodeParam || 'ORG',
      };
    }
    return null;
  });

  // Keep state in sync with URL search params
  useEffect(() => {
    if (parentOrgIdParam) {
      setParentOrgContext({
        id: parentOrgIdParam,
        name: parentOrgNameParam || 'Organization',
        code: parentOrgCodeParam || 'ORG',
      });
    } else {
      setParentOrgContext(null);
    }
  }, [parentOrgIdParam, parentOrgNameParam, parentOrgCodeParam]);

  const isSubOrgMode = isOrgSuperAdmin || !!parentOrgContext;

  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subscriptionPlanOptions, setSubscriptionPlanOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Pagination states from server
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Pending state - tracks what's typed/selected (not yet applied)
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState<'All' | 'Active' | 'Inactive' | 'Suspend'>('All');
  // Applied state - what actually drives the filter (set only on Apply)
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<'All' | 'Active' | 'Inactive' | 'Suspend'>('All');

  /** Parent organization used for sub-organization calls (drill-down context, else the user's own org). */
  const resolveParentOrgId = (): string | undefined =>
    parentOrgContext?.id || currentUser?.organizationId || getStoredOrganizationId() || undefined;

  const fetchSubOrganizations = async (page: number, limit: number, search: string, status: string) => {
    const empty = { items: [] as OrganizationItem[], total: 0 };
    try {
      const res = await subOrganizationApi.getSubOrganizations(
        {
          page_no: page,
          page_size: limit,
          pagination_required: 'true',
          search: search.trim() || undefined,
          status: status === 'All' ? undefined : status === 'Suspend' ? 'Suspended' : status,
        },
        resolveParentOrgId()
      );
      if (!res || !(res.success || Array.isArray(res.data))) return empty;

      const mapped = (Array.isArray(res.data) ? res.data : []).map(mapSubOrgToItem);
      // A super admin drilling into a parent org sees all of its sub-orgs, whatever suite they are in.
      const skipSuiteFilter = isSuperAdmin && !!parentOrgContext;
      const items = skipSuiteFilter ? mapped : mapped.filter((item) => matchesActiveSuite(item, isSaleManagement));

      // The server total counts every record; fall back to the page count once the suite filter removed rows.
      const serverTotal = res.pagination?.totalRecords;
      const useServerTotal = serverTotal !== undefined && items.length === mapped.length;
      return { items, total: useServerTotal ? serverTotal : items.length };
    } catch (apiErr) {
      console.warn('Backend sub-organization listing notice:', apiErr);
      return empty;
    }
  };

  const fetchOrganizations = async (page: number, limit: number, search: string, status: string) => {
    const res = await organizationApi.getOrganizations(page, limit, {
      search,
      status, // the organizations API takes Active | Inactive | Suspend | All (not "Suspended")
    });
    if (!res?.success || !Array.isArray(res.data)) return { items: [] as OrganizationItem[], total: 0 };
    const items = res.data.map(mapApiOrgToItem);
    return { items, total: res.pagination?.totalRecords || items.length };
  };

  // Fetch Organizations or Sub-Organizations strictly scoped to the active suite
  const loadOrganizations = async (page = currentPage, limit = pageSize, search = appliedSearch, status = appliedStatus) => {
    setIsLoading(true);
    try {
      const { items, total } = isSubOrgMode
        ? await fetchSubOrganizations(page, limit, search, status)
        : await fetchOrganizations(page, limit, search, status);
      setOrganizations(items);
      setTotalRecords(total);
    } catch (err: any) {
      console.error('Failed to load organizations:', err);
      showToast(
        'error',
        isSubOrgMode ? 'Failed to fetch sub-organizations' : 'Failed to fetch organizations',
        err?.message || 'Could not connect to API'
      );
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations(currentPage, pageSize, appliedSearch, appliedStatus);
  }, [currentPage, pageSize, appliedSearch, appliedStatus, isSubOrgMode, parentOrgContext?.id, isOrgSuperAdmin, isSaleManagement]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Subscription plans are only needed by the Add / Edit form, so they load when it opens (and are kept after).
  useEffect(() => {
    if (!isModalOpen || subscriptionPlanOptions.length > 0) return;
    subscriptionPlanApi
      .getSubscriptionPlans({ limit: 100, status: 'Active' })
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setSubscriptionPlanOptions(res.data.map((p) => p.name));
        }
      })
      .catch(() => {
        // Leave the dropdown empty; it retries the next time the form opens
      });
  }, [isModalOpen]);
  const [apiModalError, setApiModalError] = useState<string | null>(null);
  const [editingOrg, setEditingOrg] = useState<OrganizationItem | null>(null);
  const [viewingOrg, setViewingOrg] = useState<OrganizationItem | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const viewingOrgId = viewingOrg?.id;
  // Sub-organization rows (Org Admin, or a Platform Admin drilled into an organization) are not organization ids.
  const viewingSubOrg = isOrgSuperAdmin || !!parentOrgContext;

  // Opening "View" shows the row immediately, then loads the full record (GET organization by id, or
  // GET sub-organization by id) so the details are accurate.
  // The response is cached and refreshed after an edit, so reopening the same organization is free.
  useEffect(() => {
    if (!viewingOrgId) return;
    let cancelled = false;
    setViewLoading(true);
    const request = viewingSubOrg
      ? subOrganizationApi.getSubOrganizationById(viewingOrgId, parentOrgContext?.id).then((res) => {
          if (!res?.success || !res.data) return null;
          // This endpoint carries less than the list row (no phone/GST/PAN/address), so it only adds
          // the login user and branches and refreshes the basics; it never blanks a field the row has.
          const d = res.data;
          const patch: Partial<OrganizationItem> = {
            adminName: d.user?.name || '',
            adminEmail: d.user?.email || '',
            adminRole: d.user?.role?.name || '',
          };
          if (Array.isArray(d.branches)) patch.branchesCount = d.branches.length;
          if (d.name) patch.name = d.name;
          if (d.code) patch.code = d.code;
          if (d.location) patch.location = d.location;
          if (d.subscriptionPlan) patch.subscriptionPlan = d.subscriptionPlan;
          if (d.status) patch.status = mapSubOrgToItem(d).status;
          return { id: d.id, patch };
        })
      : organizationApi.getOrganizationById(viewingOrgId).then((res) => {
          if (!res?.success || !res.data) return null;
          const detail = mapApiOrgToItem(res.data);
          return { id: detail.id, patch: detail as Partial<OrganizationItem> };
        });
    request
      .then((out) => {
        if (cancelled || !out) return;
        setViewingOrg((cur) => (cur && cur.id === out.id ? { ...cur, ...out.patch } : cur));
      })
      .catch(() => {
        /* keep the list data that is already on screen */
      })
      .finally(() => {
        if (!cancelled) setViewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewingOrgId, viewingSubOrg]);
  // 3-dots row menu + click-to-copy contact buttons (shared hooks)
  const rowMenu = useRowActionMenu(240);
  const { copiedKey, copy: handleCopy } = useCopyToClipboard();
  const [confirmAction, setConfirmAction] = useState<{
    type: 'Suspend' | 'Inactive' | 'Delete';
    orgId: string;
    orgName: string;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const handleOpenSubOrgManager = (org: OrganizationItem) => {
    setParentOrgContext({
      id: org.id,
      name: org.name,
      code: org.code,
      subscriptionPlan: org.subscriptionPlan,
    });
    setSearchParams({
      parentOrgId: org.id,
      parentOrgName: org.name,
      parentOrgCode: org.code,
    });
    // Reset filters and page
    setPendingSearch('');
    setPendingStatus('All');
    setAppliedSearch('');
    setAppliedStatus('All');
    setCurrentPage(1);
  };

  const handleExitSubOrgMode = () => {
    setParentOrgContext(null);
    setSearchParams({});
    setPendingSearch('');
    setPendingStatus('All');
    setAppliedSearch('');
    setAppliedStatus('All');
    setCurrentPage(1);
  };

  const handleUpdateStatus = async (id: string, newStatus: 'Active' | 'Pending' | 'Inactive' | 'Suspend') => {
    try {
      setIsProcessingAction(true);
      if (!isSubOrgMode) {
        await organizationApi.updateOrganizationStatus(id, newStatus as 'Active' | 'Inactive' | 'Suspend');
      } else {
        await subOrganizationApi.updateSubOrganizationStatus(id, newStatus === 'Suspend' ? 'Suspended' : newStatus, resolveParentOrgId());
      }
      await loadOrganizations(currentPage, pageSize, appliedSearch, appliedStatus);
      rowMenu.close();
      showToast('success', 'Status Updated', `${isSubOrgMode ? 'Sub-organization' : 'Organization'} status updated to ${newStatus}.`);
    } catch (err: any) {
      showToast('error', 'Update Failed', err?.message || 'Could not update status.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteOrganization = async (id: string, orgName: string) => {
    try {
      setIsProcessingAction(true);
      const res = await organizationApi.deleteOrganization(id);
      showToast('success', 'Organization Deactivated', res?.message || `${orgName} deactivated successfully.`);
      await loadOrganizations(currentPage, pageSize);
    } catch (err: any) {
      showToast('error', 'Delete Failed', err?.message || `Failed to delete ${orgName}.`);
    } finally {
      setIsProcessingAction(false);
      setConfirmAction(null);
    }
  };

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [country, setCountry] = useState('');
  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');
  // Master-data ids sent to the API; set when the user picks from the dropdowns.
  const [countryId, setCountryId] = useState('');
  const [stateId, setStateId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [pincode, setPincode] = useState('');
  const [locationMeta, setLocationMeta] = useState<LocationMeta>({ stateRequired: true, districtRequired: true });
  const [organizationType, setOrganizationType] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [logo, setLogo] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [registrationType, setRegistrationType] = useState('');
  const [formStatus, setFormStatus] = useState<string>('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [subOrganizationSupport, setSubOrganizationSupport] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const setFieldError = (field: string, message: string) =>
    setFormErrors((prev) => (prev[field] === message ? prev : { ...prev, [field]: message }));
  /** Clears one field's error as soon as the user edits that field. */
  const clearFieldError = (field: string) => setFormErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));

  /**
   * onChange handler for a text field: optionally sanitises the raw value, stores it, and sets (or clears)
   * the field's inline error. `liveError` runs while typing (e.g. "must start with 6-9").
   */
  const fieldHandler =
    (setter: (value: string) => void, field: string, clean?: (raw: string) => string, liveError?: (value: string) => string) =>
    (raw: string) => {
      const value = clean ? clean(raw) : raw;
      setter(value);
      setFieldError(field, liveError ? liveError(value) : '');
    };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('error', 'File Too Large', 'Please upload an image smaller than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
        clearFieldError('logo');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddModal = () => {
    setEditingOrg(null);
    setName('');
    setCode('');
    setCountry('');
    setStateName('');
    setDistrict('');
    setCountryId('');
    setStateId('');
    setDistrictId('');
    setPincode('');
    setOrganizationType(isOrgSuperAdmin ? (isSaleManagement ? 'Sales Management' : 'Client Management') : '');
    setIndustry('');
    setLocation('');
    setSubscriptionPlan('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setWhatsapp('');
    setLogo('');
    setGstNumber('');
    setPanNumber('');
    setRegistrationType('');
    setFormStatus('');
    setAddress('');
    setPassword('');
    setShowPassword(false);
    setSubOrganizationSupport(false);
    setFormErrors({});
    setApiModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (org: OrganizationItem) => {
    setEditingOrg(org);
    setName(org.name);
    setCode(org.code);
    setCountry(org.country || '');
    setStateName(org.state || '');
    setDistrict(org.district || '');
    setCountryId('');
    setStateId('');
    setDistrictId('');
    setPincode(org.pincode || '');
    const resolvedType = formatOrganizationTypeName(org.organizationType);
    setOrganizationType(resolvedType); // 0 = All is shown as All, not swapped for the active suite
    setIndustry(org.industry);
    setLocation(org.location);
    setSubscriptionPlan(org.subscriptionPlan || '');
    setContactPerson(org.contactPerson || '');
    setEmail(org.email || '');
    setPhone(org.phone || '');
    setWhatsapp(org.whatsapp || '');
    setLogo(org.logo || '');
    setGstNumber(org.gstNumber || '');
    setPanNumber(org.panNumber || '');
    setRegistrationType(org.registrationType || '');
    setFormStatus(org.status);
    setAddress(org.address || '');
    setPassword('');
    setShowPassword(false);
    setSubOrganizationSupport(!!org.subOrganizationSupport);
    setFormErrors({});
    setApiModalError(null);
    setIsModalOpen(true);
  };

  const entityLabel = isSubOrgMode ? 'Sub Organization' : 'Organization';

  /** Only the fields the user actually changed, so the PATCH stays minimal. */
  const buildEditPatch = (current: OrganizationItem): Record<string, any> => {
    const t = (v: string) => v.trim();

    const next: Record<string, string> = {
      name: t(name),
      pincode: t(pincode),
      industry: t(industry),
      location: t(location),
      subscriptionPlan: t(subscriptionPlan),
      contactPerson: t(contactPerson),
      email: t(email),
      phone: t(phone),
      whatsapp: t(whatsapp),
      gstNumber: t(gstNumber),
      panNumber: t(panNumber),
      registrationType: registrationType || '',
      address: t(address),
      logo: logo || '',
    };
    const existing: Record<string, string> = {
      name: current.name,
      pincode: current.pincode || '',
      industry: current.industry || '',
      location: current.location || '',
      subscriptionPlan: current.subscriptionPlan || '',
      contactPerson: current.contactPerson || '',
      email: current.email || '',
      phone: current.phone || '',
      whatsapp: current.whatsapp || '',
      gstNumber: current.gstNumber || '',
      panNumber: current.panNumber || '',
      registrationType: current.registrationType || '',
      address: current.address || '',
      logo: current.logo || '',
    };

    const patch: Record<string, any> = {};
    Object.keys(next).forEach((key) => {
      if (next[key] !== existing[key]) patch[key] = next[key];
    });

    if ((organizationType || 'All') !== (current.organizationType || 'All')) {
      patch.organizationType = parseOrganizationTypeNumber(organizationType);
    }
    // Country / State / District go as master ids, only when the user picked a new value.
    if (countryId && country !== current.country) patch.countryId = countryId;
    if (stateId && stateName !== current.state) patch.stateId = stateId;
    if (districtId && district !== current.district) patch.districtId = districtId;
    if (formStatus !== current.status) patch.status = formStatus;
    if (subOrganizationSupport !== !!current.subOrganizationSupport) patch.subOrganizationSupport = subOrganizationSupport;
    if (t(password)) patch.password = t(password); // only when a new password is entered
    return patch;
  };

  /** Fields shared by the "create organization" and "create sub organization" payloads. */
  const buildCreateFields = () => {
    const optional = (v: string) => v.trim() || undefined;
    return {
      name: name.trim(),
      countryId: optional(countryId),
      stateId: optional(stateId),
      districtId: optional(districtId),
      pincode: optional(pincode),
      industry: optional(industry),
      location: optional(location),
      subscriptionPlan: optional(subscriptionPlan),
      contactPerson: optional(contactPerson),
      email: optional(email),
      phone: optional(phone),
      whatsapp: optional(whatsapp),
      gstNumber: optional(gstNumber),
      panNumber: optional(panNumber),
      registrationType: optional(registrationType),
      address: optional(address),
      password: optional(password),
      logo: logo || undefined,
      subOrganizationSupport,
    };
  };

  const saveEdit = async (current: OrganizationItem) => {
    const patch = buildEditPatch(current);
    if (!isSubOrgMode) {
      await organizationApi.updateOrganization(current.id, patch);
      showToast('success', 'Organization Updated', `${name} has been updated.`);
      return;
    }
    await subOrganizationApi.updateSubOrganization(current.id, patch, resolveParentOrgId());
    showToast('success', 'Sub-Organization Updated', `${name} has been updated.`);
  };

  const saveCreate = async () => {
    const fields = buildCreateFields();
    if (!isSubOrgMode) {
      await organizationApi.createOrganization({
        ...fields,
        organizationType: parseOrganizationTypeNumber(organizationType),
        status: formStatus || 'Active',
      });
      showToast('success', 'Organization Created', `${name} has been successfully created.`);
      return;
    }

    const suiteType = organizationType || 'All';
    await subOrganizationApi.createSubOrganization(
      { ...fields, organizationType: suiteType, status: formStatus as any },
      resolveParentOrgId()
    );
    localStorage.removeItem('organizations_catalog_orgsuperadmin');
    window.dispatchEvent(new CustomEvent('orgChanged', { detail: { organizationType: suiteType } }));
    window.dispatchEvent(new CustomEvent('subOrgChanged', { detail: { name: name.trim(), organizationType: suiteType } }));
    window.dispatchEvent(new CustomEvent('subOrganizationsChanged'));
    showToast('success', 'Sub-Organization Created', `${name} has been successfully created under ${suiteType}.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create needs every mandatory field; edit only needs a name, the rest just has to be well-formed.
    const create = !editingOrg;
    const errors = validateFields([
      ['logo', logo, requiredWhen(create, `${entityLabel} Logo is required`)],
      ['name', name, [required(`${entityLabel} Name is required`)]],
      [
        'organizationType',
        organizationType,
        requiredWhen(create, isOrgSuperAdmin ? 'Sub Organization Suite is required' : 'Organization Type is required'),
      ],
      ['status', formStatus, requiredWhen(create, 'Status is required')],
      ['subscriptionPlan', subscriptionPlan, requiredWhen(create, 'Subscription Plan is required')],
      ['gstNumber', gstNumber, requiredWhen(create, 'GST Number is required', [validGst])],
      ['panNumber', panNumber, requiredWhen(create, 'PAN Number is required', [validPan])],
      ['country', country, requiredWhen(create, 'Country is required')],
      ['state', stateName, requiredWhen(create && locationMeta.stateRequired, 'State is required')],
      ['district', district, requiredWhen(create && locationMeta.districtRequired, 'District is required')],
      ['pincode', pincode, requiredWhen(create, 'Pincode is required', [pincodeMatching(locationMeta.pincodeRegex, locationMeta.pincodeFormat)])],
      ['location', location, requiredWhen(create, 'Location / HQ City is required', [alphabetsOnly('Location / HQ City')])],
      ['contactPerson', contactPerson, requiredWhen(create, 'Contact Person Name is required', [alphabetsOnly('Contact Person Name')])],
      ['phone', phone, requiredWhen(create, 'Contact Phone is required', [indianMobile('Contact Phone')])],
      ['whatsapp', whatsapp, [indianMobile('WhatsApp Number')]],
      ['email', email, requiredWhen(create, 'Official Email is required', [emailAddress])],
      ['password', password, requiredWhen(create, 'Password is required')],
      ['address', address, requiredWhen(create, 'Address is required')],
    ]);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setApiModalError(null);

    setIsSubmitting(true);
    try {
      await (editingOrg ? saveEdit(editingOrg) : saveCreate());
      setIsModalOpen(false);
      await loadOrganizations(currentPage, pageSize, appliedSearch, appliedStatus);
    } catch (err: any) {
      // Field-level problems the server reports are shown under their inputs
      const serverFieldErrors = pickFieldErrors(extractApiFieldErrors(err), API_FORM_FIELDS);
      if (Object.keys(serverFieldErrors).length > 0) {
        setFormErrors((prev) => ({ ...prev, ...serverFieldErrors }));
        return;
      }
      const message = getApiErrorMessage(err, 'Could not save organization.');
      setApiModalError(message);
      showToast('error', 'Operation Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const searchedOrgs = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      o.code.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      (o.organizationType && o.organizationType.toLowerCase().includes(appliedSearch.toLowerCase())) ||
      o.location.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      o.industry.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      (o.subscriptionPlan && o.subscriptionPlan.toLowerCase().includes(appliedSearch.toLowerCase()))
  );

  const filteredOrgs = appliedStatus === 'All'
    ? searchedOrgs
    : searchedOrgs.filter((o) => o.status === appliedStatus);

  // Only updates pending - does NOT filter until Apply is clicked
  const handleSearchChange = (val: string) => setPendingSearch(val);
  const handleStatusFilter = (val: 'All' | 'Active' | 'Inactive' | 'Suspend') => setPendingStatus(val);

  // Apply: copy pending -> applied and reset to page 1
  const handleApply = () => {
    setAppliedSearch(pendingSearch);
    setAppliedStatus(pendingStatus);
    setCurrentPage(1);
  };

  // Reset: clear everything
  const handleReset = () => {
    setPendingSearch('');
    setPendingStatus('All');
    setAppliedSearch('');
    setAppliedStatus('All');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
            <span>{isOrgSuperAdmin || isSubOrgMode ? 'Sub Organization' : 'Organizations'}</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {isOrgSuperAdmin
              ? 'Manage sub organizations, operational units, and corporate profiles'
              : 'Manage enterprise organizations, multi-tenant units, and corporate profiles'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {parentOrgContext && (
            <button
              type="button"
              onClick={handleExitSubOrgMode}
              className="h-10 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Back to Organizations"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Back</span>
            </button>
          )}

          {!isOrgSuperAdmin && (
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenAddModal}
              icon={<Plus className="w-4 h-4" strokeWidth={2.5} />}
            >
              {isSubOrgMode ? 'Add Sub Organization' : 'Add New Organization'}
            </Button>
          )}
        </div>
      </div>

      {/* Filter / Search row */}
      <SearchBar
        value={pendingSearch}
        onChange={handleSearchChange}
        placeholder="Search organizations by name, code, type, industry, location..."
        onSubmit={handleApply}
        onReset={handleReset}
        filterSlot={
          <FilterDropdown
            options={[
              { label: 'Status : All', value: 'All' },
              { label: 'Active', value: 'Active', dotColor: '#10b981' },
              { label: 'Inactive', value: 'Inactive', dotColor: '#f43f5e' },
              { label: 'Suspend', value: 'Suspend', dotColor: '#f59e0b' },
            ]}
            value={pendingStatus}
            onChange={handleStatusFilter}
          />
        }
        rightSlot={
          <span className="text-xs font-semibold text-slate-500 pr-2">
            Total Organization :{' '}
            <span className="text-[#33077C] font-bold">{totalRecords}</span>
          </span>
        }
      />

      {/* Organizations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[900px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">ORGANIZATION & CODE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">
                  {isSubOrgMode ? 'CONTACT PERSON' : 'ORGANIZATION TYPE'}
                </th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">CONTACT INFO</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">SUBSCRIPTION PLANS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">LOCATION</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CREATED DATE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-500 border border-slate-200">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#33077C] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold text-slate-500">Loading organizations...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    No organizations found matching your search.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const initials = org.name.substring(0, 2).toUpperCase();
                  const phone = org.phone || '';
                  const whatsappVal = org.whatsapp || org.phone || '';
                  const email = org.email || '';

                  return (
                    <tr key={org.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Organization & Code */}
                      <td className="py-4 px-5 border border-slate-200">
                        <div className="flex items-center gap-3.5">
                          {org.logo ? (
                            <img src={org.logo} alt={org.name} className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-[#33077C] shadow-xs" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2B3991] to-[#33077C] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border-2 border-[#33077C]">
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">{org.name}</span>
                              <span className="text-xs font-semibold text-[#4309A2]">
                                ({org.code})
                              </span>
                            </div>
                            {!isSubOrgMode && org.contactPerson && (
                              <p className="text-xs text-slate-500 font-medium mt-0.5">
                                {org.contactPerson}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Contact Person (for Sub Org) or Organization Type (for Parent Org) */}
                      <td className="py-4 px-5 border border-slate-200 text-center">
                        <span className="text-sm font-semibold text-slate-800">
                          {isSubOrgMode ? (org.contactPerson || '-') : (org.organizationType || '-')}
                        </span>
                      </td>

                      {/* 3. Contact Info Actions */}
                      <td className="py-4 px-4 border border-slate-200">
                        <ContactCopyButtons
                          id={org.id}
                          phone={org.phone}
                          whatsapp={org.whatsapp || org.phone}
                          email={org.email}
                          copiedKey={copiedKey}
                          onCopy={handleCopy}
                        />
                      </td>

                      {/* 3. Subscription Plans */}
                      <td className="py-4 px-5 border border-slate-200">
                        <div className="flex items-center gap-2">
                          {org.subscriptionPlan ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-[#33077C] font-bold text-xs shadow-2xs">
                              <Layers className="w-3.5 h-3.5 text-[#33077C] shrink-0" />
                              {org.subscriptionPlan}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold text-xs">-</span>
                          )}
                        </div>
                      </td>

                      {/* 4. Location */}
                      <td className="py-4 px-5 border border-slate-200">
                        <div className="flex items-center gap-2 font-medium text-slate-900">
                          {org.location ? (
                            <>
                              <MapPin className="w-4 h-4 text-[#4309A2] shrink-0" />
                              <span>{org.location}</span>
                            </>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      {/* 5. Status */}
                      <td className="py-4 px-5 border border-slate-200 text-center">
                        <StatusBadge status={org.status} tones={ORGANIZATION_STATUS_TONES} />
                      </td>

                      {/* 6. Created Date */}
                      <td className="py-4 px-5 border border-slate-200">
                        <div className="font-bold text-slate-900 text-xs">
                          {formatDate(org.createdAt)}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Active Account
                        </span>
                      </td>

                      {/* 7. Action: Three Dots Dropdown */}
                      <td className="py-4 px-5 border border-slate-200 text-center relative" data-row-menu-trigger>
                        <div className="inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => rowMenu.toggle(e, org.id)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-[#33077C] hover:bg-[#432eb5] text-white shadow-xs active:scale-95"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4 text-white" />
                          </button>

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

      {/* Pagination Bar - standalone card */}
      <Pagination
        total={totalRecords}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
      />

      {/* Action Dropdown Menu Portal / Overlay */}
      {rowMenu.activeId && rowMenu.pos && (() => {
        const targetOrg = organizations.find((o) => o.id === rowMenu.activeId);
        if (!targetOrg) return null;

        return (
          <div
            style={{
              position: 'fixed',
              ...(rowMenu.pos.bottom !== undefined
                ? { bottom: `${rowMenu.pos.bottom}px` }
                : { top: `${rowMenu.pos.top}px` }),
              right: `${rowMenu.pos.right}px`,
            }}
            data-row-menu className="w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[9999] animate-in fade-in zoom-in-95 duration-100 text-left"
          >
            {/* 1. View */}
            <button
              type="button"
              onClick={() => {
                rowMenu.close();
                setViewingOrg(targetOrg);
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
                rowMenu.close();
                handleOpenEditModal(targetOrg);
              }}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-[#7C3AED] flex items-center justify-center text-white shrink-0 shadow-xs">
                <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="font-semibold text-slate-800 text-[13px]">Edit</span>
            </button>

            {/* 2.5. Sub-Organizations (only for parent orgs when subOrganizationSupport=true) */}
            {!isSubOrgMode && targetOrg.subOrganizationSupport && (
              <button
                type="button"
                onClick={() => {
                  rowMenu.close();
                  handleOpenSubOrgManager(targetOrg);
                }}
                className="w-full px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Network className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="font-semibold text-slate-800 text-[13px] whitespace-nowrap">Sub-Organizations</span>
              </button>
            )}

            {/* 3. Suspend */}
            <button
              type="button"
              onClick={() => {
                rowMenu.close();
                setConfirmAction({
                  type: 'Suspend',
                  orgId: targetOrg.id,
                  orgName: targetOrg.name,
                });
              }}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="font-semibold text-slate-800 text-[13px]">Suspend</span>
            </button>

            {/* 4. Inactive */}
            <button
              type="button"
              onClick={() => {
                rowMenu.close();
                setConfirmAction({
                  type: 'Inactive',
                  orgId: targetOrg.id,
                  orgName: targetOrg.name,
                });
              }}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-3 transition-colors rounded-xl cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-slate-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Ban className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="font-semibold text-slate-800 text-[13px]">Inactive</span>
            </button>
          </div>
        );
      })()}

      {/* Modal: Add / Edit Organization */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            editingOrg
              ? (isSubOrgMode ? 'Edit Sub Organization' : 'Edit Organization')
              : (isSubOrgMode ? 'Add Sub Organization' : 'Add Organization')
          }
          subtitle={
            isSubOrgMode
              ? 'Configure sub organization profile, credentials, and contact details'
              : 'Configure organization profile, subscription tier, and contact details'
          }
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-4.5 p-2 sm:p-4">
            {apiModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-between">
                <span>{apiModalError}</span>
                <button
                  type="button"
                  onClick={() => setApiModalError(null)}
                  className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}
            {/* Unified 3-fields-per-row Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Field 1: Logo */}
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  {isSubOrgMode ? 'Sub Organization Logo' : 'Organization Logo'} <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className={`w-11 h-11 rounded-full bg-slate-100 ${!logo ? (formErrors.logo ? 'border-2 border-red-500' : 'border border-dashed border-slate-300') : 'border-2 border-[#33077C]'} flex items-center justify-center overflow-hidden shrink-0 shadow-2xs`}>
                    {logo ? (
                      <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 h-11 px-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-[13px] border ${formErrors.logo ? 'border-red-500' : 'border-slate-200 hover:border-slate-300'
                      } transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs`}
                  >
                    <Upload className="w-3.5 h-3.5 text-[#33077C]" />
                    <span>{logo ? 'Change' : 'Upload Logo'}</span>
                  </button>
                  {logo && (
                    <button
                      type="button"
                      onClick={() => setLogo('')}
                      title="Remove logo"
                      className="h-11 px-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {formErrors.logo && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.logo}</p>
                )}
              </div>

              {/* Field 2: Name */}
              <TextField
                label={`${entityLabel} Name`}
                required
                value={name}
                error={formErrors.name}
                placeholder="Enter organization name"
                onValueChange={fieldHandler(setName, 'name')}
              />

              {/* Field 3: Code */}
              <ReadOnlyField label={`${entityLabel} Code`} value={code} placeholder="Auto-generated" />

              {/* Field 4: Organization Type / Suite */}
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  {isSubOrgMode ? 'Sub Organization Type' : 'Organization Type'} <span className="text-rose-500 font-bold">*</span>
                </label>
                <CustomSelect
                  value={organizationType}
                  onChange={(val) => {
                    setOrganizationType(val);
                    clearFieldError('organizationType');
                  }}
                  options={ORGANIZATION_TYPE_OPTIONS}
                  placeholder="Select company type"
                  activeColor="brand"
                  error={!!formErrors.organizationType}
                />
                {formErrors.organizationType && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.organizationType}</p>
                )}
              </div>

              {/* Field 5: Country / State / District (master data) */}
              <LocationFields
                country={country}
                state={stateName}
                district={district}
                errors={{ country: formErrors.country, state: formErrors.state, district: formErrors.district }}
                onMeta={setLocationMeta}
                onChange={(patch) => {
                  if (patch.countryId !== undefined) setCountryId(patch.countryId);
                  if (patch.stateId !== undefined) setStateId(patch.stateId);
                  if (patch.districtId !== undefined) setDistrictId(patch.districtId);
                  if (patch.country !== undefined) { setCountry(patch.country); clearFieldError('country'); }
                  if (patch.state !== undefined) { setStateName(patch.state); clearFieldError('state'); }
                  if (patch.district !== undefined) { setDistrict(patch.district); clearFieldError('district'); }
                }}
              />
              <TextField
                label="Pincode"
                required
                inputMode="numeric"
                maxLength={10}
                value={pincode}
                error={formErrors.pincode}
                placeholder="e.g. 600001"
                onValueChange={fieldHandler(setPincode, 'pincode', (v) => cleanPincode(v, locationMeta.pincodeRegex))}
              />

              {/* Field 6: Company Registration Type */}
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Company Registration Type
                </label>
                <CustomSelect
                  value={registrationType}
                  onChange={(val) => setRegistrationType(val)}
                  options={REGISTRATION_TYPE_OPTIONS}
                  placeholder="Select company registration type"
                  activeColor="brand"
                />
              </div>

              {/* Field 7: Status */}
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Status <span className="text-rose-500 font-bold">*</span>
                </label>
                <CustomSelect
                  value={formStatus}
                  onChange={(val) => {
                    setFormStatus(val as 'Active' | 'Inactive' | 'Suspend');
                    clearFieldError('status');
                  }}
                  options={STATUS_OPTIONS}
                  placeholder="Select status"
                  activeColor="brand"
                  error={!!formErrors.status}
                />
                {formErrors.status && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.status}</p>
                )}
              </div>

              {/* Field 8: Subscription Plan */}
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Subscription Plan <span className="text-rose-500 font-bold">*</span>
                </label>
                <CustomSelect
                  value={subscriptionPlan}
                  onChange={(val) => {
                    setSubscriptionPlan(val);
                    clearFieldError('subscriptionPlan');
                  }}
                  options={subscriptionPlanOptions}
                  placeholder="Select subscription plan"
                  activeColor="brand"
                  error={!!formErrors.subscriptionPlan}
                />
                {formErrors.subscriptionPlan && (
                  <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.subscriptionPlan}</p>
                )}
              </div>

              {/* Field 9: GST Number */}
              <TextField
                label="GST Number"
                required
                maxLength={15}
                inputClassName="uppercase"
                value={gstNumber}
                error={formErrors.gstNumber}
                placeholder="e.g. 33AAAAA0000A1Z5"
                onValueChange={fieldHandler(setGstNumber, 'gstNumber', (v) => alphanumericUpper(v, 15), liveGstError)}
              />

              {/* Field 10: PAN Number */}
              <TextField
                label="PAN Number"
                required
                maxLength={10}
                inputClassName="uppercase"
                value={panNumber}
                error={formErrors.panNumber}
                placeholder="e.g. AAAAA0000A"
                onValueChange={fieldHandler(setPanNumber, 'panNumber', (v) => alphanumericUpper(v, 10), livePanError)}
              />

              {/* Field 11: Industry / Domain */}
              <TextField
                label="Industry / Domain"
                value={industry}
                placeholder="e.g. Information Technology"
                onValueChange={setIndustry}
              />

              {/* Field 12: Location / HQ City */}
              <TextField
                label="Location / HQ City"
                required
                value={location}
                error={formErrors.location}
                placeholder="e.g. Chennai"
                onValueChange={fieldHandler(setLocation, 'location', lettersOnly)}
              />

              {/* Field 13: Contact Person Name */}
              <TextField
                label="Contact Person Name"
                required
                value={contactPerson}
                error={formErrors.contactPerson}
                placeholder="Enter contact person name"
                onValueChange={fieldHandler(setContactPerson, 'contactPerson', lettersOnly)}
              />

              {/* Field 14: Contact Phone */}
              <TextField
                label="Contact Phone"
                required
                inputMode="numeric"
                maxLength={10}
                value={phone}
                error={formErrors.phone}
                placeholder="e.g. 9876543210"
                onValueChange={fieldHandler(setPhone, 'phone', digitsOnly, (v) => liveMobileStartError('Contact Phone', v))}
              />

              {/* Field 15: WhatsApp Number */}
              <TextField
                label="WhatsApp Number"
                inputMode="numeric"
                maxLength={10}
                value={whatsapp}
                error={formErrors.whatsapp}
                placeholder="e.g. 9876543210"
                onValueChange={fieldHandler(setWhatsapp, 'whatsapp', digitsOnly, (v) => liveMobileStartError('WhatsApp Number', v))}
              />

              {/* Field 16: Official Email */}
              <TextField
                label="Official Email"
                required
                type="email"
                value={email}
                error={formErrors.email}
                placeholder="e.g. admin@organization.com"
                onValueChange={fieldHandler(setEmail, 'email')}
              />

              {/* Field 17: Password */}
              <div>
                <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                  Password <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editingOrg ? 'Leave empty to keep unchanged' : '••••••••'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError('password');
                    }}
                    className={`w-full h-11 pl-4 pr-10 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${formErrors.password
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

              {/* Field 18: Address */}
              <TextField
                label="Address"
                required
                value={address}
                error={formErrors.address}
                placeholder="Enter complete address"
                onValueChange={fieldHandler(setAddress, 'address')}
              />

              {/* Field 19: Sub-Organization Support (Parent Org SuperAdmin only) */}
              {isSuperAdmin && !isSubOrgMode && (
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Sub-Organization Support
                  </label>
                  <div className="h-11 px-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all">
                    <span className="text-xs font-semibold text-slate-600">
                      {subOrganizationSupport ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={subOrganizationSupport}
                      onClick={() => setSubOrganizationSupport(!subOrganizationSupport)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${subOrganizationSupport ? 'bg-[#33077C]' : 'bg-slate-300'
                        }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${subOrganizationSupport ? 'translate-x-5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: View Organization Details */}
      {viewingOrg && (
        <Modal
          isOpen={!!viewingOrg}
          onClose={() => setViewingOrg(null)}
          title={isOrgSuperAdmin ? 'Sub Organization Details' : 'Organization Details'}
          subtitle={
            isOrgSuperAdmin
              ? 'View sub organization profile, contact information, and details'
              : 'View profile, contact information, and active subscription plan'
          }
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
        >
          <div className="space-y-5" aria-busy={viewLoading}>
            {viewLoading && <p className="text-[11px] font-medium text-slate-400">Loading latest details…</p>}
            {/* Top Overview / Profile Header Card (Matching Card Design) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-4">
                {viewingOrg.logo ? (
                  <div className="w-14 h-14 rounded-full bg-white border-2 border-[#33077C] p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    <img src={viewingOrg.logo} alt={viewingOrg.name} className="w-full h-full object-cover rounded-full" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                    {viewingOrg.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{viewingOrg.name}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {viewingOrg.code}
                    </span>
                    {viewingOrg.organizationType && (
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${viewingOrg.organizationType === 'Sales Management'
                        ? 'bg-purple-50 text-[#33077C] border-purple-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                        {viewingOrg.organizationType}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{viewingOrg.location}</span>
                  </div>
                </div>
              </div>

              {/* Status & Plan Pills */}
              <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                <StatusBadge status={viewingOrg.status} tones={ORGANIZATION_STATUS_TONES} />

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-[#33077C] font-bold text-xs shadow-2xs">
                  <Layers className="w-3.5 h-3.5 text-[#33077C]" />
                  <span>{viewingOrg.subscriptionPlan || '-'}</span>
                </span>
              </div>
            </div>

            {/* Two Column Layout Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Left Column: Corporate & Registration Details */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center font-bold">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Corporate & Registration Details</span>
                </div>

                <div className="space-y-3 text-xs sm:text-[13px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 font-medium shrink-0">Organization Type</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.organizationType || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Registration Type</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.registrationType || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">GST Number</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.gstNumber || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">PAN Number</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.panNumber || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Industry / Domain</span>
                    <span className="font-bold text-slate-800 text-right leading-snug">{viewingOrg.industry || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Location / HQ City</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.location || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Country</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.country || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">State</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.state || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">District</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.district || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Pincode</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.pincode || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact & Address Details */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#33077C] flex items-center justify-center font-bold">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span>Contact & Address Details</span>
                </div>

                <div className="space-y-3 text-xs sm:text-[13px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 font-medium shrink-0">Contact Person</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.contactPerson || '-'}</span>
                  </div>

                  {/* Contact Phone */}
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Contact Phone</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.phone || '-'}</span>
                  </div>

                  {/* WhatsApp Number */}
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">WhatsApp Number</span>
                    <span className="font-bold text-slate-800 text-right">{viewingOrg.whatsapp || viewingOrg.phone || '-'}</span>
                  </div>

                  {/* Official Email */}
                  <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Official Email</span>
                    <span className="font-bold text-slate-800 text-right break-all">{viewingOrg.email || '-'}</span>
                  </div>

                  {/* Registered Address */}
                  <div className="flex items-start justify-between gap-4 pt-2.5 border-t border-slate-100">
                    <span className="text-slate-400 font-medium shrink-0">Address</span>
                    <span className="font-bold text-slate-800 text-right leading-snug">{viewingOrg.address || viewingOrg.location || '-'}</span>
                  </div>

                  {/* Login user of the sub-organization (from the detail call) */}
                  {viewingSubOrg && (viewingOrg.adminEmail || viewingOrg.adminName) && (
                    <div className="flex items-start justify-between gap-4 pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-medium shrink-0">Admin Login</span>
                      <span className="font-bold text-slate-800 text-right leading-snug break-all">
                        {viewingOrg.adminName || '-'}
                        {viewingOrg.adminEmail && (
                          <span className="block text-[11px] font-medium text-slate-500">{viewingOrg.adminEmail}</span>
                        )}
                      </span>
                    </div>
                  )}
                  {viewingSubOrg && (
                    <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-medium shrink-0">Branches</span>
                      <span className="font-bold text-slate-800 text-right">{viewingOrg.branchesCount ?? 0}</span>
                    </div>
                  )}

                  {/* Sub-Organization Support (Super Admin Only) */}
                  {isSuperAdmin && (
                    <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
                      <span className="text-slate-400 font-medium shrink-0">Sub-Org Support</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border ${viewingOrg.subOrganizationSupport
                        ? 'bg-purple-50 text-[#33077C] border-purple-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${viewingOrg.subOrganizationSupport ? 'bg-[#33077C]' : 'bg-slate-400'}`} />
                        {viewingOrg.subOrganizationSupport ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingOrg(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Close</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const orgToEdit = viewingOrg;
                  setViewingOrg(null);
                  handleOpenEditModal(orgToEdit);
                }}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Organization</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reusable Confirmation Modal: Suspend / Inactive / Delete */}
      <ConfirmationModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        type={confirmAction?.type}
        itemTypeLabel={isSubOrgMode ? 'Sub Organization' : 'Organization'}
        itemName={confirmAction?.orgName}
        isLoading={isProcessingAction}
        onConfirm={async () => {
          if (!confirmAction) return;
          if (confirmAction.type === 'Delete') {
            await handleDeleteOrganization(confirmAction.orgId, confirmAction.orgName);
          } else {
            await handleUpdateStatus(confirmAction.orgId, confirmAction.type);
            setConfirmAction(null);
          }
        }}
      />
    </div>
  );
};
