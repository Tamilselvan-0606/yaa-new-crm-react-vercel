import { useDebounce } from 'use-debounce';
import { CommonTableHead } from '../../../components/common/CommonTableHead';
import { CustomerSearchableSelect } from '../../../components/common/paginated-select';
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
  ChevronUp,
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
  Phone,
} from 'lucide-react';
import { AddCustomerModal } from './AddCustomerModal';
import { AddItemModal } from '../inventory/AddItemModal';
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
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  printBusinessDocument,
  printTableReport,
  downloadBusinessDocument,
  DocumentPrintOptions,
} from '../../../utils/printUtils';
import { useCompanyDocumentProfile } from '../../../hooks/useCompanyDocumentProfile';
import { exportTableToExcel } from '../../../utils/excelExport';
import { SaleActionDropdown } from '../utils/SaleActionDropdown';
import { DocumentSharePopover, formatDeliveryChallanShare } from '../../../utils/shareUtils';
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
  stockApi,
  mapApiStockToInventoryStockItem,
  ApiStockBatch,
  unpackProducts,
  clientProductApi,
  mapApiCustomerToSalesCustomer,
} from '../../../api';
import {
  syncConvertedInvoiceToStorage,
  recordDocumentConversion,
  findDocumentLineage,
  resolveDocumentConvertedAt,
  initializeWorkflowIntegrity,
  getStoredLineages,
  isMockChallan,
} from '../../../utils/salesDocumentWorkflow';
import { DocumentLineageBadges } from '../../../components/common/DocumentLineageBadges';
import { FormLabel, FORM_INPUT_CLS, getFormInputCls, handleNumberOnlyKeyDown, handleNonNegativeKeyDown } from '../utils/formUtils';
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

const formatDateTime = (
  dateStr?: string | null,
): { date: string; time: string; full: string } | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hh = String(hours).padStart(2, '0');

  return {
    date: `${dd}/${mm}/${yyyy}`,
    time: `${hh}:${minutes} ${ampm}`,
    full: `${dd}/${mm}/${yyyy} ${hh}:${minutes} ${ampm}`,
  };
};

