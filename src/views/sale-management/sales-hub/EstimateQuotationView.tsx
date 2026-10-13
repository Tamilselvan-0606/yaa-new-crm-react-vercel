import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  FileSpreadsheet,
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
  FileCheck,
  RefreshCw,
  Ban,
  Calculator,
  Settings,
  Image as ImageIcon,
  FileUp,
  FileEdit,
  AlignLeft,
  Paperclip,
  PlusCircle,
  Loader2,
} from 'lucide-react';
import {
  useSalesManagementStore,
  SaleQuotation,
  SaleProductItem,
  QuotationStatus,
  SalesCustomer,
  InventoryStockItem,
} from '../../../store/useSalesManagementStore';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { exportTableToExcel } from '../../../utils/excelExport';
import {
  quotationApi,
  mapApiQuotationToSaleQuotation,
  mapSaleQuotationToPayload,
  QuotationFilterParams,
  customerApi,
  mapApiCustomerToSalesCustomer,
  stockApi,
  mapApiStockToInventoryStockItem,
} from '../../../api';

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

const STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Open', value: 'Open', dotColor: '#f59e0b' },
  { label: 'Converted', value: 'Converted', dotColor: '#10b981' },
  { label: 'Cancelled', value: 'Cancelled', dotColor: '#ef4444' },
];

export interface ExtendedEstimateItem extends SaleProductItem {
  unit?: string;
  discountAmount?: number;
  taxAmount?: number;
  category?: string;
  itemCode?: string;
  hsnCode?: string;
  description?: string;
}

export interface TableColumnSettings {
  showItemCategory: boolean;
  showItemCode: boolean;
  showHsnSac: boolean;
  showDescription: boolean;
  showDiscount: boolean;
}

export interface EstimateTabItem {
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
    quotationNo: string;
    referenceNo: string;
    date: string;
    validUntil: string;
    stateOfSupply: string;
    items: ExtendedEstimateItem[];
    notes: string;
    terms: string;
  };
  editingQuotation?: SaleQuotation | null;
  enableRoundOff?: boolean;
  manualRoundOff?: number | null;
  columnSettings?: TableColumnSettings;
}

