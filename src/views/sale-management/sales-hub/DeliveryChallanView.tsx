import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Truck,
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
  FileText,
  User,
  IndianRupee,
  TrendingUp,
  Calendar,
  Building2,
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
  Package,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  useSalesManagementStore,
  SaleProductItem,
  SalesCustomer,
  SaleTransaction,
} from '../../../store/useSalesManagementStore';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exportTableToExcel } from '../../../utils/excelExport';
import { printBusinessDocument } from '../../../utils/printUtils';
import { SaleActionDropdown } from '../utils/SaleActionDropdown';
import { useAppDispatch } from '../../../hooks/redux';
import { baseApi } from '../../../api/baseApi';
import {
  commerceDeliveryChallanApi,
  mapApiDeliveryChallanToRecord,
  mapDeliveryChallanRecordToPayload,
  DeliveryChallanRecord,
  ExtendedChallanItem,
  UUID_REGEX,
} from '../../../api/commerce/deliveryChallanApi';
import { customerApi } from '../../../api/commerce/customerApi';
import { productApi } from '../../../api/commerce/productApi';
import { ApiCustomer } from '../../../api/commerce/customerTypes';
import { ApiProduct } from '../../../api/commerce/productTypes';
import {
  syncConvertedInvoiceToStorage,
  recordDocumentConversion,
  findDocumentLineage,
  initializeWorkflowIntegrity,
} from '../../../utils/salesDocumentWorkflow';
import { DocumentLineageBadges } from '../../../components/common/DocumentLineageBadges';
import { FormLabel, FORM_INPUT_CLS, getFormInputCls, handleNumberOnlyKeyDown } from '../utils/formUtils';
import { normalizeIndianPhoneTo10Digits } from '../../../utils/validation';
import { FormError } from '../../../components/common/FormError';

// Helper for dd/mm/yyyy <-> YYYY-MM-DD
const isoToDdmmyyyy = (iso?: string): string => {
  if (!iso) return '';
  const clean = iso.includes('T') ? iso.split('T')[0] : iso;
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return clean;
};

const ddmmyyyyToIso = (dmy?: string): string => {
  if (!dmy) return '';
  const parts = dmy.split('/');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dmy;
};

const mapPeriodToApiPeriod = (periodLabel: string): string => {
  switch (periodLabel) {
    case 'Today':
      return 'today';
    case 'This Week':
      return 'this_week';
    case 'This Month':
      return 'this_month';
    case 'Last 30 Days':
    case 'Last Month':
      return 'last_month';
    case 'This Quarter':
      return 'this_quarter';
    case 'This Financial Year':
    case 'This Year':
      return 'this_year';
    case 'All Time':
    default:
      return 'all';
  }
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
  { label: 'This Month', value: 'This Month' },
  { label: 'Last 30 Days', value: 'Last 30 Days' },
  { label: 'This Quarter', value: 'This Quarter' },
  { label: 'This Financial Year', value: 'This Financial Year' },
  { label: 'All Time', value: 'All Time' },
];

const STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Open', value: 'Open', dotColor: '#f59e0b' },
  { label: 'Converted', value: 'Converted', dotColor: '#10b981' },
  { label: 'Delivered', value: 'Delivered', dotColor: '#3b82f6' },
  { label: 'Cancelled', value: 'Cancelled', dotColor: '#ef4444' },
];

export interface TableColumnSettings {
  showItemCategory: boolean;
  showItemCode: boolean;
  showHsnSac: boolean;
  showDescription: boolean;
  showDiscount: boolean;
}

export interface ChallanTabItem {
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
    shippingAddress: string;
    challanNo: string;
    referenceNo: string;
    invoiceDate: string;
    dueDate: string;
    stateOfSupply: string;
    items: ExtendedChallanItem[];
    notes: string;
    terms: string;
    vehicleNo?: string;
    driverName?: string;
    driverPhone?: string;
  };
  editingChallan?: DeliveryChallanRecord | null;
  enableRoundOff?: boolean;
  manualRoundOff?: number | null;
  columnSettings?: TableColumnSettings;
}

interface DeliveryChallanViewProps {
  initialMode?: 'list' | 'form';
}

