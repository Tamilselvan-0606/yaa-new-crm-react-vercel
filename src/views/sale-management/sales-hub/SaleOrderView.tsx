import { useDebounce } from 'use-debounce';
import { CommonTableHead } from '../../../components/common/CommonTableHead';
import { CustomerSearchableSelect } from '../../../components/common/paginated-select';
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Printer,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  MoreVertical,
  X,
  Check,
  Share2,
  ChevronDown,
  ShoppingBag,
  ShoppingCart,
  Image as ImageIcon,
  FileEdit,
  AlignLeft,
  Paperclip,
  ArrowLeft,
  Loader2,
  Ban,
  Phone,
  PlusCircle,
  FileUp,
  Calendar,
  Truck,
} from "lucide-react";
import { AddCustomerModal } from "./AddCustomerModal";
import { AddItemModal } from "../inventory/AddItemModal";
import {
  useSalesManagementStore,
  SaleProductItem,
  SalesCustomer,
  SaleTransaction,
  InventoryStockItem,
} from "../../../store/useSalesManagementStore";
import { Button } from "../../../components/common/Button";
import { Modal } from "../../../components/common/Modal";
import { DeleteConfirmationModal } from "../../../components/common/DeleteConfirmationModal";
import { Pagination } from "../../../components/common/Pagination";
import { SearchBar } from "../../../components/common/SearchBar";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { SearchableSelect } from "../../../components/common/SearchableSelect";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCompanyDocumentProfile } from "../../../hooks/useCompanyDocumentProfile";
import { exportTableToExcel } from "../../../utils/excelExport";
import {
  printTableReport,
  downloadBusinessDocument,
  downloadTableReport,
  DocumentPrintOptions,
} from "../../../utils/printUtils";
import { FileSpreadsheet, Download } from "lucide-react";
import { SaleActionDropdown } from "../utils/SaleActionDropdown";
import { DocumentSharePopover, formatSaleOrderShare } from "../../../utils/shareUtils";
import { useAppDispatch } from "../../../hooks/redux";
import { baseApi } from "../../../api/baseApi";
import {
  commerceSaleOrderApi,
  mapApiSaleOrderToSaleOrderRecord,
  mapSaleOrderRecordToPayload,
  SaleOrderRecord,
  ExtendedSaleOrderItem,
  UUID_REGEX,
} from "../../../api/commerce/saleOrderApi";
import { customerApi } from "../../../api/commerce/customerApi";
import { productApi } from "../../../api/commerce/productApi";
import { ApiCustomer } from "../../../api/commerce/customerTypes";
import { ApiProduct } from "../../../api/commerce/productTypes";
import {
  stockApi,
  mapApiStockToInventoryStockItem,
  ApiStockBatch,
  unpackProducts,
  clientProductApi,
  mapApiCustomerToSalesCustomer,
} from "../../../api";
import {
  DeliveryChallanRecord,
  commerceDeliveryChallanApi,
  mapDeliveryChallanRecordToPayload,
} from "../../../api/commerce/deliveryChallanApi";
import {
  syncConvertedInvoiceToStorage,
  syncConvertedChallanToStorage,
  syncOrderStatusInStorage,
  recordDocumentConversion,
  findDocumentLineage,
  resolveDocumentConvertedAt,
  initializeWorkflowIntegrity,
  isMockChallan,
} from "../../../utils/salesDocumentWorkflow";
import { DocumentLineageBadges } from "../../../components/common/DocumentLineageBadges";
import {
  FormLabel,
  FORM_INPUT_CLS,
  getFormInputCls,
  handleNumberOnlyKeyDown,
  handleNonNegativeKeyDown,
} from "../utils/formUtils";
import { normalizeIndianPhoneTo10Digits } from "../../../utils/validation";
import { FormError } from "../../../components/common/FormError";
import {
  calculateLineItem,
  calculateDocumentTotals,
  determineGstType,
  parseTaxRate,
  round2,
} from "../../../utils/financialCalculations";

// Helper for dd/mm/yyyy <-> YYYY-MM-DD
const isoToDdmmyyyy = (iso?: string): string => {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
};

const ddmmyyyyToIso = (dmy?: string): string => {
  if (!dmy) return "";
  const parts = dmy.split("/");
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return dmy;
};

const formatDateTime = (
  dateStr?: string | null,
): { date: string; time: string; full: string } | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const hh = String(hours).padStart(2, "0");

  return {
    date: `${dd}/${mm}/${yyyy}`,
    time: `${hh}:${minutes} ${ampm}`,
    full: `${dd}/${mm}/${yyyy} ${hh}:${minutes} ${ampm}`,
  };
};

const getInitials = (name?: string, fallback: string = "PR"): string => {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return fallback;
};

const mapPeriodToApiPeriod = (periodLabel: string): string => {
  switch (periodLabel) {
    case "Today":
      return "today";
    case "This Week":
      return "this_week";
    case "This Month":
      return "this_month";
    case "Last 30 Days":
    case "Last Month":
      return "last_month";
    case "This Quarter":
      return "this_quarter";
    case "This Financial Year":
    case "This Year":
      return "this_year";
    case "All Time":
    default:
      return "all";
  }
};

const STATE_OPTIONS = [
  "Select State",
  "33-Tamil Nadu",
  "29-Karnataka",
  "27-Maharashtra",
  "32-Kerala",
  "36-Telangana",
  "37-Andhra Pradesh",
  "07-Delhi",
  "24-Gujarat",
  "19-West Bengal",
  "09-Uttar Pradesh",
  "08-Rajasthan",
  "03-Punjab",
  "23-Madhya Pradesh",
  "Other",
];

const UNIT_OPTIONS = [
  "NONE",
  "PCS",
  "KG",
  "BOX",
  "LTR",
  "BAG",
  "PACK",
  "DOZEN",
  "CARTON",
  "CAN",
  "SET",
  "QUINTAL",
  "MTR",
];

const TAX_RATE_OPTIONS = [
  { label: "Select Tax", rate: 0 },
  { label: "Exempted (0%)", rate: 0 },
  { label: "GST @ 0%", rate: 0 },
  { label: "GST @ 0.1%", rate: 0.1 },
  { label: "GST @ 0.25%", rate: 0.25 },
  { label: "GST @ 1.5%", rate: 1.5 },
  { label: "GST @ 3%", rate: 3 },
  { label: "GST @ 5%", rate: 5 },
  { label: "GST @ 12%", rate: 12 },
  { label: "GST @ 18%", rate: 18 },
  { label: "GST @ 28%", rate: 28 },
  { label: "GST @ 40%", rate: 40 },
];

const PAYMENT_TYPES = [
  "Cash",
  "UPI / GPay / PhonePe",
  "Card",
  "Bank Transfer / NEFT",
  "Cheque",
  "Credit / Postdated",
];

const PERIOD_FILTER_OPTIONS = [
  { label: "This Month", value: "This Month" },
  { label: "Last 30 Days", value: "Last 30 Days" },
  { label: "This Quarter", value: "This Quarter" },
  { label: "This Financial Year", value: "This Financial Year" },
  { label: "All Time", value: "All Time" },
];

const STATUS_FILTER_OPTIONS = [
  { label: "All Statuses", value: "ALL" },
  { label: "Open", value: "Open", dotColor: "#f59e0b" },
  { label: "Converted", value: "Converted", dotColor: "#10b981" },
  { label: "Completed", value: "Completed", dotColor: "#3b82f6" },
  { label: "Cancelled", value: "Cancelled", dotColor: "#ef4444" },
];

export interface TableColumnSettings {
  showItemCategory: boolean;
  showItemCode: boolean;
  showHsnSac: boolean;
  showDescription: boolean;
  showDiscount: boolean;
}

export interface SaleOrderTabItem {
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
    orderNo: string;
    referenceNo: string;
    orderDate: string;
    dueDate: string;
    stateOfSupply: string;
    paymentType: string;
    items: ExtendedSaleOrderItem[];
    notes: string;
    terms: string;
  };
  editingOrder?: SaleOrderRecord | null;
  enableRoundOff?: boolean;
  manualRoundOff?: number | null;
  columnSettings?: TableColumnSettings;
}

interface SaleOrderViewProps {
  initialMode?: "list" | "form";
}

