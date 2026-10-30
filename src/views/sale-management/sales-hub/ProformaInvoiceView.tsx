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
  Phone,
  Truck,
} from "lucide-react";
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
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  printBusinessDocument,
  printTableReport,
  downloadBusinessDocument,
  DocumentPrintOptions,
} from "../../../utils/printUtils";
import { useCompanyDocumentProfile } from "../../../hooks/useCompanyDocumentProfile";
import { exportTableToExcel } from "../../../utils/excelExport";
import { SaleActionDropdown } from "../utils/SaleActionDropdown";
import { DocumentSharePopover, formatProformaInvoiceShare } from "../../../utils/shareUtils";
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
  unpackProducts,
  mapApiProductToProductItem,
  ProductItemModel,
  ExtendedProformaItem,
  SaleProformaInvoice,
  UUID_REGEX,
  ApiStockBatch,
  clientProductApi,
} from "../../../api";
import { useAppDispatch } from "../../../hooks/redux";
import { baseApi } from "../../../api/baseApi";
import { store } from "../../../store/store";
import {
  isValidIndianPhone,
  normalizeIndianPhoneTo10Digits,
} from "../../../utils/validation";
import {
  commerceSaleOrderApi,
  SaleOrderRecord,
  mapSaleOrderRecordToPayload,
} from "../../../api/commerce/saleOrderApi";
import {
  commerceDeliveryChallanApi,
  DeliveryChallanRecord,
  mapDeliveryChallanRecordToPayload,
} from "../../../api/commerce/deliveryChallanApi";
import {
  syncConvertedOrderToStorage,
  syncConvertedInvoiceToStorage,
  syncConvertedChallanToStorage,
  syncProformaStatusInStorage,
  recordDocumentConversion,
  findDocumentLineage,
  initializeWorkflowIntegrity,
  resolveDocumentConvertedAt,
} from "../../../utils/salesDocumentWorkflow";
import { DocumentLineageBadges } from "../../../components/common/DocumentLineageBadges";
import {
  FormLabel,
  FORM_INPUT_CLS,
  FORM_SELECT_CLS,
  FORM_TEXTAREA_CLS,
  getFormInputCls,
  handleNonNegativeKeyDown,
} from "../utils/formUtils";
import {
  calculateLineItem,
  calculateDocumentTotals,
  determineGstType,
  parseTaxRate,
  round2,
} from "../../../utils/financialCalculations";
import { AddCustomerModal } from "./AddCustomerModal";
import { AddItemModal } from "../inventory/AddItemModal";

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

const PERIOD_FILTER_OPTIONS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Quarter", value: "this_quarter" },
  { label: "This Year", value: "this_year" },
];

const checkDateMatchesPeriod = (dateStr?: string, period?: string): boolean => {
  if (!period || period === "all" || period === "All Time") return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  switch (period) {
    case "today":
      return itemDay.getTime() === startOfDay.getTime();
    case "this_week": {
      const dayOfWeek = now.getDay();
      const firstDayOfWeek = new Date(startOfDay);
      firstDayOfWeek.setDate(startOfDay.getDate() - dayOfWeek);
      return itemDay >= firstDayOfWeek && itemDay <= now;
    }
    case "this_month":
      return (
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      );
    case "last_month": {
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const lastMonthYear =
        now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
    }
    case "this_quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const itemQuarter = Math.floor(d.getMonth() / 3);
      return (
        d.getFullYear() === now.getFullYear() && currentQuarter === itemQuarter
      );
    }
    case "this_year":
      return d.getFullYear() === now.getFullYear();
    default:
      return true;
  }
};

const STATUS_FILTER_OPTIONS = [
  { label: "All Statuses", value: "ALL" },
  { label: "Open", value: "Open", dotColor: "#f59e0b" },
  { label: "Converted", value: "Converted", dotColor: "#10b981" },
  { label: "Cancelled", value: "Cancelled", dotColor: "#ef4444" },
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
  initialMode?: "list" | "form";
}

