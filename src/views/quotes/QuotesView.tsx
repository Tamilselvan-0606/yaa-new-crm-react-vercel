import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  ChevronDown,
  Eye,
  CheckCircle2,
  FileText,
  Send,
  X,
  Phone,
  MessageCircle,
  Mail,
  History,
  Pencil,
  Tag,
  Calendar,
  MoreVertical,
  Trash2,
  Printer,
  Loader2,
  Upload,
  Paperclip,
  AlertCircle,
  FileCheck,
  ArrowLeft,
  Check,
  Users,
  UsersRound,
  RefreshCw,
  Copy,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { useAuth } from '../../context/AuthContext';
import { useAppDispatch } from '../../hooks/redux';
import { EstimatePDFDocument, SellerInfo } from '../../components/quotes/EstimatePDFDocument';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { CustomerFormModal } from '../../components/forms/CustomerFormModal';
import { Pagination } from '../../components/common/Pagination';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { ConfirmationModal } from '../../utils/confirmationModal';
import {
  alphabetsOnly,
  digitsOnly,
  firstError,
  indianMobile,
  lettersOnly,
  liveMobileStartError,
  required,
} from '../../utils/fieldValidators';
import {
  quoteApi,
  baseApi,
  useGetPlatformQuotesQuery,
  organizationApi,
  subOrganizationApi,
  platformLeadApi,
  OrganizationApiItem,
  QuoteApiItem,
  CreateQuoteRequest,
  getStoredOrganizationId,
  platformClientApi,
  PlatformClientItem,
} from '../../api';
import {
  useGetDefaultSuperAdminDetailQuery,
  useGetSuperAdminDetailByIdQuery,
  useUpdateSuperAdminDetailMutation,
  getDocSuperAdminDetailId,
  getApiErrorMessage,
  type SuperAdminDetail,
  type UpdateSuperAdminDetailRequest,
} from '../../api/platform/superAdminDetailsApi';

export interface Quotation {
  id: string;
  estimateNumber: string;
  referenceNumber: string;
  quotationManualNumber?: string;
  date: string;
  expiryDate: string;
  organizationId?: string;
  subOrganizationId?: string | null;
  branchId?: string | null;
  createdScope?: string;
  customerId?: string;
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  customerPhone: string;
  customerLocation?: string;
  customerGstin?: string;
  customerPan?: string;
  productName: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED' | 'CONVERTED';
  amount: number;
  hasAttachment: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  items: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    total: number;
  }[];
}

export interface AvailableClient {
  id: string;
  name: string;
  company: string;
  /** Organization code, e.g. CO-001 (shown next to the name in the dropdown). */
  code?: string;
  contactPerson?: string;
  email: string;
  phone: string;
  location: string;
  type: 'Sub-Organization' | 'Organization' | 'Lead' | 'Customer' | 'Client';
  gstin?: string;
  pan?: string;
}

interface QuotesViewProps {
  initialCreateOpen?: boolean;
}

