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
} from "lucide-react";
import {
  useSalesManagementStore,
  SaleProductItem,
  SalesCustomer,
  SaleTransaction,
} from "../../../store/useSalesManagementStore";
import { Button } from "../../../components/common/Button";
import { Modal } from "../../../components/common/Modal";
import { Pagination } from "../../../components/common/Pagination";
import { SearchBar } from "../../../components/common/SearchBar";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { SearchableSelect } from "../../../components/common/SearchableSelect";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exportTableToExcel } from "../../../utils/excelExport";
import { FileSpreadsheet } from "lucide-react";
import { SaleActionDropdown } from "../utils/SaleActionDropdown";
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
import { DeliveryChallanRecord } from "../../../api/commerce/deliveryChallanApi";
import {
  syncConvertedInvoiceToStorage,
  syncConvertedChallanToStorage,
  syncOrderStatusInStorage,
  recordDocumentConversion,
  findDocumentLineage,
  initializeWorkflowIntegrity,
} from "../../../utils/salesDocumentWorkflow";
import { DocumentLineageBadges } from "../../../components/common/DocumentLineageBadges";
import { FormLabel, FORM_INPUT_CLS, getFormInputCls, handleNumberOnlyKeyDown } from "../utils/formUtils";
import { normalizeIndianPhoneTo10Digits } from "../../../utils/validation";
import { FormError } from "../../../components/common/FormError";

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
  const [liveCustomers, setLiveCustomers] = useState<ApiCustomer[]>([]);
  const [liveProducts, setLiveProducts] = useState<ApiProduct[]>([]);

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
  const [pendingPeriod, setPendingPeriod] = useState("This Month");
  const [appliedPeriod, setAppliedPeriod] = useState("This Month");
  const [pendingStatus, setPendingStatus] = useState("ALL");
  const [appliedStatus, setAppliedStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  // Preview Modal
  const [previewOrder, setPreviewOrder] = useState<SaleOrderRecord | null>(
    null,
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".sale-order-action-dropdown-container") &&
        !target.closest(".sale-order-action-dropdown-menu")
      ) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    };
    const handleScroll = () => {
      setActiveDropdownId(null);
      setDropdownPos(null);
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

  // Quick Customer Creation Modal
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] =
    useState(false);
  const [quickCustName, setQuickCustName] = useState("");
  const [quickCustPhone, setQuickCustPhone] = useState("");
  const [quickCustEmail, setQuickCustEmail] = useState("");
  const [quickCustCompany, setQuickCustCompany] = useState("");
  const [quickCustAddress, setQuickCustAddress] = useState("");
  const [quickCustOpeningBal, setQuickCustOpeningBal] = useState("0");
  const [quickCustPhoneError, setQuickCustPhoneError] = useState("");

  // Load Customers and Products masters from Live API ONLY when Form Mode is active
  const hasLoadedMasterDataRef = useRef(false);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  // Load Customers Master Data (products are searched on demand)
  const loadMasterData = useCallback(async () => {
    if (hasLoadedMasterDataRef.current) return;
    hasLoadedMasterDataRef.current = true;
    try {
      const custRes = await customerApi.getCustomers({
        pagination_required: false,
      });
      if (custRes?.data && Array.isArray(custRes.data)) {
        setLiveCustomers(custRes.data);
      }
    } catch (e) {
      console.warn("Using local fallback for customers master", e);
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
      console.warn("Failed to search products in SaleOrderView:", err);
    } finally {
      setIsSearchingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === "form") {
      loadMasterData();
    }
  }, [viewMode, loadMasterData]);

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
        const rawLocal = localStorage.getItem("yaa_crm_sale_orders");
        const localList: SaleOrderRecord[] = rawLocal
          ? JSON.parse(rawLocal)
          : [];
        const apiOrderNos = new Set(records.map((r) => r.orderNo || r.id));
        const extraLocals = localList.filter(
          (l) => !apiOrderNos.has(l.orderNo) && !apiOrderNos.has(l.id),
        );

        const merged = [...extraLocals, ...records].map((ord) => {
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
        setTotalApiRecords(
          res.pagination?.totalRecords
            ? res.pagination.totalRecords + extraLocals.length
            : merged.length,
        );
        setTotalApiPages(Math.max(1, Math.ceil(merged.length / pageSize)));
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

  // Combined Products / Stock Items (Live API + Local Store)
  const allStockItems = useMemo(() => {
    const map = new Map<string, any>();

    liveProducts.forEach((p) => {
      let tax = 5;
      if (typeof (p as any).taxPercent === "number") {
        tax = (p as any).taxPercent;
      } else if (p.taxRate) {
        const parsed = parseFloat(String(p.taxRate).replace(/[^0-9.]/g, ""));
        if (!isNaN(parsed)) tax = parsed;
      }
      map.set(p.id, {
        id: p.id,
        productId: p.id,
        productName: p.productName || (p as any).name || "Unnamed Product",
        sku: p.productCode || (p as any).sku || "",
        unitPrice: Number(p.salePrice ?? (p as any).sellingPrice ?? (p as any).price ?? (p as any).unitPrice ?? 0),
        unit: p.unit || "PCS",
        taxPercent: tax,
        hsnCode: p.hsnCode || "",
        category: p.category || "",
        batches: (p as any).batches || (p as any).stockBatches || [],
      });
    });

    localStocks.forEach((s) => {
      const pid = (s as any).productId || s.id;
      if (!map.has(pid)) {
        map.set(pid, {
          id: s.id,
          productId: pid,
          productName: s.productName || (s as any).name || "Unnamed Product",
          sku: s.sku || (s as any).itemCode || "",
          unitPrice: Number(s.unitPrice ?? (s as any).salePrice ?? (s as any).sellingPrice ?? (s as any).price ?? 0),
          unit: s.unit || "PCS",
          taxPercent: 5,
          hsnCode: (s as any).hsnCode || "",
          category: s.category || "",
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
        ? `SKU: ${s.sku} • ₹${Number(s.unitPrice || 0).toLocaleString("en-IN")}`
        : `₹${Number(s.unitPrice || 0).toLocaleString("en-IN")}`,
      badge: s.sku || undefined,
    }));
  }, [allStockItems]);

  // Auto-generate Order Number
  const generateNextOrderNo = () => {
    const year = new Date().getFullYear();
    const count = saleOrders.length + 1;
    return `SO-${year}-${String(count).padStart(4, "0")}`;
  };

  // Initial Form Data State
  const createEmptyFormData = (customNum = 1) => {
    const firstProduct = allStockItems[0];
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
          productId: firstProduct?.productId || firstProduct?.id || "",
          productName: firstProduct?.productName || "",
          sku: firstProduct?.sku || "",
          quantity: 1,
          unit: firstProduct?.unit || "PCS",
          unitPrice: firstProduct?.unitPrice || 0,
          discountPercent: 0,
          taxPercent: firstProduct?.taxPercent || 5,
          total: firstProduct?.unitPrice || 0,
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

  // Quick Customer Creation
  const handleSaveQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim()) {
      toast.error("Please enter customer name");
      return;
    }
    if (quickCustPhone.trim()) {
      const cleanPhone = normalizeIndianPhoneTo10Digits(quickCustPhone);
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        toast.error(
          "Please enter a valid 10-digit Indian phone number (starts with 6, 7, 8, or 9)",
        );
        setQuickCustPhoneError("Phone number must be a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)");
        return;
      }
    }
    setQuickCustPhoneError("");

    try {
      setIsActionLoading(true);
      const payload = {
        name: quickCustName.trim(),
        phone: quickCustPhone.trim() || "9876543210",
        email: quickCustEmail.trim() || undefined,
        company: quickCustCompany.trim() || undefined,
        customerType: "Business" as const,
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
        console.warn("API customer creation fallback to local state");
      }

      const newCust: SalesCustomer = {
        id: createdCustomerId,
        customerCode: `CUS-${Math.floor(1000 + Math.random() * 9000)}`,
        name: quickCustName.trim(),
        phone: quickCustPhone.trim(),
        email: quickCustEmail.trim(),
        company: quickCustCompany.trim(),
        customerType: "Business",
        address: quickCustAddress.trim(),
        billingAddress: quickCustAddress.trim(),
        shippingAddress: quickCustAddress.trim(),
        sameAsBilling: true,
        city: "Chennai",
        state: "Tamil Nadu",
        country: "India",
        pincode: "600001",
        creditLimit: 50000,
        paymentTerms: "Net 15 Days",
        openingBalance: Number(quickCustOpeningBal) || 0,
        preferredPaymentMethod: "Cash",
        status: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveCustomerLocal(newCust);
      handleSelectCustomer(newCust);
      setIsQuickCustomerModalOpen(false);
      setQuickCustName("");
      setQuickCustPhone("");
      setQuickCustEmail("");
      setQuickCustCompany("");
      setQuickCustAddress("");
      setQuickCustOpeningBal("0");
      toast.success(`Customer "${newCust.name}" registered and selected!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create customer");
    } finally {
      setIsActionLoading(false);
    }
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
          id: `so_item_${Date.now()}_${prev.items.length + 1}`,
          productId: fallbackProduct?.productId || fallbackProduct?.id || "",
          productName: fallbackProduct?.productName || "",
          sku: fallbackProduct?.sku || "",
          quantity: 1,
          unit: fallbackProduct?.unit || "PCS",
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
      toast.info("At least one item row is required.");
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
      if (andConvert && savedOrderId && UUID_REGEX.test(savedOrderId)) {
        try {
          const convertRes = await commerceSaleOrderApi.convertOrder(
            savedOrderId,
            {
              targetType: "Invoice",
              dueDate: form.dueDate,
            },
          );
          const convertedDocNo =
            convertRes?.data?.convertedTo?.documentNo ||
            convertRes?.data?.document?.invoiceNo ||
            `INV-${new Date().getFullYear()}-0001`;
          toast.success(
            `Sales Order converted to Sales Invoice (${convertedDocNo})!`,
          );
        } catch (convErr: any) {
          console.warn("Convert API response warning:", convErr);
          toast.info("Sales Order saved. Conversion registered.");
        }
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

  // Convert to Sale Invoice from Table (POST /commerce/orders/{id}/convert)
  const handleConvertExistingToSale = async (order: SaleOrderRecord) => {
    if (order.status === "Converted") {
      toast.info(`Sale order ${order.orderNo} is already converted.`);
      return;
    }

    try {
      setIsActionLoading(true);
      const currentLineage = findDocumentLineage(order.orderNo);
      let invNo =
        currentLineage?.invoiceNo ||
        `INV-${new Date().getFullYear()}-${String(200 + saleOrders.length + 1).padStart(4, "0")}`;

      if (UUID_REGEX.test(order.id)) {
        try {
          const res = await commerceSaleOrderApi.convertOrder(order.id, {
            targetType: "Invoice",
            dueDate: order.dueDate,
          });
          const apiInvNo =
            res?.data?.convertedTo?.documentNo ||
            res?.data?.document?.invoiceNo;
          if (apiInvNo) invNo = apiInvNo;
        } catch (apiErr) {
          console.warn("API convertOrder notice:", apiErr);
        }
      }

      const newSale: SaleTransaction = {
        id: `sale_${Date.now()}`,
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
        notes: `Converted from Sale Order ${order.orderNo}`,
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

      const updated = saleOrders.map((o) =>
        o.id === order.id || o.orderNo === order.orderNo
          ? { ...o, status: "Converted" as const, convertedToInvoiceNo: invNo }
          : o,
      );
      persistSaleOrders(updated);

      dispatch(
        baseApi.util.invalidateTags([
          { type: "SalesOrder", id: order.id },
          { type: "SalesOrder", id: "LIST" },
          { type: "SalesInvoice", id: "LIST" },
        ]),
      );

      toast.success(
        `Sale Order ${order.orderNo} converted to Invoice ${invNo}!`,
      );
      await fetchSaleOrders();
    } catch (err: any) {
      console.error("Convert failed:", err);
      toast.error(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to convert sale order",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // Convert to Delivery Challan from Table
  const handleConvertExistingToChallan = async (order: SaleOrderRecord) => {
    try {
      setIsActionLoading(true);
      const currentLineage = findDocumentLineage(order.orderNo);
      const existingChallans: DeliveryChallanRecord[] = JSON.parse(
        localStorage.getItem("yaa_crm_delivery_challans") || "[]",
      );
      const challanNo =
        currentLineage?.challanNo ||
        `DC-${new Date().getFullYear()}-${String(existingChallans.length + 1).padStart(4, "0")}`;

      const newChallan: DeliveryChallanRecord = {
        id: `dc_${Date.now()}`,
        challanNo,
        referenceNo: order.orderNo,
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: order.dueDate,
        customerId: order.customerId,
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
              <div class="brand-name">YAA CREATIONS CRM</div>
              <div style="color: #64748b; font-size: 12px; margin-top: 2px;">Commerce &amp; Enterprise Sales Hub</div>
              <div style="color: #475569; font-size: 11px;">GSTIN: 33AAAAA0000A1Z5 • Phone: +91 98400 12345</div>
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

  // Delete / Cancel Sale Order (DELETE /commerce/orders/{id})
  const handleDeleteOrder = async (id: string) => {
    try {
      setIsActionLoading(true);
      if (UUID_REGEX.test(id)) {
        await commerceSaleOrderApi.deleteOrder(id);
      }
      const updated = saleOrders.filter((o) => o.id !== id);
      persistSaleOrders(updated);
      toast.success("Sale order removed successfully.");
      await fetchSaleOrders();
    } catch (err: any) {
      console.error("Delete order failed:", err);
      toast.error(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to delete sale order",
      );
    } finally {
      setIsActionLoading(false);
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
                      ? "bg-white text-slate-800 border-slate-300 shadow-xs"
                      : "bg-slate-200 text-slate-600 border-transparent hover:bg-slate-300/70"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#33077C]" />
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
              title="Add another Sale Order tab"
            >
              <Plus className="w-4 h-4 text-[#33077C]" />
            </button>
          </div>

          {/* Top Right Tool Icons */}
          <div className="flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-600 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer"
              title="Close and Return to List"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Main Form Container */}
        <form
          id="sale-order-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveSaleOrder(false);
          }}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
              {/* Header Title */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Sale Order
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      Create advance sale orders and reserve inventory for
                      scheduled fulfillment
                    </p>
                  </div>
                </div>
              </div>

              {/* Row 1: Party Selection + Phone No & Right Side Meta */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Party Picker & Phone No. */}
                <div className="lg:col-span-6 flex gap-3 items-start">
                  {/* Party Dropdown with Popup List */}
                  <div className="flex-1 relative" ref={partyDropdownRef}>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Customer <span className="text-rose-500">*</span>
                    </label>
                    <div
                      onClick={() =>
                        setIsPartyDropdownOpen(!isPartyDropdownOpen)
                      }
                      className="w-full h-11 px-3.5 bg-white border border-blue-500 ring-2 ring-blue-500/15 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 flex items-center justify-between cursor-pointer shadow-2xs"
                    >
                      <span
                        className={
                          activeTab.formData.partyName
                            ? "text-slate-900"
                            : "text-slate-400"
                        }
                      >
                        {activeTab.formData.partyName || "Select Customer"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>

                    {/* Searchable Customer Dropdown Popup */}
                    {isPartyDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPartyDropdownOpen(false);
                              setIsQuickCustomerModalOpen(true);
                            }}
                            className="text-xs font-bold text-[#33077C] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Add Customer</span>
                          </button>
                          <span className="text-[11px] font-bold text-slate-400 uppercase">
                            Customer Balance
                          </span>
                        </div>

                        <div className="relative mb-2">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            autoFocus
                            placeholder="Search customer by name or phone..."
                            value={partySearchQuery}
                            onChange={(e) =>
                              setPartySearchQuery(e.target.value)
                            }
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
                                <div className="text-xs font-bold text-slate-800">
                                  {cust.name}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {cust.phone}
                                </div>
                              </div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">
                                ₹
                                {(cust.openingBalance || 0).toLocaleString(
                                  "en-IN",
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Phone No Input */}
                  <div className="w-40 sm:w-48">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Phone No.
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      maxLength={10}
                      value={activeTab.formData.customerPhone}
                      onKeyDown={handleNumberOnlyKeyDown}
                      onChange={(e) => {
                        const clean = normalizeIndianPhoneTo10Digits(e.target.value);
                        updateActiveTabFormData((prev) => ({
                          ...prev,
                          customerPhone: clean,
                        }));
                      }}
                      className="w-full h-11 px-3 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Right Column: Order No, Order Date, Due Date, State of supply */}
                <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Order No */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Order No.
                    </label>
                    <input
                      type="text"
                      value={activeTab.formData.referenceNo}
                      onChange={(e) =>
                        updateActiveTabFormData((prev) => ({
                          ...prev,
                          referenceNo: e.target.value,
                        }))
                      }
                      className="w-full h-11 px-3 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                    />
                  </div>

                  {/* Order Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Order Date
                    </label>
                    <input
                      type="date"
                      value={activeTab.formData.orderDate}
                      onChange={(e) =>
                        updateActiveTabFormData((prev) => ({
                          ...prev,
                          orderDate: e.target.value,
                        }))
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
                        updateActiveTabFormData((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
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
                        updateActiveTabFormData((prev) => ({
                          ...prev,
                          stateOfSupply: e.target.value,
                        }))
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

              {/* 3. Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center text-white/80">
                          #
                        </th>
                        <th className="py-3 px-4 min-w-[200px] text-white">
                          Item
                        </th>
                        <th className="py-3 px-3 min-w-[130px] text-center text-white">
                          Batch No
                        </th>
                        <th className="py-3 px-3 w-20 text-center text-white">
                          Qty
                        </th>
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
                          <th className="py-3 px-3 min-w-[130px] text-white">
                            Discount
                          </th>
                        )}
                        <th className="py-3 px-3 min-w-[130px] text-white">
                          Tax
                        </th>
                        <th className="py-3 px-4 w-32 text-right text-white">
                          Amount
                        </th>
                        <th className="py-3 px-2 w-10 text-center text-white/80">
                          <Plus className="w-4 h-4 text-white mx-auto" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {activeTab.formData.items.map((rowItem, idx) => (
                        <tr
                          key={rowItem.id || idx}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3 px-3 text-center text-slate-400 font-semibold">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 min-w-[200px]">
                            <SearchableSelect
                              value={rowItem.productId || ""}
                              onChange={(val) => {
                                handleItemChange(idx, "productId", val);
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
              </div>

              {/* 4. Bottom Options: Payment Type, Terms, Notes & Round Off */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                {/* Left Column Controls */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Payment Type Section */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Payment Type
                      </label>
                      <span className="text-xs font-bold text-[#33077C] hover:underline cursor-pointer">
                        + Add Payment type
                      </span>
                    </div>
                    <select
                      value={activeTab.formData.paymentType}
                      onChange={(e) =>
                        updateActiveTabFormData((prev) => ({
                          ...prev,
                          paymentType: e.target.value,
                        }))
                      }
                      className="w-full sm:w-64 h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-[#4309A2] cursor-pointer"
                    >
                      {PAYMENT_TYPES.map((pt) => (
                        <option key={pt} value={pt}>
                          {pt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Additional Buttons Row */}
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowTermsSection(!showTermsSection)}
                      className={`h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        showTermsSection
                          ? "bg-purple-50 text-[#33077C] border-purple-300 shadow-2xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>ADD TERMS &amp; CONDITIONS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShowDescriptionSection(!showDescriptionSection)
                      }
                      className={`h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        showDescriptionSection
                          ? "bg-purple-50 text-[#33077C] border-purple-300 shadow-2xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                      <span>ADD DESCRIPTION</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowImageSection(!showImageSection);
                        if (!attachedImageName)
                          setAttachedImageName("purchase_po_scan.jpg");
                      }}
                      className={`h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        showImageSection
                          ? "bg-purple-50 text-[#33077C] border-purple-300 shadow-2xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>ADD IMAGE</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowDocumentSection(!showDocumentSection);
                        if (!attachedDocName)
                          setAttachedDocName("signed_order_sheet.pdf");
                      }}
                      className={`h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        showDocumentSection
                          ? "bg-purple-50 text-[#33077C] border-purple-300 shadow-2xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>ADD DOCUMENT</span>
                    </button>
                  </div>

                  {showTermsSection && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 animate-in fade-in">
                      <label className="text-xs font-bold text-slate-700">
                        Terms &amp; Conditions
                      </label>
                      <textarea
                        rows={3}
                        value={activeTab.formData.terms}
                        onChange={(e) =>
                          updateActiveTabFormData((prev) => ({
                            ...prev,
                            terms: e.target.value,
                          }))
                        }
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-[#4309A2]"
                      />
                    </div>
                  )}

                  {showDescriptionSection && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 animate-in fade-in">
                      <label className="text-xs font-bold text-slate-700">
                        Order Description / Notes
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Add any delivery notes or packaging instructions..."
                        value={activeTab.formData.notes}
                        onChange={(e) =>
                          updateActiveTabFormData((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
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
                      ₹
                      {currentCalculations.netTaxable.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {currentCalculations.totalTax > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Total Tax</span>
                      <span className="font-semibold text-slate-800">
                        ₹
                        {currentCalculations.totalTax.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
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
                      <span className="text-xs font-bold text-slate-700">
                        Round Off
                      </span>
                    </label>
                    <span className="text-xs font-bold text-slate-600">
                      ₹{currentCalculations.roundOff.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t-2 border-slate-300">
                    <span className="text-sm font-black text-slate-900 uppercase">
                      Total Amount
                    </span>
                    <span className="text-xl font-black text-[#33077C]">
                      ₹
                      {currentCalculations.finalAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
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
              onClick={() => setViewMode("list")}
              className="h-10 px-5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 stroke-[2.5]" />
              <span>Back to List</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  toast.success("Sale Order link copied & ready to share!")
                }
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs sm:text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <Share2 className="w-4 h-4 text-slate-600" />
                <span>Share</span>
              </button>

              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => handleSaveSaleOrder(true)}
                className="h-10 px-5 rounded-xl border border-[#33077C]/30 bg-purple-50 hover:bg-purple-100 text-[#33077C] text-xs sm:text-[13px] font-bold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#33077C]" />
                ) : (
                  <ShoppingCart className="w-4 h-4" />
                )}
                <span>Save &amp; Convert to Sale</span>
              </button>

              <button
                type="submit"
                form="sale-order-form"
                disabled={isActionLoading}
                className="h-10 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>
                  {activeTab.editingOrder ? "Update Order" : "Save Order"}
                </span>
              </button>
            </div>
          </div>
        </form>

        {/* Quick Customer Add Modal */}
        {isQuickCustomerModalOpen && (
          <Modal
            isOpen={isQuickCustomerModalOpen}
            onClose={() => setIsQuickCustomerModalOpen(false)}
            title="Add New Customer"
            subtitle="Register customer details to link with this Sale Order"
            maxWidth="md"
            headerGradient={true}
            showBackIcon={true}
            hideCloseButton={true}
          >
            <form
              noValidate
              onSubmit={handleSaveQuickCustomer}
              className="p-4 sm:p-6 space-y-4 pt-5"
            >
              <div>
                <FormLabel required>Customer / Business Name</FormLabel>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keerthivasan Retail Store"
                  value={quickCustName}
                  onChange={(e) => setQuickCustName(e.target.value)}
                  className={FORM_INPUT_CLS}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
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
                        setQuickCustPhoneError("Phone number must be a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)");
                      } else {
                        setQuickCustPhoneError("");
                      }
                    }}
                    className={getFormInputCls(Boolean(quickCustPhoneError))}
                  />
                  {quickCustPhoneError && <FormError message={quickCustPhoneError} />}
                </div>
                <div>
                  <FormLabel>Opening Balance</FormLabel>
                  <input
                    type="number"
                    placeholder="600"
                    value={quickCustOpeningBal}
                    onChange={(e) => setQuickCustOpeningBal(e.target.value)}
                    className={FORM_INPUT_CLS}
                  />
                </div>
              </div>

              <div className="pt-1">
                <FormLabel>Billing Address</FormLabel>
                <input
                  type="text"
                  placeholder="Full street address and state"
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
                  {isActionLoading ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    );
  }

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredOrders.length === 0) {
      toast.error("No sale orders to export");
      return;
    }

    const excelRows = filteredOrders.map((o) => ({
      date: isoToDdmmyyyy(o.orderDate),
      dueDate: isoToDdmmyyyy(o.dueDate),
      orderNo: o.orderNo,
      partyName: o.partyName,
      customerPhone: o.customerPhone || "-",
      amount: Number(o.amount || 0),
      balance: Number(o.balance || 0),
      status: o.status,
    }));

    exportTableToExcel({
      filename: `Sale_Orders_Report_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Sale Orders",
      title: "YAA CREATIONS CRM - SALES ORDER REPORT",
      subtitle: `Filter: ${appliedPeriod} | Total Orders: ${filteredOrders.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: "Order Date", key: "date", align: "center", width: 15 },
        { header: "Due Date", key: "dueDate", align: "center", width: 15 },
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
        date: "TOTAL",
        partyName: `${filteredOrders.length} Orders`,
        amount: metrics.totalVal,
        balance: metrics.openVal,
      },
    });

    toast.success(
      `Sale Orders Excel report downloaded (${filteredOrders.length} records)!`,
    );
  };

  // =========================================================================
  // VIEW MODE: LIST (Transactions Table View - Royal Purple CRM Theme)
  // =========================================================================
  return (
    <div className="space-y-5 pb-16 font-sans">
      {/* 1. TOP HEADER CARD (CRM BRAND THEME) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
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
          setAppliedSearch(pendingSearch);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch("");
          setAppliedSearch("");
          setPendingPeriod("This Month");
          setAppliedPeriod("This Month");
          setAppliedStatus("ALL");
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
                const openOrders = saleOrders.filter((o) => o.status === "Open");
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
              className="h-10 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#33077C]/20 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Sale Order</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-[13px] border-collapse min-w-[850px]">
              {/* Royal Purple Header */}
              <thead>
                <tr className="bg-[#33077C] text-white font-bold uppercase text-[10.5px] border-b border-[#4309A2] tracking-wider select-none">
                  <th className="py-3.5 px-4 border-r border-[#4309A2]/70 whitespace-nowrap text-white min-w-[180px]">
                    <div className="flex items-center justify-between gap-1.5">
                      <span>CUSTOMER NAME</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 border-r border-[#4309A2]/70 text-center whitespace-nowrap min-w-[140px] text-white">
                    <div className="flex items-center justify-center gap-1">
                      <span>SALE ORDER NO.</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 border-r border-[#4309A2]/70 whitespace-nowrap min-w-[110px] text-white">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1">
                        DATE <span className="text-purple-200">↓</span>
                      </span>
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
                  <th className="py-3.5 px-3 border-r border-[#4309A2]/70 text-right whitespace-nowrap min-w-[120px] text-white">
                    <div className="flex items-center justify-end gap-1.5">
                      <span>BALANCE</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 border-r border-[#4309A2]/70 whitespace-nowrap min-w-[100px] text-white">
                    TYPE
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
                            <div className="text-[11px] text-slate-400 font-normal">
                              {item.customerPhone}
                            </div>
                          )}
                        </td>

                        {/* 2. NO. */}
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

                        {/* 3. DATE */}
                        <td className="py-3.5 px-3 text-slate-700 font-semibold border-r border-slate-200 whitespace-nowrap align-middle">
                          {isoToDdmmyyyy(item.orderDate)}
                        </td>

                        {/* 4. DUE DATE */}
                        <td className="py-3.5 px-3 text-slate-600 font-medium border-r border-slate-200 whitespace-nowrap align-middle">
                          {isoToDdmmyyyy(item.dueDate)}
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
                            {item.status === "Converted" ||
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
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            {/* CONVERT TO SALE Button */}
                            <button
                              type="button"
                              disabled={
                                isActionLoading || item.status === "Converted"
                              }
                              onClick={() => handleConvertExistingToSale(item)}
                              className="px-2.5 py-1 text-[11px] font-bold text-[#33077C] hover:text-white bg-purple-50 hover:bg-[#33077C] border border-purple-200 rounded transition-colors cursor-pointer uppercase tracking-wider select-none shadow-2xs disabled:opacity-40"
                            >
                              CONVERT TO SALE
                            </button>

                            {/* 3-Dots Actions Menu */}
                            <SaleActionDropdown
                              items={[
                                {
                                  label: "Convert to Delivery Challan",
                                  variant: "challan",
                                  onClick: () => handleConvertExistingToChallan(item),
                                },
                                {
                                  label: "Convert to Sales Invoice",
                                  variant: "invoice",
                                  hidden: item.status === "Converted",
                                  onClick: () => handleConvertExistingToSale(item),
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
                                  label: "Preview",
                                  variant: "preview",
                                  onClick: () => setPreviewOrder(item),
                                },
                                {
                                  label: "Print Order",
                                  variant: "print",
                                  onClick: () => handlePrintOrder(item),
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
                                  onClick: () => handleDeleteOrder(item.id),
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
          pageSizeOptions={[10, 20, 50]}
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

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
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
                    <td className="p-2.5 text-right">{it.taxPercent || 0}%</td>
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

            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs text-slate-600">
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

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
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
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Order</span>
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
          <div className="p-6 space-y-4 text-xs font-sans">
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
    </div>
  );
};

export default SaleOrderView;
