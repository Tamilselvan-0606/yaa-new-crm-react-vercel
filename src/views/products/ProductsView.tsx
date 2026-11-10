import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  clientProductApi,
  ClientProductApiItem,
  CreateClientProductRequest,
  UpdateClientProductRequest,
  subOrganizationApi,
  SubOrganizationApiItem,
  branchApi,
  BranchApiItem,
  organizationApi,
  getStoredOrganizationId,
  platformClientApi,
  platformLeadApi,
} from '../../api';
import {
  Boxes,
  Plus,
  Layers,
  Users,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Ban,
  PauseCircle,
  CheckCircle2,
  X,
  Check,
  Building2,
  MapPin,
  UserRound,
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
import { useScopeLock } from '../../hooks/useScopeLock';
import { filterBranchesForSuite } from '../../utils/branchSuite';
import {
  alphabetsOnly,  lettersOnly,
  alphanumericUpper,
  digitsOnly,
  emailAddress,
  indianMobile,
  liveGstError,
  livePanError,
  liveMobileStartError,
  required,
  requiredWhen,
  validateFields,
  validGst,
  validPan,
} from '../../utils/fieldValidators';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useRowActionMenu } from '../../hooks/useRowActionMenu';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ContactCopyButtons } from '../../components/common/ContactCopyButtons';
import { ReadOnlyField, TextField } from '../../components/common/FormField';
import { confirmButtonLabel, nextStatus } from '../../utils/statusActions';