export const DeliveryChallanView: React.FC<DeliveryChallanViewProps> = ({
  initialMode = 'list',
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const {
    customers: localCustomers,
    stocks: localStocks,
    saveCustomer: saveCustomerLocal,
    saveSale,
  } = useSalesManagementStore();

  useEffect(() => {
    initializeWorkflowIntegrity();
  }, []);

  // Delivery Challan State with LocalStorage Cache
  const [challans, setChallans] = useState<DeliveryChallanRecord[]>(() => {
    try {
      const saved = localStorage.getItem('yaa_crm_delivery_challans');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const persistChallans = (updated: DeliveryChallanRecord[]) => {
    setChallans(updated);
    try {
      localStorage.setItem('yaa_crm_delivery_challans', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save delivery challans', e);
    }
  };

  // Master Data Cache
  const [liveCustomers, setLiveCustomers] = useState<ApiCustomer[]>([]);
  const [liveProducts, setLiveProducts] = useState<ApiProduct[]>([]);

  // API State & Loading Indicators
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [totalApiRecords, setTotalApiRecords] = useState(0);
  const [totalApiPages, setTotalApiPages] = useState(1);

  // View Mode: 'list' vs 'form'
  const [viewMode, setViewMode] = useState<'list' | 'form'>(initialMode);

  useEffect(() => {
    setViewMode(initialMode);
  }, [initialMode]);

  // Search & Filters
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingPeriod, setPendingPeriod] = useState('This Month');
  const [appliedPeriod, setAppliedPeriod] = useState('This Month');
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

  // Party Dropdown
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const partyDropdownRef = useRef<HTMLDivElement>(null);

  // Preview Modal
  const [previewChallan, setPreviewChallan] = useState<DeliveryChallanRecord | null>(null);

  // 3-Dots Action Dropdown State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Bulk Convert Modal State
  const [isBulkConvertModalOpen, setIsBulkConvertModalOpen] = useState(false);
  const [selectedBulkChallanIds, setSelectedBulkChallanIds] = useState<string[]>([]);

  // Table Column Settings
  const [columnSettings, setColumnSettings] = useState<TableColumnSettings>({
    showItemCategory: false,
    showItemCode: false,
    showHsnSac: false,
    showDescription: false,
    showDiscount: true,
  });
  const [showColumnCustomizePopover, setShowColumnCustomizePopover] = useState(false);

  // Tax Mode
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
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustEmail, setQuickCustEmail] = useState('');
  const [quickCustCompany, setQuickCustCompany] = useState('');
  const [quickCustAddress, setQuickCustAddress] = useState('');
  const [quickCustOpeningBal, setQuickCustOpeningBal] = useState('0');
  const [quickCustPhoneError, setQuickCustPhoneError] = useState('');

  // Close dropdown on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.delivery-challan-action-dropdown-container') && !target.closest('.delivery-challan-action-dropdown-menu')) {
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

  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const hasLoadedMasterDataRef = useRef(false);

  // Load Customers master data (products are searched on demand)
  const loadMasterData = useCallback(async () => {
    if (hasLoadedMasterDataRef.current) return;
    hasLoadedMasterDataRef.current = true;
    try {
      const custRes = await customerApi.getCustomers({ pagination_required: false });
      if (custRes?.data && Array.isArray(custRes.data)) {
        setLiveCustomers(custRes.data);
      }
    } catch (e) {
      console.warn('Using local fallback for customers master', e);
    }
  }, []);

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
      if (res?.data && Array.isArray(res.data)) {
        setLiveProducts((prev) => {
          const map = new Map<string, ApiProduct>();
          prev.forEach((p) => map.set(p.id, p));
          res.data.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('Failed to search products in DeliveryChallanView:', err);
    } finally {
      setIsSearchingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'form') {
      loadMasterData();
    }
  }, [viewMode, loadMasterData]);

  // Fetch Delivery Challans from Live Backend API
  const isFetchingChallansRef = useRef(false);
  const fetchDeliveryChallans = useCallback(async () => {
    if (isFetchingChallansRef.current) return;
    isFetchingChallansRef.current = true;
    setIsApiLoading(true);
    try {
      const apiPeriod = mapPeriodToApiPeriod(appliedPeriod);
      const apiStatus = appliedStatus === 'ALL' ? undefined : appliedStatus;
      const res = await commerceDeliveryChallanApi.getChallans({
        page_no: page,
        page_size: pageSize,
        pagination_required: true,
        search: appliedSearch.trim() || undefined,
        status: apiStatus,
        period: apiPeriod,
        sortOrder: 'desc',
      });

      if (res && Array.isArray(res.data)) {
        const records = res.data.map((item) => mapApiDeliveryChallanToRecord(item));
        persistChallans(records);
        setTotalApiRecords(res.pagination?.totalRecords ?? records.length);
        setTotalApiPages(res.pagination?.totalPages ?? Math.max(1, Math.ceil(records.length / pageSize)));
        setIsApiConnected(true);
      }
    } catch (err: any) {
      console.warn('Could not reach Commerce Delivery Challans API, using offline cache:', err);
      setIsApiConnected(false);
    } finally {
      setIsApiLoading(false);
      isFetchingChallansRef.current = false;
    }
  }, [page, pageSize, appliedSearch, appliedStatus, appliedPeriod]);

  useEffect(() => {
    fetchDeliveryChallans();
  }, [fetchDeliveryChallans]);

  // Combined Customers (Live API + Local Store)
  const allCustomers = useMemo(() => {
    if (liveCustomers.length > 0) {
      return liveCustomers.map((c) => ({
        id: c.id,
        customerCode: c.customerCode || 'CUST',
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        company: c.company || '',
        address: c.address || c.billingAddress || '',
        billingAddress: c.billingAddress || c.address || '',
        shippingAddress: c.shippingAddress || c.billingAddress || c.address || '',
        state: c.state || '',
        openingBalance: c.openingBalance || 0,
      }));
    }
    return localCustomers;
  }, [liveCustomers, localCustomers]);

  // Combined Stock Items / Products (Live API + Local Store)
  const allStockItems = useMemo(() => {
    const map = new Map<string, any>();

    liveProducts.forEach((p) => {
      let tax = 5;
      if (typeof (p as any).taxPercent === 'number') {
        tax = (p as any).taxPercent;
      } else if (p.taxRate) {
        const parsed = parseFloat(String(p.taxRate).replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed)) tax = parsed;
      }
      map.set(p.id, {
        id: p.id,
        productId: p.id,
        productName: p.productName || (p as any).name || 'Unnamed Product',
        sku: p.productCode || (p as any).sku || '',
        unitPrice: Number(p.salePrice ?? (p as any).sellingPrice ?? (p as any).price ?? (p as any).unitPrice ?? 0),
        unit: p.unit || 'PCS',
        taxPercent: tax,
        hsnCode: p.hsnCode || '',
        category: p.category || '',
        batches: (p as any).batches || (p as any).stockBatches || [],
      });
    });

    localStocks.forEach((s) => {
      const pid = (s as any).productId || s.id;
      if (!map.has(pid)) {
        map.set(pid, {
          id: s.id,
          productId: pid,
          productName: s.productName || (s as any).name || 'Unnamed Product',
          sku: s.sku || (s as any).itemCode || '',
          unitPrice: Number(s.unitPrice ?? (s as any).salePrice ?? (s as any).sellingPrice ?? (s as any).price ?? 0),
          unit: s.unit || 'PCS',
          taxPercent: 5,
          hsnCode: (s as any).hsnCode || '',
          category: s.category || '',
          batches: s.batches || [],
        });
      }
    });

    return Array.from(map.values());
  }, [liveProducts, localStocks]);

  const productOptions = useMemo(() => {
    return allStockItems.map((s: any) => ({
      value: s.productId || s.id,
      label: s.productName,
      subLabel: s.sku
        ? `SKU: ${s.sku} • ₹${Number(s.unitPrice || 0).toLocaleString('en-IN')}`
        : `₹${Number(s.unitPrice || 0).toLocaleString('en-IN')}`,
      badge: s.sku || undefined,
    }));
  }, [allStockItems]);

  // Auto-generate Challan Number
  const generateNextChallanNo = () => {
    const year = new Date().getFullYear();
    const count = challans.length + 1;
    return `DC-${year}-${String(count).padStart(4, '0')}`;
  };

  // Initial Form Data State
  const createEmptyFormData = (customNum = 1) => {
    const firstProduct = allStockItems[0];
    return {
      customerId: '',
      partyName: '',
      customerPhone: '',
      customerEmail: '',
      customerCompany: '',
      billingAddress: '',
      shippingAddress: '',
      challanNo: generateNextChallanNo(),
      referenceNo: String(customNum),
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      stateOfSupply: '33-Tamil Nadu',
      items: [
        {
          id: `dci_item_${Date.now()}_1`,
          productId: firstProduct?.productId || firstProduct?.id || '',
          productName: firstProduct?.productName || '',
          sku: firstProduct?.sku || '',
          quantity: 1,
          unit: firstProduct?.unit || 'PCS',
          unitPrice: firstProduct?.unitPrice || 0,
          discountPercent: 0,
          taxPercent: firstProduct?.taxPercent || 5,
          total: firstProduct?.unitPrice || 0,
        },
      ] as ExtendedChallanItem[],
      notes: '',
      terms:
        '1. Received the goods listed above in good order and condition.\n2. Delivery Challan does not transfer ownership until full payment is settled.\n3. Goods sent for inspection / delivery.',
      vehicleNo: '',
      driverName: '',
      driverPhone: '',
    };
  };

  // Multiple Tabs System
  const [tabs, setTabs] = useState<ChallanTabItem[]>([
    {
      id: 'tab-1',
      title: 'Delivery Challan #1',
      num: 1,
      formData: createEmptyFormData(1),
      editingChallan: null,
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
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0];
  }, [tabs, activeTabId]);

  const updateActiveTabFormData = (
    updater: (prev: typeof activeTab.formData) => typeof activeTab.formData
  ) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, formData: updater(t.formData) } : t))
    );
  };

  // Add Tab
  const handleAddNewTab = () => {
    const nextNum = tabs.length + 1;
    const newTabId = `tab-${Date.now()}`;
    const newTab: ChallanTabItem = {
      id: newTabId,
      title: `Delivery Challan #${nextNum}`,
      num: nextNum,
      formData: createEmptyFormData(nextNum),
      editingChallan: null,
      enableRoundOff: true,
      manualRoundOff: null,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  // Close Tab
  const handleCloseTab = (tabIdToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      setViewMode('list');
      return;
    }
    const filtered = tabs.filter((t) => t.id !== tabIdToClose);
    setTabs(filtered);
    if (activeTabId === tabIdToClose) {
      setActiveTabId(filtered[filtered.length - 1].id);
    }
  };

  // Open Create Form
  const handleOpenCreateForm = () => {
    loadMasterData();
    const nextNum = tabs.length;
    const newForm = createEmptyFormData(nextNum);
    setTabs([
      {
        id: `tab-${Date.now()}`,
        title: `Delivery Challan #${nextNum}`,
        num: nextNum,
        formData: newForm,
        editingChallan: null,
        enableRoundOff: true,
      },
    ]);
    setActiveTabId(`tab-${Date.now()}`);
    setViewMode('form');
  };

  // Open Edit Form
  const handleOpenEditForm = (challan: DeliveryChallanRecord) => {
    loadMasterData();
    const editTabId = `tab-edit-${challan.id}`;
    const newTab: ChallanTabItem = {
      id: editTabId,
      title: `Edit ${challan.challanNo}`,
      num: 1,
      formData: {
        customerId: challan.customerId,
        partyName: challan.partyName,
        customerPhone: challan.customerPhone || '',
        customerEmail: challan.customerEmail || '',
        customerCompany: challan.customerCompany || '',
        billingAddress: challan.billingAddress || '',
        shippingAddress: challan.shippingAddress || challan.billingAddress || '',
        challanNo: challan.challanNo,
        referenceNo: challan.referenceNo || '1',
        invoiceDate: challan.invoiceDate,
        dueDate: challan.dueDate,
        stateOfSupply: challan.stateOfSupply || '33-Tamil Nadu',
        items: challan.items.length > 0 ? challan.items : createEmptyFormData().items,
        notes: challan.notes || '',
        terms: challan.terms || '',
        vehicleNo: challan.vehicleNo || '',
        driverName: challan.driverName || '',
        driverPhone: challan.driverPhone || '',
      },
      editingChallan: challan,
      enableRoundOff: challan.roundOff !== undefined,
      manualRoundOff: challan.roundOff || null,
    };
    setTabs([newTab]);
    setActiveTabId(editTabId);
    setAttachedImageName(challan.attachedImageName || null);
    setAttachedDocName(challan.attachedDocName || null);
    setViewMode('form');
  };

  // Select Customer from dropdown list
  const handleSelectCustomer = (customer: any) => {
    updateActiveTabFormData((prev) => ({
      ...prev,
      customerId: customer.id,
      partyName: customer.name,
      customerPhone: customer.phone || '',
      customerEmail: customer.email || '',
      customerCompany: customer.company || '',
      billingAddress: customer.billingAddress || customer.address || '',
      shippingAddress: customer.shippingAddress || customer.billingAddress || customer.address || '',
      stateOfSupply: customer.state ? `${customer.state}` : prev.stateOfSupply,
    }));
    setPartySearchQuery(customer.name);
    setIsPartyDropdownOpen(false);
  };

  // Quick Customer Creation
  const handleSaveQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    if (quickCustPhone.trim()) {
      const cleanPhone = normalizeIndianPhoneTo10Digits(quickCustPhone);
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        toast.error('Please enter a valid 10-digit Indian phone number (starts with 6, 7, 8, or 9)');
        setQuickCustPhoneError('Phone number must be a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)');
        return;
      }
    }
    setQuickCustPhoneError('');

    try {
      setIsActionLoading(true);
      const payload = {
        name: quickCustName.trim(),
        phone: quickCustPhone.trim() || '9876543210',
        email: quickCustEmail.trim() || undefined,
        company: quickCustCompany.trim() || undefined,
        customerType: 'Business' as const,
        billingAddress: quickCustAddress.trim() || undefined,
        shippingAddress: quickCustAddress.trim() || undefined,
        openingBalance: Number(quickCustOpeningBal) || 0,
      };

      let createdCustomerId = `cust_${Date.now()}`;
      try {
        const apiRes = await customerApi.createCustomer(payload);
        if (apiRes?.data?.id) {
          createdCustomerId = apiRes.data.id;
        }
      } catch (err) {
        console.warn('API customer creation fallback to local state');
      }

      const newCust: SalesCustomer = {
        id: createdCustomerId,
        customerCode: `CUS-${Math.floor(1000 + Math.random() * 9000)}`,
        name: quickCustName.trim(),
        phone: quickCustPhone.trim(),
        email: quickCustEmail.trim(),
        company: quickCustCompany.trim(),
        customerType: 'Business',
        address: quickCustAddress.trim(),
        billingAddress: quickCustAddress.trim(),
        shippingAddress: quickCustAddress.trim(),
        sameAsBilling: true,
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        pincode: '600001',
        creditLimit: 50000,
        paymentTerms: 'Net 15 Days',
        openingBalance: Number(quickCustOpeningBal) || 0,
        preferredPaymentMethod: 'Cash',
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveCustomerLocal(newCust);
      handleSelectCustomer(newCust);
      setIsQuickCustomerModalOpen(false);
      setQuickCustName('');
      setQuickCustPhone('');
      setQuickCustEmail('');
      setQuickCustCompany('');
      setQuickCustAddress('');
      setQuickCustOpeningBal('0');
      toast.success(`Customer "${newCust.name}" registered and selected!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create customer');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Items Table Changes
  const handleItemChange = (index: number, field: keyof ExtendedChallanItem, value: any) => {
    updateActiveTabFormData((prev) => {
      const updatedItems = [...prev.items];
      const target = { ...updatedItems[index], [field]: value };

      if (field === 'productId') {
        const foundStock = allStockItems.find(
          (s: any) =>
            s.productId === value ||
            s.id === value ||
            (s.productName && s.productName.toLowerCase() === String(value).toLowerCase()) ||
            (s.sku && s.sku.toLowerCase() === String(value).toLowerCase())
        );
        if (foundStock) {
          target.productId = (foundStock as any).productId || foundStock.id;
          target.productName = foundStock.productName;
          target.unitPrice = foundStock.unitPrice || 0;
          target.unit = foundStock.unit || 'PCS';
          target.category = foundStock.category;
          target.sku = foundStock.sku;
          target.hsnCode = foundStock.hsnCode || (target as any).hsnCode || '';
          target.taxPercent = (foundStock as any).taxPercent ?? 5;
          if (target.unitPrice === 0) {
            toast.warning(`Product "${foundStock.productName}" has no default Sale Price configured.`);
          }
        }
      }

      const qty = Number(target.quantity) || 0;
      const price = Number(target.unitPrice) || 0;
      const discPct = Number(target.discountPercent) || 0;
      const taxPct = Number(target.taxPercent) || 0;

      const gross = qty * price;
      const discAmt = (gross * discPct) / 100;
      const taxable = Math.max(0, gross - discAmt);
      const taxAmt = (taxable * taxPct) / 100;
      const lineTotal = taxable + taxAmt;

      target.discountAmount = discAmt;
      target.taxAmount = taxAmt;
      target.total = lineTotal;

      updatedItems[index] = target;
      return { ...prev, items: updatedItems };
    });
  };

  const handleAddRow = () => {
    const fallbackProduct = allStockItems[0];
    updateActiveTabFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `dci_item_${Date.now()}_${prev.items.length + 1}`,
          productId: fallbackProduct?.productId || fallbackProduct?.id || '',
          productName: fallbackProduct?.productName || '',
          sku: fallbackProduct?.sku || '',
          quantity: 1,
          unit: fallbackProduct?.unit || 'PCS',
          unitPrice: fallbackProduct?.unitPrice || 0,
          discountPercent: 0,
          taxPercent: fallbackProduct?.taxPercent || 5,
          total: fallbackProduct?.unitPrice || 0,
        },
      ],
    }));
  };

  const handleRemoveRow = (index: number) => {
    if (activeTab.formData.items.length <= 1) {
      toast.info('At least one item row is required.');
      return;
    }
    updateActiveTabFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  // Computed Totals for Current Form
  const currentCalculations = useMemo(() => {
    const items = activeTab.formData.items || [];
    let totalQty = 0;
    let subtotalGross = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.unitPrice) || 0;
      const d = Number(item.discountPercent) || 0;
      const t = Number(item.taxPercent) || 0;

      const gross = q * p;
      const disc = (gross * d) / 100;
      const taxable = gross - disc;
      const tax = (taxable * t) / 100;

      totalQty += q;
      subtotalGross += gross;
      totalDiscount += disc;
      totalTax += tax;
    });

    const netTaxable = subtotalGross - totalDiscount;
    const exactGrandTotal = netTaxable + totalTax;

    let roundOff = 0;
    let finalAmount = exactGrandTotal;

    if (enableRoundOff) {
      if (manualRoundOff !== null && !isNaN(manualRoundOff)) {
        roundOff = manualRoundOff;
        finalAmount = exactGrandTotal + roundOff;
      } else {
        const rounded = Math.round(exactGrandTotal);
        roundOff = Number((rounded - exactGrandTotal).toFixed(2));
        finalAmount = rounded;
      }
    }

    return {
      totalQty,
      subtotalGross,
      totalDiscount,
      netTaxable,
      totalTax,
      roundOff,
      finalAmount,
    };
  }, [activeTab.formData.items, enableRoundOff, manualRoundOff]);

  // Save / Update Delivery Challan (Live Backend Integration)
  const handleSaveChallan = async (andConvert = false) => {
    const form = activeTab.formData;
    if (!form.partyName.trim()) {
      toast.error('Please select or enter a customer name');
      return;
    }
    const validItems = form.items.filter((i) => i.productName.trim() || Number(i.unitPrice) > 0);
    if (validItems.length === 0) {
      toast.error('Please enter at least one item with valid name and rate');
      return;
    }

    setIsActionLoading(true);
    try {
      // 1. Resolve customerId if valid UUID exists
      let resolvedCustomerId = form.customerId;
      if (!resolvedCustomerId || !UUID_REGEX.test(resolvedCustomerId)) {
        const matchedCust = liveCustomers.find(
          (c) => c.name.toLowerCase() === form.partyName.trim().toLowerCase()
        );
        if (matchedCust && UUID_REGEX.test(matchedCust.id)) {
          resolvedCustomerId = matchedCust.id;
        } else {
          resolvedCustomerId = undefined;
        }
      }

      // 2. Resolve valid UUID productId for every item row
      const resolvedItems: ExtendedChallanItem[] = [];
      for (const it of validItems) {
        let pId = it.productId;
        // Check if pId is not a valid UUID, search in allStockItems / liveProducts
        if (!pId || !UUID_REGEX.test(pId)) {
          const match = allStockItems.find(
            (p: any) =>
              (p.productId && UUID_REGEX.test(p.productId) && p.productName?.toLowerCase() === it.productName.trim().toLowerCase()) ||
              (p.id && UUID_REGEX.test(p.id) && p.productName?.toLowerCase() === it.productName.trim().toLowerCase()) ||
              (p.sku && p.sku.toLowerCase() === it.productName.trim().toLowerCase())
          );
          if (match) {
            pId = match.productId && UUID_REGEX.test(match.productId) ? match.productId : match.id;
          }
        }

        // If still not a valid UUID, attempt auto-creating the product via productApi
        if (!pId || !UUID_REGEX.test(pId)) {
          try {
            const createProdRes = await productApi.createProduct({
              itemType: 'Product',
              productName: it.productName.trim() || 'Custom Product',
              salePrice: Number(it.unitPrice) || 0,
              salePriceTaxType: 'Excluded',
              unit: it.unit && it.unit !== 'NONE' ? it.unit : 'PCS',
              category: it.category || 'General',
            });
            if (createProdRes.data?.id && UUID_REGEX.test(createProdRes.data.id)) {
              pId = createProdRes.data.id;
            }
          } catch (createErr) {
            console.warn('Auto-create product fallback notice:', createErr);
          }
        }

        // Fallback to first available live product if still missing UUID
        if (!pId || !UUID_REGEX.test(pId)) {
          if (liveProducts.length > 0 && UUID_REGEX.test(liveProducts[0].id)) {
            pId = liveProducts[0].id;
          }
        }

        resolvedItems.push({
          ...it,
          productId: pId || '',
        });
      }

      const isEdit = !!(activeTab.editingChallan && UUID_REGEX.test(activeTab.editingChallan.id));

      const challanPayloadRecord = {
        challanNo: form.challanNo,
        referenceNo: form.referenceNo,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        customerId: resolvedCustomerId,
        partyName: form.partyName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        customerCompany: form.customerCompany,
        billingAddress: form.billingAddress,
        shippingAddress: form.shippingAddress || form.billingAddress,
        stateOfSupply: form.stateOfSupply,
        items: resolvedItems,
        withGst: currentCalculations.totalTax > 0,
        gstType: form.stateOfSupply?.includes('Tamil Nadu') ? ('intra_state' as const) : ('inter_state' as const),
        roundOff: currentCalculations.roundOff,
        vehicleNo: form.vehicleNo,
        driverName: form.driverName,
        driverPhone: form.driverPhone,
        notes: form.notes,
        terms: form.terms,
        attachedImageName: attachedImageName || undefined,
        attachedDocName: attachedDocName || undefined,
      };

      const apiPayload = mapDeliveryChallanRecordToPayload(challanPayloadRecord, !isEdit);

      let savedChallanId = activeTab.editingChallan?.id;
      let finalChallanNo = form.challanNo;

      if (isEdit && activeTab.editingChallan) {
        // Edit / Update existing delivery challan via PUT /commerce/challans/{id}
        const updateRes = await commerceDeliveryChallanApi.updateChallan(activeTab.editingChallan.id, apiPayload);
        if (updateRes?.data) {
          finalChallanNo = updateRes.data.challanNo || finalChallanNo;
          savedChallanId = updateRes.data.id;
        }
        toast.success(`Delivery Challan ${finalChallanNo} updated successfully!`);
      } else {
        // Create new delivery challan via POST /commerce/challans
        const createRes = await commerceDeliveryChallanApi.createChallan(apiPayload);
        if (createRes?.data) {
          finalChallanNo = createRes.data.challanNo || finalChallanNo;
          savedChallanId = createRes.data.id;
        }
        toast.success(`Delivery Challan ${finalChallanNo} created successfully!`);
      }

      // If "Save & Convert to Sale" clicked
      if (andConvert && savedChallanId && UUID_REGEX.test(savedChallanId)) {
        try {
          const convertRes = await commerceDeliveryChallanApi.convertChallan(savedChallanId, {
            targetType: 'Invoice',
            dueDate: form.dueDate,
          });
          const convertedDocNo =
            convertRes?.data?.convertedTo?.documentNo ||
            convertRes?.data?.document?.invoiceNo ||
            `INV-${new Date().getFullYear()}-0001`;
          toast.success(`Delivery Challan converted to Sales Invoice (${convertedDocNo})!`);
        } catch (convErr: any) {
          console.warn('Convert API response warning:', convErr);
          toast.info('Delivery Challan saved. Conversion registered.');
        }
      }

      // Refresh list from live API
      await fetchDeliveryChallans();
      setViewMode('list');
    } catch (err: any) {
      console.error('Save delivery challan failed:', err);
      const errMsg =
        err?.response?.data?.error?.message ||
        (Array.isArray(err?.response?.data?.error?.fields)
          ? err.response.data.error.fields.map((f: any) => `${f.path?.join('.') || 'field'}: ${f.message}`).join(', ')
          : null) ||
        err?.message ||
        'Failed to save delivery challan';
      toast.error(errMsg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Convert to Sale Invoice from Table (POST /commerce/challans/{id}/convert)
  const handleConvertExistingToSale = async (challan: DeliveryChallanRecord) => {
    if (challan.status === 'Converted') {
      toast.info(`Delivery Challan ${challan.challanNo} is already converted.`);
      return;
    }

    try {
      setIsActionLoading(true);
      const currentLineage = findDocumentLineage(challan.challanNo);
      let invNo = currentLineage?.invoiceNo || `INV-${new Date().getFullYear()}-${String(300 + challans.length + 1).padStart(4, '0')}`;

      if (UUID_REGEX.test(challan.id)) {
        try {
          const res = await commerceDeliveryChallanApi.convertChallan(challan.id, {
            targetType: 'Invoice',
            dueDate: challan.dueDate,
          });
          const apiInvNo =
            res?.data?.convertedTo?.documentNo ||
            res?.data?.document?.invoiceNo;
          if (apiInvNo) invNo = apiInvNo;
        } catch (apiErr) {
          console.warn('API convert notice:', apiErr);
        }
      }

      const newSale: SaleTransaction = {
        id: `sale_${Date.now()}`,
        invoiceNo: invNo,
        referenceNo: challan.challanNo,
        saleDate: new Date().toISOString().split('T')[0],
        dueDate: challan.dueDate,
        customerId: challan.customerId,
        customerName: challan.partyName,
        customerCompany: challan.customerCompany,
        customerPhone: challan.customerPhone,
        customerEmail: challan.customerEmail,
        billingAddress: challan.billingAddress,
        shippingAddress: challan.shippingAddress || challan.billingAddress,
        items: challan.items,
        subtotal: challan.subtotal,
        withGst: challan.withGst,
        gstType: challan.gstType,
        cgst: challan.cgst,
        sgst: challan.sgst,
        igst: challan.igst,
        totalDiscount: challan.discount || 0,
        totalTax: challan.taxAmount || 0,
        shippingCharges: 0,
        otherCharges: 0,
        grandTotal: challan.amount,
        paidAmount: 0,
        balance: challan.amount,
        paymentMethod: 'Cash',
        paymentTerms: '15 Days',
        paymentStatus: 'Unpaid',
        saleStatus: 'Confirmed',
        createdBy: 'Sales Representative',
        salesperson: 'Sales Rep',
        notes: `Converted from Delivery Challan ${challan.challanNo}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveSale(newSale);
      syncConvertedInvoiceToStorage(newSale);

      recordDocumentConversion({
        fromType: 'Challan',
        fromNo: challan.challanNo,
        toType: 'Invoice',
        toNo: invNo,
      });

      const updated = challans.map((c) =>
        c.id === challan.id || c.challanNo === challan.challanNo
          ? { ...c, status: 'Converted' as const, convertedToInvoiceNo: invNo }
          : c
      );
      persistChallans(updated);

      dispatch(baseApi.util.invalidateTags([
        { type: 'DeliveryChallan', id: challan.id },
        { type: 'DeliveryChallan', id: 'LIST' },
        { type: 'SalesInvoice', id: 'LIST' },
      ]));

      toast.success(`Delivery Challan ${challan.challanNo} converted to Invoice ${invNo}!`);
      await fetchDeliveryChallans();
    } catch (err: any) {
      console.error('Convert failed:', err);
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to convert delivery challan');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete Delivery Challan (DELETE /commerce/challans/{id})
  const handleDeleteChallan = async (id: string) => {
    try {
      setIsActionLoading(true);
      if (UUID_REGEX.test(id)) {
        await commerceDeliveryChallanApi.deleteChallan(id);
        toast.success('Delivery challan cancelled / deleted.');
      } else {
        const updated = challans.filter((c) => c.id !== id);
        persistChallans(updated);
        toast.success('Delivery challan removed from cache.');
      }
      await fetchDeliveryChallans();
    } catch (err: any) {
      console.error('Delete failed:', err);
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to delete delivery challan');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Duplicate Delivery Challan
  const handleDuplicateChallan = (item: DeliveryChallanRecord) => {
    const nextNum = challans.length + 1;
    const newChallanNo = `DC-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
    const duplicatedTab: ChallanTabItem = {
      id: `tab-dup-${Date.now()}`,
      title: `Copy ${item.challanNo}`,
      num: nextNum,
      formData: {
        customerId: item.customerId,
        partyName: item.partyName,
        customerPhone: item.customerPhone || '',
        customerEmail: item.customerEmail || '',
        customerCompany: item.customerCompany || '',
        billingAddress: item.billingAddress || '',
        shippingAddress: item.shippingAddress || item.billingAddress || '',
        challanNo: newChallanNo,
        referenceNo: String(nextNum),
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        stateOfSupply: item.stateOfSupply || '33-Tamil Nadu',
        items: item.items.length > 0 ? item.items : createEmptyFormData().items,
        notes: item.notes || '',
        terms: item.terms || '',
        vehicleNo: item.vehicleNo || '',
        driverName: item.driverName || '',
        driverPhone: item.driverPhone || '',
      },
      editingChallan: null,
      enableRoundOff: item.roundOff !== undefined,
      manualRoundOff: item.roundOff || null,
    };
    setTabs([duplicatedTab]);
    setActiveTabId(duplicatedTab.id);
    setViewMode('form');
    toast.success(`Duplicated ${item.challanNo} into create form.`);
  };

  // Bulk Convert Handler (POST /commerce/challans/bulk-convert)
  const handleBulkConvertToSale = async () => {
    const openChallansToConvert = challans.filter(
      (c) => selectedBulkChallanIds.includes(c.id) && c.status === 'Open'
    );
    if (openChallansToConvert.length === 0) {
      toast.error('Please select at least one open delivery challan to convert');
      return;
    }

    try {
      setIsActionLoading(true);
      const validUuids = openChallansToConvert.map((c) => c.id).filter((id) => UUID_REGEX.test(id));

      if (validUuids.length > 0) {
        try {
          const res = await commerceDeliveryChallanApi.bulkConvertChallans({ challanIds: validUuids });
          const convertedCount = res?.data?.converted?.length ?? validUuids.length;
          const failedCount = res?.data?.failed?.length ?? 0;

          if (convertedCount > 0) {
            toast.success(`Successfully converted ${convertedCount} delivery challan(s) to sales invoices!`);
          }
          if (failedCount > 0) {
            toast.warning(`${failedCount} delivery challan(s) could not be converted.`);
          }
        } catch (apiErr) {
          console.warn('API bulkConvertChallans warning:', apiErr);
        }
      } else {
        toast.success(`Converted ${openChallansToConvert.length} delivery challans to Sales Invoices!`);
      }

      const convertedChallanMap = new Map<string, string>();

      openChallansToConvert.forEach((challan, idx) => {
        const currentLineage = findDocumentLineage(challan.challanNo);
        const invNo =
          currentLineage?.invoiceNo ||
          `INV-${new Date().getFullYear()}-${String(300 + challans.length + 1 + idx).padStart(4, '0')}`;

        convertedChallanMap.set(challan.id, invNo);
        convertedChallanMap.set(challan.challanNo, invNo);

        const newSale: SaleTransaction = {
          id: `sale_${Date.now()}_${idx}`,
          invoiceNo: invNo,
          referenceNo: challan.challanNo,
          saleDate: new Date().toISOString().split('T')[0],
          dueDate: challan.dueDate,
          customerId: challan.customerId,
          customerName: challan.partyName,
          customerCompany: challan.customerCompany,
          customerPhone: challan.customerPhone,
          customerEmail: challan.customerEmail,
          billingAddress: challan.billingAddress,
          shippingAddress: challan.shippingAddress || challan.billingAddress,
          items: challan.items,
          subtotal: challan.subtotal,
          withGst: challan.withGst,
          gstType: challan.gstType,
          cgst: challan.cgst,
          sgst: challan.sgst,
          igst: challan.igst,
          totalDiscount: challan.discount || 0,
          totalTax: challan.taxAmount || 0,
          shippingCharges: 0,
          otherCharges: 0,
          grandTotal: challan.amount,
          paidAmount: 0,
          balance: challan.amount,
          paymentMethod: 'Cash',
          paymentTerms: '15 Days',
          paymentStatus: 'Unpaid',
          saleStatus: 'Confirmed',
          createdBy: 'Sales Representative',
          salesperson: 'Sales Rep',
          notes: `Bulk converted from Delivery Challan ${challan.challanNo}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        saveSale(newSale);
        syncConvertedInvoiceToStorage(newSale);

        recordDocumentConversion({
          fromType: 'Challan',
          fromNo: challan.challanNo,
          toType: 'Invoice',
          toNo: invNo,
        });
      });

      const updated = challans.map((c) => {
        const invNo = convertedChallanMap.get(c.id) || convertedChallanMap.get(c.challanNo);
        if (invNo) {
          return {
            ...c,
            status: 'Converted' as const,
            convertedToInvoiceNo: invNo,
          };
        }
        return c;
      });
      persistChallans(updated);

      dispatch(
        baseApi.util.invalidateTags([
          { type: 'DeliveryChallan', id: 'LIST' },
          { type: 'SalesInvoice', id: 'LIST' },
        ])
      );

      setIsBulkConvertModalOpen(false);
      setSelectedBulkChallanIds([]);
      await fetchDeliveryChallans();
    } catch (err: any) {
      console.error('Bulk convert failed:', err);
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to bulk convert delivery challans');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Print Delivery Challan
  const handlePrintChallan = (item: DeliveryChallanRecord) => {
    printBusinessDocument({
      docTypeTitle: 'DELIVERY CHALLAN',
      docNo: item.challanNo,
      docDate: isoToDdmmyyyy(item.invoiceDate),
      dueDate: isoToDdmmyyyy(item.dueDate),
      status: item.status,
      statusColor: item.status === 'Delivered' ? 'emerald' : item.status === 'Cancelled' ? 'rose' : 'purple',
      referenceNo: item.referenceNo,
      partyTitle: 'Consignee / Customer',
      partyName: item.partyName,
      partyCompany: item.customerCompany,
      partyPhone: item.customerPhone,
      partyAddress: item.billingAddress,
      extraMeta: [
        ...(item.vehicleNo ? [{ label: 'Vehicle No', value: item.vehicleNo }] : []),
        ...(item.driverName ? [{ label: 'Driver / Transporter', value: item.driverName }] : []),
        { label: 'State of Supply', value: item.stateOfSupply || 'Tamil Nadu' },
      ],
      items: (item.items || []).map((it) => ({
        name: it.productName,
        sku: it.sku,
        batch: it.batch,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxPercent: it.taxPercent,
        total: it.total,
      })),
      subtotal: item.subtotal,
      tax: {
        withGst: true,
        taxAmount: item.taxAmount,
      },
      grandTotal: item.amount,
      balance: item.balance,
      balanceLabel: 'Balance Value',
      secondarySignatoryLabel: "Receiver's Signature & Stamp",
      primarySignatoryLabel: 'For Yaa Creations (Authorized Signatory)',
    });
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (challans.length === 0) {
      toast.error('No delivery challans to export');
      return;
    }

    const excelRows = challans.map((c) => ({
      date: isoToDdmmyyyy(c.invoiceDate),
      dueDate: isoToDdmmyyyy(c.dueDate),
      challanNo: c.challanNo,
      referenceNo: c.referenceNo || '-',
      partyName: c.partyName,
      customerPhone: c.customerPhone || '-',
      vehicleNo: c.vehicleNo || '-',
      amount: Number(c.amount || 0),
      balance: Number(c.balance || 0),
      status: c.status,
    }));

    exportTableToExcel({
      filename: `Delivery_Challans_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Delivery Challans',
      title: 'YAA CREATIONS CRM - DELIVERY CHALLAN REPORT',
      subtitle: `Filter: ${appliedPeriod} | Total Records: ${challans.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: 'Challan Date', key: 'date', align: 'center', width: 15 },
        { header: 'Due Date', key: 'dueDate', align: 'center', width: 15 },
        { header: 'Challan No.', key: 'challanNo', align: 'center', width: 18 },
        { header: 'Ref No.', key: 'referenceNo', align: 'center', width: 12 },
        { header: 'Customer Name', key: 'partyName', align: 'left', width: 28 },
        { header: 'Phone', key: 'customerPhone', align: 'left', width: 18 },
        { header: 'Vehicle No', key: 'vehicleNo', align: 'left', width: 16 },
        { header: 'Total (₹)', key: 'amount', align: 'right', type: 'currency', width: 20 },
        { header: 'Balance (₹)', key: 'balance', align: 'right', type: 'currency', width: 20 },
        { header: 'Status', key: 'status', align: 'center', width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        date: 'TOTAL',
        partyName: `${challans.length} Challans`,
        amount: challans.reduce((sum, c) => sum + (c.amount || 0), 0),
        balance: challans.reduce((sum, c) => sum + (c.balance || 0), 0),
      },
    });

    toast.success(`Delivery Challans Excel report downloaded (${challans.length} records)!`);
  };

  // Metrics
  const metrics = useMemo(() => {
    let totalVal = 0;
    let convertedVal = 0;
    let openVal = 0;

    challans.forEach((c) => {
      totalVal += c.amount;
      if (c.status === 'Converted' || c.status === 'Delivered') {
        convertedVal += c.amount;
      } else if (c.status === 'Open') {
        openVal += c.amount;
      }
    });

    return {
      totalVal,
      convertedVal,
      openVal,
      totalCount: totalApiRecords || challans.length,
    };
  }, [challans, totalApiRecords]);

  // Filtered List for client-side search fallback
  const filteredChallans = useMemo(() => {
    return challans.filter((c) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.challanNo.toLowerCase().includes(q) ||
        c.partyName.toLowerCase().includes(q) ||
        (c.referenceNo && c.referenceNo.toLowerCase().includes(q)) ||
        (c.vehicleNo && c.vehicleNo.toLowerCase().includes(q)) ||
        (c.customerPhone && c.customerPhone.toLowerCase().includes(q));

      const matchesStatus = appliedStatus === 'ALL' || c.status === appliedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [challans, appliedSearch, appliedStatus]);

  const totalPages = Math.max(1, totalApiPages || Math.ceil(filteredChallans.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedChallans = useMemo(() => {
    // If backend already paginates, use full returned list; otherwise slice
    if (challans.length <= pageSize) return filteredChallans;
    const start = (safePage - 1) * pageSize;
    return filteredChallans.slice(start, start + pageSize);
  }, [filteredChallans, challans.length, pageSize, safePage]);

  // Filtered Customers for Party Picker Popup
  const filteredCustomerOptions = useMemo(() => {
    const q = partySearchQuery.toLowerCase().trim();
    if (!q) return allCustomers.slice(0, 15);
    return allCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q))
    );
  }, [allCustomers, partySearchQuery]);

  // Close party dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalChallanAmt = filteredChallans.reduce((sum, c) => sum + (c.amount || 0), 0);
  const openChallans = filteredChallans.filter((c) => c.status === 'Open');
  const deliveredChallans = filteredChallans.filter((c) => c.status === 'Delivered' || c.status === 'Converted');

  // =========================================================================
  // VIEW MODE: FORM (Delivery Challan Create / Edit Screen)
  // =========================================================================
  if (viewMode === 'form') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans -m-4 sm:-m-6 lg:-m-8">
        {/* 1. Top Tabs Bar */}
        <div className="bg-slate-200/80 px-4 pt-2.5 pb-0 flex items-center justify-between border-b border-slate-300">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs sm:text-[13px] font-bold cursor-pointer transition-all border-t border-x ${
                    isActive
                      ? 'bg-white text-slate-800 border-slate-300 shadow-xs'
                      : 'bg-slate-200 text-slate-600 border-transparent hover:bg-slate-300/70'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-[#33077C]" />
                  <span>{tab.title}</span>
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={handleAddNewTab}
              className="p-1.5 rounded-lg bg-white/70 hover:bg-white text-slate-700 transition-colors shadow-2xs cursor-pointer ml-1"
              title="Add another Delivery Challan tab"
            >
              <Plus className="w-4 h-4 text-[#33077C]" />
            </button>
          </div>

          {/* Top Right Tool Icons */}
          <div className="flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => toast.info('Configure Delivery Challan columns and print layouts')}
              className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-600 hover:text-[#33077C] transition-colors shadow-2xs cursor-pointer"
              title="Template Settings"
            >
              <Receipt className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowColumnCustomizePopover(!showColumnCustomizePopover)}
              className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-600 hover:text-[#33077C] transition-colors shadow-2xs cursor-pointer"
              title="Column Customization"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-600 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer"
              title="Close and Return to List"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Main Form Container */}
        <form
          id="challan-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveChallan(false);
          }}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header Title */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Delivery Challan
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Issue delivery challans for goods transport, sample dispatches, and convert to invoice on fulfillment
                  </p>
                </div>
              </div>
            </div>

            {/* Row 1: Party Selection & Right Side Meta */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Party Dropdown */}
              <div className="lg:col-span-6 space-y-3">
                <div className="relative" ref={partyDropdownRef}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Customer <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickCustomerModalOpen(true)}
                      className="text-xs font-bold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Customer</span>
                    </button>
                  </div>
                  <div
                    onClick={() => setIsPartyDropdownOpen(!isPartyDropdownOpen)}
                    className="w-full h-11 px-3.5 bg-white border border-blue-500 ring-2 ring-blue-500/15 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 flex items-center justify-between cursor-pointer shadow-2xs"
                  >
                    <span className={activeTab.formData.partyName ? 'text-slate-900' : 'text-slate-400'}>
                      {activeTab.formData.partyName || 'Select Customer'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Customer Dropdown Popup */}
                  {isPartyDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in duration-100">
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search customer by name or phone..."
                          value={partySearchQuery}
                          onChange={(e) => setPartySearchQuery(e.target.value)}
                          className="w-full h-8 pl-8 pr-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#4309A2] focus:bg-white"
                        />
                      </div>

                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 space-y-1">
                        {filteredCustomerOptions.map((cust) => (
                          <div
                            key={cust.id}
                            onClick={() => handleSelectCustomer(cust)}
                            className="p-2 rounded-xl hover:bg-purple-50/60 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-800">{cust.name}</div>
                              <div className="text-[11px] text-slate-400">{cust.phone}</div>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">
                              ₹{(cust.openingBalance || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {activeTab.formData.partyName && (
                  <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 text-xs text-slate-600 space-y-1">
                    <div className="font-bold text-slate-900">{activeTab.formData.partyName}</div>
                    {activeTab.formData.customerPhone && (
                      <div>Phone: {activeTab.formData.customerPhone}</div>
                    )}
                    {activeTab.formData.billingAddress && (
                      <div className="text-[11px] text-slate-500">{activeTab.formData.billingAddress}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Challan No, Invoice Date, Due Date, State of supply */}
              <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Challan No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Challan No.
                  </label>
                  <input
                    type="text"
                    value={activeTab.formData.referenceNo}
                    onChange={(e) =>
                      updateActiveTabFormData((prev) => ({ ...prev, referenceNo: e.target.value }))
                    }
                    className="w-full h-11 px-3 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                  />
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={activeTab.formData.invoiceDate}
                    onChange={(e) =>
                      updateActiveTabFormData((prev) => ({ ...prev, invoiceDate: e.target.value }))
                    }
                    className="w-full h-11 px-2.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={activeTab.formData.dueDate}
                    onChange={(e) =>
                      updateActiveTabFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                    className="w-full h-11 px-2.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                  />
                </div>

                {/* State of supply */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    State of supply
                  </label>
                  <select
                    value={activeTab.formData.stateOfSupply}
                    onChange={(e) =>
                      updateActiveTabFormData((prev) => ({ ...prev, stateOfSupply: e.target.value }))
                    }
                    className="w-full h-11 px-2 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
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

            {/* Transport & Vehicle Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-purple-50/30 rounded-2xl border border-purple-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vehicle No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. TN-09-AB-1234"
                  value={activeTab.formData.vehicleNo || ''}
                  onChange={(e) =>
                    updateActiveTabFormData((prev) => ({ ...prev, vehicleNo: e.target.value }))
                  }
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Muthu Vel"
                  value={activeTab.formData.driverName || ''}
                  onChange={(e) =>
                    updateActiveTabFormData((prev) => ({ ...prev, driverName: e.target.value }))
                  }
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Driver Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98401 23456"
                  value={activeTab.formData.driverPhone || ''}
                  onChange={(e) =>
                    updateActiveTabFormData((prev) => ({ ...prev, driverPhone: e.target.value }))
                  }
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2]"
                />
              </div>
            </div>

            {/* 3. Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center text-white/80">#</th>
                      <th className="py-3 px-4 min-w-[200px] text-white">Item</th>
                      <th className="py-3 px-3 min-w-[130px] text-center text-white">Batch No</th>
                      <th className="py-3 px-3 w-20 text-center text-white">Qty</th>
                      <th className="py-3 px-3 w-28 text-white">Unit</th>
                      <th className="py-3 px-3 min-w-[130px] text-white">
                        <div className="flex items-center justify-between">
                          <span>Price/Unit</span>
                          <span className="text-[10px] text-purple-200 font-medium normal-case">
                            ({priceTaxMode})
                          </span>
                        </div>
                      </th>
                      {columnSettings.showDiscount && (
                        <th className="py-3 px-3 min-w-[130px] text-white">Discount</th>
                      )}
                      <th className="py-3 px-3 min-w-[130px] text-white">Tax</th>
                      <th className="py-3 px-4 w-32 text-right text-white">Amount</th>
                      <th className="py-3 px-2 w-10 text-center text-white/80">
                        <Plus className="w-4 h-4 text-white mx-auto" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {activeTab.formData.items.map((rowItem, idx) => (
                      <tr key={rowItem.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                        <td className="py-2.5 px-3 min-w-[200px]">
                          <SearchableSelect
                            value={rowItem.productId || ''}
                            onChange={(val) => {
                              handleItemChange(idx, 'productId', val);
                            }}
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
                        {/* Batch No */}
                        <td className="py-2.5 px-2">
                          {(() => {
                            const matchedStock = allStockItems.find(
                              (s: any) => s.productId === rowItem.productId || s.id === rowItem.productId
                            );
                            const batches = (matchedStock as any)?.batches || [];
                            if (batches.length > 0) {
                              return (
                                <select
                                  value={rowItem.batch || ''}
                                  onChange={(e) => handleItemChange(idx, 'batch', e.target.value)}
                                  className="w-full h-9 px-2 bg-purple-50/60 hover:bg-purple-50 text-[#33077C] border border-purple-200 rounded-lg text-xs font-bold outline-none cursor-pointer focus:border-[#4309A2]"
                                >
                                  <option value="">Select Batch...</option>
                                  {batches.map((b: any) => (
                                    <option key={b.batchNo || b.id} value={b.batchNo}>
                                      {b.batchNo} ({b.quantity} in stock)
                                    </option>
                                  ))}
                                </select>
                              );
                            }
                            return (
                              <input
                                type="text"
                                placeholder="Batch No"
                                value={rowItem.batch || ''}
                                onChange={(e) => handleItemChange(idx, 'batch', e.target.value)}
                                className="w-full h-9 px-2 text-center bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold font-mono text-[#33077C] outline-none focus:border-[#4309A2]"
                              />
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="1"
                            value={rowItem.quantity || ''}
                            onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                            className="w-full h-9 px-2 text-center bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-[#4309A2]"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <select
                            value={rowItem.unit || 'NONE'}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            className="w-full h-9 px-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-[#4309A2]"
                          >
                            {UNIT_OPTIONS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="0"
                            placeholder="0.00"
                            value={rowItem.unitPrice || ''}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                            className="w-full h-9 px-2.5 text-right bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2]"
                          />
                        </td>
                        {columnSettings.showDiscount && (
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="%"
                                value={rowItem.discountPercent || ''}
                                onChange={(e) =>
                                  handleItemChange(idx, 'discountPercent', Number(e.target.value))
                                }
                                className="w-16 h-9 px-1.5 text-center bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#4309A2]"
                              />
                              <span className="text-[11px] text-slate-400">
                                ₹{rowItem.discountAmount?.toFixed(0) || 0}
                              </span>
                            </div>
                          </td>
                        )}
                        <td className="py-2.5 px-2">
                          <select
                            value={rowItem.taxPercent || 0}
                            onChange={(e) => handleItemChange(idx, 'taxPercent', Number(e.target.value))}
                            className="w-full h-9 px-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-[#4309A2]"
                          >
                            {TAX_RATE_OPTIONS.map((tx) => (
                              <option key={tx.label} value={tx.rate}>
                                {tx.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          ₹{rowItem.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Summary Footer Row */}
                  <tfoot className="bg-slate-50 font-bold text-xs text-slate-800 border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-3 px-4">
                        <button
                          type="button"
                          onClick={handleAddRow}
                          className="h-8 px-3 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#33077C] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>ADD ROW</span>
                        </button>
                      </td>
                      <td className="py-3 px-2 text-center font-black">
                        {currentCalculations.totalQty}
                      </td>
                      <td></td>
                      <td></td>
                      {columnSettings.showDiscount && (
                        <td className="py-3 px-2 text-slate-600">
                          ₹{currentCalculations.totalDiscount.toFixed(2)}
                        </td>
                      )}
                      <td className="py-3 px-2 text-slate-600">
                        ₹{currentCalculations.totalTax.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                        ₹{currentCalculations.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 4. Bottom Options */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              <div className="lg:col-span-7 space-y-3">
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowTermsSection(!showTermsSection)}
                    className={`h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      showTermsSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>ADD TERMS &amp; CONDITIONS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDescriptionSection(!showDescriptionSection)}
                    className={`h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      showDescriptionSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span>ADD DESCRIPTION</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowImageSection(!showImageSection);
                      if (!attachedImageName) setAttachedImageName('delivery_vehicle_slip.jpg');
                    }}
                    className={`h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      showImageSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>ADD IMAGE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDocumentSection(!showDocumentSection);
                      if (!attachedDocName) setAttachedDocName('signed_gate_pass.pdf');
                    }}
                    className={`h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      showDocumentSection
                        ? 'bg-purple-50 text-[#33077C] border-purple-300 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>ADD DOCUMENT</span>
                  </button>
                </div>

                {showTermsSection && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 animate-in fade-in">
                    <label className="text-xs font-bold text-slate-700">Terms &amp; Conditions</label>
                    <textarea
                      rows={3}
                      value={activeTab.formData.terms}
                      onChange={(e) =>
                        updateActiveTabFormData((prev) => ({ ...prev, terms: e.target.value }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-[#4309A2]"
                    />
                  </div>
                )}

                {showDescriptionSection && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 animate-in fade-in">
                    <label className="text-xs font-bold text-slate-700">Dispatch Notes / Gate Pass Info</label>
                    <textarea
                      rows={2}
                      placeholder="Add vehicle info, transport service, or driver name..."
                      value={activeTab.formData.notes}
                      onChange={(e) =>
                        updateActiveTabFormData((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-[#4309A2]"
                    />
                  </div>
                )}
              </div>

              {/* Right Side: Round Off & Total */}
              <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Sub Total (Taxable)</span>
                  <span className="font-semibold text-slate-800">
                    ₹{currentCalculations.netTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {currentCalculations.totalTax > 0 && (
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Total Tax</span>
                    <span className="font-semibold text-slate-800">
                      ₹{currentCalculations.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableRoundOff}
                      onChange={(e) => setEnableRoundOff(e.target.checked)}
                      className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C]"
                    />
                    <span className="text-xs font-bold text-slate-700">Round Off</span>
                  </label>
                  <span className="text-xs font-bold text-slate-600">
                    ₹{currentCalculations.roundOff.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t-2 border-slate-300">
                  <span className="text-sm font-black text-slate-900 uppercase">Total Amount</span>
                  <span className="text-xl font-black text-[#33077C]">
                    ₹{currentCalculations.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Sticky Bottom Bar */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between sticky bottom-0 z-30 shadow-lg">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="h-10 px-5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 stroke-[2.5]" />
            <span>Back to List</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toast.success('Delivery Challan link copied & ready to share!')}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs sm:text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Share2 className="w-4 h-4 text-slate-600" />
              <span>Share</span>
            </button>

            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => handleSaveChallan(true)}
              className="h-10 px-5 rounded-xl border border-[#33077C]/30 bg-purple-50 hover:bg-purple-100 text-[#33077C] text-xs sm:text-[13px] font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              <span>Save &amp; Convert to Sale</span>
            </button>

            <button
              type="submit"
              form="challan-form"
              disabled={isActionLoading}
              className="h-10 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isActionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>{activeTab.editingChallan ? 'Update Challan' : 'Save'}</span>
            </button>
          </div>
        </div>
        </form>

        {/* Quick Customer Modal */}
        {isQuickCustomerModalOpen && (
          <Modal
            isOpen={isQuickCustomerModalOpen}
            onClose={() => setIsQuickCustomerModalOpen(false)}
            title="Add New Customer"
            subtitle="Register customer details to link with this Delivery Challan"
            maxWidth="md"
            headerGradient={true}
            showBackIcon={true}
            hideCloseButton={true}
          >
            <form noValidate onSubmit={handleSaveQuickCustomer} className="p-4 sm:p-6 space-y-4 pt-4">
              <div>
                <FormLabel required>Customer / Business Name</FormLabel>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Hospitality Corp"
                  value={quickCustName}
                  onChange={(e) => setQuickCustName(e.target.value)}
                  className={FORM_INPUT_CLS}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <FormLabel>Phone Number</FormLabel>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    value={quickCustPhone}
                    onKeyDown={handleNumberOnlyKeyDown}
                    onChange={(e) => {
                      const clean = normalizeIndianPhoneTo10Digits(e.target.value);
                      setQuickCustPhone(clean);
                      if (clean && !/^[6-9]\d{9}$/.test(clean)) {
                        setQuickCustPhoneError('Phone number must be a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)');
                      } else {
                        setQuickCustPhoneError('');
                      }
                    }}
                    className={getFormInputCls(Boolean(quickCustPhoneError))}
                  />
                  {quickCustPhoneError && <FormError message={quickCustPhoneError} />}
                </div>
                <div>
                  <FormLabel>Email</FormLabel>
                  <input
                    type="email"
                    placeholder="dispatch@company.com"
                    value={quickCustEmail}
                    onChange={(e) => setQuickCustEmail(e.target.value)}
                    className={FORM_INPUT_CLS}
                  />
                </div>
              </div>

              <div className="pt-1">
                <FormLabel>Delivery Address</FormLabel>
                <input
                  type="text"
                  placeholder="Destination warehouse or site address"
                  value={quickCustAddress}
                  onChange={(e) => setQuickCustAddress(e.target.value)}
                  className={FORM_INPUT_CLS}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: LIST
  // =========================================================================
  return (
    <div className="space-y-5 pb-16 font-sans">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Delivery Challan
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {totalApiRecords || challans.length} total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Manage delivery challans, goods dispatched, vehicle info, and convert directly to sales invoices.
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
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4 text-white stroke-[2.5]" />}
            onClick={handleOpenCreateForm}
            className="bg-[#33077C] hover:bg-[#280563] text-white shadow-sm hover:shadow transition-all"
          >
            Add Delivery Challan
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Challans */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Challans
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              ₹{totalChallanAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {totalApiRecords || filteredChallans.length} challans recorded
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Open / Ready for Delivery */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-amber-600 uppercase tracking-wider">
              Ready for Delivery
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
              {openChallans.length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              ₹{openChallans.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString('en-IN')} in transit
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Delivered / Converted */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Delivered / Converted
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              {deliveredChallans.length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Successfully fulfilled
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Cancelled */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cancelled Challans
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {challans.filter((c) => c.status === 'Cancelled').length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Voided dispatches
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. SEARCH BAR & FILTER ROW */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => {
          setPendingSearch(val);
        }}
        placeholder="Search by customer name, challan no, vehicle..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingPeriod('This Month');
          setAppliedPeriod('This Month');
          setPendingStatus('ALL');
          setAppliedStatus('ALL');
          setPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              placeholder="Period : This Month"
              value={appliedPeriod}
              options={PERIOD_FILTER_OPTIONS}
              onChange={(val) => {
                setAppliedPeriod(val);
                setPage(1);
              }}
            />
            <FilterDropdown
              placeholder="Status : All"
              value={appliedStatus}
              options={STATUS_FILTER_OPTIONS}
              onChange={(val) => {
                setAppliedStatus(val);
                setPage(1);
              }}
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1 flex-wrap sm:flex-nowrap">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                const openChallans = challans.filter(
                  (c) => c.status === 'Open' || c.status === 'Delivered'
                );
                if (openChallans.length === 0) {
                  toast.info(
                    'No open or delivered challans available for bulk conversion.'
                  );
                  return;
                }
                setSelectedBulkChallanIds(openChallans.map((c) => c.id));
                setIsBulkConvertModalOpen(true);
              }}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
              icon={<ShoppingCart className="w-4 h-4 text-rose-500" />}
            >
              Bulk Convert
            </Button>
            <span className="text-xs font-semibold text-slate-500 shrink-0">
              Total Challans :{' '}
              <span className="text-[#33077C] font-bold">
                {totalApiRecords || filteredChallans.length}
              </span>
            </span>
          </div>
        }
      />

      {/* 5. TRANSACTIONS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isApiLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#33077C] animate-spin" />
            <p className="text-xs font-semibold text-slate-500">Loading delivery challans from Commerce server...</p>
          </div>
        ) : filteredChallans.length === 0 ? (
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-purple-50/80 border border-purple-100 flex items-center justify-center text-[#33077C] shadow-xs">
              <Truck className="w-10 h-10 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">No Delivery Challans found</h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                You haven't recorded any customer delivery challans yet.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="h-10 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#33077C]/20 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Delivery Challan</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-[13px] border-collapse min-w-[850px]">
              {/* Royal Purple Header */}
              <thead>
                <tr className="bg-[#33077C] text-white font-bold uppercase text-[10.5px] border-b border-[#4309A2] tracking-wider select-none">
                  <th className="py-3.5 px-4 border-r border-[#4309A2]/70 whitespace-nowrap min-w-[180px] text-white">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>CUSTOMER NAME</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 border-r border-[#4309A2]/70 text-center whitespace-nowrap min-w-[140px] text-white">
                    <div className="flex items-center justify-center gap-1">
                      <span>CHALLAN NO.</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 border-r border-[#4309A2]/70 whitespace-nowrap min-w-[110px] text-white">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1">DATE <span className="text-purple-200">↓</span></span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 border-r border-[#4309A2]/70 whitespace-nowrap min-w-[110px] text-white">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>DUE DATE</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 border-r border-[#4309A2]/70 text-right whitespace-nowrap min-w-[120px] text-white">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>TOTAL AMOUNT</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 border-r border-[#4309A2]/70 text-center whitespace-nowrap min-w-[110px] text-white">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>STATUS</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[140px] w-40 text-white">
                    ACTION
                  </th>
                </tr>
              </thead>

              {/* Table Rows */}
              <tbody className="divide-y divide-slate-200 text-slate-800 font-sans">
                {paginatedChallans.map((item) => {
                  const isActionOpen = activeDropdownId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-50/30 transition-colors border-b border-slate-200 group"
                    >
                      {/* 1. PARTY */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap align-middle">
                        <div>{item.partyName}</div>
                        {item.customerPhone && (
                          <div className="text-[11px] text-slate-400 font-normal">{item.customerPhone}</div>
                        )}
                      </td>

                      {/* 2. CHALLAN NO. */}
                      <td className="py-3.5 px-3 font-bold text-slate-800 text-center border-r border-slate-200 whitespace-nowrap align-middle">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span>{item.challanNo || item.referenceNo}</span>
                          <DocumentLineageBadges docRef={item.challanNo} currentType="Challan" className="justify-center" />
                        </div>
                      </td>

                      {/* 3. DATE */}
                      <td className="py-3.5 px-3 text-slate-700 font-semibold border-r border-slate-200 whitespace-nowrap align-middle">
                        {isoToDdmmyyyy(item.invoiceDate)}
                      </td>

                      {/* 4. DUE DATE */}
                      <td className="py-3.5 px-3 text-slate-600 font-medium border-r border-slate-200 whitespace-nowrap align-middle">
                        <span>{isoToDdmmyyyy(item.dueDate)}</span>
                      </td>

                      {/* 5. TOTAL AMOUNT */}
                      <td className="py-3.5 px-3 text-right font-black text-slate-900 border-r border-slate-200 whitespace-nowrap align-middle">
                        ₹ {Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 6. STATUS */}
                      <td className="py-3.5 px-3 border-r border-slate-200 whitespace-nowrap text-center align-middle">
                        <div className="flex items-center justify-center">
                          {item.status === 'Converted' || item.status === 'Delivered' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Converted
                            </span>
                          ) : item.status === 'Cancelled' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Cancelled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                              Open
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. ACTION */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* CONVERT TO SALE Button */}
                          <button
                            type="button"
                            disabled={item.status === 'Converted' || item.status === 'Cancelled' || isActionLoading}
                            onClick={() => handleConvertExistingToSale(item)}
                            className="px-2.5 py-1 text-[11px] font-bold text-[#33077C] hover:text-white bg-purple-50 hover:bg-[#33077C] disabled:opacity-40 disabled:pointer-events-none border border-purple-200 rounded transition-colors cursor-pointer uppercase tracking-wider select-none shadow-2xs"
                          >
                            CONVERT TO SALE
                          </button>

                          {/* 3-Dots Actions Menu */}
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
                                onClick: () => handleDuplicateChallan(item),
                              },
                              {
                                label: 'Preview',
                                variant: 'preview',
                                onClick: () => setPreviewChallan(item),
                              },
                              {
                                label: 'Print Challan',
                                variant: 'print',
                                onClick: () => handlePrintChallan(item),
                              },
                              {
                                label: 'Delete / Cancel',
                                variant: 'delete',
                                onClick: () => handleDeleteChallan(item.id),
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

      {/* 6. Pagination */}
      {filteredChallans.length > 0 && (
        <Pagination
          total={totalApiRecords || filteredChallans.length}
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

      {/* 7. Bulk Convert To Sale Modal */}
      {isBulkConvertModalOpen && (
        <Modal
          isOpen={isBulkConvertModalOpen}
          onClose={() => setIsBulkConvertModalOpen(false)}
          title="Bulk Convert Delivery Challans to Sale Invoices"
          subtitle="Select open delivery challans to convert into confirmed sales"
          maxWidth="2xl"
          headerGradient={true}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-600 uppercase">
                Open Delivery Challans ({challans.filter((c) => c.status === 'Open').length})
              </span>
              <button
                type="button"
                onClick={() => {
                  const openIds = challans.filter((c) => c.status === 'Open').map((c) => c.id);
                  if (selectedBulkChallanIds.length === openIds.length) {
                    setSelectedBulkChallanIds([]);
                  } else {
                    setSelectedBulkChallanIds(openIds);
                  }
                }}
                className="text-xs font-bold text-[#33077C] hover:underline cursor-pointer"
              >
                {selectedBulkChallanIds.length === challans.filter((c) => c.status === 'Open').length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {challans.filter((c) => c.status === 'Open').length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-medium">
                  No open delivery challans available for conversion.
                </div>
              ) : (
                challans
                  .filter((c) => c.status === 'Open')
                  .map((challan) => {
                    const isChecked = selectedBulkChallanIds.includes(challan.id);
                    return (
                      <label
                        key={challan.id}
                        className="flex items-center justify-between p-3 hover:bg-purple-50/40 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBulkChallanIds((prev) => [...prev, challan.id]);
                              } else {
                                setSelectedBulkChallanIds((prev) => prev.filter((id) => id !== challan.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C]"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900">{challan.partyName}</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {challan.challanNo} • {isoToDdmmyyyy(challan.invoiceDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900">
                            ₹{challan.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </label>
                    );
                  })
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {selectedBulkChallanIds.length} delivery challan(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkConvertModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedBulkChallanIds.length === 0 || isActionLoading}
                  onClick={handleBulkConvertToSale}
                  className="px-5 py-2 rounded-xl bg-[#33077C] hover:bg-[#4309A2] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#33077C]/20 cursor-pointer"
                >
                  {isActionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                  <span>Convert Selected ({selectedBulkChallanIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 8. Preview / Print Modal */}
      {previewChallan && (
        <Modal
          isOpen={!!previewChallan}
          onClose={() => setPreviewChallan(null)}
          title={`Delivery Challan - ${previewChallan.challanNo}`}
          subtitle={`Goods dispatch for ${previewChallan.partyName} on ${isoToDdmmyyyy(previewChallan.invoiceDate)}`}
          maxWidth="3xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
        >
          <div className="p-6 sm:p-8 space-y-6 bg-white text-slate-800 font-sans">
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
                  DELIVERY CHALLAN
                </span>
                <p className="text-sm font-bold text-slate-900">{previewChallan.challanNo}</p>
                <p className="text-xs text-slate-500">Date: {isoToDdmmyyyy(previewChallan.invoiceDate)}</p>
                {previewChallan.vehicleNo && (
                  <p className="text-xs font-semibold text-slate-700">Vehicle No: {previewChallan.vehicleNo}</p>
                )}
                {previewChallan.driverName && (
                  <p className="text-xs font-medium text-slate-500">Driver: {previewChallan.driverName}</p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Consignee / Customer:</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{previewChallan.partyName}</p>
                {previewChallan.customerCompany && <p>{previewChallan.customerCompany}</p>}
                {previewChallan.customerPhone && <p>Phone: {previewChallan.customerPhone}</p>}
                {previewChallan.billingAddress && <p>{previewChallan.billingAddress}</p>}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Dispatch Details:</p>
                <p className="mt-0.5"><strong className="text-slate-700">Ref No:</strong> {previewChallan.referenceNo || '-'}</p>
                <p><strong className="text-slate-700">State of Supply:</strong> {previewChallan.stateOfSupply || 'Tamil Nadu'}</p>
                <p><strong className="text-slate-700">Status:</strong> {previewChallan.status}</p>
              </div>
            </div>

            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-2.5 text-white">#</th>
                  <th className="p-2.5 text-white">Item &amp; Description</th>
                  <th className="p-2.5 text-center text-white">Batch No</th>
                  <th className="p-2.5 text-center text-white">Dispatched Qty</th>
                  <th className="p-2.5 text-right text-white">Unit Price</th>
                  <th className="p-2.5 text-right text-white">Tax (%)</th>
                  <th className="p-2.5 text-right text-white">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewChallan.items.map((it, i) => (
                  <tr key={i}>
                    <td className="p-2.5 text-slate-400">{i + 1}</td>
                    <td className="p-2.5 font-bold text-slate-800">{it.productName}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-[#33077C]">{it.batch || '—'}</td>
                    <td className="p-2.5 text-center font-bold text-[#33077C]">{it.quantity} {it.unit || ''}</td>
                    <td className="p-2.5 text-right">₹{Number(it.unitPrice || 0).toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-right">{it.taxPercent || 0}%</td>
                    <td className="p-2.5 text-right font-bold">₹{Number(it.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">₹{Number(previewChallan.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {previewChallan.taxAmount !== undefined && previewChallan.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>GST Tax:</span>
                    <span className="font-semibold text-slate-800">₹{Number(previewChallan.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-[#33077C] pt-2 border-t border-slate-200">
                  <span>Total Value:</span>
                  <span>₹{Number(previewChallan.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Receiver's Acknowledgement Signature box */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200 text-xs">
              <div className="space-y-8">
                <p className="text-slate-500">Receiver's Signature &amp; Stamp:</p>
                <div className="border-b border-slate-300 w-48"></div>
              </div>
              <div className="text-right space-y-8">
                <p className="text-slate-500">For Yaa Creations (Authorized Signatory):</p>
                <div className="border-b border-slate-300 w-48 ml-auto"></div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewChallan(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handlePrintChallan(previewChallan)}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Challan</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
