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
  FileSpreadsheet,
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { useAuth } from '../../context/AuthContext';
import { EstimatePDFDocument, SellerInfo } from '../../components/quotes/EstimatePDFDocument';
import { Button } from '../../components/common/Button';
import { SearchBar } from '../../components/common/SearchBar';
import { Pagination } from '../../components/common/Pagination';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { ConfirmationModal } from '../../utils/confirmationModal';
import {
  quoteApi,
  organizationApi,
  subOrganizationApi,
  clientProductApi,
  platformLeadApi,
  OrganizationApiItem,
  ClientProductApiItem,
  QuoteApiItem,
  CreateQuoteRequest,
  getStoredOrganizationId,
  platformClientApi,
  PlatformClientItem,
} from '../../api';

export interface Quotation {
  id: string;
  estimateNumber: string;
  referenceNumber: string;
  date: string;
  expiryDate: string;
  customerId?: string;
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  customerPhone: string;
  customerLocation?: string;
  productName: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED';
  amount: number;
  hasAttachment: boolean;
  notes?: string;
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
  const [platformProducts, setPlatformProducts] = useState<ClientProductApiItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

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

      // For Platform Administrator (Super Admin):
      // Only fetch registered organizations (for the Select Organization dropdown).
      // Do NOT fetch seller org details, sub-organizations, leads, or products.
      if (isSuperAdmin && !isOrgSuperAdmin) {
        setLoadingClients(true);
        try {
          const orgsRes = await organizationApi.getOrganizations(1, 100);
          if (isMounted && orgsRes && Array.isArray(orgsRes.data)) {
            const orgClients: AvailableClient[] = orgsRes.data
              .filter((o) => !!o.id)
              .map((o) => ({
                id: o.id,
                name: o.contactPerson || o.user?.name || o.name,
                company: o.name,
                contactPerson: o.contactPerson || o.user?.name || '',
                email: o.email || '',
                phone: o.phone || '',
                location: o.address || o.location || '',
                type: 'Organization',
              }));
            setAvailableClients(orgClients);
          }
        } catch (e) {
          console.warn('Notice: Could not load organizations for platform administrator:', e);
        } finally {
          if (isMounted) setLoadingClients(false);
        }
        return;
      }

      // 1. Fetch active organization details for Seller info (Org Admin / Tenant only)
      if (orgId) {
        try {
          const orgRes = await organizationApi.getOrganizationById(orgId);
          if (isMounted && orgRes?.data) {
            setActiveOrgDetails(orgRes.data);
            if (orgRes.data.name) setQuotationFromCompany(orgRes.data.name);
            if (orgRes.data.email) setQuotationFromEmail(orgRes.data.email);
            if (orgRes.data.phone) setQuotationFromPhone(orgRes.data.phone);
            if (orgRes.data.address) setQuotationFromAddress(orgRes.data.address);
            if (orgRes.data.gstNumber) setQuotationFromGst(orgRes.data.gstNumber);
            if (orgRes.data.panNumber) setQuotationFromPan(orgRes.data.panNumber);
            const orgLogo = orgRes.data.logo || (orgRes.data as any)?.logoUrl;
            if (orgLogo) setQuotationFromLogo(orgLogo);
          }
        } catch (e) {
          console.warn('Notice: Could not load organization details:', e);
        }
      }

      // 2. Fetch real clients from Client API for Org Admin
      setLoadingClients(true);
      const clientsMap = new Map<string, AvailableClient>();

      try {
        const clientRes = await platformClientApi.getClients({ page: 1, limit: 100, organization_id: orgId || undefined });
        if (clientRes && Array.isArray(clientRes.data)) {
          clientRes.data.forEach((c) => {
            if (c.id) {
              const displayName = c.name || c.legalName || c.contactPerson || 'Client';
              clientsMap.set(c.id, {
                id: c.id,
                name: c.contactPerson || displayName,
                company: displayName,
                contactPerson: c.contactPerson || '',
                email: c.email || '',
                phone: c.phone || c.whatsapp || '',
                location: c.address || c.location || '',
                type: 'Client',
                gstin: c.gstNumber || '',
                pan: c.panNumber || '',
              });
            }
          });
        }
      } catch (e) {
        console.warn('Failed to load clients for quotes:', e);
      }

      if (isMounted) {
        setAvailableClients(Array.from(clientsMap.values()));
        setLoadingClients(false);
      }

      // 3. Fetch real products
      setLoadingProducts(true);
      try {
        const prodRes = await clientProductApi.getProducts({ page: 1, limit: 100 });
        if (isMounted && prodRes && Array.isArray(prodRes.data)) {
          setPlatformProducts(prodRes.data);
          if (prodRes.data.length > 0) {
            setSelectedProductSuiteName(prodRes.data[0].name);
            setProjectName((prev) => prev || prodRes.data[0].name);
          }
        }
      } catch (e) {
        console.warn('Failed to load products for quotes:', e);
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    };

    loadClientsAndProducts();