export const ProductsView: React.FC = () => {
  const { showToast, currentUser } = useAuth();

  // Organization, Sub-Organizations, Branches State
  const [defaultOrgName, setDefaultOrgName] = useState<string>(() => {
    return (
      localStorage.getItem('active_organization_orgsuperadmin') ||
      localStorage.getItem('active_organization') ||
      currentUser?.name ||
      'Yaa Creations'
    );
  });
  const { lockSubOrg, lockBranch, lockedSubOrgId, lockedBranchId } = useScopeLock();
  const isSaleSuiteActive =
    window.location.pathname.startsWith('/sale-management') || localStorage.getItem('active_org_type_view') === 'Sales Management';
  const [subOrganizations, setSubOrganizations] = useState<SubOrganizationApiItem[]>([]);
  const [loadingSubOrgs, setLoadingSubOrgs] = useState<boolean>(false);
  const [branches, setBranches] = useState<BranchApiItem[]>([]);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);

  // Products Data from real API
  const [products, setProducts] = useState<ClientProductApiItem[]>([]);
  const [clientCountsByProduct, setClientCountsByProduct] = useState<Record<string, number>>({});
  const [leadCountsByProduct, setLeadCountsByProduct] = useState<Record<string, number>>({});
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // 3-dots row menu + click-to-copy contact buttons (shared hooks)
  const rowMenu = useRowActionMenu(240);
  const { copiedKey, copy: handleCopy } = useCopyToClipboard();

  // Add / Edit Product Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ClientProductApiItem | null>(null);

  // View Product Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<ClientProductApiItem | null>(null);
  const viewingProductId = isViewModalOpen ? viewingProduct?.id : undefined;

  // Opening "View" shows the list row at once, then loads the full record (GET product by id) so the
  // profile, contact details and branch are exactly what is saved. The detail never blanks a field the
  // row already has. The response is cached (ClientProduct tag) and refreshed after any product change.
  useEffect(() => {
    if (!viewingProductId) return;
    let cancelled = false;
    clientProductApi
      .getProductById(viewingProductId, viewingProduct?.organizationId)
      .then((res) => {
        if (cancelled || !res?.success || !res.data) return;
        const kept = Object.fromEntries(Object.entries(res.data).filter(([, v]) => v !== '' && v != null));
        setViewingProduct((cur) => (cur && cur.id === res.data.id ? ({ ...cur, ...kept } as ClientProductApiItem) : cur));
      })
      .catch(() => {
        /* keep the list data */
      });
    return () => {
      cancelled = true;
    };
  }, [viewingProductId]);

  // Confirmation Modal State (Inactive / Suspend / Delete)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'Inactive' | 'Suspend' | 'Delete';
    product: ClientProductApiItem;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /** Updates one form field and sets (or clears) its inline error in a single call. */
  const updateField = (key: keyof typeof formData, value: string, error = '') => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => (prev[key] === error ? prev : { ...prev, [key]: error }));
  };
  const [apiModalError, setApiModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    organizationId: '',
    subOrganizationId: '',
    branchId: '',
    name: '',
    code: '',
    contactPerson: '',
    mobileNumber: '',
    supportWhatsapp: '',
    supportEmail: '',
    gstNumber: '',
    panNumber: '',
    hqCity: '',
    address: '',
    status: '' as '' | 'Active' | 'Inactive' | 'Suspended',
    tagline: '',
    description: '',
    websiteUrl: '',
    applicationUrl: '',
    supportPhone: '',
    badge: 'Active Suite',
    color: '#33077C',
  });

  const lastRequestKeyRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadProducts = async (subOrgId?: string, branchId?: string, forced = false, prodFilterName?: string) => {
    const activeSubOrgName = localStorage.getItem('active_sub_organization');
    const storedSubOrgId = localStorage.getItem('active_sub_organization_id');
    const effectiveSubOrgId =
      subOrgId !== undefined
        ? subOrgId
        : (activeSubOrgName && activeSubOrgName !== 'All' ? storedSubOrgId || undefined : undefined);

    const activeBranch = localStorage.getItem('active_branch');
    const storedBranchId = localStorage.getItem('active_branch_id');
    const effectiveBranchId =
      branchId !== undefined
        ? branchId
        : (activeBranch && activeBranch !== 'All' ? storedBranchId || undefined : undefined);

    const activeProduct = prodFilterName !== undefined ? prodFilterName : (localStorage.getItem('active_product') || 'All');

    const requestKey = `${page}_${pageSize}_${appliedSearch.trim()}_${appliedStatus}_${effectiveSubOrgId || ''}_${effectiveBranchId || ''}_${activeProduct}`;
    if (!forced && lastRequestKeyRef.current === requestKey) {
      return;
    }
    lastRequestKeyRef.current = requestKey;

    try {
      setLoading(true);

      const [res, clientsRes, leadsRes] = await Promise.all([
        clientProductApi.getProducts({
          page,
          limit: pageSize,
          search: appliedSearch.trim() || undefined,
          status: appliedStatus !== 'ALL' ? appliedStatus : undefined,
          subOrganizationId: effectiveSubOrgId,
          branchId: effectiveBranchId,
        }),
        platformClientApi.getClients({ limit: 100 }).catch(() => null),
        platformLeadApi.getLeads({ limit: 100 }).catch(() => null),
      ]);

      const cCounts: Record<string, number> = {};
      const allClients = Array.isArray(clientsRes?.data) ? clientsRes.data : [];
      allClients.forEach((c: any) => {
        const pId = (c.productId || c.product_id || c.subscription?.productId || c.subscription?.planId || '')?.toString().toLowerCase().trim();
        const pName = (c.productName || c.product_name || c.subscriptionPlan || c.subscription?.planName || '')?.toString().toLowerCase().trim();
        if (pId) cCounts[pId] = (cCounts[pId] || 0) + 1;
        if (pName) cCounts[pName] = (cCounts[pName] || 0) + 1;
        // Clean alphanumerics
        const cleanName = pName.replace(/[^a-z0-9]/g, '');
        if (cleanName) cCounts[cleanName] = (cCounts[cleanName] || 0) + 1;

        if (Array.isArray(c.linkedProducts)) {
          c.linkedProducts.forEach((lp: any) => {
            const lpId = (lp.productId || lp.id || '')?.toString().toLowerCase().trim();
            const lpName = (lp.productName || lp.name || '')?.toString().toLowerCase().trim();
            if (lpId) cCounts[lpId] = (cCounts[lpId] || 0) + 1;
            if (lpName) cCounts[lpName] = (cCounts[lpName] || 0) + 1;
            const lpClean = lpName.replace(/[^a-z0-9]/g, '');
            if (lpClean) cCounts[lpClean] = (cCounts[lpClean] || 0) + 1;
          });
        }
      });
      setClientCountsByProduct(cCounts);

      const lCounts: Record<string, number> = {};
      const allLeads = Array.isArray(leadsRes?.data) ? leadsRes.data : [];
      allLeads.forEach((l: any) => {
        const pId = (l.productId || l.product_id || '')?.toString().toLowerCase().trim();
        const pName = (l.planInterest || l.interestedProductOrService || '')?.toString().toLowerCase().trim();
        if (pId) lCounts[pId] = (lCounts[pId] || 0) + 1;
        if (pName) lCounts[pName] = (lCounts[pName] || 0) + 1;
        const cleanName = pName.replace(/[^a-z0-9]/g, '');
        if (cleanName) lCounts[cleanName] = (lCounts[cleanName] || 0) + 1;

        if (Array.isArray(l.interestedProducts)) {
          l.interestedProducts.forEach((ip: any) => {
            const ipStr = String(ip || '').toLowerCase().trim();
            if (ipStr) lCounts[ipStr] = (lCounts[ipStr] || 0) + 1;
            const ipClean = ipStr.replace(/[^a-z0-9]/g, '');
            if (ipClean) lCounts[ipClean] = (lCounts[ipClean] || 0) + 1;
          });
        }
      });
      setLeadCountsByProduct(lCounts);

      if (res && res.success) {
        let items = res.data || [];
        if (activeProduct && activeProduct !== 'All') {
          items = items.filter(
            (p) =>
              (p.name || '').trim().toLowerCase() === activeProduct.trim().toLowerCase() ||
              (p.code || '').trim().toLowerCase() === activeProduct.trim().toLowerCase()
          );
        }
        setProducts(items);
        const total = (activeProduct && activeProduct !== 'All') ? items.length : (res.pagination?.totalRecords ?? items.length);
        setTotalProducts(total);
      } else {
        setProducts([]);
        setTotalProducts(0);
      }
    } catch (err: any) {
      console.error('Failed to load products:', err);
      showToast?.('error', 'Error', err?.message || 'Failed to load products');
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleFilterChange = (e: any) => {
      setPage(1);
      loadProducts(e?.detail?.subOrganizationId || e?.detail?.id, e?.detail?.branchId);
    };
    const handleProductChange = (e: any) => {
      setPage(1);
      loadProducts(undefined, undefined, true, e?.detail?.product || e?.detail?.name);
    };
    window.addEventListener('subOrgChanged', handleFilterChange);
    window.addEventListener('branchChanged', handleFilterChange);
    window.addEventListener('productChanged', handleProductChange);
    return () => {
      window.removeEventListener('subOrgChanged', handleFilterChange);
      window.removeEventListener('branchChanged', handleFilterChange);
      window.removeEventListener('productChanged', handleProductChange);
    };
  }, [pageSize, appliedSearch, appliedStatus]);

  const loadOrganizationSubOrgsAndBranches = async () => {
    const activeOrgId = currentUser?.organizationId || getStoredOrganizationId();

    if (activeOrgId) {
      try {
        const orgRes = await organizationApi.getOrganizationById(activeOrgId);
        if (orgRes?.data?.name) {
          setDefaultOrgName(orgRes.data.name);
        }
      } catch {}
    }

    try {
      setLoadingSubOrgs(true);
      let apiSubs: SubOrganizationApiItem[] = [];
      try {
        const subRes = await subOrganizationApi.getSubOrganizations(
          { page_no: 1, page_size: 100, pagination_required: 'false' },
          activeOrgId || undefined
        );
        if (subRes && Array.isArray(subRes.data)) {
          apiSubs = subRes.data;
        }
      } catch (err) {
        console.warn('API getSubOrganizations notice:', err);
      }

      const isSaleSuite = window.location.pathname.startsWith('/sale-management') || localStorage.getItem('active_org_type_view') === 'Sales Management';
      const isSubForSuite = (s: SubOrganizationApiItem) => {
        const code = Number(s.subOrganizationType);
        if (code === 3) return true;
        if (code === 1) return !isSaleSuite;
        if (code === 2) return isSaleSuite;
        const t = (s.organizationType || '').toLowerCase();
        return isSaleSuite ? t.includes('sale') : !t.includes('sale');
      };

      const filteredSubs = apiSubs.filter(isSubForSuite);
      const subMap = new Map<string, SubOrganizationApiItem>();
      filteredSubs.forEach((s) => {
        const key = (s.id || s.code || s.name).trim().toLowerCase();
        subMap.set(key, s);
      });

      // Only use API sub-organizations
      setSubOrganizations(Array.from(subMap.values()));
    } catch (e) {
      console.warn('Failed to load sub-organizations:', e);
    } finally {
      setLoadingSubOrgs(false);
    }

    try {
      setLoadingBranches(true);
      let apiBranches: BranchApiItem[] = [];
      try {
        const branchRes = await branchApi.getBranches(
          { page_no: 1, page_size: 100, pagination_required: 'false' },
          activeOrgId || undefined
        );
        if (branchRes && Array.isArray(branchRes.data)) {
          apiBranches = branchRes.data;
        }
      } catch (err) {
        console.warn('API getBranches notice:', err);
      }

      const branchMap = new Map<string, BranchApiItem>();
      apiBranches.forEach((b) => {
        // De-duplicate branches by id or (code / normalized name)
        const key = (b.id || `${b.code}_${b.name}`).trim().toLowerCase();
        branchMap.set(key, b);
      });

      // Only fallback to localStorage if API returned nothing
      if (apiBranches.length === 0) {
        const savedBranches = localStorage.getItem('branches_catalog_orgsuperadmin');
        if (savedBranches) {
          try {
            const parsed = JSON.parse(savedBranches);
            if (Array.isArray(parsed)) {
              parsed.forEach((br: any) => {
                const key = (br.id || `${br.code}_${br.name}`).trim().toLowerCase();
                if (key && !branchMap.has(key)) {
                  branchMap.set(key, br);
                }
              });
            }
          } catch {}
        }
      }

      setBranches(Array.from(branchMap.values()));
    } catch (e) {
      console.warn('Failed to load branches:', e);
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    const storedSubId = localStorage.getItem('active_sub_organization_id') || undefined;
    const storedBranchId = localStorage.getItem('active_branch_id') || undefined;
    loadProducts(storedSubId, storedBranchId);
  }, [page, pageSize, appliedSearch, appliedStatus]);

  // Organization / sub-organization / branch lists only feed the Add, Edit and View forms: load them the first
  // time one opens (not when the page loads) and keep them for later opens.
  const formDataLoaded = useRef(false);
  useEffect(() => {
    if (!(isModalOpen || isViewModalOpen) || formDataLoaded.current) return;
    formDataLoaded.current = true;
    loadOrganizationSubOrgsAndBranches();
  }, [isModalOpen, isViewModalOpen]);


  // Helper: Generates 2-letter uppercase initials for product avatar matching reference (YC, DM, DD, AA, TU, etc.)
  const getProductInitials = (prod?: ClientProductApiItem): string => {
    if (!prod?.name) return 'PR';
    const nameLower = prod.name.toLowerCase();
    if (nameLower.includes('yaa connect')) return 'YC';
    if (nameLower.includes('doc motez') || nameLower.includes('motez')) return 'DM';
    if (nameLower.includes('dentq') || nameLower.includes('dent')) return 'DD';
    if (nameLower.includes('aarudam')) return 'AA';
    if (nameLower.includes('turfy')) return 'TU';
    if (nameLower.includes('marketing') || nameLower.includes('digital')) return 'DM';

    const parts = prod.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return prod.name.slice(0, 2).toUpperCase();
  };

  // Helper: Format date to exact reference format "15 Jan, 2023"
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

  // Helper: Resolve contact person name for product
  const getProductContactPerson = (prod: ClientProductApiItem): string => {
    return prod.contactPerson?.trim() || '';
  };

  // Modal Handlers
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormErrors({});
    setApiModalError(null);
    setFormData({
      organizationId: currentUser?.organizationId || getStoredOrganizationId() || '',
      subOrganizationId: lockedSubOrgId,
      branchId: lockedBranchId,
      name: '',
      code: '',
      contactPerson: '',
      mobileNumber: '',
      supportWhatsapp: '',
      supportEmail: '',
      gstNumber: '',
      panNumber: '',
      hqCity: '',
      address: '',
      status: '' as '' | 'Active' | 'Inactive' | 'Suspended',
      tagline: '',
      description: '',
      websiteUrl: '',
      applicationUrl: '',
      supportPhone: '',
      badge: 'Active Suite',
      color: '#33077C',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: ClientProductApiItem) => {
    setEditingProduct(prod);
    setFormErrors({});
    setApiModalError(null);
    const resolvedSubOrgId = prod.subOrganizationId || (prod as any).sub_organization_id || '';
    const resolvedBranchId = prod.branchId || (prod as any).branch_id || '';
    setFormData({
      organizationId: prod.organizationId || currentUser?.organizationId || getStoredOrganizationId() || '',
      subOrganizationId: lockedSubOrgId || resolvedSubOrgId,
      branchId: lockedBranchId || resolvedBranchId,
      name: prod.name || '',
      code: prod.code || '',
      contactPerson: prod.contactPerson || '',
      mobileNumber: prod.mobileNumber || '',
      supportWhatsapp: prod.supportWhatsapp || '',
      supportEmail: prod.supportEmail || '',
      gstNumber: prod.gstNumber || '',
      panNumber: prod.panNumber || '',
      hqCity: prod.hqCity || '',
      address: prod.address || '',
      status: (prod.status || '') as '' | 'Active' | 'Inactive' | 'Suspended',
      tagline: prod.tagline || '',
      description: prod.description || '',
      websiteUrl: prod.websiteUrl || '',
      applicationUrl: prod.applicationUrl || '',
      supportPhone: prod.supportPhone || '',
      badge: prod.badge || 'Active Suite',
      color: prod.color || '#33077C',
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateFields([
      ['name', formData.name, [required('Product / Org Name is required')]],
      ['status', formData.status, [required('Status is required')]],
    ]);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSubmitting(true);
      const activeOrgId = currentUser?.organizationId || getStoredOrganizationId();
      const payload: CreateClientProductRequest = {
        name: formData.name.trim(),
        organizationId: activeOrgId || undefined,
        subOrganizationId: (formData.subOrganizationId && formData.subOrganizationId !== '__PARENT_ORG__') ? formData.subOrganizationId : undefined,
        branchId: formData.branchId || undefined,
        code: formData.code.trim() || undefined,
        contactPerson: formData.contactPerson.trim() || undefined,
        mobileNumber: formData.mobileNumber.trim() || undefined,
        supportPhone: formData.supportPhone.trim() || undefined,
        supportWhatsapp: formData.supportWhatsapp.trim() || undefined,
        supportEmail: formData.supportEmail.trim() || undefined,
        gstNumber: formData.gstNumber.trim() || undefined,
        panNumber: formData.panNumber.trim() || undefined,
        hqCity: formData.hqCity.trim() || undefined,
        address: formData.address.trim() || undefined,
        ...(formData.status ? { status: formData.status as 'Active' | 'Inactive' | 'Suspended' } : {}),
        tagline: formData.tagline.trim() || undefined,
        description: formData.description.trim() || undefined,
        websiteUrl: formData.websiteUrl.trim() || undefined,
        applicationUrl: formData.applicationUrl.trim() || undefined,
        badge: formData.badge.trim() || 'Active Suite',
        color: formData.color || '#33077C',
      };

      if (editingProduct) {
        await clientProductApi.updateProduct(editingProduct.id, payload as UpdateClientProductRequest);
        showToast?.('success', 'Product Updated', `Saved changes for "${formData.name}"`);
      } else {
        await clientProductApi.createProduct(payload);
        showToast?.('success', 'Product Created', `Added "${formData.name}" to products list`);
      }
      setIsModalOpen(false);
      setApiModalError(null);
      await loadProducts(undefined, undefined, true);
    } catch (err: any) {
      console.error('Save product error:', err);
      const apiErr = err?.response?.data?.error;
      const fieldMsg = apiErr?.fields?.map((f: any) => `${f.path?.join('.') || ''}: ${f.message}`).join(', ');
      const msg = fieldMsg || apiErr?.message || err?.response?.data?.message || err?.message || 'Failed to save product';
      setApiModalError(msg);
      showToast?.('error', 'Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };


  const handleViewProduct = (prod: ClientProductApiItem) => {
    setViewingProduct(prod);
    setIsViewModalOpen(true);
  };

  const handleUpdateStatus = async (prod: ClientProductApiItem, newStatus: 'Active' | 'Inactive' | 'Suspended') => {
    try {
      await clientProductApi.patchProductStatus(prod.id, { status: newStatus });
      showToast?.('success', 'Status Updated', `Product "${prod.name}" status changed to ${newStatus}`);
      await loadProducts(undefined, undefined, true);
    } catch (err: any) {
      showToast?.('error', 'Error', err?.message || 'Failed to update product status');
    }
  };

  const handleDeleteProduct = async (prod: ClientProductApiItem) => {
    try {
      await clientProductApi.deleteProduct(prod.id);
      showToast?.('success', 'Product Deleted', `Deleted "${prod.name}" from catalog`);
      await loadProducts(undefined, undefined, true);
    } catch (err: any) {
      showToast?.('error', 'Error', err?.message || 'Failed to delete product');
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200 pb-12 font-sans">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Products List
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Manage organization products, active offering suites, and configuration details.
          </p>
        </div>

        {/* Top Right Action Button: Add Product */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAddModal}
            icon={<Plus className="w-4 h-4 text-white" />}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* 2. Search Bar & Dropdown Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search products by product name, code, tagline..."
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
          <div className="flex items-center gap-2.5">
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
              Total Products :{' '}
              <span className="text-[#33077C] font-bold">{totalProducts}</span>
            </span>
          </div>
        }
      />

      {/* 3. Products Table (Strictly Requested Headers & UI matching references) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">PRODUCT AND CODE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">TOTAL PLANS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CREATED DATE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">TOTAL CLIENTS AND LEADS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-2 border-purple-200 border-t-[#33077C] rounded-full animate-spin" />
                      <span className="text-xs text-slate-500">Loading products...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    No products found matching your criteria.
                  </td>
                </tr>
              ) : (
                products.map((prod, idx) => {
                  const activePlansCount = prod.plansCount ?? prod.plans?.length ?? 0;
                  const prodIdKey = (prod.id || '').toLowerCase().trim();
                  const prodCodeKey = (prod.code || '').toLowerCase().trim();
                  const prodNameKey = (prod.name || '').toLowerCase().trim();
                  const prodCleanKey = prodNameKey.replace(/[^a-z0-9]/g, '');
                  const clientsCount =
                    clientCountsByProduct[prodIdKey] ||
                    clientCountsByProduct[prodCodeKey] ||
                    clientCountsByProduct[prodNameKey] ||
                    clientCountsByProduct[prodCleanKey] ||
                    (prod.activeSubscriptions ?? 0);
                  const leadsCount =
                    leadCountsByProduct[prodIdKey] ||
                    leadCountsByProduct[prodCodeKey] ||
                    leadCountsByProduct[prodNameKey] ||
                    leadCountsByProduct[prodCleanKey] ||
                    0;

                  // Product contact info
                  const phone = prod.supportPhone || '+91 98765 43210';
                  const whatsapp = prod.supportWhatsapp || phone;
                  const email = prod.supportEmail || 'support@yaacreations.com';

                  const initials = getProductInitials(prod);
                  const displayCode = prod.code || `PROD-${idx + 101}`;
                  const contactPerson = getProductContactPerson(prod);

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. PRODUCT AND CODE (Avatar with #33077C, bold name, product code in purple, contact person underneath) */}
                      <td className="py-4 px-5 border border-slate-200">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0 select-none">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm tracking-tight">{prod.name}</span>
                              <span className="text-xs font-semibold text-[#4309A2]">({displayCode})</span>
                            </div>
                            {contactPerson && (
                              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                                {contactPerson}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. TOTAL PLANS */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#33077C]/10 flex items-center justify-center text-[#33077C] shrink-0">
                            <Layers className="w-3.5 h-3.5 text-[#33077C]" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm">
                              {activePlansCount}
                            </span>
                            <span className="text-xs text-slate-500 ml-1">
                              {activePlansCount === 1 ? 'Plan' : 'Plans'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. STATUS (Dynamic pill with dot matching status: Active / Inactive / Suspended) */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <StatusBadge status={prod.status} />
                      </td>

                      {/* 5. CREATED DATE (Exact styling from Image 1: Bold primary date e.g. "15 Jan, 2023", light grey subtext "Active Account") */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div>
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px] block">
                            {formatCreatedDate(prod.createdAt)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                            {prod.status === 'Suspended' ? 'Suspended Account' : prod.status === 'Inactive' ? 'Inactive Account' : 'Active Account'}
                          </span>
                        </div>
                      </td>

                      {/* 6. TOTAL CLIENTS AND LEADS */}
                      <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#33077C]/10 flex items-center justify-center text-[#33077C] shrink-0">
                            <Users className="w-3.5 h-3.5 text-[#33077C]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                                {clientsCount} Clients
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="font-bold text-[#33077C] text-xs sm:text-[13px]">
                                {leadsCount} Leads
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                              Total Pipeline: {clientsCount + leadsCount}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 7. ACTIONS (3-Dots Action Menu: Edit, View, Inactive, Suspend, Delete) */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                        <div className="relative inline-block text-left" data-row-menu-trigger>
                          <button
                            type="button"
                            title="Product Actions"
                            onClick={(e) => rowMenu.toggle(e, prod.id)}
                            className="w-8 h-8 rounded-lg bg-[#33077C] hover:bg-[#432fb3] flex items-center justify-center text-white shadow-xs transition-all hover:scale-105 active:scale-95 mx-auto cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4 fill-white" />
                          </button>

                          {/* Dropdown Menu */}
                          {rowMenu.activeId === prod.id && rowMenu.pos && (
                            <div
                              data-row-menu className="fixed z-50 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 px-1.5 animate-in fade-in zoom-in-95 duration-100"
                              style={{
                                top: rowMenu.pos.top !== undefined ? `${rowMenu.pos.top}px` : undefined,
                                bottom: rowMenu.pos.bottom !== undefined ? `${rowMenu.pos.bottom}px` : undefined,
                                right: `${rowMenu.pos.right}px`,
                              }}
                            >
                              {/* 1. Edit */}
                              <button
                                type="button"
                                onClick={() => {
                                  rowMenu.close();
                                  handleOpenEditModal(prod);
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-[#3B82F6] flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  <Pencil style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                </span>
                                <span>Edit Product</span>
                              </button>

                              {/* 2. View */}
                              <button
                                type="button"
                                onClick={() => {
                                  rowMenu.close();
                                  handleViewProduct(prod);
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-[#33077C] flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  <Eye style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                </span>
                                <span>View Details</span>
                              </button>

                              {/* 3. Inactive / Active Toggle */}
                              <button
                                type="button"
                                onClick={() => {
                                  rowMenu.close();
                                  setConfirmAction({
                                    type: 'Inactive',
                                    product: prod,
                                  });
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-slate-500 flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  {prod.status === 'Inactive' ? (
                                    <CheckCircle2 style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  ) : (
                                    <Ban style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  )}
                                </span>
                                <span>{prod.status === 'Inactive' ? 'Set Active' : 'Inactive'}</span>
                              </button>

                              {/* 4. Suspend / Activate */}
                              <button
                                type="button"
                                onClick={() => {
                                  rowMenu.close();
                                  setConfirmAction({
                                    type: 'Suspend',
                                    product: prod,
                                  });
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-bold text-amber-800 hover:bg-amber-50/60 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                              >
                                <span
                                  style={{ width: '26px', height: '26px' }}
                                  className="rounded-full bg-amber-500 flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  {prod.status === 'Suspended' ? (
                                    <CheckCircle2 style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  ) : (
                                    <PauseCircle style={{ width: '13px', height: '13px' }} className="text-white stroke-[2.2]" />
                                  )}
                                </span>
                                <span>{prod.status === 'Suspended' ? 'Resume Product' : 'Suspend'}</span>
                              </button>

                              <div className="my-1 mx-2 border-t border-slate-100" />

                              {/* 5. Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  rowMenu.close();
                                  setConfirmAction({
                                    type: 'Delete',
                                    product: prod,
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

      {/* 4. Pagination */}
      <Pagination
          currentPage={page}
          total={totalProducts}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        subtitle={editingProduct ? 'Update product details' : 'Set product details'}
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsModalOpen(false)}
      >
        <form noValidate onSubmit={handleSaveProduct} className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150">

          {apiModalError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-bold block">Operation Failed</span>
                <span className="text-rose-600 break-words">{apiModalError}</span>
              </div>
            </div>
          )}

          {/* Product Fields: 3 fields per row throughout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Select Sub-Organization
              </label>
              {lockSubOrg || editingProduct ? (
                <input
                  type="text"
                  readOnly
                  disabled
                  value={
                    subOrganizations.find((s) => s.id === formData.subOrganizationId)?.name ||
                    (loadingSubOrgs ? 'Loading...' : '')
                  }
                  title="Sub-organization cannot be modified"
                  className="w-full h-11 px-4 bg-slate-100/80 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-600 cursor-not-allowed select-none outline-none"
                />
              ) : (
              <CustomSelect
                value={formData.subOrganizationId}
                onChange={(val) => {
                  setFormData({ ...formData, subOrganizationId: val, branchId: '' });
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

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Select Branch
              </label>
              {lockBranch ? (
                <input
                  type="text"
                  readOnly
                  disabled
                  value={
                    branches.find((b) => b.id === lockedBranchId)?.name ||
                    (loadingBranches ? 'Loading...' : '')
                  }
                  title="Branch cannot be modified"
                  className="w-full h-11 px-4 bg-slate-100/80 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-600 cursor-not-allowed select-none outline-none"
                />
              ) : (
              <CustomSelect
                value={formData.branchId}
                onChange={(val) => {
                  const selectedBranch = branches.find((b) => b.id === val);
                  if (selectedBranch?.subOrganizationId && !formData.subOrganizationId) {
                    setFormData({ ...formData, branchId: val, subOrganizationId: selectedBranch.subOrganizationId });
                  } else {
                    setFormData({ ...formData, branchId: val });
                  }
                  if (formErrors.branchId) setFormErrors((prev) => ({ ...prev, branchId: '' }));
                }}
                options={
                  (() => {
                    const filtered = filterBranchesForSuite<BranchApiItem>(branches, isSaleSuiteActive).filter((b) => {
                      if (!formData.subOrganizationId) return true;
                      // Main organization: only branches not attached to any sub-organization
                      if (formData.subOrganizationId === '__PARENT_ORG__') return !b.subOrganizationId;
                      return b.subOrganizationId === formData.subOrganizationId;
                    });
                    return filtered.length > 0
                      ? filtered.map((br) => ({
                          value: br.id,
                          label: `${br.name}${br.code ? ` (${br.code})` : ''}`,
                        }))
                      : [{ value: '', label: loadingBranches ? 'Loading Branches...' : 'No Branches found' }];
                  })()
                }
                optionVariant="strong"
                placeholder="Select Branch"
                error={!!formErrors.branchId}
              />
              )}
              {formErrors.branchId && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.branchId}</p>
              )}
            </div>

            <ReadOnlyField label="Product Code" value={formData.code} placeholder="Auto-generated" />

            {/* Row 2 */}
            <TextField
              label="Product / Org Name"
              required
              value={formData.name}
              error={formErrors.name}
              placeholder="Enter product / org name"
              onValueChange={(v) => updateField('name', v)}
            />

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Status <span className="text-rose-500 font-bold">*</span>
              </label>
              <CustomSelect
                value={formData.status}
                onChange={(val) => {
                  setFormData({ ...formData, status: val as '' | 'Active' | 'Inactive' | 'Suspended' });
                  if (formErrors.status) setFormErrors((prev) => ({ ...prev, status: '' }));
                }}
                options={['Active', 'Inactive', 'Suspended']}
                placeholder="Select Status"
                activeColor="brand"
                error={!!formErrors.status}
              />
              {formErrors.status && (
                <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.status}</p>
              )}
            </div>
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
              disabled={submitting}
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{editingProduct ? 'Save Changes' : 'Save'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. View Product Details Modal */}
      {viewingProduct && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Product Details"
          subtitle="View profile, contact information, and registration details"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsViewModalOpen(false)}
        >
          <div className="space-y-5">
            {/* Top Overview / Profile Header Card (Matching Reference Design) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#33077C] flex items-center justify-center text-white font-bold text-base shrink-0 shadow-xs">
                  {getProductInitials(viewingProduct)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{viewingProduct.name}</h3>
                    {viewingProduct.code && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {viewingProduct.code}
                      </span>
                    )}
                    {viewingProduct.badge && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">
                        {viewingProduct.badge}
                      </span>
                    )}
                  </div>
                  {viewingProduct.tagline && (
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{viewingProduct.tagline}</p>
                  )}
                  {viewingProduct.hqCity && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{viewingProduct.hqCity}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex sm:flex-col items-start sm:items-end gap-2 shrink-0">
                {(viewingProduct.status === 'Inactive') ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Inactive
                  </span>
                ) : (viewingProduct.status === 'Suspended') ? (
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

            {/* Two column detail cards */}
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
                  {([
                    { label: 'Organization', value: defaultOrgName },
                    {
                      label: 'Sub-Organization',
                      value:
                        subOrganizations.find(
                          (s) =>
                            s.id === viewingProduct.subOrganizationId ||
                            s.id === (viewingProduct as any).sub_organization_id
                        )?.name ||
                        (viewingProduct as any).subOrganizationName ||
                        (viewingProduct as any).sub_organization_name,
                    },
                    {
                      label: 'Branch',
                      value:
                        branches.find(
                          (b) =>
                            b.id === viewingProduct.branchId ||
                            b.id === (viewingProduct as any).branch_id
                        )?.name ||
                        (viewingProduct as any).branchName ||
                        (viewingProduct as any).branch_name ||
                        viewingProduct.branch?.name,
                    },
                    { label: 'Product / Org Code', value: viewingProduct.code },
                    { label: 'GST Number', value: viewingProduct.gstNumber },
                    { label: 'PAN Number', value: viewingProduct.panNumber },
                    { label: 'Created Date', value: formatCreatedDate(viewingProduct.createdAt) },
                    { label: 'Location / HQ City', value: viewingProduct.hqCity },
                  ] as { label: string; value?: string }[]).map(({ label, value }, idx) => (
                    <div key={label} className={`flex items-center justify-between gap-4 ${idx > 0 ? 'pt-2.5 border-t border-slate-100' : ''}`}>
                      <span className="text-slate-400 font-medium shrink-0">{label}</span>
                      <span className="font-bold text-slate-800 text-right">{value || '-'}</span>
                    </div>
                  ))}
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
                  {([
                    { label: 'Contact Person', value: viewingProduct.contactPerson },
                    { label: 'Contact Phone', value: viewingProduct.mobileNumber || viewingProduct.supportPhone },
                    { label: 'WhatsApp Number', value: viewingProduct.supportWhatsapp },
                    { label: 'Official Email', value: viewingProduct.supportEmail },
                    { label: 'Address', value: viewingProduct.address },
                  ] as { label: string; value?: string }[]).map(({ label, value }, idx) => (
                    <div key={label} className={`flex items-center justify-between gap-4 ${idx > 0 ? 'pt-2.5 border-t border-slate-100' : ''}`}>
                      <span className="text-slate-400 font-medium shrink-0">{label}</span>
                      <span className="font-bold text-slate-800 text-right break-all">{value || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 flex justify-end items-center gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Close</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEditModal(viewingProduct);
                }}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                <span>Edit Product</span>
              </button>
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
        itemTypeLabel="Product"
        itemName={confirmAction?.product.name}
        title={
          confirmAction?.type === 'Delete'
            ? 'Delete Product'
            : confirmAction?.type === 'Suspend'
              ? (confirmAction.product.status === 'Suspended' ? 'Resume Product' : 'Suspend Product')
              : (confirmAction?.product.status === 'Inactive' ? 'Activate Product' : 'Deactivate Product')
        }
        description={
          confirmAction?.type === 'Delete' ? (
            <>
              Are you sure you want to delete <span className="font-semibold text-slate-700">{confirmAction.product.name}</span>? This action cannot be undone.
            </>
          ) : confirmAction?.type === 'Suspend' ? (
            <>
              Are you sure you want to {confirmAction.product.status === 'Suspended' ? 'resume' : 'mark'} <span className="font-semibold text-slate-700">{confirmAction.product.name}</span> {confirmAction.product.status === 'Suspended' ? 'as Active' : 'as Suspended'}?
            </>
          ) : confirmAction?.type === 'Inactive' ? (
            <>
              Are you sure you want to mark <span className="font-semibold text-slate-700">{confirmAction.product.name}</span> as <span className="font-semibold text-slate-700">{confirmAction.product.status === 'Inactive' ? 'Active' : 'Inactive'}</span>?
            </>
          ) : undefined
        }
        confirmButtonText={
          confirmAction?.type === 'Delete'
            ? 'Yes, Delete'
            : confirmAction && confirmButtonLabel(confirmAction.type, confirmAction.product.status)
        }
        isLoading={isProcessingAction}
        onConfirm={async () => {
          if (!confirmAction) return;
          setIsProcessingAction(true);
          try {
            const { type, product } = confirmAction;
            await (type === 'Delete' ? handleDeleteProduct(product) : handleUpdateStatus(product, nextStatus(type, product.status)));
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