export const ProformaInvoiceView: React.FC<ProformaInvoiceViewProps> = ({
  initialMode = "list",
}) => {
  const companyProfile = useCompanyDocumentProfile();
  const navigate = useNavigate();
  const {
    customers,
    stocks,
    saveCustomer,
    saveSale,
    setCustomersList,
    setStocksList,
  } = useSalesManagementStore();

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
  const [liveBatches, setLiveBatches] = useState<ApiStockBatch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Proforma state with localStorage persistence as offline fallback
  const [proformaList, setProformaList] = useState<SaleProformaInvoice[]>(
    () => {
      try {
        const saved = localStorage.getItem("yaa_crm_proforma_invoices");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter(
              (p) =>
                p.id !== "pro_1" &&
                p.id !== "pro_2" &&
                !String(p.id).startsWith("pro_") &&
                !String(p.partyName || "").includes("Keerthivasan") &&
                !String(p.partyName || "").includes("Royal Spice"),
            );
          }
        }
        return [];
      } catch {
        return [];
      }
    },
  );

  const persistProformas = (updated: SaleProformaInvoice[]) => {
    setProformaList(updated);
    try {
      localStorage.setItem(
        "yaa_crm_proforma_invoices",
        JSON.stringify(updated),
      );
    } catch (e) {
      console.error("Failed to save proforma invoices", e);
    }
  };

  // View Mode: 'list' vs 'form'
  const [viewMode, setViewMode] = useState<"list" | "form">(initialMode);

  useEffect(() => {
    setViewMode(initialMode);
  }, [initialMode]);

  // Search & Filters
  const [searchParams] = useSearchParams();
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
  const [pendingPeriod, setPendingPeriod] = useState("all");
  const [appliedPeriod, setAppliedPeriod] = useState("all");
  const [pendingStatus, setPendingStatus] = useState("ALL");
  const [appliedStatus, setAppliedStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) {
      setPendingSearch(q);
      setAppliedSearch(q);
    }
  }, [searchParams]);

  // Helper to map UI period names to OpenAPI period values
  const mapPeriodToApiPeriod = (periodStr: string): string => {
    const norm = periodStr.toLowerCase().replace(/\s+/g, "_");
    if (norm.includes("last") && norm.includes("month")) return "last_month";
    if (norm.includes("month")) return "this_month";
    if (norm.includes("week")) return "this_week";
    if (norm.includes("today")) return "today";
    if (norm.includes("quarter")) return "this_quarter";
    if (norm.includes("year")) return "this_year";
    if (norm.includes("all")) return "all";
    return norm || "all";
  };

  // Dropdowns & Action Menu
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [activeConvertDropdownId, setActiveConvertDropdownId] = useState<
    string | null
  >(null);
  const [convertDropdownPos, setConvertDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetProforma, setDeleteTargetProforma] = useState<{
    id: string;
    proformaNo: string;
  } | null>(null);
  const [isDeletingProforma, setIsDeletingProforma] = useState(false);
  const [deleteProformaError, setDeleteProformaError] = useState<string | null>(
    null,
  );

  // Preview / Print Modal
  const [previewProforma, setPreviewProforma] =
    useState<SaleProformaInvoice | null>(null);

  // Dynamic Table Column Customization State
  const [columnSettings, setColumnSettings] = useState<TableColumnSettings>({
    showItemCategory: false,
    showItemCode: false,
    showHsnSac: false,
    showDescription: false,
    showDiscount: true,
  });
  const [showColumnCustomizePopover, setShowColumnCustomizePopover] =
    useState(false);

  // Price tax mode: without_tax or with_tax
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

  // Valid Upto Days (15 - 120 Days)
  const [validUptoDays, setValidUptoDays] = useState<string>("30");

  // Form State
  const [editingProforma, setEditingProforma] =
    useState<SaleProformaInvoice | null>(null);
  const [partySearchOpen, setPartySearchOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");
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
      periodVal: string = appliedPeriod,
    ) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsApiLoading(true);
      setApiErrorMessage(null);

      const params: ProformaFilterParams = {
        page_no: pageNo,
        page_size: size,
        pagination_required: true,
        sortOrder: "desc",
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (statusVal && statusVal !== "ALL") {
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
          setTotalApiRecords(
            response.pagination?.totalRecords ?? mapped.length,
          );
          setTotalApiPages(response.pagination?.totalPages ?? 1);
          setIsApiConnected(true);
        } else {
          throw new Error(
            response?.message || "Failed to fetch proforma invoices",
          );
        }
      } catch (err: any) {
        console.warn("Commerce Proformas API notice:", err);
        setIsApiConnected(false);
        setApiErrorMessage(err.message || "Commerce API not reachable");
        setLiveProformas(proformaListRef.current);
        setTotalApiRecords(proformaListRef.current.length);
        setTotalApiPages(
          Math.max(1, Math.ceil(proformaListRef.current.length / size)),
        );
      } finally {
        setIsApiLoading(false);
        isFetchingRef.current = false;
      }
    },
    [appliedSearch, appliedStatus, appliedPeriod, page, pageSize],
  );

  // Trigger API fetch on filter/page change
  useEffect(() => {
    fetchProformas(page, pageSize, appliedSearch, appliedStatus, appliedPeriod);
  }, [
    fetchProformas,
    page,
    pageSize,
    appliedSearch,
    appliedStatus,
    appliedPeriod,
  ]);

  // Listen for sidebar click event to trigger immediate fresh API fetch
  useEffect(() => {
    const handleSidebarNav = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (
        detail?.path === "/sale-management/sales/proforma" ||
        detail?.id === "sales-hub-proforma" ||
        detail?.id === "billing-proforma"
      ) {
        fetchProformas(
          page,
          pageSize,
          appliedSearch,
          appliedStatus,
          appliedPeriod,
        );
      }
    };
    window.addEventListener("crm:sidebar-navigate", handleSidebarNav);
    return () =>
      window.removeEventListener("crm:sidebar-navigate", handleSidebarNav);
  }, [
    fetchProformas,
    page,
    pageSize,
    appliedSearch,
    appliedStatus,
    appliedPeriod,
  ]);

  // Keep proformaListRef synced
  const proformaListRef = useRef(proformaList);
  useEffect(() => {
    proformaListRef.current = proformaList;
  }, [proformaList]);

  // Initialize workflow integrity & purge mock data on mount
  useEffect(() => {
    initializeWorkflowIntegrity();
    try {
      const raw = localStorage.getItem("yaa_crm_proforma_invoices");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (p) =>
              p.id !== "pro_1" &&
              p.id !== "pro_2" &&
              !String(p.partyName || "").includes("Keerthivasan") &&
              !String(p.partyName || "").includes("Royal Spice"),
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(
              "yaa_crm_proforma_invoices",
              JSON.stringify(cleaned),
            );
            setProformaList(cleaned);
          }
        }
      }
    } catch (e) {
      console.warn("Storage purge error:", e);
    }
  }, []);

  // Fetch live products with multi-source fallback (Commerce products, client products, stocks, localStorage)
  const isFetchingProductsRef = useRef(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
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
        const mapped = prods.map((p, idx) =>
          mapApiProductToProductItem(p, idx),
        );
        setLiveProducts((prev) => {
          const map = new Map<string, ProductItemModel>();
          if (searchQuery?.trim()) {
            prev.forEach((p) => map.set(p.id, p));
          }
          mapped.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn("Failed to search products in ProformaInvoiceView:", err);
    } finally {
      setIsLoadingProducts(false);
      isFetchingProductsRef.current = false;
    }
  }, []);

  // Load live customers & stocks on mount so list view and form view both have customer codes and stock items
  const hasLoadedMasterDataRef = useRef(false);
  useEffect(() => {
    let isMounted = true;

    customerApi
      .getCustomers({ pagination_required: false, page_size: 100 })
      .then((res) => {
        const rawCust = unpackProducts(res);
        if (isMounted && rawCust.length > 0) {
          const mapped = rawCust.map(mapApiCustomerToSalesCustomer);
          setLiveCustomers(mapped);
          setCustomersList(mapped);
        }
      })
      .catch((err) => console.warn("Customer load:", err));

    stockApi
      .getStocks({ pagination_required: false, page_size: 100 })
      .then((res) => {
        const rawStocks = unpackProducts(res);
        if (isMounted && rawStocks.length > 0) {
          const mapped = rawStocks.map(mapApiStockToInventoryStockItem);
          setLiveStocks(mapped);
          setStocksList(mapped);
        }
      })
      .catch((err) => console.warn("Stock load:", err));

    stockApi
      .getStockBatches({ pagination_required: false, page_size: 100 })
      .then((res) => {
        const rawBatches = unpackProducts(res);
        if (isMounted && rawBatches.length > 0) {
          setLiveBatches(rawBatches);
        }
      })
      .catch((err) => console.warn("Stock batches load:", err));

    return () => {
      isMounted = false;
    };
  }, [setCustomersList, setStocksList]);

  // Load products when entering form mode if not already loaded
  useEffect(() => {
    if (viewMode === "form") {
      if (!hasLoadedMasterDataRef.current || liveProducts.length === 0) {
        hasLoadedMasterDataRef.current = true;
        fetchLiveProducts();
      }
    }
  }, [viewMode, fetchLiveProducts, liveProducts.length]);

  // Live products and live customers for selectors (strictly excluding mock customers)
  const availableCustomers = useMemo(() => {
    if (liveCustomers.length > 0) return liveCustomers;
    return customers.filter(
      (c) =>
        !c.id.startsWith("cust_") &&
        !c.name.includes("Keerthi") &&
        !c.name.includes("Royal Spice") &&
        !c.name.includes("Green Valley"),
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
      imageUrl?: string;
      batches: Array<{
        id?: string;
        batchNo: string;
        quantity?: number;
        costPrice?: number;
        sellingPrice?: number;
        expDate?: string;
      }>;
    }> = [];

    const seenIds = new Set<string>();

    const extractTaxPercent = (rateStr?: string | number): number => {
      if (typeof rateStr === "number") return rateStr;
      if (!rateStr) return 0;
      const numMatch = String(rateStr).match(/(\d+(\.\d+)?)/);
      return numMatch ? parseFloat(numMatch[1]) : 0;
    };

    const sourceStocks = liveStocks.length > 0 ? liveStocks : stocks;

    const getBatchesForProduct = (
      productId: string,
      productCodeOrSku?: string,
      productName?: string,
      rawStockBatches?: any[],
    ) => {
      const resultBatches: Array<{
        id?: string;
        batchNo: string;
        quantity?: number;
        costPrice?: number;
        sellingPrice?: number;
        expDate?: string;
      }> = [];

      const seenBatchNos = new Set<string>();

      const addBatch = (b: any) => {
        if (!b) return;
        const batchNo = String(b.batchNo || b.batch || "").trim();
        if (!batchNo || seenBatchNos.has(batchNo.toLowerCase())) return;
        seenBatchNos.add(batchNo.toLowerCase());
        resultBatches.push({
          id: b.id || `bat_${batchNo}`,
          batchNo,
          quantity:
            typeof b.quantity === "number"
              ? b.quantity
              : typeof b.currentStock === "number"
                ? b.currentStock
                : undefined,
          costPrice: b.costPrice ? Number(b.costPrice) : undefined,
          sellingPrice: b.sellingPrice ? Number(b.sellingPrice) : undefined,
          expDate: b.expDate || b.expiryDate || undefined,
        });
      };

      if (Array.isArray(liveBatches) && liveBatches.length > 0) {
        liveBatches.forEach((b: any) => {
          const matchPid = b.productId && b.productId === productId;
          const matchSku =
            productCodeOrSku &&
            (b.sku === productCodeOrSku || b.productCode === productCodeOrSku);
          const matchName =
            productName &&
            b.productName &&
            b.productName.toLowerCase() === productName.toLowerCase();
          if (matchPid || matchSku || matchName) {
            addBatch(b);
          }
        });
      }

      if (Array.isArray(rawStockBatches) && rawStockBatches.length > 0) {
        rawStockBatches.forEach(addBatch);
      }

      const matchedStock = sourceStocks.find((s) => {
        return (
          (productId && (s.productId === productId || s.id === productId)) ||
          (productCodeOrSku && s.sku === productCodeOrSku) ||
          (productName &&
            s.productName &&
            s.productName.toLowerCase() === productName.toLowerCase())
        );
      });
      if (matchedStock && Array.isArray(matchedStock.batches)) {
        matchedStock.batches.forEach(addBatch);
      }

      if (resultBatches.length === 0) {
        const cleanName = (productName || "")
          .trim()
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase();
        const prefix = productCodeOrSku || cleanName.substring(0, 4) || "BAT";
        resultBatches.push({
          batchNo: `BAT-${prefix}-01`,
          quantity: matchedStock?.inStock ?? 10,
        });
      }

      return resultBatches;
    };

    // 1. Live Products from /commerce/products
    liveProducts.forEach((p) => {
      const pid = String(p.id || "");
      if (pid && !seenIds.has(pid)) {
        seenIds.add(pid);
        const sku = p.productCode || (p as any).sku || "";
        const name = p.productName || (p as any).name || "Unnamed Product";
        const batches = getBatchesForProduct(
          pid,
          sku,
          name,
          (p as any).stockBatches || (p as any).batches,
        );
        list.push({
          productId: pid,
          id: pid,
          productName: name,
          sku: sku,
          unitPrice: Number(
            p.salePrice ?? (p as any).sellingPrice ?? (p as any).unitPrice ?? 0,
          ),
          category: p.category || "",
          unit: p.unit || "PCS",
          taxPercent: extractTaxPercent(
            (p as any).taxRate ?? (p as any).taxPercent,
          ),
          hsnCode: p.hsnCode || "",
          imageUrl:
            (p as any).images?.[0] ||
            (p as any).image ||
            (p as any).imageUrl ||
            "",
          batches,
        });
      }
    });

    // 2. Live Stocks from /commerce/stocks
    sourceStocks.forEach((s) => {
      const pid = String(s.productId || s.id || "");
      if (pid && !seenIds.has(pid)) {
        seenIds.add(pid);
        const sku = s.sku || "";
        const name = s.productName || "Unnamed Product";
        const batches = getBatchesForProduct(pid, sku, name, s.batches);
        list.push({
          productId: pid,
          id: pid,
          productName: name,
          sku: sku,
          unitPrice: Number(s.unitPrice) || 0,
          category: s.category || "",
          unit: s.unit || "PCS",
          taxPercent: extractTaxPercent(
            (s as any).taxRate ?? (s as any).taxPercent,
          ),
          hsnCode: (s as any).hsnCode || "",
          imageUrl:
            (s as any).images?.[0] ||
            (s as any).image ||
            (s as any).imageUrl ||
            "",
          batches,
        });
      }
    });

    // 3. Fallback from store stocks if both lists are empty
    if (list.length === 0 && Array.isArray(stocks)) {
      stocks.forEach((s) => {
        const pid = String(s.productId || s.id || "");
        if (pid && !seenIds.has(pid)) {
          seenIds.add(pid);
          const sku = s.sku || "";
          const name = s.productName || "Unnamed Product";
          const batches = getBatchesForProduct(pid, sku, name, s.batches);
          list.push({
            productId: pid,
            id: pid,
            productName: name,
            sku: sku,
            unitPrice: Number(s.unitPrice) || 0,
            category: s.category || "",
            unit: s.unit || "PCS",
            taxPercent: extractTaxPercent(
              (s as any).taxRate ?? (s as any).taxPercent,
            ),
            hsnCode: (s as any).hsnCode || "",
            imageUrl:
              (s as any).images?.[0] ||
              (s as any).image ||
              (s as any).imageUrl ||
              "",
            batches,
          });
        }
      });
    }

    return list.filter((s) => {
      const pid = String(s.productId || s.id || "").trim();
      const name = String(s.productName || "").trim();
      if (!pid && !name) return false;
      if (pid.startsWith("mock_")) return false;
      return true;
    });
  }, [liveProducts, liveStocks, stocks, liveBatches]);

  // Filter products for the active row dropdown
  const matchingProducts = useMemo(() => {
    const q = productSearchQuery.toLowerCase().trim();
    if (!q) return availableProducts;
    return availableProducts.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        ((p as any).itemCode &&
          (p as any).itemCode.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)),
    );
  }, [availableProducts, productSearchQuery]);

  // Click outside to close product popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest(".proforma-product-cell") &&
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

  const productOptions = useMemo(() => {
    return availableProducts.map((s) => ({
      value: s.productId || s.id,
      label: s.productName,
      subLabel: s.sku ? `SKU: ${s.sku} • ₹${s.unitPrice}` : `₹${s.unitPrice}`,
      badge: s.sku || undefined,
    }));
  }, [availableProducts]);

  // Helper to build fresh clean proforma formData (no mock items, no canned defaults)
  const createDefaultFormData = (num: number = 1) => {
    const initialRows: ExtendedProformaItem[] = [
      {
        id: `row_${Date.now()}_1`,
        productId: "",
        productName: "",
        quantity: 1,
        unit: "NONE",
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        total: 0,
      },
    ];

    const todayIso = new Date().toISOString().split("T")[0];
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + 30);
    const validUntilIso = validUntilDate.toISOString().split("T")[0];

    return {
      customerId: "",
      partyName: "",
      customerPhone: "",
      customerEmail: "",
      customerCompany: "",
      billingAddress: "",
      proformaNo: "",
      referenceNo: "",
      date: todayIso,
      validUntil: validUntilIso,
      stateOfSupply: "33-Tamil Nadu",
      items: initialRows,
      notes: "",
      terms: "",
    };
  };

  // Initial Form Data
  const [formData, setFormData] = useState(() => createDefaultFormData(1));

  // Multi-tab support for proforma invoices
  const [activeTabId, setActiveTabId] = useState("tab_1");
  const [tabs, setTabs] = useState<ProformaTabItem[]>([
    {
      id: "tab_1",
      title: "New Proforma Invoice",
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
        (c.customerCode && c.customerCode.toLowerCase().includes(q)),
    );
  }, [availableCustomers, partySearchQuery]);

  // Form Initializer (Opens New Proforma Invoice)
  const handleOpenCreateForm = () => {
    const initialData = createDefaultFormData(1);
    const firstTab: ProformaTabItem = {
      id: "tab_1",
      title: "New Proforma Invoice",
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
    setActiveTabId("tab_1");
    setFormData(initialData);
    setValidUptoDays("30");
    setEditingProforma(null);
    setEnableRoundOff(true);
    setManualRoundOff(null);
    setViewMode("form");
  };

  // Add New Proforma Tab (clicks + button in tab bar)
  const handleAddNewTab = () => {
    const maxNum = tabs.reduce((max, t) => Math.max(max, t.num || 1), 0);
    const nextNum = Math.max(1, maxNum + 1);
    const newTabId = `tab_${Date.now()}`;
    const newFormData = createDefaultFormData(nextNum);
    const newTab: ProformaTabItem = {
      id: newTabId,
      title:
        tabs.length === 0
          ? "New Proforma Invoice"
          : `New Proforma Invoice ${tabs.length + 1}`,
      num: nextNum,
      formData: newFormData,
      editingProforma: null,
      enableRoundOff: true,
      manualRoundOff: null,
      columnSettings: { ...columnSettings },
    };

    setTabs((prev) => [
      ...prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              formData,
              editingProforma,
              enableRoundOff,
              manualRoundOff,
              columnSettings,
            }
          : t,
      ),
      newTab,
    ]);
    setActiveTabId(newTabId);
    setFormData(newFormData);
    setValidUptoDays("30");
    setEditingProforma(null);
    setEnableRoundOff(true);
    setManualRoundOff(null);
  };

  // Switch Active Tab
  const handleSelectTab = (tabId: string) => {
    if (tabId === activeTabId) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              formData,
              editingProforma,
              enableRoundOff,
              manualRoundOff,
              columnSettings,
            }
          : t,
      ),
    );
    const target = tabs.find((t) => t.id === tabId);
    if (target) {
      setActiveTabId(tabId);
      setFormData(target.formData);
      setEditingProforma(target.editingProforma || null);
      if (target.formData.date && target.formData.validUntil) {
        const d1 = new Date(target.formData.date).getTime();
        const d2 = new Date(target.formData.validUntil).getTime();
        const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        setValidUptoDays(diffDays > 0 ? String(diffDays) : "30");
      } else {
        setValidUptoDays("30");
      }
      if (target.enableRoundOff !== undefined)
        setEnableRoundOff(target.enableRoundOff);
      if (target.manualRoundOff !== undefined)
        setManualRoundOff(target.manualRoundOff);
      if (target.columnSettings !== undefined)
        setColumnSettings(target.columnSettings);
    }
  };

  // Close Tab
  const handleCloseTab = (e: React.MouseEvent, tabIdToClose: string) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      setViewMode("list");
      return;
    }
    const filtered = tabs.filter((t) => t.id !== tabIdToClose);
    setTabs(filtered);
    if (activeTabId === tabIdToClose) {
      const nextTab = filtered[filtered.length - 1];
      setActiveTabId(nextTab.id);
      setFormData(nextTab.formData);
      setEditingProforma(nextTab.editingProforma || null);
      if (nextTab.formData.date && nextTab.formData.validUntil) {
        const d1 = new Date(nextTab.formData.date).getTime();
        const d2 = new Date(nextTab.formData.validUntil).getTime();
        const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        setValidUptoDays(diffDays > 0 ? String(diffDays) : "30");
      } else {
        setValidUptoDays("30");
      }
      if (nextTab.enableRoundOff !== undefined)
        setEnableRoundOff(nextTab.enableRoundOff);
      if (nextTab.manualRoundOff !== undefined)
        setManualRoundOff(nextTab.manualRoundOff);
      if (nextTab.columnSettings !== undefined)
        setColumnSettings(nextTab.columnSettings);
    }
  };

  // Switch to Form Mode for Editing Proforma
  const handleOpenEditForm = (proforma: SaleProformaInvoice) => {
    const mappedItems: ExtendedProformaItem[] = proforma.items.map((it) => {
      const stockItem = availableProducts.find(
        (s) => s.productId === it.productId || s.productName === it.productName,
      );
      return {
        ...it,
        id: it.id || `row_${Date.now()}_${Math.random()}`,
        unit: it.unit || "PCS",
        discountPercent: it.discountPercent || 0,
        discountAmount:
          it.discountAmount ||
          (it.discountPercent
            ? (it.quantity * it.unitPrice * it.discountPercent) / 100
            : 0),
        taxPercent: it.taxPercent || 0,
        taxAmount:
          it.taxAmount ||
          (it.taxPercent
            ? ((it.quantity * it.unitPrice - (it.discountAmount || 0)) *
                it.taxPercent) /
              100
            : 0),
        category: it.category || (stockItem as any)?.category || "",
        itemCode: it.itemCode || stockItem?.sku || "",
        total: it.total || it.quantity * it.unitPrice,
      };
    });

    const editData = {
      customerId: proforma.customerId,
      partyName: proforma.partyName,
      customerPhone: proforma.customerPhone || "",
      customerEmail: proforma.customerEmail || "",
      customerCompany: proforma.customerCompany || "",
      billingAddress: proforma.billingAddress || "",
      proformaNo: proforma.proformaNo,
      referenceNo: proforma.referenceNo || "",
      date: proforma.date,
      validUntil: proforma.validUntil,
      stateOfSupply: proforma.stateOfSupply || "33-Tamil Nadu",
      items:
        mappedItems.length > 0 ? mappedItems : createDefaultFormData().items,
      notes: proforma.notes || "",
      terms: proforma.terms || "",
    };

    if (proforma.date && proforma.validUntil) {
      const d1 = new Date(proforma.date).getTime();
      const d2 = new Date(proforma.validUntil).getTime();
      const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      setValidUptoDays(diffDays > 0 ? String(diffDays) : "30");
    } else {
      setValidUptoDays("30");
    }

    setFormData(editData);
    setTabs([
      {
        id: "tab_1",
        title: proforma.proformaNo
          ? `Proforma ${proforma.proformaNo}`
          : "Edit Proforma",
        num: 1,
        formData: editData,
        editingProforma: proforma,
        enableRoundOff:
          proforma.roundOff !== undefined && proforma.roundOff !== 0,
        manualRoundOff: proforma.roundOff || null,
        columnSettings: { ...columnSettings },
      },
    ]);
    setActiveTabId("tab_1");
    setEditingProforma(proforma);
    setAttachedImageName(proforma.attachedImageName || null);
    setAttachedDocName(proforma.attachedDocName || null);
    setViewMode("form");
  };

  // Handler when a product is selected from dropdown popover or after creation
  const handleSelectProduct = (index: number, prod: any) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      item.productId = prod.productId || prod.id || "";
      item.productName = prod.productName || prod.name || "";
      item.sku = prod.sku || prod.productCode || "";
      item.itemCode = prod.sku || prod.productCode || "";
      item.category =
        prod.category || (prod as any).categoryName || item.category || "";
      item.unitPrice = Number(
        prod.unitPrice ?? prod.salePrice ?? prod.sellingPrice ?? 0,
      );
      if (prod.unit && prod.unit !== "NONE") {
        item.unit = prod.unit;
      } else if (!item.unit || item.unit === "NONE") {
        item.unit = "PCS";
      }
      if (prod.taxPercent !== undefined && prod.taxPercent !== null) {
        item.taxPercent = Number(prod.taxPercent);
      } else if (prod.taxRate && String(prod.taxRate).includes("@")) {
        const match = String(prod.taxRate).match(/@\s*(\d+)%/);
        if (match) item.taxPercent = Number(match[1]);
      }
      if (prod.hsnCode) {
        item.hsnCode = prod.hsnCode;
      }
      const productBatches = prod.batches || [];
      if (productBatches.length > 0 && !item.batch) {
        const firstActive =
          productBatches.find((b: any) => (b.quantity ?? 0) > 0) ||
          productBatches[0];
        item.batch = firstActive?.batchNo || "";
        if (firstActive?.sellingPrice) {
          item.unitPrice = Number(firstActive.sellingPrice);
        }
      }
      const isInclusive = priceTaxMode === "With Tax";
      const lineRes = calculateLineItem({
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        discountAmount: item.discountAmount,
        taxPercent: item.taxPercent || 0,
        isTaxInclusive: isInclusive,
      });
      item.discountAmount = lineRes.discountAmount;
      item.taxAmount = lineRes.taxAmount;
      item.total = lineRes.lineTotal;

      newItems[index] = item;
      return { ...prev, items: newItems };
    });
    setOpenProductDropdownRow(null);
  };

  // Row operations
  const handleAddRow = () => {
    const newRow: ExtendedProformaItem = {
      id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: "",
      productName: "",
      quantity: 1,
      unit: "NONE",
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
      toast.error("Proforma invoice must have at least one line item row.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Realtime Row Item change & auto-calculations
  const handleRowChange = (
    index: number,
    field: keyof ExtendedProformaItem,
    value: any,
  ) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };

      if (field === "productId") {
        const query = String(value).trim().toLowerCase();
        const prod = availableProducts.find(
          (s) =>
            s.productId === value ||
            s.id === value ||
            s.productName.toLowerCase() === query ||
            (s.sku && s.sku.toLowerCase() === query),
        );
        if (prod) {
          item.productId = prod.productId || prod.id;
          item.productName = prod.productName;
          item.sku = prod.sku;
          item.itemCode = prod.sku;
          item.category =
            (prod as any).category ||
            (prod as any).categoryName ||
            item.category ||
            "";
          item.unitPrice = Number(prod.unitPrice) || 0;
          if (prod.unit && prod.unit !== "NONE") {
            item.unit = prod.unit;
          } else if (!item.unit || item.unit === "NONE") {
            item.unit = "PCS";
          }
          if (prod.taxPercent !== undefined && prod.taxPercent !== null) {
            item.taxPercent = prod.taxPercent;
          }
          if (prod.hsnCode) {
            item.hsnCode = prod.hsnCode;
          }
          const productBatches = (prod as any).batches || [];
          if (productBatches.length > 0 && !item.batch) {
            const firstActive =
              productBatches.find((b: any) => (b.quantity ?? 0) > 0) ||
              productBatches[0];
            item.batch = firstActive?.batchNo || "";
            if (firstActive?.sellingPrice) {
              item.unitPrice = Number(firstActive.sellingPrice);
            }
          }
        }
      } else if (field === "productName") {
        const query = String(value).trim().toLowerCase();
        const matched = availableProducts.find(
          (s) =>
            s.productName.toLowerCase() === query ||
            (s.sku && s.sku.toLowerCase() === query) ||
            s.productId === value ||
            s.id === value,
        );
        if (matched) {
          item.productId =
            matched.productId || matched.id || item.productId || "";
          item.productName = matched.productName;
          item.sku = matched.sku;
          item.itemCode = matched.sku;
          item.category =
            (matched as any).category ||
            (matched as any).categoryName ||
            item.category ||
            "";
          item.unitPrice = Number(matched.unitPrice) || 0;
          if (matched.unit && matched.unit !== "NONE") {
            item.unit = matched.unit;
          } else if (!item.unit || item.unit === "NONE") {
            item.unit = "PCS";
          }
          if (matched.taxPercent !== undefined && matched.taxPercent !== null) {
            item.taxPercent = matched.taxPercent;
          }
          if (matched.hsnCode) {
            item.hsnCode = matched.hsnCode;
          }
          const productBatches = (matched as any).batches || [];
          if (productBatches.length > 0 && !item.batch) {
            const firstActive =
              productBatches.find((b: any) => (b.quantity ?? 0) > 0) ||
              productBatches[0];
            item.batch = firstActive?.batchNo || "";
            if (firstActive?.sellingPrice) {
              item.unitPrice = Number(firstActive.sellingPrice);
            }
          }
        }
      } else if (field === "itemCode" || field === "sku") {
        const query = String(value).trim().toLowerCase();
        const matched = availableProducts.find(
          (s) =>
            (s.sku && s.sku.toLowerCase() === query) ||
            s.productName.toLowerCase() === query,
        );
        if (matched) {
          item.productId =
            matched.productId || matched.id || item.productId || "";
          item.productName = matched.productName;
          item.sku = matched.sku;
          item.itemCode = matched.sku;
          item.category =
            (matched as any).category ||
            (matched as any).categoryName ||
            item.category ||
            "";
          item.unitPrice = Number(matched.unitPrice) || 0;
          if (matched.unit && matched.unit !== "NONE") {
            item.unit = matched.unit;
          } else if (!item.unit || item.unit === "NONE") {
            item.unit = "PCS";
          }
          if (matched.taxPercent !== undefined && matched.taxPercent !== null) {
            item.taxPercent = matched.taxPercent;
          }
          if (matched.hsnCode) {
            item.hsnCode = matched.hsnCode;
          }
          const productBatches = (matched as any).batches || [];
          if (productBatches.length > 0 && !item.batch) {
            const firstActive =
              productBatches.find((b: any) => (b.quantity ?? 0) > 0) ||
              productBatches[0];
            item.batch = firstActive?.batchNo || "";
            if (firstActive?.sellingPrice) {
              item.unitPrice = Number(firstActive.sellingPrice);
            }
          }
        }
      } else if (field === "batch") {
        item.batch = String(value || "");
        const query = String(item.productName || "")
          .trim()
          .toLowerCase();
        const matched = availableProducts.find(
          (s) =>
            (item.productId &&
              (s.productId === item.productId || s.id === item.productId)) ||
            (query && s.productName.toLowerCase() === query),
        );
        if (matched && (matched as any).batches) {
          const selectedBatch = (matched as any).batches.find(
            (b: any) => b.batchNo === value,
          );
          if (selectedBatch && selectedBatch.sellingPrice) {
            item.unitPrice = Number(selectedBatch.sellingPrice);
          }
        }
      }

      const isInclusive = priceTaxMode === "With Tax";
      const rawDiscPct =
        field === "discountPercent"
          ? Number(value)
          : field === "discountAmount"
            ? 0
            : item.discountPercent;
      const rawDiscAmt =
        field === "discountAmount"
          ? Number(value)
          : field === "discountPercent"
            ? 0
            : item.discountAmount;

      const lineRes = calculateLineItem(
        {
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: rawDiscPct,
          discountAmount: rawDiscAmt,
          taxPercent: item.taxPercent,
          isTaxInclusive: isInclusive,
        },
        {
          withGst: true,
          gstType: determineGstType(prev.stateOfSupply),
        },
      );

      item.quantity = lineRes.quantity;
      item.unitPrice = lineRes.unitPrice;
      item.discountPercent = lineRes.discountPercent;
      item.discountAmount = lineRes.discountAmount;
      item.taxPercent = lineRes.taxPercent;
      item.taxAmount = lineRes.taxAmount;
      item.total = lineRes.lineTotal;

      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  // Form Totals Calculation using Centralized Financial Calculation Engine
  const formCalculations = useMemo(() => {
    const isInclusive = priceTaxMode === "With Tax";
    const docTotals = calculateDocumentTotals({
      items: formData.items.map((it) => ({
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent,
        discountAmount: it.discountAmount,
        taxPercent: it.taxPercent,
        isTaxInclusive: isInclusive,
      })),
      withGst: true,
      stateOfSupply: formData.stateOfSupply,
      roundMode: enableRoundOff ? "auto" : "none",
      manualRoundOff: manualRoundOff,
    });

    return {
      totalQty: docTotals.totalQty,
      rawSubtotal: docTotals.subtotal,
      totalDiscount: docTotals.totalDiscount,
      taxableAmount: docTotals.taxableAmount,
      totalTax: docTotals.totalTax,
      cgst: docTotals.cgst,
      sgst: docTotals.sgst,
      igst: docTotals.igst,
      lineAmountTotal: docTotals.unroundedTotal,
      roundOffDiff: docTotals.roundOff,
      grandTotal: docTotals.grandTotal,
    };
  }, [
    formData.items,
    formData.stateOfSupply,
    priceTaxMode,
    enableRoundOff,
    manualRoundOff,
  ]);

  // Save Proforma Invoice Handler
  const handleSaveProforma = async (andConvert = false) => {
    if (!formData.partyName.trim()) {
      toast.error("Please select or enter Customer name");
      return;
    }
    const validItems = formData.items.filter(
      (it) => it.productName.trim() || Number(it.unitPrice) > 0,
    );
    if (validItems.length === 0) {
      toast.error("Please add at least one line item with name and rate");
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
    if (formCalculations.grandTotal < 0) {
      toast.error("Grand total cannot be negative.");
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
            (p.productId &&
              UUID_REGEX.test(p.productId) &&
              p.productName.toLowerCase() ===
                it.productName.trim().toLowerCase()) ||
            (p.id &&
              UUID_REGEX.test(p.id) &&
              p.productName.toLowerCase() ===
                it.productName.trim().toLowerCase()),
        );
        if (match) {
          pid =
            match.productId && UUID_REGEX.test(match.productId)
              ? match.productId
              : match.id;
        }
      }

      // 2. If still not a valid UUID, try auto-creating the product via productApi to get a real Commerce UUID
      if (!pid || !UUID_REGEX.test(pid)) {
        try {
          const createProdRes = await productApi.createProduct({
            itemType: "Product",
            productName: it.productName.trim() || "Custom Item",
            salePrice: Number(it.unitPrice) || 0,
            salePriceTaxType: "Excluded",
            unit: it.unit && it.unit !== "NONE" ? it.unit : "PCS",
            category: it.category || "General",
          });
          if (
            createProdRes.data?.id &&
            UUID_REGEX.test(createProdRes.data.id)
          ) {
            pid = createProdRes.data.id;
          }
        } catch (createErr) {
          console.warn("Auto-create product fallback notice:", createErr);
        }
      }

      if (!pid || !UUID_REGEX.test(pid)) {
        toast.error(
          `Please select a registered product for "${it.productName || "line item"}".`,
        );
        return;
      }

      resolvedItems.push({
        ...it,
        productId: pid,
      });
    }

    const { rawSubtotal, totalTax, totalDiscount, roundOffDiff, grandTotal } =
      formCalculations;

    const proformaId = editingProforma
      ? editingProforma.id
      : `pro_${Date.now()}`;
    const newProforma: SaleProformaInvoice = {
      id: proformaId,
      proformaNo:
        formData.proformaNo ||
        `PRO-${new Date().getFullYear()}-${String((totalApiRecords ?? proformaList.length) + 1).padStart(4, "0")}`,
      referenceNo: formData.referenceNo || "1",
      date: formData.date,
      validUntil: formData.validUntil,
      customerId: formData.customerId || "",
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
      gstType: formData.stateOfSupply?.includes("Tamil Nadu")
        ? "intra_state"
        : "inter_state",
      cgst: totalTax / 2,
      sgst: totalTax / 2,
      igst: 0,
      discount: totalDiscount,
      taxAmount: totalTax,
      roundOff: roundOffDiff,
      amount: grandTotal,
      balance: grandTotal,
      status: andConvert
        ? "Converted"
        : editingProforma
          ? editingProforma.status
          : "Open",
      convertedToInvoiceNo: andConvert
        ? `INV-${new Date().getFullYear()}-010${proformaList.length + 5}`
        : undefined,
      convertedAt: andConvert
        ? new Date().toISOString()
        : editingProforma
          ? (editingProforma as any).convertedAt
          : undefined,
      notes: formData.notes,
      terms: formData.terms,
      attachedImageName: attachedImageName || undefined,
      attachedDocName: attachedDocName || undefined,
      createdAt: editingProforma
        ? editingProforma.createdAt
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      const isEditing = Boolean(editingProforma && editingProforma.id);
      const payload = mapSaleProformaToPayload(newProforma, !isEditing);
      let targetProformaId = proformaId;

      if (editingProforma) {
        const res = await commerceProformaApi.updateProforma(
          editingProforma.id,
          payload,
        );
        if (res.data?.id) targetProformaId = res.data.id;
        toast.success(
          `Proforma Invoice ${newProforma.proformaNo} updated successfully!`,
        );
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
        toast.success(
          `Proforma Invoice ${newProforma.proformaNo} created successfully!`,
        );
      }

      dispatch(baseApi.util.invalidateTags([{ type: "Proforma", id: "LIST" }]));

      if (andConvert) {
        try {
          const convRes = await commerceProformaApi.convertProforma(
            targetProformaId,
            {
              targetType: "Invoice",
              dueDate: newProforma.validUntil,
            },
          );
          const convertedNo = convRes.data?.convertedTo?.documentNo;
          newProforma.status = "Converted";
          newProforma.convertedAt = new Date().toISOString();
          if (convertedNo) newProforma.convertedToInvoiceNo = convertedNo;
          toast.success(
            `Proforma converted to Sale Invoice ${convertedNo || ""}!`,
          );
        } catch (convErr: any) {
          console.warn("API convert notice:", convErr);
          toast.info(
            "Proforma saved. Conversion can be finalized from actions menu.",
          );
        }
      }

      // Also persist to local cache for offline resiliency
      let updatedList: SaleProformaInvoice[];
      if (editingProforma) {
        updatedList = proformaList.map((p) =>
          p.id === proformaId ? newProforma : p,
        );
      } else {
        updatedList = [newProforma, ...proformaList];
      }
      persistProformas(updatedList);

      // Re-fetch live list from Commerce API
      fetchProformas(
        page,
        pageSize,
        appliedSearch,
        appliedStatus,
        appliedPeriod,
      );

      if (tabs.length > 1) {
        const remainingTabs = tabs.filter((t) => t.id !== activeTabId);
        setTabs(remainingTabs);
        const nextActive = remainingTabs[remainingTabs.length - 1];
        setActiveTabId(nextActive.id);
        setFormData(nextActive.formData);
        setEditingProforma(nextActive.editingProforma || null);
        if (nextActive.enableRoundOff !== undefined)
          setEnableRoundOff(nextActive.enableRoundOff);
        if (nextActive.manualRoundOff !== undefined)
          setManualRoundOff(nextActive.manualRoundOff);
        if (nextActive.columnSettings !== undefined)
          setColumnSettings(nextActive.columnSettings);
      } else {
        setViewMode("list");
      }
    } catch (err: any) {
      console.error("Failed to save proforma invoice:", err);
      const apiErr = err.response?.data?.error || err.data?.error || err;
      const fieldMsg =
        Array.isArray(apiErr.fields) && apiErr.fields.length > 0
          ? `${apiErr.message || "Validation error"}: ${apiErr.fields.map((f: any) => `${f.path?.join(".") || "field"} - ${f.message}`).join(", ")}`
          : apiErr.message ||
            err.message ||
            "Failed to save proforma invoice to server. Saved in offline storage.";
      toast.error(fieldMsg);
      let updatedList: SaleProformaInvoice[];
      if (editingProforma) {
        updatedList = proformaList.map((p) =>
          p.id === proformaId ? newProforma : p,
        );
      } else {
        updatedList = [newProforma, ...proformaList];
      }
      persistProformas(updatedList);
      if (tabs.length > 1) {
        const remainingTabs = tabs.filter((t) => t.id !== activeTabId);
        setTabs(remainingTabs);
      } else {
        setViewMode("list");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine conversion status across all next stages
  const getProformaStages = (proforma: SaleProformaInvoice) => {
    const proformaNoClean = proforma.proformaNo?.trim();
    const lineage = proformaNoClean
      ? findDocumentLineage(proformaNoClean, "Proforma")
      : undefined;

    const isInvoiceConverted = Boolean(
      lineage?.invoiceNo ||
      lineage?.invoiceId ||
      (proforma.status === "Converted" &&
        proforma.convertedToInvoiceNo &&
        proforma.convertedToInvoiceNo.startsWith("INV-")),
    );

    const isOrderConverted = Boolean(
      lineage?.orderNo ||
      lineage?.orderId ||
      (proforma.status === "Converted" &&
        proforma.convertedToInvoiceNo &&
        (proforma.convertedToInvoiceNo.startsWith("SO-") ||
          proforma.convertedToInvoiceNo.startsWith("ORD-"))),
    );

    const isChallanConverted = Boolean(
      lineage?.challanNo ||
      lineage?.challanId ||
      (proforma.status === "Converted" &&
        proforma.convertedToInvoiceNo &&
        (proforma.convertedToInvoiceNo.startsWith("DC-") ||
          proforma.convertedToInvoiceNo.startsWith("CHAL-"))),
    );

    const availableStages = [
      {
        type: "Order" as const,
        label: "Sale Order",
        isConverted: isOrderConverted,
      },
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

    const isFullyConverted =
      isInvoiceConverted ||
      (proforma.status === "Converted" &&
        !isOrderConverted &&
        !isChallanConverted) ||
      availableStages.length === 0;

    return {
      lineage,
      isInvoiceConverted,
      isOrderConverted,
      isChallanConverted,
      availableStages,
      availableCount: availableStages.length,
      isFullyConverted,
    };
  };

  // Convert Existing Proforma -> Opens New Sale Invoice page with calculations
  const handleConvertExistingToSale = async (proforma: SaleProformaInvoice) => {
    const stages = getProformaStages(proforma);
    if (stages.isFullyConverted || stages.isInvoiceConverted) {
      toast.info(
        `Proforma ${proforma.proformaNo} has already been converted to an invoice.`,
      );
      return;
    }
    setActiveConvertDropdownId(null);
    setConvertDropdownPos(null);

    navigate("/sale-management/sales/sale", {
      state: {
        convertFrom: {
          sourceType: "Proforma",
          sourceId: proforma.id,
          sourceNo: proforma.proformaNo,
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
          discount: proforma.discount || 0,
          totalDiscount: proforma.discount || 0,
          taxAmount: proforma.taxAmount || 0,
          grandTotal: proforma.amount,
          paidAmount: 0,
          paymentMethod: "Bank Transfer",
          paymentTerms: "15 Days",
          dueDate: proforma.validUntil,
          notes: `Converted from Proforma Invoice ${proforma.proformaNo}`,
        },
      },
    });
  };

  // Convert Existing Proforma to Sale Order (Directly creates Order and updates Proforma status)
  const handleConvertExistingToOrder = async (
    proforma: SaleProformaInvoice,
  ) => {
    const stages = getProformaStages(proforma);
    if (stages.isFullyConverted || stages.isOrderConverted) {
      toast.info(`Proforma ${proforma.proformaNo} already has a Sale Order.`);
      return;
    }
    try {
      const currentLineage = findDocumentLineage(proforma.proformaNo);
      const upstreamQuotationNo = currentLineage?.estimateNo;

      const existingOrders: SaleOrderRecord[] = JSON.parse(
        localStorage.getItem("yaa_crm_sale_orders") || "[]",
      );
      let convertedNo =
        currentLineage?.orderNo ||
        `SO-${new Date().getFullYear()}-${String(existingOrders.length + 1).padStart(4, "0")}`;

      const newOrder: SaleOrderRecord = {
        id: `so_${Date.now()}`,
        orderNo: convertedNo,
        referenceNo: proforma.proformaNo,
        orderDate: new Date().toISOString().split("T")[0],
        dueDate:
          proforma.validUntil ||
          new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        customerId: proforma.customerId,
        partyName: proforma.partyName,
        customerPhone: proforma.customerPhone,
        customerEmail: proforma.customerEmail,
        customerCompany: proforma.customerCompany,
        billingAddress: proforma.billingAddress,
        shippingAddress: proforma.shippingAddress || proforma.billingAddress,
        stateOfSupply: proforma.stateOfSupply,
        paymentType: "Credit",
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
          unit: it.unit || "pcs",
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
        status: "Open",
        notes: `Converted from Proforma Invoice ${proforma.proformaNo}${upstreamQuotationNo ? ` (Origin: ${upstreamQuotationNo})` : ""}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const payload = mapSaleOrderRecordToPayload(newOrder, true);
        const orderRes = await commerceSaleOrderApi.createOrder(payload);
        if (orderRes.data?.orderNo) {
          convertedNo = orderRes.data.orderNo;
          newOrder.orderNo = convertedNo;
          if (orderRes.data.id) newOrder.id = orderRes.data.id;
        }
      } catch (orderApiErr) {
        console.warn("API order creation notice:", orderApiErr);
      }

      // Proforma invoices can only be converted to Invoice via /convert API.
      // For converting to Order, update status to Converted via PATCH /commerce/proformas/{id}/status
      if (UUID_REGEX.test(proforma.id)) {
        try {
          await commerceProformaApi.updateStatus(proforma.id, "Converted");
        } catch (statusErr) {
          console.warn("API proforma updateStatus notice:", statusErr);
        }
      }

      syncConvertedOrderToStorage(newOrder);

      recordDocumentConversion({
        fromType: "Proforma",
        fromNo: proforma.proformaNo,
        toType: "Order",
        toNo: convertedNo,
      });

      syncProformaStatusInStorage(
        proforma.proformaNo,
        "Converted",
        convertedNo,
      );

      dispatch(
        baseApi.util.invalidateTags([
          { type: "Proforma", id: proforma.id },
          { type: "Proforma", id: "LIST" },
          { type: "SalesOrder", id: "LIST" },
        ]),
      );

      const convertedTimestamp = new Date().toISOString();
      const updated = proformaList.map((p) =>
        p.id === proforma.id || p.proformaNo === proforma.proformaNo
          ? {
              ...p,
              status: "Converted" as const,
              convertedToInvoiceNo: convertedNo,
              convertedAt: convertedTimestamp,
            }
          : p,
      );
      setLiveProformas((prev) =>
        prev.map((p) =>
          p.id === proforma.id || p.proformaNo === proforma.proformaNo
            ? {
                ...p,
                status: "Converted" as const,
                convertedToInvoiceNo: convertedNo,
                convertedAt: convertedTimestamp,
              }
            : p,
        ),
      );
      persistProformas(updated);

      toast.success(
        `Proforma ${proforma.proformaNo} converted to Sale Order ${convertedNo}!`,
      );
      fetchProformas(
        page,
        pageSize,
        appliedSearch,
        appliedStatus,
        appliedPeriod,
      );
    } catch (err: any) {
      console.error("API convert to order fallback error:", err);
      toast.error("Failed to convert proforma to sale order");
    } finally {
      setActiveConvertDropdownId(null);
      setConvertDropdownPos(null);
    }
  };

  // Convert Existing Proforma to Delivery Challan
  const handleConvertExistingToChallan = async (
    proforma: SaleProformaInvoice,
  ) => {
    const stages = getProformaStages(proforma);
    if (stages.isFullyConverted || stages.isChallanConverted) {
      toast.info(
        `Proforma ${proforma.proformaNo} already has a Delivery Challan or is fully converted.`,
      );
      return;
    }
    try {
      const currentLineage = findDocumentLineage(proforma.proformaNo);
      const existingChallans = JSON.parse(
        localStorage.getItem("yaa_crm_delivery_challans") || "[]",
      );
      const convertedNo =
        currentLineage?.challanNo ||
        `DC-${new Date().getFullYear()}-${String(existingChallans.length + 1).padStart(4, "0")}`;

      const newChallan: DeliveryChallanRecord = {
        id: `dc_${Date.now()}`,
        challanNo: convertedNo,
        referenceNo: proforma.proformaNo,
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate:
          proforma.validUntil ||
          new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        customerId: proforma.customerId,
        customerCode: proforma.customerCode || undefined,
        partyName: proforma.partyName,
        customerPhone: proforma.customerPhone,
        customerEmail: proforma.customerEmail,
        customerCompany: proforma.customerCompany,
        billingAddress: proforma.billingAddress,
        shippingAddress: proforma.shippingAddress || proforma.billingAddress,
        stateOfSupply: proforma.stateOfSupply,
        items: proforma.items.map((it) => ({
          id: it.id || `item_${Date.now()}_${Math.random()}`,
          productId: it.productId,
          productName: it.productName,
          sku: it.sku,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxPercent: it.taxPercent || 0,
          discountPercent: it.discountPercent || 0,
          total: it.total,
          unit: it.unit || "PCS",
        })),
        subtotal: proforma.subtotal,
        withGst: proforma.withGst,
        gstType: proforma.gstType,
        cgst: proforma.cgst,
        sgst: proforma.sgst,
        igst: proforma.igst,
        taxAmount: proforma.taxAmount,
        discount: proforma.discount,
        roundOff: proforma.roundOff,
        amount: proforma.amount,
        balance: proforma.balance ?? proforma.amount,
        status: "Open",
        notes: `Converted from Proforma Invoice ${proforma.proformaNo}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const payload = mapDeliveryChallanRecordToPayload(newChallan, true);
        const res = await commerceDeliveryChallanApi.createChallan(payload);
        if (res?.data?.challanNo) newChallan.challanNo = res.data.challanNo;
      } catch (cErr) {
        console.warn("Backend createChallan notice:", cErr);
      }

      syncConvertedChallanToStorage(newChallan);
      recordDocumentConversion({
        fromType: "Proforma",
        fromId: proforma.id,
        fromNo: proforma.proformaNo,
        toType: "Challan",
        toId: newChallan.id,
        toNo: newChallan.challanNo,
        partyName: proforma.partyName,
        customerId: proforma.customerId,
        grandTotal: proforma.amount,
      });

      toast.success(
        `Proforma ${proforma.proformaNo} converted to Delivery Challan ${newChallan.challanNo}!`,
      );
      fetchProformas(
        page,
        pageSize,
        appliedSearch,
        appliedStatus,
        appliedPeriod,
      );
    } catch (err: any) {
      console.error("API convert to challan error:", err);
      toast.error("Failed to convert proforma to delivery challan");
    } finally {
      setActiveConvertDropdownId(null);
      setConvertDropdownPos(null);
    }
  };

  // Duplicate Proforma (POST /commerce/proformas)
  const handleDuplicateProforma = async (proforma: SaleProformaInvoice) => {
    const nextNum = (totalApiRecords ?? proformaList.length) + 1;
    const newProformaNo = `PRO-${new Date().getFullYear()}-${String(nextNum).padStart(4, "0")}`;
    const duplicated: SaleProformaInvoice = {
      ...proforma,
      id: `pro_${Date.now()}`,
      proformaNo: newProformaNo,
      referenceNo: String(nextNum),
      date: new Date().toISOString().split("T")[0],
      status: "Open",
      convertedToInvoiceNo: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const resolvedItems = duplicated.items.map((it) => {
      let pid = it.productId;
      if (!pid || !UUID_REGEX.test(pid)) {
        const match = availableProducts.find(
          (p) =>
            (p.productId &&
              UUID_REGEX.test(p.productId) &&
              p.productName.toLowerCase() ===
                it.productName.trim().toLowerCase()) ||
            (p.id &&
              UUID_REGEX.test(p.id) &&
              p.productName.toLowerCase() ===
                it.productName.trim().toLowerCase()),
        );
        if (match) {
          pid =
            match.productId && UUID_REGEX.test(match.productId)
              ? match.productId
              : match.id;
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
      dispatch(baseApi.util.invalidateTags([{ type: "Proforma", id: "LIST" }]));
      toast.success(
        `Duplicated ${proforma.proformaNo} as new Proforma ${duplicated.proformaNo || newProformaNo}!`,
      );
    } catch (err: any) {
      console.warn("Duplicate API notice:", err);
      toast.info(`Duplicated ${proforma.proformaNo} locally.`);
    } finally {
      const updated = [duplicated, ...proformaList];
      persistProformas(updated);
      fetchProformas(
        page,
        pageSize,
        appliedSearch,
        appliedStatus,
        appliedPeriod,
      );
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
      dispatch(
        baseApi.util.invalidateTags([
          { type: "Proforma", id: deleteTargetProforma.id },
          { type: "Proforma", id: "LIST" },
        ]),
      );
      const updated = proformaList.filter(
        (p) => p.id !== deleteTargetProforma.id,
      );
      persistProformas(updated);
      toast.success(
        `Proforma invoice "${deleteTargetProforma.proformaNo}" deleted successfully.`,
      );
      setIsDeleteModalOpen(false);
      setDeleteTargetProforma(null);
      fetchProformas(
        page,
        pageSize,
        appliedSearch,
        appliedStatus,
        appliedPeriod,
      );
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete proforma invoice.";
      setDeleteProformaError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeletingProforma(false);
    }
  };

  // Update Status Handler (PATCH /commerce/proformas/{id}/status)
  const handleUpdateStatus = async (
    id: string,
    newStatus: "Open" | "Cancelled",
  ) => {
    try {
      await commerceProformaApi.updateStatus(id, { status: newStatus });
      dispatch(
        baseApi.util.invalidateTags([
          { type: "Proforma", id },
          { type: "Proforma", id: "LIST" },
        ]),
      );
      toast.success(`Proforma invoice marked as ${newStatus}!`);
    } catch (err: any) {
      console.warn("Status update API error:", err);
      toast.info(`Proforma status updated to ${newStatus}.`);
    } finally {
      const updated = proformaList.map((p) =>
        p.id === id ? { ...p, status: newStatus } : p,
      );
      persistProformas(updated);
      fetchProformas(
        page,
        pageSize,
        appliedSearch,
        appliedStatus,
        appliedPeriod,
      );
      setActiveDropdownId(null);
      setDropdownPos(null);
    }
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const buildProformaDocumentOptions = (
    proforma: SaleProformaInvoice,
  ): DocumentPrintOptions => ({
    docTypeTitle: "PROFORMA INVOICE",
    docNo: proforma.proformaNo,
    docDate: isoToDdmmyyyy(proforma.date),
    dueDate: isoToDdmmyyyy(proforma.validUntil),
    status: proforma.status,
    statusColor:
      proforma.status === "Converted"
        ? "emerald"
        : proforma.status === "Cancelled"
          ? "rose"
          : "purple",
    companyName: companyProfile.companyName || "YAA CREATIONS CRM",
    companySubtitle: companyProfile.companySubtitle || "Enterprise Sales Hub",
    companyAddress: companyProfile.companyAddress || undefined,
    companyGstin: companyProfile.companyGstin || undefined,
    companyPhone: companyProfile.companyPhone || undefined,
    companyEmail: companyProfile.companyEmail || undefined,
    partyTitle: "Billed To",
    partyName: proforma.partyName,
    partyCompany: proforma.customerCompany,
    partyPhone: proforma.customerPhone,
    partyAddress: proforma.billingAddress,
    extraMeta: [
      {
        label: "State of Supply",
        value: proforma.stateOfSupply || "Tamil Nadu",
      },
      ...(proforma.convertedToInvoiceNo
        ? [{ label: "Converted Ref", value: proforma.convertedToInvoiceNo }]
        : []),
    ],
    items: (proforma.items || []).map((it) => ({
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

  // Print Proforma Invoice
  const handlePrintProforma = (proforma: SaleProformaInvoice) => {
    printBusinessDocument(buildProformaDocumentOptions(proforma));
  };

  // Download Proforma Invoice as valid PDF
  const handleDownloadProforma = async (proforma: SaleProformaInvoice) => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const toastId = `dl-prof-${proforma.id}`;
    toast.loading(`Preparing PDF for Proforma ${proforma.proformaNo}...`, {
      id: toastId,
    });
    try {
      const options = buildProformaDocumentOptions(proforma);
      await downloadBusinessDocument(
        options,
        `Proforma_${proforma.proformaNo.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
      );
      toast.success(
        `Proforma ${proforma.proformaNo} downloaded successfully!`,
        { id: toastId },
      );
    } catch (err: any) {
      console.error("Proforma download error:", err);
      toast.error("Failed to download proforma invoice PDF.", { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Displayed Proforma Invoices: Live API data merged with local cache and cross-module lineage
  const displayProformas = useMemo(() => {
    const baseList = isApiConnected ? liveProformas : proformaList;
    const mergedList = baseList.map((item) => {
      const localMatch = proformaList.find(
        (p) => p.id === item.id || p.proformaNo === item.proformaNo,
      );
      const lineage = findDocumentLineage(item.proformaNo);
      const isConvertedInLineage = Boolean(
        lineage && (lineage.orderNo || lineage.invoiceNo),
      );
      const effectiveStatus =
        isConvertedInLineage ||
        localMatch?.status === "Converted" ||
        item.status === "Converted"
          ? ("Converted" as const)
          : item.status;
      const resolvedConvAt = resolveDocumentConvertedAt("Proforma", item);
      return {
        ...item,
        status: effectiveStatus,
        convertedToInvoiceNo:
          localMatch?.convertedToInvoiceNo ||
          lineage?.orderNo ||
          lineage?.invoiceNo ||
          item.convertedToInvoiceNo,
        convertedAt:
          (item as any).convertedAt ||
          (localMatch as any)?.convertedAt ||
          resolvedConvAt ||
          undefined,
      };
    });

    // When API is connected, show strictly the live API list; only fallback to extra locals if offline
    const combined = isApiConnected
      ? mergedList
      : (() => {
          const seenNos = new Set(mergedList.map((p) => p.proformaNo));
          const extraLocals = proformaList
            .filter((p) => !seenNos.has(p.proformaNo))
            .map((item) => {
              const lineage = findDocumentLineage(item.proformaNo);
              const isConvertedInLineage = Boolean(
                lineage && (lineage.orderNo || lineage.invoiceNo),
              );
              const resolvedConvAt = resolveDocumentConvertedAt(
                "Proforma",
                item,
              );
              return {
                ...item,
                status:
                  isConvertedInLineage || item.status === "Converted"
                    ? ("Converted" as const)
                    : item.status,
                convertedToInvoiceNo:
                  item.convertedToInvoiceNo ||
                  lineage?.orderNo ||
                  lineage?.invoiceNo,
                convertedAt:
                  (item as any).convertedAt || resolvedConvAt || undefined,
              };
            });
          return [...extraLocals, ...mergedList];
        })();

    return combined.filter((p) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.proformaNo.toLowerCase().includes(q) ||
        p.partyName.toLowerCase().includes(q) ||
        (p.customerPhone && p.customerPhone.toLowerCase().includes(q)) ||
        (p.customerCompany && p.customerCompany.toLowerCase().includes(q)) ||
        p.items.some((it) => it.productName.toLowerCase().includes(q));

      const matchesStatus =
        appliedStatus === "ALL" || p.status === appliedStatus;
      const matchesPeriod = checkDateMatchesPeriod(p.date, appliedPeriod);
      return matchesSearch && matchesStatus && matchesPeriod;
    });
  }, [
    isApiConnected,
    liveProformas,
    proformaList,
    appliedSearch,
    appliedStatus,
    appliedPeriod,
  ]);

  // Metrics Calculation
  const metrics = useMemo(() => {
    const list = displayProformas;
    let totalVal = 0;
    let convertedVal = 0;
    let openVal = 0;

    list.forEach((p) => {
      totalVal += Number(p.amount) || 0;
      if (p.status === "Converted") {
        convertedVal += Number(p.amount) || 0;
      } else if (p.status === "Open") {
        openVal += Number(p.amount) || 0;
      }
    });

    return {
      totalVal,
      convertedVal,
      openVal,
      totalCount:
        isApiConnected && totalApiRecords !== null
          ? totalApiRecords
          : list.length,
    };
  }, [displayProformas, isApiConnected, totalApiRecords]);

  // Paginated list
  const totalPages = Math.max(
    1,
    Math.ceil(
      (isApiConnected && totalApiRecords !== null
        ? totalApiRecords
        : displayProformas.length) / pageSize,
    ),
  );
  const safePage = Math.min(page, totalPages);
  const paginatedProformas = useMemo(() => {
    if (displayProformas.length > pageSize) {
      const start = (safePage - 1) * pageSize;
      return displayProformas.slice(start, start + pageSize);
    }
    return displayProformas;
  }, [displayProformas, safePage, pageSize]);

  // Close dropdowns on outside click and scroll/resize
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".proforma-action-dropdown-menu") &&
        !target.closest(".proforma-action-btn") &&
        !target.closest(".proforma-convert-dropdown-menu") &&
        !target.closest(".proforma-convert-btn")
      ) {
        setActiveDropdownId(null);
        setActiveConvertDropdownId(null);
        setDropdownPos(null);
        setConvertDropdownPos(null);
      }
      if (partySelectRef.current && !partySelectRef.current.contains(target)) {
        setPartySearchOpen(false);
      }
      if (!target.closest(".proforma-share-footer-container")) {
        setShowShareFooterMenu(false);
      }
      if (
        !target.closest(".table-column-customize-popover") &&
        !target.closest(".table-column-customize-btn")
      ) {
        setShowColumnCustomizePopover(false);
      }
    };
    const handleScrollOrResize = () => {
      setActiveDropdownId(null);
      setActiveConvertDropdownId(null);
      setDropdownPos(null);
      setConvertDropdownPos(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, []);

  // =========================================================================
  // VIEW MODE: FULL SCREEN CREATE / EDIT FORM (MATCHING ESTIMATE/QUOTATION UI)
  // =========================================================================
  if (viewMode === "form") {
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
                      ? "bg-white text-[#33077C] border-slate-200 border-b-white shadow-xs font-bold ring-1 ring-[#33077C]/10"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 border-transparent"
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
              <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                {editingProforma ? (
                  <>
                    <span>Edit Proforma</span>
                    <span className="font-extrabold text-[#33077C] font-mono text-xs sm:text-[13px] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/80 shadow-2xs">
                      {editingProforma.proformaNo}
                    </span>
                  </>
                ) : formData.proformaNo ? (
                  <>
                    <span>New Proforma</span>
                    <span className="font-extrabold text-[#33077C] font-mono text-xs sm:text-[13px] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/80 shadow-2xs">
                      {formData.proformaNo}
                    </span>
                  </>
                ) : (
                  "Create a new customer proforma invoice"
                )}
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
                <CustomerSearchableSelect
                  value={formData.customerId}
                  allowNone
                  size="lg"
                  onChange={(val, cust) => {
                    setFormData((prev) => ({
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
                    formData.customerId
                      ? {
                          id: formData.customerId,
                          name: formData.partyName,
                          company: formData.customerCompany,
                          phone: formData.customerPhone,
                        }
                      : null
                  }
                  onAddNewCustomer={() => setIsAddCustomerModalOpen(true)}
                  placeholder="Select or search customer..."
                />

                

                {/* Party Details Preview Pill */}
                {formData.partyName && (
                  <div className="mt-2.5 px-3 py-2 bg-purple-50/40 rounded-xl border border-purple-200/60 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {formData.customerPhone && (
                      <div>
                        <span className="font-bold text-slate-700">Phone:</span>{" "}
                        {formData.customerPhone}
                      </div>
                    )}
                    {formData.billingAddress && (
                      <div>
                        <span className="font-bold text-slate-700">
                          Address:
                        </span>{" "}
                        {formData.billingAddress}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Invoice Date, State of supply, Valid Upto */}
              <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-end gap-3 text-xs">
                {/* Invoice Date */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <span className="font-medium text-slate-600 w-24 sm:w-auto text-right">
                    Invoice Date
                  </span>
                  <div className="relative w-40 sm:w-48">
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const d = new Date(
                          newDate || new Date().toISOString().split("T")[0],
                        );
                        d.setDate(d.getDate() + Number(validUptoDays || "30"));
                        const computedValidUntil = d
                          .toISOString()
                          .split("T")[0];
                        setFormData((prev) => ({
                          ...prev,
                          date: newDate,
                          validUntil: computedValidUntil,
                        }));
                      }}
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
                    value={formData.stateOfSupply}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stateOfSupply: e.target.value,
                      })
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

                {/* Valid Upto */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <span className="font-medium text-slate-600 w-24 sm:w-auto text-right">
                    Valid Upto
                  </span>
                  <select
                    value={validUptoDays}
                    onChange={(e) => {
                      const days = e.target.value;
                      setValidUptoDays(days);
                      const base =
                        formData.date || new Date().toISOString().split("T")[0];
                      const d = new Date(base);
                      d.setDate(d.getDate() + Number(days));
                      const computedValidUntil = d.toISOString().split("T")[0];
                      setFormData((prev) => ({
                        ...prev,
                        validUntil: computedValidUntil,
                      }));
                    }}
                    className="w-40 sm:w-48 h-9 px-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none cursor-pointer transition-colors"
                  >
                    <option value="15">15 Days</option>
                    <option value="30">30 Days</option>
                    <option value="45">45 Days</option>
                    <option value="60">60 Days</option>
                    <option value="75">75 Days</option>
                    <option value="90">90 Days</option>
                    <option value="105">105 Days</option>
                    <option value="120">120 Days</option>
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

                          <div className="my-1.5 border-t border-slate-100" />

                          <button
                            type="button"
                            onClick={() => {
                              setShowColumnCustomizePopover(false);
                              toast.info(
                                "Configure template and column styles",
                              );
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
                    <tr
                      key={row.id}
                      className="hover:bg-purple-50/20 transition-colors group"
                    >
                      {/* Row Number */}
                      <td className="py-2 px-2 text-center font-bold text-slate-500 border-r border-slate-200 bg-slate-50/30">
                        {idx + 1}
                      </td>

                      {/* ITEM (Product Selector / Input) */}
                      <td className="p-1.5 border-r border-slate-200 proforma-product-cell">
                        <div className="relative">
                          <div
                            onClick={() => {
                              setOpenProductDropdownRow(idx);
                              setProductSearchQuery(row.productName || "");
                              if (liveProducts.length === 0) {
                                fetchLiveProducts();
                              }
                            }}
                            className="w-full h-8 px-2 flex items-center justify-between bg-transparent hover:bg-slate-50 focus-within:bg-white border border-transparent focus-within:border-[#33077C] rounded-lg cursor-pointer transition-colors"
                          >
                            <input
                              type="text"
                              value={row.productName}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenProductDropdownRow(idx);
                                setProductSearchQuery(row.productName || "");
                                if (liveProducts.length === 0) {
                                  fetchLiveProducts();
                                }
                              }}
                              onFocus={() => {
                                setOpenProductDropdownRow(idx);
                                setProductSearchQuery(row.productName || "");
                                if (liveProducts.length === 0) {
                                  fetchLiveProducts();
                                }
                              }}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleRowChange(idx, "productName", val);
                                setProductSearchQuery(val);
                                setOpenProductDropdownRow(idx);
                                if (productSearchTimerRef.current) {
                                  clearTimeout(productSearchTimerRef.current);
                                }
                                if (val.trim().length >= 1) {
                                  productSearchTimerRef.current = setTimeout(
                                    () => {
                                      fetchLiveProducts(val.trim());
                                    },
                                    300,
                                  );
                                }
                              }}
                              placeholder="Type or select product item..."
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
                                      row.productName || "",
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

                          {/* Searchable Dropdown Popover matching user screenshot */}
                          {openProductDropdownRow === idx && (
                            <div
                              ref={productDropdownRef}
                              className="product-dropdown-popover absolute left-0 top-full mt-1.5 w-80 sm:w-96 max-w-[90vw] bg-white rounded-2xl shadow-2xl shadow-purple-900/15 border border-purple-100 z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
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
                                    handleRowChange(idx, "productId", "");
                                    handleRowChange(idx, "productName", "");
                                    setOpenProductDropdownRow(null);
                                  }}
                                  className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                    !row.productName
                                      ? "bg-purple-50 text-[#33077C] font-bold"
                                      : "hover:bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400 italic">
                                      None / Clear Product
                                    </span>
                                  </div>
                                  {!row.productName && (
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
                                  matchingProducts.map((p) => {
                                    const isSelected =
                                      row.productId === p.productId ||
                                      (row.productName &&
                                        row.productName === p.productName);
                                    const imgUrl =
                                      (p as any).imageUrl || (p as any).image;
                                    return (
                                      <div
                                        key={p.productId || (p as any).id}
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
                                          {/* Avatar Initials / Image Circle matching SalesRepSearchableSelect */}
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
                                                  (p as any).productCode ||
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

                      {/* ITEM CATEGORY (optional column) */}
                      {columnSettings.showItemCategory && (
                        <td className="p-1.5 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.category || ""}
                            onChange={(e) =>
                              handleRowChange(idx, "category", e.target.value)
                            }
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
                            value={row.itemCode || row.sku || ""}
                            onChange={(e) =>
                              handleRowChange(idx, "itemCode", e.target.value)
                            }
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
                            value={row.hsnCode || ""}
                            onChange={(e) =>
                              handleRowChange(idx, "hsnCode", e.target.value)
                            }
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
                            value={row.description || ""}
                            onChange={(e) =>
                              handleRowChange(
                                idx,
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder="Item description"
                            className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none transition-colors"
                          />
                        </td>
                      )}

                      {/* BATCH NO */}
                      <td className="p-1.5 border-r border-slate-200">
                        {(() => {
                          const matchedProduct = availableProducts.find(
                            (s) =>
                              (row.productId &&
                                (s.productId === row.productId ||
                                  s.id === row.productId)) ||
                              (row.productName &&
                                s.productName.toLowerCase() ===
                                  row.productName.trim().toLowerCase()),
                          );
                          const cleanName = (row.productName || "")
                            .trim()
                            .replace(/[^a-zA-Z0-9]/g, "")
                            .toUpperCase();
                          const prefix =
                            row.itemCode ||
                            row.sku ||
                            cleanName.substring(0, 4) ||
                            "BAT";
                          const batches =
                            matchedProduct?.batches &&
                            matchedProduct.batches.length > 0
                              ? matchedProduct.batches
                              : [{ batchNo: `BAT-${prefix}-01` }];

                          // If the user selected to manually type a custom batch
                          if (row.isCustomBatch) {
                            return (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={row.batch || ""}
                                  onChange={(e) =>
                                    handleRowChange(
                                      idx,
                                      "batch",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Batch No"
                                  className="w-full h-8 px-2 text-center bg-white border border-[#33077C] rounded-lg text-xs font-semibold font-mono text-[#33077C] outline-none"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  title="Back to dropdown"
                                  onClick={() =>
                                    handleRowChange(idx, "isCustomBatch", false)
                                  }
                                  className="h-8 px-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          }

                          // If a product is selected in this row
                          if (row.productName || row.productId) {
                            return (
                              <select
                                value={row.batch || ""}
                                onChange={(e) => {
                                  if (e.target.value === "__custom__") {
                                    handleRowChange(idx, "isCustomBatch", true);
                                    handleRowChange(idx, "batch", "");
                                  } else {
                                    handleRowChange(
                                      idx,
                                      "batch",
                                      e.target.value,
                                    );
                                  }
                                }}
                                className="w-full h-8 px-2 bg-purple-50/70 hover:bg-purple-100/70 focus:bg-white text-[#33077C] border border-purple-200 focus:border-[#33077C] rounded-lg text-xs font-bold font-mono outline-none cursor-pointer transition-colors"
                              >
                                <option value="">Select Batch...</option>
                                {batches.map((b) => (
                                  <option key={b.batchNo} value={b.batchNo}>
                                    {b.batchNo}{" "}
                                    {typeof b.quantity === "number"
                                      ? `(${b.quantity} in stock)`
                                      : ""}
                                  </option>
                                ))}
                                {row.batch &&
                                  !batches.some(
                                    (b) => b.batchNo === row.batch,
                                  ) && (
                                    <option value={row.batch}>
                                      {row.batch}
                                    </option>
                                  )}
                                <option value="__custom__">
                                  + Enter custom batch...
                                </option>
                              </select>
                            );
                          }

                          // If no product is selected yet in this row
                          return (
                            <input
                              type="text"
                              value={row.batch || ""}
                              onChange={(e) =>
                                handleRowChange(idx, "batch", e.target.value)
                              }
                              placeholder="Batch No"
                              className="w-full h-8 px-2 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-semibold font-mono text-[#33077C] outline-none transition-colors"
                            />
                          );
                        })()}
                      </td>

                      {/* QTY */}
                      <td className="p-1.5 border-r border-slate-200">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity || ""}
                          onKeyDown={handleNonNegativeKeyDown}
                          onChange={(e) =>
                            handleRowChange(
                              idx,
                              "quantity",
                              Number(e.target.value),
                            )
                          }
                          className="w-full h-8 px-2 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                        />
                      </td>

                      {/* UNIT */}
                      <td className="p-1.5 border-r border-slate-200">
                        <select
                          value={row.unit || "NONE"}
                          onChange={(e) =>
                            handleRowChange(idx, "unit", e.target.value)
                          }
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
                          min="0"
                          value={row.unitPrice === 0 ? "" : row.unitPrice}
                          placeholder="0.00"
                          onKeyDown={handleNonNegativeKeyDown}
                          onChange={(e) =>
                            handleRowChange(
                              idx,
                              "unitPrice",
                              Number(e.target.value),
                            )
                          }
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
                              value={
                                row.discountPercent === 0
                                  ? ""
                                  : row.discountPercent
                              }
                              placeholder="0"
                              onKeyDown={handleNonNegativeKeyDown}
                              onChange={(e) =>
                                handleRowChange(
                                  idx,
                                  "discountPercent",
                                  Number(e.target.value),
                                )
                              }
                              className="w-full h-8 px-1.5 text-center bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none transition-colors"
                            />
                          </td>

                          <td className="p-1.5 border-r border-slate-200 w-24">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={
                                row.discountAmount === 0
                                  ? ""
                                  : row.discountAmount
                              }
                              placeholder="0.00"
                              onKeyDown={handleNonNegativeKeyDown}
                              onChange={(e) =>
                                handleRowChange(
                                  idx,
                                  "discountAmount",
                                  Number(e.target.value),
                                )
                              }
                              className="w-full h-8 px-2 text-right bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent focus:border-[#33077C] rounded-lg text-xs font-medium text-slate-700 outline-none transition-colors"
                            />
                          </td>
                        </>
                      )}

                      {/* TAX % (Select) */}
                      <td className="p-1.5 border-r border-slate-200 w-28">
                        <select
                          value={row.taxPercent}
                          onChange={(e) =>
                            handleRowChange(
                              idx,
                              "taxPercent",
                              Number(e.target.value),
                            )
                          }
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
                        {row.taxAmount ? Number(row.taxAmount).toFixed(2) : "0"}
                      </td>

                      {/* AMOUNT (ROW TOTAL) */}
                      <td className="p-1.5 border-r border-slate-200 text-right pr-3 font-bold text-slate-900">
                        {Number(row.total || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
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
                          {formCalculations.totalDiscount > 0
                            ? formCalculations.totalDiscount.toFixed(2)
                            : "0"}
                        </td>
                      </>
                    )}

                    {/* Tax placeholder */}
                    <td className="border-r border-slate-200"></td>

                    {/* Total Tax Amount */}
                    <td className="py-2.5 px-2 text-right border-r border-slate-200 pr-3 font-semibold text-slate-700">
                      {formCalculations.totalTax > 0
                        ? formCalculations.totalTax.toFixed(2)
                        : "0"}
                    </td>

                    {/* Total Line Amount */}
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 font-extrabold text-[#33077C]">
                      ₹
                      {formCalculations.lineAmountTotal.toLocaleString(
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
                    <FormLabel>Terms & Conditions</FormLabel>
                    <textarea
                      rows={3}
                      value={formData.terms}
                      onChange={(e) =>
                        setFormData({ ...formData, terms: e.target.value })
                      }
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
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
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
                    value={
                      formCalculations.roundOffDiff
                        ? formCalculations.roundOffDiff
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
                    {formCalculations.grandTotal.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
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
                          `Proforma Invoice from YAA Mart\nProforma No: ${formData.proformaNo}\nCustomer: ${formData.partyName}\nAmount: ₹${formCalculations.grandTotal}`,
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
                          `Proforma Invoice ${formData.proformaNo}`,
                        );
                        const body = encodeURIComponent(
                          `Dear ${formData.partyName},\n\nEstimated amount: ₹${formCalculations.grandTotal}`,
                        );
                        window.open(
                          `mailto:${formData.customerEmail}?subject=${subject}&body=${body}`,
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

              {/* Save Button (CRM Primary Theme #33077C) */}
              <Button
                variant="primary"
                size="md"
                type="submit"
                form="proforma-form"
                disabled={isSubmitting}
                icon={
                  isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  )
                }
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </form>

        {/* Add Customer Modal */}
        {isAddCustomerModalOpen && (
          <AddCustomerModal
            isOpen={isAddCustomerModalOpen}
            onClose={() => setIsAddCustomerModalOpen(false)}
            onCustomerCreated={(created) => {
              setLiveCustomers((prev) => [
                created,
                ...prev.filter((c) => c.id !== created.id),
              ]);
              setFormData((prev) => ({
                ...prev,
                customerId: created.id,
                partyName: created.name,
                customerCompany: created.company || "",
                customerPhone: created.phone || "",
                customerEmail: created.email || "",
                billingAddress: created.billingAddress || created.address || "",
              }));
              setIsAddCustomerModalOpen(false);
            }}
          />
        )}

        {/* Add Item Modal */}
        {isAddItemModalOpen && (
          <AddItemModal
            isOpen={isAddItemModalOpen}
            onClose={() => setIsAddItemModalOpen(false)}
            onProductCreated={(created) => {
              const effProduct = {
                id: created.id,
                productId: created.id,
                productName: created.productName,
                sku: created.productCode || (created as any).sku || "",
                unitPrice: Number(created.salePrice ?? created.unitPrice ?? 0),
                unit: created.unit || "PCS",
                category: created.category || "",
                taxPercent:
                  created.taxRate && String(created.taxRate).includes("@")
                    ? Number(
                        String(created.taxRate).match(/@\s*(\d+)%/)?.[1] || 0,
                      )
                    : 0,
                hsnCode: created.hsnCode || "",
                imageUrl:
                  (created as any).imageUrl || (created as any).image || "",
                batches: created.batches || [],
              };
              setLiveProducts((prev) => [
                created,
                ...prev.filter((p) => p.id !== created.id),
              ]);
              dispatch(
                baseApi.util.invalidateTags([
                  "Product",
                  "InventoryStock",
                ] as any),
              );
              fetchLiveProducts();
              if (activeItemRowIndex !== null) {
                handleSelectProduct(activeItemRowIndex, effProduct);
              }
              setIsAddItemModalOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: LIST (Master Proforma Invoices Table View as in screenshot 1)
  // Export to Excel
  const handleExportExcel = () => {
    if (displayProformas.length === 0) {
      toast.error("No proforma invoices to export");
      return;
    }

    const excelRows = displayProformas.map((p) => {
      const createdDt = formatDateTime(p.createdAt || p.date);
      const convertedAt = resolveDocumentConvertedAt("Proforma", p);
      const convertedDt = formatDateTime(convertedAt);
      return {
        proformaNo: p.proformaNo,
        partyName: p.partyName,
        createdDateTime: createdDt
          ? createdDt.full
          : isoToDdmmyyyy(p.date) || "-",
        convertedDateTime: convertedDt ? convertedDt.full : "-",
        customerPhone: p.customerPhone || "-",
        amount: Number(p.amount || 0),
        balance: Number(p.balance || 0),
        status: p.status,
      };
    });

    exportTableToExcel({
      filename: `Proforma_Invoices_Report_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Proforma Invoices",
      title: "YAA CREATIONS CRM - PROFORMA INVOICE REPORT",
      subtitle: `Filter: ${appliedPeriod} | Total Proformas: ${displayProformas.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        {
          header: "Proforma No.",
          key: "proformaNo",
          align: "center",
          width: 18,
        },
        { header: "Customer Name", key: "partyName", align: "left", width: 28 },
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
        proformaNo: "TOTAL",
        partyName: `${displayProformas.length} Proformas`,
        amount: metrics.totalVal,
        balance: metrics.openVal,
      },
    });

    toast.success(
      `Proforma Invoices Excel report downloaded (${displayProformas.length} records)!`,
    );
  };

  // Print Proforma Table Report via universal printUtils
  const handlePrintTableReport = () => {
    if (displayProformas.length === 0) {
      toast.error("No proforma invoices to print.");
      return;
    }

    const printRows = displayProformas.map((p) => {
      const createdDt = formatDateTime(p.createdAt || p.date);
      const convertedAt = resolveDocumentConvertedAt("Proforma", p);
      const convertedDt = formatDateTime(convertedAt);
      return {
        proformaNo: p.proformaNo,
        partyName: p.partyName,
        createdDateTime: createdDt
          ? createdDt.full
          : isoToDdmmyyyy(p.date) || "-",
        convertedDateTime: convertedDt ? convertedDt.full : "-",
        customerPhone: p.customerPhone || "-",
        amount: Number(p.amount || 0),
        balance: Number(p.balance || 0),
        status: p.status,
      };
    });

    printTableReport({
      title: "PROFORMA INVOICE REGISTER",
      subtitle: `Filter: ${appliedPeriod} | Total Records: ${displayProformas.length}`,
      columns: [
        {
          header: "Proforma No.",
          key: "proformaNo",
          align: "center",
          width: "15%",
        },
        {
          header: "Customer Name",
          key: "partyName",
          align: "left",
          width: "22%",
        },
        {
          header: "Created Date & Time",
          key: "createdDateTime",
          align: "center",
          width: "16%",
        },
        {
          header: "Converted Date & Time",
          key: "convertedDateTime",
          align: "center",
          width: "16%",
        },
        {
          header: "Contact",
          key: "customerPhone",
          align: "left",
          width: "13%",
        },
        {
          header: "Amount (₹)",
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
        proformaNo: "TOTAL",
        partyName: `${displayProformas.length} Proformas`,
        amount: metrics.totalVal,
        balance: metrics.openVal,
      },
      metrics: [
        { label: "Total Value", value: metrics.totalVal },
        { label: "Open Amount", value: metrics.openVal },
        { label: "Total Proformas", value: displayProformas.length },
      ],
    });
  };

  // =========================================================================
  // VIEW MODE: LIST (Master Proforma Invoices Table View matching CRM Theme)
  // =========================================================================
  return (
    <div className="space-y-5 pb-16 font-sans animate-in fade-in duration-150">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-[220px] flex-1">
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
              Create, track, and convert commercial proforma invoices into
              confirmed sales.
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
              <span>
                {metrics.totalVal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Green Growth Pill */}
          <div className="flex flex-col items-end">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200/80">
              <span>100%</span>
              <TrendingUp className="w-3 h-3 stroke-[2.5]" />
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
              vs last month
            </span>
          </div>
        </div>

        {/* Subtext: Converted: ₹ 0.00 | Open: ₹ 80.00 */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500">
          <span>
            Converted:{" "}
            <strong className="text-slate-800 font-bold">
              ₹{" "}
              {metrics.convertedVal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </strong>
          </span>
          <span className="text-slate-300">|</span>
          <span>
            Open:{" "}
            <strong className="text-slate-800 font-bold">
              ₹{" "}
              {metrics.openVal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </strong>
          </span>
        </div>
      </div>

      {/* 3. Unified SearchBar with FilterDropdown matching Image 1 */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => {
          setPendingSearch(val);
        }}
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
            fetchProformas(1, pageSize, trimmed, pendingStatus, pendingPeriod);
          }
        }}
        onReset={() => {
          const isSame =
            appliedSearch === "" &&
            pendingSearch === "" &&
            appliedPeriod === "all" &&
            pendingPeriod === "all" &&
            appliedStatus === "ALL" &&
            pendingStatus === "ALL" &&
            page === 1;

          setPendingSearch("");
          setAppliedSearch("");
          setPendingPeriod("all");
          setAppliedPeriod("all");
          setPendingStatus("ALL");
          setAppliedStatus("ALL");
          setPage(1);

          if (isSame) {
            fetchProformas(1, pageSize, "", "ALL", "all");
          }
        }}
        placeholder="Search by customer name, proforma #..."
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              options={PERIOD_FILTER_OPTIONS}
              value={pendingPeriod}
              onChange={(val) => {
                setPendingPeriod(val);
              }}
              placeholder="Period : All Time"
            />
            <FilterDropdown
              options={STATUS_FILTER_OPTIONS}
              value={pendingStatus}
              onChange={(val) => {
                setPendingStatus(val);
              }}
              placeholder="Status : All"
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Proformas :{" "}
              <span className="text-[#33077C] font-bold">
                {metrics.totalCount}
              </span>
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
              <h3 className="text-base font-bold text-slate-800">
                No Transactions to show
              </h3>
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
              {/* Table Purple Themed Header with Standard Icons */}
              <CommonTableHead
                columns={[
                  { label: "PROFORMA NO.", align: "center", minWidth: "140px" },
                  { label: "CUSTOMER NAME", align: "left", minWidth: "180px" },
                  { label: "CREATED DATE & TIME", align: "left", minWidth: "140px" },
                  { label: "CONVERTED DATE & TIME", align: "left", minWidth: "140px" },
                  { label: "AMOUNT", align: "right", minWidth: "120px" },
                  { label: "BALANCE", align: "right", minWidth: "120px" },
                  { label: "STATUS", align: "center", minWidth: "110px" },
                  { label: "ACTIONS", align: "center", minWidth: "190px" },
                ]}
              />
              <tbody className="divide-y divide-slate-200 text-xs sm:text-[13px] text-slate-700">
                {paginatedProformas.map((item) => {
                  const itemStages = getProformaStages(item);
                  const isConvertOpen = activeConvertDropdownId === item.id;
                  const isActionOpen = activeDropdownId === item.id;
                  const createdDt = formatDateTime(item.createdAt || item.date);
                  const convertedAt = resolveDocumentConvertedAt(
                    "Proforma",
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
                    customers.find(
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
                    findDocumentLineage(item.proformaNo)?.customerCode ||
                    "";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-50/40 transition-colors border-b border-slate-200"
                    >
                      {/* 1. Proforma Invoice Code (from backend) */}
                      <td className="py-3.5 px-3 sm:px-4 text-center border-r border-slate-200 whitespace-nowrap align-middle">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-[#33077C] border border-purple-200/80 font-mono text-xs font-bold">
                            {item.proformaNo || "—"}
                          </span>
                          <DocumentLineageBadges
                            docRef={item.proformaNo}
                            currentType="Proforma"
                            className="justify-center"
                          />
                        </div>
                      </td>

                      {/* 2. Party Name */}
                      <td className="py-3.5 px-3 sm:px-5 font-semibold text-slate-900 border-r border-slate-200 align-middle">
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
                          <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                            {item.customerPhone}
                          </div>
                        )}
                      </td>

                      {/* 3. Created Date & Time */}
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

                      {/* 4. Converted Date & Time */}
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

                      {/* 4. Amount */}
                      <td className="py-3.5 px-3 sm:px-4 text-right font-black text-slate-900 border-r border-slate-200 whitespace-nowrap align-middle">
                        ₹{" "}
                        {item.amount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      {/* 5. Balance */}
                      <td className="py-3.5 px-3 sm:px-4 text-right font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap align-middle">
                        ₹{" "}
                        {item.balance.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      {/* 6. Status */}
                      <td className="py-3.5 px-3 sm:px-4 text-center border-r border-slate-200 whitespace-nowrap align-middle">
                        <div className="flex items-center justify-center">
                          {itemStages.isFullyConverted ||
                          item.status === "Converted" ? (
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

                      {/* 7. Actions Column: Convert ⌄ button + 3-dots actions menu */}
                      <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap align-middle min-w-[190px] w-48">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Convert ⌄ Dropdown Button slot with fixed width */}
                          <div className="w-[104px] shrink-0 flex items-center justify-center">
                          {itemStages.isFullyConverted ||
                          itemStages.availableCount === 0 ? (
                            <button
                              type="button"
                              disabled
                              aria-disabled="true"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              title={`Proforma has been converted (${item.convertedToInvoiceNo || "Converted"})`}
                              className="text-xs sm:text-[13px] font-semibold text-emerald-700 bg-emerald-50/90 border border-emerald-200/90 px-2 py-1 rounded cursor-not-allowed select-none flex items-center justify-center gap-1 opacity-80"
                            >
                              <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                              <span>Converted</span>
                            </button>
                          ) : (
                            <div className="relative inline-block text-left">
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
                                className="proforma-convert-btn text-xs sm:text-[13px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-transparent hover:bg-blue-50/60 flex items-center justify-center gap-1 px-1.5 py-1 rounded transition-colors cursor-pointer select-none"
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
                                  className="proforma-convert-dropdown-menu w-56 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-left font-sans overflow-hidden"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {!itemStages.isOrderConverted && (
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
                                  )}
                                  {!itemStages.isChallanConverted && (
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
                                  {!itemStages.isInvoiceConverted && (
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
                            getShareData={() => formatProformaInvoiceShare(item)}
                            title="Share Proforma Invoice"
                          />

                          {/* 3-Dots Action Menu Button */}
                          <SaleActionDropdown
                            items={[
                              {
                                label: "Convert to Sale Order",
                                variant: "order",
                                disabled:
                                  itemStages.isOrderConverted ||
                                  itemStages.isFullyConverted,
                                onClick: () =>
                                  handleConvertExistingToOrder(item),
                              },
                              {
                                label: "Convert to Delivery Challan",
                                variant: "challan",
                                disabled:
                                  itemStages.isChallanConverted ||
                                  itemStages.isFullyConverted,
                                onClick: () =>
                                  handleConvertExistingToChallan(item),
                              },
                              {
                                label: "Convert to Sales Invoice",
                                variant: "invoice",
                                disabled:
                                  itemStages.isInvoiceConverted ||
                                  itemStages.isFullyConverted,
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
                                onClick: () => handleDuplicateProforma(item),
                              },

                              {
                                label: "Print Proforma",
                                variant: "print",
                                onClick: () => handlePrintProforma(item),
                              },
                              {
                                label: "Download Proforma",
                                variant: "download",
                                onClick: () => handleDownloadProforma(item),
                              },
                              {
                                label: "Mark as Cancelled",
                                variant: "cancel",
                                hidden:
                                  item.status === "Converted" ||
                                  item.status === "Cancelled",
                                onClick: () =>
                                  handleUpdateStatus(item.id, "Cancelled"),
                              },
                              {
                                label: "Mark as Open",
                                variant: "activate",
                                hidden: item.status !== "Cancelled",
                                onClick: () =>
                                  handleUpdateStatus(item.id, "Open"),
                              },
                              {
                                label: "Delete",
                                variant: "delete",
                                onClick: () =>
                                  handleOpenDeleteModal(
                                    item.id,
                                    item.proformaNo,
                                  ),
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
          total={
            isApiConnected && totalApiRecords !== null
              ? totalApiRecords
              : displayProformas.length
          }
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
                  PROFORMA INVOICE
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {previewProforma.proformaNo}
                </p>
                <p className="text-xs text-slate-500">
                  Date: {isoToDdmmyyyy(previewProforma.date)}
                </p>
                <p className="text-xs text-slate-500">
                  Valid Until: {isoToDdmmyyyy(previewProforma.validUntil)}
                </p>
              </div>
            </div>

            {/* Bill To Info */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">
                  Bill To:
                </p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {previewProforma.partyName}
                </p>
                {previewProforma.customerCompany && (
                  <p>{previewProforma.customerCompany}</p>
                )}
                {previewProforma.customerPhone && (
                  <p>Phone: {previewProforma.customerPhone}</p>
                )}
                {previewProforma.billingAddress && (
                  <p>{previewProforma.billingAddress}</p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">
                  Proforma Details:
                </p>
                <p className="mt-0.5">
                  <strong className="text-slate-700">State of Supply:</strong>{" "}
                  {previewProforma.stateOfSupply || "Tamil Nadu"}
                </p>
                <p>
                  <strong className="text-slate-700">Status:</strong>{" "}
                  {previewProforma.status}
                </p>
              </div>
            </div>

            {/* Items Table */}
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
                  {previewProforma.items.map((it, i) => (
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

            {/* Summary Row */}
            <div className="flex justify-end pt-2">
              <div className="w-full sm:w-64 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">
                    ₹
                    {previewProforma.subtotal.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {previewProforma.taxAmount !== undefined &&
                  previewProforma.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>GST Tax:</span>
                      <span className="font-semibold text-slate-800">
                        ₹
                        {previewProforma.taxAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                {previewProforma.roundOff !== undefined && (
                  <div className="flex justify-between">
                    <span>Round Off:</span>
                    <span className="font-semibold text-slate-800">
                      ₹{previewProforma.roundOff.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-[#33077C] pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span>
                    ₹
                    {previewProforma.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms */}
            {previewProforma.terms && (
              <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 whitespace-pre-line border border-slate-100">
                <span className="font-bold text-slate-700">
                  Terms &amp; Conditions:
                </span>
                <br />
                {previewProforma.terms}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap justify-end gap-2">
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
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Proforma</span>
              </button>
              <button
                type="button"
                disabled={isDownloadingPdf}
                onClick={() => handleDownloadProforma(previewProforma)}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Proforma</span>
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