const getInitials = (name?: string, fallback: string = 'PR'): string => {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return fallback;
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
  const companyProfile = useCompanyDocumentProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const {
    customers: localCustomers,
    stocks: localStocks,
    saveCustomer: saveCustomerLocal,
    saveSale,
    setCustomersList,
    setStocksList,
  } = useSalesManagementStore();

  useEffect(() => {
    initializeWorkflowIntegrity();
  }, []);

  // Delivery Challan State with LocalStorage Cache (purging any mock records)
  const [challans, setChallans] = useState<DeliveryChallanRecord[]>(() => {
    try {
      const saved = localStorage.getItem('yaa_crm_delivery_challans');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((c: any) => !isMockChallan(c));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('yaa_crm_delivery_challans', JSON.stringify(cleaned));
          }
          return cleaned;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const persistChallans = (updated: DeliveryChallanRecord[]) => {
    const cleaned = updated.filter((c) => !isMockChallan(c));
    setChallans(cleaned);
    try {
      localStorage.setItem('yaa_crm_delivery_challans', JSON.stringify(cleaned));
    } catch (e) {
      console.error('Failed to save delivery challans', e);
    }
  };

  // Master Data Cache
  const [liveCustomers, setLiveCustomers] = useState<any[]>([]);
  const [liveProducts, setLiveProducts] = useState<ApiProduct[]>([]);
  const [liveStocks, setLiveStocks] = useState<InventoryStockItem[]>([]);
  const [liveBatches, setLiveBatches] = useState<ApiStockBatch[]>([]);

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
  const [debouncedSearch] = useDebounce(pendingSearch, 400);

  // Auto-apply debounced search (min 2 chars or cleared to reset)
  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (trimmed === "" || trimmed.length >= 2) {
      setAppliedSearch(trimmed);
      setPage(1);
    }
  }, [debouncedSearch]);
  const [pendingPeriod, setPendingPeriod] = useState('This Month');
  const [appliedPeriod, setAppliedPeriod] = useState('This Month');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) {
      setPendingSearch(q);
      setAppliedSearch(q);
    }
  }, [searchParams]);



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

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetChallan, setDeleteTargetChallan] = useState<DeliveryChallanRecord | null>(null);
  const [isDeletingChallan, setIsDeletingChallan] = useState(false);
  const [deleteChallanError, setDeleteChallanError] = useState<string | null>(null);

  // Table Column Settings
  const [columnSettings, setColumnSettings] = useState<TableColumnSettings>({
    showItemCategory: false,
    showItemCode: false,
    showHsnSac: false,
    showDescription: false,
    showDiscount: true,
  });
  const [showColumnCustomizePopover, setShowColumnCustomizePopover] = useState(false);
  const [showShareFooterMenu, setShowShareFooterMenu] = useState(false);

  // Tax Mode
  const [priceTaxMode, setPriceTaxMode] = useState<'Without Tax' | 'With Tax'>('Without Tax');

  // Bottom action toggles
  const [showTermsSection, setShowTermsSection] = useState(true);
  const [showDescriptionSection, setShowDescriptionSection] = useState(false);
  const [showTransportSection, setShowTransportSection] = useState(false);
  const [showImageSection, setShowImageSection] = useState(false);
  const [showDocumentSection, setShowDocumentSection] = useState(false);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [attachedDocName, setAttachedDocName] = useState<string | null>(null);

  // Round off
  const [enableRoundOff, setEnableRoundOff] = useState(true);
  const [manualRoundOff, setManualRoundOff] = useState<number | null>(null);

  // Customer Creation Modal
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);

  // Add Item / Product Modal & Searchable Product Dropdown
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [activeItemRowIndex, setActiveItemRowIndex] = useState<number | null>(null);
  const [openProductDropdownRow, setOpenProductDropdownRow] = useState<number | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const productSearchTimerRef = useRef<any>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const isFetchingProductsRef = useRef(false);

  // Fetch live products with multi-source fallback (Commerce products, client products, stocks, localStorage)
  const fetchLiveProducts = useCallback(async (searchQuery?: string) => {
    if (isFetchingProductsRef.current) return;
    isFetchingProductsRef.current = true;
    setIsLoadingProducts(true);
    try {
      let prods: any[] = [];

      // 1. First attempt: standard pagination_required: true
      try {
        const res = await productApi.getProducts({
          page_no: 1,
          page_size: 100,
          pagination_required: true,
          search: searchQuery?.trim() || undefined,
          sortOrder: 'desc',
        });
        const raw = unpackProducts(res);
        if (raw.length > 0) prods = raw;
      } catch (err) {
        console.warn('Product load pagination_required:true error:', err);
      }

      // 2. Second attempt: pagination_required: false
      if (prods.length === 0) {
        try {
          const res2 = await productApi.getProducts({
            search: searchQuery?.trim() || undefined,
            page_size: 100,
            pagination_required: false,
          });
          const raw2 = unpackProducts(res2);
          if (raw2.length > 0) prods = raw2;
        } catch (err2) {
          console.warn('Product load pagination_required:false error:', err2);
        }
      }

      // 3. Third attempt: clientProductApi (platform products)
      if (prods.length === 0) {
        try {
          const cRes = await clientProductApi.getProducts({
            page: 1,
            limit: 100,
            search: searchQuery?.trim() || undefined,
          });
          const cItems = unpackProducts(cRes);
          if (cItems.length > 0) {
            prods = cItems.map((cp: any) => ({
              id: cp.id,
              productId: cp.id,
              productName: cp.name || cp.productName,
              productCode: cp.code || cp.sku,
              salePrice: cp.plans?.[0]?.price || cp.price || 0,
              unit: 'PCS',
              category: cp.tagline || 'General',
            }));
          }
        } catch (cErr) {
          console.warn('clientProductApi load fallback error:', cErr);
        }
      }

      // 4. Fourth attempt: fallback to stockApi
      if (prods.length === 0) {
        try {
          const sRes = await stockApi.getStocks({ pagination_required: false, page_size: 100 });
          const rawStocks = unpackProducts(sRes);
          if (rawStocks.length > 0) {
            prods = rawStocks.map((s: any) => ({
              id: s.productId || s.id,
              productId: s.productId || s.id,
              productName: s.productName,
              productCode: s.sku,
              salePrice: s.unitPrice || 0,
              unit: s.unit || 'PCS',
              category: s.category || '',
            }));
          }
        } catch (sErr) {
          console.warn('stockApi load fallback error:', sErr);
        }
      }

      // 5. Fifth attempt: fallback to local storage
      if (prods.length === 0) {
        try {
          const localSaved = localStorage.getItem('yaa_crm_inventory_stocks');
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              prods = parsed;
            }
          }
        } catch (locErr) {
          console.warn('localStorage stock load fallback error:', locErr);
        }
      }

      if (prods.length > 0) {
        setLiveProducts((prev) => {
          const map = new Map<string, ApiProduct>();
          if (searchQuery?.trim()) {
            prev.forEach((p) => map.set(p.id, p));
          }
          prods.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('Failed to search products in DeliveryChallanView:', err);
    } finally {
      setIsLoadingProducts(false);
      isFetchingProductsRef.current = false;
    }
  }, []);

  // Click outside to close product popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest('.dc-product-cell') &&
        !target.closest('.product-dropdown-popover')
      ) {
        setOpenProductDropdownRow(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Load Customers, Stocks, and Batches master data on mount so list view and form view both have customer codes and stock items
  const loadMasterData = useCallback(async () => {
    fetchLiveProducts();

    try {
      const custRes = await customerApi.getCustomers({ pagination_required: false, page_size: 100 });
      const rawCust = unpackProducts(custRes);
      if (rawCust.length > 0) {
        const mapped = rawCust.map(mapApiCustomerToSalesCustomer);
        setLiveCustomers(mapped);
        setCustomersList(mapped);
      }
    } catch (e) {
      console.warn('Customer load error in DeliveryChallanView:', e);
    }

    try {
      const stockRes = await stockApi.getStocks({ pagination_required: false, page_size: 100 });
      const rawStocks = unpackProducts(stockRes);
      if (rawStocks.length > 0) {
        const mapped = rawStocks.map(mapApiStockToInventoryStockItem);
        setLiveStocks(mapped);
        setStocksList(mapped);
      }
    } catch (e) {
      console.warn('Stock load error in DeliveryChallanView:', e);
    }

    try {
      const batchRes = await stockApi.getStockBatches({ pagination_required: false, page_size: 100 });
      const rawBatches = unpackProducts(batchRes);
      if (rawBatches.length > 0) {
        setLiveBatches(rawBatches);
      }
    } catch (e) {
      console.warn('Batch load error in DeliveryChallanView:', e);
    }
  }, [fetchLiveProducts, setCustomersList, setStocksList]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Load products when entering form mode if not already loaded
  useEffect(() => {
    if (viewMode === 'form') {
      if (!hasLoadedMasterDataRef.current || liveProducts.length === 0) {
        hasLoadedMasterDataRef.current = true;
        fetchLiveProducts();
      }
    }
  }, [viewMode, fetchLiveProducts, liveProducts.length]);

  // On-demand product search: calls products API
  const handleProductSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    fetchLiveProducts(trimmed);
  }, [fetchLiveProducts]);

  // Helper to recover and merge converted challans from lineage and local store
  const recoverLineageChallans = useCallback((existingList: DeliveryChallanRecord[]): DeliveryChallanRecord[] => {
    const list = [...existingList];
    try {
      const lineages = getStoredLineages();
      const ordersRaw = localStorage.getItem('yaa_crm_sale_orders');
      const orders: any[] = ordersRaw ? JSON.parse(ordersRaw) : [];

      lineages.forEach((lin) => {
        if (!lin.challanNo || lin.challanId === 'dc_1' || lin.challanId === 'dc_2') return;
        const alreadyExists = list.some(
          (c) => c.challanNo.toLowerCase() === lin.challanNo?.toLowerCase()
        );
        if (alreadyExists) return;

        const linkedOrder = orders.find(
          (o: any) =>
            (lin.orderNo && o.orderNo === lin.orderNo) ||
            (lin.orderId && o.id === lin.orderId)
        );

        if (!linkedOrder || !Array.isArray(linkedOrder.items) || linkedOrder.items.length === 0) {
          return;
        }

        const recovered: DeliveryChallanRecord = {
          id: lin.challanId || `dc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          challanNo: lin.challanNo,
          referenceNo: linkedOrder.orderNo || lin.orderNo,
          invoiceDate: linkedOrder.orderDate || new Date().toISOString().split('T')[0],
          dueDate: linkedOrder.dueDate || '',
          customerId: linkedOrder.customerId || lin.customerId || '',
          partyName: linkedOrder.partyName || lin.partyName || 'Customer',
          customerPhone: linkedOrder.customerPhone,
          customerEmail: linkedOrder.customerEmail,
          customerCompany: linkedOrder.customerCompany,
          billingAddress: linkedOrder.billingAddress || '',
          shippingAddress: linkedOrder.shippingAddress || linkedOrder.billingAddress,
          items: linkedOrder.items,
          subtotal: linkedOrder.subtotal || 0,
          withGst: linkedOrder.withGst,
          gstType: linkedOrder.gstType,
          cgst: linkedOrder.cgst,
          sgst: linkedOrder.sgst,
          igst: linkedOrder.igst,
          discount: linkedOrder.discount || 0,
          taxAmount: linkedOrder.taxAmount || 0,
          amount: linkedOrder.amount || lin.grandTotal || 0,
          balance: linkedOrder.balance || lin.grandTotal || 0,
          status: 'Open',
          notes: `Converted from Sale Order ${linkedOrder.orderNo}`,
          createdAt: linkedOrder.createdAt || lin.createdAt || new Date().toISOString(),
          updatedAt: linkedOrder.updatedAt || lin.updatedAt || new Date().toISOString(),
        };
        if (!isMockChallan(recovered)) {
          list.push(recovered);
        }
      });
    } catch (e) {
      console.warn('Failed to recover lineage challans:', e);
    }
    return list;
  }, []);

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
        const apiRecords = res.data
          .map((item) => mapApiDeliveryChallanToRecord(item))
          .filter((c) => !isMockChallan(c));

        // Enrich with converted status from document lineage if converted downstream
        const enriched = apiRecords.map((c) => {
          const lin = findDocumentLineage(c.challanNo) || (c.referenceNo ? findDocumentLineage(c.referenceNo) : null);
          return {
            ...c,
            convertedToInvoiceNo: c.convertedToInvoiceNo || lin?.invoiceNo,
            status: lin?.invoiceNo ? ('Converted' as const) : c.status,
          };
        });

        persistChallans(enriched);
        setTotalApiRecords(res.pagination?.totalRecords ?? enriched.length);
        setTotalApiPages(res.pagination?.totalPages ?? Math.max(1, Math.ceil(enriched.length / pageSize)));
        setIsApiConnected(true);
      } else {
        const localSavedRaw = localStorage.getItem('yaa_crm_delivery_challans');
        const localSaved: DeliveryChallanRecord[] = localSavedRaw
          ? JSON.parse(localSavedRaw).filter((c: any) => !isMockChallan(c))
          : [];
        persistChallans(localSaved);
        setTotalApiRecords(localSaved.length);
        setTotalApiPages(Math.max(1, Math.ceil(localSaved.length / pageSize)));
      }
    } catch (err: any) {
      console.warn('Could not reach Commerce Delivery Challans API, using offline cache:', err);
      setIsApiConnected(false);
      try {
        const localSavedRaw = localStorage.getItem('yaa_crm_delivery_challans');
        const localSaved: DeliveryChallanRecord[] = localSavedRaw ? JSON.parse(localSavedRaw) : [];
        const recovered = recoverLineageChallans(localSaved);
        persistChallans(recovered);
        setTotalApiRecords(recovered.length);
        setTotalApiPages(Math.max(1, Math.ceil(recovered.length / pageSize)));
      } catch (fallbackErr) {
        console.error('Fallback delivery challan recovery error:', fallbackErr);
      }
    } finally {
      setIsApiLoading(false);
      isFetchingChallansRef.current = false;
    }
  }, [page, pageSize, appliedSearch, appliedStatus, appliedPeriod, recoverLineageChallans]);

  useEffect(() => {
    fetchDeliveryChallans();
  }, [fetchDeliveryChallans]);

  // Listen for converted challan events from Sale Order or other modules
  useEffect(() => {
    const handleChallansUpdated = () => {
      isFetchingChallansRef.current = false;
      fetchDeliveryChallans();
    };
    window.addEventListener('yaa_crm_challans_updated', handleChallansUpdated);
    return () => {
      window.removeEventListener('yaa_crm_challans_updated', handleChallansUpdated);
    };
  }, [fetchDeliveryChallans]);

  // Listen for sidebar click navigation events to immediately re-fetch delivery challans
  useEffect(() => {
    const handleSidebarNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ path: string; id: string }>;
      if (
        customEvent.detail?.path === '/sale-management/sales/delivery-challan' ||
        customEvent.detail?.id === 'delivery-challan'
      ) {
        isFetchingChallansRef.current = false;
        fetchDeliveryChallans();
      }
    };
    window.addEventListener('crm:sidebar-navigate', handleSidebarNavigate);
    return () => {
      window.removeEventListener('crm:sidebar-navigate', handleSidebarNavigate);
    };
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

  // Helper to extract batches for a product
  const getBatchesForProduct = useCallback((
    productId: string,
    sku: string,
    name: string,
    explicitBatches?: any[]
  ) => {
    if (Array.isArray(explicitBatches) && explicitBatches.length > 0) {
      return explicitBatches;
    }
    const matched = liveBatches.filter((b) => {
      const bPid = String((b as any).productId || (b as any).product_id || "");
      if (productId && bPid && bPid === productId) return true;
      if (sku && (b as any).sku && (b as any).sku === sku) return true;
      if (name && (b as any).productName && (b as any).productName.toLowerCase() === name.toLowerCase()) return true;
      return false;
    });
    return matched;
  }, [liveBatches]);

  // Combined Stock Items / Products (Live API + Live Stocks + Local Store)
  const allStockItems = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Live Products from /commerce/products
    liveProducts.forEach((p) => {
      const pid = String(p.id || "");
      if (!pid) return;
      let tax = 5;
      if (typeof (p as any).taxPercent === 'number') {
        tax = (p as any).taxPercent;
      } else if (p.taxRate) {
        const parsed = parseFloat(String(p.taxRate).replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed)) tax = parsed;
      }
      const sku = p.productCode || (p as any).sku || '';
      const name = p.productName || (p as any).name || 'Unnamed Product';
      const batches = getBatchesForProduct(pid, sku, name, (p as any).batches || (p as any).stockBatches);
      map.set(pid, {
        id: pid,
        productId: pid,
        productName: name,
        sku: sku,
        unitPrice: Number(p.salePrice ?? (p as any).sellingPrice ?? (p as any).price ?? (p as any).unitPrice ?? 0),
        unit: p.unit || 'PCS',
        taxPercent: tax,
        hsnCode: p.hsnCode || '',
        category: p.category || '',
        imageUrl: (p as any).images?.[0] || (p as any).image || (p as any).imageUrl || '',
        batches,
      });
    });

    // 2. Live Stocks from /commerce/stocks
    liveStocks.forEach((s) => {
      const pid = String(s.productId || s.id || "");
      if (pid && !map.has(pid)) {
        const sku = s.sku || (s as any).itemCode || "";
        const name = s.productName || (s as any).name || "Unnamed Product";
        const batches = getBatchesForProduct(pid, sku, name, s.batches);
        let tax = 5;
        if (typeof (s as any).taxPercent === "number") {
          tax = (s as any).taxPercent;
        } else if ((s as any).taxRate) {
          const parsed = parseFloat(String((s as any).taxRate).replace(/[^0-9.]/g, ""));
          if (!isNaN(parsed)) tax = parsed;
        }
        map.set(pid, {
          id: pid,
          productId: pid,
          productName: name,
          sku: sku,
          unitPrice: Number(s.unitPrice ?? (s as any).salePrice ?? (s as any).sellingPrice ?? (s as any).price ?? 0),
          unit: s.unit || "PCS",
          taxPercent: tax,
          hsnCode: (s as any).hsnCode || "",
          category: s.category || "",
          imageUrl: (s as any).images?.[0] || (s as any).image || (s as any).imageUrl || "",
          batches,
        });
      }
    });

    // 3. Fallback from local store stocks
    if (map.size === 0 && Array.isArray(localStocks)) {
      localStocks.forEach((s) => {
        const pid = String((s as any).productId || s.id || "");
        if (pid && !map.has(pid)) {
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
            imageUrl: (s as any).images?.[0] || (s as any).image || (s as any).imageUrl || '',
            batches: s.batches || [],
          });
        }
      });
    }

    return Array.from(map.values()).filter((s: any) => {
      const pid = String(s.productId || s.id || "").trim();
      const name = String(s.productName || "").trim();
      if (!pid && !name) return false;
      if (pid.startsWith("mock_")) return false;
      return true;
    });
  }, [liveProducts, liveStocks, localStocks, getBatchesForProduct]);

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

  // Filter products for the active row popover
  const matchingProducts = useMemo(() => {
    const q = productSearchQuery.toLowerCase().trim();
    if (!q) return allStockItems;
    return allStockItems.filter(
      (p: any) =>
        (p.productName && p.productName.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.itemCode && p.itemCode.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [allStockItems, productSearchQuery]);

  // Handle select product from searchable popover
  const handleSelectProduct = (index: number, product: any) => {
    handleItemChange(index, 'productId', product.productId || product.id);
    handleItemChange(index, 'productName', product.productName);
    handleItemChange(index, 'sku', product.sku || '');
    handleItemChange(index, 'unit', product.unit || 'PCS');
    handleItemChange(index, 'category', product.category || '');
    handleItemChange(index, 'hsnCode', product.hsnCode || '');
    handleItemChange(index, 'unitPrice', Number(product.unitPrice || 0));
    handleItemChange(index, 'taxPercent', Number(product.taxPercent || 0));
    setOpenProductDropdownRow(null);
  };

  // Auto-generate Challan Number
  const generateNextChallanNo = () => {
    const year = new Date().getFullYear();
    const count = challans.length + 1;
    return `DC-${year}-${String(count).padStart(4, '0')}`;
  };

  // Initial Form Data State
  const createEmptyFormData = (customNum = 1) => {
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
          productId: '',
          productName: '',
          sku: '',
          quantity: 1,
          unit: 'PCS',
          unitPrice: 0,
          discountPercent: 0,
          taxPercent: 5,
          total: 0,
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
    if (!customer || !customer.id) {
      updateActiveTabFormData((prev) => ({
        ...prev,
        customerId: '',
        partyName: '',
        customerPhone: '',
        customerEmail: '',
        customerCompany: '',
        billingAddress: '',
        shippingAddress: '',
      }));
      setPartySearchQuery('');
      setIsPartyDropdownOpen(false);
      return;
    }
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
    updateActiveTabFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `dci_item_${Date.now()}_${prev.items.length + 1}`,
          productId: '',
          productName: '',
          sku: '',
          quantity: 1,
          unit: 'PCS',
          unitPrice: 0,
          discountPercent: 0,
          taxPercent: 5,
          total: 0,
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
    const hasInvalidQty = validItems.some((it) => !it.quantity || it.quantity <= 0);
    if (hasInvalidQty) {
      toast.error('All items must have a quantity greater than zero.');
      return;
    }
    const hasInvalidPrice = validItems.some((it) => it.unitPrice !== undefined && it.unitPrice < 0);
    if (hasInvalidPrice) {
      toast.error('Item rates cannot be negative.');
      return;
    }
    const hasInvalidDiscount = validItems.some(
      (it) =>
        (it.discountPercent !== undefined && (it.discountPercent < 0 || it.discountPercent > 100)) ||
        (it.discountAmount !== undefined && it.discountAmount < 0)
    );
    if (hasInvalidDiscount) {
      toast.error('Discounts cannot be negative and discount percentage cannot exceed 100%.');
      return;
    }

    setIsActionLoading(true);
    try {
      // 1. Resolve customerId (required string for backend schema)
      let resolvedCustomerId = form.customerId;
      if (!resolvedCustomerId || !UUID_REGEX.test(resolvedCustomerId)) {
        const matchedCust = liveCustomers.find(
          (c) =>
            (form.customerId && c.id === form.customerId) ||
            c.name.toLowerCase() === form.partyName.trim().toLowerCase()
        );
        if (matchedCust && UUID_REGEX.test(matchedCust.id)) {
          resolvedCustomerId = matchedCust.id;
        }
      }

      // If still missing, try auto-creating customer via customerApi
      if (!resolvedCustomerId || !UUID_REGEX.test(resolvedCustomerId)) {
        try {
          const custRes = await customerApi.createCustomer({
            name: form.partyName.trim(),
            customerType: form.customerCompany?.trim() ? 'Business' : 'Individual',
            phone: form.customerPhone.trim(),
            email: form.customerEmail.trim() || undefined,
            company: form.customerCompany.trim() || undefined,
            billingAddress: form.billingAddress.trim() || undefined,
            shippingAddress: form.shippingAddress.trim() || undefined,
            state: form.stateOfSupply,
          });
          if (custRes?.data?.id && UUID_REGEX.test(custRes.data.id)) {
            resolvedCustomerId = custRes.data.id;
          }
        } catch (e) {
          console.warn('Auto customer creation fallback:', e);
        }
      }

      // Fallback to first available live customer if still unassigned
      if (!resolvedCustomerId && liveCustomers.length > 0) {
        resolvedCustomerId = liveCustomers[0].id;
      }

      if (!resolvedCustomerId) {
        toast.error('Please select an existing customer or enter a valid customer name.');
        setIsActionLoading(false);
        return;
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
      if (andConvert) {
        navigate('/sale-management/sales/sale', {
          state: {
            convertFrom: {
              sourceType: 'Challan',
              sourceId: savedChallanId,
              sourceNo: finalChallanNo,
              customerId: form.customerId,
              customerName: form.partyName,
              customerCompany: form.customerCompany,
              customerPhone: form.customerPhone,
              customerEmail: form.customerEmail,
              billingAddress: form.billingAddress,
              shippingAddress: form.shippingAddress || form.billingAddress,
              items: form.items,
              subtotal: currentCalculations.subtotalGross,
              withGst: currentCalculations.totalTax > 0,
              gstType: form.stateOfSupply?.includes('Tamil Nadu') ? 'intra_state' : 'inter_state',
              cgst: currentCalculations.totalTax > 0 && form.stateOfSupply?.includes('Tamil Nadu') ? currentCalculations.totalTax / 2 : 0,
              sgst: currentCalculations.totalTax > 0 && form.stateOfSupply?.includes('Tamil Nadu') ? currentCalculations.totalTax / 2 : 0,
              igst: currentCalculations.totalTax > 0 && !form.stateOfSupply?.includes('Tamil Nadu') ? currentCalculations.totalTax : 0,
              discount: currentCalculations.totalDiscount || 0,
              totalDiscount: currentCalculations.totalDiscount || 0,
              taxAmount: currentCalculations.totalTax || 0,
              grandTotal: currentCalculations.finalAmount,
              paidAmount: 0,
              paymentMethod: 'Bank Transfer',
              paymentTerms: '15 Days',
              dueDate: form.dueDate,
              notes: `Converted from Delivery Challan ${finalChallanNo}`,
            },
          },
        });
        return;
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

  // Determine conversion status for Delivery Challan
  const getChallanStages = (challan: DeliveryChallanRecord) => {
    const challanNoClean = challan.challanNo?.trim();
    const lineage = challanNoClean ? findDocumentLineage(challanNoClean, 'Challan') : undefined;

    const isInvoiceConverted = Boolean(
      lineage?.invoiceNo ||
      lineage?.invoiceId ||
      challan.status === 'Converted' ||
      (challan.convertedToInvoiceNo && challan.convertedToInvoiceNo.startsWith('INV-'))
    );

    return {
      lineage,
      isInvoiceConverted,
      isFullyConverted: isInvoiceConverted,
    };
  };

  // Convert to Sale Invoice from Table -> Opens New Sale Invoice page with calculations
  const handleConvertExistingToSale = async (challan: DeliveryChallanRecord) => {
    const stages = getChallanStages(challan);
    if (stages.isFullyConverted || stages.isInvoiceConverted) {
      toast.info(`Delivery Challan ${challan.challanNo} is already converted.`);
      return;
    }

    navigate('/sale-management/sales/sale', {
      state: {
        convertFrom: {
          sourceType: 'Challan',
          sourceId: challan.id,
          sourceNo: challan.challanNo,
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
          discount: challan.discount || 0,
          totalDiscount: challan.discount || 0,
          taxAmount: challan.taxAmount || 0,
          grandTotal: challan.amount,
          paidAmount: 0,
          paymentMethod: 'Bank Transfer',
          paymentTerms: '15 Days',
          dueDate: challan.dueDate,
          notes: `Converted from Delivery Challan ${challan.challanNo}`,
        },
      },
    });
  };

  // Delete Delivery Challan (DELETE /commerce/challans/{id}) with confirmation modal
  const handleOpenDeleteModal = (challan: DeliveryChallanRecord) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setDeleteTargetChallan(challan);
    setDeleteChallanError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteChallan = async () => {
    if (!deleteTargetChallan) return;
    setIsDeletingChallan(true);
    setDeleteChallanError(null);
    try {
      if (UUID_REGEX.test(deleteTargetChallan.id)) {
        await commerceDeliveryChallanApi.deleteChallan(deleteTargetChallan.id);
        toast.success(`Delivery challan "${deleteTargetChallan.challanNo}" deleted successfully.`);
      } else {
        const updated = challans.filter((c) => c.id !== deleteTargetChallan.id);
        persistChallans(updated);
        toast.success(`Delivery challan "${deleteTargetChallan.challanNo}" removed.`);
      }
      dispatch(
        baseApi.util.invalidateTags([
          { type: 'DeliveryChallan', id: deleteTargetChallan.id },
          { type: 'DeliveryChallan', id: 'LIST' },
        ])
      );
      setIsDeleteModalOpen(false);
      setDeleteTargetChallan(null);
      await fetchDeliveryChallans();
    } catch (err: any) {
      console.error('Delete failed:', err);
      const errMsg = err?.response?.data?.error?.message || err?.message || 'Failed to delete delivery challan';
      setDeleteChallanError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeletingChallan(false);
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
            convertedAt: new Date().toISOString(),
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

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const buildChallanDocumentOptions = (item: DeliveryChallanRecord): DocumentPrintOptions => ({
    docTypeTitle: 'DELIVERY CHALLAN',
    docNo: item.challanNo,
    docDate: isoToDdmmyyyy(item.invoiceDate),
    dueDate: isoToDdmmyyyy(item.dueDate),
    status: item.status,
    statusColor: item.status === 'Delivered' ? 'emerald' : item.status === 'Cancelled' ? 'rose' : 'purple',
    referenceNo: item.referenceNo,
    companyName: companyProfile.companyName || 'YAA CREATIONS CRM',
    companySubtitle: companyProfile.companySubtitle || 'Wholesale & Enterprise Distribution Hub',
    companyAddress: companyProfile.companyAddress || undefined,
    companyGstin: companyProfile.companyGstin || undefined,
    companyPhone: companyProfile.companyPhone || undefined,
    companyEmail: companyProfile.companyEmail || undefined,
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

  // Print Delivery Challan
  const handlePrintChallan = (item: DeliveryChallanRecord) => {
    printBusinessDocument(buildChallanDocumentOptions(item));
  };

  // Download Delivery Challan as valid PDF
  const handleDownloadChallan = async (item: DeliveryChallanRecord) => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const toastId = `dl-dc-${item.id}`;
    toast.loading(`Preparing PDF for Delivery Challan ${item.challanNo}...`, { id: toastId });
    try {
      const options = buildChallanDocumentOptions(item);
      await downloadBusinessDocument(options, `DeliveryChallan_${item.challanNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
      toast.success(`Delivery Challan ${item.challanNo} downloaded successfully!`, { id: toastId });
    } catch (err: any) {
      console.error('Delivery challan download error:', err);
      toast.error('Failed to download delivery challan PDF.', { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (challans.length === 0) {
      toast.error('No delivery challans to export');
      return;
    }

    const excelRows = challans.map((c) => {
      const createdDt = formatDateTime(c.createdAt);
      const convertedAt = resolveDocumentConvertedAt('Challan', c);
      const convertedDt = formatDateTime(convertedAt);
      return {
        date: isoToDdmmyyyy(c.invoiceDate),
        dueDate: isoToDdmmyyyy(c.dueDate),
        createdDt: createdDt ? createdDt.full : '—',
        convertedDt: convertedDt ? convertedDt.full : '—',
        challanNo: c.challanNo,
        referenceNo: c.referenceNo || '-',
        partyName: c.partyName,
        customerPhone: c.customerPhone || '-',
        vehicleNo: c.vehicleNo || '-',
        amount: Number(c.amount || 0),
        balance: Number(c.balance || 0),
        status: c.status,
      };
    });

    exportTableToExcel({
      filename: `Delivery_Challans_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Delivery Challans',
      title: 'YAA CREATIONS CRM - DELIVERY CHALLAN REPORT',
      subtitle: `Filter: ${appliedPeriod} | Total Records: ${challans.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: 'Created Date & Time', key: 'createdDt', align: 'center', width: 22 },
        { header: 'Converted Date & Time', key: 'convertedDt', align: 'center', width: 22 },
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
        createdDt: 'TOTAL',
        partyName: `${challans.length} Challans`,
        amount: challans.reduce((sum, c) => sum + (c.amount || 0), 0),
        balance: challans.reduce((sum, c) => sum + (c.balance || 0), 0),
      },
    });

    toast.success(`Delivery Challans Excel report downloaded (${challans.length} records)!`);
  };

  // Print Delivery Challans Table Report via universal printUtils
  const handlePrintTableReport = () => {
    if (challans.length === 0) {
      toast.error('No delivery challans to print.');
      return;
    }

    const printRows = challans.map((c) => {
      const createdDt = formatDateTime(c.createdAt);
      const convertedAt = resolveDocumentConvertedAt('Challan', c);
      const convertedDt = formatDateTime(convertedAt);
      return {
        challanNo: c.challanNo,
        createdDt: createdDt ? createdDt.full : '—',
        convertedDt: convertedDt ? convertedDt.full : '—',
        partyName: c.partyName,
        customerPhone: c.customerPhone || '-',
        amount: Number(c.amount || 0),
        balance: Number(c.balance || 0),
        status: c.status,
      };
    });

    printTableReport({
      title: 'DELIVERY CHALLAN REGISTER',
      subtitle: `Filter: ${appliedPeriod} | Total Challans: ${challans.length}`,
      columns: [
        { header: 'Challan No.', key: 'challanNo', align: 'center', width: '15%' },
        { header: 'Created At', key: 'createdDt', align: 'center', width: '18%' },
        { header: 'Converted At', key: 'convertedDt', align: 'center', width: '18%' },
        { header: 'Customer Name', key: 'partyName', align: 'left', width: '22%' },
        { header: 'Contact', key: 'customerPhone', align: 'left', width: '12%' },
        { header: 'Amount (₹)', key: 'amount', align: 'right', type: 'currency', width: '12%' },
        { header: 'Balance (₹)', key: 'balance', align: 'right', type: 'currency', width: '12%' },
        { header: 'Status', key: 'status', align: 'center', width: '10%' },
      ],
      data: printRows,
      summaryRow: {
        challanNo: 'TOTAL',
        partyName: `${challans.length} Challans`,
        amount: metrics.totalVal,
        balance: metrics.openVal,
      },
      metrics: [
        { label: 'Total Value', value: metrics.totalVal },
        { label: 'Open Amount', value: metrics.openVal },
        { label: 'Total Challans', value: challans.length },
      ],
    });
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

  // Close party dropdown and product popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
      const target = e.target as HTMLElement;
      if (!target.closest('.dc-product-cell') && !target.closest('.dc-product-dropdown')) {
        setOpenProductDropdownRow(null);
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
      <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans -m-4 sm:-m-6 lg:-m-8">
        {/* 1. TOP TABS BAR (CRM THEME) */}
        <div className="bg-slate-100 px-4 pt-3 pb-0 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs sm:text-[13px] font-bold cursor-pointer transition-all border-t border-x ${
                    isActive
                      ? "bg-white text-[#33077C] border-slate-200 shadow-2xs"
                      : "bg-slate-200/70 text-slate-600 border-transparent hover:bg-slate-200"
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-[#33077C]" />
                  <span>{tab.title}</span>
                  {tabs.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors ml-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={handleAddNewTab}
              className="w-7 h-7 rounded-full bg-[#33077C] hover:bg-[#4309A2] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer ml-1"
              title="Add New Delivery Challan Tab"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* 2. FORM HEADER / TITLE */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <Truck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Delivery Challan
                </h1>
                {activeTab.formData.challanNo && (
                  <span className="font-extrabold text-[#33077C] font-mono text-xs sm:text-[13px] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/80 shadow-2xs">
                    #{activeTab.formData.challanNo}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {activeTab.editingChallan
                  ? `Edit Delivery Challan #${activeTab.editingChallan.challanNo}`
                  : "Issue delivery challans for goods transport, sample dispatches, and scheduled fulfillment"}
              </p>
            </div>
          </div>
        </div>

        {/* 3. MAIN FORM CONTAINER */}
        <form
          id="challan-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveChallan(false);
          }}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6 flex-1 flex flex-col justify-between mb-6"
        >
          <div>
            {/* Top Meta Details (Party + Ref/Date/State) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-6 border-b border-slate-100">
              {/* Left Column: Customer Selection */}
              <div className="lg:col-span-6 xl:col-span-5" ref={partyDropdownRef}>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Customer <span className="text-rose-500">*</span>
                </label>
                <CustomerSearchableSelect
                  value={activeTab.formData.customerId}
                  allowNone
                  size="lg"
                  onChange={(val, cust) => {
                    updateActiveTabFormData((prev) => ({
                      ...prev,
                      customerId: val,
                      partyName: cust ? cust.name : (val ? prev.partyName : ""),
                      customerCompany: cust ? (cust.company || "") : (val ? prev.customerCompany : ""),
                      customerPhone: cust ? (cust.phone || "") : (val ? prev.customerPhone : ""),
                      customerEmail: cust ? (cust.email || "") : (val ? prev.customerEmail : ""),
                      billingAddress: cust ? (cust.billingAddress || cust.address || "") : (val ? prev.billingAddress : ""),
                    }));
                  }}
                  selectedCustomer={
                    activeTab.formData.customerId
                      ? {
                          id: activeTab.formData.customerId,
                          name: activeTab.formData.partyName,
                          company: activeTab.formData.customerCompany,
                          phone: activeTab.formData.customerPhone,
                        }
                      : null
                  }
                  onAddNewCustomer={() => setIsAddCustomerModalOpen(true)}
                  placeholder="Select or search customer..."
                />

                

                {/* Selected Customer Details Preview Pill */}
                {activeTab.formData.partyName && (
                  <div className="mt-2.5 p-3 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{activeTab.formData.partyName}</span>
                        {activeTab.formData.customerCompany && (
                          <span className="text-[11px] font-medium text-slate-500">
                            • {activeTab.formData.customerCompany}
                          </span>
                        )}
                      </div>
                      {activeTab.formData.customerPhone && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-[#33077C]" />
                          <span>{activeTab.formData.customerPhone}</span>
                        </div>
                      )}
                      {activeTab.formData.billingAddress && (
                        <div className="text-[11px] text-slate-500 truncate max-w-sm">
                          {activeTab.formData.billingAddress}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        updateActiveTabFormData((prev) => ({
                          ...prev,
                          customerId: "",
                          partyName: "",
                          customerPhone: "",
                          customerEmail: "",
                          customerCompany: "",
                          billingAddress: "",
                          shippingAddress: "",
                        }));
                        setPartySearchQuery("");
                      }}
                      className="p-1 hover:bg-purple-100/60 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title="Clear customer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Challan Date & State of supply */}
              <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-end gap-3">
                {/* Challan Date */}
                <div className="flex items-center justify-end gap-3">
                  <label className="text-xs font-bold text-slate-600 w-28 text-right">
                    Challan Date
                  </label>
                  <input
                    type="date"
                    value={activeTab.formData.invoiceDate}
                    onChange={(e) =>
                      updateActiveTabFormData((prev) => ({
                        ...prev,
                        invoiceDate: e.target.value,
                      }))
                    }
                    className="w-40 sm:w-48 h-9 px-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                  />
                </div>

                {/* State of supply */}
                <div className="flex items-center justify-end gap-3">
                  <label className="text-xs font-bold text-slate-600 w-28 text-right">
                    State of supply
                  </label>
                  <select
                    value={activeTab.formData.stateOfSupply}
                    onChange={(e) =>
                      updateActiveTabFormData((prev) => ({
                        ...prev,
                        stateOfSupply: e.target.value,
                      }))
                    }
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
            <div className="mt-6 overflow-x-auto border border-slate-200 rounded-xl min-h-[380px] pb-36">
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
                        </div>
                      )}
                    </th>
                    <th className="py-2.5 px-2 text-center w-10 text-slate-400"></th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-200 bg-white">
                  {activeTab.formData.items.map((rowItem, idx) => (
                    <tr
                      key={rowItem.id || idx}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-semibold">
                        {idx + 1}
                      </td>
                      {/* Product cell with custom searchable popover */}
                      <td className="py-2.5 px-3 min-w-[220px] relative dc-product-cell">
                        <div className="relative" ref={openProductDropdownRow === idx ? productDropdownRef : undefined}>
                          <div
                            className={`w-full min-h-[38px] px-3 py-1.5 bg-white border rounded-xl flex items-center justify-between text-xs cursor-pointer transition-all ${
                              openProductDropdownRow === idx
                                ? "border-[#33077C] ring-2 ring-[#33077C]/10 bg-white"
                                : rowItem.productName
                                ? "border-slate-300 hover:border-slate-400"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="text"
                              placeholder="Type or select product item..."
                              value={rowItem.productName || ""}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenProductDropdownRow(idx);
                                setProductSearchQuery(rowItem.productName || "");
                                if (liveProducts.length === 0) {
                                  fetchLiveProducts();
                                }
                              }}
                              onFocus={() => {
                                setOpenProductDropdownRow(idx);
                                setProductSearchQuery(rowItem.productName || "");
                                if (liveProducts.length === 0) {
                                  fetchLiveProducts();
                                }
                              }}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleItemChange(idx, "productName", val);
                                setProductSearchQuery(val);
                                setOpenProductDropdownRow(idx);
                                if (productSearchTimerRef.current) {
                                  clearTimeout(productSearchTimerRef.current);
                                }
                                if (val.trim()) {
                                  productSearchTimerRef.current = setTimeout(() => {
                                    fetchLiveProducts(val.trim());
                                  }, 300);
                                }
                              }}
                              className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                            />
                            {isLoadingProducts ? (
                              <Loader2 className="w-3.5 h-3.5 text-[#33077C] animate-spin shrink-0 ml-1" />
                            ) : (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (openProductDropdownRow === idx) {
                                    setOpenProductDropdownRow(null);
                                  } else {
                                    setOpenProductDropdownRow(idx);
                                    setProductSearchQuery(rowItem.productName || "");
                                    if (liveProducts.length === 0) {
                                      fetchLiveProducts();
                                    }
                                  }
                                }}
                                className="p-0.5 hover:bg-slate-100 rounded cursor-pointer shrink-0 ml-1"
                              >
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                    openProductDropdownRow === idx
                                      ? "rotate-180 text-[#33077C]"
                                      : ""
                                  }`}
                                />
                              </div>
                            )}
                          </div>

                          {/* Dropdown Menu for Product Selection */}
                          {openProductDropdownRow === idx && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="product-dropdown-popover absolute left-0 top-full mt-1.5 w-[360px] sm:w-[420px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-purple-100 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                            >
                              {/* Search Bar matching Customer Dropdown */}
                              <div className="relative mb-2">
                                <div className="flex items-center w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-[#33077C] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#33077C]/10 transition-all">
                                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                                  <input
                                    type="text"
                                    placeholder="Search product by name, SKU or category..."
                                    value={productSearchQuery}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setProductSearchQuery(val);
                                      if (productSearchTimerRef.current) {
                                        clearTimeout(productSearchTimerRef.current);
                                      }
                                      if (val.trim().length >= 1) {
                                        productSearchTimerRef.current = setTimeout(() => {
                                          fetchLiveProducts(val.trim());
                                        }, 300);
                                      }
                                    }}
                                    autoFocus
                                    className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                                  />
                                  {productSearchQuery && (
                                    <button
                                      type="button"
                                      onClick={() => setProductSearchQuery('')}
                                      className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* 1. Add New Product Button */}
                              <div className="pb-2 mb-1.5 border-b border-slate-100">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveItemRowIndex(idx);
                                    setOpenProductDropdownRow(null);
                                    setIsAddItemModalOpen(true);
                                  }}
                                  className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100/80 text-[#33077C] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-purple-200/80 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Add New Product</span>
                                </button>
                              </div>

                              {/* 2. Options List */}
                              <div className="max-h-64 overflow-y-auto p-0.5 space-y-0.5 divide-y divide-slate-100/60 custom-scrollbar">
                                {/* Option: Clear / None */}
                                <div
                                  onClick={() => {
                                    handleItemChange(idx, "productId", "");
                                    handleItemChange(idx, "productName", "");
                                    handleItemChange(idx, "unitPrice", 0);
                                    setOpenProductDropdownRow(null);
                                  }}
                                  className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                    !rowItem.productName
                                      ? "bg-purple-50 text-[#33077C] font-bold"
                                      : "hover:bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400 italic">None / Clear Product</span>
                                  </div>
                                  {!rowItem.productName && (
                                    <Check className="w-4 h-4 text-[#33077C]" />
                                  )}
                                </div>

                                {isLoadingProducts && matchingProducts.length === 0 ? (
                                  <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-[#33077C]" />
                                    <span>Loading products...</span>
                                  </div>
                                ) : matchingProducts.length === 0 ? (
                                  <div className="py-6 px-3 text-center text-slate-400">
                                    <p className="text-xs font-semibold text-slate-600">No products found</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Try typing a different name, category, or SKU</p>
                                    {productSearchQuery.trim() && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveItemRowIndex(idx);
                                          setOpenProductDropdownRow(null);
                                          setIsAddItemModalOpen(true);
                                        }}
                                        className="mt-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#33077C] text-white text-[11px] font-bold hover:bg-[#4309A2] transition-colors"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Add "{productSearchQuery.trim()}"</span>
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  matchingProducts.map((p: any) => {
                                    const pId = p.productId || p.id;
                                    const isSelected = rowItem.productId === pId || (rowItem.productName && rowItem.productName === p.productName);
                                    const imgUrl = p.imageUrl || p.image;
                                    return (
                                      <div
                                        key={pId}
                                        onClick={() => handleSelectProduct(idx, p)}
                                        className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer text-left ${
                                          isSelected
                                            ? "bg-purple-50 text-[#33077C] font-semibold border border-purple-200/60"
                                            : "hover:bg-slate-50/80 text-slate-800"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                          <div className="w-8 h-8 rounded-full bg-purple-100 text-[#33077C] font-bold text-xs flex items-center justify-center shrink-0 border border-purple-200/60 overflow-hidden">
                                            {imgUrl ? (
                                              <img
                                                src={imgUrl}
                                                alt={p.productName}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <span>{getInitials(p.productName, "PR")}</span>
                                            )}
                                          </div>

                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-bold text-slate-900 truncate">
                                                {p.productName}
                                              </span>
                                              {p.category && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium truncate max-w-[120px]">
                                                  {p.category}
                                                </span>
                                              )}
                                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                Active
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                                              <span className="font-mono text-slate-600">
                                                SKU: {p.sku || p.productCode || "PRD"}
                                              </span>
                                              {p.unit && <span>• {p.unit}</span>}
                                              {p.hsnCode && (
                                                <span className="text-slate-400 font-mono text-[10px]">
                                                  • HSN: {p.hsnCode}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="font-bold text-[#33077C] text-xs">
                                            ₹{Number(p.unitPrice || 0).toLocaleString("en-IN")}
                                          </span>
                                          {isSelected && (
                                            <Check className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Batch No */}
                      <td className="py-2.5 px-2">
                        {(() => {
                          const matchedStock = allStockItems.find(
                            (s: any) =>
                              s.productId === rowItem.productId ||
                              s.id === rowItem.productId,
                          );
                          const batches =
                            (matchedStock as any)?.batches || [];
                          if (batches.length > 0) {
                            return (
                              <select
                                value={rowItem.batch || ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    idx,
                                    "batch",
                                    e.target.value,
                                  )
                                }
                                className="w-full h-9 px-2 bg-purple-50/60 hover:bg-purple-50 text-[#33077C] border border-purple-200 rounded-lg text-xs font-bold outline-none cursor-pointer focus:border-[#4309A2]"
                              >
                                <option value="">Select Batch...</option>
                                {batches.map((b: any) => (
                                  <option
                                    key={b.batchNo || b.id}
                                    value={b.batchNo}
                                  >
                                    {b.batchNo} {b.quantity !== undefined ? `(${b.quantity} in stock)` : ''}
                                  </option>
                                ))}
                                {rowItem.batch && !batches.some((b: any) => b.batchNo === rowItem.batch) && (
                                  <option value={rowItem.batch}>{rowItem.batch}</option>
                                )}
                              </select>
                            );
                          }
                          return (
                            <input
                              type="text"
                              placeholder="Batch No"
                              value={rowItem.batch || ""}
                              onChange={(e) =>
                                handleItemChange(
                                  idx,
                                  "batch",
                                  e.target.value,
                                )
                              }
                              className="w-full h-9 px-2 text-center bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold font-mono text-[#33077C] outline-none focus:border-[#4309A2]"
                            />
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          min="1"
                          value={rowItem.quantity || ""}
                          onKeyDown={handleNonNegativeKeyDown}
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              "quantity",
                              Number(e.target.value),
                            )
                          }
                          className="w-full h-9 px-2 text-center bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-[#4309A2]"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <select
                          value={rowItem.unit || "NONE"}
                          onChange={(e) =>
                            handleItemChange(idx, "unit", e.target.value)
                          }
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
                          value={rowItem.unitPrice || ""}
                          onKeyDown={handleNonNegativeKeyDown}
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              "unitPrice",
                              Number(e.target.value),
                            )
                          }
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
                              value={rowItem.discountPercent || ""}
                              onKeyDown={handleNonNegativeKeyDown}
                              onChange={(e) =>
                                handleItemChange(
                                  idx,
                                  "discountPercent",
                                  Number(e.target.value),
                                )
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
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              "taxPercent",
                              Number(e.target.value),
                            )
                          }
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
                        ₹
                        {rowItem.total?.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        }) || "0.00"}
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
                <tfoot>
                  <tr className="bg-slate-50/90 border-t border-slate-200 font-bold text-slate-800 text-xs">
                    {/* Add Row Button Column */}
                    <td
                      colSpan={
                        2 +
                        (columnSettings.showItemCategory ? 1 : 0) +
                        (columnSettings.showItemCode ? 1 : 0) +
                        (columnSettings.showHsnSac ? 1 : 0) +
                        (columnSettings.showDescription ? 1 : 0) +
                        1
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
                      {currentCalculations.totalQty}
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
                          {currentCalculations.totalDiscount > 0
                            ? currentCalculations.totalDiscount.toFixed(2)
                            : "0"}
                        </td>
                      </>
                    )}

                    {/* Tax placeholder */}
                    <td className="border-r border-slate-200"></td>

                    {/* Total Tax Amount */}
                    <td className="py-2.5 px-2 text-right border-r border-slate-200 pr-3 font-semibold text-slate-700">
                      {currentCalculations.totalTax > 0
                        ? currentCalculations.totalTax.toFixed(2)
                        : "0"}
                    </td>

                    {/* Total Line Amount */}
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 font-extrabold text-[#33077C]">
                      ₹
                      {currentCalculations.finalAmount.toLocaleString(
                        "en-IN",
                        { minimumFractionDigits: 2 },
                      )}
                    </td>

                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5. BOTTOM SECTION: ACTION TILES (LEFT) & ROUND OFF / TOTAL (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8 items-start">
              {/* Left Column: Action Buttons & Expandable Cards */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowTermsSection(!showTermsSection)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showTermsSection
                        ? "bg-purple-50 text-[#33077C] border-purple-300 ring-2 ring-purple-100"
                        : "bg-white text-slate-600 hover:text-[#33077C] hover:bg-purple-50/50 border-slate-200"
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span>ADD TERMS & CONDITIONS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowDescriptionSection(!showDescriptionSection)
                    }
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showDescriptionSection
                        ? "bg-purple-50 text-[#33077C] border-purple-300 ring-2 ring-purple-100"
                        : "bg-white text-slate-600 hover:text-[#33077C] hover:bg-purple-50/50 border-slate-200"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>ADD DESCRIPTION</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTransportSection(!showTransportSection)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showTransportSection
                        ? "bg-purple-50 text-[#33077C] border-purple-300 ring-2 ring-purple-100"
                        : "bg-white text-slate-600 hover:text-[#33077C] hover:bg-purple-50/50 border-slate-200"
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>ADD TRANSPORT INFO</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowImageSection(!showImageSection)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showImageSection
                        ? "bg-purple-50 text-[#33077C] border-purple-300 ring-2 ring-purple-100"
                        : "bg-white text-slate-600 hover:text-[#33077C] hover:bg-purple-50/50 border-slate-200"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>ADD IMAGE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowDocumentSection(!showDocumentSection)
                    }
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      showDocumentSection
                        ? "bg-purple-50 text-[#33077C] border-purple-300 ring-2 ring-purple-100"
                        : "bg-white text-slate-600 hover:text-[#33077C] hover:bg-purple-50/50 border-slate-200"
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>ADD DOCUMENT</span>
                  </button>
                </div>

                {/* Expandable Sections */}
                {showTermsSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-1.5 animate-in fade-in duration-100">
                    <label className="block text-xs font-bold text-slate-700">
                      Terms & Conditions
                    </label>
                    <textarea
                      rows={3}
                      value={activeTab.formData.terms || ""}
                      onChange={(e) =>
                        updateActiveTabFormData((prev) => ({
                          ...prev,
                          terms: e.target.value,
                        }))
                      }
                      placeholder="Enter delivery challan terms and conditions..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-[#33077C]"
                    />
                  </div>
                )}

                {showDescriptionSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-1.5 animate-in fade-in duration-100">
                    <label className="block text-xs font-bold text-slate-700">
                      Challan Description / Gate Pass Notes
                    </label>
                    <textarea
                      rows={2}
                      value={activeTab.formData.notes || ""}
                      onChange={(e) =>
                        updateActiveTabFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Add dispatch instructions, site contact, or unloading remarks..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-[#33077C]"
                    />
                  </div>
                )}

                {showTransportSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-3 animate-in fade-in duration-100">
                    <label className="block text-xs font-bold text-slate-700">
                      Transport & Vehicle Information
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Vehicle No.
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. TN-09-AB-1234"
                          value={activeTab.formData.vehicleNo || ""}
                          onChange={(e) =>
                            updateActiveTabFormData((prev) => ({
                              ...prev,
                              vehicleNo: e.target.value,
                            }))
                          }
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#33077C]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Driver Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Muthu Vel"
                          value={activeTab.formData.driverName || ""}
                          onChange={(e) =>
                            updateActiveTabFormData((prev) => ({
                              ...prev,
                              driverName: e.target.value,
                            }))
                          }
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#33077C]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Driver Phone
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. +91 98401 23456"
                          value={activeTab.formData.driverPhone || ""}
                          onChange={(e) =>
                            updateActiveTabFormData((prev) => ({
                              ...prev,
                              driverPhone: e.target.value,
                            }))
                          }
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#33077C]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {showImageSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-2 animate-in fade-in duration-100 text-xs">
                    <label className="block text-xs font-bold text-slate-700">
                      Attach Image
                    </label>
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
                              toast.success(
                                `Image "${e.target.files[0].name}" attached!`,
                              );
                            }
                          }}
                        />
                      </label>
                      {attachedImageName && (
                        <span className="text-slate-600 font-medium truncate max-w-xs">
                          {attachedImageName}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {showDocumentSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-2 animate-in fade-in duration-100 text-xs">
                    <label className="block text-xs font-bold text-slate-700">
                      Attach Document / PDF
                    </label>
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
                              toast.success(
                                `Document "${e.target.files[0].name}" attached!`,
                              );
                            }
                          }}
                        />
                      </label>
                      {attachedDocName && (
                        <span className="text-slate-600 font-medium truncate max-w-xs">
                          {attachedDocName}
                        </span>
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
                        if (!e.target.checked) setManualRoundOff(null);
                      }}
                      className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C] border-slate-300 accent-[#33077C]"
                    />
                    <span>Round Off</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!enableRoundOff}
                    value={
                      currentCalculations.roundOff
                        ? currentCalculations.roundOff
                        : ""
                    }
                    placeholder="0.00"
                    onChange={(e) =>
                      setManualRoundOff(Number(e.target.value))
                    }
                    className="w-24 h-8 px-2.5 text-right bg-white border border-slate-200 disabled:bg-slate-50 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#33077C]"
                  />
                </div>

                {/* Grand Total Display */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-800">
                    Total
                  </span>
                  <div className="w-48 sm:w-56 h-11 px-3.5 bg-purple-50/30 border-2 border-purple-200 rounded-xl flex items-center justify-end text-base font-extrabold text-[#33077C] shadow-2xs">
                    ₹{" "}
                    {currentCalculations.finalAmount.toLocaleString(
                      "en-IN",
                      { minimumFractionDigits: 2 },
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 6. BOTTOM ACTION FOOTER (CRM THEME) */}
            <div className="flex items-center justify-end gap-3 pt-6 mt-8 border-t border-slate-200">
              <div className="flex items-center gap-3">
                {/* Cancel / Back Button */}
                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  onClick={() => setViewMode("list")}
                >
                  Cancel
                </Button>

                {/* Share Dropdown Button */}

                <div className="dc-share-footer-container relative">
                  <Button
                    variant="secondary"
                    size="md"
                    type="button"
                    onClick={() =>
                      setShowShareFooterMenu(!showShareFooterMenu)
                    }
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
                            `Delivery Challan from YAA Mart\nChallan No: ${activeTab.formData.challanNo || activeTab.formData.referenceNo}\nCustomer: ${activeTab.formData.partyName}\nAmount: ₹${currentCalculations.finalAmount}`,
                          );
                          window.open(
                            `https://wa.me/?text=${text}`,
                            "_blank",
                          );
                        }}
                        className="w-full px-3 py-2 text-left font-bold text-slate-700 hover:bg-purple-50 hover:text-[#33077C] rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <span>Share via WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowShareFooterMenu(false);
                          const subject = encodeURIComponent(
                            `Delivery Challan ${activeTab.formData.challanNo || activeTab.formData.referenceNo}`,
                          );
                          const body = encodeURIComponent(
                            `Dear ${activeTab.formData.partyName},\n\nChallan amount: ₹${currentCalculations.finalAmount}`,
                          );
                          window.open(
                            `mailto:${activeTab.formData.customerEmail}?subject=${subject}&body=${body}`,
                            "_blank",
                          );
                        }}
                        className="w-full px-3 py-2 text-left font-bold text-slate-700 hover:bg-purple-50 hover:text-[#33077C] rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <span>Share via Email</span>
                      </button>
                    </div>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => handleSaveChallan(true)}
                  className="border-purple-200 text-[#33077C] bg-purple-50/50 hover:bg-purple-100/50"
                  icon={
                    isActionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#33077C]" />
                    ) : (
                      <ShoppingCart className="w-4 h-4" />
                    )
                  }
                >
                  Save & Convert to Sale
                </Button>

                {/* Save Button (CRM Primary Theme #33077C) */}
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  form="challan-form"
                  disabled={isActionLoading}
                  icon={
                    isActionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Check className="w-4 h-4 text-white stroke-[3]" />
                    )
                  }
                >
                  {isActionLoading
                    ? "Saving..."
                    : activeTab.editingChallan
                      ? "Update Challan"
                      : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Add Customer Modal */}
        <AddCustomerModal
          isOpen={isAddCustomerModalOpen}
          onClose={() => setIsAddCustomerModalOpen(false)}
          onCustomerCreated={(newCust) => {
            dispatch(baseApi.util.invalidateTags(['CommerceCustomer', 'Customer'] as any));
            handleSelectCustomer(newCust);
            loadMasterData();
          }}
        />

        {/* Add Item Modal */}
        <AddItemModal
          isOpen={isAddItemModalOpen}
          onClose={() => setIsAddItemModalOpen(false)}
          onProductCreated={(newProd) => {
            dispatch(baseApi.util.invalidateTags(['Product', 'InventoryStock'] as any));
            setLiveProducts((prev) => [newProd, ...prev]);
            loadMasterData();
            if (activeItemRowIndex !== null) {
              handleSelectProduct(activeItemRowIndex, newProd);
            }
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: LIST
  // =========================================================================
  return (
    <div className="space-y-5 pb-16 font-sans">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-[220px] flex-1">
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

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
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
          const trimmed = pendingSearch.trim();
          const isSame =
            appliedSearch === trimmed &&
            appliedPeriod === pendingPeriod &&
            appliedStatus === pendingStatus &&
            page === 1;

          setAppliedSearch(trimmed);
          setAppliedPeriod(pendingPeriod);
          setAppliedStatus(pendingStatus);
          setPage(1);

          if (isSame) {
            isFetchingChallansRef.current = false;
            fetchDeliveryChallans();
          }
        }}
        onReset={() => {
          const isSame =
            appliedSearch === '' &&
            pendingSearch === '' &&
            appliedPeriod === 'This Month' &&
            pendingPeriod === 'This Month' &&
            appliedStatus === 'ALL' &&
            pendingStatus === 'ALL' &&
            page === 1;

          setPendingSearch('');
          setAppliedSearch('');
          setPendingPeriod('This Month');
          setAppliedPeriod('This Month');
          setPendingStatus('ALL');
          setAppliedStatus('ALL');
          setPage(1);

          if (isSame) {
            isFetchingChallansRef.current = false;
            fetchDeliveryChallans();
          }
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              placeholder="Period : This Month"
              value={pendingPeriod}
              options={PERIOD_FILTER_OPTIONS}
              onChange={(val) => {
                setPendingPeriod(val);
              }}
            />
            <FilterDropdown
              placeholder="Status : All"
              value={pendingStatus}
              options={STATUS_FILTER_OPTIONS}
              onChange={(val) => {
                setPendingStatus(val);
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
              {/* Royal Purple Header with Standard Icons */}
              <CommonTableHead
                columns={[
                  { label: "DELIVERY CHALLAN NO.", align: "center", minWidth: "140px" },
                  { label: "CUSTOMER NAME", align: "left", minWidth: "180px" },
                  { label: "CREATED DATE & TIME", align: "left", minWidth: "150px" },
                  { label: "CONVERTED DATE & TIME", align: "left", minWidth: "150px" },
                  { label: "TOTAL AMOUNT", align: "right", minWidth: "120px" },
                  { label: "STATUS", align: "center", minWidth: "110px" },
                  { label: "ACTION", align: "center", minWidth: "190px" },
                ]}
              />

              {/* Table Rows */}
              <tbody className="divide-y divide-slate-200 text-slate-800 font-sans">
                {paginatedChallans.map((item) => {
                  const challanStages = getChallanStages(item);
                  const isActionOpen = activeDropdownId === item.id;
                  const createdDt = formatDateTime(item.createdAt);
                  const convertedAt = resolveDocumentConvertedAt('Challan', item);
                  const convertedDt = formatDateTime(convertedAt);
                  const resolvedCustomerCode =
                    (item as any).customerCode ||
                    liveCustomers.find(
                      (c) =>
                        (item.customerId && c.id === item.customerId) ||
                        (c.phone && item.customerPhone && c.phone === item.customerPhone) ||
                        (c.name && item.partyName && c.name.trim().toLowerCase() === item.partyName.trim().toLowerCase())
                    )?.customerCode ||
                    localCustomers.find(
                      (c) =>
                        (item.customerId && c.id === item.customerId) ||
                        (c.phone && item.customerPhone && c.phone === item.customerPhone) ||
                        (c.name && item.partyName && c.name.trim().toLowerCase() === item.partyName.trim().toLowerCase())
                    )?.customerCode ||
                    findDocumentLineage(item.challanNo)?.customerCode ||
                    '';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-50/30 transition-colors border-b border-slate-200 group"
                    >
                      {/* 1. CHALLAN NO. */}
                      <td className="py-3.5 px-3 font-bold text-slate-800 text-center border-r border-slate-200 whitespace-nowrap align-middle">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span>{item.challanNo || item.referenceNo}</span>
                          <DocumentLineageBadges docRef={item.challanNo} currentType="Challan" className="justify-center" />
                        </div>
                      </td>

                      {/* 2. PARTY */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap align-middle">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{item.partyName}</span>
                          {resolvedCustomerCode && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-[#33077C] border border-purple-200/80">
                              {resolvedCustomerCode}
                            </span>
                          )}
                        </div>
                        {item.customerPhone && (
                          <div className="text-[11px] text-slate-400 font-normal">{item.customerPhone}</div>
                        )}
                      </td>

                      {/* CREATED DATE & TIME */}
                      <td className="py-3.5 px-3 sm:px-4 font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap align-middle">
                        {createdDt ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">
                              {createdDt.date}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{createdDt.time}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* CONVERTED DATE & TIME */}
                      <td className="py-3.5 px-3 sm:px-4 font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap align-middle">
                        {convertedDt ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-emerald-800">
                              {convertedDt.date}
                            </span>
                            <span className="text-[11px] text-emerald-600 font-mono flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>{convertedDt.time}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* 5. TOTAL AMOUNT */}
                      <td className="py-3.5 px-3 text-right font-black text-slate-900 border-r border-slate-200 whitespace-nowrap align-middle">
                        ₹ {Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 6. STATUS */}
                      <td className="py-3.5 px-3 border-r border-slate-200 whitespace-nowrap text-center align-middle">
                        <div className="flex items-center justify-center">
                          {challanStages.isFullyConverted || item.status === 'Converted' || item.status === 'Delivered' ? (
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
                      <td className="py-3.5 px-4 text-center whitespace-nowrap min-w-[190px] w-48 align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* CONVERT TO SALE Button slot with fixed width */}
                          <div className="w-[104px] shrink-0 flex items-center justify-center">
                          {challanStages.isFullyConverted ? (
                            <button
                              type="button"
                              disabled
                              aria-disabled="true"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              title={`Delivery Challan has been converted (${item.convertedToInvoiceNo || 'Converted'})`}
                              className="text-xs sm:text-[13px] font-semibold text-emerald-700 bg-emerald-50/90 border border-emerald-200/90 px-2 py-1 rounded cursor-not-allowed select-none flex items-center justify-center gap-1 opacity-80"
                            >
                              <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                              <span>Converted</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={item.status === 'Cancelled' || isActionLoading}
                              onClick={() => handleConvertExistingToSale(item)}
                              className="text-xs sm:text-[13px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-transparent hover:bg-blue-50/60 flex items-center justify-center gap-1 px-1.5 py-1 rounded transition-colors cursor-pointer select-none disabled:opacity-40"
                              title="Convert to Sale Invoice"
                            >
                              <span>Convert</span>
                              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          )}

                          </div>

                          {/* Send / Share Popover Button */}
                          <DocumentSharePopover
                            id={item.id}
                            getShareData={() => formatDeliveryChallanShare(item)}
                            title="Share Delivery Challan"
                          />

                          {/* 3-Dots Actions Menu */}
                          <SaleActionDropdown
                            items={[
                              {
                                label: 'Convert to Sales Invoice',
                                variant: 'invoice',
                                disabled: challanStages.isFullyConverted,
                                onClick: () => handleConvertExistingToSale(item),
                              },
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
                                label: 'Download Challan',
                                variant: 'download',
                                onClick: () => handleDownloadChallan(item),
                              },
                              {
                                label: 'Delete / Cancel',
                                variant: 'delete',
                                onClick: () => handleOpenDeleteModal(item),
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
          pageSizeOptions={[5, 10, 20, 50]}
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

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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

            <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[560px] text-xs text-left">
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
            </div>

            <div className="flex justify-end pt-2">
              <div className="w-full sm:w-64 space-y-1.5 text-xs text-slate-600">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-200 text-xs">
              <div className="space-y-8">
                <p className="text-slate-500">Receiver's Signature &amp; Stamp:</p>
                <div className="border-b border-slate-300 w-full max-w-[12rem]"></div>
              </div>
              <div className="sm:text-right space-y-8">
                <p className="text-slate-500">For Yaa Creations (Authorized Signatory):</p>
                <div className="border-b border-slate-300 w-full max-w-[12rem] sm:ml-auto"></div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-wrap justify-end gap-2">
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
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Challan</span>
              </button>
              <button
                type="button"
                disabled={isDownloadingPdf}
                onClick={() => handleDownloadChallan(previewChallan)}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Challan</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingChallan) {
            setIsDeleteModalOpen(false);
            setDeleteTargetChallan(null);
            setDeleteChallanError(null);
          }
        }}
        onConfirm={handleConfirmDeleteChallan}
        entityName="Delivery Challan"
        recordName={deleteTargetChallan?.challanNo}
        isLoading={isDeletingChallan}
        error={deleteChallanError}
      />
    </div>
  );
};
