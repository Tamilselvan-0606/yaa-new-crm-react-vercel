import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Printer,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  IndianRupee,
  TrendingUp,
  Calendar,
  Building2,
  User,
  ArrowRight,
  MoreVertical,
  X,
  Check,
  Download,
  Share2,
  Forward,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ShoppingBag,
  ShoppingCart,
  Ban,
  Calculator,
  Settings,
  Image as ImageIcon,
  FileUp,
  FileEdit,
  AlignLeft,
  Paperclip,
  PlusCircle,
  ArrowLeft,
  Receipt,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import {
  useSalesManagementStore,
  SaleProductItem,
  SalesCustomer,
  SaleTransaction,
  InventoryStockItem,
} from '../../../store/useSalesManagementStore';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { DeleteConfirmationModal } from '../../../components/common/DeleteConfirmationModal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exportTableToExcel } from '../../../utils/excelExport';
import { printBusinessDocument, printTableReport } from '../../../utils/printUtils';
import { SaleActionDropdown } from '../utils/SaleActionDropdown';
import {
  commerceProformaApi,
  mapApiProformaToSaleProforma,
  mapSaleProformaToPayload,
  ProformaFilterParams,
  customerApi,
  mapApiCustomerToSalesCustomer,
  stockApi,
  mapApiStockToInventoryStockItem,
  productApi,
  mapApiProductToProductItem,
  ProductItemModel,
  ExtendedProformaItem,
  SaleProformaInvoice,
  UUID_REGEX,
} from '../../../api';
import { useAppDispatch } from '../../../hooks/redux';
import { baseApi } from '../../../api/baseApi';
import { store } from '../../../store/store';
import { isValidIndianPhone, normalizeIndianPhoneTo10Digits } from '../../../utils/validation';
import {
  commerceSaleOrderApi,
  SaleOrderRecord,
  mapSaleOrderRecordToPayload,
} from '../../../api/commerce/saleOrderApi';
import {
  syncConvertedOrderToStorage,
  syncConvertedInvoiceToStorage,
  syncProformaStatusInStorage,
  recordDocumentConversion,
  findDocumentLineage,
  initializeWorkflowIntegrity,
} from '../../../utils/salesDocumentWorkflow';
import { DocumentLineageBadges } from '../../../components/common/DocumentLineageBadges';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { FormLabel, FORM_INPUT_CLS, FORM_SELECT_CLS, FORM_TEXTAREA_CLS, getFormInputCls } from '../utils/formUtils';

// Helper for dd/mm/yyyy <-> YYYY-MM-DD
const isoToDdmmyyyy = (iso?: string): string => {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
};

const ddmmyyyyToIso = (dmy?: string): string => {
  if (!dmy) return '';
  const parts = dmy.split('/');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dmy;
};

const STATE_OPTIONS = [
  'Select State',
  '33-Tamil Nadu',
  '29-Karnataka',
  '27-Maharashtra',
  '32-Kerala',
  '36-Telangana',
  '37-Andhra Pradesh',
  '07-Delhi',
  '24-Gujarat',
  '19-West Bengal',
  '09-Uttar Pradesh',
  '08-Rajasthan',
  '03-Punjab',
  '23-Madhya Pradesh',
  'Other',
];

const UNIT_OPTIONS = [
  'NONE',
  'PCS',
  'KG',
  'BOX',
  'LTR',
  'BAG',
  'PACK',
  'DOZEN',
  'CARTON',
  'CAN',
  'SET',
  'QUINTAL',
  'MTR',
];

const TAX_RATE_OPTIONS = [
  { label: 'Select Tax', rate: 0 },
  { label: 'Exempted (0%)', rate: 0 },
  { label: 'GST @ 0%', rate: 0 },
  { label: 'GST @ 0.1%', rate: 0.1 },
  { label: 'GST @ 0.25%', rate: 0.25 },
  { label: 'GST @ 1.5%', rate: 1.5 },
  { label: 'GST @ 3%', rate: 3 },
  { label: 'GST @ 5%', rate: 5 },
  { label: 'GST @ 12%', rate: 12 },
  { label: 'GST @ 18%', rate: 18 },
  { label: 'GST @ 28%', rate: 28 },
  { label: 'GST @ 40%', rate: 40 },
];

const PERIOD_FILTER_OPTIONS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Quarter', value: 'this_quarter' },
  { label: 'This Year', value: 'this_year' },
];

const checkDateMatchesPeriod = (dateStr?: string, period?: string): boolean => {
  if (!period || period === 'all' || period === 'All Time') return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  switch (period) {
    case 'today':
      return itemDay.getTime() === startOfDay.getTime();
    case 'this_week': {
      const dayOfWeek = now.getDay();
      const firstDayOfWeek = new Date(startOfDay);
      firstDayOfWeek.setDate(startOfDay.getDate() - dayOfWeek);
      return itemDay >= firstDayOfWeek && itemDay <= now;
    }
    case 'this_month':
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    case 'last_month': {
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
    }
    case 'this_quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const itemQuarter = Math.floor(d.getMonth() / 3);
      return d.getFullYear() === now.getFullYear() && currentQuarter === itemQuarter;
    }
    case 'this_year':
      return d.getFullYear() === now.getFullYear();
    default:
      return true;
  }
};

const STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Open', value: 'Open', dotColor: '#f59e0b' },
  { label: 'Converted', value: 'Converted', dotColor: '#10b981' },
  { label: 'Cancelled', value: 'Cancelled', dotColor: '#ef4444' },
];

export interface TableColumnSettings {
  showItemCategory: boolean;
  showItemCode: boolean;
  showHsnSac: boolean;
  showDescription: boolean;
  showDiscount: boolean;
}

export interface ProformaTabItem {
  id: string;
  title: string;
  num: number;
  formData: {
    customerId: string;
    partyName: string;
    customerPhone: string;
    customerEmail: string;
    customerCompany: string;
    billingAddress: string;
    proformaNo: string;
    referenceNo: string;
    date: string;
    validUntil: string;
    stateOfSupply: string;
    items: ExtendedProformaItem[];
    notes: string;
    terms: string;
  };
  editingProforma?: SaleProformaInvoice | null;
  enableRoundOff?: boolean;
  manualRoundOff?: number | null;
  columnSettings?: TableColumnSettings;
}

interface ProformaInvoiceViewProps {
  initialMode?: 'list' | 'form';
}