export const QuotesView: React.FC<QuotesViewProps> = ({ initialCreateOpen = false }) => {
  const { showToast, isSuperAdmin, isOrgSuperAdmin, currentUser } = useAuth();
  const singularTerm = 'Quotation';
  const pluralTerm = 'Quotations';
  const lowerSingularTerm = 'quotation';
  const lowerPluralTerm = 'quotations';

  // Active Organization Info
  const activeOrgId = currentUser?.organizationId || getStoredOrganizationId();
  const [activeOrgDetails, setActiveOrgDetails] = useState<OrganizationApiItem | null>(null);

  // Available real clients: Sub-Organizations, Organizations, Leads
  const [availableClients, setAvailableClients] = useState<AvailableClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Real Platform Products

  const getOrgInfo = (companyName: string) => {
    const name = (companyName || '').trim();
    if (!name) return { code: 'ORG-01', initials: 'OG', name: 'Organization' };
    const words = name.split(/\s+/);
    const initials = words.map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'OG';
    const code = `ORG-${name.slice(0, 3).toUpperCase()}`;
    return { code, initials, name };
  };

  useEffect(() => {
    let isMounted = true;

    const loadClientsAndProducts = async () => {
      const orgId = currentUser?.organizationId || getStoredOrganizationId();

      // Platform Administrator: nothing to load up front. The organization list (for the Select Organization
      // dropdown and the Organization filter) is loaded by loadOrganizationOptions when one of them opens.
      if (isSuperAdmin && !isOrgSuperAdmin) return;

      // 1. Fetch Seller Info: Check if logged in / active as Sub-Organization first, else Parent Organization
      let sellerConfigResolved = false;

      const userRole = (currentUser?.role || '').toString().toUpperCase();
      const isSubOrgUser =
        userRole === 'SUB_ORG_ADMIN' ||
        userRole === 'SUBORGADMIN' ||
        currentUser?.email?.toLowerCase().includes('suborg') ||
        (currentUser as any)?.subOrganizationId ||
        (currentUser as any)?.subOrganization?.id ||
        (currentUser as any)?.memberships?.some((m: any) => m.subOrganizationId);

      const activeSubOrgId =
        localStorage.getItem('active_sub_organization_id_sales') ||
        localStorage.getItem('active_sub_organization_id') ||
        (currentUser as any)?.subOrganizationId ||
        (currentUser as any)?.subOrganization?.id ||
        (currentUser as any)?.memberships?.[0]?.subOrganizationId;

      const activeSubOrgName =
        localStorage.getItem('active_sub_organization_sales') ||
        localStorage.getItem('active_sub_organization') ||
        (currentUser as any)?.subOrganization?.name ||
        (currentUser as any)?.subOrganizationName ||
        '';

      // Pre-fetch active parent organization details so we can fall back if sub-org lacks specific fields
      let parentOrg: any = null;
      if (orgId) {
        try {
          const orgRes = await organizationApi.getOrganizationById(orgId);
          if (isMounted && orgRes?.data) {
            parentOrg = orgRes.data;
            setActiveOrgDetails(orgRes.data);
          }
        } catch (e) {
          console.warn('Notice: Could not load parent organization details:', e);
        }
      }

      if (orgId) {
        try {
          const subRes = await subOrganizationApi.getSubOrganizations(
            { page_no: 1, page_size: 100, pagination_required: 'false' },
            orgId
          );
          if (isMounted && subRes?.data && Array.isArray(subRes.data)) {
            try {
              localStorage.setItem('active_sub_orgs_list_cache', JSON.stringify(subRes.data));
            } catch { }

            const matchedSub =
              (activeSubOrgId ? subRes.data.find((s) => s.id === activeSubOrgId) : null) ||
              (activeSubOrgName && activeSubOrgName !== 'All'
                ? subRes.data.find((s) => s.name?.toLowerCase() === activeSubOrgName.toLowerCase())
                : null) ||
              (isSubOrgUser ? subRes.data[0] : null);

            if (matchedSub && (isSubOrgUser || (activeSubOrgName && activeSubOrgName !== 'All') || activeSubOrgId)) {
              sellerConfigResolved = true;
              setQuotationFromCompany(matchedSub.name || parentOrg?.name || 'Company');
              setQuotationFromEmail(matchedSub.email || parentOrg?.email || '');
              setQuotationFromPhone(matchedSub.phone || matchedSub.whatsapp || parentOrg?.phone || '');
              setQuotationFromAddress(matchedSub.address || matchedSub.location || parentOrg?.address || '');

              const subGst =
                matchedSub.gstNumber ||
                (matchedSub as any).gstin ||
                (matchedSub as any).taxId ||
                parentOrg?.gstNumber ||
                '';
              const subPan =
                matchedSub.panNumber ||
                (matchedSub as any).pan ||
                parentOrg?.panNumber ||
                '';

              setQuotationFromGst(subGst);
              setQuotationFromPan(subPan);

              const subLogo = matchedSub.logo || (matchedSub as any)?.logoUrl || parentOrg?.logo || (parentOrg as any)?.logoUrl;
              if (subLogo) setQuotationFromLogo(subLogo);

              try {
                localStorage.setItem(
                  'active_sub_org_seller_cache',
                  JSON.stringify({
                    id: matchedSub.id,
                    name: matchedSub.name,
                    gstNumber: subGst,
                    panNumber: subPan,
                    address: matchedSub.address || matchedSub.location,
                    email: matchedSub.email,
                    phone: matchedSub.phone || matchedSub.whatsapp,
                    logo: subLogo,
                  })
                );
              } catch { }
            }
          }
        } catch (e) {
          console.warn('Notice: Could not load sub-organization seller details:', e);
        }
      }

      // If not resolved from sub-org, use active parent organization details
      if (!sellerConfigResolved && parentOrg) {
        if (parentOrg.name) setQuotationFromCompany(parentOrg.name);
        if (parentOrg.email) setQuotationFromEmail(parentOrg.email);
        if (parentOrg.phone) setQuotationFromPhone(parentOrg.phone);
        if (parentOrg.address) setQuotationFromAddress(parentOrg.address);
        setQuotationFromGst(parentOrg.gstNumber || '');
        setQuotationFromPan(parentOrg.panNumber || '');
        const orgLogo = parentOrg.logo || (parentOrg as any)?.logoUrl;
        if (orgLogo) setQuotationFromLogo(orgLogo);
      }
    };

    loadClientsAndProducts();

    const handleOrgOrSubOrgChanged = () => {
      loadClientsAndProducts();
    };

    window.addEventListener('subOrgChanged', handleOrgOrSubOrgChanged);
    window.addEventListener('orgChanged', handleOrgOrSubOrgChanged);
    window.addEventListener('storage', handleOrgOrSubOrgChanged);

    return () => {
      isMounted = false;
      window.removeEventListener('subOrgChanged', handleOrgOrSubOrgChanged);
      window.removeEventListener('orgChanged', handleOrgOrSubOrgChanged);
      window.removeEventListener('storage', handleOrgOrSubOrgChanged);
    };
  }, [isSuperAdmin, isOrgSuperAdmin, currentUser]);

  // Real backend quotes state
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to format ISO date to readable string
  const formatIsoDate = (isoStr?: string): string => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  // Map backend QuoteApiItem to UI Quotation format
  const mapApiQuoteToUi = (item: QuoteApiItem): Quotation => {
    return {
      id: item.id,
      estimateNumber: item.estimateNumber || 'EST-0000',
      referenceNumber: item.referenceNumber || '',
      quotationManualNumber: item.quotationManualNumber || '',
      date: formatIsoDate(item.date),
      expiryDate: formatIsoDate(item.expiryDate),
      organizationId: item.organizationId,
      subOrganizationId: item.subOrganizationId,
      branchId: item.branchId,
      createdScope: item.createdScope,
      customerId: item.customerId || item.organizationId,
      customerName: item.customerName || item.customerCompany || 'Client',
      customerCompany: item.customerCompany || item.customerName || 'Company',
      customerEmail: item.customerEmail || '',
      customerPhone: item.customerPhone || '',
      customerLocation: item.customerLocation || '',
      customerGstin: (item as any).customerGstin || (item as any).gstin || '',
      customerPan: (item as any).customerPan || (item as any).pan || '',
      productName: item.productName || 'Quotation',
      status: item.status,
      amount: Number(item.amount) || 0,
      hasAttachment: false,
      notes: item.notes || '',
      createdAt: formatIsoDate(item.createdAt) || formatIsoDate(item.date),
      updatedAt: formatIsoDate(item.updatedAt),
      items: (item.items || []).map((it, idx) => ({
        id: it.id || `item_${idx}`,
        description: it.title || it.description || '',
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        total: Number(it.amount) || (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
      })),
    };
  };

  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);
  const [statusDropdownPos, setStatusDropdownPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);

  const handleStatusChange = async (quoteId: string, newStatus: Quotation['status']) => {
    try {
      await quoteApi.updateQuote(quoteId, { status: newStatus as any });
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: newStatus } : q))
      );
      if (selectedQuote && selectedQuote.id === quoteId) {
        setSelectedQuote((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      showToast('success', 'Status Updated', `Quotation status updated to ${newStatus}.`);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      showToast('error', 'Status Update Failed', err?.response?.data?.error?.message || 'Could not update status');
    } finally {
      setActiveStatusDropdownId(null);
      setStatusDropdownPos(null);
    }
  };

  // Pending state - tracks what's typed/selected (not yet applied)
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState<'ALL' | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED'>('ALL');
  // Applied state - what actually drives the filter (set only on Apply)
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<'ALL' | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED'>('ALL');
  // Super Admin: organization filter to narrow documents billed to a specific organization
  const [pendingBilledOrgId, setPendingBilledOrgId] = useState<string>('');
  const [appliedBilledOrgId, setAppliedBilledOrgId] = useState<string>('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const navigate = useNavigate();
  const location = useLocation();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const selectedQuoteId = selectedQuote?.id;

  // Opening a quotation shows the list row at once, then loads the full record (GET quote by id) so the
  // page always shows the saved items, totals and status. A failed call keeps the row that is on screen.
  // The response is cached (PlatformQuote tag) and refreshed after any quote change.
  useEffect(() => {
    if (!selectedQuoteId) return;
    let cancelled = false;
    quoteApi
      .getQuoteById(selectedQuoteId)
      .then((res) => {
        if (cancelled || !res?.success || !res.data) return;
        const detail = mapApiQuoteToUi(res.data);
        setSelectedQuote((cur) => {
          if (!cur || cur.id !== detail.id) return cur;
          // never blank a field the list row already has
          const kept = Object.fromEntries(Object.entries(detail).filter(([, v]) => v !== '' && v != null));
          return { ...cur, ...kept, items: detail.items.length ? detail.items : cur.items } as Quotation;
        });
      })
      .catch(() => {
        /* keep the list data */
      });
    return () => {
      cancelled = true;
    };
  }, [selectedQuoteId]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(
    initialCreateOpen || location.pathname === '/quotes/new'
  );

  // Platform Administrator: the organization list feeds the Select Organization dropdown (form) and the
  // Organization filter (list). It is fetched the first time either one opens, then kept.
  const orgOptionsRequested = useRef(false);
  const loadOrganizationOptions = async () => {
    if (!(isSuperAdmin && !isOrgSuperAdmin) || orgOptionsRequested.current) return;
    orgOptionsRequested.current = true;
    setLoadingClients(true);
    try {
      const orgsRes = await organizationApi.getOrganizations(1, 100);
      if (orgsRes && Array.isArray(orgsRes.data)) {
        setAvailableClients(
          orgsRes.data
            .filter((o) => !!o.id)
            .map((o) => ({
              id: o.id,
              name: o.contactPerson || o.user?.name || o.name,
              company: o.name,
              code: o.code || '',
              contactPerson: o.contactPerson || o.user?.name || '',
              email: o.email || '',
              phone: o.phone || '',
              location: o.address || o.location || '',
              gstin: o.gstNumber || '',
              pan: o.panNumber || '',
              type: 'Organization',
            }))
        );
      } else {
        orgOptionsRequested.current = false; // retry on the next open
      }
    } catch (e) {
      orgOptionsRequested.current = false;
      console.warn('Notice: Could not load organizations for platform administrator:', e);
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    if (isCreateModalOpen) loadOrganizationOptions();
  }, [isCreateModalOpen]);

  // Organization / sub-organization users: the client picker only feeds the quotation form,
  // so it loads the first time the form opens (not when the quotations list opens). If the organization or
  // sub-organization changes afterwards it is refreshed.
  const formClientsRequested = useRef(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const loadFormClients = async () => {
    if (isSuperAdmin && !isOrgSuperAdmin) return;
    const orgId = currentUser?.organizationId || getStoredOrganizationId();

    setLoadingClients(true);
    const clientsMap = new Map<string, AvailableClient>();
    try {
      const clientRes = await platformClientApi.getClients({ page: 1, limit: 100, organization_id: orgId || undefined });
      if (clientRes && Array.isArray(clientRes.data)) {
        clientRes.data.forEach((c) => {
          if (!c.id) return;
          const displayName = c.name || c.legalName || c.contactPerson || 'Client';
          clientsMap.set(c.id, {
            id: c.id,
            name: c.contactPerson || displayName,
            company: displayName,
            code: (c as any).code || '',
            contactPerson: c.contactPerson || '',
            email: c.email || '',
            phone: c.phone || c.whatsapp || '',
            location: c.address || c.location || '',
            type: 'Client',
            gstin: c.gstNumber || '',
            pan: c.panNumber || '',
          });
        });
      }
    } catch (e) {
      console.warn('Failed to load clients for quotes:', e);
    }
    setAvailableClients(Array.from(clientsMap.values()));
    setLoadingClients(false);
  };

  useEffect(() => {
    if (!isCreateModalOpen || formClientsRequested.current) return;
    formClientsRequested.current = true;
    loadFormClients();
  }, [isCreateModalOpen]);

  useEffect(() => {
    const refreshIfLoaded = () => {
      if (formClientsRequested.current) loadFormClients();
    };
    window.addEventListener('subOrgChanged', refreshIfLoaded);
    window.addEventListener('orgChanged', refreshIfLoaded);
    return () => {
      window.removeEventListener('subOrgChanged', refreshIfLoaded);
      window.removeEventListener('orgChanged', refreshIfLoaded);
    };
  }, [isSuperAdmin, isOrgSuperAdmin, currentUser]);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionDropdownPos, setActionDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [isActionStatusSubmenuOpen, setIsActionStatusSubmenuOpen] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [newEstimateNumber, setNewEstimateNumber] = useState('');
  const [quotationManualNumber, setQuotationManualNumber] = useState('');
  const [duplicatedFromEstimateNo, setDuplicatedFromEstimateNo] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Table item organization dropdown state
  const [openItemOrgDropdownId, setOpenItemOrgDropdownId] = useState<string | null>(null);
  const [itemOrgDropdownRect, setItemOrgDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const itemOrgTriggerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-dropdown-btn') && !target.closest('.action-dropdown-popup')) {
        setOpenActionMenuId(null);
        setActionDropdownPos(null);
        setIsActionStatusSubmenuOpen(false);
      }
      if (!target.closest('.status-dropdown-btn') && !target.closest('.status-dropdown-popup')) {
        setActiveStatusDropdownId(null);
        setStatusDropdownPos(null);
      }
      if (!target.closest('.item-org-dropdown-trigger') && !target.closest('.item-org-dropdown-popup')) {
        setOpenItemOrgDropdownId(null);
        setItemOrgDropdownRect(null);
      }
    };
    const handleScrollOrResize = () => {
      if (openActionMenuId) {
        setOpenActionMenuId(null);
        setActionDropdownPos(null);
        setIsActionStatusSubmenuOpen(false);
      }
      if (activeStatusDropdownId) {
        setActiveStatusDropdownId(null);
        setStatusDropdownPos(null);
      }
      if (openItemOrgDropdownId) {
        setOpenItemOrgDropdownId(null);
        setItemOrgDropdownRect(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [openActionMenuId, activeStatusDropdownId, openItemOrgDropdownId]);

  // Quotations list: RTK Query hook (no result is kept after leaving the page). Anything that changes a quotation
  // invalidates the 'Quotation' tag, and the list below refetches by itself.
  const dispatch = useAppDispatch();
  const [scopeTick, setScopeTick] = useState(0); // bumps when the header's sub-org / branch selection changes

  const quoteListParams = useMemo(() => {
    const orgId = currentUser?.organizationId || getStoredOrganizationId();
    const activeSubOrgId = localStorage.getItem('active_sub_organization_id');
    const activeSubOrgName = localStorage.getItem('active_sub_organization');

    const params: any = {
      page: currentPage,
      limit: pageSize,
      search: appliedSearch.trim() || undefined,
      status: appliedStatus !== 'ALL' ? appliedStatus : undefined,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    };

    // Parameter scoping according to API spec:
    // - Super Admin: sees only documents they created. Passing organization_id narrows documents billed to that organization.
    // - Tenant logins: must pass own organization_id (outside scope returns 403).
    if (isSuperAdmin && !isOrgSuperAdmin) {
      if (appliedBilledOrgId && appliedBilledOrgId !== 'ALL') {
        params.organization_id = appliedBilledOrgId;
      }
      return params;
    }
    if (orgId) params.organization_id = orgId;
    if (activeSubOrgId && activeSubOrgName && activeSubOrgName !== 'All') {
      params.sub_organization_id = activeSubOrgId;
    }
    const activeBranchId = localStorage.getItem('active_branch_id_sales') || localStorage.getItem('active_branch_id');
    const activeBranchName = localStorage.getItem('active_branch_sales') || localStorage.getItem('active_branch');
    if (activeBranchId && activeBranchName && activeBranchName !== 'All') {
      params.branch_id = activeBranchId;
    }
    return params;
  }, [currentPage, pageSize, appliedSearch, appliedStatus, appliedBilledOrgId, scopeTick, currentUser?.organizationId, isSuperAdmin, isOrgSuperAdmin]);

  const quotesQuery = useGetPlatformQuotesQuery(quoteListParams);

  // Helper to compute the next sequential estimate number from existing quotations
  const nextPredictedEstimateNumber = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const prefix = `EST-${currentYear}-`;
    let maxSeq = 0;
    let seqLength = 4;

    const listToCheck = quotesQuery.data?.data || quotes;
    if (Array.isArray(listToCheck)) {
      listToCheck.forEach((q: any) => {
        const estNum = q.estimateNumber || '';
        if (estNum) {
          // Match patterns like EST-2026-0013 or EST-0013
          const match = estNum.match(/(?:EST-(?:\d{4}-)?)(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSeq) {
              maxSeq = num;
              seqLength = Math.max(seqLength, match[1].length);
            }
          }
        }
      });
    }

    const nextSeq = maxSeq + 1;
    return `${prefix}${String(nextSeq).padStart(seqLength, '0')}`;
  }, [quotesQuery.data?.data, quotes]);

  useEffect(() => {
    if (location.pathname === '/quotes/new') {
      setIsCreateModalOpen(true);
      if (!editingQuoteId && !newEstimateNumber && nextPredictedEstimateNumber) {
        setNewEstimateNumber(nextPredictedEstimateNumber);
      }
    } else if (location.pathname === '/quotes' && !initialCreateOpen) {
      setIsCreateModalOpen(false);
      setEditingQuoteId(null);
    }
  }, [location.pathname, initialCreateOpen, editingQuoteId, newEstimateNumber, nextPredictedEstimateNumber]);

  const handleOpenCreate = () => {
    setEditingQuoteId(null);
    setDuplicatedFromEstimateNo(null);
    setFormErrors({});
    setNewEstimateNumber(nextPredictedEstimateNumber);
    setQuotationManualNumber('');
    setItemsList([createDefaultQuoteItem()]);
    setIsCreateModalOpen(true);
    navigate('/quotes/new');
  };

  const handleCloseCreate = () => {
    setEditingQuoteId(null);
    setDuplicatedFromEstimateNo(null);
    setNewEstimateNumber('');
    setQuotationManualNumber('');
    setFormErrors({});
    setIsCreateModalOpen(false);
    navigate('/quotes');
  };
  const isLoadingQuotes = quotesQuery.isFetching;

  useEffect(() => {
    if (quotesQuery.data?.data) {
      const mapped = quotesQuery.data.data.map(mapApiQuoteToUi);
      // Sort in descending order of estimate number so highest/newest appears at the top
      mapped.sort((a, b) => {
        const parseSeq = (str?: string) => {
          const match = (str || '').match(/(?:EST-(?:\d{4}-)?)(\d+)/i);
          return match ? parseInt(match[1], 10) : 0;
        };
        const seqA = parseSeq(a.estimateNumber);
        const seqB = parseSeq(b.estimateNumber);
        if (seqA !== seqB) return seqB - seqA;
        return (b.estimateNumber || '').localeCompare(a.estimateNumber || '');
      });
      setQuotes(mapped);
      setTotalRecords(quotesQuery.data.pagination?.totalRecords ?? quotesQuery.data.data.length);
    }
  }, [quotesQuery.data]);

  useEffect(() => {
    if (!quotesQuery.isError) return;
    const err: any = quotesQuery.error;
    console.error('Failed to load quotes:', err);
    showToast('error', 'Failed to Load Quotes', err?.data?.error?.message || err?.error || 'Could not fetch quotes');
    setQuotes([]);
    setTotalRecords(0);
  }, [quotesQuery.isError]);

  /** Marks every cached quotation list stale so the visible one reloads. Used after any change and by Refresh. */
  const fetchQuotes = () => {
    dispatch(baseApi.util.invalidateTags([{ type: 'PlatformQuote', id: 'LIST' }]));
  };

  useEffect(() => {
    const handleFilterChange = () => {
      setCurrentPage(1);
      setScopeTick((t) => t + 1);
    };
    window.addEventListener('subOrgChanged', handleFilterChange);
    window.addEventListener('branchChanged', handleFilterChange);
    return () => {
      window.removeEventListener('subOrgChanged', handleFilterChange);
      window.removeEventListener('branchChanged', handleFilterChange);
    };
  }, []);

  const handleSearchChange = (val: string) => {
    setPendingSearch(val);
  };

  const handleStatusFilter = (status: 'ALL' | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED') => {
    setPendingStatus(status);
  };

  const handleApply = () => {
    setAppliedSearch(pendingSearch);
    setAppliedStatus(pendingStatus);
    setAppliedBilledOrgId(pendingBilledOrgId);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setPendingSearch('');
    setPendingStatus('ALL');
    setPendingBilledOrgId('');
    setAppliedSearch('');
    setAppliedStatus('ALL');
    setAppliedBilledOrgId('');
    setCurrentPage(1);
  };

  const handlePrintEstimatePdf = async (quoteToPrint: Quotation) => {
    try {
      setIsGeneratingPdf(true);
      showToast('info', 'Generating PDF', `Preparing PDF for ${singularTerm} #${quoteToPrint.estimateNumber}...`);

      const docTitle = singularTerm;
      const blob = await pdf(
        <EstimatePDFDocument
          quotation={quoteToPrint}
          documentTitle={docTitle}
          sellerDetails={getSellerDetails(quoteToPrint)}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);

      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.focus();
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${singularTerm}-${quoteToPrint.estimateNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      showToast('success', 'PDF Ready', `${singularTerm} #${quoteToPrint.estimateNumber} PDF generated successfully.`);
    } catch (err) {
      console.error('Failed to generate estimate PDF:', err);
      showToast('error', 'PDF Error', `Failed to generate PDF ${lowerSingularTerm}.`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // New estimate modal form states linked to actual application entities
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isCompanyProductDropdownOpen, setIsCompanyProductDropdownOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const companyProductDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (companyProductDropdownRef.current && !companyProductDropdownRef.current.contains(e.target as Node)) {
        setIsCompanyProductDropdownOpen(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsCompanyProductDropdownOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (productSuiteDropdownRef.current && !productSuiteDropdownRef.current.contains(e.target as Node)) {
        setIsProductSuiteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerLocation, setCustomerLocation] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstId, setCustomerGstId] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Confirmation Modal State for Delete
  const [deleteQuoteConfirm, setDeleteQuoteConfirm] = useState<{ id: string; estimateNumber: string } | null>(null);
  const [isDeletingQuote, setIsDeletingQuote] = useState(false);

  // Quotation From (seller) details
  const [quotationFromCompany, setQuotationFromCompany] = useState(() => (isSuperAdmin && !isOrgSuperAdmin ? 'Yaa Creations' : ''));
  const [quotationFromLogo, setQuotationFromLogo] = useState(() => (isSuperAdmin && !isOrgSuperAdmin ? '/yaa-creations-logo.png' : ''));
  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  const [quotationFromGst, setQuotationFromGst] = useState(() => (isSuperAdmin && !isOrgSuperAdmin ? '27AABCA1234F1Z8' : ''));
  const [quotationFromPhone, setQuotationFromPhone] = useState(() => (isSuperAdmin && !isOrgSuperAdmin ? '+91 98765 43210' : ''));
  const [quotationFromEmail, setQuotationFromEmail] = useState(() => (isSuperAdmin && !isOrgSuperAdmin ? 'billing@yaacreations.com' : ''));
  const [quotationFromAddress, setQuotationFromAddress] = useState(() => (isSuperAdmin && !isOrgSuperAdmin ? 'No.108 Marutham Paradise Apartment, Urapakkam, Chennai,' : ''));
  const [isEditingFrom, setIsEditingFrom] = useState(false);
  const [quotationFromPan, setQuotationFromPan] = useState(() => (isSuperAdmin && !isOrgSuperAdmin ? 'ABCDE1234F' : ''));

  // Platform administrator: seller ("Sale Configuration" / "Billing From") details come from the company-details API
  // (RTK Query, tag SuperAdminDetail). Fetched only while the new/edit quotation form or a quotation view is open.
  const isPlatformAdmin = isSuperAdmin && !isOrgSuperAdmin;
  const [isSavingSeller, setIsSavingSeller] = useState(false);
  const [updateSuperAdminDetail] = useUpdateSuperAdminDetailMutation();
  const needsSellerDetail = isPlatformAdmin && (isCreateModalOpen || !!selectedQuote);
  const defaultSellerQuery = useGetDefaultSuperAdminDetailQuery(undefined, { skip: !needsSellerDetail });
  const viewDocSellerId = getDocSuperAdminDetailId(selectedQuote);
  const viewSellerByIdQuery = useGetSuperAdminDetailByIdQuery(viewDocSellerId, {
    skip: !isPlatformAdmin || !selectedQuote || !viewDocSellerId,
  });
  const defaultSeller: SuperAdminDetail | undefined = defaultSellerQuery.data?.data;
  const superAdminDetailId = defaultSeller?.id || null;

  const applySuperAdminDetail = (d: SuperAdminDetail) => {
    setQuotationFromCompany(d.companyName || '');
    setQuotationFromGst(d.gstNumber || '');
    setQuotationFromPan(d.panNumber || '');
    setQuotationFromPhone(d.phoneNumber || '');
    setQuotationFromEmail(d.email || '');
    setQuotationFromAddress(d.address || '');
    if (d.logoUrl) setQuotationFromLogo(d.logoUrl);
  };

  // Fill the form card whenever the cached default company changes (first load, or after an update)
  useEffect(() => {
    if (defaultSeller) applySuperAdminDetail(defaultSeller);
  }, [defaultSeller]);

  // Quotation view ("Billing From"): the document's company, otherwise the default one
  const viewSellerDetail: SuperAdminDetail | undefined = viewSellerByIdQuery.data?.data || defaultSeller;
  const viewSeller: (SellerInfo & { logo?: string }) | null =
    isPlatformAdmin && selectedQuote && viewSellerDetail
      ? {
          name: viewSellerDetail.companyName || '',
          taxId: viewSellerDetail.gstNumber || undefined,
          pan: viewSellerDetail.panNumber || undefined,
          phone: viewSellerDetail.phoneNumber || undefined,
          email: viewSellerDetail.email || undefined,
          address: viewSellerDetail.address || undefined,
          logo: viewSellerDetail.logoUrl || undefined,
        }
      : null;

  const saveSuperAdminSeller = async (): Promise<boolean> => {
    if (!isPlatformAdmin || !superAdminDetailId) return true;
    setIsSavingSeller(true);
    try {
      const payload: UpdateSuperAdminDetailRequest = {
        companyName: quotationFromCompany.trim(),
        gstNumber: quotationFromGst.trim(),
        panNumber: quotationFromPan.trim(),
        phoneNumber: quotationFromPhone.trim(),
        email: quotationFromEmail.trim(),
        address: quotationFromAddress.trim(),
      };
      if (quotationFromLogo.startsWith('data:')) payload.logoUrl = quotationFromLogo;
      await updateSuperAdminDetail({ id: superAdminDetailId, payload }).unwrap();
      showToast('success', 'Company Details Updated', 'Sale configuration saved successfully.');
      return true;
    } catch (e) {
      showToast('error', 'Update Failed', getApiErrorMessage(e, 'Could not update company details.'));
      return false;
    } finally {
      setIsSavingSeller(false);
    }
  };

  const getSellerDetails = (quote?: Quotation): SellerInfo => {
    if (isPlatformAdmin && viewSeller && quote && quote.id === selectedQuote?.id) return viewSeller;
    let cachedSubOrgList: any[] = [];
    try {
      const rawList = localStorage.getItem('active_sub_orgs_list_cache');
      if (rawList) cachedSubOrgList = JSON.parse(rawList);
    } catch { }

    let matchedSubOrg: any = null;
    if (quote?.subOrganizationId && Array.isArray(cachedSubOrgList)) {
      matchedSubOrg = cachedSubOrgList.find((s) => s.id === quote.subOrganizationId);
    }

    if (!matchedSubOrg && (quote?.createdScope === 'SUB_ORGANIZATION' || !quote)) {
      try {
        const rawSub = localStorage.getItem('active_sub_org_seller_cache');
        if (rawSub) matchedSubOrg = JSON.parse(rawSub);
      } catch { }
    }

    let cachedOrg: any = null;
    try {
      const rawOrg = localStorage.getItem('active_org_seller_cache');
      if (rawOrg) cachedOrg = JSON.parse(rawOrg);
    } catch { }

    if (matchedSubOrg && (quote?.subOrganizationId || quote?.createdScope === 'SUB_ORGANIZATION' || !quote)) {
      return {
        name: matchedSubOrg.name || matchedSubOrg.legalName || quotationFromCompany || activeOrgDetails?.name || '',
        taxId: matchedSubOrg.gstNumber || matchedSubOrg.gstin || matchedSubOrg.taxId || quotationFromGst || activeOrgDetails?.gstNumber || undefined,
        pan: matchedSubOrg.panNumber || matchedSubOrg.pan || quotationFromPan || activeOrgDetails?.panNumber || undefined,
        phone: matchedSubOrg.phone || matchedSubOrg.whatsapp || quotationFromPhone || activeOrgDetails?.phone || undefined,
        email: matchedSubOrg.email || quotationFromEmail || activeOrgDetails?.email || undefined,
        address: matchedSubOrg.address || matchedSubOrg.location || quotationFromAddress || activeOrgDetails?.address || undefined,
      };
    }

    return {
      name: cachedOrg?.name || cachedOrg?.legalName || quotationFromCompany || activeOrgDetails?.name || 'Company Name',
      taxId: cachedOrg?.gstNumber || cachedOrg?.gstin || cachedOrg?.taxId || quotationFromGst || activeOrgDetails?.gstNumber || undefined,
      pan: cachedOrg?.panNumber || cachedOrg?.pan || quotationFromPan || activeOrgDetails?.panNumber || undefined,
      phone: cachedOrg?.phone || cachedOrg?.whatsapp || quotationFromPhone || activeOrgDetails?.phone || undefined,
      email: cachedOrg?.email || quotationFromEmail || activeOrgDetails?.email || undefined,
      address: cachedOrg?.address || cachedOrg?.location || quotationFromAddress || activeOrgDetails?.address || undefined,
    };
  };
  const [selectedProductSuiteName, setSelectedProductSuiteName] = useState('Yaa connect');
  const [isProductSuiteDropdownOpen, setIsProductSuiteDropdownOpen] = useState(false);
  const productSuiteDropdownRef = useRef<HTMLDivElement>(null);
  const [customerPan, setCustomerPan] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setQuotationFromLogo(event.target.result as string);
          showToast('success', 'Logo Updated', 'Company logo updated successfully.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Dynamic Custom Quotation Fields
  const [customQuoteFields, setCustomQuoteFields] = useState<Array<{
    id: string;
    label: string;
    value: string;
    type: 'text' | 'date' | 'textarea';
  }>>([]);
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Date helpers for DD/MM/YYYY format with HTML date pickers
  const formatDateToDDMMYYYY = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const ddmmyyyyToIso = (val: string): string => {
    if (!val) return '';
    const parts = val.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return val;
  };

  const isoToDdmmyyyy = (val: string): string => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
    return val;
  };

  // Date, expiry, project name in DD/MM/YYYY format
  const [estimateDate, setEstimateDate] = useState(() => formatDateToDDMMYYYY(new Date()));
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatDateToDDMMYYYY(d);
  });
  const [createdDate, setCreatedDate] = useState(() => formatDateToDDMMYYYY(new Date()));
  const [projectName, setProjectName] = useState(() => (isSuperAdmin ? '' : 'Yaa connect'));

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Dynamic Itemized Table state matching reference image
  interface FormItem {
    id: string;
    description: string;
    subDescription?: string;
    hsnCode?: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    discount: number; // discount amount in ₹
    discountType?: 'percent' | 'amount';
    taxPercent?: number;
    total: number;
  }

  const createDefaultQuoteItem = (): FormItem => ({
    id: `item_${Date.now()}`,
    description: '',
    subDescription: '',
    hsnCode: '',
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0,
    discount: 0,
    discountType: 'amount',
    taxPercent: 18,
    total: 0,
  });

  const [itemsList, setItemsList] = useState<FormItem[]>([createDefaultQuoteItem()]);

  const [newNotes, setNewNotes] = useState('');

  // The client dropdown shows the client name (organizations keep showing the company name).
  const selectedClientLabel = (() => {
    const c = availableClients.find((x) => x.id === selectedClientId);
    if (!c) return '';
    return isSuperAdmin && !isOrgSuperAdmin ? c.company || c.name : c.name || c.company;
  })();

  // Handle client selection with automatic address and details population
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = availableClients.find((c) => c.id === clientId);
    if (client) {
      setCustomerName(client.contactPerson || client.name || '');
      setCustomerCompany(client.company || '');
      setCustomerLocation(client.location || '');
      setCustomerEmail(client.email || '');
      setCustomerPhone(client.phone || '');
      setCustomerGstId(client.gstin || '');
      setCustomerPan(client.pan || '');
    } else {
      setCustomerName('');
      setCustomerCompany('');
      setCustomerLocation('');
      setCustomerEmail('');
      setCustomerPhone('');
      setCustomerGstId('');
      setCustomerPan('');
    }
  };

  // Item table manipulation helpers
  const handleAddItem = () => {
    const newItem: FormItem = {
      id: `item_${Date.now()}`,
      description: '',
      subDescription: '',
      hsnCode: '',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      discount: 0,
      discountType: 'amount',
      taxPercent: 18,
      total: 0,
    };
    setItemsList([...itemsList, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItemsList(itemsList.filter((it) => it.id !== id));
  };

  const handleItemChange = (
    id: string,
    field: keyof FormItem,
    value: string | number
  ) => {
    setItemsList((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        const qty = Math.max(0, Number(updated.quantity) || 0);
        const rate = Math.max(0, Number(updated.unitPrice) || 0);
        const gross = qty * rate;

        let activeMode: 'percent' | 'amount' = updated.discountType || 'amount';

        if (field === 'discountPercent') {
          activeMode = 'percent';
          updated.discountType = 'percent';
          const p = Math.max(0, Math.min(100, Number(value) || 0));
          updated.discountPercent = p;
          updated.discount = 0; // Clear direct amount when percentage is entered
        } else if (field === 'discount') {
          activeMode = 'amount';
          updated.discountType = 'amount';
          const a = Math.max(0, Math.min(gross, Number(value) || 0));
          updated.discount = a;
          updated.discountPercent = 0; // Clear percentage when direct amount is entered
        }

        // Calculate actual discount applied
        let effectiveDiscAmt = 0;
        if (activeMode === 'percent') {
          const p = Number(updated.discountPercent) || 0;
          effectiveDiscAmt = gross > 0 && p > 0 ? parseFloat(((gross * p) / 100).toFixed(2)) : 0;
        } else {
          effectiveDiscAmt = Math.min(gross, Number(updated.discount) || 0);
        }

        const taxRate = Number(updated.taxPercent) || 0;
        const taxable = Math.max(0, gross - effectiveDiscAmt);
        const taxAmount = (taxable * taxRate) / 100;
        const lineTotal = taxable + taxAmount;
        return {
          ...updated,
          total: lineTotal,
        };
      })
    );
  };

  // Helper to get effective discount amount of a line item
  const getItemDiscountAmount = (it: FormItem): number => {
    const gross = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
    if (it.discountType === 'percent') {
      const p = Number(it.discountPercent) || 0;
      return gross > 0 && p > 0 ? parseFloat(((gross * p) / 100).toFixed(2)) : 0;
    }
    return Math.min(gross, Number(it.discount) || 0);
  };

  // Real item calculations
  const subTotal = itemsList.reduce((sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0);
  const totalDiscount = itemsList.reduce((sum, it) => sum + getItemDiscountAmount(it), 0);
  const taxableSubtotal = Math.max(0, subTotal - totalDiscount);
  const totalTax = itemsList.reduce((sum, it) => {
    const gross = (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0);
    const lineTaxable = Math.max(0, gross - getItemDiscountAmount(it));
    return sum + (lineTaxable * (Number(it.taxPercent) || 0)) / 100;
  }, 0);
  const grandTotal = taxableSubtotal + totalTax;

  const pagedQuotes = quotes;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(quotes.map((q) => q.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const populateQuoteForm = (quote: Quotation, isEditMode: boolean) => {
    setFormErrors({});
    if (isEditMode) {
      setEditingQuoteId(quote.id);
      setDuplicatedFromEstimateNo(null);
      setNewEstimateNumber(quote.estimateNumber);
      setQuotationManualNumber(quote.quotationManualNumber || '');
    } else {
      setEditingQuoteId(null);
      setDuplicatedFromEstimateNo(quote.estimateNumber || null);
      setNewEstimateNumber('');
      setQuotationManualNumber('');
    }

    if (quote.customerId) {
      setSelectedClientId(quote.customerId);
    } else {
      const matched = availableClients.find(
        (c) =>
          (quote.customerCompany && c.company.toLowerCase() === quote.customerCompany.toLowerCase()) ||
          (quote.customerName && c.name.toLowerCase() === quote.customerName.toLowerCase())
      );
      setSelectedClientId(matched ? matched.id : '');
    }

    setCustomerName(quote.customerName || '');
    setCustomerCompany(quote.customerCompany || '');
    setCustomerLocation(quote.customerLocation || '');
    setCustomerEmail(quote.customerEmail || '');
    setCustomerPhone(quote.customerPhone || '');
    setCustomerGstId(quote.customerGstin || '');
    setCustomerPan(quote.customerPan || '');
    setClientSearchQuery(quote.customerCompany || quote.customerName || '');

    if (quote.date) {
      try {
        const d = new Date(quote.date);
        setEstimateDate(isNaN(d.getTime()) ? (quote.date.includes('/') ? quote.date : formatDateToDDMMYYYY(new Date())) : formatDateToDDMMYYYY(d));
      } catch {
        setEstimateDate(formatDateToDDMMYYYY(new Date()));
      }
    } else {
      setEstimateDate(formatDateToDDMMYYYY(new Date()));
    }

    if (quote.createdAt || quote.date) {
      try {
        const d = new Date(quote.createdAt || quote.date);
        setCreatedDate(isNaN(d.getTime()) ? formatDateToDDMMYYYY(new Date()) : formatDateToDDMMYYYY(d));
      } catch {
        setCreatedDate(formatDateToDDMMYYYY(new Date()));
      }
    } else {
      setCreatedDate(formatDateToDDMMYYYY(new Date()));
    }

    if (quote.expiryDate) {
      try {
        const d = new Date(quote.expiryDate);
        setExpiryDate(isNaN(d.getTime()) ? (quote.expiryDate.includes('/') ? quote.expiryDate : formatDateToDDMMYYYY(new Date())) : formatDateToDDMMYYYY(d));
      } catch {
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        setExpiryDate(formatDateToDDMMYYYY(nextMonth));
      }
    } else {
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      setExpiryDate(formatDateToDDMMYYYY(nextMonth));
    }

    setProjectName(quote.productName || 'Yaa connect');
    setSelectedProductSuiteName(quote.productName || 'Yaa connect');
    setNewNotes(quote.notes || '');

    if (quote.items && quote.items.length > 0) {
      setItemsList(
        quote.items.map((it, idx) => {
          const qty = Number(it.quantity) || 1;
          const price = Number(it.unitPrice) || 0;
          const gross = qty * price;
          const disc = Number(it.discount) || 0;
          const discPct = gross > 0 && disc > 0 ? parseFloat(((disc / gross) * 100).toFixed(2)) : 0;
          return {
            id: it.id || `item_${Date.now()}_${idx}`,
            description: it.description || '',
            subDescription: '',
            hsnCode: '',
            quantity: qty,
            unitPrice: price,
            discountPercent: discPct,
            discount: disc,
            taxPercent: 18,
            total: Number(it.total) || (qty * price - disc),
          };
        })
      );
    } else {
      setItemsList([]);
    }

    setIsCreateModalOpen(true);
    navigate('/quotes/new');
  };

  const handleEditQuote = (quote: Quotation) => {
    populateQuoteForm(quote, true);
  };

  const handleDuplicateQuote = (quote: Quotation) => {
    populateQuoteForm(quote, false);
    showToast('info', 'Quotation Duplicated', `Created a copy of #${quote.estimateNumber}. Ready for editing and saving.`);
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSuperAdmin && !isOrgSuperAdmin) {
      if (!selectedClientId) {
        showToast('error', 'Select Organization', 'Please select an organization.');
        return;
      }
      if (!createdDate.trim()) {
        showToast('error', 'Created Date Required', 'Please provide a created date.');
        return;
      }
      if (!estimateDate.trim()) {
        showToast('error', 'Quotation Date Required', 'Please provide a quotation date.');
        return;
      }
      if (!expiryDate.trim()) {
        showToast('error', 'Due Date Required', 'Please provide a due date.');
        return;
      }
    } else {
      if (!customerName.trim() && !customerCompany.trim()) {
        showToast('error', 'Select Client / Customer', 'Please select or enter a client company name.');
        return;
      }
      if (!createdDate.trim()) {
        showToast('error', 'Created Date Required', 'Please provide a created date.');
        return;
      }
      if (!estimateDate.trim()) {
        showToast('error', 'Quotation Date Required', 'Please provide a quotation date.');
        return;
      }
      if (!expiryDate.trim()) {
        showToast('error', 'Due Date Required', 'Please provide a due date.');
        return;
      }
    }

    if (itemsList.length === 0) {
      showToast('error', 'Add Items', 'Please add at least one line item.');
      return;
    }
    if (itemsList.some((it) => !it.description.trim())) {
      showToast('error', 'Missing Item Title', 'Please enter a title for every line item.');
      return;
    }

    // Determine target customerId UUID matching a valid organization or sub-organization in DB
    const orgId = currentUser?.organizationId || getStoredOrganizationId();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let targetCustomerId = selectedClientId;

    if (!targetCustomerId || !uuidRegex.test(targetCustomerId)) {
      const matchedClient = availableClients.find(
        (c) =>
          uuidRegex.test(c.id) &&
          (c.company.trim().toLowerCase() === customerCompany.trim().toLowerCase() ||
            c.name.trim().toLowerCase() === customerName.trim().toLowerCase())
      );
      if (matchedClient) {
        targetCustomerId = matchedClient.id;
      } else if (orgId && uuidRegex.test(orgId)) {
        targetCustomerId = orgId;
      }
    }

    if (!targetCustomerId || !uuidRegex.test(targetCustomerId)) {
      showToast('error', 'Select Customer / Organization', 'Please select a valid customer organization from the dropdown.');
      return;
    }

    const activeSubOrgId = localStorage.getItem('active_sub_organization_id');
    const activeSubOrgName = localStorage.getItem('active_sub_organization');
    const activeBranchId = localStorage.getItem('active_branch_id_sales') || localStorage.getItem('active_branch_id');
    const activeBranchName = localStorage.getItem('active_branch_sales') || localStorage.getItem('active_branch');

    const formattedItems = itemsList.map((it) => ({
      title: it.description.trim(),
      description: it.subDescription?.trim() || undefined,
      quantity: Math.max(1, Number(it.quantity) || 1),
      unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      taxRate: Number(it.taxPercent) || 18,
    }));

    try {
      setIsSubmitting(true);

      if (editingQuoteId) {
        // Edit existing quote
        const updatePayload = {
          quotationManualNumber: quotationManualNumber.trim() || undefined,
          createdDate: createdDate ? ddmmyyyyToIso(createdDate) : undefined,
          date: estimateDate ? ddmmyyyyToIso(estimateDate) : new Date().toISOString().split('T')[0],
          expiryDate: expiryDate ? ddmmyyyyToIso(expiryDate) : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          productName: (projectName || selectedProductSuiteName || 'Quotation').trim(),
          discountAmount: totalDiscount > 0 ? totalDiscount : undefined,
          notes: newNotes.trim() || undefined,
          termsAndConditions: 'Valid for 30 days',
          items: formattedItems,
        };

        const res = await quoteApi.updateQuote(editingQuoteId, updatePayload);
        if (res && res.data) {
          showToast('success', `${singularTerm} Updated`, `${singularTerm} #${res.data.estimateNumber || newEstimateNumber} updated successfully.`);
          handleCloseCreate();

          // Reset Form
          setEditingQuoteId(null);
          setNewEstimateNumber('');
          setSelectedClientId('');
          setCustomerName('');
          setCustomerCompany('');
          setCustomerLocation('');
          setCustomerEmail('');
          setCustomerPhone('');
          setCustomerGstId('');
          setCustomerPan('');
          setClientSearchQuery('');
          setUploadedFile(null);
          setEstimateDate(formatDateToDDMMYYYY(new Date()));
          const nextMonth = new Date();
          nextMonth.setDate(nextMonth.getDate() + 30);
          setExpiryDate(formatDateToDDMMYYYY(nextMonth));
          setNewNotes('');
          setItemsList([]);

          fetchQuotes();
        }
      } else {
        // Create new quote (or duplicate)
        const payload: CreateQuoteRequest = {
          estimateNumber: newEstimateNumber.trim() || undefined,
          quotationManualNumber: quotationManualNumber.trim() || undefined,
          createdDate: createdDate ? ddmmyyyyToIso(createdDate) : undefined,
          date: estimateDate ? ddmmyyyyToIso(estimateDate) : new Date().toISOString().split('T')[0],
          expiryDate: expiryDate ? ddmmyyyyToIso(expiryDate) : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          organizationId: orgId || undefined,
          subOrganizationId: (activeSubOrgId && activeSubOrgName && activeSubOrgName !== 'All') ? activeSubOrgId : undefined,
          branchId: (activeBranchId && activeBranchName && activeBranchName !== 'All') ? activeBranchId : undefined,
          customerId: targetCustomerId,
          productName: (projectName || selectedProductSuiteName || 'Quotation').trim(),
          discountAmount: totalDiscount > 0 ? totalDiscount : undefined,
          notes: newNotes.trim() || undefined,
          termsAndConditions: 'Valid for 30 days',
          items: formattedItems,
        };

        const res = await quoteApi.createQuote(payload);
        if (res && res.data) {
          showToast('success', `${singularTerm} Created`, `${singularTerm} #${res.data.estimateNumber || newEstimateNumber} created successfully.`);
          handleCloseCreate();

          // Reset Form
          setEditingQuoteId(null);
          setNewEstimateNumber('');
          setSelectedClientId('');
          setCustomerName('');
          setCustomerCompany('');
          setCustomerLocation('');
          setCustomerEmail('');
          setCustomerPhone('');
          setCustomerGstId('');
          setCustomerPan('');
          setClientSearchQuery('');
          setUploadedFile(null);
          setEstimateDate(formatDateToDDMMYYYY(new Date()));
          const nextMonth = new Date();
          nextMonth.setDate(nextMonth.getDate() + 30);
          setExpiryDate(formatDateToDDMMYYYY(nextMonth));
          setNewNotes('');
          setItemsList([]);

          fetchQuotes();
        }
      }
    } catch (err: any) {
      console.error('Failed to save quote:', err);
      showToast('error', editingQuoteId ? 'Update Failed' : 'Creation Failed', err?.response?.data?.error?.message || 'Could not save quote.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => quoteApi.deleteQuote(id)));
      showToast('info', `Deleted ${pluralTerm}`, `Selected ${lowerPluralTerm} have been removed.`);
      setSelectedIds([]);
      fetchQuotes();
    } catch (err: any) {
      console.error('Failed to delete selected quotes:', err);
      showToast('error', 'Delete Failed', err?.response?.data?.error?.message || 'Could not delete selected quotes.');
    }
  };

  const getStatusBadge = (status: Quotation['status']) => {
    const s = (status || '').toUpperCase();
    let dotColor = 'bg-[#94a3b8]';
    let label = 'Draft';

    if (s === 'ACCEPTED') {
      dotColor = 'bg-[#10b981]';
      label = 'Accepted';
    } else if (s === 'SENT') {
      dotColor = 'bg-[#33077C]';
      label = 'Sent';
    } else if (s === 'EXPIRED') {
      dotColor = 'bg-[#f59e0b]';
      label = 'Expired';
    } else if (s === 'DECLINED') {
      dotColor = 'bg-[#f43f5e]';
      label = 'Declined';
    } else if (s === 'CONVERTED') {
      dotColor = 'bg-[#8b5cf6]';
      label = 'Converted';
    } else {
      dotColor = 'bg-[#94a3b8]';
      label = 'Draft';
    }

    return (
      <div className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-800 select-none">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <span className="text-xs font-semibold text-slate-800 tracking-tight">{label}</span>
      </div>
    );
  };

  // =========================================================================
  // FULL PAGE QUOTATION DETAIL VIEW (Matching Invoice Detail View Layout)
  // =========================================================================
  if (selectedQuote) {
    const activeQuote = selectedQuote;

    // Calculate totals matching invoice breakdown
    const rawSubtotal = activeQuote.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const rawDiscount = activeQuote.items.reduce((acc, item) => acc + (item.discount || 0), 0);
    const taxableSubtotal = Math.max(0, rawSubtotal - rawDiscount);
    const taxTotal = taxableSubtotal * 0.18; // Standard 18% GST matching invoice
    const halfTax = taxTotal / 2;
    const computedGrandTotal = taxableSubtotal + taxTotal;

    const previewSellerDetails = getSellerDetails(activeQuote);

    const handlePrintQuotePdf = async () => {
      try {
        setIsGeneratingPdf(true);
        const blob = await pdf(
          <EstimatePDFDocument
            quotation={activeQuote}
            documentTitle={singularTerm}
            sellerDetails={previewSellerDetails}
          />
        ).toBlob();
        const url = URL.createObjectURL(blob);

        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          const link = document.createElement('a');
          link.href = url;
          link.download = `${singularTerm}-${activeQuote.estimateNumber}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        showToast('success', 'PDF Generated', `Real PDF for #${activeQuote.estimateNumber} generated successfully.`);
      } catch (err) {
        console.error('Failed to generate PDF with @react-pdf/renderer:', err);
        showToast('error', 'PDF Generation Error', 'Could not generate PDF. Please check console.');
      } finally {
        setIsGeneratingPdf(false);
      }
    };

    return (
      <div className="space-y-6 print:space-y-4">
        {/* Top Full-Page Navigation & Actions Bar (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#33077C] px-6 py-4 rounded-2xl shadow-md text-white print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedQuote(null)}
              className="inline-flex items-center justify-center gap-2 h-10 px-4.5 bg-white text-[#33077C] hover:bg-slate-100 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
              <span>Back</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handlePrintQuotePdf}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-white text-[#33077C] hover:bg-slate-100 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#33077C]" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-[#33077C]" />
                  <span>Print {singularTerm}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Full-Width Document Canvas (Printable Target) */}
        <div className="invoice-printable-document max-w-5xl mx-auto w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-12 space-y-8 print:p-0 print:border-none print:shadow-none print:space-y-6">
          {/* 1. Top Title */}
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {singularTerm}
            </h2>
          </div>

          {/* 2. Top Header Ribbon (Quotation Details on Left, Company Branding on Right) */}
          <div className="invoice-ribbon-header bg-white text-slate-900 flex flex-col-reverse sm:flex-row sm:items-start justify-between gap-6 break-inside-avoid print:flex-row pb-2">
            {/* Left: Quotation Number, Date & Reference Details */}
            <div className="text-left space-y-1.5 text-xs sm:text-sm shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium w-36">{singularTerm} Serial Number:</span>
                <span className="font-bold text-slate-900">{activeQuote.estimateNumber}</span>
              </div>
              {activeQuote.quotationManualNumber && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium w-36">{singularTerm} Number:</span>
                  <span className="font-bold text-slate-900">{activeQuote.quotationManualNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium w-36">{singularTerm} Date:</span>
                <span className="font-semibold text-slate-800">{activeQuote.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium w-36">Due Date:</span>
                <span className="font-semibold text-slate-800">{activeQuote.expiryDate}</span>
              </div>
            </div>

            {/* Right: Company Logo */}
            <div className="flex items-center sm:justify-end print:justify-end gap-4 min-w-0 flex-1">
              <img
                src={(isPlatformAdmin && viewSeller?.logo) || quotationFromLogo || activeOrgDetails?.logo || "/yaa-creations-logo.png"}
                alt={previewSellerDetails.name || quotationFromCompany || activeOrgDetails?.name || "Company Logo"}
                className="h-16 sm:h-20 object-contain max-w-[280px]"
              />
            </div>
          </div>

          {/* 3. Dotted Divider */}
          <div className="border-b border-dashed border-slate-300 pt-1" />

          {/* 4. Two-Column Billing From & Bill To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-1 break-inside-avoid">
            {/* Left: Billing From (Seller) */}
            <div className="space-y-2.5 text-xs sm:text-sm">
              <h3 className="text-base font-bold text-[#33077C] pb-1.5 border-b border-slate-100">
                Billing From:
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Company Name</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{previewSellerDetails.name || '-'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>GSTIN / Tax ID</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{previewSellerDetails.taxId || '-'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>PAN Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{previewSellerDetails.pan || '-'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Phone Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{previewSellerDetails.phone || '-'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Email</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{previewSellerDetails.email || '-'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Company Address</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{previewSellerDetails.address || '-'}</span>
                </div>
              </div>
            </div>

            {/* Right: Bill To (Client) */}
            <div className="space-y-2.5 text-xs sm:text-sm">
              <h3 className="text-base font-bold text-[#33077C] pb-1.5 border-b border-slate-100">
                Billing To:
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Company Name</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeQuote.customerCompany || activeQuote.customerName || '-'}</span>
                </div>
                {activeQuote.customerName && activeQuote.customerCompany && activeQuote.customerName !== activeQuote.customerCompany && (
                  <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                    <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                      <span>Contact Person</span>
                      <span>:</span>
                    </span>
                    <span className="text-slate-700 flex-1">{activeQuote.customerName}</span>
                  </div>
                )}
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>GSTIN / Tax ID</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeQuote.customerGstin || '-'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>PAN Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeQuote.customerPan || '-'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Phone Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeQuote.customerPhone || '-'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Email</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeQuote.customerEmail || '-'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Address / Location</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeQuote.customerLocation || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Service Details / Line Items Table */}
          <div className="space-y-3 pt-2 break-inside-avoid">
            <h3 className="text-base font-bold text-[#33077C]">
              Service Details:
            </h3>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-[#2B3991] text-white text-xs font-bold uppercase tracking-wider">
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-center w-10">#</th>
                    <th className="border border-white/30 px-3 py-3">Item</th>
                    <th className="border border-white/30 px-2 sm:px-2.5 py-3 text-center">GST</th>
                    <th className="border border-white/30 px-2 sm:px-2.5 py-3 text-center">Qty</th>
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-center">Rate</th>
                    <th className="border border-white/30 px-3 sm:px-4 py-3 text-right">Subtotal</th>
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-right">Discount</th>
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-right">CGST</th>
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-right">SGST</th>
                    <th className="border border-white/30 px-3 sm:px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeQuote.items.map((it, idx) => {
                    const itemSub = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                    const itemDisc = Number(it.discount) || 0;
                    const itemTaxable = Math.max(0, itemSub - itemDisc);
                    const itemTax = (itemTaxable * 18) / 100;
                    const itemHalfTax = itemTax / 2;
                    const itemTotal = itemTaxable + itemTax;

                    return (
                      <tr
                        key={it.id || idx}
                        className={idx % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}
                      >
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-center font-bold text-slate-700">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-200 px-3 py-3">
                          <span className="font-bold text-slate-900 block font-sans">{it.description}</span>
                        </td>
                        <td className="border border-slate-200 px-2 sm:px-2.5 py-3 text-center text-slate-600 font-sans">
                          18%
                        </td>
                        <td className="border border-slate-200 px-2 sm:px-2.5 py-3 text-center font-bold text-slate-800 font-sans">
                          {it.quantity}
                        </td>
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-center font-medium text-slate-800 font-sans">
                          ₹{it.unitPrice.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-3 sm:px-4 py-3 text-right font-medium text-slate-800 font-sans">
                          ₹{itemSub.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-right font-medium text-slate-800 font-sans">
                          ₹{itemDisc.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-right text-slate-600 font-sans">
                          ₹{itemHalfTax.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-right text-slate-600 font-sans">
                          ₹{itemHalfTax.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-3 sm:px-4 py-3 text-right font-bold text-slate-900 font-sans">
                          ₹{itemTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="border-0 p-0 bg-transparent"></td>
                    <td colSpan={5} className="border-0 p-0">
                      <div
                        className="invoice-summary-ribbon w-full bg-white border border-slate-200 text-slate-800 p-4 sm:p-5 font-sans !rounded-none"
                        style={{ borderRadius: 0 }}
                      >
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr>
                              <td className="py-1.5 text-left font-medium text-xs sm:text-sm text-slate-600">Subtotal</td>
                              <td className="py-1.5 text-right font-semibold text-xs sm:text-sm text-slate-800 font-sans whitespace-nowrap">
                                ₹{rawSubtotal.toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 text-left font-medium text-xs sm:text-sm text-slate-600">Discount</td>
                              <td className="py-1.5 text-right font-semibold text-xs sm:text-sm text-slate-800 font-sans whitespace-nowrap">
                                {rawDiscount > 0 ? `-₹${rawDiscount.toFixed(2)}` : '₹0.00'}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 text-left font-medium text-xs sm:text-sm text-slate-600">GST Total (18%)</td>
                              <td className="py-1.5 text-right font-semibold text-xs sm:text-sm text-slate-800 font-sans whitespace-nowrap">
                                ₹{taxTotal.toFixed(2)}
                              </td>
                            </tr>
                            <tr className="border-t border-slate-200">
                              <td className="pt-2.5 pb-1.5 text-left font-bold text-sm sm:text-base text-slate-800">Grand Total</td>
                              <td className="pt-2.5 pb-1.5 text-right font-bold text-base sm:text-lg text-slate-800 font-sans whitespace-nowrap">
                                ₹{computedGrandTotal.toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 6. Bottom Section: Authorized Signatory */}
          <div className="flex justify-end pt-6 break-inside-avoid">
            {/* Right Column: Signature Block */}
            <div className="space-y-2.5 text-xs sm:text-sm flex flex-col justify-end items-end pb-2">
              <div className="invoice-signature-section w-full max-w-sm flex flex-col items-end pt-2">
                <div className="text-right space-y-2 shrink-0 w-full">

                  {/* Hand-drawn Cursive Signature SVG graphic */}
                  <div className="flex justify-end py-1">
                    <div className="relative inline-block px-4 py-1">
                      <svg
                        className="w-44 h-12 text-[#33077C]"
                        viewBox="0 0 200 60"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10 40 C 30 10, 45 55, 60 25 C 75 -5, 85 45, 105 30 C 120 15, 130 50, 150 20 C 160 5, 175 35, 195 25"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M30 48 C 65 42, 110 50, 180 45"
                          stroke="#4309A2"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Stamp & Authorized Label */}
                  <div className="border-t border-slate-200 pt-2 flex flex-col items-end">
                    <span className="font-extrabold text-slate-900 text-sm tracking-tight block">
                      {quotationFromCompany || activeOrgDetails?.name || 'Authorized'}
                    </span>
                    <div className="flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] text-slate-600 font-extrabold uppercase tracking-wider">
                        Authorized Signatory
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCreateModalOpen) {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Top Full-Page Navigation Header */}
        <div className="bg-[#33077C] rounded-2xl shadow-md p-5 sm:p-6 flex items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleCloseCreate}
              className="inline-flex items-center justify-center gap-2 h-10 px-4.5 bg-white text-[#33077C] hover:bg-slate-100 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
              <span>Back</span>
            </button>
            <span className="text-white/30 text-lg">|</span>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {editingQuoteId
                  ? `Edit ${singularTerm}`
                  : duplicatedFromEstimateNo
                    ? `Duplicate ${singularTerm}`
                    : `New ${singularTerm}`}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 font-medium mt-0.5">
                {editingQuoteId
                  ? `Update and reconfigure formal project ${lowerSingularTerm} #${newEstimateNumber}.`
                  : duplicatedFromEstimateNo
                    ? `Copied from #${duplicatedFromEstimateNo}. Review the details and save to create a new one.`
                    : `Create, configure, and issue a formal project ${lowerSingularTerm} and proposal.`}
              </p>
            </div>
          </div>
        </div>

        {/* Full-Page Form Canvas */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-8">
          <form noValidate onSubmit={handleCreateQuote} className="space-y-6">
            {/* ===================================================================
                ADMIN PANEL: TWO-CARD LAYOUT: Sale Configuration (LEFT) + Client & Billing (RIGHT)
                =================================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* ===================================================================== */}
                {/* CARD 1 (LEFT): Sale Configuration & Seller Details */}
                {/* ===================================================================== */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
                  {/* Card Header */}
                  <div className="px-7 py-4.5 bg-[#33077C] text-white flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                    <div className="flex items-center gap-6">
                      <h2 className="text-base font-bold text-white tracking-tight whitespace-nowrap">
                        Sale Configuration
                      </h2>
                    </div>
                    <button
                      type="button"
                      disabled={isSavingSeller}
                      onClick={async () => {
                        if (isEditingFrom && isPlatformAdmin) {
                          if (await saveSuperAdminSeller()) setIsEditingFrom(false);
                          return;
                        }
                        setIsEditingFrom(!isEditingFrom);
                      }}
                      className="h-8 px-3.5 bg-white hover:bg-slate-100 text-slate-800 border border-transparent rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all duration-200 cursor-pointer select-none active:scale-[0.98]"
                    >
                      {isSavingSeller ? 'Saving...' : isEditingFrom ? 'Done' : 'Edit'}
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-8 space-y-8 flex-1">
                    {/* 1. Current Company & its details */}
                    <div className="space-y-4">
                      {!isEditingFrom ? (
                        <div className="flex items-start justify-between mb-2">
                          <div className="space-y-3.5 text-[13px] flex-1">
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Company Logo</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-700 mr-1">:</span>
                                <img
                                  src={quotationFromLogo}
                                  alt="Company Logo"
                                  className="h-9 sm:h-10 object-contain rounded"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Company Name</span>
                              <span className="text-slate-700">: {quotationFromCompany}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">GSTIN / Tax ID</span>
                              <span className="text-slate-700">: {quotationFromGst}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">PAN Number</span>
                              <span className="text-slate-700">: {quotationFromPan || '—'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Phone Number</span>
                              <span className="text-slate-700">: {quotationFromPhone}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Email</span>
                              <span className="text-slate-700">: {quotationFromEmail}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-start">
                              <span className="font-bold text-slate-800">Company Address</span>
                              <span className="text-slate-700 leading-relaxed">: {quotationFromAddress}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3.5 pt-1 text-sm">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Logo</label>
                            <div className="mt-1.5 flex items-center gap-3">
                              <img
                                src={quotationFromLogo}
                                alt="Company Logo"
                                className="h-10 w-24 object-contain border border-slate-200 rounded-lg p-1 bg-white"
                              />
                              <input
                                type="file"
                                ref={companyLogoInputRef}
                                onChange={handleLogoUpload}
                                accept="image/*"
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => companyLogoInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all cursor-pointer select-none active:scale-[0.98]"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Change Logo</span>
                              </button>
                              {quotationFromLogo !== '/yaa-creations-logo.png' && (
                                <button
                                  type="button"
                                  onClick={() => setQuotationFromLogo('/yaa-creations-logo.png')}
                                  className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
                            <input
                              type="text"
                              value={quotationFromCompany}
                              onChange={(e) => setQuotationFromCompany(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tax ID / GSTIN</label>
                            <input
                              type="text"
                              value={quotationFromGst}
                              onChange={(e) => setQuotationFromGst(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">PAN Number</label>
                            <input
                              type="text"
                              value={quotationFromPan}
                              onChange={(e) => setQuotationFromPan(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Address</label>
                            <input
                              type="text"
                              value={quotationFromAddress}
                              onChange={(e) => setQuotationFromAddress(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                            <input
                              type="text"
                              value={quotationFromPhone}
                              onChange={(e) => setQuotationFromPhone(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                            <input
                              type="email"
                              value={quotationFromEmail}
                              onChange={(e) => setQuotationFromEmail(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>

                        </div>
                      )}
                    </div>

                    {/* 2. Quotation Metadata Dynamic Fields */}
                    <div className="space-y-4 pt-1">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Quotation Metadata &amp; Fields
                        </span>

                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
                          <label className="text-[12px] font-bold text-slate-800">Quotation Serial Number</label>
                          <input
                            type="text"
                            value={newEstimateNumber || nextPredictedEstimateNumber}
                            readOnly
                            disabled
                            placeholder="Auto-generated"
                            className="w-full max-w-[240px] h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none shadow-2xs font-mono cursor-not-allowed select-none"
                          />
                        </div>

                        <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
                          <label className="text-[12px] font-bold text-slate-800">Quotation Number</label>
                          <input
                            type="text"
                            value={quotationManualNumber}
                            onChange={(e) => setQuotationManualNumber(e.target.value)}
                            placeholder="Enter quotation number"
                            className="w-full max-w-[240px] h-8 px-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10 rounded-lg text-xs font-semibold text-slate-800 outline-none transition-all shadow-2xs"
                          />
                        </div>

                        <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
                          <label className="text-[12px] font-bold text-slate-800">
                            Quotation Date <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <input
                            type="date"
                            value={ddmmyyyyToIso(estimateDate)}
                            onChange={(e) => setEstimateDate(isoToDdmmyyyy(e.target.value))}
                            className="w-full max-w-[240px] h-8 px-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10 rounded-lg text-xs font-semibold text-slate-800 outline-none transition-all shadow-2xs"
                          />
                        </div>

                        <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
                          <label className="text-[12px] font-bold text-slate-800">
                            Created Date <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <input
                            type="date"
                            value={ddmmyyyyToIso(createdDate)}
                            onChange={(e) => setCreatedDate(isoToDdmmyyyy(e.target.value))}
                            className="w-full max-w-[240px] h-8 px-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10 rounded-lg text-xs font-semibold text-slate-800 outline-none transition-all shadow-2xs"
                          />
                        </div>

                        <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
                          <label className="text-[12px] font-bold text-slate-800">
                            Due Date <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <input
                            type="date"
                            value={ddmmyyyyToIso(expiryDate)}
                            onChange={(e) => setExpiryDate(isoToDdmmyyyy(e.target.value))}
                            className="w-full max-w-[240px] h-8 px-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10 rounded-lg text-xs font-semibold text-slate-800 outline-none transition-all shadow-2xs"
                          />
                        </div>

                      </div>
                      <div className="space-y-3.5 text-[13px]">
                        {newNotes && (
                          <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                            <span className="font-bold text-slate-800">Note</span>
                            <span className="text-slate-700">: {newNotes}</span>
                          </div>
                        )}

                        {/* Additional Custom Fields */}
                        {customQuoteFields.map((field) => (
                          <div key={field.id} className="grid grid-cols-[140px_1fr] gap-2 items-center group">
                            <span className="font-bold text-slate-800">{field.label}</span>
                            <div className="text-slate-700 flex items-center justify-between">
                              <span>: {field.value}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomQuoteFields(customQuoteFields.filter((f) => f.id !== field.id));
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-all cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {isAddFieldModalOpen && (
                        <div className="flex items-start gap-3 mt-2">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={newFieldLabel}
                              onChange={(e) => setNewFieldLabel(e.target.value)}
                              placeholder="Field Label"
                              autoFocus
                              className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 outline-none transition-all shadow-2xs"
                            />
                            <input
                              type="text"
                              value={newFieldValue}
                              onChange={(e) => setNewFieldValue(e.target.value)}
                              placeholder="Value"
                              className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 outline-none transition-all shadow-2xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewFieldLabel('');
                              setNewFieldValue('');
                              setIsAddFieldModalOpen(false);
                            }}
                            className="p-2.5 mt-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ===================================================================== */}
                {/* CARD 2 (RIGHT): Client / Customer Assignment & Billing Info */}
                {/* ===================================================================== */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col">
                  {/* Card Header */}
                  <div className="px-4 sm:px-7 py-4 sm:py-4.5 bg-[#33077C] text-white flex items-center justify-between gap-2 rounded-t-2xl">
                    <div className="flex items-center gap-3.5">
                      <h2 className="text-base font-bold text-white tracking-tight">
                        {isSuperAdmin && !isOrgSuperAdmin ? 'Organization / Bill To' : 'Client & Billing Party'}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {!(isSuperAdmin && !isOrgSuperAdmin) && (
                        <button
                          type="button"
                          onClick={() => setIsAddClientModalOpen(true)}
                          className="h-8 px-3.5 bg-white hover:bg-slate-50 text-[#33077C] border border-transparent rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all duration-200 cursor-pointer select-none active:scale-[0.98] inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          Add Client
                        </button>
                      )}
                      {selectedClientId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientId('');
                            setClientSearchQuery('');
                            setCustomerName('');
                            setCustomerCompany('');
                            setCustomerEmail('');
                            setCustomerPhone('');
                            setCustomerLocation('');
                            setCustomerGstId('');
                            setCustomerPan('');
                          }}
                          className="h-8 px-3.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-transparent rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all duration-200 cursor-pointer select-none active:scale-[0.98]"
                        >
                          Clear
                        </button>
                      )}
                      <CustomerFormModal
                        isOpen={isAddClientModalOpen}
                        onClose={() => {
                          setIsAddClientModalOpen(false);
                          void loadFormClients(); // show the client that was just added
                        }}
                      />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 flex flex-col">
                    {/* Client Searchable Dropdown */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {isSuperAdmin && !isOrgSuperAdmin ? 'Organization' : 'Client / Customer'} <span className="text-rose-500">*</span>
                        </label>
                      </div>

                      <div className="relative" ref={clientDropdownRef}>
                        {/* Single Combined Search & Dropdown Input Box */}
                        <div className="relative flex items-center">
                          <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                          <input
                            type="text"
                            value={
                              isCompanyProductDropdownOpen
                                ? clientSearchQuery
                                : (selectedClientLabel || customerCompany || clientSearchQuery)
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              setClientSearchQuery(val);
                              if (!isCompanyProductDropdownOpen) setIsCompanyProductDropdownOpen(true);
                              if (customerCompany && val !== (selectedClientLabel || customerCompany)) {
                                setSelectedClientId('');
                                setCustomerCompany('');
                              }
                            }}
                            onFocus={() => {
                              setIsCompanyProductDropdownOpen(true);
                              if (customerCompany && !clientSearchQuery) {
                                setClientSearchQuery(selectedClientLabel || customerCompany);
                              }
                            }}
                            placeholder={isSuperAdmin && !isOrgSuperAdmin ? "Search or select organization..." : "Search or select client / customer..."}
                            className={`w-full h-11 pl-11 pr-16 bg-white border rounded-xl text-sm font-semibold transition-all shadow-2xs outline-none ${isCompanyProductDropdownOpen
                                ? 'border-[#4309A2] ring-4 ring-[#4309A2]/10 text-slate-900'
                                : 'border-slate-200 hover:border-slate-300 text-slate-800'
                              }`}
                          />
                          <div className="absolute right-3 flex items-center gap-1.5">
                            {(selectedClientId || clientSearchQuery) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClientId('');
                                  setClientSearchQuery('');
                                  setCustomerName('');
                                  setCustomerCompany('');
                                  setCustomerEmail('');
                                  setCustomerPhone('');
                                  setCustomerLocation('');
                                  setCustomerGstId('');
                                  setCustomerPan('');
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                                title="Clear selection"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsCompanyProductDropdownOpen(!isCompanyProductDropdownOpen)}
                              className="p-1 text-slate-400 hover:text-[#4309A2] transition-colors cursor-pointer"
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${isCompanyProductDropdownOpen ? 'rotate-180 text-[#4309A2]' : ''
                                  }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Dropdown Menu Popup: Direct List of Clients with filtered search */}
                        {isCompanyProductDropdownOpen && (
                          <div className="dropdown-menu absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 w-full min-w-0 sm:min-w-[320px] max-w-[calc(100vw-2rem)] space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                            <div className="max-h-60 overflow-y-auto space-y-1 pt-0.5">
                              {(() => {
                                const q = clientSearchQuery.trim().toLowerCase();
                                const list = availableClients.filter(
                                  (c) =>
                                    !q ||
                                    c.name.toLowerCase().includes(q) ||
                                    c.company.toLowerCase().includes(q) ||
                                    (c.code || '').toLowerCase().includes(q) ||
                                    c.email.toLowerCase().includes(q)
                                );
                                if (list.length === 0) {
                                  return (
                                    <div className="py-4 text-center text-xs text-slate-400">
                                      {isSuperAdmin && !isOrgSuperAdmin ? `No matching organizations found for "${clientSearchQuery}".` : `No matching clients found for "${clientSearchQuery}".`}
                                    </div>
                                  );
                                }
                                return list.map((client) => {
                                  const isSelected = selectedClientId === client.id;
                                  const displayName = isSuperAdmin && !isOrgSuperAdmin ? client.company || client.name : client.name || client.company;
                                  return (
                                    <button
                                      key={client.id}
                                      type="button"
                                      onClick={() => {
                                        handleClientSelect(client.id);
                                        setClientSearchQuery(displayName);
                                        setIsCompanyProductDropdownOpen(false);
                                        showToast('success', isSuperAdmin && !isOrgSuperAdmin ? 'Organization Selected' : 'Client Selected', `Selected "${displayName}".`);
                                      }}
                                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between gap-3 ${isSelected
                                          ? 'bg-[#33077C]/10 text-[#33077C] font-bold'
                                          : 'hover:bg-slate-50 text-slate-800 font-medium'
                                        }`}
                                    >
                                      <div className="truncate">
                                        <div className="font-semibold text-slate-800 truncate">
                                          {displayName}
                                          {client.code ? ` (${client.code})` : ''}
                                        </div>
                                      </div>
                                      {isSelected && <Check className="w-4 h-4 text-[#33077C] stroke-[2.5] shrink-0" />}
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selected Client Card Details or Empty State (Matching Invoices Layout) */}
                    {selectedClientId ? (
                      <div className="pt-2 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="space-y-3.5 text-[13px]">
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">{isSuperAdmin && !isOrgSuperAdmin ? 'Organization' : 'Company Name'}</span>
                              <span className="text-slate-700">: {customerCompany || '-'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">GSTIN / Tax ID</span>
                              <span className="text-slate-700">: {customerGstId || '-'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">PAN Number</span>
                              <span className="text-slate-700">: {customerPan || '-'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Phone Number</span>
                              <span className="text-slate-700">: {customerPhone || '-'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Email</span>
                              <span className="text-slate-700">: {customerEmail || '-'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Location / Region</span>
                              <span className="text-slate-700">: {customerLocation || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : isSuperAdmin && !isOrgSuperAdmin ? (
                      <div className="py-6 text-center text-sm text-slate-400 font-medium">
                        No organization selected
                      </div>
                    ) : (
                      <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/40 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#33077C] flex items-center justify-center mx-auto border border-purple-100 shadow-2xs">
                          <UsersRound className="w-6 h-6 text-[#4309A2]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">No Client Selected Yet</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Select a client above to preview billing info</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            {/* Row 7: Dynamic Itemized Table */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-[13px] font-bold text-slate-700 block">
                  Add Items & Pricing Details
                </label>
              </div>

              {/* Table matching reference image */}
              <div style={{ borderRadius: '4px' }} className="bg-white !rounded-[4px] border border-slate-200 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs table-fixed min-w-[950px] border-collapse border border-slate-200">
                    <colgroup>
                      <col className="w-auto min-w-[280px]" />
                      <col className="w-[85px]" />
                      <col className="w-[95px]" />
                      <col className="w-[120px]" />
                      <col className="w-[85px]" />
                      <col className="w-[115px]" />
                      <col className="w-[130px]" />
                      <col className="w-[75px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#33077C] text-[11px] font-bold text-white tracking-wider uppercase">
                        <th rowSpan={2} className="py-3 px-5 text-left border border-[#33077C]/40 bg-[#33077C] text-white align-middle">PROJECTS</th>
                        <th rowSpan={2} className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle">QTY</th>
                        <th rowSpan={2} className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle">GST (%)</th>
                        <th rowSpan={2} className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle">PRICE</th>
                        <th colSpan={2} className="py-1.5 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">
                          <span className="text-[11px] font-bold">DISCOUNT</span>
                        </th>
                        <th rowSpan={2} className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle">TOTAL</th>
                        <th rowSpan={2} className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle">ACTION</th>
                      </tr>
                      <tr className="bg-[#33077C] text-[10px] font-bold text-purple-200 tracking-wider uppercase">
                        <th className="py-1.5 px-1 text-center border border-[#33077C]/40 bg-[#33077C]">%</th>
                        <th className="py-1.5 px-2 text-center border border-[#33077C]/40 bg-[#33077C]">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {itemsList.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center bg-slate-50/40 border border-slate-200">
                            <p className="text-xs sm:text-[13px] text-slate-400 font-medium">
                              No items added yet. Click &quot;+ Add Item&quot; below to add line items.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        itemsList.map((item, idx) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/70 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}
                          >
                            {/* 1. Item Title (free text) & optional Description */}
                            <td className="px-5 py-4 align-top border border-slate-200">
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  placeholder="Enter item / service title"
                                  maxLength={200}
                                  value={item.description}
                                  onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                  className="w-full h-10 px-3.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 rounded text-xs font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                                />
                                <input
                                  type="text"
                                  placeholder="+ Add Description (optional)..."
                                  value={item.subDescription || ''}
                                  onChange={(e) => handleItemChange(item.id, 'subDescription', e.target.value)}
                                  className="w-full px-2 py-0.5 text-[11px] text-slate-500 placeholder:text-slate-400 bg-transparent border-0 focus:ring-0 outline-none"
                                />
                              </div>
                            </td>

                            {/* 2. QTY */}
                            <td className="px-2 py-4 align-top border border-slate-200">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                                className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-900 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                              />
                            </td>

                            {/* 3. GST (%) */}
                            <td className="px-2 py-4 align-top border border-slate-200">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                placeholder="0"
                                value={item.taxPercent || 0}
                                onChange={(e) => handleItemChange(item.id, 'taxPercent', Number(e.target.value))}
                                className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-center text-slate-800 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                              />
                            </td>

                            {/* 4. PRICE */}
                            <td className="px-2 py-4 align-top border border-slate-200">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                                className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-center text-slate-900 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                              />
                            </td>

                            {/* 5. DISCOUNT (%) */}
                            <td className="px-1.5 py-4 align-top border border-slate-200">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                placeholder="0"
                                value={item.discountPercent === 0 ? '' : (item.discountPercent ?? '')}
                                onChange={(e) => handleItemChange(item.id, 'discountPercent', Number(e.target.value))}
                                className="w-full h-10 px-1 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-center text-slate-800 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                              />
                            </td>

                            {/* 6. DISCOUNT (AMOUNT) */}
                            <td className="px-1.5 py-4 align-top border border-slate-200">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0.00"
                                value={item.discount === 0 ? '' : (item.discount ?? '')}
                                onChange={(e) => handleItemChange(item.id, 'discount', Number(e.target.value))}
                                className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-center text-slate-800 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                              />
                            </td>

                            {/* 7. TOTAL */}
                            <td className="px-2 py-4 align-top border border-slate-200">
                              <div className="h-10 flex items-center justify-center">
                                <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/90 font-bold text-xs shadow-2xs font-sans min-w-[90px] text-center">
                                  ₹{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </td>

                            {/* 8. ACTION */}
                            <td className="px-2 py-4 align-top border border-slate-200">
                              <div className="h-10 flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                                  title="Delete Line Item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Item Button placed below the item fields + Totals calculation */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  style={{ borderRadius: '4px' }}
                  className="h-11 px-6 bg-[#33077C] hover:bg-[#4309A2] text-white !rounded-[4px] text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Item</span>
                </button>
                <div style={{ borderRadius: '4px' }} className="w-full max-w-sm border border-slate-200 !rounded-[4px] overflow-hidden shadow-sm bg-white text-xs sm:text-[13px]">
                  <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Sub Total</span>
                    <span className="font-bold text-slate-900">₹{subTotal.toFixed(2)}</span>
                  </div>

                  {totalDiscount > 0 && (
                    <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100">
                      <span className="text-slate-600 font-medium">Discount</span>
                      <span className="font-semibold text-rose-600">-₹{totalDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Estimated Tax</span>
                    <span className="font-semibold text-slate-900">₹{totalTax.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center px-5 py-3.5 bg-[#33077C] text-white font-bold">
                    <span className="text-xs sm:text-sm uppercase tracking-wider">Total</span>
                    <span className="text-sm sm:text-base tracking-wide">{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Fields: Upload File & Scope Notes in 3-column alignment (non-superadmin) */}
            {(
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">

                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Scope / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Looking forward for your business."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Form Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCloseCreate}
                className="h-10 px-4.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-bold shadow-2xs transition-all duration-200 cursor-pointer select-none active:scale-[0.98] flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500 stroke-[2.2]" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5.5 bg-[#33077C] hover:bg-[#4309A2] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-white stroke-[2.5]" />
                    <span>{editingQuoteId ? `Update ${singularTerm}` : `Save ${singularTerm}`}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Action Toolbar */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Static Title matching Clients & Leads Center */}
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            All {pluralTerm}
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Create, manage, and dispatch formal project {lowerPluralTerm} and proposals.
          </p>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreate}
            icon={<Plus className="w-4 h-4" strokeWidth={2.5} />}
          >
            New {singularTerm}
          </Button>
        </div>
      </div>

      {/* Reusable Filter / Search row */}
      <SearchBar
        value={pendingSearch}
        onChange={handleSearchChange}
        placeholder={isSuperAdmin ? 'Search quotation #, organization, ref...' : `Search ${lowerSingularTerm} #, client, company, ref...`}
        onSubmit={handleApply}
        onReset={handleReset}
        filterSlot={
          <div className="flex items-center gap-2 flex-wrap">
            {isSuperAdmin && (
              <FilterDropdown
                options={[
                  { label: 'Organization : All', value: '' },
                  ...availableClients.map((c) => ({
                    label: c.company || c.name,
                    value: c.id,
                  })),
                ]}
                value={pendingBilledOrgId}
                onChange={(val) => setPendingBilledOrgId(val)}
                onOpen={loadOrganizationOptions}
              />
            )}
            <FilterDropdown
              options={[
                { label: 'Status : All', value: 'ALL' },
                { label: 'Draft', value: 'DRAFT', dotColor: '#94a3b8' },
                { label: 'Sent', value: 'SENT', dotColor: '#33077C' },
                { label: 'Accepted', value: 'ACCEPTED', dotColor: '#10b981' },
                { label: 'Expired', value: 'EXPIRED', dotColor: '#f59e0b' },
                { label: 'Declined', value: 'DECLINED', dotColor: '#f43f5e' },
              ]}
              value={pendingStatus}
              onChange={handleStatusFilter}
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-2">
            <button
              type="button"
              onClick={fetchQuotes}
              disabled={isLoadingQuotes}
              className="p-1.5 text-slate-400 hover:text-[#33077C] rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Refresh Quotes"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQuotes ? 'animate-spin text-[#33077C]' : ''}`} />
            </button>
            <span className="text-xs font-semibold text-slate-500">
              Total {pluralTerm} :{' '}
              <span className="text-[#33077C] font-bold">{totalRecords}</span>
            </span>
          </div>
        }
      />

      {/* Quotes Table matching 2nd Reference Image (Clients & Leads Grid Architecture) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-[#33077C] text-[12px] font-bold text-white tracking-wider uppercase">
                {isSuperAdmin ? (
                  <>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">QUOTATION NUM</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">ORGANIZATION & CODE</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CONTACT INFO</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">STATUS</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">AMOUNT</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
                  </>
                ) : (
                  <>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">{singularTerm.toUpperCase()}</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CLIENT & REFERENCE</th>
                    <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">CREATED DATE</th>
                    <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">EXPIRY DATE</th>
                    <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-right">AMOUNT</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoadingQuotes ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 7} className="py-16 text-center text-slate-400 border border-slate-200">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#33077C]" />
                    <p className="font-bold text-slate-700 text-sm">Loading {lowerPluralTerm}...</p>
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 7} className="py-16 text-center text-slate-400 border border-slate-200">
                    <FileText className="w-9 h-9 mx-auto mb-2 opacity-30 text-orange-400" />
                    <p className="font-bold text-slate-700 text-sm">No {lowerPluralTerm} found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Generate a new {lowerSingularTerm} or adjust your search parameters.</p>
                  </td>
                </tr>
              ) : (
                pagedQuotes.map((quote) => {
                  const convertedQuotesStorage = (() => {
                    try {
                      return JSON.parse(localStorage.getItem('yaa_crm_converted_quotes') || '[]');
                    } catch {
                      return [];
                    }
                  })();
                  const isQuoteConverted =
                    quote.status === ('CONVERTED' as any) ||
                    (quote as any).convertedToType === 'PROFORMA' ||
                    Boolean((quote as any).convertedToId) ||
                    convertedQuotesStorage.includes(quote.id) ||
                    convertedQuotesStorage.includes(quote.estimateNumber);

                  return (
                    <tr
                      key={quote.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {isSuperAdmin ? (
                        <>
                          {/* 1. Quotation Num */}
                          <td className="py-4 px-5 border border-slate-200">
                            <div>
                              <button
                                onClick={() => setSelectedQuote(quote)}
                                className="font-bold text-slate-900 hover:text-[#4309A2] text-sm transition-colors cursor-pointer text-left block"
                              >
                                {quote.estimateNumber}
                              </button>
                            </div>
                          </td>

                          {/* 2. Organization & Code */}
                          <td className="py-4 px-5 border border-slate-200">
                            {(() => {
                              const org = getOrgInfo(quote.customerCompany || 'YaaCreations');
                              return (
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 text-sm">{org.name}</span>
                                    <span className="text-xs font-bold text-[#4309A2]">
                                      ({org.code})
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    {quote.customerName}
                                  </p>
                                </div>
                              );
                            })()}
                          </td>

                          {/* 3. Contact Info Actions */}
                          <td className="py-4 px-5 border border-slate-200">
                            <div className="flex items-center gap-2">
                              {/* Phone */}
                              <div className="relative group">
                                <button
                                  type="button"
                                  onClick={(e) => handleCopy(e, quote.customerPhone, `${quote.id}-phone`)}
                                  className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </button>
                                <div
                                  className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${quote.id}-phone`
                                    ? 'opacity-100 bg-emerald-600 scale-100'
                                    : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                    }`}
                                >
                                  {copiedKey === `${quote.id}-phone` ? 'Phone number copied' : (quote.customerPhone || 'No phone')}
                                </div>
                              </div>

                              {/* WhatsApp */}
                              <div className="relative group">
                                <button
                                  type="button"
                                  onClick={(e) => handleCopy(e, quote.customerPhone, `${quote.id}-wa`)}
                                  className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                                <div
                                  className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${quote.id}-wa`
                                    ? 'opacity-100 bg-emerald-600 scale-100'
                                    : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                    }`}
                                >
                                  {copiedKey === `${quote.id}-wa` ? 'WhatsApp number copied' : (quote.customerPhone || 'No whatsapp')}
                                </div>
                              </div>

                              {/* Email */}
                              <div className="relative group">
                                <button
                                  type="button"
                                  onClick={(e) => handleCopy(e, quote.customerEmail, `${quote.id}-email`)}
                                  className="w-8 h-8 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                                <div
                                  className={`transition-all duration-200 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow-lg whitespace-nowrap z-30 ${copiedKey === `${quote.id}-email`
                                    ? 'opacity-100 bg-emerald-600 scale-100'
                                    : 'opacity-0 group-hover:opacity-100 bg-slate-900'
                                    }`}
                                >
                                  {copiedKey === `${quote.id}-email` ? 'Email address copied' : (quote.customerEmail || 'No email')}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 4. Status Dropdown (matching reference 2nd image design & typography) */}
                          <td className="py-4 px-5 border border-slate-200">
                            {isQuoteConverted ? (
                              <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"></span>
                                <span>CONVERTED</span>
                              </span>
                            ) : (
                              <div className="inline-block text-left">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (activeStatusDropdownId === quote.id) {
                                      setActiveStatusDropdownId(null);
                                      setStatusDropdownPos(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const spaceBelow = window.innerHeight - rect.bottom;
                                      const dropdownHeight = 220;

                                      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                        setStatusDropdownPos({
                                          bottom: window.innerHeight - rect.top + 6,
                                          left: rect.left,
                                        });
                                      } else {
                                        setStatusDropdownPos({
                                          top: rect.bottom + 6,
                                          left: rect.left,
                                        });
                                      }
                                      setActiveStatusDropdownId(quote.id);
                                    }
                                  }}
                                  className="status-dropdown-btn inline-flex items-center gap-2 px-1.5 py-1 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer select-none"
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${quote.status === 'ACCEPTED'
                                      ? 'bg-[#10b981]'
                                      : quote.status === 'SENT'
                                        ? 'bg-[#33077C]'
                                        : quote.status === 'DECLINED'
                                          ? 'bg-[#f43f5e]'
                                          : quote.status === 'EXPIRED'
                                            ? 'bg-[#f59e0b]'
                                            : 'bg-[#94a3b8]'
                                      }`}
                                  />
                                  <span className="text-xs font-semibold text-slate-800 tracking-tight">
                                    {quote.status === 'SENT'
                                      ? 'Sent'
                                      : quote.status === 'DECLINED'
                                        ? 'Declined'
                                        : quote.status === 'ACCEPTED'
                                          ? 'Accepted'
                                          : quote.status === 'EXPIRED'
                                            ? 'Expired'
                                            : 'Draft'}
                                  </span>
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 stroke-[2.2]" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* 5. Amount */}
                          <td className="py-4 px-5 border border-slate-200">
                            <div className="font-bold text-slate-900 text-sm font-sans">
                              &#8377;{quote.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                              Dated: {quote.date}
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Estimate */}
                          <td className="py-4 px-5 border border-slate-200">
                            <div>
                              <button
                                onClick={() => setSelectedQuote(quote)}
                                className="font-bold text-slate-900 hover:text-orange-600 text-sm transition-colors cursor-pointer text-left block"
                              >
                                {quote.estimateNumber}
                              </button>
                              {quote.productName && quote.productName !== 'Yaa connect' ? (
                                <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                                  {quote.productName}
                                </div>
                              ) : null}
                            </div>
                          </td>

                          {/* Client & Reference */}
                          <td className="py-4 px-5 border border-slate-200">
                            <div>
                              <div className="font-bold text-slate-900 text-xs sm:text-[13px] tracking-tight">
                                {quote.customerName}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {quote.customerName}
                              </div>
                            </div>
                          </td>

                          {/* Created Date */}
                          <td className="py-4 px-4 border border-slate-200 align-middle text-center text-slate-600 font-medium">
                            {quote.createdAt || quote.date || '-'}
                          </td>

                          {/* Expiry Date */}
                          <td className="py-4 px-4 border border-slate-200 align-middle text-center text-slate-600 font-medium">
                            {quote.expiryDate || '-'}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4 border border-slate-200 align-middle text-center">
                            <div className="flex items-center justify-center">
                              {getStatusBadge(isQuoteConverted ? 'CONVERTED' : quote.status)}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-4 px-5 border border-slate-200 text-right">
                            <div className="font-bold text-slate-900 text-sm font-sans">
                              &#8377;{quote.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </td>
                        </>
                      )}

                      {/* Action: Three Dots Dropdown (View, Send as mail, Print, Delete) */}
                      <td className="py-4 px-5 border border-slate-200 text-center relative action-dropdown-container">
                        <div className="inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openActionMenuId === quote.id) {
                                setOpenActionMenuId(null);
                                setActionDropdownPos(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const dropdownHeight = 230;

                                if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                  // Open upwards if not enough space below
                                  setActionDropdownPos({
                                    bottom: window.innerHeight - rect.top + 6,
                                    right: window.innerWidth - rect.right,
                                  });
                                } else {
                                  // Open downwards
                                  setActionDropdownPos({
                                    top: rect.bottom + 6,
                                    right: window.innerWidth - rect.right,
                                  });
                                }
                                setOpenActionMenuId(quote.id);
                              }
                            }}
                            className="action-dropdown-btn w-8 h-8 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-xs"
                            title="Actions"
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

      {/* Pagination */}
      <Pagination
        total={totalRecords}
        currentPage={currentPage}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />
      {/* Action Dropdown Menu Portal / Fixed Overlay */}
      {openActionMenuId && actionDropdownPos && (() => {
        const targetQuote = quotes.find((q) => q.id === openActionMenuId);
        if (!targetQuote) return null;

        const convertedQuotesStorage = (() => {
          try {
            return JSON.parse(localStorage.getItem('yaa_crm_converted_quotes') || '[]');
          } catch {
            return [];
          }
        })();
        const isAlreadyConverted =
          targetQuote.status === ('CONVERTED' as any) ||
          (targetQuote as any).convertedToType === 'PROFORMA' ||
          Boolean((targetQuote as any).convertedToId) ||
          convertedQuotesStorage.includes(targetQuote.id) ||
          convertedQuotesStorage.includes(targetQuote.estimateNumber);

        return (
          <div
            style={{
              position: 'fixed',
              ...(actionDropdownPos.bottom !== undefined
                ? { bottom: `${actionDropdownPos.bottom}px` }
                : { top: `${actionDropdownPos.top}px` }),
              right: `${Math.min(Math.max(8, actionDropdownPos.right), Math.max(8, window.innerWidth - 236))}px`,
            }}
            className="w-56 max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[9999] action-dropdown-popup animate-in fade-in zoom-in-95 duration-100 text-left"
          >
            {/* 1. View */}
            <button
              type="button"
              onClick={() => {
                setOpenActionMenuId(null);
                setActionDropdownPos(null);
                setIsActionStatusSubmenuOpen(false);
                setSelectedQuote(targetQuote);
              }}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer group whitespace-nowrap"
            >
              <span className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Eye className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="group-hover:text-slate-900 transition-colors text-[13px] whitespace-nowrap">View</span>
            </button>

            {/* 2. Edit */}
            <button
              type="button"
              onClick={() => {
                setOpenActionMenuId(null);
                setActionDropdownPos(null);
                setIsActionStatusSubmenuOpen(false);
                handleEditQuote(targetQuote);
              }}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer group whitespace-nowrap"
            >
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Pencil className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="group-hover:text-slate-900 transition-colors text-[13px] whitespace-nowrap">Edit</span>
            </button>

            {/* 3. Duplicate */}
            <button
              type="button"
              onClick={() => {
                setOpenActionMenuId(null);
                setActionDropdownPos(null);
                setIsActionStatusSubmenuOpen(false);
                handleDuplicateQuote(targetQuote);
              }}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer group whitespace-nowrap"
            >
              <span className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Copy className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="group-hover:text-slate-900 transition-colors text-[13px] whitespace-nowrap">Duplicate</span>
            </button>

            {/* 4. Convert to Proforma */}
            {targetQuote.status !== 'DECLINED' && targetQuote.status !== 'EXPIRED' && (
              <button
                type="button"
                disabled={isAlreadyConverted}
                onClick={() => {
                  if (isAlreadyConverted) return;
                  setOpenActionMenuId(null);
                  setActionDropdownPos(null);
                  setIsActionStatusSubmenuOpen(false);

                  // Construct prefilled proforma data from quotation
                  const convertedProforma: any = {
                    id: '',
                    invoiceNumber: '',
                    invoiceDate: new Date().toISOString().split('T')[0],
                    dueDate: targetQuote.expiryDate ? targetQuote.expiryDate.split('T')[0] : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    status: 'Draft',
                    referenceNumbers: [targetQuote.estimateNumber],
                    description: targetQuote.notes || '',
                    client: {
                      id: targetQuote.customerId || '',
                      name: targetQuote.customerName || '',
                      company: targetQuote.customerCompany || '',
                      email: targetQuote.customerEmail || '',
                      phone: targetQuote.customerPhone || '',
                      address: targetQuote.customerLocation || '',
                      location: targetQuote.customerLocation || '',
                      gstin: targetQuote.customerGstin || '',
                      taxId: targetQuote.customerGstin || '',
                      pan: targetQuote.customerPan || '',
                      status: 'Active',
                    },
                    items: (targetQuote.items || []).map((it, idx) => ({
                      id: it.id || `item-${idx + 1}`,
                      name: it.description || '',
                      description: '',
                      hsnCode: '998314',
                      qty: Number(it.quantity) || 1,
                      unitPrice: Number(it.unitPrice) || 0,
                      discount: Number(it.discount) || 0,
                      taxPercent: 18,
                    })),
                  };

                  navigate('/proforma/new', {
                    state: {
                      invoiceToDuplicate: convertedProforma,
                      convertedFromQuoteNumber: targetQuote.estimateNumber,
                      convertedFromQuoteId: targetQuote.id,
                    },
                  });
                }}
                className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold transition-colors group whitespace-nowrap ${isAlreadyConverted
                    ? 'text-slate-400 cursor-not-allowed opacity-50 bg-slate-50/50'
                    : 'text-slate-700 hover:bg-slate-50 cursor-pointer'
                  }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ${isAlreadyConverted ? 'bg-slate-300 text-white' : 'bg-[#6366F1] text-white'
                  }`}>
                  <FileText className="w-3.5 h-3.5 stroke-[2.2]" />
                </span>
                <span className={`text-[13px] whitespace-nowrap ${isAlreadyConverted ? 'text-slate-400 font-medium' : 'group-hover:text-slate-900'}`}>
                  {isAlreadyConverted ? 'Converted' : 'Convert to Proforma'}
                </span>
              </button>
            )}

            {/* 5. Set Status (with three dots and submenu) - hidden once converted */}
            {!isAlreadyConverted && (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsActionStatusSubmenuOpen(!isActionStatusSubmenuOpen)}
                    className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer group whitespace-nowrap ${isActionStatusSubmenuOpen ? 'bg-indigo-50/70 text-[#33077C]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <span className="w-7 h-7 rounded-full bg-[#33077C] text-white flex items-center justify-center shrink-0 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
                      </span>
                      <span className="group-hover:text-slate-900 transition-colors text-[13px] whitespace-nowrap">Set Status</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-5 h-5 rounded-md hover:bg-slate-200/60 flex items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>

                  {/* Status Submenu (Draft, Send, Approved, Cancelled) */}
                  {isActionStatusSubmenuOpen && (
                    <div className="mt-1.5 mb-1.5 p-1.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl shadow-inner space-y-1 animate-in fade-in zoom-in-95 duration-100">
                      {(
                        [
                          { value: 'DRAFT', label: 'Draft', color: '#94a3b8' },
                          { value: 'SENT', label: 'Send', color: '#33077C' },
                          { value: 'ACCEPTED', label: 'Approved', color: '#10b981' },
                          { value: 'DECLINED', label: 'Cancelled', color: '#f43f5e' },
                        ] as const
                      ).map((opt) => {
                        const isActive = targetQuote.status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setOpenActionMenuId(null);
                              setActionDropdownPos(null);
                              setIsActionStatusSubmenuOpen(false);
                              handleStatusChange(targetQuote.id, opt.value);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${isActive
                                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                                : 'text-slate-700 hover:bg-white/70 hover:text-slate-900'
                              }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: opt.color }}
                            />
                            <span className="flex-1 font-bold text-[13px]">{opt.label}</span>
                            {isActive && (
                              <Check className="w-4 h-4 shrink-0 text-[#33077C] stroke-[2.5]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-100 my-1" />
              </>
            )}

            {/* 6. Delete */}
            <button
              type="button"
              onClick={() => {
                setOpenActionMenuId(null);
                setActionDropdownPos(null);
                setIsActionStatusSubmenuOpen(false);
                setDeleteQuoteConfirm({
                  id: targetQuote.id,
                  estimateNumber: targetQuote.estimateNumber,
                });
              }}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer group"
            >
              <span className="w-7 h-7 rounded-full bg-[#EF4444] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="text-rose-600 font-bold text-[13px]">Delete</span>
            </button>
          </div>
        );
      })()}

      {/* Table Status Dropdown Menu Portal / Fixed Overlay */}
      {activeStatusDropdownId && statusDropdownPos && (() => {
        const targetQuote = quotes.find((q) => q.id === activeStatusDropdownId);
        if (!targetQuote) return null;

        return (
          <div
            style={{
              position: 'fixed',
              ...(statusDropdownPos.bottom !== undefined
                ? { bottom: `${statusDropdownPos.bottom}px` }
                : { top: `${statusDropdownPos.top}px` }),
              left: `${Math.max(8, Math.min(statusDropdownPos.left, window.innerWidth - 170))}px`,
            }}
            className="min-w-[155px] max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-[9999] status-dropdown-popup animate-in fade-in zoom-in-95 duration-100 text-left"
          >
            {(
              [
                { value: 'DRAFT', label: 'Draft', color: '#94a3b8' },
                { value: 'SENT', label: 'Sent', color: '#33077C' },
                { value: 'ACCEPTED', label: 'Accepted', color: '#10b981' },
                { value: 'EXPIRED', label: 'Expired', color: '#f59e0b' },
                { value: 'DECLINED', label: 'Declined', color: '#f43f5e' },
              ] as const
            ).map((opt) => {
              const isActive = targetQuote.status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusChange(targetQuote.id, opt.value)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition-colors text-left cursor-pointer ${isActive
                    ? 'bg-indigo-50 text-[#33077C]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                  <span className="flex-1">{opt.label}</span>
                  {isActive && (
                    <Check className="w-3.5 h-3.5 shrink-0 text-[#33077C] stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Reusable Delete Quotation Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteQuoteConfirm}
        onClose={() => {
          if (!isDeletingQuote) setDeleteQuoteConfirm(null);
        }}
        type="Delete"
        itemTypeLabel="Quotation"
        itemName={deleteQuoteConfirm ? `#${deleteQuoteConfirm.estimateNumber}` : undefined}
        confirmButtonText="Yes, Delete"
        isLoading={isDeletingQuote}
        onConfirm={async () => {
          if (!deleteQuoteConfirm) return;
          setIsDeletingQuote(true);
          try {
            await quoteApi.deleteQuote(deleteQuoteConfirm.id);
            showToast('success', 'Quotation Deleted', `Quotation #${deleteQuoteConfirm.estimateNumber} removed successfully.`);
            setDeleteQuoteConfirm(null);
            fetchQuotes();
          } catch (err: any) {
            console.error('Failed to delete quote:', err);
            showToast('error', 'Delete Failed', err?.response?.data?.error?.message || err?.message || 'Could not delete quote.');
          } finally {
            setIsDeletingQuote(false);
          }
        }}
      />
    </div>
  );
};