    return () => {
      isMounted = false;
    };
  }, [isSuperAdmin, isOrgSuperAdmin]);

  // Real backend quotes state
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
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
      date: formatIsoDate(item.date),
      expiryDate: formatIsoDate(item.expiryDate),
      customerId: item.customerId || item.organizationId,
      customerName: item.customerName || item.customerCompany || 'Client',
      customerCompany: item.customerCompany || item.customerName || 'Company',
      customerEmail: item.customerEmail || '',
      customerPhone: item.customerPhone || '',
      customerLocation: item.customerLocation || '',
      productName: item.productName || 'Quotation',
      status: item.status,
      amount: Number(item.amount) || 0,
      hasAttachment: false,
      notes: item.notes || '',
      items: (item.items || []).map((it, idx) => ({
        id: it.id || `item_${idx}`,
        description: it.description || '',
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
      await quoteApi.updateQuote(quoteId, { status: newStatus });
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(
    initialCreateOpen || location.pathname === '/quotes/new'
  );
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionDropdownPos, setActionDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
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

  useEffect(() => {
    if (location.pathname === '/quotes/new') {
      setIsCreateModalOpen(true);
    } else if (location.pathname === '/quotes' && !initialCreateOpen) {
      setIsCreateModalOpen(false);
    }
  }, [location.pathname, initialCreateOpen]);

  const handleOpenCreate = () => {
    setFormErrors({});
    setIsCreateModalOpen(true);
    navigate('/quotes/new');
  };

  const handleCloseCreate = () => {
    setFormErrors({});
    setIsCreateModalOpen(false);
    navigate('/quotes');
  };

  // Fetch Quotes from Backend API
  const fetchQuotes = async () => {
    try {
      setIsLoadingQuotes(true);
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
      } else {
        if (orgId) {
          params.organization_id = orgId;
        }
        if (activeSubOrgId && activeSubOrgName && activeSubOrgName !== 'All') {
          params.sub_organization_id = activeSubOrgId;
        }
        const activeBranchId = localStorage.getItem('active_branch_id_sales') || localStorage.getItem('active_branch_id');
        const activeBranchName = localStorage.getItem('active_branch_sales') || localStorage.getItem('active_branch');
        if (activeBranchId && activeBranchName && activeBranchName !== 'All') {
          params.branch_id = activeBranchId;
        }
      }

      const res = await quoteApi.getQuotes(params);
      if (res && res.data) {
        setQuotes(res.data.map(mapApiQuoteToUi));
        setTotalRecords(res.pagination?.totalRecords ?? res.data.length);
      } else {
        setQuotes([]);
        setTotalRecords(0);
      }
    } catch (err: any) {
      console.error('Failed to load quotes:', err);
      showToast('error', 'Failed to Load Quotes', err?.response?.data?.error?.message || 'Could not fetch quotes');
      setQuotes([]);
      setTotalRecords(0);
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [currentPage, pageSize, appliedSearch, appliedStatus, appliedBilledOrgId]);

  useEffect(() => {
    const handleFilterChange = () => {
      setCurrentPage(1);
      fetchQuotes();
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
          sellerDetails={getSellerDetails()}
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
  const [newEstimateNumber, setNewEstimateNumber] = useState(`EST-${Math.floor(10000 + Math.random() * 90000)}`);
  const [newReferenceNumber, setNewReferenceNumber] = useState(`REF-${Math.floor(1000 + Math.random() * 9000)}`);
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
  const [quotationFromCompany, setQuotationFromCompany] = useState('Yaa Creations');
  const [quotationFromLogo, setQuotationFromLogo] = useState('/yaa-creations-logo.png');
  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  const [quotationFromGst, setQuotationFromGst] = useState('27AABCA1234F1Z8');
  const [quotationFromPhone, setQuotationFromPhone] = useState('+91 98765 43210');
  const [quotationFromEmail, setQuotationFromEmail] = useState('billing@yaacreations.com');
  const [quotationFromAddress, setQuotationFromAddress] = useState('Plot No 42, Silicon Valley High-Tech Zone, Madhapur, Hyderabad, TG 500081');
  const [isEditingFrom, setIsEditingFrom] = useState(false);
  const [quotationFromPan, setQuotationFromPan] = useState('ABCDE1234F');

  const getSellerDetails = (): SellerInfo => ({
    name: quotationFromCompany || activeOrgDetails?.name || 'Yaa Creations',
    taxId: quotationFromGst || activeOrgDetails?.gstNumber || undefined,
    pan: quotationFromPan || activeOrgDetails?.panNumber || undefined,
    phone: quotationFromPhone || activeOrgDetails?.phone || undefined,
    email: quotationFromEmail || activeOrgDetails?.email || undefined,
    address: quotationFromAddress || activeOrgDetails?.address || undefined,
  });
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
  const [estimateDate, setEstimateDate] = useState(() => (isSuperAdmin ? '' : formatDateToDDMMYYYY(new Date())));
  const [expiryDate, setExpiryDate] = useState(() => {
    if (isSuperAdmin) return '';
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatDateToDDMMYYYY(d);
  });
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
    discount: number;
    taxPercent?: number;
    total: number;
  }

  const [itemsList, setItemsList] = useState<FormItem[]>([]);

  const [newNotes, setNewNotes] = useState('');

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

  const handleProductSelect = (prodId: string) => {
    const prod = platformProducts.find((p) => p.id === prodId || p.name === prodId);
    if (prod) {
      setProjectName(prod.name);
      setSelectedProductSuiteName(prod.name);
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
      discount: 0,
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
        const qty = Number(updated.quantity) || 0;
        const rate = Number(updated.unitPrice) || 0;
        const disc = Number(updated.discount) || 0;
        const taxRate = Number(updated.taxPercent) || 0;
        const taxable = Math.max(0, qty * rate - disc);
        const taxAmount = (taxable * taxRate) / 100;
        const lineTotal = taxable + taxAmount;
        return {
          ...updated,
          total: lineTotal,
        };
      })
    );
  };

  // Real item calculations
  const subTotal = itemsList.reduce((sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0);
  const totalDiscount = itemsList.reduce((sum, it) => sum + (Number(it.discount) || 0), 0);
  const taxableSubtotal = Math.max(0, subTotal - totalDiscount);
  const totalTax = itemsList.reduce((sum, it) => {
    const lineTaxable = Math.max(0, (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0) - (Number(it.discount) || 0));
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

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSuperAdmin) {
      const errors: Record<string, string> = {};

      if (!selectedClientId) {
        errors.organization = 'Select Organization is required';
      }
      if (!customerName.trim()) {
        errors.customerName = 'Customer Name is required';
      }
      if (!newEstimateNumber.trim()) {
        errors.estimateNumber = 'Quotation Number is required';
      }
      if (!newReferenceNumber.trim()) {
        errors.referenceNumber = 'Reference Number is required';
      }
      if (!estimateDate.trim()) {
        errors.estimateDate = 'Date is required';
      }
      if (!expiryDate.trim()) {
        errors.expiryDate = 'Expiry Date is required';
      }
      if (!customerEmail.trim()) {
        errors.customerEmail = 'Email Communications is required';
      }
      if (!customerPhone.trim()) {
        errors.customerPhone = 'Contact Number is required';
      } else if (customerPhone.trim().length !== 10) {
        errors.customerPhone = 'Contact Number must be exactly 10 digits';
      }
      if (!customerLocation.trim()) {
        errors.customerLocation = 'Address is required';
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
    } else {
      if (!customerName.trim() && !customerCompany.trim()) {
        showToast('error', 'Select Client / Customer', 'Please select or enter a client company name.');
        return;
      }
    }

    if (itemsList.length === 0) {
      showToast('error', 'Add Items', 'Please add at least one line item.');
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

    const payload: CreateQuoteRequest = {
      referenceNumber: (newReferenceNumber || `REF-${Math.floor(1000 + Math.random() * 9000)}`).trim(),
      date: estimateDate ? ddmmyyyyToIso(estimateDate) : new Date().toISOString().split('T')[0],
      expiryDate: expiryDate ? ddmmyyyyToIso(expiryDate) : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      customerId: targetCustomerId,
      productName: (projectName || selectedProductSuiteName || 'Quotation').trim(),
      discountAmount: totalDiscount > 0 ? totalDiscount : undefined,
      notes: newNotes.trim() || undefined,
      termsAndConditions: 'Valid for 30 days',
      items: itemsList.map((it) => ({
        description: it.description.trim() || 'Service Line',
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitPrice: Math.max(0, Number(it.unitPrice) || 0),
        taxRate: Number(it.taxPercent) || 18,
      })),
    };

    try {
      setIsSubmitting(true);
      const res = await quoteApi.createQuote(payload);
      if (res && res.data) {
        showToast('success', `${singularTerm} Created`, `${singularTerm} #${res.data.estimateNumber || newEstimateNumber} created successfully.`);
        handleCloseCreate();

        // Reset Form
        setNewEstimateNumber(`EST-${Math.floor(10000 + Math.random() * 90000)}`);
        setNewReferenceNumber(`REF-${Math.floor(1000 + Math.random() * 9000)}`);
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

        // Refresh quote list from backend
        fetchQuotes();
      }
    } catch (err: any) {
      console.error('Failed to create quote:', err);
      showToast('error', 'Creation Failed', err?.response?.data?.error?.message || 'Could not create quote.');
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
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ACCEPTED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            DRAFT
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-[#33077C]/10 text-[#33077C] border border-[#33077C]/25">
            <span className="w-1.5 h-1.5 rounded-full bg-[#33077C]"></span>
            SENT
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            EXPIRED
          </span>
        );
      case 'DECLINED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            DECLINED
          </span>
        );
      default:
        return null;
    }
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

    const handlePrintQuotePdf = async () => {
      try {
        setIsGeneratingPdf(true);
        const blob = await pdf(
          <EstimatePDFDocument
            quotation={activeQuote}
            documentTitle={singularTerm}
            sellerDetails={getSellerDetails()}
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
                <span className="text-slate-500 font-medium w-36">{singularTerm} Number:</span>
                <span className="font-bold text-slate-900">{activeQuote.estimateNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium w-36">{singularTerm} Date:</span>
                <span className="font-semibold text-slate-800">{activeQuote.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium w-36">Valid Until:</span>
                <span className="font-semibold text-slate-800">{activeQuote.expiryDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium w-36">Reference:</span>
                <span className="font-bold text-slate-800">{activeQuote.referenceNumber}</span>
              </div>
            </div>

            {/* Right: Company Logo */}
            <div className="flex items-center sm:justify-end print:justify-end gap-4 min-w-0 flex-1">
              <img
                src={quotationFromLogo || activeOrgDetails?.logo || "/yaa-creations-logo.png"}
                alt={quotationFromCompany || activeOrgDetails?.name || "Company Logo"}
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
                  <span className="text-slate-700 flex-1">{quotationFromCompany || activeOrgDetails?.name || 'Company Name'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>GSTIN / Tax ID</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{quotationFromGst || activeOrgDetails?.gstNumber || 'N/A'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>PAN Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{quotationFromPan || activeOrgDetails?.panNumber || 'N/A'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Phone Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{quotationFromPhone || activeOrgDetails?.phone || 'N/A'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Email</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{quotationFromEmail || activeOrgDetails?.email || 'N/A'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Company Address</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{quotationFromAddress || activeOrgDetails?.address || 'N/A'}</span>
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
                  <span className="text-slate-700 flex-1">{activeQuote.customerCompany || activeQuote.customerName || 'Client'}</span>
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
                    <span>Phone Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeQuote.customerPhone || 'N/A'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Email</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeQuote.customerEmail || 'N/A'}</span>
                </div>
                {activeQuote.customerLocation && (
                  <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                    <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                      <span>Address / Location</span>
                      <span>:</span>
                    </span>
                    <span className="text-slate-700 flex-1">{activeQuote.customerLocation}</span>
                  </div>
                )}
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
                  <div className="flex items-center justify-end gap-2 text-xs text-slate-600 font-semibold">
                    <span className="text-slate-400">Date of Signing:</span>
                    <span className="font-bold text-slate-900">{activeQuote.date}</span>
                  </div>

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
                New {singularTerm}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 font-medium mt-0.5">
                Create, configure, and issue a formal project {lowerSingularTerm} and proposal.
              </p>
            </div>
          </div>
        </div>

        {/* Full-Page Form Canvas */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-8">
          <form noValidate onSubmit={handleCreateQuote} className="space-y-6">
            {/* ===================================================================
                SUPER ADMIN FORM: Flat 3-column Grid (Restored)
                =================================================================== */}
            {isSuperAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Row 1, Col 1: Select Organization */}
                <div className="relative" ref={companyProductDropdownRef}>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Select Organization <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div
                    onClick={() => {
                      setIsCompanyProductDropdownOpen(!isCompanyProductDropdownOpen);
                      setIsProjectDropdownOpen(false);
                    }}
                    className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium flex items-center justify-between cursor-pointer transition-all ${
                      formErrors.organization
                        ? 'border-red-500 ring-4 ring-red-500/10'
                        : isCompanyProductDropdownOpen
                        ? 'border-[#4309A2] ring-4 ring-[#4309A2]/10 text-slate-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className={selectedClientId ? 'text-slate-800 font-semibold truncate' : 'text-slate-400 font-medium truncate'}>
                      {selectedClientId
                        ? (() => {
                          const c = availableClients.find((cl) => cl.id === selectedClientId);
                          return c ? (c.company || c.name) : 'Select Organization';
                        })()
                        : 'Select Organization'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isCompanyProductDropdownOpen ? 'rotate-180 text-[#33077C]' : ''
                        }`}
                    />
                  </div>
                  {formErrors.organization && (
                    <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.organization}</p>
                  )}

                  {isCompanyProductDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200/90 z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto p-1 space-y-0.5">
                      {availableClients.map((client) => {
                        const isSelected = selectedClientId === client.id;
                        return (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              handleClientSelect(client.id);
                              if (formErrors.organization) setFormErrors((prev) => ({ ...prev, organization: '' }));
                              setIsCompanyProductDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs sm:text-[13px] transition-colors cursor-pointer flex items-center justify-between ${isSelected
                                ? 'bg-[#33077C]/10 text-[#33077C] font-bold'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                          >
                            <span>{client.company || client.name}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#33077C] stroke-[2.5]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Row 1, Col 2: Customer Name */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Customer Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (formErrors.customerName) setFormErrors((prev) => ({ ...prev, customerName: '' }));
                    }}
                    placeholder="Enter customer name"
                    className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                      formErrors.customerName
                        ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                  />
                  {formErrors.customerName && (
                    <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.customerName}</p>
                  )}
                </div>

                {/* Row 1, Col 3: Quotation Number */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    {singularTerm} Number <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEstimateNumber}
                    onChange={(e) => {
                      setNewEstimateNumber(e.target.value);
                      if (formErrors.estimateNumber) setFormErrors((prev) => ({ ...prev, estimateNumber: '' }));
                    }}
                    placeholder="e.g. EST-12345"
                    className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                      formErrors.estimateNumber
                        ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                  />
                  {formErrors.estimateNumber && (
                    <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.estimateNumber}</p>
                  )}
                </div>

                {/* Row 2, Col 1: Reference Number */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Reference Number <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={newReferenceNumber}
                    onChange={(e) => {
                      setNewReferenceNumber(e.target.value);
                      if (formErrors.referenceNumber) setFormErrors((prev) => ({ ...prev, referenceNumber: '' }));
                    }}
                    placeholder="e.g. REF-1234"
                    className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                      formErrors.referenceNumber
                        ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                  />
                  {formErrors.referenceNumber && (
                    <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.referenceNumber}</p>
                  )}
                </div>

                {/* Row 2, Col 2: Date */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Date <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={estimateDate}
                      onChange={(e) => {
                        setEstimateDate(e.target.value);
                        if (formErrors.estimateDate) setFormErrors((prev) => ({ ...prev, estimateDate: '' }));
                      }}
                      className={`w-full h-11 pl-4 pr-11 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                        formErrors.estimateDate
                          ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                          : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                      }`}
                    />
                    <label className="absolute right-3 text-slate-400 hover:text-[#33077C] cursor-pointer transition-colors p-1">
                      <Calendar className="w-4 h-4" />
                      <input
                        type="date"
                        value={ddmmyyyyToIso(estimateDate)}
                        onChange={(e) => {
                          if (e.target.value) {
                            setEstimateDate(isoToDdmmyyyy(e.target.value));
                            if (formErrors.estimateDate) setFormErrors((prev) => ({ ...prev, estimateDate: '' }));
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  </div>
                  {formErrors.estimateDate && (
                    <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.estimateDate}</p>
                  )}
                </div>

                {/* Row 2, Col 3: Expiry Date */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Expiry Date <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={expiryDate}
                      onChange={(e) => {
                        setExpiryDate(e.target.value);
                        if (formErrors.expiryDate) setFormErrors((prev) => ({ ...prev, expiryDate: '' }));
                      }}
                      className={`w-full h-11 pl-4 pr-11 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                        formErrors.expiryDate
                          ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                          : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                      }`}
                    />
                    <label className="absolute right-3 text-slate-400 hover:text-[#33077C] cursor-pointer transition-colors p-1">
                      <Calendar className="w-4 h-4" />
                      <input
                        type="date"
                        value={ddmmyyyyToIso(expiryDate)}
                        onChange={(e) => {
                          if (e.target.value) {
                            setExpiryDate(isoToDdmmyyyy(e.target.value));
                            if (formErrors.expiryDate) setFormErrors((prev) => ({ ...prev, expiryDate: '' }));
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  </div>
                  {formErrors.expiryDate && (
                    <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.expiryDate}</p>
                  )}
                </div>

                {/* Row 3, Col 1: Email Communications */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Email Communications <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => {
                      setCustomerEmail(e.target.value);
                      if (formErrors.customerEmail) setFormErrors((prev) => ({ ...prev, customerEmail: '' }));
                    }}
                    placeholder="e.g. client@example.com"
                    className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                      formErrors.customerEmail
                        ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                  />
                  {formErrors.customerEmail && (
                    <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.customerEmail}</p>
                  )}
                </div>

                {/* Row 3, Col 2: Contact Number */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Contact Number <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setCustomerPhone(val);
                      if (formErrors.customerPhone) setFormErrors((prev) => ({ ...prev, customerPhone: '' }));
                    }}
                    placeholder="e.g. 9876543210"
                    className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                      formErrors.customerPhone
                        ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                  />
                  {formErrors.customerPhone && (
                    <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.customerPhone}</p>
                  )}
                </div>

                {/* Row 3, Col 3: Address */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Address <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerLocation}
                    onChange={(e) => {
                      setCustomerLocation(e.target.value);
                      if (formErrors.customerLocation) setFormErrors((prev) => ({ ...prev, customerLocation: '' }));
                    }}
                    placeholder="Enter complete address"
                    className={`w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
                      formErrors.customerLocation
                        ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
                    }`}
                  />
                  {formErrors.customerLocation && (
                    <p className="text-[11px] font-medium text-red-500 mt-1">{formErrors.customerLocation}</p>
                  )}
                </div>

                {/* Super Admin: Note */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Note
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

            {/* ===================================================================
                ADMIN PANEL: TWO-CARD LAYOUT: Sale Configuration (LEFT) + Client & Billing (RIGHT)
                =================================================================== */}
            {!isSuperAdmin && (
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
                      onClick={() => setIsEditingFrom(!isEditingFrom)}
                      className="h-8 px-3.5 bg-white hover:bg-slate-100 text-slate-800 border border-transparent rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all duration-200 cursor-pointer select-none active:scale-[0.98]"
                    >
                      {isEditingFrom ? 'Done' : 'Edit'}
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
                            {quotationFromPan && (
                              <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                                <span className="font-bold text-slate-800">PAN Number</span>
                                <span className="text-slate-700">: {quotationFromPan}</span>
                              </div>
                            )}
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
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quotation Number</label>
                            <input
                              type="text"
                              value={newEstimateNumber}
                              onChange={(e) => setNewEstimateNumber(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quotation Date</label>
                            <input
                              type="text"
                              placeholder="dd/mm/yyyy"
                              value={estimateDate}
                              onChange={(e) => setEstimateDate(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Date</label>
                            <input
                              type="text"
                              placeholder="dd/mm/yyyy"
                              value={expiryDate}
                              onChange={(e) => setExpiryDate(e.target.value)}
                              className="w-full mt-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reference Number</label>
                            <input
                              type="text"
                              value={newReferenceNumber}
                              onChange={(e) => setNewReferenceNumber(e.target.value)}
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
                        <button
                          type="button"
                          onClick={() => {
                            if (isAddFieldModalOpen) {
                              if (newFieldLabel.trim()) {
                                setCustomQuoteFields([
                                  ...customQuoteFields,
                                  { id: `custom_${Date.now()}`, label: newFieldLabel.trim(), value: newFieldValue, type: 'text' }
                                ]);
                                setNewFieldLabel('');
                                setNewFieldValue('');
                                setIsAddFieldModalOpen(false);
                              }
                            } else {
                              setIsAddFieldModalOpen(true);
                            }
                          }}
                          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#33077C] hover:bg-[#432eb5] text-white text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer select-none"
                        >
                          <Plus className="w-4 h-4" strokeWidth={2.5} />
                          <span>{isAddFieldModalOpen ? 'Add Item' : 'Add Field'}</span>
                        </button>
                      </div>

                      <div className="space-y-3.5 text-[13px]">
                        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                          <span className="font-bold text-slate-800">Quotation Number</span>
                          <span className="text-slate-700">: {newEstimateNumber}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                          <span className="font-bold text-slate-800">Quotation Date</span>
                          <span className="text-slate-700">: {estimateDate}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                          <span className="font-bold text-slate-800">Expiry Date</span>
                          <span className="text-slate-700">: {expiryDate}</span>
                        </div>
                        <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                          <span className="font-bold text-slate-800">Reference Number</span>
                          <span className="text-slate-700">: {newReferenceNumber || 'REF-QUOTATION-1'}</span>
                        </div>
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
                          <div className="flex-1 grid grid-cols-2 gap-3">
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
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
                  {/* Card Header */}
                  <div className="px-7 py-4.5 bg-[#33077C] text-white flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <h2 className="text-base font-bold text-white tracking-tight">
                        Client &amp; Billing Party
                      </h2>
                    </div>
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
                  </div>

                  {/* Card Body */}
                  <div className="p-8 space-y-8 flex-1 flex flex-col">
                    {/* Client Searchable Dropdown */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Client / Customer <span className="text-rose-500">*</span>
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
                                : (customerCompany || clientSearchQuery)
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              setClientSearchQuery(val);
                              if (!isCompanyProductDropdownOpen) setIsCompanyProductDropdownOpen(true);
                              if (customerCompany && val !== customerCompany) {
                                setSelectedClientId('');
                                setCustomerCompany('');
                              }
                            }}
                            onFocus={() => {
                              setIsCompanyProductDropdownOpen(true);
                              if (customerCompany && !clientSearchQuery) {
                                setClientSearchQuery(customerCompany);
                              }
                            }}
                            placeholder="Search or select client / customer..."
                            className={`w-full h-11 pl-11 pr-16 bg-white border rounded-xl text-sm font-semibold transition-all shadow-2xs outline-none ${
                              isCompanyProductDropdownOpen
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
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isCompanyProductDropdownOpen ? 'rotate-180 text-[#4309A2]' : ''
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Dropdown Menu Popup: Direct List of Clients with filtered search */}
                        {isCompanyProductDropdownOpen && (
                          <div className="dropdown-menu absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 w-full min-w-[320px] space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                            <div className="max-h-60 overflow-y-auto space-y-1 pt-0.5">
                              {(() => {
                                const q = clientSearchQuery.trim().toLowerCase();
                                const list = availableClients.filter(
                                  (c) =>
                                    !q ||
                                    c.name.toLowerCase().includes(q) ||
                                    c.company.toLowerCase().includes(q) ||
                                    c.email.toLowerCase().includes(q)
                                );
                                if (list.length === 0) {
                                  return (
                                    <div className="py-4 text-center text-xs text-slate-400">
                                      No matching clients found for "{clientSearchQuery}".
                                    </div>
                                  );
                                }
                                return list.map((client) => {
                                  const isSelected = selectedClientId === client.id;
                                  const displayName = client.company || client.name;
                                  return (
                                    <button
                                      key={client.id}
                                      type="button"
                                      onClick={() => {
                                        handleClientSelect(client.id);
                                        setClientSearchQuery(displayName);
                                        setIsCompanyProductDropdownOpen(false);
                                        showToast('success', 'Client Selected', `Selected "${displayName}".`);
                                      }}
                                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                        isSelected
                                          ? 'bg-[#33077C]/10 text-[#33077C] font-bold'
                                          : 'hover:bg-slate-50 text-slate-800 font-medium'
                                      }`}
                                    >
                                      <div className="truncate">
                                        <div className="font-semibold text-slate-900 truncate">{displayName}</div>
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
                              <span className="font-bold text-slate-800">Company Name</span>
                              <span className="text-slate-700">: {customerCompany || 'YaaCreations'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">GSTIN / Tax ID</span>
                              <span className="text-slate-700">: {customerGstId || '27AABCT8892K1Z5'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">PAN Number</span>
                              <span className="text-slate-700">: {customerPan || 'ABCDE1234F'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Phone Number</span>
                              <span className="text-slate-700">: {customerPhone || '+91 98765 43210'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Email</span>
                              <span className="text-slate-700">: {customerEmail || 'yaaadmin@gmail.com'}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Industry</span>
                              <span className="text-slate-700">: Media, Branding &amp; Digital Creative Tech</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                              <span className="font-bold text-slate-800">Location / Region</span>
                              <span className="text-slate-700">: {customerLocation || 'Hyderabad, TG'}</span>
                            </div>
                          </div>
                        </div>
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
            )}

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
                      <col className="w-[120px]" />
                      <col className="w-[130px]" />
                      <col className="w-[75px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#33077C] text-[11px] font-bold text-white tracking-wider uppercase">
                        <th className="py-4 px-5 text-left border border-[#33077C]/40 bg-[#33077C] text-white">PROJECTS</th>
                        <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">QTY</th>
                        <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">GST (%)</th>
                        <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">PRICE</th>
                        <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">DISCOUNT (₹)</th>
                        <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">TOTAL</th>
                        <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {itemsList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center bg-slate-50/40 border border-slate-200">
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
                            {/* 1. Projects / Item Name & Description (Organization Dropdown) */}
                            <td className="px-5 py-4 align-top border border-slate-200">
                              <div className="space-y-1.5">
                                <div
                                  ref={(el) => {
                                    itemOrgTriggerRefs.current[item.id] = el;
                                  }}
                                  className="relative"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (openItemOrgDropdownId === item.id) {
                                        setOpenItemOrgDropdownId(null);
                                        setItemOrgDropdownRect(null);
                                      } else {
                                        const rect = itemOrgTriggerRefs.current[item.id]?.getBoundingClientRect();
                                        if (rect) {
                                          setItemOrgDropdownRect({
                                            top: rect.bottom + window.scrollY,
                                            left: rect.left + window.scrollX,
                                            width: rect.width,
                                          });
                                        }
                                        setOpenItemOrgDropdownId(item.id);
                                      }
                                    }}
                                    style={{ borderRadius: '4px' }}
                                    className={`item-org-dropdown-trigger w-full h-10 px-3.5 bg-white border rounded-xl text-xs font-semibold text-left flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
                                      openItemOrgDropdownId === item.id
                                        ? 'border-[#4309A2] ring-3 ring-[#4309A2]/10 text-slate-900'
                                        : 'border-slate-200 hover:border-slate-300 text-slate-800'
                                    }`}
                                  >
                                    <span className="truncate block font-semibold text-slate-800">
                                      {item.description || <span className="text-slate-400 font-normal">Select Organization...</span>}
                                    </span>
                                    <ChevronDown
                                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-1.5 ${
                                        openItemOrgDropdownId === item.id ? 'rotate-180 text-[#4309A2]' : ''
                                      }`}
                                    />
                                  </button>

                                  {/* Custom Floating Dropdown Menu */}
                                  {openItemOrgDropdownId === item.id && itemOrgDropdownRect && (
                                    <div
                                      style={{
                                        top: `${itemOrgDropdownRect.top + 6}px`,
                                        left: `${itemOrgDropdownRect.left}px`,
                                        width: `${Math.max(280, itemOrgDropdownRect.width)}px`,
                                      }}
                                      className="item-org-dropdown-popup fixed z-[999] bg-white rounded-2xl border border-slate-200 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100"
                                    >
                                      <div className="max-h-60 overflow-y-auto space-y-0.5">
                                        {availableClients.length === 0 ? (
                                          <div className="py-3 text-center text-xs text-slate-400 font-medium">
                                            No organizations found
                                          </div>
                                        ) : (
                                          availableClients.map((org) => {
                                            const orgName = org.company || org.name;
                                            const isSelected = item.description === orgName;
                                            return (
                                              <button
                                                key={org.id}
                                                type="button"
                                                onClick={() => {
                                                  handleItemChange(item.id, 'description', orgName);
                                                  setOpenItemOrgDropdownId(null);
                                                  setItemOrgDropdownRect(null);
                                                }}
                                                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                                  isSelected
                                                    ? 'bg-[#33077C]/10 text-[#33077C] font-bold'
                                                    : 'hover:bg-slate-50 text-slate-700 font-medium'
                                                }`}
                                              >
                                                <span className="truncate">{orgName}</span>
                                                {isSelected && <Check className="w-4 h-4 text-[#33077C] stroke-[2.5] shrink-0" />}
                                              </button>
                                            );
                                          })
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
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

                            {/* 5. DISCOUNT (₹) */}
                            <td className="px-2 py-4 align-top border border-slate-200">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.discount}
                                onChange={(e) => handleItemChange(item.id, 'discount', Number(e.target.value))}
                                className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-center text-slate-800 focus:border-[#4309A2] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                              />
                            </td>

                            {/* 6. TOTAL */}
                            <td className="px-2 py-4 align-top border border-slate-200">
                              <div className="h-10 flex items-center justify-center">
                                <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/90 font-bold text-xs shadow-2xs font-sans min-w-[90px] text-center">
                                  ₹{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </td>

                            {/* 7. ACTION */}
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
            {!isSuperAdmin && (
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
                    <span>Save {singularTerm}</span>
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
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
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
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">ORGANIZATION & CODE</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">QUOTATION NUM</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CONTACT INFO</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">STATUS</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">AMOUNT</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
                  </>
                ) : (
                  <>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">{singularTerm.toUpperCase()}</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CLIENT & REFERENCE</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">SOURCE & OFFERINGS</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">STATUS & VALIDITY</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-right">AMOUNT</th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoadingQuotes ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 border border-slate-200">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#33077C]" />
                    <p className="font-bold text-slate-700 text-sm">Loading {lowerPluralTerm}...</p>
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 border border-slate-200">
                    <FileText className="w-9 h-9 mx-auto mb-2 opacity-30 text-orange-400" />
                    <p className="font-bold text-slate-700 text-sm">No {lowerPluralTerm} found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Generate a new {lowerSingularTerm} or adjust your search parameters.</p>
                  </td>
                </tr>
              ) : (
                pagedQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {isSuperAdmin ? (
                      <>
                        {/* 1. Organization & Code (as per reference design) */}
                        <td className="py-4 px-5 border border-slate-200">
                          {(() => {
                            const org = getOrgInfo(quote.customerCompany || 'YaaCreations');
                            return (
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                  {org.initials}
                                </div>
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
                              </div>
                            );
                          })()}
                        </td>

                        {/* 2. Quotation Num */}
                        <td className="py-4 px-5 border border-slate-200">
                          <div>
                            <button
                              onClick={() => setSelectedQuote(quote)}
                              className="font-bold text-slate-900 hover:text-[#4309A2] text-sm transition-colors cursor-pointer text-left block"
                            >
                              {quote.estimateNumber}
                            </button>
                            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                              Ref: {quote.referenceNumber}
                            </div>
                          </div>
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
                            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                              {quote.productName || quote.customerCompany || 'Direct Client'}
                            </div>
                          </div>
                        </td>

                        {/* Client & Reference */}
                        <td className="py-4 px-5 border border-slate-200">
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-[13px] tracking-tight">
                              {quote.customerName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {quote.customerName} &bull; Ref: {quote.referenceNumber}
                            </div>
                          </div>
                        </td>

                        {/* Source & Offerings */}
                        <td className="py-4 px-5 border border-slate-200">
                          <div className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            <span>Direct Quotation</span>
                          </div>
                          {quote.productName && (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#33077C]"></span>
                              <span>{quote.productName}</span>
                            </div>
                          )}
                        </td>

                        {/* Status & Validity */}
                        <td className="py-4 px-5 border border-slate-200">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(quote.status)}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Expires: {quote.expiryDate}</span>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-5 border border-slate-200 text-right">
                          <div className="font-bold text-slate-900 text-sm font-sans">
                            &#8377;{quote.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Dated: {quote.date}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalRecords > 0 && (
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
      )}
      {/* Action Dropdown Menu Portal / Fixed Overlay */}
      {openActionMenuId && actionDropdownPos && (() => {
        const targetQuote = quotes.find((q) => q.id === openActionMenuId);
        if (!targetQuote) return null;

        return (
          <div
            style={{
              position: 'fixed',
              ...(actionDropdownPos.bottom !== undefined
                ? { bottom: `${actionDropdownPos.bottom}px` }
                : { top: `${actionDropdownPos.top}px` }),
              right: `${actionDropdownPos.right}px`,
            }}
            className="w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[9999] action-dropdown-popup animate-in fade-in zoom-in-95 duration-100 text-left"
          >
            {/* 1. View */}
            <button
              type="button"
              onClick={() => {
                setOpenActionMenuId(null);
                setActionDropdownPos(null);
                setSelectedQuote(targetQuote);
              }}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <span className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Eye className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="group-hover:text-slate-900 transition-colors text-[13px]">View</span>
            </button>

            {/* 2. Send as an mail */}
            <button
              type="button"
              onClick={() => {
                showToast('success', 'Email Sent', `Quotation dispatched to ${targetQuote.customerEmail}`);
                setOpenActionMenuId(null);
                setActionDropdownPos(null);
              }}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <span className="w-7 h-7 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Mail className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="group-hover:text-slate-900 transition-colors text-[13px]">Send</span>
            </button>

            {/* 3. Print */}
            <button
              type="button"
              onClick={() => {
                setOpenActionMenuId(null);
                setActionDropdownPos(null);
                handlePrintEstimatePdf(targetQuote);
              }}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <span className="w-7 h-7 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Printer className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="group-hover:text-slate-900 transition-colors text-[13px]">Print</span>
            </button>

            {/* 4a. Convert to Proforma Invoice */}
            {targetQuote.status !== 'DECLINED' && targetQuote.status !== 'EXPIRED' && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    setOpenActionMenuId(null);
                    setActionDropdownPos(null);
                    showToast('info', 'Converting Quotation', `Converting #${targetQuote.estimateNumber} to proforma invoice...`);
                    const res = await quoteApi.convertToProformaInvoice(targetQuote.id);
                    if (res) {
                      showToast('success', 'Quotation Converted', `Successfully converted #${targetQuote.estimateNumber} to Proforma Invoice.`);
                      fetchQuotes();
                    }
                  } catch (err: any) {
                    console.error('Failed to convert quotation:', err);
                    showToast('error', 'Conversion Failed', err?.response?.data?.error?.message || 'Could not convert quote.');
                  }
                }}
                className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <span className="w-7 h-7 rounded-full bg-[#6366F1] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <FileText className="w-3.5 h-3.5 stroke-[2.2]" />
                </span>
                <span className="group-hover:text-slate-900 transition-colors text-[13px]">Convert to Proforma</span>
              </button>
            )}

            {/* 4b. Convert to Invoice */}
            {targetQuote.status !== 'DECLINED' && targetQuote.status !== 'EXPIRED' && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    setOpenActionMenuId(null);
                    setActionDropdownPos(null);
                    showToast('info', 'Converting Quotation', `Converting #${targetQuote.estimateNumber} to invoice...`);
                    const res = await quoteApi.convertQuote(targetQuote.id, { target: 'INVOICE' });
                    if (res) {
                      showToast('success', 'Quotation Converted', `Successfully converted #${targetQuote.estimateNumber} to Invoice.`);
                      fetchQuotes();
                    }
                  } catch (err: any) {
                    console.error('Failed to convert quotation:', err);
                    showToast('error', 'Conversion Failed', err?.response?.data?.error?.message || 'Could not convert quote.');
                  }
                }}
                className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <span className="w-7 h-7 rounded-full bg-[#33077C] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <FileSpreadsheet className="w-3.5 h-3.5 stroke-[2.2]" />
                </span>
                <span className="group-hover:text-slate-900 transition-colors text-[13px]">Convert to Invoice</span>
              </button>
            )}

            <div className="h-px bg-slate-100 my-1" />

            {/* 5. Delete */}
            <button
              type="button"
              onClick={() => {
                setOpenActionMenuId(null);
                setActionDropdownPos(null);
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
              left: `${statusDropdownPos.left}px`,
            }}
            className="min-w-[155px] bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-[9999] status-dropdown-popup animate-in fade-in zoom-in-95 duration-100 text-left"
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