export const ProformaInvoiceView: React.FC<ProformaInvoiceViewProps> = ({
  initialMode = 'list',
}) => {
  const navigate = useNavigate();
  const { customers, stocks, saveCustomer, saveSale } = useSalesManagementStore();

  const dispatch = useAppDispatch();
  const [liveProformas, setLiveProformas] = useState<SaleProformaInvoice[]>([]);
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);
  const [liveCustomers, setLiveCustomers] = useState<SalesCustomer[]>([]);
  const [liveStocks, setLiveStocks] = useState<InventoryStockItem[]>([]);
  const [liveProducts, setLiveProducts] = useState<ProductItemModel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Proforma state with localStorage persistence as offline fallback
  const [proformaList, setProformaList] = useState<SaleProformaInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('yaa_crm_proforma_invoices');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (p) =>
              p.id !== 'pro_1' &&
              p.id !== 'pro_2' &&
              !String(p.id).startsWith('pro_') &&
              !String(p.partyName || '').includes('Keerthivasan') &&
              !String(p.partyName || '').includes('Royal Spice')
          );
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const persistProformas = (updated: SaleProformaInvoice[]) => {
    setProformaList(updated);
    try {
      localStorage.setItem('yaa_crm_proforma_invoices', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save proforma invoices', e);
    }
  };

  // View Mode: 'list' vs 'form'
  const [viewMode, setViewMode] = useState<'list' | 'form'>(initialMode);

  useEffect(() => {
    setViewMode(initialMode);
  }, [initialMode]);

  // Search & Filters
  const [searchParams] = useSearchParams();
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingPeriod, setPendingPeriod] = useState('all');
  const [appliedPeriod, setAppliedPeriod] = useState('all');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) {
      setPendingSearch(q);
      setAppliedSearch(q);
    }
  }, [searchParams]);

  // Debounced Search (600ms) - waits until typing completes before triggering API
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = pendingSearch.trim();
      if (trimmed !== appliedSearch) {
        setAppliedSearch(trimmed);
        setPage(1);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [pendingSearch, appliedSearch]);

  // Helper to map UI period names to OpenAPI period values
  const mapPeriodToApiPeriod = (periodStr: string): string => {
    const norm = periodStr.toLowerCase().replace(/\s+/g, '_');
    if (norm.includes('last') && norm.includes('month')) return 'last_month';
    if (norm.includes('month')) return 'this_month';
    if (norm.includes('week')) return 'this_week';
    if (norm.includes('today')) return 'today';
    if (norm.includes('quarter')) return 'this_quarter';
    if (norm.includes('year')) return 'this_year';
    if (norm.includes('all')) return 'all';
    return norm || 'all';
  };

  // Dropdowns & Action Menu
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeConvertDropdownId, setActiveConvertDropdownId] = useState<string | null>(null);
  const [convertDropdownPos, setConvertDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetProforma, setDeleteTargetProforma] = useState<{ id: string; proformaNo: string } | null>(null);
  const [isDeletingProforma, setIsDeletingProforma] = useState(false);
  const [deleteProformaError, setDeleteProformaError] = useState<string | null>(null);

  // Preview / Print Modal
  const [previewProforma, setPreviewProforma] = useState<SaleProformaInvoice | null>(null);

  // Dynamic Table Column Customization State
  const [columnSettings, setColumnSettings] = useState<TableColumnSettings>({
    showItemCategory: false,
    showItemCode: false,
    showHsnSac: false,
    showDescription: false,
    showDiscount: true,
  });
  const [showColumnCustomizePopover, setShowColumnCustomizePopover] = useState(false);

  // Price tax mode: without_tax or with_tax
  const [priceTaxMode, setPriceTaxMode] = useState<'Without Tax' | 'With Tax'>('Without Tax');

  // Bottom action toggles
  const [showTermsSection, setShowTermsSection] = useState(true);
  const [showDescriptionSection, setShowDescriptionSection] = useState(false);
  const [showImageSection, setShowImageSection] = useState(false);
  const [showDocumentSection, setShowDocumentSection] = useState(false);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [attachedDocName, setAttachedDocName] = useState<string | null>(null);

  // Round off
  const [enableRoundOff, setEnableRoundOff] = useState(true);
  const [manualRoundOff, setManualRoundOff] = useState<number | null>(null);

  // Quick Customer Creation Modal
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerCompany, setNewCustomerCompany] = useState('');
  const [newCustomerType, setNewCustomerType] = useState<'Business' | 'Individual'>('Business');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerNameError, setCustomerNameError] = useState('');
  const [customerPhoneError, setCustomerPhoneError] = useState('');

  // Form State
  const [editingProforma, setEditingProforma] = useState<SaleProformaInvoice | null>(null);
  const [partySearchOpen, setPartySearchOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const partySelectRef = useRef<HTMLDivElement>(null);
  const [showShareFooterMenu, setShowShareFooterMenu] = useState(false);

  // Fetch Proforma Invoices from Live Commerce API
  const isFetchingRef = useRef(false);
  const fetchProformas = useCallback(
    async (
      pageNo: number = page,
      size: number = pageSize,
      searchQuery: string = appliedSearch,
      statusVal: string = appliedStatus,
      periodVal: string = appliedPeriod
    ) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsApiLoading(true);
      setApiErrorMessage(null);

      const params: ProformaFilterParams = {
        page_no: pageNo,
        page_size: size,
        pagination_required: true,
        sortOrder: 'desc',
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (statusVal && statusVal !== 'ALL') {
        params.status = statusVal;
      }
      if (periodVal) {
        params.period = mapPeriodToApiPeriod(periodVal);
      }

      try {
        const response = await commerceProformaApi.getProformas(params);
        if (response && (response.success || response.data)) {
          const list = Array.isArray(response.data) ? response.data : [];
          const mapped = list.map(mapApiProformaToSaleProforma);
          setLiveProformas(mapped);
          setTotalApiRecords(response.pagination?.totalRecords ?? mapped.length);
          setTotalApiPages(response.pagination?.totalPages ?? 1);
          setIsApiConnected(true);
        } else {
          throw new Error(response?.message || 'Failed to fetch proforma invoices');
        }
      } catch (err: any) {
        console.warn('Commerce Proformas API notice:', err);
        setIsApiConnected(false);
        setApiErrorMessage(err.message || 'Commerce API not reachable');
        setLiveProformas(proformaListRef.current);
        setTotalApiRecords(proformaListRef.current.length);
        setTotalApiPages(Math.max(1, Math.ceil(proformaListRef.current.length / size)));
      } finally {
        setIsApiLoading(false);
        isFetchingRef.current = false;
      }
    },
    [appliedSearch, appliedStatus, appliedPeriod, page, pageSize]
  );

  // Trigger API fetch on filter/page change
  useEffect(() => {
    fetchProformas(page, pageSize, appliedSearch, appliedStatus, appliedPeriod);
  }, [fetchProformas, page, pageSize, appliedSearch, appliedStatus, appliedPeriod]);

  // Listen for sidebar click event to trigger immediate fresh API fetch
  useEffect(() => {
    const handleSidebarNav = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (
        detail?.path === '/sale-management/sales/proforma' ||
        detail?.id === 'sales-hub-proforma' ||
        detail?.id === 'billing-proforma'
      ) {
        fetchProformas(page, pageSize, appliedSearch, appliedStatus, appliedPeriod);
      }
    };
    window.addEventListener('crm:sidebar-navigate', handleSidebarNav);
    return () => window.removeEventListener('crm:sidebar-navigate', handleSidebarNav);
  }, [fetchProformas, page, pageSize, appliedSearch, appliedStatus, appliedPeriod]);

  // Keep proformaListRef synced
  const proformaListRef = useRef(proformaList);
  useEffect(() => {
    proformaListRef.current = proformaList;
  }, [proformaList]);

  // Initialize workflow integrity & purge mock data on mount
  useEffect(() => {
    initializeWorkflowIntegrity();
    try {
      const raw = localStorage.getItem('yaa_crm_proforma_invoices');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (p) =>
              p.id !== 'pro_1' &&
              p.id !== 'pro_2' &&
              !String(p.partyName || '').includes('Keerthivasan') &&
              !String(p.partyName || '').includes('Royal Spice')
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('yaa_crm_proforma_invoices', JSON.stringify(cleaned));
            setProformaList(cleaned);
          }
        }
      }
    } catch (e) {
      console.warn('Storage purge error:', e);
    }
  }, []);

  // Load live customers, products, and stocks on-demand ONLY when Form Mode is active
  const hasLoadedMasterDataRef = useRef(false);
  useEffect(() => {
    if (viewMode !== 'form' || hasLoadedMasterDataRef.current) return;
    hasLoadedMasterDataRef.current = true;
    let isMounted = true;

    customerApi
      .getCustomers({ pagination_required: false, page_size: 100 })
      .then((res) => {
        if (isMounted && res.data && Array.isArray(res.data)) {
          const mapped = res.data.map(mapApiCustomerToSalesCustomer);
          setLiveCustomers(mapped);
        }
      })
      .catch((err) => console.warn('Customer load:', err));

    stockApi
      .getStocks({ pagination_required: false, page_size: 100 })
      .then((res) => {
        if (isMounted && res.data && Array.isArray(res.data)) {
          const mapped = res.data.map(mapApiStockToInventoryStockItem);
          setLiveStocks(mapped);
        }
      })
      .catch((err) => console.warn('Stock load:', err));

    return () => {
      isMounted = false;
    };
  }, [viewMode]);

  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  // On-demand product search: only calls products API when user is actively searching
  const handleProductSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsSearchingProducts(true);
    try {
      const res = await productApi.getProducts({
        search: trimmed,
        page_size: 30,
        pagination_required: false,
      });
      if (res && res.data && Array.isArray(res.data)) {
        const mapped = res.data.map(mapApiProductToProductItem);
        setLiveProducts((prev) => {
          const map = new Map<string, ProductItemModel>();
          prev.forEach((p) => map.set(p.id, p));
          mapped.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('Failed to search products in ProformaInvoiceView:', err);
    } finally {
      setIsSearchingProducts(false);
    }
  }, []);

  // Live products and live customers for selectors (strictly excluding mock customers)
  const availableCustomers = useMemo(() => {
    if (liveCustomers.length > 0) return liveCustomers;
    return customers.filter(
      (c) =>
        !c.id.startsWith('cust_') &&
        !c.name.includes('Keerthi') &&
        !c.name.includes('Royal Spice') &&
        !c.name.includes('Green Valley')
    );
  }, [liveCustomers, customers]);

  const availableProducts = useMemo(() => {
    const list: Array<{
      productId: string;
      id: string;
      productName: string;
      sku: string;
      unitPrice: number;
      category?: string;
      unit?: string;
      taxPercent?: number;
      hsnCode?: string;
    }> = [];

    const seenIds = new Set<string>();

    const extractTaxPercent = (rateStr?: string | number): number => {
      if (typeof rateStr === 'number') return rateStr;
      if (!rateStr) return 0;
      const numMatch = String(rateStr).match(/(\d+(\.\d+)?)/);
      return numMatch ? parseFloat(numMatch[1]) : 0;
    };

    // 1. Live Products from /commerce/products
    liveProducts.forEach((p) => {
      const pid = String(p.id || '');
      if (pid && !seenIds.has(pid)) {
        seenIds.add(pid);
        list.push({
          productId: pid,
          id: pid,
          productName: p.productName || 'Unnamed Product',
          sku: p.productCode || (p as any).sku || '',
          unitPrice: Number(p.salePrice ?? (p as any).sellingPrice ?? (p as any).unitPrice ?? 0),
          category: p.category || '',
          unit: p.unit || 'PCS',
          taxPercent: extractTaxPercent((p as any).taxRate ?? (p as any).taxPercent),
          hsnCode: p.hsnCode || '',
        });
      }
    });

    // 2. Live Stocks from /commerce/stocks
    liveStocks.forEach((s) => {
      const pid = String(s.productId || s.id || '');
      if (pid && !seenIds.has(pid)) {
        seenIds.add(pid);
        list.push({
          productId: pid,
          id: pid,
          productName: s.productName || 'Unnamed Product',
          sku: s.sku || '',
          unitPrice: Number(s.unitPrice) || 0,
          category: s.category || '',
          unit: s.unit || 'PCS',
          taxPercent: extractTaxPercent((s as any).taxRate ?? (s as any).taxPercent),
          hsnCode: (s as any).hsnCode || '',
        });
      }
    });

    // 3. Fallback from store stocks if both lists are empty
    if (list.length === 0 && Array.isArray(stocks)) {
      stocks.forEach((s) => {
        const pid = String(s.productId || s.id || '');
        if (pid && !seenIds.has(pid)) {
          seenIds.add(pid);
          list.push({
            productId: pid,
            id: pid,
            productName: s.productName || 'Unnamed Product',
            sku: s.sku || '',
            unitPrice: Number(s.unitPrice) || 0,
            category: s.category || '',
            unit: s.unit || 'PCS',
            taxPercent: extractTaxPercent((s as any).taxRate ?? (s as any).taxPercent),
            hsnCode: (s as any).hsnCode || '',
          });
        }
      });
    }

    return list;
  }, [liveProducts, liveStocks, stocks]);

  const productOptions = useMemo(() => {
    return availableProducts.map((s) => ({
      value: s.productId || s.id,
      label: s.productName,
      subLabel: s.sku ? `SKU: ${s.sku} • ₹${s.unitPrice}` : `₹${s.unitPrice}`,
      badge: s.sku || undefined,
    }));
  }, [availableProducts]);

  // Helper to build fresh clean proforma formData (no mock items)
  const createDefaultFormData = (num: number = 1) => {
    const year = new Date().getFullYear();
    const nextCode = `PRO-${year}-${String(num).padStart(4, '0')}`;
    const initialRows: ExtendedProformaItem[] = [
      {
        id: `row_${Date.now()}_1`,
        productId: '',
        productName: '',
        quantity: 1,
        unit: 'NONE',
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        total: 0,
      },
    ];

    return {
      customerId: '',
      partyName: '',
      customerPhone: '',
      customerEmail: '',
      customerCompany: '',
      billingAddress: '',
      proformaNo: nextCode,
      referenceNo: String(num),
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      stateOfSupply: '33-Tamil Nadu',
      items: initialRows,
      notes: 'Thank you for your business inquiry. Prices valid for 30 days.',
      terms: '1. Prices are valid for 30 days from issue date.\n2. Goods once confirmed will be dispatched within 48 hours.\n3. 100% payment on delivery / Net 15 days for verified accounts.',
    };
  };

  // Initial Form Data
  const [formData, setFormData] = useState(() => createDefaultFormData(1));

  // Multi-tab support for proforma invoices
  const [activeTabId, setActiveTabId] = useState('tab_1');
  const [tabs, setTabs] = useState<ProformaTabItem[]>([
    {
      id: 'tab_1',
      title: 'New Proforma Invoice',
      num: 1,
      formData: createDefaultFormData(1),
      editingProforma: null,
      enableRoundOff: true,
      manualRoundOff: null,
      columnSettings: {
        showItemCategory: false,
        showItemCode: false,
        showHsnSac: false,
        showDescription: false,
        showDiscount: true,
      },
    },
  ]);

  // Filtered party list for Party Search Dropdown
  const filteredCustomers = useMemo(() => {
    const q = partySearchQuery.toLowerCase().trim();
    if (!q) return availableCustomers;
    return availableCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(q))
    );
  }, [availableCustomers, partySearchQuery]);

  // Form Initializer (Opens New Proforma Invoice)
  const handleOpenCreateForm = () => {
    const initialData = createDefaultFormData(1);
    const firstTab: ProformaTabItem = {
      id: 'tab_1',
      title: 'New Proforma Invoice',
      num: 1,
      formData: initialData,
      editingProforma: null,
      enableRoundOff: true,
      manualRoundOff: null,
      columnSettings: {
        showItemCategory: false,
        showItemCode: false,
        showHsnSac: false,
        showDescription: false,
        showDiscount: true,
      },
    };
    setTabs([firstTab]);
    setActiveTabId('tab_1');
    setFormData(initialData);
    setEditingProforma(null);
    setEnableRoundOff(true);
    setManualRoundOff(null);
    setViewMode('form');
  };

  // Add New Proforma Tab (clicks + button in tab bar)
  const handleAddNewTab = () => {
    const maxNum = tabs.reduce((max, t) => Math.max(max, t.num || 1), 0);
    const nextNum = Math.max(1, maxNum + 1);
    const newTabId = `tab_${Date.now()}`;
    const newFormData = createDefaultFormData(nextNum);
    const newTab: ProformaTabItem = {
      id: newTabId,
      title: tabs.length === 0 ? 'New Proforma Invoice' : `New Proforma Invoice ${tabs.length + 1}`,
      num: nextNum,
      formData: newFormData,
      editingProforma: null,
      enableRoundOff: true,
      manualRoundOff: null,
      columnSettings: { ...columnSettings },
    };

    setTabs((prev) => [
      ...prev.map((t) => (t.id === activeTabId ? { ...t, formData, editingProforma, enableRoundOff, manualRoundOff, columnSettings } : t)),
      newTab,
    ]);
    setActiveTabId(newTabId);
    setFormData(newFormData);
    setEditingProforma(null);
    setEnableRoundOff(true);
    setManualRoundOff(null);
  };

  // Switch Active Tab
  const handleSelectTab = (tabId: string) => {
    if (tabId === activeTabId) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, formData, editingProforma, enableRoundOff, manualRoundOff, columnSettings } : t))
    );
    const target = tabs.find((t) => t.id === tabId);
    if (target) {
      setActiveTabId(tabId);
      setFormData(target.formData);
      setEditingProforma(target.editingProforma || null);
      if (target.enableRoundOff !== undefined) setEnableRoundOff(target.enableRoundOff);
      if (target.manualRoundOff !== undefined) setManualRoundOff(target.manualRoundOff);
      if (target.columnSettings !== undefined) setColumnSettings(target.columnSettings);
    }
  };

  // Close Tab
  const handleCloseTab = (e: React.MouseEvent, tabIdToClose: string) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      setViewMode('list');
      return;
    }
    const filtered = tabs.filter((t) => t.id !== tabIdToClose);
    setTabs(filtered);
    if (activeTabId === tabIdToClose) {
      const nextTab = filtered[filtered.length - 1];
      setActiveTabId(nextTab.id);
      setFormData(nextTab.formData);
      setEditingProforma(nextTab.editingProforma || null);
      if (nextTab.enableRoundOff !== undefined) setEnableRoundOff(nextTab.enableRoundOff);
      if (nextTab.manualRoundOff !== undefined) setManualRoundOff(nextTab.manualRoundOff);
      if (nextTab.columnSettings !== undefined) setColumnSettings(nextTab.columnSettings);
    }
  };

  // Switch to Form Mode for Editing Proforma
  const handleOpenEditForm = (proforma: SaleProformaInvoice) => {
    const mappedItems: ExtendedProformaItem[] = proforma.items.map((it) => {
      const stockItem = availableProducts.find((s) => s.productId === it.productId || s.productName === it.productName);
      return {
        ...it,
        id: it.id || `row_${Date.now()}_${Math.random()}`,
        unit: it.unit || 'PCS',
        discountPercent: it.discountPercent || 0,
        discountAmount: it.discountAmount || (it.discountPercent ? ((it.quantity * it.unitPrice * it.discountPercent) / 100) : 0),
        taxPercent: it.taxPercent || 0,
        taxAmount: it.taxAmount || (it.taxPercent ? (((it.quantity * it.unitPrice - (it.discountAmount || 0)) * it.taxPercent) / 100) : 0),
        category: it.category || (stockItem as any)?.category || '',
        itemCode: it.itemCode || stockItem?.sku || '',
        total: it.total || (it.quantity * it.unitPrice),
      };
    });

    const editData = {
      customerId: proforma.customerId,
      partyName: proforma.partyName,
      customerPhone: proforma.customerPhone || '',
      customerEmail: proforma.customerEmail || '',
      customerCompany: proforma.customerCompany || '',
      billingAddress: proforma.billingAddress || '',
      proformaNo: proforma.proformaNo,
      referenceNo: proforma.referenceNo || '1',
      date: proforma.date,
      validUntil: proforma.validUntil,
      stateOfSupply: proforma.stateOfSupply || '33-Tamil Nadu',
      items: mappedItems.length > 0 ? mappedItems : createDefaultFormData().items,
      notes: proforma.notes || 'Thank you for your business inquiry.',
      terms: proforma.terms || '1. Prices valid for 30 days.',
    };

    setFormData(editData);
    setTabs([
      {
        id: 'tab_1',
        title: proforma.proformaNo ? `Proforma ${proforma.proformaNo}` : 'Edit Proforma',
        num: 1,
        formData: editData,
        editingProforma: proforma,
        enableRoundOff: proforma.roundOff !== undefined && proforma.roundOff !== 0,
        manualRoundOff: proforma.roundOff || null,
        columnSettings: { ...columnSettings },
      },
    ]);
    setActiveTabId('tab_1');
    setEditingProforma(proforma);
    setAttachedImageName(proforma.attachedImageName || null);
    setAttachedDocName(proforma.attachedDocName || null);
    setViewMode('form');
  };

  // Row operations
  const handleAddRow = () => {
    const newRow: ExtendedProformaItem = {
      id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: '',
      productName: '',
      quantity: 1,
      unit: 'NONE',
      unitPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 0,
      taxAmount: 0,
      total: 0,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newRow],
    }));
  };

  const handleRemoveRow = (index: number) => {
    if (formData.items.length <= 1) {
      toast.error('Proforma invoice must have at least one line item row.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Realtime Row Item change & auto-calculations
  const handleRowChange = (index: number, field: keyof ExtendedProformaItem, value: any) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };

      if (field === 'productId') {
        const query = String(value).trim().toLowerCase();
        const prod = availableProducts.find(
          (s) =>
            s.productId === value ||
            s.id === value ||
            s.productName.toLowerCase() === query ||
            (s.sku && s.sku.toLowerCase() === query)
        );
        if (prod) {
          item.productId = prod.productId || prod.id;
          item.productName = prod.productName;
          item.sku = prod.sku;
          item.itemCode = prod.sku;
          item.category = (prod as any).category || (prod as any).categoryName || item.category || '';
          item.unitPrice = Number(prod.unitPrice) || 0;
          if (prod.unit && prod.unit !== 'NONE') {
            item.unit = prod.unit;
          } else if (!item.unit || item.unit === 'NONE') {
            item.unit = 'PCS';
          }
          if (prod.taxPercent !== undefined && prod.taxPercent !== null) {
            item.taxPercent = prod.taxPercent;
          }
          if (prod.hsnCode) {
            item.hsnCode = prod.hsnCode;
          }
        }
      } else if (field === 'productName') {
        const query = String(value).trim().toLowerCase();
        const matched = availableProducts.find(
          (s) =>
            s.productName.toLowerCase() === query ||
            (s.sku && s.sku.toLowerCase() === query) ||
            s.productId === value ||
            s.id === value
        );
        if (matched) {
          item.productId = matched.productId || matched.id || item.productId || '';
          item.productName = matched.productName;
          item.sku = matched.sku;
          item.itemCode = matched.sku;
          item.category = (matched as any).category || (matched as any).categoryName || item.category || '';
          item.unitPrice = Number(matched.unitPrice) || 0;
          if (matched.unit && matched.unit !== 'NONE') {
            item.unit = matched.unit;
          } else if (!item.unit || item.unit === 'NONE') {
            item.unit = 'PCS';
          }
          if (matched.taxPercent !== undefined && matched.taxPercent !== null) {
            item.taxPercent = matched.taxPercent;
          }
          if (matched.hsnCode) {
            item.hsnCode = matched.hsnCode;
          }
        }
      } else if (field === 'itemCode' || field === 'sku') {
        const query = String(value).trim().toLowerCase();
        const matched = availableProducts.find(
          (s) =>
            (s.sku && s.sku.toLowerCase() === query) ||
            s.productName.toLowerCase() === query
        );
        if (matched) {
          item.productId = matched.productId || matched.id || item.productId || '';
          item.productName = matched.productName;
          item.sku = matched.sku;
          item.itemCode = matched.sku;
          item.category = (matched as any).category || (matched as any).categoryName || item.category || '';
          item.unitPrice = Number(matched.unitPrice) || 0;
          if (matched.unit && matched.unit !== 'NONE') {
            item.unit = matched.unit;
          } else if (!item.unit || item.unit === 'NONE') {
            item.unit = 'PCS';
          }
          if (matched.taxPercent !== undefined && matched.taxPercent !== null) {
            item.taxPercent = matched.taxPercent;
          }
          if (matched.hsnCode) {
            item.hsnCode = matched.hsnCode;
          }
        }
      }

      const qty = Number(item.quantity) || 0;
      const rate = Number(item.unitPrice) || 0;
      const baseSub = qty * rate;

      let discPct = Number(item.discountPercent) || 0;
      let discAmt = Number(item.discountAmount) || 0;

      if (field === 'discountPercent') {
        discAmt = Math.round(((baseSub * discPct) / 100) * 100) / 100;
        item.discountAmount = discAmt;
      } else if (field === 'discountAmount') {
        discPct = baseSub > 0 ? Math.round(((discAmt / baseSub) * 100) * 100) / 100 : 0;
        item.discountPercent = discPct;
      } else {
        if (discPct > 0) {
          discAmt = Math.round(((baseSub * discPct) / 100) * 100) / 100;
          item.discountAmount = discAmt;
        } else if (discAmt > 0 && baseSub > 0) {
          discAmt = Math.min(discAmt, baseSub);
          discPct = Math.round(((discAmt / baseSub) * 100) * 100) / 100;
          item.discountAmount = discAmt;
          item.discountPercent = discPct;
        } else {
          discAmt = 0;
          item.discountAmount = 0;
        }
      }

      const taxable = Math.max(0, baseSub - discAmt);
      const taxRate = Number(item.taxPercent) || 0;
      const taxAmt = Math.round(((taxable * taxRate) / 100) * 100) / 100;
      item.taxAmount = taxAmt;

      item.total = Math.round((taxable + taxAmt) * 100) / 100;

      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  // Form Totals Calculation
  const formCalculations = useMemo(() => {
    let totalQty = 0;
    let rawSubtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let lineAmountTotal = 0;

    formData.items.forEach((it) => {
      const qty = Number(it.quantity) || 0;
      const rate = Number(it.unitPrice) || 0;
      const discAmt = Number(it.discountAmount) || 0;
      const taxAmt = Number(it.taxAmount) || 0;
      const total = Number(it.total) || 0;

      totalQty += qty;
      rawSubtotal += qty * rate;
      totalDiscount += discAmt;
      totalTax += taxAmt;
      lineAmountTotal += total;
    });

    const unroundedGrand = Math.max(0, lineAmountTotal);
    const roundedInt = Math.round(unroundedGrand);
    const autoRoundDiff = enableRoundOff ? Math.round((roundedInt - unroundedGrand) * 100) / 100 : 0;
    const finalRoundDiff = manualRoundOff !== null ? manualRoundOff : autoRoundDiff;
    const grandTotal = enableRoundOff ? roundedInt : Math.round((unroundedGrand + finalRoundDiff) * 100) / 100;

    return {
      totalQty,
      rawSubtotal: Math.round(rawSubtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      lineAmountTotal: Math.round(lineAmountTotal * 100) / 100,
      roundOffDiff: finalRoundDiff,
      grandTotal: Math.max(0, grandTotal),
    };
  }, [formData.items, enableRoundOff, manualRoundOff]);

  // Quick Customer Creation
  const handleCreateQuickCustomer = async () => {
    setCustomerNameError('');
    setCustomerPhoneError('');

    const trimmedName = newCustomerName.trim();
    const trimmedPhone = newCustomerPhone.trim();
    const trimmedCompany = newCustomerCompany.trim();

    const nameErr = !trimmedName ? 'Customer Name is required' : '';
    let phoneErr = '';
    if (!trimmedPhone) {
      phoneErr = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
      phoneErr = 'Phone number must be a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)';
    }

    if (nameErr) setCustomerNameError(nameErr);
    if (phoneErr) setCustomerPhoneError(phoneErr);

    if (nameErr) {
      toast.error(nameErr);
      return;
    }
    if (phoneErr) {
      toast.error(phoneErr);
      return;
    }

    const cleanPhone = normalizeIndianPhoneTo10Digits(trimmedPhone);
    setIsSavingCustomer(true);

    try {
      const res = await customerApi.createCustomer({
        name: trimmedName,
        phone: cleanPhone,
        company: trimmedCompany || undefined,
        customerType: newCustomerType,
        address: 'Chennai, Tamil Nadu',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        status: 'Active',
      });

      const rawData = res?.data || (res as any)?.customer || res;
      const created = mapApiCustomerToSalesCustomer(rawData && rawData.id ? rawData : (res?.data || rawData));

      // Save to local store so customer is reflected immediately across the app
      saveCustomer(created);

      // Update live customers in Proforma Invoice so party selector dropdown sees it immediately
      setLiveCustomers((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);

      // Invalidate RTK cache so Customer module and others automatically refetch fresh data
      store.dispatch(
        baseApi.util.invalidateTags([
          { type: 'Customer', id: 'LIST' },
          { type: 'Customer', id: created.id },
          'Dashboard',
        ])
      );

      // Select newly created party into current proforma form
      setFormData((prev) => ({
        ...prev,
        customerId: created.id,
        partyName: created.name,
        customerCompany: created.company || '',
        customerPhone: created.phone || '',
        billingAddress: created.billingAddress || created.address || '',
      }));

      setIsQuickCustomerModalOpen(false);
      setPartySearchOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerCompany('');
      setNewCustomerType('Business');
      setCustomerNameError('');
      setCustomerPhoneError('');

      toast.success(`Customer "${created.name}" created successfully!`);
    } catch (err: any) {
      console.error('Failed to create customer:', err);
      const errData = err?.response?.data;
      const errorCode = errData?.error?.code || errData?.code;
      const errorMsg =
        errData?.error?.message ||
        errData?.message ||
        err?.message ||
        'Failed to add customer. Please try again.';

      if (errorCode === 'DUPLICATE_PHONE' || errorMsg.toLowerCase().includes('phone')) {
        setCustomerPhoneError(errorMsg);
      }
      toast.error(errorMsg);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Save Proforma Invoice Handler
  const handleSaveProforma = async (andConvert = false) => {
    if (!formData.partyName.trim()) {
      toast.error('Please select or enter Customer name');
      return;
    }
    const validItems = formData.items.filter((it) => it.productName.trim() || Number(it.unitPrice) > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one line item with name and rate');
      return;
    }

    // Resolve valid UUID productId for every item row
    const resolvedItems: ExtendedProformaItem[] = [];
    for (const it of validItems) {
      let pid = it.productId;
      // 1. If pid is not a valid UUID, look for matching product in availableProducts
      if (!pid || !UUID_REGEX.test(pid)) {
        const match = availableProducts.find(
          (p) =>
            (p.productId && UUID_REGEX.test(p.productId) && p.productName.toLowerCase() === it.productName.trim().toLowerCase()) ||
            (p.id && UUID_REGEX.test(p.id) && p.productName.toLowerCase() === it.productName.trim().toLowerCase())
        );
        if (match) {
          pid = match.productId && UUID_REGEX.test(match.productId) ? match.productId : match.id;
        }
      }

      // 2. If still not a valid UUID, try auto-creating the product via productApi to get a real Commerce UUID
      if (!pid || !UUID_REGEX.test(pid)) {
        try {
          const createProdRes = await productApi.createProduct({
            itemType: 'Product',
            productName: it.productName.trim() || 'Custom Item',
            salePrice: Number(it.unitPrice) || 0,
            salePriceTaxType: 'Excluded',
            unit: it.unit && it.unit !== 'NONE' ? it.unit : 'PCS',
            category: it.category || 'General',
          });
          if (createProdRes.data?.id && UUID_REGEX.test(createProdRes.data.id)) {
            pid = createProdRes.data.id;
          }
        } catch (createErr) {
          console.warn('Auto-create product fallback notice:', createErr);
        }
      }

      if (!pid || !UUID_REGEX.test(pid)) {
        toast.error(`Please select a registered product for "${it.productName || 'line item'}".`);
        return;
      }

      resolvedItems.push({
        ...it,
        productId: pid,
      });
    }

    const { rawSubtotal, totalTax, totalDiscount, roundOffDiff, grandTotal } = formCalculations;

    const proformaId = editingProforma ? editingProforma.id : `pro_${Date.now()}`;
    const newProforma: SaleProformaInvoice = {
      id: proformaId,
      proformaNo: formData.proformaNo || `PRO-${new Date().getFullYear()}-${String((totalApiRecords ?? proformaList.length) + 1).padStart(4, '0')}`,
      referenceNo: formData.referenceNo || '1',
      date: formData.date,
      validUntil: formData.validUntil,
      customerId: formData.customerId || '',
      partyName: formData.partyName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail,
      customerCompany: formData.customerCompany,
      billingAddress: formData.billingAddress,
      shippingAddress: formData.billingAddress,
      stateOfSupply: formData.stateOfSupply,
      items: resolvedItems,
      subtotal: rawSubtotal,
      withGst: totalTax > 0,
      gstType: formData.stateOfSupply?.includes('Tamil Nadu') ? 'intra_state' : 'inter_state',
      cgst: totalTax / 2,
      sgst: totalTax / 2,
      igst: 0,
      discount: totalDiscount,
      taxAmount: totalTax,
      roundOff: roundOffDiff,
      amount: grandTotal,
      balance: grandTotal,
      status: andConvert ? 'Converted' : (editingProforma ? editingProforma.status : 'Open'),
      convertedToInvoiceNo: andConvert ? `INV-${new Date().getFullYear()}-010${proformaList.length + 5}` : undefined,
      notes: formData.notes,
      terms: formData.terms,
      attachedImageName: attachedImageName || undefined,
      attachedDocName: attachedDocName || undefined,
      createdAt: editingProforma ? editingProforma.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      const isEditing = Boolean(editingProforma && editingProforma.id);
      const payload = mapSaleProformaToPayload(newProforma, !isEditing);
      let targetProformaId = proformaId;

      if (editingProforma) {
        const res = await commerceProformaApi.updateProforma(editingProforma.id, payload);
        if (res.data?.id) targetProformaId = res.data.id;
        toast.success(`Proforma Invoice ${newProforma.proformaNo} updated successfully!`);
      } else {
        const res = await commerceProformaApi.createProforma(payload);
        const backendDocNo =
          res.data?.proformaNo ||
          (res.data as any)?.proformaNumber ||
          (res.data as any)?.proformaCode ||
          (res.data as any)?.code ||
          (res.data as any)?.documentNo;
        if (res.data?.id) {
          targetProformaId = res.data.id;
          newProforma.id = res.data.id;
        }
        if (backendDocNo) {
          newProforma.proformaNo = backendDocNo;
        }
        toast.success(`Proforma Invoice ${newProforma.proformaNo} created successfully!`);
      }

      dispatch(baseApi.util.invalidateTags([{ type: 'Proforma', id: 'LIST' }]));

      if (andConvert) {
        try {
          const convRes = await commerceProformaApi.convertProforma(targetProformaId, {
            targetType: 'Invoice',
            dueDate: newProforma.validUntil,
          });
          const convertedNo = convRes.data?.convertedTo?.documentNo;
          newProforma.status = 'Converted';
          if (convertedNo) newProforma.convertedToInvoiceNo = convertedNo;
          toast.success(`Proforma converted to Sale Invoice ${convertedNo || ''}!`);
        } catch (convErr: any) {
          console.warn('API convert notice:', convErr);
          toast.info('Proforma saved. Conversion can be finalized from actions menu.');
        }
      }

      // Also persist to local cache for offline resiliency
      let updatedList: SaleProformaInvoice[];
      if (editingProforma) {
        updatedList = proformaList.map((p) => (p.id === proformaId ? newProforma : p));
      } else {
        updatedList = [newProforma, ...proformaList];
      }
      persistProformas(updatedList);

      // Re-fetch live list from Commerce API
      fetchProformas(page, pageSize, appliedSearch, appliedStatus, appliedPeriod);

      if (tabs.length > 1) {
        const remainingTabs = tabs.filter((t) => t.id !== activeTabId);
        setTabs(remainingTabs);
        const nextActive = remainingTabs[remainingTabs.length - 1];
        setActiveTabId(nextActive.id);
        setFormData(nextActive.formData);
        setEditingProforma(nextActive.editingProforma || null);
        if (nextActive.enableRoundOff !== undefined) setEnableRoundOff(nextActive.enableRoundOff);
        if (nextActive.manualRoundOff !== undefined) setManualRoundOff(nextActive.manualRoundOff);
        if (nextActive.columnSettings !== undefined) setColumnSettings(nextActive.columnSettings);
      } else {
        setViewMode('list');
      }
    } catch (err: any) {
      console.error('Failed to save proforma invoice:', err);
      const apiErr = err.response?.data?.error || err.data?.error || err;
      const fieldMsg = Array.isArray(apiErr.fields) && apiErr.fields.length > 0
        ? `${apiErr.message || 'Validation error'}: ${apiErr.fields.map((f: any) => `${f.path?.join('.') || 'field'} - ${f.message}`).join(', ')}`
        : (apiErr.message || err.message || 'Failed to save proforma invoice to server. Saved in offline storage.');
      toast.error(fieldMsg);
      let updatedList: SaleProformaInvoice[];
      if (editingProforma) {
        updatedList = proformaList.map((p) => (p.id === proformaId ? newProforma : p));
      } else {
        updatedList = [newProforma, ...proformaList];
      }
      persistProformas(updatedList);
      if (tabs.length > 1) {
        const remainingTabs = tabs.filter((t) => t.id !== activeTabId);
        setTabs(remainingTabs);
      } else {
        setViewMode('list');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert Existing Proforma from list (POST /commerce/proformas/{id}/convert)
  const handleConvertExistingToSale = async (proforma: SaleProformaInvoice) => {
    if (proforma.status === 'Converted') {
      toast.info(`Proforma ${proforma.proformaNo} has already been converted.`);
      return;
    }
    try {
      const currentLineage = findDocumentLineage(proforma.proformaNo);
      const upstreamQuotationNo = currentLineage?.estimateNo;

      let convertedNo = currentLineage?.invoiceNo || `INV-${new Date().getFullYear()}-${String(100 + proformaList.length + 1).padStart(4, '0')}`;

      if (UUID_REGEX.test(proforma.id)) {
        try {
          const res = await commerceProformaApi.convertProforma(proforma.id, {
            targetType: 'Invoice',
            dueDate: proforma.validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          });
          if (res.data?.convertedTo?.documentNo) {
            convertedNo = res.data.convertedTo.documentNo;
          }
        } catch (apiErr) {
          console.warn('API convert notice:', apiErr);
        }
      }

      const newSale: SaleTransaction = {
        id: `sale_${Date.now()}`,
        invoiceNo: convertedNo,
        referenceNo: proforma.proformaNo,
        saleDate: new Date().toISOString().split('T')[0],
        dueDate: proforma.validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        customerId: proforma.customerId,
        customerName: proforma.partyName,
        customerCompany: proforma.customerCompany,
        customerPhone: proforma.customerPhone,
        customerEmail: proforma.customerEmail,
        billingAddress: proforma.billingAddress,
        shippingAddress: proforma.shippingAddress || proforma.billingAddress,
        items: proforma.items,
        subtotal: proforma.subtotal,
        withGst: proforma.withGst,
        gstType: proforma.gstType,
        cgst: proforma.cgst,
        sgst: proforma.sgst,
        igst: proforma.igst,
        totalDiscount: proforma.discount || 0,
        totalTax: proforma.taxAmount || 0,
        shippingCharges: 0,
        otherCharges: 0,
        grandTotal: proforma.amount,
        paidAmount: 0,
        balance: proforma.amount,
        paymentMethod: 'Cash',
        paymentTerms: '15 Days',
        paymentStatus: 'Unpaid',
        saleStatus: 'Confirmed',
        createdBy: 'Current User',
        salesperson: 'Sales Rep',
        notes: `Converted from Proforma Invoice ${proforma.proformaNo}${upstreamQuotationNo ? ` (Origin: ${upstreamQuotationNo})` : ''}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveSale(newSale);
      syncConvertedInvoiceToStorage(newSale);

      recordDocumentConversion({
        fromType: 'Proforma',
        fromNo: proforma.proformaNo,
        toType: 'Invoice',
        toNo: convertedNo,
      });

      syncProformaStatusInStorage(proforma.proformaNo, 'Converted', convertedNo);

      dispatch(baseApi.util.invalidateTags([
        { type: 'Proforma', id: proforma.id },
        { type: 'Proforma', id: 'LIST' },
        { type: 'SalesInvoice', id: 'LIST' },
      ]));

      const updated = proformaList.map((p) =>
        p.id === proforma.id || p.proformaNo === proforma.proformaNo
          ? { ...p, status: 'Converted' as const, convertedToInvoiceNo: convertedNo }
          : p
      );
      setLiveProformas((prev) =>
        prev.map((p) =>
          p.id === proforma.id || p.proformaNo === proforma.proformaNo
            ? { ...p, status: 'Converted' as const, convertedToInvoiceNo: convertedNo }
            : p
        )
      );
      persistProformas(updated);

      toast.success(`Proforma ${proforma.proformaNo} converted to Sale Invoice ${convertedNo}!`);
      fetchProformas(page, pageSize, appliedSearch, appliedStatus, appliedPeriod);
    } catch (err: any) {
      console.error('API convert fallback error:', err);
    } finally {
      setActiveConvertDropdownId(null);
      setConvertDropdownPos(null);
    }
  };

  // Convert Existing Proforma to Sale Order (POST /commerce/proformas/{id}/convert)
  const handleConvertExistingToOrder = async (proforma: SaleProformaInvoice) => {
    if (proforma.status === 'Converted') {
      toast.info(`Proforma ${proforma.proformaNo} has already been converted.`);
      return;
    }
    try {
      const currentLineage = findDocumentLineage(proforma.proformaNo);
      const upstreamQuotationNo = currentLineage?.estimateNo;

      const existingOrders: SaleOrderRecord[] = JSON.parse(localStorage.getItem('yaa_crm_sale_orders') || '[]');
      let convertedNo = currentLineage?.orderNo || `SO-${new Date().getFullYear()}-${String(existingOrders.length + 1).padStart(4, '0')}`;

      if (UUID_REGEX.test(proforma.id)) {
        try {
          const res = await commerceProformaApi.convertProforma(proforma.id, {
            targetType: 'Order',
            dueDate: proforma.validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          });
          if (res.data?.convertedTo?.documentNo) {
            convertedNo = res.data.convertedTo.documentNo;
          }
        } catch (apiErr) {
          console.warn('API convert notice:', apiErr);
        }
      }

      const newOrder: SaleOrderRecord = {
        id: `so_${Date.now()}`,
        orderNo: convertedNo,
        referenceNo: proforma.proformaNo,
        orderDate: new Date().toISOString().split('T')[0],
        dueDate: proforma.validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        customerId: proforma.customerId,
        partyName: proforma.partyName,
        customerPhone: proforma.customerPhone,
        customerEmail: proforma.customerEmail,
        customerCompany: proforma.customerCompany,
        billingAddress: proforma.billingAddress,
        shippingAddress: proforma.shippingAddress || proforma.billingAddress,
        stateOfSupply: proforma.stateOfSupply,
        paymentType: 'Credit',
        items: proforma.items.map((it) => ({
          id: it.id || `item_${Date.now()}_${Math.random()}`,
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxPercent: it.taxPercent || 0,
          discountPercent: it.discountPercent || 0,
          discountAmount: it.discountAmount || 0,
          taxAmount: it.taxAmount || 0,
          total: it.total,
          unit: it.unit || 'pcs',
        })),
        subtotal: proforma.subtotal,
        withGst: proforma.withGst,
        gstType: proforma.gstType,
        cgst: proforma.cgst,
        sgst: proforma.sgst,
        igst: proforma.igst,
        discount: proforma.discount || 0,
        taxAmount: proforma.taxAmount || 0,
        amount: proforma.amount,
        advanceAmount: 0,
        balance: proforma.amount,
        status: 'Open',
        notes: `Converted from Proforma Invoice ${proforma.proformaNo}${upstreamQuotationNo ? ` (Origin: ${upstreamQuotationNo})` : ''}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const payload = mapSaleOrderRecordToPayload(newOrder);
        const orderRes = await commerceSaleOrderApi.createOrder(payload);
        if (orderRes.data?.orderNo) {
          convertedNo = orderRes.data.orderNo;
          newOrder.orderNo = convertedNo;
          if (orderRes.data.id) newOrder.id = orderRes.data.id;
        }
      } catch (orderApiErr) {
        console.warn('API order creation notice:', orderApiErr);
      }

      syncConvertedOrderToStorage(newOrder);

      recordDocumentConversion({
        fromType: 'Proforma',
        fromNo: proforma.proformaNo,
        toType: 'Order',
        toNo: convertedNo,
      });

      syncProformaStatusInStorage(proforma.proformaNo, 'Converted', convertedNo);

      dispatch(baseApi.util.invalidateTags([
        { type: 'Proforma', id: proforma.id },
        { type: 'Proforma', id: 'LIST' },
        { type: 'SalesOrder', id: 'LIST' },
      ]));

      const updated = proformaList.map((p) =>
        p.id === proforma.id || p.proformaNo === proforma.proformaNo
          ? { ...p, status: 'Converted' as const, convertedToInvoiceNo: convertedNo }
          : p
      );
      setLiveProformas((prev) =>
        prev.map((p) =>
          p.id === proforma.id || p.proformaNo === proforma.proformaNo
            ? { ...p, status: 'Converted' as const, convertedToInvoiceNo: convertedNo }
            : p
        )
      );
      persistProformas(updated);

      toast.success(`Proforma ${proforma.proformaNo} converted to Sale Order ${convertedNo}!`);
      fetchProformas(page, pageSize, appliedSearch, appliedStatus, appliedPeriod);
    } catch (err: any) {
      console.error('API convert to order fallback error:', err);
      toast.error('Failed to convert proforma to sale order');
    } finally {
      setActiveConvertDropdownId(null);
      setConvertDropdownPos(null);
    }
  };

  // Duplicate Proforma (POST /commerce/proformas)
  const handleDuplicateProforma = async (proforma: SaleProformaInvoice) => {
    const nextNum = (totalApiRecords ?? proformaList.length) + 1;
    const newProformaNo = `PRO-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
    const duplicated: SaleProformaInvoice = {
      ...proforma,
      id: `pro_${Date.now()}`,
      proformaNo: newProformaNo,
      referenceNo: String(nextNum),
      date: new Date().toISOString().split('T')[0],
      status: 'Open',
      convertedToInvoiceNo: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const resolvedItems = duplicated.items.map((it) => {
      let pid = it.productId;
      if (!pid || !UUID_REGEX.test(pid)) {
        const match = availableProducts.find(
          (p) =>
            (p.productId && UUID_REGEX.test(p.productId) && p.productName.toLowerCase() === it.productName.trim().toLowerCase()) ||
            (p.id && UUID_REGEX.test(p.id) && p.productName.toLowerCase() === it.productName.trim().toLowerCase())
        );
        if (match) {
          pid = match.productId && UUID_REGEX.test(match.productId) ? match.productId : match.id;
        }
      }
      return { ...it, productId: pid || it.productId };
    });
    duplicated.items = resolvedItems;

    try {
      const payload = mapSaleProformaToPayload(duplicated, true);
      const res = await commerceProformaApi.createProforma(payload);
      const backendDocNo =
        res.data?.proformaNo ||
        (res.data as any)?.proformaNumber ||
        (res.data as any)?.proformaCode ||
        (res.data as any)?.code ||
        (res.data as any)?.documentNo;
      if (res.data?.id) {
        duplicated.id = res.data.id;
      }
      if (backendDocNo) {
        duplicated.proformaNo = backendDocNo;
      }
      dispatch(baseApi.util.invalidateTags([{ type: 'Proforma', id: 'LIST' }]));
      toast.success(`Duplicated ${proforma.proformaNo} as new Proforma ${duplicated.proformaNo || newProformaNo}!`);
    } catch (err: any) {
      console.warn('Duplicate API notice:', err);
      toast.info(`Duplicated ${proforma.proformaNo} locally.`);
    } finally {
      const updated = [duplicated, ...proformaList];
      persistProformas(updated);
      fetchProformas(page, pageSize, appliedSearch, appliedStatus, appliedPeriod);
      setActiveDropdownId(null);
      setDropdownPos(null);
    }
  };

  // Delete Proforma (DELETE /commerce/proformas/{id}) with confirmation modal
  const handleOpenDeleteModal = (id: string, proformaNo: string) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setDeleteTargetProforma({ id, proformaNo });
    setDeleteProformaError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteProforma = async () => {
    if (!deleteTargetProforma) return;
    setIsDeletingProforma(true);
    setDeleteProformaError(null);
    try {
      await commerceProformaApi.deleteProforma(deleteTargetProforma.id);
      dispatch(baseApi.util.invalidateTags([{ type: 'Proforma', id: deleteTargetProforma.id }, { type: 'Proforma', id: 'LIST' }]));
      const updated = proformaList.filter((p) => p.id !== deleteTargetProforma.id);
      persistProformas(updated);
      toast.success(`Proforma invoice "${deleteTargetProforma.proformaNo}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setDeleteTargetProforma(null);
      fetchProformas(page, pageSize, appliedSearch, appliedStatus, appliedPeriod);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to delete proforma invoice.';
      setDeleteProformaError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeletingProforma(false);
    }
  };

  // Update Status Handler (PATCH /commerce/proformas/{id}/status)
  const handleUpdateStatus = async (id: string, newStatus: 'Open' | 'Cancelled') => {
    try {
      await commerceProformaApi.updateStatus(id, { status: newStatus });
      dispatch(baseApi.util.invalidateTags([{ type: 'Proforma', id }, { type: 'Proforma', id: 'LIST' }]));
      toast.success(`Proforma invoice marked as ${newStatus}!`);
    } catch (err: any) {
      console.warn('Status update API error:', err);
      toast.info(`Proforma status updated to ${newStatus}.`);
    } finally {
      const updated = proformaList.map((p) => (p.id === id ? { ...p, status: newStatus } : p));
      persistProformas(updated);
      fetchProformas(page, pageSize, appliedSearch, appliedStatus, appliedPeriod);
      setActiveDropdownId(null);
      setDropdownPos(null);
    }
  };

  // Print Proforma Invoice
  const handlePrintProforma = (proforma: SaleProformaInvoice) => {
    printBusinessDocument({
      docTypeTitle: 'PROFORMA INVOICE',
      docNo: proforma.proformaNo,
      docDate: isoToDdmmyyyy(proforma.date),
      dueDate: isoToDdmmyyyy(proforma.validUntil),
      status: proforma.status,
      statusColor: proforma.status === 'Converted' ? 'emerald' : proforma.status === 'Cancelled' ? 'rose' : 'purple',
      partyTitle: 'Billed To',
      partyName: proforma.partyName,
      partyCompany: proforma.customerCompany,
      partyPhone: proforma.customerPhone,
      partyAddress: proforma.billingAddress,
      extraMeta: [
        { label: 'State of Supply', value: proforma.stateOfSupply || 'Tamil Nadu' },
        ...(proforma.convertedToInvoiceNo ? [{ label: 'Converted Ref', value: proforma.convertedToInvoiceNo }] : []),
      ],
      items: proforma.items.map((it) => ({
        name: it.productName,
        sku: it.sku,
        batch: it.batch,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxPercent: it.taxPercent,
        total: it.total,
      })),
      subtotal: proforma.subtotal,
      tax: {
        withGst: true,
        taxAmount: proforma.taxAmount,
      },
      roundOff: proforma.roundOff,
      grandTotal: proforma.amount,
      terms: proforma.terms,
    });
  };

  // Displayed Proforma Invoices: Live API data merged with local cache and cross-module lineage
  const displayProformas = useMemo(() => {
    const baseList = isApiConnected ? liveProformas : proformaList;
    const mergedList = baseList.map((item) => {
      const localMatch = proformaList.find((p) => p.id === item.id || p.proformaNo === item.proformaNo);
      const lineage = findDocumentLineage(item.proformaNo);
      const isConvertedInLineage = Boolean(lineage && (lineage.orderNo || lineage.invoiceNo));
      const effectiveStatus = (isConvertedInLineage || localMatch?.status === 'Converted' || item.status === 'Converted')
        ? ('Converted' as const)
        : item.status;
      return {
        ...item,
        status: effectiveStatus,
        convertedToInvoiceNo: localMatch?.convertedToInvoiceNo || lineage?.orderNo || lineage?.invoiceNo || item.convertedToInvoiceNo,
      };
    });

    const seenNos = new Set(mergedList.map((p) => p.proformaNo));
    const extraLocals = proformaList.filter((p) => !seenNos.has(p.proformaNo)).map((item) => {
      const lineage = findDocumentLineage(item.proformaNo);
      const isConvertedInLineage = Boolean(lineage && (lineage.orderNo || lineage.invoiceNo));
      return {
        ...item,
        status: (isConvertedInLineage || item.status === 'Converted') ? ('Converted' as const) : item.status,
        convertedToInvoiceNo: item.convertedToInvoiceNo || lineage?.orderNo || lineage?.invoiceNo,
      };
    });

    const combined = [...extraLocals, ...mergedList];

    return combined.filter((p) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.proformaNo.toLowerCase().includes(q) ||
        p.partyName.toLowerCase().includes(q) ||
        (p.customerPhone && p.customerPhone.toLowerCase().includes(q)) ||
        (p.customerCompany && p.customerCompany.toLowerCase().includes(q)) ||
        p.items.some((it) => it.productName.toLowerCase().includes(q));

      const matchesStatus = appliedStatus === 'ALL' || p.status === appliedStatus;
      const matchesPeriod = checkDateMatchesPeriod(p.date, appliedPeriod);
      return matchesSearch && matchesStatus && matchesPeriod;
    });
  }, [isApiConnected, liveProformas, proformaList, appliedSearch, appliedStatus, appliedPeriod]);

  // Metrics Calculation
  const metrics = useMemo(() => {
    const list = displayProformas;
    let totalVal = 0;
    let convertedVal = 0;
    let openVal = 0;

    list.forEach((p) => {
      totalVal += Number(p.amount) || 0;
      if (p.status === 'Converted') {
        convertedVal += Number(p.amount) || 0;
      } else if (p.status === 'Open') {
        openVal += Number(p.amount) || 0;
      }
    });

    return {
      totalVal,
      convertedVal,
      openVal,
      totalCount: isApiConnected && totalApiRecords !== null ? totalApiRecords : list.length,
    };
  }, [displayProformas, isApiConnected, totalApiRecords]);

  // Paginated list
  const totalPages = isApiConnected && totalApiPages !== null
    ? Math.max(1, totalApiPages)
    : Math.max(1, Math.ceil(displayProformas.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedProformas = isApiConnected
    ? displayProformas
    : displayProformas.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Close dropdowns on outside click and scroll/resize
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.proforma-action-dropdown-menu') && !target.closest('.proforma-action-btn') && !target.closest('.proforma-convert-dropdown-menu') && !target.closest('.proforma-convert-btn')) {
        setActiveDropdownId(null);
        setActiveConvertDropdownId(null);
        setDropdownPos(null);
        setConvertDropdownPos(null);
      }
      if (partySelectRef.current && !partySelectRef.current.contains(target)) {
        setPartySearchOpen(false);
      }
      if (!target.closest('.proforma-share-footer-container')) {
        setShowShareFooterMenu(false);
      }
      if (!target.closest('.table-column-customize-popover') && !target.closest('.table-column-customize-btn')) {
        setShowColumnCustomizePopover(false);
      }
    };
    const handleScrollOrResize = () => {
      setActiveDropdownId(null);
      setActiveConvertDropdownId(null);
      setDropdownPos(null);
      setConvertDropdownPos(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  // =========================================================================
  // VIEW MODE: FULL SCREEN CREATE / EDIT FORM (MATCHING ESTIMATE/QUOTATION UI)
  // =========================================================================
  if (viewMode === 'form') {
    return (
      <div className="min-h-screen bg-slate-50/70 pb-20 -m-3 sm:-m-6 p-3 sm:p-6 flex flex-col font-sans animate-in fade-in duration-150">
        {/* 1. TOP TAB BAR */}
        <div className="flex items-center justify-between border-b border-slate-200/90 pb-2 mb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`group relative flex items-center gap-2.5 px-4 py-2 rounded-t-xl text-xs font-semibold cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-white text-[#33077C] border-slate-200 border-b-white shadow-xs font-bold ring-1 ring-[#33077C]/10'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 border-transparent'
                  }`}
                >
                  <span className="truncate max-w-[150px]">{tab.title}</span>
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className="text-slate-400 hover:text-rose-600 rounded p-0.5 transition-colors cursor-pointer"
                    title="Close tab"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Plus Tab Button (CRM Theme - Adds another proforma tab) */}
            <button
              type="button"
              onClick={handleAddNewTab}
              className="w-7 h-7 rounded-full bg-[#33077C] hover:bg-[#4309A2] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer ml-1"
              title="Add New Proforma Tab"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* 2. FORM HEADER / TITLE */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Proforma Invoice
              </h1>
              <p className="text-xs text-slate-500">
                {editingProforma ? `Edit Proforma ${editingProforma.proformaNo}` : 'Create a new customer proforma invoice'}
              </p>
            </div>
          </div>
        </div>

        {/* 3. MAIN FORM CONTAINER */}
        <form
          id="proforma-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveProforma(false);
          }}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6 flex-1 flex flex-col justify-between mb-6"
        >
          <div>
            {/* Top Meta Details (Party + Ref/Date/State) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-6 border-b border-slate-100">
              {/* Left Column: Party (CRM Theme) */}
              <div className="lg:col-span-6 xl:col-span-5" ref={partySelectRef}>
                <FormLabel required>Customer</FormLabel>
                <div className="relative">
                  {/* Select Box Input */}
                  <div
                    onClick={() => setPartySearchOpen(!partySearchOpen)}
                    className={`relative w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium flex items-center justify-between cursor-pointer transition-all ${
                      partySearchOpen
                        ? 'border-[#4309A2] ring-4 ring-[#4309A2]/10'
                        : formData.partyName
                        ? 'border-slate-300 hover:border-slate-400'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Display Customer Name or Placeholder */}
                    <div className="truncate pr-2">
                      {formData.partyName ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{formData.partyName}</span>
                          {formData.customerCompany && (
                            <span className="text-slate-500 text-xs">({formData.customerCompany})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Select or search customer...</span>
                      )}
                    </div>

                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>

                  {/* Dropdown Menu for Customer Selection */}
                  {partySearchOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      {/* Search Bar */}
                      <div className="relative mb-2">
                        <div className="flex items-center w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-[#33077C] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#33077C]/10 transition-all">
                          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                          <input
                            type="text"
                            placeholder="Search Customer by name, phone or code..."
                            value={partySearchQuery}
                            onChange={(e) => setPartySearchQuery(e.target.value)}
                            autoFocus
                            className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                          />
                          {partySearchQuery && (
                            <button
                              type="button"
                              onClick={() => setPartySearchQuery('')}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Add New Customer Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPartySearchOpen(false);
                          setIsQuickCustomerModalOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-bold text-[#33077C] bg-purple-50/70 hover:bg-purple-100 rounded-xl flex items-center gap-2 transition-colors cursor-pointer mb-2"
                      >
                        <Plus className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
                        <span>+ Add New Customer</span>
                      </button>

                      {/* Customer List */}
                      <div className="max-h-56 overflow-y-auto space-y-1">
                        {filteredCustomers.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400 font-medium">
                            No customers found. Click "+ Add New Customer" above.
                          </div>
                        ) : (
                          filteredCustomers.map((c) => {
                            const isSelected = formData.customerId === c.id;
                            return (
                              <div
                                key={c.id}
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    customerId: c.id,
                                    partyName: c.name,
                                    customerCompany: c.company || '',
                                    customerPhone: c.phone || '',
                                    customerEmail: c.email || '',
                                    billingAddress: c.billingAddress || c.address || '',
                                  }));
                                  setPartySearchOpen(false);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-[#33077C] text-white font-bold'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div>
                                  <div className="font-bold">{c.name} {c.company ? `(${c.company})` : ''}</div>
                                  <div className={`text-[11px] ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                                    {c.customerCode} • {c.phone || 'No phone'}
                                  </div>
                                </div>
                                {c.outstandingAmount ? (
                                  <span className={`text-[11px] font-semibold ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                                    ₹{Number(c.outstandingAmount).toLocaleString('en-IN')}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Party Details Preview Pill */}
                {formData.partyName && (
                  <div className="mt-2.5 px-3 py-2 bg-purple-50/40 rounded-xl border border-purple-200/60 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {formData.customerPhone && (
                      <div><span className="font-bold text-slate-700">Phone:</span> {formData.customerPhone}</div>
                    )}
                    {formData.billingAddress && (
                      <div><span className="font-bold text-slate-700">Address:</span> {formData.billingAddress}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Invoice Date, State of supply */}
              <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-end gap-3 text-xs">
                {/* Invoice Date */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <span className="font-medium text-slate-600 w-24 sm:w-auto text-right">Invoice Date</span>
                  <div className="relative w-40 sm:w-48">
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* State of Supply */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <span className="font-medium text-slate-600 w-24 sm:w-auto text-right">State of supply</span>
                  <select
                    value={formData.stateOfSupply}
                    onChange={(e) => setFormData({ ...formData, stateOfSupply: e.target.value })}
                    className="w-40 sm:w-48 h-9 px-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none cursor-pointer transition-colors"
                  >
                    {STATE_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. BILLING TABLE (THE GRID - CRM THEME) */}
            <div className="mt-6 overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs border-collapse">
                {/* Table Header */}
                <thead>
                  <tr className="bg-[#33077C] text-white font-bold uppercase text-[10.5px] border-b border-[#4309A2] tracking-wider select-none">
                    <th className="py-2.5 px-2.5 text-center border-r border-[#4309A2]/70 w-10 text-white/80 font-extrabold">+</th>
                    <th className="py-2.5 px-3 text-left border-r border-[#4309A2]/70 min-w-[200px] text-white">ITEM</th>
                    {columnSettings.showItemCategory && (
                      <th className="py-2.5 px-2.5 text-left border-r border-[#4309A2]/70 min-w-[130px] text-white">ITEM CATEGORY</th>
                    )}
                    {columnSettings.showItemCode && (
                      <th className="py-2.5 px-2.5 text-left border-r border-[#4309A2]/70 w-28 text-white">ITEM CODE</th>
                    )}
                    {columnSettings.showHsnSac && (
                      <th className="py-2.5 px-2.5 text-left border-r border-[#4309A2]/70 w-28 text-white">HSN/SAC CODE</th>
                    )}
                    {columnSettings.showDescription && (
                      <th className="py-2.5 px-2.5 text-left border-r border-[#4309A2]/70 min-w-[160px] text-white">DESCRIPTION</th>
                    )}
                    <th className="py-2.5 px-2 text-center border-r border-[#4309A2]/70 min-w-[120px] text-white">BATCH NO</th>
                    <th className="py-2.5 px-2 text-center border-r border-[#4309A2]/70 w-20 text-white">QTY</th>
                    <th className="py-2.5 px-2 text-center border-r border-[#4309A2]/70 w-24 text-white">UNIT</th>
                    <th className="py-2.5 px-3 text-right border-r border-[#4309A2]/70 w-36 text-white">
                      <div>PRICE/UNIT</div>
                      <div className="text-[9.5px] text-purple-200 font-normal lowercase">({priceTaxMode.toLowerCase()})</div>
                    </th>
                    {columnSettings.showDiscount && (
                      <th colSpan={2} className="py-2 px-2 text-center border-r border-[#4309A2]/70 text-white">
                        <div className="text-[10px]">DISCOUNT</div>
                        <div className="grid grid-cols-2 text-[9.5px] text-purple-200 font-semibold mt-0.5 border-t border-[#4309A2]/70 pt-1">
                          <span>%</span>
                          <span className="text-right pr-1">AMOUNT</span>
                        </div>
                      </th>
                    )}
                    <th colSpan={2} className="py-2 px-2 text-center border-r border-[#4309A2]/70 text-white">
                      <div className="text-[10px]">TAX</div>
                      <div className="grid grid-cols-2 text-[9.5px] text-purple-200 font-semibold mt-0.5 border-t border-[#4309A2]/70 pt-1">
                        <span>%</span>
                        <span className="text-right pr-1">AMOUNT</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right border-r border-[#4309A2]/70 w-36 relative text-white">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>AMOUNT</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowColumnCustomizePopover(!showColumnCustomizePopover);
                          }}
                          className="table-column-customize-btn inline-flex items-center justify-center w-5 h-5 rounded-full text-white hover:bg-white/20 transition-colors cursor-pointer"
                          title="Customize table columns"
                        >
                          <PlusCircle className="w-4 h-4 text-white stroke-[2.2]" />
                        </button>
                      </div>

                      {/* Customization Dropdown Popover */}
                      {showColumnCustomizePopover && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="table-column-customize-popover absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 p-2.5 z-50 text-left normal-case tracking-normal animate-in fade-in zoom-in-95 duration-100"
                        >
                          <div className="space-y-1">
                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer text-slate-700 select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={columnSettings.showItemCategory}
                                onChange={(e) =>
                                  setColumnSettings((prev) => ({ ...prev, showItemCategory: e.target.checked }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">Item Category</span>
                            </label>

                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer text-slate-700 select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={columnSettings.showItemCode}
                                onChange={(e) =>
                                  setColumnSettings((prev) => ({ ...prev, showItemCode: e.target.checked }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">Item Code</span>
                            </label>

                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer text-slate-700 select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={columnSettings.showHsnSac}
                                onChange={(e) =>
                                  setColumnSettings((prev) => ({ ...prev, showHsnSac: e.target.checked }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">HSN/SAC Code</span>
                            </label>

                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer text-slate-700 select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={columnSettings.showDescription}
                                onChange={(e) =>
                                  setColumnSettings((prev) => ({ ...prev, showDescription: e.target.checked }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">Description</span>
                            </label>

                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer text-slate-700 select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={columnSettings.showDiscount}
                                onChange={(e) =>
                                  setColumnSettings((prev) => ({ ...prev, showDiscount: e.target.checked }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">Discount</span>
                            </label>
                          </div>

                          <div className="my-1.5 border-t border-slate-100" />

                          <button
                            type="button"
                            onClick={() => {
                              setShowColumnCustomizePopover(false);
                              toast.info('Configure template and column styles');
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-[#33077C] hover:bg-purple-50 transition-colors cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5 text-[#33077C]" />
                            <span>More Settings</span>
                          </button>
                        </div>
                      )}
                    </th>
                    <th className="py-2.5 px-2 text-center w-10 text-slate-400"></th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-200 bg-white">
                  {formData.items.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-purple-50/20 transition-colors group">
                      {/* Row Number */}
                      <td className="py-2 px-2 text-center font-bold text-slate-500 border-r border-slate-200 bg-slate-50/30">
                        {idx + 1}
                      </td>

                      {/* ITEM (Product Selector / Input) */}
                      <td className="p-1.5 border-r border-slate-200 min-w-[200px]">
                        <SearchableSelect
                          value={row.productId || ''}
                          onChange={(val) => handleRowChange(idx, 'productId', val)}
                          onSearch={handleProductSearch}
                          isLoading={isSearchingProducts}
                          options={productOptions}
                          placeholder="Select Product..."
                          searchPlaceholder="Search product by name or SKU..."
                          emptyText="Type to search products..."
                          allowClear
                          size="sm"
                        />
                      </td>

                      {/* ITEM CATEGORY (optional column) */}
                      {columnSettings.showItemCategory && (
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.category || ''}
                            onChange={(e) => handleRowChange(idx, 'category', e.target.value)}
                            placeholder="Category"
                            className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none transition-colors"
                          />
                        </td>
                      )}

                      {/* ITEM CODE (optional column) */}
                      {columnSettings.showItemCode && (
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.itemCode || row.sku || ''}
                            onChange={(e) => handleRowChange(idx, 'itemCode', e.target.value)}
                            placeholder="Code / SKU"
                            className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-mono font-medium text-slate-700 outline-none transition-colors"
                          />
                        </td>
                      )}

                      {/* HSN/SAC CODE (optional column) */}
                      {columnSettings.showHsnSac && (
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.hsnCode || ''}
                            onChange={(e) => handleRowChange(idx, 'hsnCode', e.target.value)}
                            placeholder="HSN / SAC"
                            className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-mono font-medium text-slate-700 outline-none transition-colors"
                          />
                        </td>
                      )}

                      {/* DESCRIPTION (optional column) */}
                      {columnSettings.showDescription && (
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.description || ''}
                            onChange={(e) => handleRowChange(idx, 'description', e.target.value)}
                            placeholder="Item description"
                            className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none transition-colors"
                          />
                        </td>
                      )}

                      {/* BATCH NO */}
                      <td className="p-1.5 border-r border-slate-200">
                        <input
                          type="text"
                          value={row.batch || ''}
                          onChange={(e) => handleRowChange(idx, 'batch', e.target.value)}
                          placeholder="Batch No"
                          className="w-full h-8 px-2 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-semibold font-mono text-[#33077C] outline-none transition-colors"
                        />
                      </td>

                      {/* QTY */}
                      <td className="p-1.5 border-r border-slate-200">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity || ''}
                          onChange={(e) => handleRowChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full h-8 px-2 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                        />
                      </td>

                      {/* UNIT */}
                      <td className="p-1.5 border-r border-slate-200">
                        <select
                          value={row.unit || 'NONE'}
                          onChange={(e) => handleRowChange(idx, 'unit', e.target.value)}
                          className="w-full h-8 px-1 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer uppercase transition-colors"
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* PRICE / UNIT */}
                      <td className="p-1.5 border-r border-slate-200">
                        <input
                          type="number"
                          step="0.01"
                          value={row.unitPrice === 0 ? '' : row.unitPrice}
                          placeholder="0.00"
                          onChange={(e) => handleRowChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full h-8 px-2 text-right bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                        />
                      </td>

                      {/* DISCOUNT % and AMOUNT (conditional) */}
                      {columnSettings.showDiscount && (
                        <>
                          <td className="p-1.5 border-r border-slate-200 w-16">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.discountPercent === 0 ? '' : row.discountPercent}
                              placeholder="0"
                              onChange={(e) => handleRowChange(idx, 'discountPercent', Number(e.target.value))}
                              className="w-full h-8 px-1.5 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none transition-colors"
                            />
                          </td>

                          <td className="p-1.5 border-r border-slate-200 w-24">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.discountAmount === 0 ? '' : row.discountAmount}
                              placeholder="0.00"
                              onChange={(e) => handleRowChange(idx, 'discountAmount', Number(e.target.value))}
                              className="w-full h-8 px-2 text-right bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none transition-colors"
                            />
                          </td>
                        </>
                      )}

                      {/* TAX % (Select) */}
                      <td className="p-1.5 border-r border-slate-200 w-28">
                        <select
                          value={row.taxPercent}
                          onChange={(e) => handleRowChange(idx, 'taxPercent', Number(e.target.value))}
                          className="w-full h-8 px-1.5 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none cursor-pointer transition-colors"
                        >
                          {TAX_RATE_OPTIONS.map((t) => (
                            <option key={t.label} value={t.rate}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* TAX AMOUNT */}
                      <td className="p-1.5 border-r border-slate-200 w-24 text-right pr-3 font-medium text-slate-700">
                        {row.taxAmount ? Number(row.taxAmount).toFixed(2) : '0'}
                      </td>

                      {/* AMOUNT (ROW TOTAL) */}
                      <td className="p-1.5 border-r border-slate-200 text-right pr-3 font-bold text-slate-900">
                        {Number(row.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Row Delete Button */}
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Table Footer (ADD ROW + COLUMN TOTALS - CRM Theme) */}
                <tfoot>
                  <tr className="bg-slate-50/90 border-t border-slate-200 font-bold text-slate-800 text-xs">
                    {/* Add Row Button Column */}
                    <td
                      colSpan={
                        2 +
                        (columnSettings.showItemCategory ? 1 : 0) +
                        (columnSettings.showItemCode ? 1 : 0) +
                        (columnSettings.showHsnSac ? 1 : 0) +
                        (columnSettings.showDescription ? 1 : 0)
                      }
                      className="py-2.5 px-3 border-r border-slate-200"
                    >
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="px-3 py-1.5 rounded-lg border border-[#33077C] text-[#33077C] hover:bg-purple-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>ADD ROW</span>
                      </button>
                    </td>

                    {/* Total QTY */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-200 font-extrabold text-[#33077C]">
                      {formCalculations.totalQty}
                    </td>

                    {/* Total label */}
                    <td className="py-2.5 px-2 text-center border-r border-slate-200 text-slate-500 uppercase text-[11px]">
                      TOTAL
                    </td>

                    {/* Price total placeholder */}
                    <td className="border-r border-slate-200"></td>

                    {/* Discount total placeholder & amount */}
                    {columnSettings.showDiscount && (
                      <>
                        <td className="border-r border-slate-200"></td>
                        <td className="py-2.5 px-2 text-right border-r border-slate-200 pr-3 font-semibold text-slate-700">
                          {formCalculations.totalDiscount > 0 ? formCalculations.totalDiscount.toFixed(2) : '0'}
                        </td>
                      </>
                    )}

                    {/* Tax placeholder */}
                    <td className="border-r border-slate-200"></td>

                    {/* Total Tax Amount */}
                    <td className="py-2.5 px-2 text-right border-r border-slate-200 pr-3 font-semibold text-slate-700">
                      {formCalculations.totalTax > 0 ? formCalculations.totalTax.toFixed(2) : '0'}
                    </td>

                    {/* Total Line Amount */}
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 font-extrabold text-[#33077C]">
                      ₹{formCalculations.lineAmountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5. BOTTOM SECTION: ACTION TILES (LEFT) & ROUND OFF / TOTAL (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8 items-start">
              {/* Left Column: 4 Action Buttons & Expandable Cards */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowTermsSection(!showTermsSection)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showTermsSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 ring-2 ring-purple-100'
                        : 'bg-white text-slate-600 hover:text-[#33077C] hover:bg-purple-50/50 border-slate-200'
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span>ADD TERMS & CONDITIONS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDescriptionSection(!showDescriptionSection)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showDescriptionSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 ring-2 ring-purple-100'
                        : 'bg-white text-slate-600 hover:text-[#33077C] hover:bg-purple-50/50 border-slate-200'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>ADD DESCRIPTION</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowImageSection(!showImageSection)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showImageSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 ring-2 ring-purple-100'
                        : 'bg-white text-slate-600 hover:text-[#33077C] hover:bg-purple-50/50 border-slate-200'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>ADD IMAGE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDocumentSection(!showDocumentSection)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showDocumentSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 ring-2 ring-purple-100'
                        : 'bg-white text-slate-600 hover:text-[#33077C] hover:bg-purple-50/50 border-slate-200'
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>ADD DOCUMENT</span>
                  </button>
                </div>

                {/* Expandable Sections */}
                {showTermsSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-1.5 animate-in fade-in duration-100">
                    <FormLabel>Terms & Conditions</FormLabel>
                    <textarea
                      rows={3}
                      value={formData.terms}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                      placeholder="Enter proforma invoice terms and conditions..."
                      className={FORM_TEXTAREA_CLS}
                    />
                  </div>
                )}

                {showDescriptionSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-1.5 animate-in fade-in duration-100">
                    <FormLabel>Proforma Description / Notes</FormLabel>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add custom notes or delivery remarks for this proforma invoice..."
                      className={FORM_TEXTAREA_CLS}
                    />
                  </div>
                )}

                {showImageSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-2 animate-in fade-in duration-100 text-xs">
                    <FormLabel>Attach Image</FormLabel>
                    <div className="flex items-center gap-3">
                      <label className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#33077C] rounded-lg font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors">
                        <ImageIcon className="w-3.5 h-3.5 text-[#33077C]" />
                        <span>Choose Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setAttachedImageName(e.target.files[0].name);
                              toast.success(`Image "${e.target.files[0].name}" attached!`);
                            }
                          }}
                        />
                      </label>
                      {attachedImageName && (
                        <span className="text-slate-600 font-medium truncate max-w-xs">{attachedImageName}</span>
                      )}
                    </div>
                  </div>
                )}

                {showDocumentSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-2 animate-in fade-in duration-100 text-xs">
                    <FormLabel>Attach Document / PDF</FormLabel>
                    <div className="flex items-center gap-3">
                      <label className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#33077C] rounded-lg font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5 transition-colors">
                        <FileUp className="w-3.5 h-3.5 text-[#33077C]" />
                        <span>Choose Document</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setAttachedDocName(e.target.files[0].name);
                              toast.success(`Document "${e.target.files[0].name}" attached!`);
                            }
                          }}
                        />
                      </label>
                      {attachedDocName && (
                        <span className="text-slate-600 font-medium truncate max-w-xs">{attachedDocName}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Round Off & Grand Total Box (CRM Theme) */}
              <div className="lg:col-span-5 flex flex-col items-end gap-4">
                {/* Round Off Input */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={enableRoundOff}
                      onChange={(e) => {
                        setEnableRoundOff(e.target.checked);
                        if (!e.target.checked) setManualRoundOff(0);
                      }}
                      className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C] border-slate-300 accent-[#33077C]"
                    />
                    <span>Round Off</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!enableRoundOff}
                    value={formCalculations.roundOffDiff ? formCalculations.roundOffDiff : ''}
                    placeholder="0.00"
                    onChange={(e) => setManualRoundOff(Number(e.target.value))}
                    className="w-24 h-8 px-2.5 text-right bg-white border border-slate-200 disabled:bg-slate-50 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#33077C]"
                  />
                </div>

                {/* Grand Total Display */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-800">Total</span>
                  <div className="w-48 sm:w-56 h-11 px-3.5 bg-purple-50/30 border-2 border-purple-200 rounded-xl flex items-center justify-end text-base font-extrabold text-[#33077C] shadow-2xs">
                    ₹ {formCalculations.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. BOTTOM ACTION FOOTER (CRM THEME) */}
          <div className="flex items-center justify-between gap-3 pt-6 mt-8 border-t border-slate-200">
            {/* Cancel / Back Button */}
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setViewMode('list')}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-3">
              {/* Share Dropdown Button */}
              <div className="proforma-share-footer-container relative">
                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  onClick={() => setShowShareFooterMenu(!showShareFooterMenu)}
                  icon={<ChevronDown className="w-3.5 h-3.5 ml-1" />}
                >
                  Share
                </Button>

                {/* Share Popover */}
                {showShareFooterMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs text-left">
                    <button
                      type="button"
                      onClick={() => {
                        setShowShareFooterMenu(false);
                        const text = encodeURIComponent(
                          `Proforma Invoice from YAA Mart\nProforma No: ${formData.proformaNo}\nCustomer: ${formData.partyName}\nAmount: ₹${formCalculations.grandTotal}`
                        );
                        window.open(`https://wa.me/?text=${text}`, '_blank');
                      }}
                      className="w-full px-3 py-2 text-left font-bold text-slate-700 hover:bg-purple-50 hover:text-[#33077C] rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>Share via WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowShareFooterMenu(false);
                        const subject = encodeURIComponent(`Proforma Invoice ${formData.proformaNo}`);
                        const body = encodeURIComponent(`Dear ${formData.partyName},\n\nEstimated amount: ₹${formCalculations.grandTotal}`);
                        window.open(`mailto:${formData.customerEmail}?subject=${subject}&body=${body}`, '_blank');
                      }}
                      className="w-full px-3 py-2 text-left font-bold text-slate-700 hover:bg-purple-50 hover:text-[#33077C] rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>Share via Email</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Save Button (CRM Primary Theme #33077C) */}
              <Button
                variant="primary"
                size="md"
                type="submit"
                form="proforma-form"
                disabled={isSubmitting}
                icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Check className="w-4 h-4 text-white stroke-[3]" />}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </form>

        {/* Quick Add Customer Modal */}
        {isQuickCustomerModalOpen && (
          <Modal
            isOpen={isQuickCustomerModalOpen}
            onClose={() => {
              if (!isSavingCustomer) {
                setIsQuickCustomerModalOpen(false);
                setCustomerNameError('');
                setCustomerPhoneError('');
                setNewCustomerType('Business');
              }
            }}
            title="Add New Customer"
            subtitle="Register customer profile, type and contact information"
            maxWidth="md"
            headerGradient={true}
          >
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateQuickCustomer();
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <FormLabel required>Customer Name</FormLabel>
                <input
                  type="text"
                  value={newCustomerName}
                  disabled={isSavingCustomer}
                  onChange={(e) => {
                    setNewCustomerName(e.target.value);
                    if (customerNameError) setCustomerNameError('');
                  }}
                  placeholder="e.g. Anand Supermarket"
                  className={getFormInputCls(Boolean(customerNameError))}
                />
                {customerNameError && (
                  <p className="text-[11px] text-rose-500 mt-1 pl-1 font-medium">{customerNameError}</p>
                )}
              </div>

              <div>
                <FormLabel>Company / Store Name</FormLabel>
                <input
                  type="text"
                  value={newCustomerCompany}
                  disabled={isSavingCustomer}
                  onChange={(e) => setNewCustomerCompany(e.target.value)}
                  placeholder="e.g. Anand Mart Pvt Ltd"
                  className={FORM_INPUT_CLS}
                />
              </div>

              <div>
                <FormLabel>Customer Type</FormLabel>
                <select
                  value={newCustomerType}
                  disabled={isSavingCustomer}
                  onChange={(e) => setNewCustomerType(e.target.value as 'Business' | 'Individual')}
                  className={FORM_SELECT_CLS}
                >
                  <option value="Business">Business (B2B)</option>
                  <option value="Individual">Individual (B2C)</option>
                </select>
              </div>

              <div>
                <FormLabel required>Phone Number</FormLabel>
                <input
                  type="tel"
                  maxLength={10}
                  value={newCustomerPhone}
                  disabled={isSavingCustomer}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Backspace' ||
                      e.key === 'Delete' ||
                      e.key === 'ArrowLeft' ||
                      e.key === 'ArrowRight' ||
                      e.key === 'Tab' ||
                      e.key === 'Enter' ||
                      e.ctrlKey ||
                      e.metaKey
                    ) {
                      return;
                    }
                    if (!/^[0-9]$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setNewCustomerPhone(raw);
                    if (!raw) {
                      setCustomerPhoneError('');
                    } else if (!/^[6-9]/.test(raw) || raw.length === 10) {
                      setCustomerPhoneError(
                        /^[6-9]\d{9}$/.test(raw)
                          ? ''
                          : 'Phone number must be a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)'
                      );
                    } else {
                      setCustomerPhoneError('');
                    }
                  }}
                  onBlur={() => {
                    if (newCustomerPhone) {
                      if (!/^[6-9]\d{9}$/.test(newCustomerPhone)) {
                        setCustomerPhoneError(
                          'Phone number must be a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)'
                        );
                      } else {
                        setCustomerPhoneError('');
                      }
                    }
                  }}
                  placeholder="e.g. 98400 55667"
                  className={getFormInputCls(Boolean(customerPhoneError))}
                />
                {customerPhoneError && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 mt-1 pl-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{customerPhoneError}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  disabled={isSavingCustomer}
                  onClick={() => {
                    setIsQuickCustomerModalOpen(false);
                    setCustomerNameError('');
                    setCustomerPhoneError('');
                    setNewCustomerType('Business');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isSavingCustomer}
                >
                  {isSavingCustomer ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving Customer...
                    </span>
                  ) : (
                    'Save Customer'
                  )}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: LIST (Master Proforma Invoices Table View as in screenshot 1)
  // Export to Excel
  const handleExportExcel = () => {
    if (displayProformas.length === 0) {
      toast.error('No proforma invoices to export');
      return;
    }

    const excelRows = displayProformas.map((p) => ({
      date: isoToDdmmyyyy(p.date),
      validUntil: isoToDdmmyyyy(p.validUntil),
      proformaNo: p.proformaNo,
      partyName: p.partyName,
      customerPhone: p.customerPhone || '-',
      amount: Number(p.amount || 0),
      balance: Number(p.balance || 0),
      status: p.status,
    }));

    exportTableToExcel({
      filename: `Proforma_Invoices_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Proforma Invoices',
      title: 'YAA CREATIONS CRM - PROFORMA INVOICE REPORT',
      subtitle: `Filter: ${appliedPeriod} | Total Proformas: ${displayProformas.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: 'Proforma Date', key: 'date', align: 'center', width: 15 },
        { header: 'Valid Until', key: 'validUntil', align: 'center', width: 15 },
        { header: 'Proforma No.', key: 'proformaNo', align: 'center', width: 18 },
        { header: 'Customer Name', key: 'partyName', align: 'left', width: 28 },
        { header: 'Phone', key: 'customerPhone', align: 'left', width: 18 },
        { header: 'Total (₹)', key: 'amount', align: 'right', type: 'currency', width: 20 },
        { header: 'Balance (₹)', key: 'balance', align: 'right', type: 'currency', width: 20 },
        { header: 'Status', key: 'status', align: 'center', width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        date: 'TOTAL',
        partyName: `${displayProformas.length} Proformas`,
        amount: metrics.totalVal,
        balance: metrics.openVal,
      },
    });

    toast.success(`Proforma Invoices Excel report downloaded (${displayProformas.length} records)!`);
  };

  // Print Proforma Table Report via universal printUtils
  const handlePrintTableReport = () => {
    if (displayProformas.length === 0) {
      toast.error('No proforma invoices to print.');
      return;
    }

    const printRows = displayProformas.map((p) => ({
      date: isoToDdmmyyyy(p.date),
      validUntil: isoToDdmmyyyy(p.validUntil),
      proformaNo: p.proformaNo,
      partyName: p.partyName,
      customerPhone: p.customerPhone || '-',
      amount: Number(p.amount || 0),
      balance: Number(p.balance || 0),
      status: p.status,
    }));

    printTableReport({
      title: 'PROFORMA INVOICE REGISTER',
      subtitle: `Filter: ${appliedPeriod} | Total Records: ${displayProformas.length}`,
      columns: [
        { header: 'Proforma No.', key: 'proformaNo', align: 'center', width: '15%' },
        { header: 'Date', key: 'date', align: 'center', width: '12%' },
        { header: 'Valid Until', key: 'validUntil', align: 'center', width: '12%' },
        { header: 'Customer Name', key: 'partyName', align: 'left', width: '25%' },
        { header: 'Contact', key: 'customerPhone', align: 'left', width: '14%' },
        { header: 'Amount (₹)', key: 'amount', align: 'right', type: 'currency', width: '14%' },
        { header: 'Balance (₹)', key: 'balance', align: 'right', type: 'currency', width: '14%' },
        { header: 'Status', key: 'status', align: 'center', width: '10%' },
      ],
      data: printRows,
      summaryRow: {
        proformaNo: 'TOTAL',
        partyName: `${displayProformas.length} Proformas`,
        amount: metrics.totalVal,
        balance: metrics.openVal,
      },
      metrics: [
        { label: 'Total Value', value: metrics.totalVal },
        { label: 'Open Amount', value: metrics.openVal },
        { label: 'Total Proformas', value: displayProformas.length },
      ],
    });
  };

  // =========================================================================
  // VIEW MODE: LIST (Master Proforma Invoices Table View matching CRM Theme)
  // =========================================================================
  return (
    <div className="space-y-5 pb-16 font-sans animate-in fade-in duration-150">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Proforma Invoice
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {metrics.totalCount} total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Create, track, and convert commercial proforma invoices into confirmed sales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Button
            variant="secondary"
            size="md"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            onClick={handleExportExcel}
            className="hover:border-emerald-500 hover:text-emerald-700 transition-colors"
          >
            Excel Report
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon={<Printer className="w-4 h-4 text-slate-600" />}
            onClick={handlePrintTableReport}
            className="hover:border-purple-300 transition-colors"
          >
            Print Report
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4 text-white stroke-[2.5]" />}
            onClick={handleOpenCreateForm}
            className="bg-[#33077C] hover:bg-[#280563] text-white shadow-sm hover:shadow transition-all"
          >
            Add Proforma
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARD (Themed matching CRM design) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs max-w-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Proformas
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-1">
              <span>₹</span>
              <span>{metrics.totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Green Growth Pill */}
          <div className="flex flex-col items-end">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200/80">
              <span>100%</span>
              <TrendingUp className="w-3 h-3 stroke-[2.5]" />
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">vs last month</span>
          </div>
        </div>

        {/* Subtext: Converted: ₹ 0.00 | Open: ₹ 80.00 */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500">
          <span>Converted: <strong className="text-slate-800 font-bold">₹ {metrics.convertedVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
          <span className="text-slate-300">|</span>
          <span>Open: <strong className="text-slate-800 font-bold">₹ {metrics.openVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
        </div>
      </div>

      {/* 3. Unified SearchBar with FilterDropdown matching Image 1 */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => {
          setPendingSearch(val);
        }}
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingPeriod('all');
          setAppliedPeriod('all');
          setPendingStatus('ALL');
          setAppliedStatus('ALL');
          setPage(1);
        }}
        placeholder="Search by customer name, proforma #..."
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              options={PERIOD_FILTER_OPTIONS}
              value={appliedPeriod}
              onChange={(val) => {
                setPendingPeriod(val);
                setAppliedPeriod(val);
                setPage(1);
              }}
              placeholder="Period : All Time"
            />
            <FilterDropdown
              options={STATUS_FILTER_OPTIONS}
              value={appliedStatus}
              onChange={(val) => {
                setPendingStatus(val);
                setAppliedStatus(val);
                setPage(1);
              }}
              placeholder="Status : All"
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Proformas : <span className="text-[#33077C] font-bold">{metrics.totalCount}</span>
            </span>
          </div>
        }
      />

      {/* 4. PROFORMA INVOICES TABLE (Standardized Royal Purple Themed Header) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {displayProformas.length === 0 ? (
          /* Empty State */
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#33077C] flex items-center justify-center font-bold shadow-xs">
              <FileSpreadsheet className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No Transactions to show</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                You haven't added any proforma invoices yet.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenCreateForm}
              icon={<Plus className="w-4 h-4 text-white stroke-[2.5]" />}
            >
              Add Proforma
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              {/* Table Purple Themed Header */}
              <thead>
                <tr className="bg-[#33077C] text-white text-xs font-bold uppercase tracking-wider select-none">
                  <th className="py-3.5 px-3 sm:px-5 border-r border-[#4309A2]/60 min-w-[180px] text-white">
                    Customer Name
                  </th>
                  <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 whitespace-nowrap text-center text-white min-w-[140px]">
                    PROFORMA NO.
                  </th>
                  <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 whitespace-nowrap text-white min-w-[110px]">
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      <Calendar className="w-3.5 h-3.5 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 text-right whitespace-nowrap text-white min-w-[120px]">
                    Amount
                  </th>
                  <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 text-right whitespace-nowrap text-white min-w-[120px]">
                    Balance
                  </th>
                  <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 text-center whitespace-nowrap text-white min-w-[110px]">
                    Status
                  </th>
                  <th className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap min-w-[130px] w-36 text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-[13px] text-slate-700">
                {paginatedProformas.map((item) => {
                  const isConvertOpen = activeConvertDropdownId === item.id;
                  const isActionOpen = activeDropdownId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-50/40 transition-colors border-b border-slate-200"
                    >
                      {/* 1. Party Name */}
                      <td className="py-3.5 px-3 sm:px-5 font-semibold text-slate-900 border-r border-slate-200 align-middle">
                        <div className="font-bold text-slate-900">{item.partyName}</div>
                        {item.customerPhone && (
                          <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                            {item.customerPhone}
                          </div>
                        )}
                      </td>

                      {/* 2. Proforma Invoice Code (from backend) */}
                      <td className="py-3.5 px-3 sm:px-4 text-center border-r border-slate-200 whitespace-nowrap align-middle">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-[#33077C] border border-purple-200/80 font-mono text-xs font-bold">
                            {item.proformaNo || '—'}
                          </span>
                          <DocumentLineageBadges docRef={item.proformaNo} currentType="Proforma" className="justify-center" />
                        </div>
                      </td>

                      {/* 3. Date */}
                      <td className="py-3.5 px-3 sm:px-4 font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap align-middle">
                        {isoToDdmmyyyy(item.date)}
                      </td>

                      {/* 4. Amount */}
                      <td className="py-3.5 px-3 sm:px-4 text-right font-black text-slate-900 border-r border-slate-200 whitespace-nowrap align-middle">
                        ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 5. Balance */}
                      <td className="py-3.5 px-3 sm:px-4 text-right font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap align-middle">
                        ₹ {item.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 6. Status */}
                      <td className="py-3.5 px-3 sm:px-4 text-center border-r border-slate-200 whitespace-nowrap align-middle">
                        <div className="flex items-center justify-center">
                          {item.status === 'Open' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Open
                            </span>
                          ) : item.status === 'Converted' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Converted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {item.status}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. Actions Column: Convert ⌄ button + 3-dots actions menu */}
                      <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap align-middle min-w-[130px] w-36">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* Convert ⌄ Dropdown Button */}
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              disabled={item.status === 'Converted'}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.status === 'Converted') return;
                                if (isConvertOpen) {
                                  setActiveConvertDropdownId(null);
                                  setConvertDropdownPos(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setConvertDropdownPos({
                                    top: rect.bottom + 4,
                                    right: window.innerWidth - rect.right,
                                  });
                                  setActiveConvertDropdownId(item.id);
                                  setActiveDropdownId(null);
                                  setDropdownPos(null);
                                }
                              }}
                              className={`proforma-convert-btn text-xs font-bold border rounded-lg transition-colors select-none flex items-center gap-1 px-2.5 py-1 ${
                                item.status === 'Converted'
                                  ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60'
                                  : 'text-[#33077C] hover:text-[#4309A2] bg-purple-50 hover:bg-purple-100/80 border-purple-200/70 cursor-pointer'
                              }`}
                              title={item.status === 'Converted' ? 'Already converted' : 'Convert to Invoice'}
                            >
                              <span>Convert</span>
                              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>

                            {/* Convert Floating Dropdown Menu */}
                            {isConvertOpen && convertDropdownPos && (
                              <div
                                style={{
                                  position: 'fixed',
                                  top: `${convertDropdownPos.top}px`,
                                  right: `${convertDropdownPos.right}px`,
                                  zIndex: 9999,
                                }}
                                className="proforma-convert-dropdown-menu w-52 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-left font-sans overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveConvertDropdownId(null);
                                    setConvertDropdownPos(null);
                                    handleConvertExistingToSale(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-purple-50 hover:text-[#33077C] transition-colors cursor-pointer flex items-center gap-2.5"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Convert to Sale Invoice</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveConvertDropdownId(null);
                                    setConvertDropdownPos(null);
                                    handleConvertExistingToOrder(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-purple-50 hover:text-[#33077C] transition-colors cursor-pointer flex items-center gap-2.5"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Convert to Sale Order</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* 3-Dots Action Menu Button */}
                          <SaleActionDropdown
                            items={[
                              {
                                label: 'View/Edit',
                                variant: 'edit',
                                onClick: () => handleOpenEditForm(item),
                              },
                              {
                                label: 'Duplicate',
                                variant: 'duplicate',
                                onClick: () => handleDuplicateProforma(item),
                              },
                              {
                                label: 'Preview',
                                variant: 'preview',
                                onClick: () => setPreviewProforma(item),
                              },
                              {
                                label: 'Print Proforma',
                                variant: 'print',
                                onClick: () => handlePrintProforma(item),
                              },
                              {
                                label: 'Mark as Cancelled',
                                variant: 'cancel',
                                hidden: item.status === 'Converted' || item.status === 'Cancelled',
                                onClick: () => handleUpdateStatus(item.id, 'Cancelled'),
                              },
                              {
                                label: 'Mark as Open',
                                variant: 'activate',
                                hidden: item.status !== 'Cancelled',
                                onClick: () => handleUpdateStatus(item.id, 'Open'),
                              },
                              {
                                label: 'Delete',
                                variant: 'delete',
                                onClick: () => handleOpenDeleteModal(item.id, item.proformaNo),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. PAGINATION */}
      {displayProformas.length > 0 && (
        <Pagination
          total={isApiConnected && totalApiRecords !== null ? totalApiRecords : displayProformas.length}
          currentPage={safePage}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {/* 6. PREVIEW / PRINT MODAL */}
      {previewProforma && (
        <Modal
          isOpen={!!previewProforma}
          onClose={() => setPreviewProforma(null)}
          title={`Proforma Invoice - ${previewProforma.proformaNo}`}
          subtitle={`Issued to ${previewProforma.partyName} on ${isoToDdmmyyyy(previewProforma.date)}`}
          maxWidth="3xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
        >
          <div className="p-6 sm:p-8 space-y-6 bg-white text-slate-800 font-sans">
            {/* Business & Proforma Meta */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h2 className="text-2xl font-black text-[#33077C]">YAA CREATIONS CRM</h2>
                <p className="text-xs text-slate-500 mt-1">
                  128 Commercial Boulevard, Tech Park, Chennai - 600001
                </p>
                <p className="text-xs text-slate-500">GSTIN: 33AAAAA0000A1Z5 | Phone: +91 98765 43210</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-lg bg-purple-100 text-[#33077C] font-black text-xs uppercase tracking-wider mb-2">
                  PROFORMA INVOICE
                </span>
                <p className="text-sm font-bold text-slate-900">{previewProforma.proformaNo}</p>
                <p className="text-xs text-slate-500">Date: {isoToDdmmyyyy(previewProforma.date)}</p>
                <p className="text-xs text-slate-500">Valid Until: {isoToDdmmyyyy(previewProforma.validUntil)}</p>
              </div>
            </div>

            {/* Bill To Info */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Bill To:</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{previewProforma.partyName}</p>
                {previewProforma.customerCompany && <p>{previewProforma.customerCompany}</p>}
                {previewProforma.customerPhone && <p>Phone: {previewProforma.customerPhone}</p>}
                {previewProforma.billingAddress && <p>{previewProforma.billingAddress}</p>}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Proforma Details:</p>
                <p className="mt-0.5"><strong className="text-slate-700">State of Supply:</strong> {previewProforma.stateOfSupply || 'Tamil Nadu'}</p>
                <p><strong className="text-slate-700">Status:</strong> {previewProforma.status}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-2.5 text-white">#</th>
                  <th className="p-2.5 text-white">Item &amp; Description</th>
                  <th className="p-2.5 text-center text-white">Batch No</th>
                  <th className="p-2.5 text-center text-white">Qty</th>
                  <th className="p-2.5 text-right text-white">Unit Price</th>
                  <th className="p-2.5 text-right text-white">Tax (%)</th>
                  <th className="p-2.5 text-right text-white">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewProforma.items.map((it, i) => (
                  <tr key={i}>
                    <td className="p-2.5 text-slate-400">{i + 1}</td>
                    <td className="p-2.5 font-bold text-slate-800">{it.productName}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-[#33077C]">{it.batch || '—'}</td>
                    <td className="p-2.5 text-center">{it.quantity} {it.unit || ''}</td>
                    <td className="p-2.5 text-right">₹{it.unitPrice.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-right">{it.taxPercent || 0}%</td>
                    <td className="p-2.5 text-right font-bold">₹{it.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary Row */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">₹{previewProforma.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {previewProforma.taxAmount !== undefined && previewProforma.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>GST Tax:</span>
                    <span className="font-semibold text-slate-800">₹{previewProforma.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {previewProforma.roundOff !== undefined && (
                  <div className="flex justify-between">
                    <span>Round Off:</span>
                    <span className="font-semibold text-slate-800">₹{previewProforma.roundOff.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-[#33077C] pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span>₹{previewProforma.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            {previewProforma.terms && (
              <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 whitespace-pre-line border border-slate-100">
                <span className="font-bold text-slate-700">Terms &amp; Conditions:</span><br />
                {previewProforma.terms}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewProforma(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handlePrintProforma(previewProforma)}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Proforma</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingProforma) {
            setIsDeleteModalOpen(false);
            setDeleteTargetProforma(null);
            setDeleteProformaError(null);
          }
        }}
        onConfirm={handleConfirmDeleteProforma}
        entityName="Proforma Invoice"
        recordName={deleteTargetProforma?.proformaNo}
        isLoading={isDeletingProforma}
        error={deleteProformaError}
      />
    </div>
  );
};