export const SaleOrderView: React.FC<SaleOrderViewProps> = ({
  initialMode = "list",
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

  // Live API States
  const [saleOrders, setSaleOrders] = useState<SaleOrderRecord[]>(() => {
    try {
      const saved = localStorage.getItem("yaa_crm_sale_orders");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [totalApiRecords, setTotalApiRecords] = useState(0);
  const [totalApiPages, setTotalApiPages] = useState(1);

  // Live Masters for Form Selection
  const [liveCustomers, setLiveCustomers] = useState<any[]>([]);
  const [liveProducts, setLiveProducts] = useState<ApiProduct[]>([]);
  const [liveStocks, setLiveStocks] = useState<InventoryStockItem[]>([]);
  const [liveBatches, setLiveBatches] = useState<ApiStockBatch[]>([]);

  const persistSaleOrders = (updated: SaleOrderRecord[]) => {
    setSaleOrders(updated);
    try {
      localStorage.setItem("yaa_crm_sale_orders", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save sale orders to local storage", e);
    }
  };

  // View Mode: 'list' vs 'form'
  const [viewMode, setViewMode] = useState<"list" | "form">(initialMode);

  useEffect(() => {
    setViewMode(initialMode);
  }, [initialMode]);

  // Search & Filters
  const [pendingSearch, setPendingSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [debouncedSearch] = useDebounce(pendingSearch, 400);

  // Auto-apply debounced search (min 2 chars or cleared to reset)
  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (trimmed === "" || trimmed.length >= 2) {
      setAppliedSearch(trimmed);
      setPage(1);
    }
  }, [debouncedSearch]);
  const [pendingPeriod, setPendingPeriod] = useState("This Month");
  const [appliedPeriod, setAppliedPeriod] = useState("This Month");
  const [pendingStatus, setPendingStatus] = useState("ALL");
  const [appliedStatus, setAppliedStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Dropdown states & Menu Positioning
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [historyOrder, setHistoryOrder] = useState<SaleOrderRecord | null>(
    null,
  );
  const [isBulkConvertModalOpen, setIsBulkConvertModalOpen] = useState(false);
  const [selectedBulkOrderIds, setSelectedBulkOrderIds] = useState<string[]>(
    [],
  );
  const [activeConvertDropdownId, setActiveConvertDropdownId] = useState<
    string | null
  >(null);
  const [convertDropdownPos, setConvertDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  // Preview Modal
  const [previewOrder, setPreviewOrder] = useState<SaleOrderRecord | null>(
    null,
  );

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetOrder, setDeleteTargetOrder] =
    useState<SaleOrderRecord | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [deleteOrderError, setDeleteOrderError] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".sale-order-action-dropdown-container") &&
        !target.closest(".sale-order-action-dropdown-menu") &&
        !target.closest(".order-convert-dropdown-container") &&
        !target.closest(".order-convert-dropdown-menu") &&
        !target.closest(".order-convert-btn")
      ) {
        setActiveDropdownId(null);
        setDropdownPos(null);
        setActiveConvertDropdownId(null);
        setConvertDropdownPos(null);
      }
    };
    const handleScroll = () => {
      setActiveDropdownId(null);
      setDropdownPos(null);
      setActiveConvertDropdownId(null);
      setConvertDropdownPos(null);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  // Column Customization
  const [columnSettings, setColumnSettings] = useState<TableColumnSettings>({
    showItemCategory: false,
    showItemCode: false,
    showHsnSac: false,
    showDescription: false,
    showDiscount: true,
  });
  const [showColumnCustomizePopover, setShowColumnCustomizePopover] =
    useState(false);
  const [showShareFooterMenu, setShowShareFooterMenu] = useState(false);

  // Tax mode
  const [priceTaxMode, setPriceTaxMode] = useState<"Without Tax" | "With Tax">(
    "Without Tax",
  );

  // Bottom action toggles
  const [showTermsSection, setShowTermsSection] = useState(true);
  const [showDescriptionSection, setShowDescriptionSection] = useState(false);
  const [showImageSection, setShowImageSection] = useState(false);
  const [showDocumentSection, setShowDocumentSection] = useState(false);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(
    null,
  );
  const [attachedDocName, setAttachedDocName] = useState<string | null>(null);

  // Round off
  const [enableRoundOff, setEnableRoundOff] = useState(true);
  const [manualRoundOff, setManualRoundOff] = useState<number | null>(null);

  // Customer Creation Modal
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);

  // Add Item / Product Modal & Searchable Product Dropdown
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [activeItemRowIndex, setActiveItemRowIndex] = useState<number | null>(
    null,
  );
  const [openProductDropdownRow, setOpenProductDropdownRow] = useState<
    number | null
  >(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
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
          sortOrder: "desc",
        });
        const raw = unpackProducts(res);
        if (raw.length > 0) prods = raw;
      } catch (err) {
        console.warn("Product load pagination_required:true error:", err);
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
          console.warn("Product load pagination_required:false error:", err2);
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
              unit: "PCS",
              category: cp.tagline || "General",
            }));
          }
        } catch (cErr) {
          console.warn("clientProductApi load fallback error:", cErr);
        }
      }

      // 4. Fourth attempt: fallback to stockApi
      if (prods.length === 0) {
        try {
          const sRes = await stockApi.getStocks({
            pagination_required: false,
            page_size: 100,
          });
          const rawStocks = unpackProducts(sRes);
          if (rawStocks.length > 0) {
            prods = rawStocks.map((s: any) => ({
              id: s.productId || s.id,
              productId: s.productId || s.id,
              productName: s.productName,
              productCode: s.sku,
              salePrice: s.unitPrice || 0,
              unit: s.unit || "PCS",
              category: s.category || "",
            }));
          }
        } catch (sErr) {
          console.warn("stockApi load fallback error:", sErr);
        }
      }

      // 5. Fifth attempt: fallback to local storage
      if (prods.length === 0) {
        try {
          const localSaved = localStorage.getItem("yaa_crm_inventory_stocks");
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              prods = parsed;
            }
          }
        } catch (locErr) {
          console.warn("localStorage stock load fallback error:", locErr);
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
      console.warn("Failed to search products in SaleOrderView:", err);
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
        !target.closest(".so-product-cell") &&
        !target.closest(".product-dropdown-popover")
      ) {
        setOpenProductDropdownRow(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load Customers, Stocks, and Batches master data on mount so list view and form view both have customer codes and stock items
  const hasLoadedMasterDataRef = useRef(false);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  const loadMasterData = useCallback(async () => {
    fetchLiveProducts();

    try {
      const custRes = await customerApi.getCustomers({
        pagination_required: false,
        page_size: 100,
      });
      const rawCust = unpackProducts(custRes);
      if (rawCust.length > 0) {
        const mapped = rawCust.map(mapApiCustomerToSalesCustomer);
        setLiveCustomers(mapped);
        setCustomersList(mapped);
      }
    } catch (e) {
      console.warn("Customer load error in SaleOrderView:", e);
    }

    try {
      const stockRes = await stockApi.getStocks({
        pagination_required: false,
        page_size: 100,
      });
      const rawStocks = unpackProducts(stockRes);
      if (rawStocks.length > 0) {
        const mapped = rawStocks.map(mapApiStockToInventoryStockItem);
        setLiveStocks(mapped);
        setStocksList(mapped);
      }
    } catch (e) {
      console.warn("Stock load error in SaleOrderView:", e);
    }

    try {
      const batchRes = await stockApi.getStockBatches({
        pagination_required: false,
        page_size: 100,
      });
      const rawBatches = unpackProducts(batchRes);
      if (rawBatches.length > 0) {
        setLiveBatches(rawBatches);
      }
    } catch (e) {
      console.warn("Batch load error in SaleOrderView:", e);
    }
  }, [fetchLiveProducts, setCustomersList, setStocksList]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Load products when entering form mode if not already loaded
  useEffect(() => {
    if (viewMode === "form") {
      if (!hasLoadedMasterDataRef.current || liveProducts.length === 0) {
        hasLoadedMasterDataRef.current = true;
        fetchLiveProducts();
      }
    }
  }, [viewMode, fetchLiveProducts, liveProducts.length]);

  // On-demand product search: calls products API
  const handleProductSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      fetchLiveProducts(trimmed);
    },
    [fetchLiveProducts],
  );

  // Fetch Sales Orders from Live API merged with local converted orders
  const isFetchingOrdersRef = useRef(false);
  const fetchSaleOrders = useCallback(async () => {
    if (isFetchingOrdersRef.current) return;
    isFetchingOrdersRef.current = true;
    setIsApiLoading(true);
    try {
      const apiPeriod = mapPeriodToApiPeriod(appliedPeriod);
      const apiStatus = appliedStatus === "ALL" ? undefined : appliedStatus;
      const res = await commerceSaleOrderApi.getOrders({
        page_no: page,
        page_size: pageSize,
        pagination_required: true,
        search: appliedSearch.trim() || undefined,
        status: apiStatus,
        period: apiPeriod,
        sortOrder: "desc",
      });

      if (res && Array.isArray(res.data)) {
        const records = res.data.map((item) =>
          mapApiSaleOrderToSaleOrderRecord(item),
        );

        const merged = records.map((ord) => {
          const lineage = findDocumentLineage(ord.orderNo);
          const isConverted =
            ord.status === "Converted" || Boolean(lineage?.invoiceNo);
          return {
            ...ord,
            status: isConverted ? ("Converted" as const) : ord.status,
            convertedToInvoiceNo:
              ord.convertedToInvoiceNo || lineage?.invoiceNo,
          };
        });

        persistSaleOrders(merged);
        setTotalApiRecords(res.pagination?.totalRecords ?? merged.length);
        setTotalApiPages(
          Math.max(
            1,
            Math.ceil(
              (res.pagination?.totalRecords ?? merged.length) / pageSize,
            ),
          ),
        );
        setIsApiConnected(true);
      }
    } catch (err: any) {
      console.warn(
        "Could not reach Commerce Orders API, running with offline cache:",
        err,
      );
      const rawLocal = localStorage.getItem("yaa_crm_sale_orders");
      const localList: SaleOrderRecord[] = rawLocal ? JSON.parse(rawLocal) : [];
      const updatedLocal = localList.map((ord) => {
        const lineage = findDocumentLineage(ord.orderNo);
        const isConverted =
          ord.status === "Converted" || Boolean(lineage?.invoiceNo);
        return {
          ...ord,
          status: isConverted ? ("Converted" as const) : ord.status,
          convertedToInvoiceNo: ord.convertedToInvoiceNo || lineage?.invoiceNo,
        };
      });
      persistSaleOrders(updatedLocal);
      setIsApiConnected(false);
    } finally {
      setIsApiLoading(false);
      isFetchingOrdersRef.current = false;
    }
  }, [page, pageSize, appliedSearch, appliedStatus, appliedPeriod]);

  useEffect(() => {
    fetchSaleOrders();
  }, [fetchSaleOrders]);

  // Listen for sidebar click navigation events to immediately re-fetch sale orders
  useEffect(() => {
    const handleSidebarNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ path: string; id: string }>;
      if (
        customEvent.detail?.path === "/sale-management/sales/sale-order" ||
        customEvent.detail?.id === "sale-order"
      ) {
        isFetchingOrdersRef.current = false;
        fetchSaleOrders();
      }
    };
    window.addEventListener("crm:sidebar-navigate", handleSidebarNavigate);
    return () => {
      window.removeEventListener("crm:sidebar-navigate", handleSidebarNavigate);
    };
  }, [fetchSaleOrders]);

  // Combined Customer List (Live API + Local Store)
  const allCustomers = useMemo(() => {
    if (liveCustomers.length > 0) {
      return liveCustomers.map((c) => ({
        id: c.id,
        customerCode: c.customerCode || "CUST",
        name: c.name,
        phone: c.phone || "",
        email: c.email || "",
        company: c.company || "",
        address: c.address || c.billingAddress || "",
        billingAddress: c.billingAddress || c.address || "",
        state: c.state || "",
        openingBalance: c.openingBalance || 0,
      }));
    }
    return localCustomers;
  }, [liveCustomers, localCustomers]);

  // Helper to extract batches for a product
  const getBatchesForProduct = useCallback(
    (productId: string, sku: string, name: string, explicitBatches?: any[]) => {
      if (Array.isArray(explicitBatches) && explicitBatches.length > 0) {
        return explicitBatches;
      }
      const matched = liveBatches.filter((b) => {
        const bPid = String(
          (b as any).productId || (b as any).product_id || "",
        );
        if (productId && bPid && bPid === productId) return true;
        if (sku && (b as any).sku && (b as any).sku === sku) return true;
        if (
          name &&
          (b as any).productName &&
          (b as any).productName.toLowerCase() === name.toLowerCase()
        )
          return true;
        return false;
      });
      return matched;
    },
    [liveBatches],
  );

  // Combined Products / Stock Items (Live API + Live Stocks + Local Store)
  const allStockItems = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Live Products from /commerce/products
    liveProducts.forEach((p) => {
      const pid = String(p.id || "");
      if (!pid) return;
      let tax = 5;
      if (typeof (p as any).taxPercent === "number") {
        tax = (p as any).taxPercent;
      } else if (p.taxRate) {
        const parsed = parseFloat(String(p.taxRate).replace(/[^0-9.]/g, ""));
        if (!isNaN(parsed)) tax = parsed;
      }
      const sku = p.productCode || (p as any).sku || "";
      const name = p.productName || (p as any).name || "Unnamed Product";
      const batches = getBatchesForProduct(
        pid,
        sku,
        name,
        (p as any).batches || (p as any).stockBatches,
      );
      map.set(pid, {
        id: pid,
        productId: pid,
        productName: name,
        sku: sku,
        unitPrice: Number(
          p.salePrice ??
            (p as any).sellingPrice ??
            (p as any).price ??
            (p as any).unitPrice ??
            0,
        ),
        unit: p.unit || "PCS",
        taxPercent: tax,
        hsnCode: p.hsnCode || "",
        category: p.category || "",
        imageUrl:
          (p as any).images?.[0] ||
          (p as any).image ||
          (p as any).imageUrl ||
          "",
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
          const parsed = parseFloat(
            String((s as any).taxRate).replace(/[^0-9.]/g, ""),
          );
          if (!isNaN(parsed)) tax = parsed;
        }
        map.set(pid, {
          id: pid,
          productId: pid,
          productName: name,
          sku: sku,
          unitPrice: Number(
            s.unitPrice ??
              (s as any).salePrice ??
              (s as any).sellingPrice ??
              (s as any).price ??
              0,
          ),
          unit: s.unit || "PCS",
          taxPercent: tax,
          hsnCode: (s as any).hsnCode || "",
          category: s.category || "",
          imageUrl:
            (s as any).images?.[0] ||
            (s as any).image ||
            (s as any).imageUrl ||
            "",
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
            productName: s.productName || (s as any).name || "Unnamed Product",
            sku: s.sku || (s as any).itemCode || "",
            unitPrice: Number(
              s.unitPrice ??
                (s as any).salePrice ??
                (s as any).sellingPrice ??
                (s as any).price ??
                0,
            ),
            unit: s.unit || "PCS",
            taxPercent: 5,
            hsnCode: (s as any).hsnCode || "",
            category: s.category || "",
            imageUrl:
              (s as any).images?.[0] ||
              (s as any).image ||
              (s as any).imageUrl ||
              "",
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
        ? `SKU: ${s.sku} • ₹${Number(s.unitPrice || 0).toLocaleString("en-IN")}`
        : `₹${Number(s.unitPrice || 0).toLocaleString("en-IN")}`,
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
        (p.category && p.category.toLowerCase().includes(q)),
    );
  }, [allStockItems, productSearchQuery]);

  // Handle select product from searchable popover
  const handleSelectProduct = (index: number, product: any) => {
    handleItemChange(index, "productId", product.productId || product.id);
    handleItemChange(index, "productName", product.productName);
    handleItemChange(index, "sku", product.sku || "");
    handleItemChange(index, "unit", product.unit || "PCS");
    handleItemChange(index, "category", product.category || "");
    handleItemChange(index, "hsnCode", product.hsnCode || "");
    handleItemChange(index, "unitPrice", Number(product.unitPrice || 0));
    handleItemChange(index, "taxPercent", Number(product.taxPercent || 0));
    setOpenProductDropdownRow(null);
  };

  // Auto-generate Order Number
  const generateNextOrderNo = () => {
    const year = new Date().getFullYear();
    const count = saleOrders.length + 1;
    return `SO-${year}-${String(count).padStart(4, "0")}`;
  };

  // Initial Form Data State
  const createEmptyFormData = (customNum = 1) => {
    return {
      customerId: "",
      partyName: "",
      customerPhone: "",
      customerEmail: "",
      customerCompany: "",
      billingAddress: "",
      orderNo: generateNextOrderNo(),
      referenceNo: String(customNum),
      orderDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      stateOfSupply: "33-Tamil Nadu",
      paymentType: "Credit",
      items: [
        {
          id: `so_item_${Date.now()}_1`,
          productId: "",
          productName: "",
          sku: "",
          quantity: 1,
          unit: "PCS",
          unitPrice: 0,
          discountPercent: 0,
          taxPercent: 0,
          total: 0,
        },
      ] as ExtendedSaleOrderItem[],
      notes: "",
      terms:
        "1. Goods will be dispatched as per schedule.\n2. Any discrepancy must be reported within 24 hours of delivery.\n3. Applicable taxes extra.",
    };
  };

  // Multiple Tabs System
  const [tabs, setTabs] = useState<SaleOrderTabItem[]>([
    {
      id: "tab-1",
      title: "Sale Order #1",
      num: 1,
      formData: createEmptyFormData(1),
      editingOrder: null,
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
  const [activeTabId, setActiveTabId] = useState<string>("tab-1");

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0];
  }, [tabs, activeTabId]);

  const updateActiveTabFormData = (
    updater: (prev: typeof activeTab.formData) => typeof activeTab.formData,
  ) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, formData: updater(t.formData) } : t,
      ),
    );
  };

  // Add Tab
  const handleAddNewTab = () => {
    const nextNum = tabs.length + 1;
    const newTabId = `tab-${Date.now()}`;
    const newTab: SaleOrderTabItem = {
      id: newTabId,
      title: `Sale Order #${nextNum}`,
      num: nextNum,
      formData: createEmptyFormData(nextNum),
      editingOrder: null,
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
      setViewMode("list");
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
        title: `Sale Order #${nextNum}`,
        num: nextNum,
        formData: newForm,
        editingOrder: null,
        enableRoundOff: true,
      },
    ]);
    setActiveTabId(`tab-${Date.now()}`);
    setViewMode("form");
  };

  // Open Edit Form
  const handleOpenEditForm = (order: SaleOrderRecord) => {
    loadMasterData();
    const editTabId = `tab-edit-${order.id}`;
    const newTab: SaleOrderTabItem = {
      id: editTabId,
      title: `Edit ${order.orderNo}`,
      num: 1,
      formData: {
        customerId: order.customerId,
        partyName: order.partyName,
        customerPhone: order.customerPhone || "",
        customerEmail: order.customerEmail || "",
        customerCompany: order.customerCompany || "",
        billingAddress: order.billingAddress || "",
        orderNo: order.orderNo,
        referenceNo: order.referenceNo || "1",
        orderDate: order.orderDate,
        dueDate: order.dueDate,
        stateOfSupply: order.stateOfSupply || "33-Tamil Nadu",
        paymentType: order.paymentType || "Credit",
        items:
          order.items.length > 0 ? order.items : createEmptyFormData().items,
        notes: order.notes || "",
        terms: order.terms || "",
      },
      editingOrder: order,
      enableRoundOff: order.roundOff !== undefined,
      manualRoundOff: order.roundOff || null,
    };
    setTabs([newTab]);
    setActiveTabId(editTabId);
    setAttachedImageName(order.attachedImageName || null);
    setAttachedDocName(order.attachedDocName || null);
    setViewMode("form");
  };

  // Select Customer from dropdown list
  const handleSelectCustomer = (customer: any) => {
    updateActiveTabFormData((prev) => ({
      ...prev,
      customerId: customer.id,
      partyName: customer.name,
      customerPhone: customer.phone || "",
      customerEmail: customer.email || "",
      customerCompany: customer.company || "",
      billingAddress: customer.billingAddress || customer.address || "",
      stateOfSupply: customer.state ? `${customer.state}` : prev.stateOfSupply,
    }));
    setPartySearchQuery(customer.name);
    setIsPartyDropdownOpen(false);
  };

  // Handle Items Table Changes
  const handleItemChange = (
    index: number,
    field: keyof ExtendedSaleOrderItem,
    value: any,
  ) => {
    updateActiveTabFormData((prev) => {
      const updatedItems = [...prev.items];
      const target = { ...updatedItems[index], [field]: value };

      if (field === "productId") {
        const foundStock = allStockItems.find(
          (s: any) =>
            s.productId === value ||
            s.id === value ||
            (s.productName &&
              s.productName.toLowerCase() === String(value).toLowerCase()) ||
            (s.sku && s.sku.toLowerCase() === String(value).toLowerCase()),
        );
        if (foundStock) {
          target.productId = (foundStock as any).productId || foundStock.id;
          target.productName = foundStock.productName;
          target.unitPrice = foundStock.unitPrice || 0;
          target.unit = foundStock.unit || "PCS";
          target.category = foundStock.category;
          target.sku = foundStock.sku;
          target.hsnCode = foundStock.hsnCode || (target as any).hsnCode || "";
          target.taxPercent = (foundStock as any).taxPercent ?? 5;
          if (target.unitPrice === 0) {
            toast.warning(
              `Product "${foundStock.productName}" has no default Sale Price configured.`,
            );
          }
        }
      }

      const rawDiscPct =
        field === "discountPercent" ? Number(value) : target.discountPercent;
      const rawDiscAmt =
        field === "discountAmount" ? Number(value) : target.discountAmount;

      const lineRes = calculateLineItem(
        {
          quantity: target.quantity,
          unitPrice: target.unitPrice,
          discountPercent: rawDiscPct,
          discountAmount: rawDiscAmt,
          taxPercent: target.taxPercent,
        },
        {
          withGst: true,
          gstType: determineGstType(prev.stateOfSupply),
        },
      );

      target.quantity = lineRes.quantity;
      target.unitPrice = lineRes.unitPrice;
      target.discountPercent = lineRes.discountPercent;
      target.discountAmount = lineRes.discountAmount;
      target.taxPercent = lineRes.taxPercent;
      target.taxAmount = lineRes.taxAmount;
      target.total = lineRes.lineTotal;

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
          id: `so_item_${Date.now()}_${prev.items.length + 1}`,
          productId: "",
          productName: "",
          sku: "",
          quantity: 1,
          unit: "PCS",
          unitPrice: 0,
          discountPercent: 0,
          taxPercent: 0,
          total: 0,
        },
      ],
    }));
  };

  const handleRemoveRow = (index: number) => {
    if (activeTab.formData.items.length <= 1) {
      toast.info("At least one item row is required.");
      return;
    }
    updateActiveTabFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  // Computed Totals for Current Form using Centralized Financial Engine
  const currentCalculations = useMemo(() => {
    const docTotals = calculateDocumentTotals({
      items: (activeTab.formData.items || []).map((it) => ({
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent,
        discountAmount: it.discountAmount,
        taxPercent: it.taxPercent,
      })),
      withGst: true,
      stateOfSupply: activeTab.formData.stateOfSupply,
      roundMode: enableRoundOff ? "auto" : "none",
      manualRoundOff: manualRoundOff,
    });

    return {
      totalQty: docTotals.totalQty,
      subtotalGross: docTotals.subtotal,
      totalDiscount: docTotals.totalDiscount,
      netTaxable: docTotals.taxableAmount,
      totalTax: docTotals.totalTax,
      roundOff: docTotals.roundOff,
      finalAmount: docTotals.grandTotal,
    };
  }, [
    activeTab.formData.items,
    activeTab.formData.stateOfSupply,
    enableRoundOff,
    manualRoundOff,
  ]);

  // Save / Update Sales Order (Live Backend Integration)
  const handleSaveSaleOrder = async (andConvert = false) => {
    const form = activeTab.formData;
    if (!form.partyName.trim()) {
      toast.error("Please select or enter a customer name");
      return;
    }
    const validItems = form.items.filter(
      (i) => i.productName.trim() || Number(i.unitPrice) > 0,
    );
    if (validItems.length === 0) {
      toast.error("Please enter at least one item with valid name and rate");
      return;
    }
    const hasInvalidQty = validItems.some(
      (it) => !it.quantity || it.quantity <= 0,
    );
    if (hasInvalidQty) {
      toast.error("All items must have a quantity greater than zero.");
      return;
    }
    const hasInvalidPrice = validItems.some(
      (it) => it.unitPrice !== undefined && it.unitPrice < 0,
    );
    if (hasInvalidPrice) {
      toast.error("Item rates cannot be negative.");
      return;
    }
    const hasInvalidDiscount = validItems.some(
      (it) =>
        (it.discountPercent !== undefined &&
          (it.discountPercent < 0 || it.discountPercent > 100)) ||
        (it.discountAmount !== undefined && it.discountAmount < 0),
    );
    if (hasInvalidDiscount) {
      toast.error(
        "Discounts cannot be negative and discount percentage cannot exceed 100%.",
      );
      return;
    }

    setIsActionLoading(true);
    try {
      // 1. Resolve customerId if valid UUID exists
      let resolvedCustomerId = form.customerId;
      if (!resolvedCustomerId || !UUID_REGEX.test(resolvedCustomerId)) {
        const matchedCust = liveCustomers.find(
          (c) => c.name.toLowerCase() === form.partyName.trim().toLowerCase(),
        );
        if (matchedCust && UUID_REGEX.test(matchedCust.id)) {
          resolvedCustomerId = matchedCust.id;
        } else {
          resolvedCustomerId = undefined;
        }
      }

      // 2. Resolve valid UUID productId for every item row
      const resolvedItems: ExtendedSaleOrderItem[] = [];
      for (const it of validItems) {
        let pId = it.productId;
        // Check if pId is not a valid UUID, search in allStockItems / liveProducts
        if (!pId || !UUID_REGEX.test(pId)) {
          const match = allStockItems.find(
            (p: any) =>
              (p.productId &&
                UUID_REGEX.test(p.productId) &&
                p.productName?.toLowerCase() ===
                  it.productName.trim().toLowerCase()) ||
              (p.id &&
                UUID_REGEX.test(p.id) &&
                p.productName?.toLowerCase() ===
                  it.productName.trim().toLowerCase()) ||
              (p.sku &&
                p.sku.toLowerCase() === it.productName.trim().toLowerCase()),
          );
          if (match) {
            pId =
              match.productId && UUID_REGEX.test(match.productId)
                ? match.productId
                : match.id;
          }
        }

        // If still not a valid UUID, attempt auto-creating the product via productApi
        if (!pId || !UUID_REGEX.test(pId)) {
          try {
            const createProdRes = await productApi.createProduct({
              itemType: "Product",
              productName: it.productName.trim() || "Custom Product",
              salePrice: Number(it.unitPrice) || 0,
              salePriceTaxType: "Excluded",
              unit: it.unit && it.unit !== "NONE" ? it.unit : "PCS",
              category: it.category || "General",
            });
            if (
              createProdRes.data?.id &&
              UUID_REGEX.test(createProdRes.data.id)
            ) {
              pId = createProdRes.data.id;
            }
          } catch (createErr) {
            console.warn("Auto-create product fallback notice:", createErr);
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
          productId: pId || "",
        });
      }

      const isEdit = !!(
        activeTab.editingOrder && UUID_REGEX.test(activeTab.editingOrder.id)
      );

      const orderPayloadRecord = {
        orderNo: form.orderNo,
        referenceNo: form.referenceNo,
        orderDate: form.orderDate,
        dueDate: form.dueDate,
        customerId: resolvedCustomerId,
        partyName: form.partyName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        customerCompany: form.customerCompany,
        billingAddress: form.billingAddress,
        stateOfSupply: form.stateOfSupply,
        paymentType: form.paymentType,
        items: resolvedItems,
        withGst: currentCalculations.totalTax > 0,
        gstType: form.stateOfSupply?.includes("Tamil Nadu")
          ? ("intra_state" as const)
          : ("inter_state" as const),
        roundOff: currentCalculations.roundOff,
        notes: form.notes,
        terms: form.terms,
        attachedImageName: attachedImageName || undefined,
        attachedDocName: attachedDocName || undefined,
      };

      const apiPayload = mapSaleOrderRecordToPayload(
        orderPayloadRecord,
        !isEdit,
      );

      let savedOrderId = activeTab.editingOrder?.id;
      let finalOrderNo = form.orderNo;

      if (isEdit && activeTab.editingOrder) {
        // Edit / Update existing order via PUT /commerce/orders/{id}
        const updateRes = await commerceSaleOrderApi.updateOrder(
          activeTab.editingOrder.id,
          apiPayload,
        );
        if (updateRes?.data) {
          finalOrderNo = updateRes.data.orderNo || finalOrderNo;
          savedOrderId = updateRes.data.id;
        }
        toast.success(`Sales Order ${finalOrderNo} updated successfully!`);
      } else {
        // Create new order via POST /commerce/orders
        const createRes = await commerceSaleOrderApi.createOrder(apiPayload);
        if (createRes?.data) {
          finalOrderNo = createRes.data.orderNo || finalOrderNo;
          savedOrderId = createRes.data.id;
        }
        toast.success(`Sales Order ${finalOrderNo} created successfully!`);
      }

      // If "Save & Convert to Sale" clicked
      if (andConvert) {
        navigate("/sale-management/sales/sale", {
          state: {
            convertFrom: {
              sourceType: "Order",
              sourceId: savedOrderId,
              sourceNo: finalOrderNo,
              customerId: form.customerId,
              customerName: form.partyName,
              customerCompany: form.customerCompany,
              customerPhone: form.customerPhone,
              customerEmail: form.customerEmail,
              billingAddress: form.billingAddress,
              shippingAddress: form.billingAddress,
              items: form.items,
              subtotal: currentCalculations.subtotalGross,
              withGst: currentCalculations.totalTax > 0,
              gstType: form.stateOfSupply?.includes("Tamil Nadu")
                ? ("intra_state" as const)
                : ("inter_state" as const),
              cgst:
                currentCalculations.totalTax > 0 &&
                form.stateOfSupply?.includes("Tamil Nadu")
                  ? currentCalculations.totalTax / 2
                  : 0,
              sgst:
                currentCalculations.totalTax > 0 &&
                form.stateOfSupply?.includes("Tamil Nadu")
                  ? currentCalculations.totalTax / 2
                  : 0,
              igst:
                currentCalculations.totalTax > 0 &&
                !form.stateOfSupply?.includes("Tamil Nadu")
                  ? currentCalculations.totalTax
                  : 0,
              discount: currentCalculations.totalDiscount || 0,
              totalDiscount: currentCalculations.totalDiscount || 0,
              taxAmount: currentCalculations.totalTax || 0,
              grandTotal: currentCalculations.finalAmount,
              paidAmount: 0,
              paymentMethod: (form.paymentType as any) || "Bank Transfer",
              paymentTerms: "15 Days",
              dueDate: form.dueDate,
              notes: `Converted from Sale Order ${finalOrderNo}`,
            },
          },
        });
        return;
      }

      // Refresh list from live API
      await fetchSaleOrders();
      setViewMode("list");
    } catch (err: any) {
      console.error("Save sale order failed:", err);
      const errMsg =
        err?.response?.data?.error?.message ||
        (Array.isArray(err?.response?.data?.error?.fields)
          ? err.response.data.error.fields
              .map((f: any) => `${f.path?.join(".") || "field"}: ${f.message}`)
              .join(", ")
          : null) ||
        err?.message ||
        "Failed to save sales order";
      toast.error(errMsg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Determine conversion status across all next stages
  const getOrderStages = (order: SaleOrderRecord) => {
    const orderNoClean = order.orderNo?.trim();
    const lineage = orderNoClean
      ? findDocumentLineage(orderNoClean, "Order")
      : undefined;

    const isInvoiceConverted = Boolean(
      lineage?.invoiceNo ||
      lineage?.invoiceId ||
      order.status === "Converted" ||
      (order.convertedToInvoiceNo &&
        order.convertedToInvoiceNo.startsWith("INV-")),
    );

    const isChallanConverted = Boolean(
      lineage?.challanNo ||
      lineage?.challanId ||
      (order.convertedToInvoiceNo &&
        (order.convertedToInvoiceNo.startsWith("DC-") ||
          order.convertedToInvoiceNo.startsWith("CHAL-"))),
    );

    const availableStages = [
      {
        type: "Challan" as const,
        label: "Delivery Challan",
        isConverted: isChallanConverted,
      },
      {
        type: "Invoice" as const,
        label: "Sale Invoice",
        isConverted: isInvoiceConverted,
      },
    ].filter((s) => !s.isConverted);

    const isFullyConverted = isInvoiceConverted || availableStages.length === 0;

    return {
      lineage,
      isInvoiceConverted,
      isChallanConverted,
      availableStages,
      availableCount: availableStages.length,
      isFullyConverted,
    };
  };

  // Convert to Sale Invoice from Table -> Opens New Sale Invoice page with calculations
  const handleConvertExistingToSale = async (order: SaleOrderRecord) => {
    const stages = getOrderStages(order);
    if (stages.isFullyConverted || stages.isInvoiceConverted) {
      toast.info(`Sale order ${order.orderNo} is already converted.`);
      return;
    }
    setActiveConvertDropdownId(null);
    setConvertDropdownPos(null);

    navigate("/sale-management/sales/sale", {
      state: {
        convertFrom: {
          sourceType: "Order",
          sourceId: order.id,
          sourceNo: order.orderNo,
          customerId: order.customerId,
          customerName: order.partyName,
          customerCompany: order.customerCompany,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          billingAddress: order.billingAddress,
          shippingAddress: order.shippingAddress || order.billingAddress,
          items: order.items,
          subtotal: order.subtotal,
          withGst: order.withGst,
          gstType: order.gstType,
          cgst: order.cgst,
          sgst: order.sgst,
          igst: order.igst,
          discount: order.discount || 0,
          totalDiscount: order.discount || 0,
          taxAmount: order.taxAmount || 0,
          grandTotal: order.amount,
          paidAmount: order.advanceAmount || 0,
          paymentMethod: (order.paymentType as any) || "Bank Transfer",
          paymentTerms: "15 Days",
          dueDate: order.dueDate,
          notes: `Converted from Sale Order ${order.orderNo}`,
        },
      },
    });
  };

  // Convert to Delivery Challan from Table
  const handleConvertExistingToChallan = async (order: SaleOrderRecord) => {
    try {
      setIsActionLoading(true);
      const currentLineage = findDocumentLineage(order.orderNo);
      const existingChallans: DeliveryChallanRecord[] = JSON.parse(
        localStorage.getItem("yaa_crm_delivery_challans") || "[]",
      ).filter((c: any) => !isMockChallan(c));
      let challanNo =
        currentLineage?.challanNo ||
        `DC-${new Date().getFullYear()}-${String(existingChallans.length + 1).padStart(4, "0")}`;

      if (UUID_REGEX.test(order.id)) {
        try {
          const res = await commerceSaleOrderApi.convertOrder(order.id, {
            targetType: "DeliveryChallan",
            dueDate: order.dueDate,
          });
          const apiChallanNo =
            res?.data?.convertedTo?.documentNo ||
            res?.data?.document?.challanNo;
          if (apiChallanNo) challanNo = apiChallanNo;
        } catch (apiErr) {
          console.warn("API convertOrder to challan notice:", apiErr);
        }
      }

      let resolvedCustomerId = order.customerId;
      if (!resolvedCustomerId || !UUID_REGEX.test(resolvedCustomerId)) {
        const found = liveCustomers.find(
          (c) =>
            c.id === order.customerId ||
            c.name.toLowerCase() === order.partyName.trim().toLowerCase(),
        );
        if (found && UUID_REGEX.test(found.id)) {
          resolvedCustomerId = found.id;
        } else if (
          liveCustomers.length > 0 &&
          UUID_REGEX.test(liveCustomers[0].id)
        ) {
          resolvedCustomerId = liveCustomers[0].id;
        }
      }

      const newChallan: DeliveryChallanRecord = {
        id: `dc_${Date.now()}`,
        challanNo,
        referenceNo: order.orderNo,
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: order.dueDate,
        customerId: resolvedCustomerId || order.customerId,
        partyName: order.partyName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        customerCompany: order.customerCompany,
        billingAddress: order.billingAddress,
        shippingAddress: order.shippingAddress || order.billingAddress,
        items: order.items,
        subtotal: order.subtotal,
        withGst: order.withGst,
        gstType: order.gstType,
        cgst: order.cgst,
        sgst: order.sgst,
        igst: order.igst,
        discount: order.discount || 0,
        taxAmount: order.taxAmount || 0,
        amount: order.amount,
        balance: order.balance,
        status: "Open",
        notes: `Converted from Sale Order ${order.orderNo}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Attempt persisting to backend Commerce Delivery Challan API
      if (
        resolvedCustomerId &&
        newChallan.items &&
        newChallan.items.length > 0
      ) {
        try {
          const payload = mapDeliveryChallanRecordToPayload(newChallan, true);
          payload.customerId = resolvedCustomerId;
          const createRes =
            await commerceDeliveryChallanApi.createChallan(payload);
          if (createRes?.data?.id) {
            newChallan.id = createRes.data.id;
          }
          if (createRes?.data?.challanNo) {
            newChallan.challanNo = createRes.data.challanNo;
            challanNo = createRes.data.challanNo;
          }
        } catch (createErr) {
          console.warn("API createChallan notice, saving locally:", createErr);
        }
      }

      syncConvertedChallanToStorage(newChallan);

      recordDocumentConversion({
        fromType: "Order",
        fromNo: order.orderNo,
        toType: "Challan",
        toNo: challanNo,
      });

      dispatch(
        baseApi.util.invalidateTags([
          { type: "SalesOrder", id: order.id },
          { type: "SalesOrder", id: "LIST" },
          { type: "DeliveryChallan", id: "LIST" },
        ]),
      );

      toast.success(
        `Sale Order ${order.orderNo} converted to Delivery Challan ${challanNo}!`,
      );
      await fetchSaleOrders();
    } catch (err: any) {
      console.error("Convert to challan error:", err);
      toast.error("Failed to convert to delivery challan");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Duplicate Sale Order
  const handleDuplicateOrder = (item: SaleOrderRecord) => {
    const nextNum = saleOrders.length + 1;
    const newOrderNo = `SO-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`;
    const duplicatedTab: SaleOrderTabItem = {
      id: `tab-dup-${Date.now()}`,
      title: `Copy ${item.orderNo}`,
      num: nextNum,
      formData: {
        customerId: item.customerId,
        partyName: item.partyName,
        customerPhone: item.customerPhone || "",
        customerEmail: item.customerEmail || "",
        customerCompany: item.customerCompany || "",
        billingAddress: item.billingAddress || "",
        orderNo: newOrderNo,
        referenceNo: String(nextNum),
        orderDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 14 * 86400000)
          .toISOString()
          .split("T")[0],
        stateOfSupply: item.stateOfSupply || "33-Tamil Nadu",
        paymentType: item.paymentType || "Credit",
        items: item.items.length > 0 ? item.items : createEmptyFormData().items,
        notes: item.notes || "",
        terms: item.terms || "",
      },
      editingOrder: null,
      enableRoundOff: item.roundOff !== undefined,
      manualRoundOff: item.roundOff || null,
    };
    setTabs([duplicatedTab]);
    setActiveTabId(duplicatedTab.id);
    setViewMode("form");
    toast.success(`Duplicated ${item.orderNo} into edit form.`);
  };

  // Bulk Convert Handler (POST /commerce/orders/bulk-convert)
  const handleBulkConvertToSale = async () => {
    const openOrdersToConvert = saleOrders.filter(
      (o) => selectedBulkOrderIds.includes(o.id) && o.status === "Open",
    );
    if (openOrdersToConvert.length === 0) {
      toast.error("Please select at least one open sale order to convert");
      return;
    }

    try {
      setIsActionLoading(true);
      const uuidOrders = openOrdersToConvert
        .filter((o) => UUID_REGEX.test(o.id))
        .map((o) => o.id);

      if (uuidOrders.length > 0) {
        try {
          const res = await commerceSaleOrderApi.bulkConvertOrders({
            orderIds: uuidOrders,
          });
          const convertedCount =
            res?.data?.converted?.length || uuidOrders.length;
          toast.success(
            `Successfully converted ${convertedCount} Sale Orders to Sale Invoices!`,
          );
        } catch (apiErr) {
          console.warn("API bulkConvertOrders warning:", apiErr);
        }
      } else {
        toast.success(
          `Converted ${openOrdersToConvert.length} Sale Orders to Sale Invoices!`,
        );
      }

      const convertedOrderMap = new Map<string, string>();

      openOrdersToConvert.forEach((order, idx) => {
        const currentLineage = findDocumentLineage(order.orderNo);
        const invNo =
          currentLineage?.invoiceNo ||
          `INV-${new Date().getFullYear()}-${String(200 + saleOrders.length + 1 + idx).padStart(4, "0")}`;

        convertedOrderMap.set(order.id, invNo);
        convertedOrderMap.set(order.orderNo, invNo);

        const newSale: SaleTransaction = {
          id: `sale_${Date.now()}_${idx}`,
          invoiceNo: invNo,
          referenceNo: order.orderNo,
          saleDate: new Date().toISOString().split("T")[0],
          dueDate: order.dueDate,
          customerId: order.customerId,
          customerName: order.partyName,
          customerCompany: order.customerCompany,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          billingAddress: order.billingAddress,
          shippingAddress: order.shippingAddress || order.billingAddress,
          items: order.items,
          subtotal: order.subtotal,
          withGst: order.withGst,
          gstType: order.gstType,
          cgst: order.cgst,
          sgst: order.sgst,
          igst: order.igst,
          totalDiscount: order.discount || 0,
          totalTax: order.taxAmount || 0,
          shippingCharges: 0,
          otherCharges: 0,
          grandTotal: order.amount,
          paidAmount: order.advanceAmount || 0,
          balance: order.balance,
          paymentMethod: (order.paymentType as any) || "Credit",
          paymentTerms: "15 Days",
          paymentStatus:
            order.balance <= 0
              ? "Paid"
              : (order.advanceAmount || 0) > 0
                ? "Partial"
                : "Unpaid",
          saleStatus: "Confirmed",
          createdBy: "Sales Representative",
          salesperson: "Sales Rep",
          notes: `Bulk converted from Sale Order ${order.orderNo}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        saveSale(newSale);
        syncConvertedInvoiceToStorage(newSale);

        recordDocumentConversion({
          fromType: "Order",
          fromNo: order.orderNo,
          toType: "Invoice",
          toNo: invNo,
        });

        syncOrderStatusInStorage(order.orderNo, "Converted", invNo);
      });

      const updated = saleOrders.map((o) => {
        const invNo =
          convertedOrderMap.get(o.id) || convertedOrderMap.get(o.orderNo);
        if (invNo) {
          return {
            ...o,
            status: "Converted" as const,
            convertedToInvoiceNo: invNo,
            convertedAt: new Date().toISOString(),
          };
        }
        return o;
      });
      persistSaleOrders(updated);

      dispatch(
        baseApi.util.invalidateTags([
          { type: "SalesOrder", id: "LIST" },
          { type: "SalesInvoice", id: "LIST" },
        ]),
      );

      setIsBulkConvertModalOpen(false);
      setSelectedBulkOrderIds([]);
      await fetchSaleOrders();
    } catch (err: any) {
      console.error("Bulk convert failed:", err);
      toast.error(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Bulk convert failed",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const mapSaleOrderToDocumentPrintOptions = (
    order: SaleOrderRecord,
  ): DocumentPrintOptions => ({
    docTypeTitle: "SALE ORDER",
    docNo: order.orderNo,
    docDate: isoToDdmmyyyy(order.orderDate),
    dueDate: order.dueDate ? isoToDdmmyyyy(order.dueDate) : undefined,
    status: order.status,
    statusColor:
      order.status === "Converted" || order.status === "Completed"
        ? "emerald"
        : order.status === "Open"
          ? "amber"
          : order.status === "Cancelled"
            ? "rose"
            : "purple",
    referenceNo: order.referenceNo,
    companyName: companyProfile.companyName || "YAA CREATIONS CRM",
    companySubtitle:
      companyProfile.companySubtitle || "Commerce & Enterprise Sales Hub",
    companyAddress:
      companyProfile.companyAddress ||
      "128 Commercial Boulevard, Tech Park, Chennai - 600001, Tamil Nadu",
    companyGstin: companyProfile.companyGstin || "33AAAAA0000A1Z5",
    companyPhone: companyProfile.companyPhone || "+91 98400 12345",
    companyEmail: companyProfile.companyEmail || "orders@yaacreations.com",
    partyTitle: "Bill To (Customer Details)",
    partyName: order.partyName,
    partyCompany: order.customerCompany,
    partyPhone: order.customerPhone,
    partyAddress: order.billingAddress,
    extraMeta: [
      { label: "Payment Type", value: order.paymentType || "Credit" },
      { label: "State of Supply", value: order.stateOfSupply || "Tamil Nadu" },
      ...(order.convertedToInvoiceNo
        ? [{ label: "Converted Invoice", value: order.convertedToInvoiceNo }]
        : []),
    ],
    items: (order.items || []).map((it) => ({
      name: it.productName,
      sku: it.sku,
      batch: it.batch,
      unit: it.unit,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      taxPercent: it.taxPercent,
      total: it.total,
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    tax: {
      withGst: true,
      taxAmount: order.taxAmount,
    },
    roundOff: order.roundOff,
    grandTotal: order.amount,
    terms: order.terms,
    primarySignatoryLabel: "Authorized Signatory",
  });

  const handleDownloadSaleOrder = async (order: SaleOrderRecord) => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const toastId = `dl-so-${order.id}`;
    toast.loading(`Preparing PDF for Sale Order ${order.orderNo}...`, {
      id: toastId,
    });
    try {
      const options = mapSaleOrderToDocumentPrintOptions(order);
      await downloadBusinessDocument(
        options,
        `SaleOrder_${order.orderNo.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
      );
      toast.success(`Sale Order ${order.orderNo} downloaded successfully!`, {
        id: toastId,
      });
    } catch (err: any) {
      console.error("Sale order download error:", err);
      toast.error("Failed to download sale order PDF.", { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Print Sale Order Document
  const handlePrintOrder = (order: SaleOrderRecord) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Unable to open print preview. Please allow popups.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sale Order - ${order.orderNo}</title>
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
              <div class="brand-name">${companyProfile.companyName || "YAA CREATIONS CRM"}</div>
              <div style="color: #64748b; font-size: 12px; margin-top: 2px;">${companyProfile.companySubtitle || "Commerce & Enterprise Sales Hub"}</div>
              <div style="color: #475569; font-size: 11px;">GSTIN: ${companyProfile.companyGstin || "33AAAAA0000A1Z5"} • Phone: ${companyProfile.companyPhone || "+91 98400 12345"}</div>
            </div>
            <div>
              <div class="doc-title">SALE ORDER</div>
              <div style="font-size: 12px; color: #64748b; text-align: right; margin-top: 4px;">
                Order #: <strong>${order.orderNo}</strong> (Ref: ${order.referenceNo || "1"})
              </div>
              <div style="text-align: right; margin-top: 4px;">
                <span class="badge">${order.status.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="meta-box">
              <div class="meta-title">Bill To (Customer Details)</div>
              <div class="meta-text">${order.partyName}</div>
              ${order.customerCompany ? `<div style="font-size: 12px; color: #475569;">${order.customerCompany}</div>` : ""}
              ${order.customerPhone ? `<div style="font-size: 12px; color: #475569;">Phone: ${order.customerPhone}</div>` : ""}
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${order.billingAddress}</div>
            </div>
            <div class="meta-box">
              <div class="meta-title">Order Summary</div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Order Date:</span>
                <strong>${isoToDdmmyyyy(order.orderDate)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Delivery Due Date:</span>
                <strong>${isoToDdmmyyyy(order.dueDate)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Payment Mode:</span>
                <strong>${order.paymentType || "Credit"}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Order Status:</span>
                <strong>${order.status}</strong>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 40px;">#</th>
                <th>Item Description</th>
                <th class="text-center" style="width: 100px;">Batch No</th>
                <th class="text-center" style="width: 70px;">Qty</th>
                <th class="text-right" style="width: 100px;">Rate (₹)</th>
                <th class="text-right" style="width: 80px;">GST %</th>
                <th class="text-right" style="width: 110px;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${order.items
                .map(
                  (item, idx) => `
                <tr>
                  <td class="text-center font-bold">${idx + 1}</td>
                  <td>
                    <strong>${item.productName}</strong>
                    ${item.sku ? `<div style="font-size: 10.5px; color: #64748b;">SKU: ${item.sku}</div>` : ""}
                  </td>
                  <td class="text-center" style="font-family: monospace; font-weight: 700; color: #33077C;">${item.batch || "—"}</td>
                  <td class="text-center">${item.quantity} ${item.unit || ""}</td>
                  <td class="text-right">₹${Number(item.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td class="text-right">${item.taxPercent || 0}%</td>
                  <td class="text-right font-bold">₹${Number(item.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="total-section">
            <table class="total-table">
              <tr>
                <td style="color: #64748b;">Subtotal:</td>
                <td class="text-right font-semibold">₹${Number(order.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>
              ${
                order.taxAmount
                  ? `
                <tr>
                  <td style="color: #64748b;">GST Tax:</td>
                  <td class="text-right font-semibold">₹${Number(order.taxAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              `
                  : ""
              }
              <tr>
                <td class="grand-total">Total Amount:</td>
                <td class="text-right grand-total">₹${Number(order.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <div>
              <div style="font-size: 11px; color: #94a3b8;">This is a computer-generated sale order document.</div>
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

  // Delete / Cancel Sale Order (DELETE /commerce/orders/{id}) with confirmation modal
  const handleOpenDeleteModal = (order: SaleOrderRecord) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setDeleteTargetOrder(order);
    setDeleteOrderError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteOrder = async () => {
    if (!deleteTargetOrder) return;
    setIsDeletingOrder(true);
    setDeleteOrderError(null);
    try {
      if (UUID_REGEX.test(deleteTargetOrder.id)) {
        await commerceSaleOrderApi.deleteOrder(deleteTargetOrder.id);
      }
      const updated = saleOrders.filter((o) => o.id !== deleteTargetOrder.id);
      persistSaleOrders(updated);
      toast.success(
        `Sale order "${deleteTargetOrder.orderNo}" removed successfully.`,
      );
      setIsDeleteModalOpen(false);
      setDeleteTargetOrder(null);
      await fetchSaleOrders();
    } catch (err: any) {
      console.error("Delete order failed:", err);
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Failed to delete sale order";
      setDeleteOrderError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Cancel Sale Order Status (PATCH /commerce/orders/{id}/status)
  const handleCancelOrder = async (order: SaleOrderRecord) => {
    try {
      setIsActionLoading(true);
      if (UUID_REGEX.test(order.id)) {
        await commerceSaleOrderApi.updateStatus(order.id, "Cancelled");
      } else {
        const updated = saleOrders.map((o) =>
          o.id === order.id ? { ...o, status: "Cancelled" as const } : o,
        );
        persistSaleOrders(updated);
      }
      toast.success(`Sale Order ${order.orderNo} marked as Cancelled.`);
      await fetchSaleOrders();
    } catch (err: any) {
      console.error("Cancel order failed:", err);
      toast.error(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to cancel sale order",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    let totalVal = 0;
    let convertedVal = 0;
    let openVal = 0;

    saleOrders.forEach((o) => {
      totalVal += o.amount;
      if (o.status === "Converted" || o.status === "Completed") {
        convertedVal += o.amount;
      } else if (o.status === "Open") {
        openVal += o.amount;
      }
    });

    return {
      totalVal,
      convertedVal,
      openVal,
      totalCount: totalApiRecords > 0 ? totalApiRecords : saleOrders.length,
    };
  }, [saleOrders, totalApiRecords]);

  // Client Filtered List (when running locally or with cached results)
  const filteredOrders = useMemo(() => {
    return saleOrders.filter((o) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.orderNo.toLowerCase().includes(q) ||
        o.partyName.toLowerCase().includes(q) ||
        (o.referenceNo && o.referenceNo.toLowerCase().includes(q)) ||
        (o.customerPhone && o.customerPhone.toLowerCase().includes(q));

      const matchesStatus =
        appliedStatus === "ALL" || o.status === appliedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [saleOrders, appliedSearch, appliedStatus]);

  const totalPages =
    totalApiPages || Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedOrders = useMemo(() => {
    // If backend already paginated, use filteredOrders directly, else slice locally
    if (totalApiRecords > 0 && filteredOrders.length <= pageSize) {
      return filteredOrders;
    }
    const start = (safePage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, safePage, pageSize, totalApiRecords]);

  // Filtered Customers for Party Picker Popup
  const filteredCustomerOptions = useMemo(() => {
    const q = partySearchQuery.toLowerCase().trim();
    if (!q) return allCustomers.slice(0, 10);
    return allCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)),
    );
  }, [allCustomers, partySearchQuery]);

  // Close party dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        partyDropdownRef.current &&
        !partyDropdownRef.current.contains(e.target as Node)
      ) {
        setIsPartyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // =========================================================================
  // VIEW MODE: FORM (The exact screen matching royal theme)
  // =========================================================================
  if (viewMode === "form") {
    return (
      <div className="min-h-screen bg-slate-50/70 pb-20 -m-3 sm:-m-6 p-3 sm:p-6 flex flex-col font-sans animate-in fade-in duration-150">
        {/* 1. TOP TAB BAR */}
        <div className="flex items-center justify-between border-b border-slate-200/90 pb-2 mb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group relative flex items-center gap-2.5 px-4 py-2 rounded-t-xl text-xs font-semibold cursor-pointer transition-all border ${
                    isActive
                      ? "bg-white text-[#33077C] border-slate-200 border-b-white shadow-xs font-bold ring-1 ring-[#33077C]/10"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 border-transparent"
                  }`}
                >
                  <span className="truncate max-w-[150px]">{tab.title}</span>
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="text-slate-400 hover:text-rose-600 rounded p-0.5 transition-colors cursor-pointer"
                    title="Close tab"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Plus Tab Button */}
            <button
              type="button"
              onClick={handleAddNewTab}
              className="w-7 h-7 rounded-full bg-[#33077C] hover:bg-[#4309A2] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer ml-1"
              title="Add New Sale Order Tab"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* 2. FORM HEADER / TITLE */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Sale Order
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                {activeTab.editingOrder ? (
                  <>
                    <span>Edit Sale Order</span>
                    <span className="font-extrabold text-[#33077C] font-mono text-xs sm:text-[13px] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/80 shadow-2xs">
                      {activeTab.editingOrder.orderNo}
                    </span>
                  </>
                ) : activeTab.formData.orderNo ? (
                  <>
                    <span>New Sale Order</span>
                    <span className="font-extrabold text-[#33077C] font-mono text-xs sm:text-[13px] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/80 shadow-2xs">
                      {activeTab.formData.orderNo}
                    </span>
                  </>
                ) : (
                  "Create advance sale orders and reserve inventory for scheduled fulfillment"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 3. MAIN FORM CONTAINER */}
        <form
          id="sale-order-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveSaleOrder(false);
          }}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6 flex-1 flex flex-col justify-between mb-6"
        >
          <div>
            {/* Top Meta Details (Party + Ref/Date/State) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-6 border-b border-slate-100">
              {/* Left Column: Customer Selection */}
              <div
                className="lg:col-span-6 xl:col-span-5"
                ref={partyDropdownRef}
              >
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

                

                {/* Party Details Preview Pill */}
                {activeTab.formData.partyName && (
                  <div className="mt-2.5 px-3 py-2 bg-purple-50/40 rounded-xl border border-purple-200/60 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {activeTab.formData.customerPhone && (
                      <div>
                        <span className="font-bold text-slate-700">Phone:</span>{" "}
                        {activeTab.formData.customerPhone}
                      </div>
                    )}
                    {activeTab.formData.billingAddress && (
                      <div>
                        <span className="font-bold text-slate-700">
                          Address:
                        </span>{" "}
                        {activeTab.formData.billingAddress}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Order Date, State of supply */}
              <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-end gap-3 text-xs">
                {/* Order Date */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <span className="font-medium text-slate-600 w-24 sm:w-auto text-right">
                    Order Date
                  </span>
                  <div className="relative w-40 sm:w-48">
                    <input
                      type="date"
                      value={activeTab.formData.orderDate}
                      onChange={(e) =>
                        updateActiveTabFormData((prev) => ({
                          ...prev,
                          orderDate: e.target.value,
                        }))
                      }
                      className="w-full h-9 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* State of Supply */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <span className="font-medium text-slate-600 w-24 sm:w-auto text-right">
                    State of supply
                  </span>
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
                    <th className="py-2.5 px-2.5 text-center border-r border-[#4309A2]/70 w-10 text-white/80 font-extrabold">
                      +
                    </th>
                    <th className="py-2.5 px-3 text-left border-r border-[#4309A2]/70 min-w-[200px] text-white">
                      ITEM
                    </th>
                    {columnSettings.showItemCategory && (
                      <th className="py-2.5 px-2.5 text-left border-r border-[#4309A2]/70 min-w-[130px] text-white">
                        ITEM CATEGORY
                      </th>
                    )}
                    {columnSettings.showItemCode && (
                      <th className="py-2.5 px-2.5 text-left border-r border-[#4309A2]/70 w-28 text-white">
                        ITEM CODE
                      </th>
                    )}
                    {columnSettings.showHsnSac && (
                      <th className="py-2.5 px-2.5 text-left border-r border-[#4309A2]/70 w-28 text-white">
                        HSN/SAC CODE
                      </th>
                    )}
                    {columnSettings.showDescription && (
                      <th className="py-2.5 px-2.5 text-left border-r border-[#4309A2]/70 min-w-[160px] text-white">
                        DESCRIPTION
                      </th>
                    )}
                    <th className="py-2.5 px-2 text-center border-r border-[#4309A2]/70 min-w-[120px] text-white">
                      BATCH NO
                    </th>
                    <th className="py-2.5 px-2 text-center border-r border-[#4309A2]/70 w-20 text-white">
                      QTY
                    </th>
                    <th className="py-2.5 px-2 text-center border-r border-[#4309A2]/70 w-24 text-white">
                      UNIT
                    </th>
                    <th className="py-2.5 px-3 text-right border-r border-[#4309A2]/70 w-36 text-white">
                      <div>PRICE/UNIT</div>
                      <div className="text-[9.5px] text-purple-200 font-normal lowercase">
                        ({priceTaxMode.toLowerCase()})
                      </div>
                    </th>
                    {columnSettings.showDiscount && (
                      <th
                        colSpan={2}
                        className="py-2 px-2 text-center border-r border-[#4309A2]/70 text-white"
                      >
                        <div className="text-[10px]">DISCOUNT</div>
                        <div className="grid grid-cols-2 text-[9.5px] text-purple-200 font-semibold mt-0.5 border-t border-[#4309A2]/70 pt-1">
                          <span>%</span>
                          <span className="text-right pr-1">AMOUNT</span>
                        </div>
                      </th>
                    )}
                    <th
                      colSpan={2}
                      className="py-2 px-2 text-center border-r border-[#4309A2]/70 text-white"
                    >
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
                            setShowColumnCustomizePopover(
                              !showColumnCustomizePopover,
                            );
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
                                  setColumnSettings((prev) => ({
                                    ...prev,
                                    showItemCategory: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">
                                Item Category
                              </span>
                            </label>

                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer text-slate-700 select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={columnSettings.showItemCode}
                                onChange={(e) =>
                                  setColumnSettings((prev) => ({
                                    ...prev,
                                    showItemCode: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">
                                Item Code
                              </span>
                            </label>

                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer text-slate-700 select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={columnSettings.showHsnSac}
                                onChange={(e) =>
                                  setColumnSettings((prev) => ({
                                    ...prev,
                                    showHsnSac: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">
                                HSN/SAC Code
                              </span>
                            </label>

                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer text-slate-700 select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={columnSettings.showDescription}
                                onChange={(e) =>
                                  setColumnSettings((prev) => ({
                                    ...prev,
                                    showDescription: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">
                                Description
                              </span>
                            </label>

                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-purple-50/60 cursor-pointer text-slate-700 select-none transition-colors">
                              <input
                                type="checkbox"
                                checked={columnSettings.showDiscount}
                                onChange={(e) =>
                                  setColumnSettings((prev) => ({
                                    ...prev,
                                    showDiscount: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-[#33077C] focus:ring-[#33077C] accent-[#33077C] cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-slate-700">
                                Discount
                              </span>
                            </label>
                          </div>
                        </div>
                      )}
                    </th>
                    <th className="py-2.5 px-2 text-center w-10 text-slate-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {activeTab.formData.items.map((rowItem, idx) => (
                    <tr
                      key={rowItem.id || idx}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="so-product-cell py-2.5 px-3 min-w-[200px] relative">
                        <div className="relative">
                          <div
                            onClick={() => {
                              if (openProductDropdownRow === idx) {
                                setOpenProductDropdownRow(null);
                              } else {
                                setOpenProductDropdownRow(idx);
                                setProductSearchQuery(
                                  rowItem.productName || "",
                                );
                                if (liveProducts.length === 0) {
                                  fetchLiveProducts();
                                }
                              }
                            }}
                            className={`w-full h-9 px-3 bg-white border rounded-xl flex items-center justify-between text-xs font-semibold cursor-pointer transition-all ${
                              openProductDropdownRow === idx
                                ? "border-[#4309A2] ring-2 ring-[#4309A2]/10"
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
                                setProductSearchQuery(
                                  rowItem.productName || "",
                                );
                                if (liveProducts.length === 0) {
                                  fetchLiveProducts();
                                }
                              }}
                              onFocus={() => {
                                setOpenProductDropdownRow(idx);
                                setProductSearchQuery(
                                  rowItem.productName || "",
                                );
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
                                  productSearchTimerRef.current = setTimeout(
                                    () => {
                                      fetchLiveProducts(val.trim());
                                    },
                                    300,
                                  );
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
                                    setProductSearchQuery(
                                      rowItem.productName || "",
                                    );
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

                          {/* Searchable Dropdown Popover */}
                          {openProductDropdownRow === idx && (
                            <div
                              ref={productDropdownRef}
                              className="product-dropdown-popover absolute left-0 top-full mt-1.5 w-80 sm:w-96 max-w-[90vw] bg-white rounded-2xl shadow-2xl shadow-purple-900/15 border border-purple-100 z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-100 overflow-hidden text-left"
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
                                        clearTimeout(
                                          productSearchTimerRef.current,
                                        );
                                      }
                                      if (val.trim().length >= 1) {
                                        productSearchTimerRef.current =
                                          setTimeout(() => {
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
                                      onClick={() => setProductSearchQuery("")}
                                      className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* 1. Add New Product Button */}
                              <div className="pb-1.5 mb-1 border-b border-slate-100">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveItemRowIndex(idx);
                                    setOpenProductDropdownRow(null);
                                    setIsAddItemModalOpen(true);
                                  }}
                                  className="w-full py-1.5 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100/80 text-[#33077C] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-purple-200/80 cursor-pointer"
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
                                    setOpenProductDropdownRow(null);
                                  }}
                                  className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                    !rowItem.productName
                                      ? "bg-purple-50 text-[#33077C] font-bold"
                                      : "hover:bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400 italic">
                                      None / Clear Product
                                    </span>
                                  </div>
                                  {!rowItem.productName && (
                                    <Check className="w-4 h-4 text-[#33077C]" />
                                  )}
                                </div>

                                {isLoadingProducts &&
                                matchingProducts.length === 0 ? (
                                  <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-[#33077C]" />
                                    <span>Loading products...</span>
                                  </div>
                                ) : matchingProducts.length === 0 ? (
                                  <div className="py-6 px-3 text-center text-slate-400">
                                    <p className="text-xs font-semibold text-slate-600">
                                      No products found
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      Try typing a different name, category, or
                                      SKU
                                    </p>
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
                                        <span>
                                          Add "{productSearchQuery.trim()}"
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  matchingProducts.map((p: any) => {
                                    const isSelected =
                                      rowItem.productId === p.productId ||
                                      (rowItem.productName &&
                                        rowItem.productName === p.productName);
                                    const imgUrl = p.imageUrl || p.image;
                                    return (
                                      <div
                                        key={p.productId || p.id}
                                        onClick={() =>
                                          handleSelectProduct(idx, p)
                                        }
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
                                              <span>
                                                {getInitials(
                                                  p.productName,
                                                  "PR",
                                                )}
                                              </span>
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
                                                SKU:{" "}
                                                {p.sku ||
                                                  p.productCode ||
                                                  "PRD"}
                                              </span>
                                              {p.unit && (
                                                <span>• {p.unit}</span>
                                              )}
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
                                            ₹
                                            {Number(
                                              p.unitPrice || 0,
                                            ).toLocaleString("en-IN")}
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
                          const batches = (matchedStock as any)?.batches || [];
                          const resolvedBatches = batches;
                          if (rowItem.productId || batches.length > 0) {
                            return (
                              <select
                                value={rowItem.batch || ""}
                                onChange={(e) =>
                                  handleItemChange(idx, "batch", e.target.value)
                                }
                                className="w-full h-9 px-2 bg-purple-50/60 hover:bg-purple-50 text-[#33077C] border border-purple-200 rounded-lg text-xs font-bold outline-none cursor-pointer focus:border-[#4309A2]"
                              >
                                <option value="">Select Batch...</option>
                                {resolvedBatches.map((b: any) => (
                                  <option
                                    key={b.batchNo || b.id}
                                    value={b.batchNo}
                                  >
                                    {b.batchNo}{" "}
                                    {b.quantity !== undefined
                                      ? `(${b.quantity} in stock)`
                                      : ""}
                                  </option>
                                ))}
                                {rowItem.batch &&
                                  !resolvedBatches.some(
                                    (b: any) => b.batchNo === rowItem.batch,
                                  ) && (
                                    <option value={rowItem.batch}>
                                      {rowItem.batch}
                                    </option>
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
                                handleItemChange(idx, "batch", e.target.value)
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
                      {currentCalculations.finalAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
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
                    onClick={() => setShowDocumentSection(!showDocumentSection)}
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
                      placeholder="Enter sale order terms and conditions..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-[#33077C]"
                    />
                  </div>
                )}

                {showDescriptionSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-1.5 animate-in fade-in duration-100">
                    <label className="block text-xs font-bold text-slate-700">
                      Order Description / Notes
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
                      placeholder="Add custom notes or delivery remarks for this sale order..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-[#33077C]"
                    />
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
                    onChange={(e) => setManualRoundOff(Number(e.target.value))}
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
                    {currentCalculations.finalAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
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
                <div className="so-share-footer-container relative">
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
                            `Sale Order from YAA Mart\nOrder No: ${activeTab.formData.orderNo}\nCustomer: ${activeTab.formData.partyName}\nAmount: ₹${currentCalculations.finalAmount}`,
                          );
                          window.open(`https://wa.me/?text=${text}`, "_blank");
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
                            `Sale Order ${activeTab.formData.orderNo}`,
                          );
                          const body = encodeURIComponent(
                            `Dear ${activeTab.formData.partyName},\n\nOrder amount: ₹${currentCalculations.finalAmount}`,
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
                  onClick={() => handleSaveSaleOrder(true)}
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
                  form="sale-order-form"
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
                    : activeTab.editingOrder
                      ? "Update Order"
                      : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Reusable Customer Creation Modal */}
        <AddCustomerModal
          isOpen={isAddCustomerModalOpen}
          onClose={() => setIsAddCustomerModalOpen(false)}
          onCustomerCreated={(newCust) => {
            dispatch(
              baseApi.util.invalidateTags([
                "CommerceCustomer",
                "Customer",
              ] as any),
            );
            setLiveCustomers((prev) => [newCust as any, ...prev]);
            updateActiveTabFormData((prev) => ({
              ...prev,
              customerId: newCust.id,
              partyName: newCust.name,
              customerPhone: newCust.phone || "",
              customerEmail: newCust.email || "",
              customerCompany: newCust.company || "",
              billingAddress: newCust.billingAddress || newCust.address || "",
              stateOfSupply: newCust.state
                ? `${newCust.state}`
                : prev.stateOfSupply,
            }));
            setPartySearchQuery(newCust.name);
            setIsPartyDropdownOpen(false);
            setIsAddCustomerModalOpen(false);
          }}
        />

        {/* Reusable Item Creation Modal */}
        <AddItemModal
          isOpen={isAddItemModalOpen}
          onClose={() => {
            setIsAddItemModalOpen(false);
            setActiveItemRowIndex(null);
          }}
          onProductCreated={(newProduct) => {
            dispatch(
              baseApi.util.invalidateTags(["Product", "InventoryStock"] as any),
            );
            setLiveProducts((prev) => [newProduct, ...prev]);
            fetchLiveProducts();
            if (activeItemRowIndex !== null) {
              handleSelectProduct(activeItemRowIndex, newProduct);
            }
            setIsAddItemModalOpen(false);
            setActiveItemRowIndex(null);
          }}
        />
      </div>
    );
  }

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredOrders.length === 0) {
      toast.error("No sale orders to export");
      return;
    }

    const excelRows = filteredOrders.map((o) => {
      const createdDt = formatDateTime(o.createdAt);
      const convertedAt = resolveDocumentConvertedAt("Order", o);
      const convertedDt = formatDateTime(convertedAt);
      return {
        date: isoToDdmmyyyy(o.orderDate),
        dueDate: isoToDdmmyyyy(o.dueDate),
        createdDateTime: createdDt?.full || "—",
        convertedDateTime: convertedDt?.full || "—",
        orderNo: o.orderNo,
        partyName: o.partyName,
        customerPhone: o.customerPhone || "-",
        amount: Number(o.amount || 0),
        balance: Number(o.balance || 0),
        status: o.status,
      };
    });

    exportTableToExcel({
      filename: `Sale_Orders_Report_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Sale Orders",
      title: "YAA CREATIONS CRM - SALES ORDER REPORT",
      subtitle: `Filter: ${appliedPeriod} | Total Orders: ${filteredOrders.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        {
          header: "Created Date & Time",
          key: "createdDateTime",
          align: "center",
          width: 22,
        },
        {
          header: "Converted Date & Time",
          key: "convertedDateTime",
          align: "center",
          width: 22,
        },
        { header: "Order No.", key: "orderNo", align: "center", width: 18 },
        { header: "Customer Name", key: "partyName", align: "left", width: 28 },
        { header: "Phone", key: "customerPhone", align: "left", width: 18 },
        {
          header: "Total (₹)",
          key: "amount",
          align: "right",
          type: "currency",
          width: 20,
        },
        {
          header: "Balance (₹)",
          key: "balance",
          align: "right",
          type: "currency",
          width: 20,
        },
        { header: "Status", key: "status", align: "center", width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        createdDateTime: "TOTAL",
        partyName: `${filteredOrders.length} Orders`,
        amount: metrics.totalVal,
        balance: metrics.openVal,
      },
    });

    toast.success(
      `Sale Orders Excel report downloaded (${filteredOrders.length} records)!`,
    );
  };

  // Print Sale Orders Table Report via universal printUtils
  const handlePrintTableReport = () => {
    if (filteredOrders.length === 0) {
      toast.error("No sale orders to print.");
      return;
    }

    const printRows = filteredOrders.map((o) => {
      const createdDt = formatDateTime(o.createdAt);
      const convertedAt = resolveDocumentConvertedAt("Order", o);
      const convertedDt = formatDateTime(convertedAt);
      return {
        orderNo: o.orderNo,
        createdDateTime: createdDt?.full || "—",
        convertedDateTime: convertedDt?.full || "—",
        partyName: o.partyName,
        customerPhone: o.customerPhone || "-",
        amount: Number(o.amount || 0),
        balance: Number(o.balance || 0),
        status: o.status,
      };
    });

    printTableReport({
      title: "SALES ORDER REGISTER",
      subtitle: `Filter: ${appliedPeriod} | Total Orders: ${filteredOrders.length}`,
      columns: [
        { header: "Order No.", key: "orderNo", align: "center", width: "16%" },
        {
          header: "Created Date & Time",
          key: "createdDateTime",
          align: "center",
          width: "18%",
        },
        {
          header: "Converted Date & Time",
          key: "convertedDateTime",
          align: "center",
          width: "18%",
        },
        {
          header: "Customer Name",
          key: "partyName",
          align: "left",
          width: "22%",
        },
        {
          header: "Contact",
          key: "customerPhone",
          align: "left",
          width: "12%",
        },
        {
          header: "Total (₹)",
          key: "amount",
          align: "right",
          type: "currency",
          width: "12%",
        },
        {
          header: "Balance (₹)",
          key: "balance",
          align: "right",
          type: "currency",
          width: "12%",
        },
        { header: "Status", key: "status", align: "center", width: "10%" },
      ],
      data: printRows,
      summaryRow: {
        orderNo: "TOTAL",
        partyName: `${filteredOrders.length} Orders`,
        amount: metrics.totalVal,
        balance: metrics.openVal,
      },
    });
  };

  // =========================================================================
  // VIEW MODE: LIST (Transactions Table View - Royal Purple CRM Theme)
  // =========================================================================
  return (
    <div className="space-y-5 pb-16 font-sans">
      {/* 1. TOP HEADER CARD (CRM BRAND THEME) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-[220px] flex-1">
          <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Sales Order
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {totalApiRecords > 0 ? totalApiRecords : saleOrders.length}{" "}
                total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Track confirmed customer sale orders, due dates, advance payments,
              and convert to sale invoices.
            </p>
          </div>
        </div>

        {/* Top Right Actions */}
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
            Add Sale Order
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sale Orders */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Sale Orders
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              ₹
              {metrics.totalVal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {metrics.totalCount} orders recorded
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Open Orders */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-amber-600 uppercase tracking-wider">
              Open / Pending Orders
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
              ₹
              {metrics.openVal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {saleOrders.filter((o) => o.status === "Open").length} orders in
              progress
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Converted to Invoice */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Converted / Invoiced
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              ₹
              {metrics.convertedVal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {saleOrders.filter((o) => o.status === "Converted").length} orders
              fulfilled
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Cancelled Orders */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cancelled Orders
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {saleOrders.filter((o) => o.status === "Cancelled").length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Voided orders
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
        placeholder="Search by customer name, order no, phone..."
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
            isFetchingOrdersRef.current = false;
            fetchSaleOrders();
          }
        }}
        onReset={() => {
          const isSame =
            appliedSearch === "" &&
            pendingSearch === "" &&
            appliedPeriod === "This Month" &&
            pendingPeriod === "This Month" &&
            appliedStatus === "ALL" &&
            pendingStatus === "ALL" &&
            page === 1;

          setPendingSearch("");
          setAppliedSearch("");
          setPendingPeriod("This Month");
          setAppliedPeriod("This Month");
          setPendingStatus("ALL");
          setAppliedStatus("ALL");
          setPage(1);

          if (isSame) {
            isFetchingOrdersRef.current = false;
            fetchSaleOrders();
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
                const openOrders = saleOrders.filter(
                  (o) => o.status === "Open",
                );
                if (openOrders.length === 0) {
                  toast.info(
                    "No open sale orders available for bulk conversion.",
                  );
                  return;
                }
                setSelectedBulkOrderIds(openOrders.map((o) => o.id));
                setIsBulkConvertModalOpen(true);
              }}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
              icon={<ShoppingCart className="w-4 h-4 text-rose-500" />}
            >
              Bulk Convert
            </Button>
            <span className="text-xs font-semibold text-slate-500 shrink-0">
              Total Orders :{" "}
              <span className="text-[#33077C] font-bold">
                {totalApiRecords || filteredOrders.length}
              </span>
            </span>
          </div>
        }
      />

      {/* 4. TRANSACTIONS TABLE (PURPLE THEME WITH FILTER COLUMNS) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isApiLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#33077C]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Loading live sales orders...
            </span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-purple-50/80 border border-purple-100 flex items-center justify-center text-[#33077C] shadow-xs">
              <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                No Orders to show
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                You haven't recorded any customer sale orders matching current
                filters.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="h-10 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#33077C]/20 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Sale Order</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-[13px] border-collapse min-w-[850px]">
              {/* Royal Purple Header with Standard Icons */}
              <CommonTableHead
                columns={[
                  { label: "SALE ORDER NO.", align: "center", minWidth: "140px" },
                  { label: "CUSTOMER NAME", align: "left", minWidth: "180px" },
                  { label: "CREATED DATE & TIME", align: "left", minWidth: "140px" },
                  { label: "CONVERTED DATE & TIME", align: "left", minWidth: "140px" },
                  { label: "TOTAL AMOUNT", align: "right", minWidth: "120px" },
                  { label: "BALANCE", align: "right", minWidth: "120px" },
                  { label: "TYPE", align: "left", minWidth: "100px" },
                  { label: "STATUS", align: "center", minWidth: "110px" },
                  { label: "ACTION", align: "center", minWidth: "190px" },
                ]}
              />

              {/* Table Rows */}
              <tbody className="divide-y divide-slate-200 text-slate-800 font-sans">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-12 text-center text-slate-400"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShoppingBag className="w-10 h-10 text-slate-300" />
                        <p className="text-sm font-medium">
                          No sale orders found.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((item) => {
                    const orderStages = getOrderStages(item);
                    const isConvertOpen = activeConvertDropdownId === item.id;
                    const isActionOpen = activeDropdownId === item.id;
                    const createdDt = formatDateTime(item.createdAt);
                    const convertedAt = resolveDocumentConvertedAt(
                      "Order",
                      item,
                    );
                    const convertedDt = formatDateTime(convertedAt);
                    const resolvedCustomerCode =
                      (item as any).customerCode ||
                      liveCustomers.find(
                        (c) =>
                          (item.customerId && c.id === item.customerId) ||
                          (c.phone &&
                            item.customerPhone &&
                            c.phone === item.customerPhone) ||
                          (c.name &&
                            item.partyName &&
                            c.name.trim().toLowerCase() ===
                              item.partyName.trim().toLowerCase()),
                      )?.customerCode ||
                      localCustomers.find(
                        (c) =>
                          (item.customerId && c.id === item.customerId) ||
                          (c.phone &&
                            item.customerPhone &&
                            c.phone === item.customerPhone) ||
                          (c.name &&
                            item.partyName &&
                            c.name.trim().toLowerCase() ===
                              item.partyName.trim().toLowerCase()),
                      )?.customerCode ||
                      findDocumentLineage(item.orderNo)?.customerCode ||
                      "";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-purple-50/30 transition-colors border-b border-slate-200 group"
                      >
                        {/* 1. NO. */}
                        <td className="py-3.5 px-3 font-bold text-slate-800 text-center border-r border-slate-200 whitespace-nowrap align-middle">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span>
                              {item.orderNo || item.referenceNo || "—"}
                            </span>
                            <DocumentLineageBadges
                              docRef={item.orderNo}
                              currentType="Order"
                              className="justify-center"
                            />
                          </div>
                        </td>

                        {/* 2. PARTY */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap align-middle">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">
                              {item.partyName}
                            </span>
                            {resolvedCustomerCode && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-[#33077C] border border-purple-200/80">
                                {resolvedCustomerCode}
                              </span>
                            )}
                          </div>
                          {item.customerPhone && (
                            <div className="text-[11px] text-slate-400 font-normal">
                              {item.customerPhone}
                            </div>
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

                        {/* 6. CONVERTED DATE & TIME */}
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
                          ₹{" "}
                          {item.amount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>

                        {/* 6. BALANCE */}
                        <td className="py-3.5 px-3 text-right font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap align-middle">
                          ₹{" "}
                          {item.balance.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>

                        {/* 7. TYPE */}
                        <td className="py-3.5 px-3 font-medium text-slate-700 border-r border-slate-200 whitespace-nowrap align-middle">
                          Sale Order
                        </td>

                        {/* 8. STATUS */}
                        <td className="py-3.5 px-3 border-r border-slate-200 whitespace-nowrap text-center align-middle">
                          <div className="flex items-center justify-center">
                            {orderStages.isFullyConverted ||
                            item.status === "Converted" ||
                            item.status === "Completed" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Converted
                              </span>
                            ) : item.status === "Cancelled" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Cancelled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Open
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 9. ACTION */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap min-w-[190px] w-48 align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Convert ⌄ Dropdown Button slot with fixed width */}
                            <div className="w-[104px] shrink-0 flex items-center justify-center">
                            {orderStages.isFullyConverted ||
                            orderStages.availableCount === 0 ? (
                              <button
                                type="button"
                                disabled
                                aria-disabled="true"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                title={`Sale Order has been converted (${item.convertedToInvoiceNo || "Converted"})`}
                                className="text-xs sm:text-[13px] font-semibold text-emerald-700 bg-emerald-50/90 border border-emerald-200/90 px-2 py-1 rounded cursor-not-allowed select-none flex items-center justify-center gap-1 opacity-80"
                              >
                                <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                                <span>Converted</span>
                              </button>
                            ) : (
                              <div className="relative inline-block text-left order-convert-dropdown-container">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isConvertOpen) {
                                      setActiveConvertDropdownId(null);
                                      setConvertDropdownPos(null);
                                    } else {
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      setConvertDropdownPos({
                                        top: rect.bottom + 4,
                                        right: window.innerWidth - rect.right,
                                      });
                                      setActiveConvertDropdownId(item.id);
                                      setActiveDropdownId(null);
                                      setDropdownPos(null);
                                    }
                                  }}
                                  className="order-convert-btn text-xs sm:text-[13px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-transparent hover:bg-blue-50/60 flex items-center justify-center gap-1 px-1.5 py-1 rounded transition-colors cursor-pointer select-none"
                                  title="Convert to next sales stage"
                                >
                                  <span>Convert</span>
                                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>

                                {/* Convert Floating Dropdown Menu */}
                                {isConvertOpen && convertDropdownPos && (
                                  <div
                                    style={{
                                      position: "fixed",
                                      top: `${convertDropdownPos.top}px`,
                                      right: `${convertDropdownPos.right}px`,
                                      zIndex: 9999,
                                    }}
                                    className="order-convert-dropdown-menu w-56 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-left font-sans overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {!orderStages.isChallanConverted && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveConvertDropdownId(null);
                                          setConvertDropdownPos(null);
                                          handleConvertExistingToChallan(item);
                                        }}
                                        className="w-full text-left px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-purple-50 hover:text-[#33077C] transition-colors cursor-pointer flex items-center gap-2.5"
                                      >
                                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Convert to Delivery Challan</span>
                                      </button>
                                    )}
                                    {!orderStages.isInvoiceConverted && (
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
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            </div>

                            {/* Send / Share Popover Button */}
                            <DocumentSharePopover
                              id={item.id}
                              getShareData={() => formatSaleOrderShare(item)}
                              title="Share Sale Order"
                            />

                            {/* 3-Dots Actions Menu */}
                            <SaleActionDropdown
                              items={[
                                {
                                  label: "Convert to Delivery Challan",
                                  variant: "challan",
                                  disabled:
                                    orderStages.isChallanConverted ||
                                    orderStages.isFullyConverted,
                                  onClick: () =>
                                    handleConvertExistingToChallan(item),
                                },
                                {
                                  label: "Convert to Sales Invoice",
                                  variant: "invoice",
                                  disabled:
                                    orderStages.isInvoiceConverted ||
                                    orderStages.isFullyConverted,
                                  onClick: () =>
                                    handleConvertExistingToSale(item),
                                },
                                {
                                  label: "View/Edit",
                                  variant: "edit",
                                  onClick: () => handleOpenEditForm(item),
                                },
                                {
                                  label: "Duplicate",
                                  variant: "duplicate",
                                  onClick: () => handleDuplicateOrder(item),
                                },

                                {
                                  label: "Print Order",
                                  variant: "print",
                                  onClick: () => handlePrintOrder(item),
                                },
                                {
                                  label: "Download Order",
                                  variant: "download",
                                  onClick: () => handleDownloadSaleOrder(item),
                                },
                                {
                                  label: "View History",
                                  variant: "view",
                                  onClick: () => setHistoryOrder(item),
                                },
                                {
                                  label: "Mark as Cancelled",
                                  variant: "cancel",
                                  hidden: item.status !== "Open",
                                  onClick: () => handleCancelOrder(item),
                                },
                                {
                                  label: "Delete",
                                  variant: "delete",
                                  onClick: () => handleOpenDeleteModal(item),
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Pagination */}
      {filteredOrders.length > 0 && (
        <Pagination
          total={totalApiRecords || filteredOrders.length}
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

      {/* 6. Preview / Print Modal */}
      {previewOrder && (
        <Modal
          isOpen={!!previewOrder}
          onClose={() => setPreviewOrder(null)}
          title={`Sale Order - ${previewOrder.orderNo}`}
          subtitle={`Order for ${previewOrder.partyName} placed on ${isoToDdmmyyyy(previewOrder.orderDate)}`}
          maxWidth="3xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
        >
          <div className="p-6 sm:p-8 space-y-6 bg-white text-slate-800 font-sans">
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h2 className="text-2xl font-black text-[#33077C]">
                  YAA CREATIONS CRM
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  128 Commercial Boulevard, Tech Park, Chennai - 600001
                </p>
                <p className="text-xs text-slate-500">
                  GSTIN: 33AAAAA0000A1Z5 | Phone: +91 98765 43210
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-lg bg-purple-100 text-[#33077C] font-black text-xs uppercase tracking-wider mb-2">
                  SALE ORDER
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {previewOrder.orderNo}
                </p>
                <p className="text-xs text-slate-500">
                  Order Date: {isoToDdmmyyyy(previewOrder.orderDate)}
                </p>
                <p className="text-xs text-slate-500">
                  Delivery Due: {isoToDdmmyyyy(previewOrder.dueDate)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">
                  Customer Details:
                </p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {previewOrder.partyName}
                </p>
                {previewOrder.customerCompany && (
                  <p>{previewOrder.customerCompany}</p>
                )}
                {previewOrder.customerPhone && (
                  <p>Phone: {previewOrder.customerPhone}</p>
                )}
                {previewOrder.billingAddress && (
                  <p>{previewOrder.billingAddress}</p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">
                  Order Details:
                </p>
                <p className="mt-0.5">
                  <strong className="text-slate-700">Ref No:</strong>{" "}
                  {previewOrder.referenceNo || "-"}
                </p>
                <p>
                  <strong className="text-slate-700">Payment Type:</strong>{" "}
                  {previewOrder.paymentType || "Credit"}
                </p>
                <p>
                  <strong className="text-slate-700">State of Supply:</strong>{" "}
                  {previewOrder.stateOfSupply || "Tamil Nadu"}
                </p>
                <p>
                  <strong className="text-slate-700">Status:</strong>{" "}
                  {previewOrder.status}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[560px] text-xs text-left">
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
                  {previewOrder.items.map((it, i) => (
                    <tr key={i}>
                      <td className="p-2.5 text-slate-400">{i + 1}</td>
                      <td className="p-2.5 font-bold text-slate-800">
                        {it.productName}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-[#33077C]">
                        {it.batch || "—"}
                      </td>
                      <td className="p-2.5 text-center">
                        {it.quantity} {it.unit || ""}
                      </td>
                      <td className="p-2.5 text-right">
                        ₹{it.unitPrice.toLocaleString("en-IN")}
                      </td>
                      <td className="p-2.5 text-right">
                        {it.taxPercent || 0}%
                      </td>
                      <td className="p-2.5 text-right font-bold">
                        ₹
                        {it.total.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <div className="w-full sm:w-64 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">
                    ₹
                    {previewOrder.subtotal.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {previewOrder.taxAmount !== undefined &&
                  previewOrder.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>GST Tax:</span>
                      <span className="font-semibold text-slate-800">
                        ₹
                        {previewOrder.taxAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                {previewOrder.roundOff !== undefined && (
                  <div className="flex justify-between">
                    <span>Round Off:</span>
                    <span className="font-semibold text-slate-800">
                      ₹{previewOrder.roundOff.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-[#33077C] pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span>
                    ₹
                    {previewOrder.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {previewOrder.terms && (
              <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 whitespace-pre-line border border-slate-100">
                <span className="font-bold text-slate-700">
                  Terms &amp; Conditions:
                </span>
                <br />
                {previewOrder.terms}
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewOrder(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handlePrintOrder(previewOrder)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Order</span>
              </button>
              <button
                type="button"
                disabled={isDownloadingPdf}
                onClick={() => handleDownloadSaleOrder(previewOrder)}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Order</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. Sale Order History / Audit Trail Modal */}
      {historyOrder && (
        <Modal
          isOpen={Boolean(historyOrder)}
          onClose={() => setHistoryOrder(null)}
          title={`Order History - ${historyOrder.orderNo}`}
          maxWidth="md"
        >
          <div className="p-1 sm:p-2 space-y-4 text-xs font-sans">
            <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider">
                  Order No
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {historyOrder.orderNo}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {historyOrder.partyName}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Amount
                </div>
                <div className="text-base font-extrabold text-[#33077C] mt-0.5">
                  ₹{" "}
                  {historyOrder.amount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    historyOrder.status === "Converted"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {historyOrder.status}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Audit Timeline
              </div>

              <div className="relative pl-6 space-y-4 border-l-2 border-purple-200 ml-2">
                {/* Event 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#33077C] ring-4 ring-purple-100" />
                  <div>
                    <div className="font-bold text-slate-800">
                      Sale Order Booked
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Date: {isoToDdmmyyyy(historyOrder.orderDate)} • Due:{" "}
                      {isoToDdmmyyyy(historyOrder.dueDate)}
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Created by Sales Representative
                    </div>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="relative">
                  <div
                    className={`absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full ${
                      historyOrder.status === "Converted"
                        ? "bg-emerald-500 ring-4 ring-emerald-100"
                        : "bg-amber-500 ring-4 ring-amber-100"
                    }`}
                  />
                  <div>
                    <div className="font-bold text-slate-800">
                      {historyOrder.status === "Converted"
                        ? "Converted to Sale Invoice"
                        : "Order Status: Active / Open"}
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      {historyOrder.convertedToInvoiceNo
                        ? `Linked Invoice: ${historyOrder.convertedToInvoiceNo}`
                        : "Awaiting fulfillment / shipment"}
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Timestamp:{" "}
                      {new Date(
                        historyOrder.createdAt || Date.now(),
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-300 ring-4 ring-slate-100" />
                  <div>
                    <div className="font-bold text-slate-700">
                      Last Verified
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Updated:{" "}
                      {new Date(
                        historyOrder.updatedAt || Date.now(),
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => setHistoryOrder(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 8. Bulk Convert To Sale Modal */}
      {isBulkConvertModalOpen && (
        <Modal
          isOpen={isBulkConvertModalOpen}
          onClose={() => setIsBulkConvertModalOpen(false)}
          title="Bulk Convert Sale Orders to Sale Invoices"
          maxWidth="lg"
        >
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleBulkConvertToSale();
            }}
            className="p-6 space-y-4 text-xs font-sans"
          >
            <p className="text-slate-600">
              Select open sale orders you want to convert into confirmed sale
              invoices in one batch:
            </p>

            <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2.5">
              {saleOrders
                .filter((o) => o.status === "Open")
                .map((order) => {
                  const isChecked = selectedBulkOrderIds.includes(order.id);
                  return (
                    <label
                      key={order.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                        isChecked
                          ? "bg-purple-50/70 border-purple-200 text-[#33077C]"
                          : "bg-white border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBulkOrderIds([
                                ...selectedBulkOrderIds,
                                order.id,
                              ]);
                            } else {
                              setSelectedBulkOrderIds(
                                selectedBulkOrderIds.filter(
                                  (id) => id !== order.id,
                                ),
                              );
                            }
                          }}
                          className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C]"
                        />
                        <div>
                          <div className="font-bold text-slate-800">
                            {order.partyName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {order.orderNo} • Due:{" "}
                            {isoToDdmmyyyy(order.dueDate)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-extrabold text-[#33077C]">
                        ₹{" "}
                        {order.amount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </label>
                  );
                })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="font-bold text-slate-600">
                Selected:{" "}
                <span className="text-[#33077C]">
                  {selectedBulkOrderIds.length}
                </span>{" "}
                orders
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => setIsBulkConvertModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={
                    isActionLoading || selectedBulkOrderIds.length === 0
                  }
                  icon={
                    isActionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4" />
                    )
                  }
                >
                  Convert Selected
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingOrder) {
            setIsDeleteModalOpen(false);
            setDeleteTargetOrder(null);
            setDeleteOrderError(null);
          }
        }}
        onConfirm={handleConfirmDeleteOrder}
        entityName="Sale Order"
        recordName={deleteTargetOrder?.orderNo}
        isLoading={isDeletingOrder}
        error={deleteOrderError}
      />
    </div>
  );
};

export default SaleOrderView;