export const EstimateQuotationView: React.FC = () => {
  const navigate = useNavigate();
  const {
    quotations,
    customers,
    stocks,
    saveQuotation,
    setQuotationsList,
    deleteQuotation,
    updateQuotationStatus,
    convertQuotationToSale,
    saveCustomer,
    setCustomersList,
    setStocksList,
  } = useSalesManagementStore();

  // View Mode: 'list' (table) vs 'form' (create/edit screen as in reference image)
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');

  // Search & Filter states (for list view)
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingPeriod, setPendingPeriod] = useState('all');
  const [appliedPeriod, setAppliedPeriod] = useState('all');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Live Commerce API State
  const [liveQuotations, setLiveQuotations] = useState<SaleQuotation[]>([]);
  const [liveStocks, setLiveStocks] = useState<InventoryStockItem[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Convert Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertTargetQuotation, setConvertTargetQuotation] = useState<SaleQuotation | null>(null);
  const [convertType, setConvertType] = useState<'Invoice' | 'Order' | 'Proforma'>('Invoice');
  const [convertDueDate, setConvertDueDate] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );

  // Table Row Dropdowns
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeConvertDropdownId, setActiveConvertDropdownId] = useState<string | null>(null);
  const [convertDropdownPos, setConvertDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Preview Modal
  const [previewQuotation, setPreviewQuotation] = useState<SaleQuotation | null>(null);

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

  // Header tool popovers
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [showShareFooterMenu, setShowShareFooterMenu] = useState(false);

  // Quick Customer Creation Modal
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerCompany, setNewCustomerCompany] = useState('');

  // Form State
  const [editingQuotation, setEditingQuotation] = useState<SaleQuotation | null>(null);
  const [partySearchOpen, setPartySearchOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const partySelectRef = useRef<HTMLDivElement>(null);

  // Initial Form Data (No mock content)
  const [formData, setFormData] = useState({
    customerId: '',
    partyName: '',
    customerPhone: '',
    customerEmail: '',
    customerCompany: '',
    billingAddress: '',
    quotationNo: '',
    referenceNo: '1',
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    stateOfSupply: '33-Tamil Nadu',
    items: [
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
    ] as ExtendedEstimateItem[],
    notes: 'Thank you for your business inquiry. Prices valid for 30 days.',
    terms: '1. Prices are valid for 30 days from issue date.\n2. Goods once confirmed will be dispatched within 48 hours.\n3. 100% payment on delivery / Net 15 days for verified accounts.',
  });

  // Multi-tab support for estimates
  const [activeTabId, setActiveTabId] = useState('tab_1');
  const [tabs, setTabs] = useState<EstimateTabItem[]>([
    {
      id: 'tab_1',
      title: 'Estimate #1',
      num: 1,
      formData: {
        customerId: '',
        partyName: '',
        customerPhone: '',
        customerEmail: '',
        customerCompany: '',
        billingAddress: '',
        quotationNo: '',
        referenceNo: '1',
        date: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        stateOfSupply: '33-Tamil Nadu',
        items: [
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
        ] as ExtendedEstimateItem[],
        notes: 'Thank you for your business inquiry. Prices valid for 30 days.',
        terms: '1. Prices are valid for 30 days from issue date.\n2. Goods once confirmed will be dispatched within 48 hours.\n3. 100% payment on delivery / Net 15 days for verified accounts.',
      },
    },
  ]);

  // Close outside dropdown listeners
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.quotation-action-dropdown-container') && !target.closest('.quotation-action-dropdown-menu')) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (!target.closest('.quotation-convert-dropdown-container') && !target.closest('.quotation-convert-dropdown-menu')) {
        setActiveConvertDropdownId(null);
        setConvertDropdownPos(null);
      }
      if (partySelectRef.current && !partySelectRef.current.contains(target)) {
        setPartySearchOpen(false);
      }
      if (!target.closest('.estimate-share-footer-container')) {
        setShowShareFooterMenu(false);
      }
      if (!target.closest('.estimate-calc-container')) {
        setShowCalculator(false);
      }
      if (!target.closest('.estimate-settings-container')) {
        setShowSettingsPopover(false);
      }
      if (!target.closest('.table-column-customize-popover') && !target.closest('.table-column-customize-btn')) {
        setShowColumnCustomizePopover(false);
      }
    };
    const handleScroll = () => {
      setActiveDropdownId(null);
      setDropdownPos(null);
      setActiveConvertDropdownId(null);
      setConvertDropdownPos(null);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  // Fetch Quotations from Live Commerce API
  const isFetchingRef = useRef(false);
  const fetchQuotations = useCallback(
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

      const params: QuotationFilterParams = {
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
      if (periodVal && periodVal !== 'all') {
        params.period = periodVal;
      }

      try {
        const response = await quotationApi.getQuotations(params);
        if (response && (response.success || response.data)) {
          const list = Array.isArray(response.data) ? response.data : [];
          const mapped = list.map(mapApiQuotationToSaleQuotation);
          setLiveQuotations(mapped);
          setTotalApiRecords(response.pagination?.totalRecords ?? mapped.length);
          setTotalApiPages(response.pagination?.totalPages ?? 1);
          setIsApiConnected(true);
        } else {
          throw new Error(response?.message || 'Failed to fetch quotations');
        }
      } catch (err: any) {
        console.warn('Commerce Quotations API notice:', err);
        setIsApiConnected(false);
        setApiErrorMessage(err.message || 'Commerce API not reachable');
        setLiveQuotations(quotations);
        setTotalApiRecords(quotations.length);
        setTotalApiPages(Math.max(1, Math.ceil(quotations.length / size)));
      } finally {
        setIsApiLoading(false);
        isFetchingRef.current = false;
      }
    },
    [appliedSearch, appliedStatus, appliedPeriod, page, pageSize, quotations]
  );

  // Trigger API fetch on filter/page change
  useEffect(() => {
    fetchQuotations(page, pageSize, appliedSearch, appliedStatus, appliedPeriod);
  }, [fetchQuotations, page, pageSize, appliedSearch, appliedStatus, appliedPeriod]);

  // Auto-purge legacy mock quotations and mock grocery stocks on mount (Runs ONCE)
  useEffect(() => {
    try {
      const rawStocks = localStorage.getItem('yaa_crm_inventory_stocks');
      if (rawStocks) {
        const parsed = JSON.parse(rawStocks);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (s) =>
              !String(s.productId || s.id).startsWith('PROD_10') &&
              !String(s.id).startsWith('stk_') &&
              !String(s.productName || '').includes('Aashirvaad') &&
              !String(s.productName || '').includes('India Gate') &&
              !String(s.productName || '').includes('Fortune Sunlite') &&
              !String(s.productName || '').includes('Tata Salt') &&
              !String(s.productName || '').includes('Amul Pure Cow Ghee')
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('yaa_crm_inventory_stocks', JSON.stringify(cleaned));
          }
        }
      }

      const rawQuot = localStorage.getItem('yaa_crm_sale_quotations');
      if (rawQuot) {
        const parsedQ = JSON.parse(rawQuot);
        if (Array.isArray(parsedQ)) {
          const cleanedQ = parsedQ.filter(
            (q) =>
              q.id !== 'quot-1' &&
              q.quotationNo !== 'EST-001' &&
              q.partyName !== 'Keerthivasan'
          );
          if (cleanedQ.length !== parsedQ.length) {
            localStorage.setItem('yaa_crm_sale_quotations', JSON.stringify(cleanedQ));
          }
        }
      }
    } catch (e) {
      console.warn('Storage purge error:', e);
    }
  }, []);

  // Prefetch live customers and stocks for party selector & item selector (Runs ONCE)
  useEffect(() => {
    let isMounted = true;

    customerApi
      .getCustomers({ pagination_required: false, page_size: 100 })
      .then((res) => {
        if (isMounted && res.data && Array.isArray(res.data)) {
          const mapped = res.data.map(mapApiCustomerToSalesCustomer);
          setCustomersList(mapped);
        }
      })
      .catch((err) => console.warn('Customer prefetch:', err));

    stockApi
      .getStocks({ pagination_required: false, page_size: 100 })
      .then((res) => {
        if (isMounted && res.data && Array.isArray(res.data)) {
          const mapped = res.data.map(mapApiStockToInventoryStockItem);
          setLiveStocks(mapped);
        }
      })
      .catch((err) => console.warn('Stock prefetch:', err));

    return () => {
      isMounted = false;
    };
  }, [setCustomersList]);

  // Clean products list: only live products from Commerce API or real inventory items (filter out mock data)
  const availableProducts = useMemo(() => {
    const list = liveStocks.length > 0 ? liveStocks : stocks;
    return list.filter((s) => {
      const pid = String(s.productId || s.id || '');
      const name = String(s.productName || '').toLowerCase();
      if (pid.startsWith('PROD_10') || pid.startsWith('stk_')) return false;
      if (
        name.includes('aashirvaad') ||
        name.includes('india gate') ||
        name.includes('fortune sunlite') ||
        name.includes('tata salt') ||
        name.includes('toor dal') ||
        name.includes('amul pure cow ghee')
      ) {
        return false;
      }
      return true;
    });
  }, [liveStocks, stocks]);

  // Displayed quotations: Live API data when connected, store fallback otherwise
  const displayQuotations = useMemo(() => {
    if (isApiConnected) {
      return liveQuotations;
    }
    return quotations.filter((item) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        item.partyName.toLowerCase().includes(q) ||
        (item.referenceNo && item.referenceNo.toLowerCase().includes(q)) ||
        item.quotationNo.toLowerCase().includes(q) ||
        (item.customerPhone && item.customerPhone.includes(q)) ||
        item.items.some((it) => it.productName.toLowerCase().includes(q));

      const matchesStatus = appliedStatus === 'ALL' || item.status === appliedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [isApiConnected, liveQuotations, quotations, appliedSearch, appliedStatus]);

  // Summary Metrics (List view)
  const metrics = useMemo(() => {
    const list = displayQuotations;
    const totalAmount = list.reduce((sum, q) => sum + (Number(q.amount) || 0), 0);
    const convertedAmount = list
      .filter((q) => q.status === 'Converted')
      .reduce((sum, q) => sum + (Number(q.amount) || 0), 0);
    const openAmount = list
      .filter((q) => q.status === 'Open')
      .reduce((sum, q) => sum + (Number(q.amount) || 0), 0);
    const openCount = list.filter((q) => q.status === 'Open').length;
    const convertedCount = list.filter((q) => q.status === 'Converted').length;

    return {
      totalAmount,
      convertedAmount,
      openAmount,
      openCount,
      convertedCount,
      totalCount: isApiConnected && totalApiRecords !== null ? totalApiRecords : list.length,
    };
  }, [displayQuotations, isApiConnected, totalApiRecords]);

  // Pagination calculation
  const totalPages = isApiConnected && totalApiPages !== null
    ? Math.max(1, totalApiPages)
    : Math.max(1, Math.ceil(displayQuotations.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedQuotations = isApiConnected
    ? displayQuotations
    : displayQuotations.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Helper to build fresh estimate formData (NO MOCK DATA)
  const createDefaultFormData = (num: number = 1) => {
    const nextCode = `EST-${new Date().getFullYear()}-${String(num).padStart(4, '0')}`;
    const initialRows: ExtendedEstimateItem[] = [
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
      quotationNo: nextCode,
      referenceNo: String(num),
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      stateOfSupply: '33-Tamil Nadu',
      items: initialRows,
      notes: 'Thank you for your business inquiry. Prices valid for 30 days.',
      terms: '1. Prices are valid for 30 days from issue date.\n2. Goods once confirmed will be dispatched within 48 hours.\n3. 100% payment on delivery / Net 15 days for verified accounts.',
    };
  };

  // Form Initializer (Opens Estimate #1)
  const handleOpenCreateForm = () => {
    const initialData = createDefaultFormData(1);
    const firstTab: EstimateTabItem = {
      id: 'tab_1',
      title: 'Estimate #1',
      num: 1,
      formData: initialData,
      editingQuotation: null,
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
    setEditingQuotation(null);
    setEnableRoundOff(true);
    setManualRoundOff(null);
    setViewMode('form');
  };

  // Add New Estimate Tab (clicks + button in tab bar)
  const handleAddNewTab = () => {
    const maxNum = tabs.reduce((max, t) => Math.max(max, t.num || 1), 0);
    const nextNum = Math.max(1, maxNum + 1);
    const newTabId = `tab_${Date.now()}`;
    const newFormData = createDefaultFormData(nextNum);
    const newTab: EstimateTabItem = {
      id: newTabId,
      title: `Estimate #${nextNum}`,
      num: nextNum,
      formData: newFormData,
      editingQuotation: null,
      enableRoundOff: true,
      manualRoundOff: null,
      columnSettings: { ...columnSettings },
    };

    setTabs((prev) => [
      ...prev.map((t) => (t.id === activeTabId ? { ...t, formData, editingQuotation, enableRoundOff, manualRoundOff, columnSettings } : t)),
      newTab,
    ]);
    setActiveTabId(newTabId);
    setFormData(newFormData);
    setEditingQuotation(null);
    setEnableRoundOff(true);
    setManualRoundOff(null);
  };

  // Switch Active Tab
  const handleSelectTab = (tabId: string) => {
    if (tabId === activeTabId) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, formData, editingQuotation, enableRoundOff, manualRoundOff, columnSettings } : t))
    );
    const target = tabs.find((t) => t.id === tabId);
    if (target) {
      setActiveTabId(tabId);
      setFormData(target.formData);
      setEditingQuotation(target.editingQuotation || null);
      if (target.enableRoundOff !== undefined) setEnableRoundOff(target.enableRoundOff);
      if (target.manualRoundOff !== undefined) setManualRoundOff(target.manualRoundOff);
      if (target.columnSettings !== undefined) setColumnSettings(target.columnSettings);
    }
  };

  // Close Tab
  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if (tabs.length <= 1) {
      setViewMode('list');
      return;
    }
    const remainingTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(remainingTabs);
    if (activeTabId === tabId) {
      const nextActive = remainingTabs[remainingTabs.length - 1];
      setActiveTabId(nextActive.id);
      setFormData(nextActive.formData);
      setEditingQuotation(nextActive.editingQuotation || null);
      if (nextActive.enableRoundOff !== undefined) setEnableRoundOff(nextActive.enableRoundOff);
      if (nextActive.manualRoundOff !== undefined) setManualRoundOff(nextActive.manualRoundOff);
      if (nextActive.columnSettings !== undefined) setColumnSettings(nextActive.columnSettings);
    }
  };

  const handleOpenEditForm = async (quot: SaleQuotation) => {
    let targetQuot = quot;
    try {
      const res = await quotationApi.getQuotationById(quot.id);
      if (res && res.data) {
        targetQuot = mapApiQuotationToSaleQuotation(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch fresh single quotation from API:', err);
    }
    setEditingQuotation(targetQuot);
    const mappedItems: ExtendedEstimateItem[] = targetQuot.items.map((it) => {
      const qty = Number(it.quantity) || 0;
      const rate = Number(it.unitPrice) || 0;
      const discPct = Number(it.discountPercent) || 0;
      const base = qty * rate;
      const discAmt = (base * discPct) / 100;
      const taxable = Math.max(0, base - discAmt);
      const taxRate = Number(it.taxPercent) || 0;
      const taxAmt = (taxable * taxRate) / 100;
      return {
        ...it,
        unit: (it as any).unit || 'PCS',
        discountAmount: Math.round(discAmt * 100) / 100,
        taxAmount: Math.round(taxAmt * 100) / 100,
        total: Math.round((taxable + taxAmt) * 100) / 100,
      };
    });

    const editData = {
      customerId: targetQuot.customerId || '',
      partyName: targetQuot.partyName,
      customerPhone: targetQuot.customerPhone || '',
      customerEmail: targetQuot.customerEmail || '',
      customerCompany: targetQuot.customerCompany || '',
      billingAddress: targetQuot.billingAddress || '',
      quotationNo: targetQuot.quotationNo,
      referenceNo: targetQuot.referenceNo || '1',
      date: targetQuot.date,
      validUntil: targetQuot.validUntil,
      stateOfSupply: targetQuot.stateOfSupply || '33-Tamil Nadu',
      items: mappedItems.length > 0 ? mappedItems : [
        {
          id: `row_${Date.now()}`,
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
        }
      ],
      notes: targetQuot.notes || 'Thank you for your business inquiry.',
      terms: targetQuot.terms || '1. Prices valid for 30 days.',
    };

    setFormData(editData);
    setTabs([
      {
        id: 'tab_1',
        title: `Estimate #${targetQuot.referenceNo || '1'}`,
        num: Number(targetQuot.referenceNo) || 1,
        formData: editData,
        editingQuotation: targetQuot,
        enableRoundOff: true,
        manualRoundOff: null,
        columnSettings: { ...columnSettings },
      },
    ]);
    setActiveTabId('tab_1');
    setViewMode('form');
  };

  // Row operations
  const handleAddRow = () => {
    const newRow: ExtendedEstimateItem = {
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
      toast.error('Estimate must have at least one line item row.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Realtime Row Item change & auto-calculations
  const handleRowChange = (index: number, field: keyof ExtendedEstimateItem, value: any) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };

      if (field === 'productId') {
        const prod = availableProducts.find((s) => s.productId === value);
        if (prod) {
          item.productName = prod.productName;
          item.sku = prod.sku;
          item.itemCode = prod.sku;
          item.category = (prod as any).category || (prod as any).categoryName || item.category || '';
          item.unitPrice = prod.unitPrice || 0;
          item.unit = item.unit === 'NONE' ? 'PCS' : item.unit;
          item.taxPercent = 5;
        }
      } else if (field === 'productName') {
        const matched = availableProducts.find((s) => s.productName.toLowerCase() === String(value).toLowerCase());
        if (matched) {
          item.productId = matched.productId;
          item.sku = matched.sku;
          item.itemCode = matched.sku;
          item.category = (matched as any).category || (matched as any).categoryName || item.category || '';
          if (!item.unitPrice || item.unitPrice === 0) {
            item.unitPrice = matched.unitPrice || 0;
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
        discAmt = Math.round(((baseSub * discPct) / 100) * 100) / 100;
        item.discountAmount = discAmt;
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
  const handleCreateQuickCustomer = () => {
    if (!newCustomerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    const newCust: SalesCustomer = {
      id: `cust_${Date.now()}`,
      customerCode: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
      name: newCustomerName.trim(),
      company: newCustomerCompany.trim(),
      customerType: 'Business',
      phone: newCustomerPhone.trim(),
      email: '',
      address: 'Chennai, Tamil Nadu',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      pincode: '600001',
      billingAddress: 'Chennai, Tamil Nadu',
      shippingAddress: 'Chennai, Tamil Nadu',
      creditLimit: 50000,
      paymentTerms: 'Net 30 Days',
      openingBalance: 0,
      outstandingAmount: 0,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveCustomer(newCust);
    setFormData((prev) => ({
      ...prev,
      customerId: newCust.id,
      partyName: newCust.name,
      customerCompany: newCust.company,
      customerPhone: newCust.phone,
      billingAddress: newCust.address,
    }));
    setIsQuickCustomerModalOpen(false);
    setPartySearchOpen(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerCompany('');

    // Attempt live API customer creation
    customerApi
      .createCustomer({
        name: newCust.name,
        company: newCust.company || undefined,
        phone: newCust.phone,
        customerType: 'Business',
        address: newCust.address,
      })
      .then((res) => {
        if (res.data) {
          const created = mapApiCustomerToSalesCustomer(res.data);
          saveCustomer(created);
          setFormData((prev) => ({
            ...prev,
            customerId: created.id,
            partyName: created.name,
            customerCompany: created.company || '',
            customerPhone: created.phone || '',
            billingAddress: created.billingAddress || created.address || '',
          }));
        }
      })
      .catch((err) => {
        console.warn('Live customer create warning:', err);
      });

    toast.success(`Customer "${newCust.name}" added successfully!`);
  };

  // Save Estimate via Commerce API
  const handleSaveEstimate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.partyName.trim()) {
      toast.error('Please select or enter Party / Customer name');
      return;
    }
    const validItems = formData.items.filter((it) => it.productName.trim() || Number(it.unitPrice) > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one line item with name and rate');
      return;
    }

    const { rawSubtotal, totalTax, totalDiscount, grandTotal } = formCalculations;

    const payload = mapSaleQuotationToPayload({
      quotationNo: formData.quotationNo ? formData.quotationNo.trim() : undefined,
      referenceNo: formData.referenceNo ? formData.referenceNo.trim() : undefined,
      date: formData.date,
      validUntil: formData.validUntil,
      customerId: formData.customerId || undefined,
      partyName: formData.partyName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail,
      customerCompany: formData.customerCompany,
      billingAddress: formData.billingAddress,
      items: validItems as any,
      withGst: true,
      gstType: 'intra_state',
      notes: formData.notes,
      terms: formData.terms,
      stateOfSupply: formData.stateOfSupply,
    });

    setIsSubmitting(true);
    try {
      if (editingQuotation && editingQuotation.id) {
        const res = await quotationApi.updateQuotation(editingQuotation.id, payload);
        const mapped = mapApiQuotationToSaleQuotation(res.data);
        saveQuotation(mapped);
        toast.success(`Estimate ${mapped.quotationNo} updated successfully!`);
      } else {
        const res = await quotationApi.createQuotation(payload);
        const mapped = mapApiQuotationToSaleQuotation(res.data);
        saveQuotation(mapped);
        toast.success(`Estimate ${mapped.quotationNo} created successfully!`);
      }

      await fetchQuotations(1, pageSize, appliedSearch, appliedStatus, appliedPeriod);

      if (tabs.length > 1) {
        const remainingTabs = tabs.filter((t) => t.id !== activeTabId);
        setTabs(remainingTabs);
        const nextActive = remainingTabs[remainingTabs.length - 1];
        setActiveTabId(nextActive.id);
        setFormData(nextActive.formData);
        setEditingQuotation(nextActive.editingQuotation || null);
        if (nextActive.enableRoundOff !== undefined) setEnableRoundOff(nextActive.enableRoundOff);
        if (nextActive.manualRoundOff !== undefined) setManualRoundOff(nextActive.manualRoundOff);
        if (nextActive.columnSettings !== undefined) setColumnSettings(nextActive.columnSettings);
      } else {
        setViewMode('list');
      }
    } catch (err: any) {
      console.error('Save estimate error:', err);
      toast.error(err.message || 'Failed to save estimate');
      // Local fallback
      const fallbackQuotation: SaleQuotation = {
        id: editingQuotation ? editingQuotation.id : `quot_${Date.now()}`,
        quotationNo: formData.quotationNo || `EST-${Date.now().toString().slice(-4)}`,
        referenceNo: formData.referenceNo || '1',
        date: formData.date,
        validUntil: formData.validUntil,
        customerId: formData.customerId || `cust_${Date.now()}`,
        partyName: formData.partyName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        customerCompany: formData.customerCompany,
        billingAddress: formData.billingAddress,
        items: validItems,
        subtotal: rawSubtotal,
        withGst: true,
        gstType: 'intra_state',
        discount: totalDiscount,
        taxAmount: totalTax,
        amount: grandTotal,
        balance: grandTotal,
        status: editingQuotation ? editingQuotation.status : 'Open',
        notes: formData.notes,
        terms: formData.terms,
        createdAt: editingQuotation ? editingQuotation.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveQuotation(fallbackQuotation);
      if (tabs.length > 1) {
        const remainingTabs = tabs.filter((t) => t.id !== activeTabId);
        setTabs(remainingTabs);
        const nextActive = remainingTabs[remainingTabs.length - 1];
        setActiveTabId(nextActive.id);
        setFormData(nextActive.formData);
      } else {
        setViewMode('list');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert handlers using Live Commerce API Modal
  const handleOpenConvertModal = (quot: SaleQuotation, type: 'Invoice' | 'Order' | 'Proforma') => {
    setConvertTargetQuotation(quot);
    setConvertType(type);
    setConvertDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setIsConvertModalOpen(true);
    setActiveConvertDropdownId(null);
    setConvertDropdownPos(null);
  };

  const handleExecuteConvert = async () => {
    if (!convertTargetQuotation) return;
    setIsConverting(true);
    try {
      const res = await quotationApi.convertQuotation(convertTargetQuotation.id, {
        targetType: convertType,
        dueDate: convertDueDate || undefined,
      });

      const convertedDocNo = res.data?.convertedTo?.documentNo || '';
      toast.success(
        res.message ||
          `Quotation ${convertTargetQuotation.quotationNo} successfully converted to ${convertType} ${convertedDocNo}!`
      );
      setIsConvertModalOpen(false);
      setConvertTargetQuotation(null);
      await fetchQuotations(page, pageSize, appliedSearch, appliedStatus, appliedPeriod);

      if (convertType === 'Invoice') {
        convertQuotationToSale(convertTargetQuotation.id);
        navigate('/sale-management/sales/sale');
      } else {
        updateQuotationStatus(convertTargetQuotation.id, 'Converted');
      }
    } catch (err: any) {
      console.error('Convert API call error:', err);
      toast.error(err.message || `Failed to convert quotation to ${convertType}`);
      // Fallback
      if (convertType === 'Invoice') {
        const sale = convertQuotationToSale(convertTargetQuotation.id);
        if (sale) {
          toast.success(`Quotation converted to Sale Invoice ${sale.invoiceNo} (Local)!`);
          navigate('/sale-management/sales/sale');
        }
      } else {
        updateQuotationStatus(convertTargetQuotation.id, 'Converted');
        toast.success(`Quotation marked Converted to ${convertType}!`);
      }
      setIsConvertModalOpen(false);
      setConvertTargetQuotation(null);
    } finally {
      setIsConverting(false);
    }
  };

  // Delete via Live API
  const handleDelete = async (id: string, no: string) => {
    if (confirm(`Are you sure you want to delete estimate / quotation ${no}?`)) {
      try {
        await quotationApi.deleteQuotation(id);
        toast.success(`Quotation ${no} deleted successfully.`);
        deleteQuotation(id);
        await fetchQuotations(page, pageSize, appliedSearch, appliedStatus, appliedPeriod);
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete quotation');
        deleteQuotation(id);
      } finally {
        setActiveDropdownId(null);
      }
    }
  };

  // Duplicate via Live API
  const handleDuplicate = async (item: SaleQuotation) => {
    setActiveDropdownId(null);
    try {
      const duplicatedPayload = mapSaleQuotationToPayload({
        ...item,
        quotationNo: undefined, // Let server auto-generate unique number
        referenceNo: item.referenceNo ? `${item.referenceNo}-COPY` : 'COPY',
        date: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: 'Open',
      });
      const res = await quotationApi.createQuotation(duplicatedPayload);
      const mapped = mapApiQuotationToSaleQuotation(res.data);
      saveQuotation(mapped);
      toast.success(`Duplicated as new Estimate ${mapped.quotationNo}!`);
      await fetchQuotations(1, pageSize, appliedSearch, appliedStatus, appliedPeriod);
    } catch (err: any) {
      toast.error(err.message || 'Failed to duplicate quotation on server');
    }
  };

  // Open Preview with fresh server data
  const handleOpenPreview = async (item: SaleQuotation) => {
    setActiveDropdownId(null);
    try {
      const res = await quotationApi.getQuotationById(item.id);
      if (res && res.data) {
        setPreviewQuotation(mapApiQuotationToSaleQuotation(res.data));
      } else {
        setPreviewQuotation(item);
      }
    } catch {
      setPreviewQuotation(item);
    }
  };

  // Export to Excel
  const handleExport = () => {
    if (displayQuotations.length === 0) {
      toast.error('No quotations to export');
      return;
    }

    const excelRows = displayQuotations.map((q) => ({
      date: isoToDdmmyyyy(q.date),
      referenceNo: q.referenceNo || '1',
      quotationNo: q.quotationNo,
      partyName: q.partyName,
      customerPhone: q.customerPhone || '-',
      amount: Number(q.amount || 0),
      balance: Number(q.balance || 0),
      status: q.status,
    }));

    exportTableToExcel({
      filename: `Estimates_Quotations_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Estimates & Quotations',
      title: 'YAA CREATIONS CRM - ESTIMATE & QUOTATION REPORT',
      subtitle: `Filter: ${appliedPeriod} | Total Quotations: ${displayQuotations.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: 'Date', key: 'date', align: 'center', width: 15 },
        { header: 'Ref No.', key: 'referenceNo', align: 'center', width: 14 },
        { header: 'Quotation No', key: 'quotationNo', align: 'center', width: 18 },
        { header: 'Party Name', key: 'partyName', align: 'left', width: 28 },
        { header: 'Contact', key: 'customerPhone', align: 'left', width: 18 },
        { header: 'Amount (₹)', key: 'amount', align: 'right', type: 'currency', width: 20 },
        { header: 'Balance (₹)', key: 'balance', align: 'right', type: 'currency', width: 20 },
        { header: 'Status', key: 'status', align: 'center', width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        date: 'TOTAL',
        partyName: `${displayQuotations.length} Quotations`,
        amount: metrics.totalAmount,
        balance: metrics.openAmount,
      },
    });

    toast.success(`Estimates Excel report downloaded (${displayQuotations.length} records)!`);
  };

  // Printable Document Generator
  const handlePrintQuotation = (quot: SaleQuotation) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Unable to open print preview. Please allow popups.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Estimate Quotation - ${quot.quotationNo}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            body { padding: 32px; color: #1e293b; background: #fff; line-height: 1.5; font-size: 13px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #33077C; padding-bottom: 16px; margin-bottom: 20px; }
            .brand-name { font-size: 22px; font-weight: 800; color: #33077C; }
            .doc-title { font-size: 20px; font-weight: 800; color: #0f172a; text-align: right; text-transform: uppercase; letter-spacing: 0.5px; }
            .badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: #FEF3C7; color: #B45309; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
            .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
            .meta-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
            .meta-text { font-size: 13px; font-weight: 600; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #33077C; color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; text-align: left; padding: 10px 12px; border: 1px solid #33077C; }
            td { padding: 10px 12px; border: 1px solid #e2e8f0; font-size: 12px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-section { display: flex; justify-content: flex-end; margin-bottom: 24px; }
            .total-table { width: 320px; }
            .total-table td { border: none; padding: 4px 8px; }
            .grand-total { font-size: 15px; font-weight: 800; color: #33077C; border-top: 2px solid #33077C !important; padding-top: 8px !important; }
            .terms-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; background: #fafafa; margin-bottom: 30px; }
            .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
            .sign-box { text-align: center; width: 180px; border-top: 1px solid #64748b; padding-top: 6px; font-weight: 700; font-size: 12px; }
            @media print {
              body { padding: 0; }
              @page { margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand-name">YAA SALES & MART</div>
              <div style="color: #64748b; font-size: 12px; margin-top: 2px;">Wholesale & FMCG Distribution</div>
              <div style="color: #475569; font-size: 11px;">GSTIN: 33AAAAA0000A1Z5 • Phone: +91 98400 12345</div>
            </div>
            <div>
              <div class="doc-title">ESTIMATE / QUOTATION</div>
              <div style="font-size: 12px; color: #64748b; text-align: right; margin-top: 4px;">
                Quotation #: <strong>${quot.quotationNo}</strong> (Ref: ${quot.referenceNo || '1'})
              </div>
              <div style="text-align: right; margin-top: 4px;">
                <span class="badge">${quot.status.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="meta-box">
              <div class="meta-title">Estimate For (Party Details)</div>
              <div class="meta-text">${quot.partyName}</div>
              ${quot.customerCompany ? `<div style="font-size: 12px; color: #475569;">${quot.customerCompany}</div>` : ''}
              ${quot.customerPhone ? `<div style="font-size: 12px; color: #475569;">Phone: ${quot.customerPhone}</div>` : ''}
              ${quot.customerEmail ? `<div style="font-size: 12px; color: #475569;">Email: ${quot.customerEmail}</div>` : ''}
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${quot.billingAddress}</div>
            </div>
            <div class="meta-box">
              <div class="meta-title">Quotation Details</div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Quotation Date:</span>
                <strong>${isoToDdmmyyyy(quot.date)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Valid Until:</span>
                <strong>${isoToDdmmyyyy(quot.validUntil)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Reference No:</span>
                <strong>${quot.referenceNo || '1'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Status:</span>
                <strong>${quot.status}</strong>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 40px;">#</th>
                <th>Item Description</th>
                <th class="text-center" style="width: 70px;">Qty</th>
                <th class="text-right" style="width: 100px;">Rate (₹)</th>
                <th class="text-right" style="width: 80px;">GST %</th>
                <th class="text-right" style="width: 110px;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${quot.items
                .map(
                  (item, idx) => `
                <tr>
                  <td class="text-center font-bold">${idx + 1}</td>
                  <td>
                    <strong>${item.productName}</strong>
                    ${item.sku ? `<div style="font-size: 10.5px; color: #64748b;">SKU: ${item.sku}</div>` : ''}
                  </td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">₹${Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right">${item.taxPercent || 0}%</td>
                  <td class="text-right font-bold">₹${Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="total-section">
            <table class="total-table">
              <tr>
                <td style="color: #64748b;">Subtotal:</td>
                <td class="text-right font-semibold">₹${Number(quot.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${
                quot.taxAmount
                  ? `
                <tr>
                  <td style="color: #64748b;">GST / Tax:</td>
                  <td class="text-right font-semibold">₹${Number(quot.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              `
                  : ''
              }
              ${
                quot.discount
                  ? `
                <tr>
                  <td style="color: #64748b;">Discount:</td>
                  <td class="text-right font-semibold">-₹${Number(quot.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              `
                  : ''
              }
              <tr>
                <td class="grand-total">Total Amount:</td>
                <td class="text-right grand-total">₹${Number(quot.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>

          ${
            quot.terms
              ? `
            <div class="terms-box">
              <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 4px;">Terms & Conditions</div>
              <div style="font-size: 11.5px; color: #64748b; white-space: pre-line;">${quot.terms}</div>
            </div>
          `
              : ''
          }

          <div class="footer">
            <div>
              <div style="font-size: 11px; color: #94a3b8;">This is a computer-generated quotation estimate.</div>
            </div>
            <div class="sign-box">
              Authorized Signatory
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filtered party list for Party Search Dropdown (prioritizes live customers)
  const filteredCustomers = useMemo(() => {
    const q = partySearchQuery.toLowerCase().trim();
    const realCustomers = customers.filter((c) => !c.id.startsWith('cust_'));
    const sourceList = realCustomers.length > 0 ? realCustomers : customers;
    if (!q) return sourceList;
    return sourceList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(q))
    );
  }, [customers, partySearchQuery]);

  // =========================================================================
  // VIEW MODE: FULL SCREEN CREATE / EDIT FORM (MATCHING REFERENCE IMAGE)
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
                  <span className="truncate max-w-[130px]">{tab.title}</span>
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

            {/* Plus Tab Button (CRM Theme - Adds another estimate) */}
            <button
              type="button"
              onClick={handleAddNewTab}
              className="w-7 h-7 rounded-full bg-[#33077C] hover:bg-[#4309A2] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer ml-1"
              title="Add New Estimate Tab"
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
                Estimate/Quotation
              </h1>
              <p className="text-xs text-slate-500">
                {editingQuotation ? `Edit Quotation ${editingQuotation.quotationNo}` : 'Create a new customer estimation / quotation'}
              </p>
            </div>
          </div>
        </div>

        {/* 3. MAIN FORM CONTAINER */}
        <form
          id="quotation-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveEstimate();
          }}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6 flex-1 flex flex-col justify-between mb-6"
        >
          <div>
            {/* Top Meta Details (Party + Ref/Date/State) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-6 border-b border-slate-100">
              {/* Left Column: Party Floating Box (CRM Theme) */}
              <div className="lg:col-span-6 xl:col-span-5" ref={partySelectRef}>
                <div className="relative">
                  {/* Floating Box Input */}
                  <div
                    onClick={() => setPartySearchOpen(!partySearchOpen)}
                    className={`relative w-full min-h-[46px] px-3.5 py-2 bg-white border-2 rounded-xl text-xs sm:text-[13px] font-medium flex items-center justify-between cursor-pointer transition-all ${
                      partySearchOpen
                        ? 'border-[#33077C] ring-4 ring-purple-100'
                        : formData.partyName
                        ? 'border-purple-300 hover:border-[#33077C]'
                        : 'border-slate-300 hover:border-[#33077C]'
                    }`}
                  >
                    {/* Floating Label Badge */}
                    <span className="absolute -top-2.5 left-3 bg-white px-1.5 text-[11px] font-bold text-[#33077C]">
                      Party <span className="text-rose-500">*</span>
                    </span>

                    {/* Display Party Name or Placeholder */}
                    <div className="truncate pr-2">
                      {formData.partyName ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{formData.partyName}</span>
                          {formData.customerCompany && (
                            <span className="text-slate-500 text-xs">({formData.customerCompany})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Select or search customer party...</span>
                      )}
                    </div>

                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>

                  {/* Dropdown Menu for Party Selection */}
                  {partySearchOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      {/* Search Bar */}
                      <div className="relative mb-2">
                        <div className="flex items-center w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-[#33077C] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#33077C]/10 transition-all">
                          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                          <input
                            type="text"
                            placeholder="Search Party by name, phone or code..."
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
                        <span>+ Add New Party / Customer</span>
                      </button>

                      {/* Customer List */}
                      <div className="max-h-56 overflow-y-auto space-y-1">
                        {filteredCustomers.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400 font-medium">
                            No customers found. Click "+ Add New Party" above.
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

              {/* Right Column: Ref No, Invoice Date, State of supply */}
              <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-end gap-3 text-xs">
                {/* Ref No. */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <span className="font-medium text-slate-600 w-24 sm:w-auto text-right">Ref No.</span>
                  <input
                    type="text"
                    value={formData.referenceNo}
                    onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                    className="w-40 sm:w-48 h-9 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none text-right transition-colors"
                  />
                </div>

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
                              setShowSettingsPopover(true);
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
                      <td className="p-1.5 border-r border-slate-200">
                        <div className="relative">
                          <input
                            type="text"
                            value={row.productName}
                            onChange={(e) => handleRowChange(idx, 'productName', e.target.value)}
                            placeholder="Type or select product item..."
                            list={`product-list-${idx}`}
                            className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                          />
                          <datalist id={`product-list-${idx}`}>
                            {availableProducts.map((s) => (
                              <option key={s.productId} value={s.productName}>
                                SKU: {s.sku} • ₹{s.unitPrice}
                              </option>
                            ))}
                          </datalist>
                        </div>
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
                    <label className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider">Terms & Conditions</label>
                    <textarea
                      rows={3}
                      value={formData.terms}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                      placeholder="Enter quotation terms and conditions..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#33077C]"
                    />
                  </div>
                )}

                {showDescriptionSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-1.5 animate-in fade-in duration-100">
                    <label className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider">Quotation Description / Notes</label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add custom notes or delivery remarks for this estimate..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#33077C]"
                    />
                  </div>
                )}

                {showImageSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-2 animate-in fade-in duration-100 text-xs">
                    <label className="font-bold text-[#33077C] uppercase text-[11px] tracking-wider">Attach Image</label>
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
                    <label className="font-bold text-[#33077C] uppercase text-[11px] tracking-wider">Attach Document / PDF</label>
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
              <div className="estimate-share-footer-container relative">
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
                          `Estimate Quotation from YAA Mart\nQuotation: ${formData.quotationNo}\nParty: ${formData.partyName}\nAmount: ₹${formCalculations.grandTotal}`
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
                        const subject = encodeURIComponent(`Estimate Quotation ${formData.quotationNo}`);
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
                form="quotation-form"
                icon={<Check className="w-4 h-4 text-white stroke-[3]" />}
              >
                Save
              </Button>
            </div>
          </div>
        </form>

        {/* Quick Add Customer Modal */}
        {isQuickCustomerModalOpen && (
          <Modal
            isOpen={isQuickCustomerModalOpen}
            onClose={() => setIsQuickCustomerModalOpen(false)}
            title="Add New Party / Customer"
            maxWidth="md"
          >
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateQuickCustomer();
              }}
              className="p-5 space-y-4 text-xs pt-6"
            >
              <div className="relative">
                <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                  <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                    Customer / Party Name <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="e.g. Anand Supermarket"
                    className="w-full h-full px-4 bg-transparent text-xs sm:text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div className="relative">
                <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                  <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                    Company / Store Name
                  </span>
                  <input
                    type="text"
                    value={newCustomerCompany}
                    onChange={(e) => setNewCustomerCompany(e.target.value)}
                    placeholder="e.g. Anand Mart Pvt Ltd"
                    className="w-full h-full px-4 bg-transparent text-xs sm:text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div className="relative">
                <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                  <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                    Phone Number
                  </span>
                  <input
                    type="text"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="e.g. +91 98400 55667"
                    className="w-full h-full px-4 bg-transparent text-xs sm:text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setIsQuickCustomerModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                >
                  Save Party
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: ESTIMATE & QUOTATION LIST TABLE
  // =========================================================================
  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Estimate / Quotation
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {metrics.totalCount} total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Create, track, and convert sales quotations & estimates into confirmed invoices.
            </p>
            <div className="flex items-center gap-2.5 mt-2 flex-wrap">

              <button
                type="button"
                onClick={() => fetchQuotations(page, pageSize, appliedSearch, appliedStatus, appliedPeriod)}
                disabled={isApiLoading}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#33077C] transition-colors px-2 py-0.5 rounded hover:bg-slate-100 cursor-pointer"
                title="Sync from API"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isApiLoading ? 'animate-spin text-[#33077C]' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Excel Report Button */}
          <Button
            variant="secondary"
            size="md"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            onClick={handleExport}
            className="hover:border-emerald-500 hover:text-emerald-700 transition-colors"
          >
            Excel Report
          </Button>

          {/* Add Estimate Button (Themed) */}
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4 text-white stroke-[2.5]" />}
            onClick={handleOpenCreateForm}
            className="bg-[#33077C] hover:bg-[#280563] text-white shadow-sm hover:shadow transition-all"
          >
            Add Estimate
          </Button>
        </div>
      </div>

      {/* 2. Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Quotations */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Quotations
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              ₹ {metrics.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {metrics.totalCount} quotations generated
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Open Estimates */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-amber-600 uppercase tracking-wider">
              Open Estimates
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
              ₹ {metrics.openAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {metrics.openCount} awaiting customer confirmation
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Converted Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Converted Invoices
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              ₹ {metrics.convertedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {metrics.convertedCount} successfully converted
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Unified SearchBar with FilterDropdown */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => {
          setPendingSearch(val);
          setAppliedSearch(val);
          setPage(1);
        }}
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setAppliedPeriod('all');
          setAppliedStatus('ALL');
          setPage(1);
        }}
        placeholder="Search by party name, quotation #, ref no..."
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
              Total Quotations : <span className="text-[#33077C] font-bold">{metrics.totalCount}</span>
            </span>
          </div>
        }
      />

      {/* 4. Estimates & Quotations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            {/* Table Purple Themed Header */}
            <thead>
              <tr className="bg-[#33077C] text-white text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>DATE</span>
                    <Calendar className="w-3 h-3 text-purple-200 opacity-80" />
                  </div>
                </th>
                <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 whitespace-nowrap text-center">
                  REF NO.
                </th>
                <th className="py-3.5 px-3 sm:px-5 border-r border-[#4309A2]/60 min-w-[180px]">
                  PARTY NAME
                </th>
                <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 text-right whitespace-nowrap">
                  AMOUNT
                </th>
                <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 text-right whitespace-nowrap">
                  BALANCE
                </th>
                <th className="py-3.5 px-3 sm:px-4 border-r border-[#4309A2]/60 text-center whitespace-nowrap">
                  STATUS
                </th>
                <th className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap w-28">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs sm:text-[13px] text-slate-700">
              {isApiLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 font-medium">
                    <div className="inline-flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#33077C]" />
                      <span className="text-xs">Fetching quotations from Commerce API...</span>
                    </div>
                  </td>
                </tr>
              ) : pagedQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No estimate / quotation transactions found. Click "+ Add Estimate" to create one.
                  </td>
                </tr>
              ) : (
                pagedQuotations.map((item) => {
                  const isConvertOpen = activeConvertDropdownId === item.id;
                  const isActionOpen = activeDropdownId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-50/30 transition-colors border-b border-slate-200"
                    >
                      {/* 1. Date */}
                      <td className="py-3.5 px-3 sm:px-4 font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap">
                        {isoToDdmmyyyy(item.date)}
                      </td>

                      {/* 2. Reference no */}
                      <td className="py-3.5 px-3 sm:px-4 font-bold text-slate-800 text-center border-r border-slate-200 whitespace-nowrap">
                        {item.referenceNo || '1'}
                      </td>

                      {/* 3. Party Name */}
                      <td className="py-3.5 px-3 sm:px-5 font-semibold text-slate-900 border-r border-slate-200 break-words">
                        <div>{item.partyName}</div>
                        {item.customerPhone && (
                          <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                            {item.customerPhone}
                          </div>
                        )}
                      </td>

                      {/* 4. Amount */}
                      <td className="py-3.5 px-3 sm:px-4 text-right font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                        ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 5. Balance */}
                      <td className="py-3.5 px-3 sm:px-4 text-right font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap">
                        ₹ {item.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 6. Status Pill with Dot */}
                      <td className="py-3.5 px-3 sm:px-4 text-center border-r border-slate-200 whitespace-nowrap">
                        {item.status === 'Open' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Open
                          </span>
                        ) : item.status === 'Converted' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Converted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* 7. Actions */}
                      <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* Convert Action Button with Dropdown */}
                          <div className="quotation-convert-dropdown-container relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
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
                                }
                              }}
                              className="text-xs sm:text-[13px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-transparent hover:bg-blue-50/60 flex items-center gap-1 px-1.5 py-1 rounded transition-colors cursor-pointer select-none"
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
                                className="quotation-convert-dropdown-menu w-52 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-left font-sans overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleOpenConvertModal(item, 'Invoice')}
                                  className="w-full text-left px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-2.5"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Convert to Sale Invoice</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenConvertModal(item, 'Order')}
                                  className="w-full text-left px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-2.5"
                                >
                                  <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Convert to Sale Order</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenConvertModal(item, 'Proforma')}
                                  className="w-full text-left px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-2.5"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Convert to Proforma</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* 3-Dots Action Menu Button (matching screenshot) */}
                          <div className="quotation-action-dropdown-container relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isActionOpen) {
                                  setActiveDropdownId(null);
                                  setDropdownPos(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const dropdownHeight = 240;
                                  if (spaceBelow < dropdownHeight) {
                                    setDropdownPos({
                                      bottom: window.innerHeight - rect.top + 4,
                                      right: window.innerWidth - rect.right,
                                    });
                                  } else {
                                    setDropdownPos({
                                      top: rect.bottom + 4,
                                      right: window.innerWidth - rect.right,
                                    });
                                  }
                                  setActiveDropdownId(item.id);
                                  setActiveConvertDropdownId(null);
                                }
                              }}
                              className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
                              title="More Options"
                            >
                              <MoreVertical className="w-4 h-4 text-slate-600" />
                            </button>

                            {/* 3-Dots Floating Dropdown Menu */}
                            {isActionOpen && dropdownPos && (
                              <div
                                style={{
                                  position: 'fixed',
                                  top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
                                  bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
                                  right: `${dropdownPos.right}px`,
                                  zIndex: 9999,
                                }}
                                className="quotation-action-dropdown-menu w-44 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-2 animate-in fade-in zoom-in-95 duration-100 text-left font-sans overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* 1. View/Edit */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleOpenEditForm(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  View/Edit
                                </button>

                                {/* 2. Delete */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleDelete(item.id, item.quotationNo);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Delete
                                </button>

                                {/* 3. Duplicate */}
                                <button
                                  type="button"
                                  onClick={() => handleDuplicate(item)}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Duplicate
                                </button>

                                {/* 4. Open PDF */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenPreview(item)}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Open PDF
                                </button>

                                {/* 5. Preview */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenPreview(item)}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Preview
                                </button>

                                {/* 6. Print */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handlePrintQuotation(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Print
                                </button>

                                {/* 7. Status Actions via Live API */}
                                {item.status === 'Open' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setActiveDropdownId(null);
                                      try {
                                        await quotationApi.updateStatus(item.id, { status: 'Cancelled' });
                                        toast.success(`Quotation ${item.quotationNo} marked as Cancelled`);
                                        updateQuotationStatus(item.id, 'Cancelled');
                                        await fetchQuotations(page, pageSize, appliedSearch, appliedStatus, appliedPeriod);
                                      } catch (err: any) {
                                        toast.error(err.message || 'Failed to cancel quotation');
                                      }
                                    }}
                                    className="w-full text-left px-4 py-2 text-[13px] font-normal text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer block border-t border-slate-100"
                                  >
                                    Cancel Quotation
                                  </button>
                                )}

                                {item.status === 'Cancelled' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setActiveDropdownId(null);
                                      try {
                                        await quotationApi.updateStatus(item.id, { status: 'Open' });
                                        toast.success(`Quotation ${item.quotationNo} reopened as Open`);
                                        updateQuotationStatus(item.id, 'Open');
                                        await fetchQuotations(page, pageSize, appliedSearch, appliedStatus, appliedPeriod);
                                      } catch (err: any) {
                                        toast.error(err.message || 'Failed to reopen quotation');
                                      }
                                    }}
                                    className="w-full text-left px-4 py-2 text-[13px] font-normal text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer block border-t border-slate-100"
                                  >
                                    Reopen (Mark Open)
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination */}
        <Pagination
          currentPage={safePage}
          total={metrics.totalCount}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
        />
      </div>

      {/* 6. Preview Modal */}
      {previewQuotation && (
        <Modal
          isOpen={Boolean(previewQuotation)}
          onClose={() => setPreviewQuotation(null)}
          title={`Estimate Preview - ${previewQuotation.quotationNo}`}
          maxWidth="3xl"
        >
          <div className="p-6 space-y-5 text-slate-800">
            {/* Header info */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#33077C]">YAA SALES & MART</h3>
                <p className="text-xs text-slate-500">Estimate / Quotation</p>
                <div className="mt-2 text-xs">
                  <strong>Party: </strong>{previewQuotation.partyName}
                  {previewQuotation.customerCompany && ` (${previewQuotation.customerCompany})`}
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-bold text-slate-900">#{previewQuotation.quotationNo}</div>
                <div className="text-slate-500 mt-1">Ref: {previewQuotation.referenceNo || '1'}</div>
                <div className="text-slate-500">Date: {isoToDdmmyyyy(previewQuotation.date)}</div>
                <div className="mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                    {previewQuotation.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-2.5 text-left text-white">Item</th>
                  <th className="p-2.5 text-center w-28 text-white">Batch No</th>
                  <th className="p-2.5 text-center w-16 text-white">Qty</th>
                  <th className="p-2.5 text-right w-24 text-white">Rate (₹)</th>
                  <th className="p-2.5 text-right w-28 text-white">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewQuotation.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-semibold text-slate-800">{it.productName}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-[#33077C]">{it.batch || '—'}</td>
                    <td className="p-2.5 text-center">{it.quantity}</td>
                    <td className="p-2.5 text-right">₹{Number(it.unitPrice).toLocaleString()}</td>
                    <td className="p-2.5 text-right font-bold">₹{Number(it.total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div className="flex justify-end pt-2">
              <div className="text-right space-y-1 text-xs">
                <div className="text-slate-600">Subtotal: <strong>₹{previewQuotation.subtotal.toLocaleString()}</strong></div>
                {previewQuotation.taxAmount ? (
                  <div className="text-slate-600">Tax: <strong>₹{previewQuotation.taxAmount.toLocaleString()}</strong></div>
                ) : null}
                <div className="text-base font-extrabold text-[#33077C] pt-1 border-t border-slate-200">
                  Grand Total: ₹{previewQuotation.amount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setPreviewQuotation(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  handlePrintQuotation(previewQuotation);
                }}
                icon={<Printer className="w-4 h-4 text-white" />}
              >
                Print Quotation
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. Convert Quotation Live API Modal */}
      {isConvertModalOpen && convertTargetQuotation && (
        <Modal
          isOpen={isConvertModalOpen}
          onClose={() => {
            if (!isConverting) {
              setIsConvertModalOpen(false);
              setConvertTargetQuotation(null);
            }
          }}
          title={`Convert Quotation ${convertTargetQuotation.quotationNo}`}
          maxWidth="md"
        >
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteConvert();
            }}
            className="p-6 space-y-5 text-xs text-slate-700"
          >
            {/* Summary Banner */}
            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200/80 flex items-start justify-between">
              <div>
                <div className="font-bold text-slate-800 text-sm">{convertTargetQuotation.partyName}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Quotation: <span className="font-semibold text-slate-700">{convertTargetQuotation.quotationNo}</span> | Date: {isoToDdmmyyyy(convertTargetQuotation.date)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Amount</div>
                <div className="text-base font-extrabold text-[#33077C]">
                  ₹ {convertTargetQuotation.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Target Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Convert To Document Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { type: 'Invoice' as const, label: 'Sale Invoice', icon: ShoppingCart, desc: 'Deducts stock' },
                  { type: 'Order' as const, label: 'Sale Order', icon: FileCheck, desc: 'Order workflow' },
                  { type: 'Proforma' as const, label: 'Proforma', icon: FileSpreadsheet, desc: 'Draft / Quote' },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = convertType === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setConvertType(opt.type)}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#33077C] bg-purple-50/50 text-[#33077C] shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-[#33077C]' : 'text-slate-500'}`} />
                        <span className="font-bold text-xs">{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Due Date Picker */}
            <div className="relative">
              <div className="relative w-full h-11 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl transition-all shadow-2xs flex items-center">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Payment / Document Due Date
                </span>
                <input
                  type="date"
                  value={convertDueDate}
                  onChange={(e) => setConvertDueDate(e.target.value)}
                  className="w-full h-full px-4 bg-transparent text-xs sm:text-sm font-medium outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 pl-1">
                Specifies the settlement due date for the generated {convertType}.
              </p>
            </div>

            {/* Information Notice */}
            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                Converting will mark this quotation as <strong>Converted</strong>.
                {convertType === 'Invoice' && ' Inventory stock will be automatically updated.'} Once converted, this quotation cannot be converted again.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
              <Button
                variant="secondary"
                size="md"
                type="button"
                disabled={isConverting}
                onClick={() => {
                  setIsConvertModalOpen(false);
                  setConvertTargetQuotation(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isConverting}
                icon={
                  isConverting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Check className="w-4 h-4 text-white" />
                  )
                }
              >
                {isConverting ? `Converting to ${convertType}...` : `Confirm & Convert to ${convertType}`}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default EstimateQuotationView;
