import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Printer,
  BarChart2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  IndianRupee,
  TrendingUp,
  FileText,
  User,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft,
  UsersRound,
  Sparkles,
  CreditCard,
  MoreVertical,
  X,
  Check,
  FileSpreadsheet,
  Download,
  Tag,
  Percent,
  History,
  Receipt,
  Share2,
  Forward,
  UserCheck,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  Database,
} from "lucide-react";
import {
  useSalesManagementStore,
  SaleTransaction,
  SaleProductItem,
  SaleStatus,
  SalePaymentStatus,
  PaymentSplitItem,
  SalePaymentRecord,
} from "../../../store/useSalesManagementStore";
import { Badge } from "../../../components/common/Badge";
import { Button } from "../../../components/common/Button";
import { Modal } from "../../../components/common/Modal";
import { Pagination } from "../../../components/common/Pagination";
import { SearchBar } from "../../../components/common/SearchBar";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { SearchableSelect } from "../../../components/common/SearchableSelect";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SalesCustomer } from "../../../store/useSalesManagementStore";
import { exportTableToExcel } from "../../../utils/excelExport";
import { printTableReport, printHtmlElement } from "../../../utils/printUtils";
import {
  UniversalShareDropdown,
  formatInvoiceShare,
} from "../../../utils/shareUtils";
import { SalesGraphModal } from "./SalesGraphModal";
import { SaleActionDropdown } from "../utils";
import {
  commerceInvoiceApi,
  mapApiInvoiceToSaleTransaction,
  mapSaleTransactionToInvoicePayload,
  InvoiceFilterParams,
  UUID_REGEX,
  customerApi,
  mapApiCustomerToSalesCustomer,
  stockApi,
  mapApiStockToInventoryStockItem,
  productApi,
} from "../../../api";
import { DocumentLineageBadges } from "../../../components/common/DocumentLineageBadges";
import { initializeWorkflowIntegrity } from "../../../utils/salesDocumentWorkflow";
import {
  FormLabel,
  FORM_INPUT_CLS,
  FORM_SELECT_CLS,
  FORM_TEXTAREA_CLS,
} from "../utils/formUtils";

// Helper functions for dd/mm/yyyy <-> YYYY-MM-DD
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

interface CustomCustomerSelectProps {
  value: string;
  onChange: (customerId: string) => void;
  customers: any[];
  onAddNewCustomer: () => void;
  getCustomerMetrics?: (id: string) => any;
}

const CustomCustomerSelect: React.FC<CustomCustomerSelectProps> = ({
  value,
  onChange,
  customers = [],
  onAddNewCustomer,
  getCustomerMetrics,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.customerCode?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q),
    );
  }, [customers, searchQuery]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === value);
  }, [customers, value]);

  const displayText = selectedCustomer
    ? `${selectedCustomer.name}${selectedCustomer.company ? ` (${selectedCustomer.company})` : ""}`
    : "";

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Standard Select Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none flex items-center justify-between cursor-pointer transition-all ${
          isOpen
            ? "border-[#4309A2] ring-4 ring-[#4309A2]/10"
            : value
              ? "border-slate-300 hover:border-slate-400"
              : "border-slate-200 hover:border-slate-300"
        }`}
      >
        {/* Selected value or placeholder */}
        <span
          className={`text-xs sm:text-[13px] font-medium truncate ${
            displayText ? "text-slate-800" : "text-slate-400"
          }`}
        >
          {displayText || "Select or Search Customer..."}
        </span>

        {/* Arrow (Triangle Up / Down) */}
        <span className="text-[10px] text-slate-400 font-bold ml-2 transition-transform select-none shrink-0">
          {isOpen ? "▲" : "▼"}
        </span>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[320px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* 1. Search Pill Input */}
          <div className="relative mb-2">
            <div className="flex items-center w-full h-9 px-3 bg-white border border-slate-200 rounded-full focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/10 transition-all shadow-2xs">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search Customer"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    if (filteredCustomers.length > 0) {
                      onChange(filteredCustomers[0].id);
                      setIsOpen(false);
                    }
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(false);
                  }
                }}
                className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600 p-0.5 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Add New Customer Action */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onAddNewCustomer();
            }}
            className="w-full px-3 py-2 text-left text-xs font-bold text-[#33077C] hover:bg-[#33077C]/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer mb-1"
          >
            <Plus className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
            <span>Add New Customer</span>
          </button>

          {/* 3. Customer Checkbox List */}
          <div className="max-h-56 overflow-y-auto space-y-1 p-0.5">
            {filteredCustomers.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-medium">
                No customers found
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = value === cust.id;
                const metrics = getCustomerMetrics
                  ? getCustomerMetrics(cust.id)
                  : null;
                const out = metrics?.outstandingAmount || 0;

                return (
                  <div
                    key={cust.id}
                    onClick={() => {
                      onChange(isSelected ? "" : cust.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-medium flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#33077C]/10 text-[#33077C] font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Checkbox Box */}
                      <div
                        className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? "border-[#33077C] bg-[#33077C] text-white"
                            : "border-slate-400 bg-white hover:border-[#33077C]"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {cust.name}{" "}
                          {cust.company ? (
                            <span className="font-normal text-slate-600">
                              ({cust.company})
                            </span>
                          ) : (
                            ""
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                          {cust.customerCode} • {cust.phone || "No phone"}
                          {out > 0 && (
                            <span className="text-rose-600 font-semibold ml-1.5">
                              • Outstanding: ₹{out.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {cust.customerCode && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#33077C]/10 text-[#33077C] shrink-0">
                        {cust.customerCode}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const SalesView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    sales,
    customers = [],
    salesRepresentatives = [],
    assignCustomerSalesRep,
    saveSale,
    deleteSale,
    updateSalePayment,
    saveCustomer,
    setCustomersList,
    setStocksList,
    setSalesList,
    getCustomerMetrics,
    stocks,
  } = useSalesManagementStore();
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [productList, setProductList] = useState<any[]>([]);

  // Deduplicated customer master data loader (only runs once on mount)
  const hasLoadedCustomersRef = useRef(false);
  const loadCustomersData = useCallback(async () => {
    if (hasLoadedCustomersRef.current) return;
    hasLoadedCustomersRef.current = true;
    try {
      const custRes = await customerApi
        .getCustomers({ pagination_required: false, page_size: 100 })
        .catch(() => null);
      if (custRes?.data && Array.isArray(custRes.data)) {
        const mapped = custRes.data.map(mapApiCustomerToSalesCustomer);
        setCustomerList(mapped);
        setCustomersList(mapped);
      }
    } catch (err) {
      console.warn("Failed to load customers in SalesView:", err);
    }
  }, [setCustomersList]);

  useEffect(() => {
    loadCustomersData();
  }, [loadCustomersData]);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pendingSaleStatus, setPendingSaleStatus] = useState("All");
  const [appliedSaleStatus, setAppliedSaleStatus] = useState("All");
  const [pendingPaymentStatus, setPendingPaymentStatus] = useState("All");
  const [appliedPaymentStatus, setAppliedPaymentStatus] = useState("All");
  const [pendingCustomer, setPendingCustomer] = useState("All");
  const [appliedCustomer, setAppliedCustomer] = useState("All");
  const [pendingSalesRep, setPendingSalesRep] = useState("All");
  const [appliedSalesRep, setAppliedSalesRep] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isSalesGraphModalOpen, setIsSalesGraphModalOpen] = useState(false);

  useEffect(() => {
    initializeWorkflowIntegrity();
  }, []);

  useEffect(() => {
    const q = searchParams.get("search");
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
        setCurrentPage(1);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [pendingSearch, appliedSearch]);

  // 3-Dots Action dropdown
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  // Share Popover dropdown
  const [activeShareDropdownId, setActiveShareDropdownId] = useState<
    string | null
  >(null);
  const [shareDropdownPos, setShareDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  // Bottom Payment History Logs Filters & Pagination
  const [paymentLogSearch, setPaymentLogSearch] = useState("");
  const [paymentLogMethodFilter, setPaymentLogMethodFilter] = useState("All");
  const [paymentLogPage, setPaymentLogPage] = useState(1);
  const [paymentLogPageSize, setPaymentLogPageSize] = useState(5);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] =
    useState(false);
  const [isPaymentDetailsModalOpen, setIsPaymentDetailsModalOpen] =
    useState(false);
  const [selectedPaymentRecord, setSelectedPaymentRecord] =
    useState<SalePaymentRecord | null>(null);
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] =
    useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleTransaction | null>(
    null,
  );
  const [editingSale, setEditingSale] = useState<SaleTransaction | null>(null);

  // Load Stocks on demand only when Form Modal is opened (products are searched on demand)
  const hasLoadedProductsRef = useRef(false);
  const loadProductAndStockData = useCallback(async () => {
    if (hasLoadedProductsRef.current) return;
    hasLoadedProductsRef.current = true;
    try {
      const [stockRes, prodRes] = await Promise.allSettled([
        stockApi.getStocks({ pagination_required: false }),
        productApi.getProducts({ page_size: 100, pagination_required: false }),
      ]);
      if (
        stockRes.status === "fulfilled" &&
        stockRes.value?.data &&
        Array.isArray(stockRes.value.data)
      ) {
        setStocksList(stockRes.value.data.map(mapApiStockToInventoryStockItem));
      }
      if (
        prodRes.status === "fulfilled" &&
        prodRes.value?.data &&
        Array.isArray(prodRes.value.data)
      ) {
        setProductList((prev) => {
          const map = new Map<string, any>();
          prev.forEach((p) => map.set(p.id, p));
          prodRes.value.data.forEach((p: any) => {
            map.set(p.id, {
              id: p.id,
              name: p.productName || p.name,
              code: p.productCode || p.sku || p.code || p.id,
              sku: p.productCode || p.sku || p.code || p.id,
              price: Number(p.salePrice ?? p.sellingPrice ?? p.unitPrice ?? 0),
              cost: Number(p.purchasePrice ?? p.costPrice ?? 0),
              unit: p.unit || "PCS",
              batches: p.batches || [],
              hsnCode: p.hsnCode || "",
            });
          });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn("Failed to load stocks/products for form modal:", err);
    }
  }, [setStocksList]);

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
        setProductList((prev) => {
          const map = new Map<string, any>();
          prev.forEach((p) => map.set(p.id, p));
          res.data.forEach((p: any) => {
            map.set(p.id, {
              id: p.id,
              name: p.productName || p.name,
              code: p.productCode || p.sku || p.code || p.id,
              sku: p.productCode || p.sku || p.code || p.id,
              price: Number(p.salePrice || p.unitPrice || 0),
              cost: Number(p.purchasePrice || p.costPrice || 0),
              unit: p.unit || "PCS",
              batches: p.batches || [],
            });
          });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn("Failed to search products in SalesView:", err);
    } finally {
      setIsSearchingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (isFormModalOpen) {
      loadProductAndStockData();
    }
  }, [isFormModalOpen, loadProductAndStockData]);

  // API States
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [totalApiRecords, setTotalApiRecords] = useState(0);
  const [totalApiPages, setTotalApiPages] = useState(1);

  // Helper to ensure Product UUID
  const ensureProductUUID = async (item: SaleProductItem): Promise<string> => {
    if (item.productId && UUID_REGEX.test(item.productId)) {
      return item.productId;
    }
    const foundStock = (stocks || []).find(
      (s) =>
        (s.sku && item.sku && s.sku.toLowerCase() === item.sku.toLowerCase()) ||
        (s.productName &&
          item.productName &&
          s.productName.toLowerCase() === item.productName.toLowerCase()) ||
        s.id === item.productId ||
        s.productId === item.productId,
    );
    if (foundStock) {
      if (foundStock.productId && UUID_REGEX.test(foundStock.productId))
        return foundStock.productId;
      if (foundStock.id && UUID_REGEX.test(foundStock.id)) return foundStock.id;
    }
    const foundProd = (productList as any[]).find(
      (p: any) =>
        (p.sku && item.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
        (p.name &&
          item.productName &&
          p.name.toLowerCase() === item.productName.toLowerCase()) ||
        p.id === item.productId,
    );
    if (foundProd && UUID_REGEX.test(foundProd.id)) {
      return foundProd.id;
    }
    try {
      const createRes = await productApi.createProduct({
        productName: item.productName || "Sale Item",
        productCode: item.sku || `PRD-${Date.now().toString().slice(-6)}`,
        unit: "PCS",
        category: "General",
        salePrice: item.unitPrice || 0,
        purchasePrice: item.purchasePrice || 0,
      });
      if (createRes && createRes.data && createRes.data.id) {
        return createRes.data.id;
      }
    } catch (err) {
      console.warn("Auto-create product fallback:", err);
    }
    return item.productId || "a1b2c3d4-0000-4000-8000-000000000101";
  };

  // Helper to ensure Customer UUID
  const ensureCustomerUUID = (
    custId?: string,
    custName?: string,
  ): string | undefined => {
    if (custId && UUID_REGEX.test(custId)) {
      return custId;
    }
    const foundCust = (customers || []).find(
      (c) =>
        c.id === custId ||
        (c.name &&
          custName &&
          c.name.toLowerCase() === custName.toLowerCase()) ||
        (c.company &&
          custName &&
          c.company.toLowerCase() === custName.toLowerCase()),
    );
    if (foundCust && UUID_REGEX.test(foundCust.id)) {
      return foundCust.id;
    }
    const foundInList = (customerList as any[]).find(
      (c: any) =>
        c.id === custId ||
        (c.name && custName && c.name.toLowerCase() === custName.toLowerCase()),
    );
    if (foundInList && UUID_REGEX.test(foundInList.id)) {
      return foundInList.id;
    }
    return undefined;
  };

  // Live Invoices Fetching
  const isFetchingInvoicesRef = useRef(false);
  const fetchSalesInvoices = useCallback(async () => {
    if (isFetchingInvoicesRef.current) return;
    isFetchingInvoicesRef.current = true;
    setIsApiLoading(true);
    try {
      const params: InvoiceFilterParams = {
        page_no: currentPage,
        page_size: pageSize,
        pagination_required: "true",
        sortOrder: "desc",
      };
      if (appliedSearch && appliedSearch.trim()) {
        params.search = appliedSearch.trim();
      }
      if (appliedSaleStatus && appliedSaleStatus.toUpperCase() !== "ALL") {
        params.status = appliedSaleStatus;
      }
      if (
        appliedPaymentStatus &&
        appliedPaymentStatus.toUpperCase() !== "ALL"
      ) {
        params.paymentStatus = appliedPaymentStatus;
      }
      if (
        appliedCustomer &&
        appliedCustomer.toUpperCase() !== "ALL" &&
        UUID_REGEX.test(appliedCustomer)
      ) {
        params.customerId = appliedCustomer;
      }

      const res = await commerceInvoiceApi.getInvoices(params);
      if (res && res.data && Array.isArray(res.data)) {
        const mapped = res.data.map((inv) =>
          mapApiInvoiceToSaleTransaction(inv),
        );
        const rawLocal = localStorage.getItem("yaa_crm_sales_transactions");
        const localSales: SaleTransaction[] = rawLocal
          ? JSON.parse(rawLocal)
          : [];
        const apiInvoiceNos = new Set(mapped.map((m) => m.invoiceNo || m.id));
        const extraLocals = localSales.filter(
          (l) => !apiInvoiceNos.has(l.invoiceNo) && !apiInvoiceNos.has(l.id),
        );
        const merged = [...extraLocals, ...mapped];

        setSalesList(merged);
        if (res.pagination) {
          setTotalApiRecords(
            (res.pagination.totalRecords ?? mapped.length) + extraLocals.length,
          );
          setTotalApiPages(Math.max(1, Math.ceil(merged.length / pageSize)));
        } else {
          setTotalApiRecords(merged.length);
          setTotalApiPages(1);
        }
        setIsApiConnected(true);
      }
    } catch (err: any) {
      console.error("Failed to fetch invoices:", err);
      const rawLocal = localStorage.getItem("yaa_crm_sales_transactions");
      const localSales: SaleTransaction[] = rawLocal
        ? JSON.parse(rawLocal)
        : [];
      if (localSales.length > 0) {
        setSalesList(localSales);
      }
      setIsApiConnected(false);
    } finally {
      setIsApiLoading(false);
      isFetchingInvoicesRef.current = false;
    }
  }, [
    currentPage,
    pageSize,
    appliedSearch,
    appliedSaleStatus,
    appliedPaymentStatus,
    appliedCustomer,
    setSalesList,
  ]);

  useEffect(() => {
    fetchSalesInvoices();
  }, [fetchSalesInvoices]);

  // Quick Assign Sales Rep Modal State (Table Row Action)
  const [isAssignInvoiceModalOpen, setIsAssignInvoiceModalOpen] =
    useState(false);
  const [assignInvoiceTarget, setAssignInvoiceTarget] =
    useState<SaleTransaction | null>(null);
  const [assignRepId, setAssignRepId] = useState("");
  const [assignStatus, setAssignStatus] = useState("Pending Follow-up");
  const [assignNextFollowUp, setAssignNextFollowUp] = useState("");

  // Invoice Details Modal Assignment Card State
  const [detailRepId, setDetailRepId] = useState("");
  const [detailCollectionStatus, setDetailCollectionStatus] =
    useState("Pending Follow-up");
  const [detailNextFollowUp, setDetailNextFollowUp] = useState("");

  useEffect(() => {
    if (selectedSale) {
      setDetailRepId(selectedSale.salesRepresentativeId || "");
      setDetailCollectionStatus(
        selectedSale.collectionStatus || "Pending Follow-up",
      );
      setDetailNextFollowUp(selectedSale.nextFollowUpDate || "");
    }
  }, [selectedSale]);

  // Quick Customer Form State
  const [quickCustomerForm, setQuickCustomerForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
    creditLimit: "",
    paymentTerms: "",
  });

  // Payment Recording Modal State
  const [paymentModalSplits, setPaymentModalSplits] = useState<
    PaymentSplitItem[]
  >([{ id: "rec_1", method: "Bank Transfer", amount: 0, referenceNo: "" }]);
  const [paymentModalDate, setPaymentModalDate] = useState<string>(
    () => new Date().toISOString().split("T")[0],
  );
  const [recordNotes, setRecordNotes] = useState("");

  // Form State for Create / Edit
  const [formData, setFormData] = useState<{
    invoiceNo: string;
    invoiceStatus: "Draft" | "Generated" | "Invoiced";
    referenceNo: string;
    saleDate: string;
    dueDate: string;
    customerId: string;
    customerName: string;
    customerCompany: string;
    customerPhone: string;
    customerEmail: string;
    billingAddress: string;
    shippingAddress: string;
    items: SaleProductItem[];
    withGst: boolean;
    gstType: "intra_state" | "inter_state";
    overallDiscount: number;
    shippingCharges: number;
    otherCharges: number;
    paymentMethod:
      | "Cash"
      | "UPI"
      | "Card"
      | "Bank Transfer"
      | "Cheque"
      | "Credit"
      | "Online Payment"
      | "Other";
    paymentSplits: PaymentSplitItem[];
    paymentRecords: SalePaymentRecord[];
    paymentTerms: string;
    paidAmount: number;
    saleStatus: SaleStatus;
    salesperson: string;
    notes: string;
  }>({
    invoiceNo: "",
    invoiceStatus: "Draft",
    referenceNo: "",
    saleDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    customerId: "",
    customerName: "",
    customerCompany: "",
    customerPhone: "",
    customerEmail: "",
    billingAddress: "",
    shippingAddress: "",
    items: [],
    withGst: true,
    gstType: "intra_state",
    overallDiscount: 0,
    shippingCharges: 0,
    otherCharges: 0,
    paymentMethod: "Bank Transfer",
    paymentSplits: [
      { id: "ps_1", method: "Bank Transfer", amount: 0, referenceNo: "" },
    ],
    paymentRecords: [],
    paymentTerms: "Net 15 Days",
    paidAmount: 0,
    saleStatus: "Confirmed",
    salesperson: "Alex Rivera",
    notes: "",
  });

  // Close action & share dropdown on click outside or scroll
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".action-dropdown-container") &&
        !target.closest(".action-dropdown-menu")
      ) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (
        !target.closest(".share-dropdown-container") &&
        !target.closest(".share-dropdown-menu")
      ) {
        setActiveShareDropdownId(null);
        setShareDropdownPos(null);
      }
    };
    const handleScroll = () => {
      if (activeDropdownId) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (activeShareDropdownId) {
        setActiveShareDropdownId(null);
        setShareDropdownPos(null);
      }
    };
    window.addEventListener("click", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("click", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [activeDropdownId, activeShareDropdownId]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalSalesAmount = sales.reduce((acc, s) => acc + s.grandTotal, 0);
    const todayStr = new Date().toISOString().split("T")[0];
    const todaySales = sales.filter((s) => s.saleDate === todayStr);
    const todayAmount = todaySales.reduce((acc, s) => acc + s.grandTotal, 0);
    const pendingPaymentsAmount = sales.reduce((acc, s) => acc + s.balance, 0);
    const completedCount = sales.filter(
      (s) => s.saleStatus === "Completed",
    ).length;
    const cancelledCount = sales.filter(
      (s) => s.saleStatus === "Cancelled",
    ).length;

    return {
      totalCount: sales.length,
      totalSalesAmount,
      todayAmount,
      todayCount: todaySales.length,
      pendingPaymentsAmount,
      completedCount,
      cancelledCount,
    };
  }, [sales]);

  // Product Selection helper with real stock batches and searched products
  const availableProducts = useMemo(() => {
    const map = new Map<string, any>();

    productList.forEach((p) => {
      map.set(p.id, {
        id: p.id,
        name: p.name,
        price: p.price ?? 0,
        cost: p.cost ?? 0,
        sku: p.sku || `SKU-${p.code || "PRD"}`,
        batches: p.batches || [],
        stock: p.stock ?? 0,
      });
    });

    stocks.forEach((stk) => {
      if (!map.has(stk.productId)) {
        map.set(stk.productId, {
          id: stk.productId,
          name: stk.productName,
          price: stk.unitPrice || 0,
          cost: stk.unitCost || 0,
          sku: stk.sku,
          batches: stk.batches || [],
          stock: stk.inStock,
        });
      }
    });

    // Also include line items currently on the invoice so their names are retained
    formData.items.forEach((it) => {
      if (it.productId && !map.has(it.productId)) {
        map.set(it.productId, {
          id: it.productId,
          name: it.productName || "Product",
          price: it.unitPrice || 0,
          cost: it.purchasePrice || 0,
          sku: it.sku,
          batches: [],
          stock: 0,
        });
      }
    });

    return Array.from(map.values());
  }, [stocks, productList, formData.items]);

  const productOptions = useMemo(() => {
    return availableProducts.map((p) => ({
      value: p.id,
      label: p.name,
      subLabel: p.sku
        ? `SKU: ${p.sku} • ₹${p.price.toLocaleString("en-IN")}`
        : `₹${p.price.toLocaleString("en-IN")}`,
      badge: p.sku,
    }));
  }, [availableProducts]);

  // Handle opening Create Modal
  const handleOpenCreateModal = () => {
    const nextInvNum = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const defaultProduct = availableProducts[0] || {
      id: "PROD_1",
      name: "ERP Business Suite Enterprise",
      price: 32000,
      cost: 18000,
      sku: "SKU-ERP-ENT",
      batches: [],
      stock: 145,
    };
    const firstActiveBatch =
      defaultProduct.batches?.find((b: any) => b.quantity > 0) ||
      defaultProduct.batches?.[0];

    const initialItem: SaleProductItem = {
      id: `s_item_${Date.now()}`,
      productId: defaultProduct.id,
      productName: defaultProduct.name,
      sku: defaultProduct.sku,
      batch: firstActiveBatch?.batchNo || "BAT-ERP-2026A",
      quantity: 1,
      purchasePrice:
        firstActiveBatch?.costPrice ?? defaultProduct.cost ?? 18000,
      salesPrice:
        firstActiveBatch?.sellingPrice ?? defaultProduct.price ?? 32000,
      unitPrice:
        firstActiveBatch?.sellingPrice ?? defaultProduct.price ?? 32000,
      discountPercent: 0,
      taxPercent: 18,
      total:
        Math.round(
          (firstActiveBatch?.sellingPrice ?? defaultProduct.price ?? 32000) *
            1.18 *
            100,
        ) / 100,
    };

    const secondEmptyItem: SaleProductItem = {
      id: `s_item_${Date.now()}_empty`,
      productId: "",
      productName: "",
      sku: "",
      batch: "",
      quantity: 1,
      purchasePrice: 0,
      salesPrice: 0,
      unitPrice: 0,
      discountPercent: 0,
      taxPercent: 0,
      total: 0,
    };

    setFormData({
      invoiceNo: nextInvNum,
      referenceNo: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      saleDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      customerId: "",
      customerName: "",
      customerCompany: "",
      customerPhone: "",
      customerEmail: "",
      billingAddress: "",
      shippingAddress: "",
      items: [initialItem, secondEmptyItem],
      withGst: true,
      gstType: "intra_state",
      overallDiscount: 0,
      shippingCharges: 0,
      otherCharges: 0,
      paymentMethod: "Bank Transfer",
      paymentSplits: [
        { id: "ps_1", method: "Bank Transfer", amount: 0, referenceNo: "" },
        { id: "ps_2", method: "Cash", amount: 0, referenceNo: "" },
      ],
      paymentTerms: "",
      paidAmount: 0,
      invoiceStatus: "Draft",
      paymentRecords: [],
      saleStatus: "Confirmed",
      salesperson: "",
      notes: "",
    });
    setEditingSale(null);
    setIsFormModalOpen(true);
  };

  // Handle opening View Modal
  const handleOpenViewInvoice = async (sale: SaleTransaction) => {
    let targetSale = sale;
    if (UUID_REGEX.test(sale.id)) {
      try {
        const fresh = await commerceInvoiceApi.getInvoiceById(sale.id);
        if (fresh && fresh.data) {
          targetSale = mapApiInvoiceToSaleTransaction(fresh.data);
        }
      } catch (err) {
        console.warn("Could not fetch fresh invoice details:", err);
      }
    }
    setSelectedSale(targetSale);
    setIsInvoiceModalOpen(true);
  };

  // Handle opening Edit Modal
  const handleOpenEditModal = async (sale: SaleTransaction) => {
    let targetSale = sale;
    if (UUID_REGEX.test(sale.id)) {
      try {
        const fresh = await commerceInvoiceApi.getInvoiceById(sale.id);
        if (fresh && fresh.data) {
          targetSale = mapApiInvoiceToSaleTransaction(fresh.data);
        }
      } catch (err) {
        console.warn("Could not fetch fresh invoice details for editing:", err);
      }
    }
    const existingSplits: PaymentSplitItem[] =
      sale.paymentSplits && sale.paymentSplits.length > 0
        ? JSON.parse(JSON.stringify(sale.paymentSplits))
        : [
            {
              id: "ps_1",
              method: sale.paymentMethod || "Bank Transfer",
              amount: sale.paidAmount || 0,
              referenceNo: "",
            },
          ];

    setFormData({
      invoiceNo: sale.invoiceNo,
      referenceNo:
        sale.referenceNo || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      saleDate: sale.saleDate,
      dueDate: sale.dueDate,
      customerId: sale.customerId,
      customerName: sale.customerName,
      customerCompany: sale.customerCompany || "",
      customerPhone: sale.customerPhone || "",
      customerEmail: sale.customerEmail || "",
      billingAddress: sale.billingAddress,
      shippingAddress: sale.shippingAddress,
      items: JSON.parse(JSON.stringify(sale.items)),
      withGst: sale.withGst !== undefined ? sale.withGst : true,
      gstType: sale.gstType || "intra_state",
      overallDiscount:
        sale.overallDiscount !== undefined
          ? sale.overallDiscount
          : sale.totalDiscount || 0,
      shippingCharges: sale.shippingCharges,
      otherCharges: sale.otherCharges,
      paymentMethod: sale.paymentMethod,
      paymentSplits: existingSplits,
      paymentTerms: sale.paymentTerms,
      paidAmount: sale.paidAmount,
      invoiceStatus: sale.invoiceStatus || "Generated",
      paymentRecords: sale.paymentRecords || [],
      saleStatus: sale.saleStatus,
      salesperson: sale.salesperson,
      notes: sale.notes || "",
    });
    setEditingSale(sale);
    setIsFormModalOpen(true);
  };

  // Direct Print Invoice
  const handlePrintSaleInvoice = (sale: SaleTransaction) => {
    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (!printWindow) {
      toast.error("Unable to open print preview. Please allow popups.");
      return;
    }

    const itemsRows = sale.items
      .map(
        (item, idx) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #1e293b;">
            ${item.productName} ${item.sku ? `<span style="color: #94a3b8; font-weight: normal;">(${item.sku})</span>` : ""}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #33077C; font-family: monospace; font-weight: 700;">${item.batch || "—"}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; font-weight: 700; color: #1e293b;">${item.quantity}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; color: #1e293b;">₹${item.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #1e293b;">${item.discountPercent || 0}%</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #1e293b;">${sale.withGst !== false ? `${item.taxPercent}%` : "0%"}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; font-weight: 700; color: #1e293b;">₹${item.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        </tr>
      `,
      )
      .join("");

    const taxRows =
      sale.withGst !== false && sale.totalTax > 0
        ? sale.gstType === "inter_state"
          ? `<tr>
              <td style="padding: 4px 0; color: #64748b; font-size: 12px;">IGST:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 12px;">+₹${(sale.igst !== undefined ? sale.igst : sale.totalTax).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            </tr>`
          : `<tr>
              <td style="padding: 4px 0; color: #64748b; font-size: 12px;">CGST (50%):</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 12px;">+₹${(sale.cgst !== undefined ? sale.cgst : sale.totalTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-size: 12px;">SGST (50%):</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 12px;">+₹${(sale.sgst !== undefined ? sale.sgst : sale.totalTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            </tr>`
        : `<tr>
            <td style="padding: 4px 0; color: #64748b; font-size: 12px;">Tax (Exempt):</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 12px;">₹0.00</td>
          </tr>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${sale.invoiceNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
            body { background: #fff; color: #0f172a; padding: 32px; font-size: 13px; }
            @media print {
              body { padding: 16px; }
              @page { margin: 12mm; }
            }
          </style>
        </head>
        <body>
          <div style="max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #33077C; padding-bottom: 20px; margin-bottom: 20px;">
              <div>
                <h1 style="font-size: 22px; font-weight: 800; color: #33077C; margin-bottom: 4px;">YAA SALES &amp; MART</h1>
                <p style="font-size: 12px; color: #64748b; line-height: 1.4;">
                  Supermarket &amp; Retail Groceries Distribution<br/>
                  GSTIN: 33AAAAA0000A1Z5 | Phone: +91 98765 43210<br/>
                  Email: billing@yaamart.com
                </p>
              </div>
              <div style="text-align: right;">
                <h2 style="font-size: 20px; font-weight: 800; color: #1e293b; letter-spacing: 0.5px;">TAX INVOICE</h2>
                <div style="margin-top: 6px; font-size: 13px; font-weight: 700; color: #33077C;">Invoice #: ${sale.invoiceNo}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Date: ${isoToDdmmyyyy(sale.saleDate)}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Due Date: ${isoToDdmmyyyy(sale.dueDate)}</div>
              </div>
            </div>

            <!-- Customer & Order Meta -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; padding: 14px; background: #f8fafc; border-radius: 8px;">
              <div>
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Billed To</div>
                <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${sale.customerName}</div>
                ${sale.customerCompany ? `<div style="font-size: 12px; color: #475569;">${sale.customerCompany}</div>` : ""}
                ${sale.customerPhone ? `<div style="font-size: 12px; color: #64748b;">Phone: ${sale.customerPhone}</div>` : ""}
                ${sale.customerEmail ? `<div style="font-size: 12px; color: #64748b;">Email: ${sale.customerEmail}</div>` : ""}
                ${sale.billingAddress ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${sale.billingAddress}</div>` : ""}
              </div>
              <div style="text-align: right;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Invoice Details</div>
                <div style="font-size: 12px; color: #475569;">Payment Status: <strong style="color: ${sale.paymentStatus === "Paid" ? "#16a34a" : sale.paymentStatus === "Partial" ? "#d97706" : "#dc2626"};">${sale.paymentStatus}</strong></div>
                <div style="font-size: 12px; color: #475569; margin-top: 2px;">Salesperson: <strong>${sale.salesperson || "Staff"}</strong></div>
                <div style="font-size: 12px; color: #475569; margin-top: 2px;">Payment Terms: <strong>${sale.paymentTerms || "Net 15 Days"}</strong></div>
                ${sale.referenceNo ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">Ref #: ${sale.referenceNo}</div>` : ""}
              </div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #33077C; color: #ffffff;">
                  <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: center; border-top-left-radius: 6px;">#</th>
                  <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: left;">Item Description</th>
                  <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: center;">Batch</th>
                  <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: center;">Qty</th>
                  <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: right;">Unit Price</th>
                  <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: center;">Disc</th>
                  <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: center;">GST</th>
                  <th style="padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: right; border-top-right-radius: 6px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <!-- Summary & Totals -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
              <div style="width: 320px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-size: 12px;">Subtotal:</td>
                    <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 12px;">₹${sale.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                  ${
                    sale.totalDiscount > 0
                      ? `
                  <tr>
                    <td style="padding: 4px 0; color: #16a34a; font-size: 12px;">Discount:</td>
                    <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #16a34a; font-size: 12px;">-₹${sale.totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>`
                      : ""
                  }
                  ${taxRows}
                  ${
                    sale.shippingCharges > 0
                      ? `
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-size: 12px;">Shipping:</td>
                    <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 12px;">+₹${sale.shippingCharges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>`
                      : ""
                  }
                  <tr style="border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                    <td style="padding: 8px 0; font-weight: 800; color: #33077C; font-size: 14px;">Grand Total:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #33077C; font-size: 15px;">₹${sale.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #16a34a; font-weight: 600; font-size: 12px;">Amount Paid:</td>
                    <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #16a34a; font-size: 12px;">₹${sale.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #d97706; font-weight: 700; font-size: 12px;">Balance Due:</td>
                    <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #d97706; font-size: 13px;">₹${sale.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Footer Notes -->
            <div style="border-top: 1px dashed #cbd5e1; padding-top: 14px; text-align: center; color: #94a3b8; font-size: 11px;">
              <p style="font-weight: 600; color: #64748b;">Thank you for your business with YAA Mart!</p>
              <p style="margin-top: 2px;">This is a computer-generated invoice and requires no signature.</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Share Handlers (Email, WhatsApp, SMS)
  const handleShareEmail = (sale: SaleTransaction) => {
    setActiveShareDropdownId(null);
    setShareDropdownPos(null);
    const email = sale.customerEmail || "";
    const subject = encodeURIComponent(
      `Invoice ${sale.invoiceNo} from YAA Sales & Mart`,
    );
    const body = encodeURIComponent(
      `Dear ${sale.customerName},\n\n` +
        `Thank you for shopping with YAA Sales & Mart. Here are your invoice details:\n\n` +
        `Invoice No: ${sale.invoiceNo}\n` +
        `Date: ${isoToDdmmyyyy(sale.saleDate)}\n` +
        `Total Amount: ₹${sale.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
        `Amount Paid: ₹${sale.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
        `Balance Due: ₹${sale.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
        `Payment Status: ${sale.paymentStatus}\n\n` +
        `Items Purchased:\n` +
        sale.items
          .map(
            (it) =>
              `• ${it.productName} (Qty: ${it.quantity}) - ₹${it.total.toLocaleString("en-IN")}`,
          )
          .join("\n") +
        `\n\nBest regards,\nYAA Sales Team`,
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
    toast.success(`Opening email for invoice ${sale.invoiceNo}`);
  };

  const handleShareWhatsApp = (sale: SaleTransaction) => {
    setActiveShareDropdownId(null);
    setShareDropdownPos(null);
    const phone = sale.customerPhone
      ? sale.customerPhone.replace(/[^0-9]/g, "")
      : "";
    const text = encodeURIComponent(
      `*YAA SALES & MART - INVOICE*\n` +
        `--------------------------------\n` +
        `*Invoice #:* ${sale.invoiceNo}\n` +
        `*Customer:* ${sale.customerName}\n` +
        `*Date:* ${isoToDdmmyyyy(sale.saleDate)}\n` +
        `*Grand Total:* ₹${sale.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
        `*Paid:* ₹${sale.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
        `*Balance:* ₹${sale.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
        `*Status:* ${sale.paymentStatus}\n\n` +
        `*Items:*\n` +
        sale.items
          .map(
            (it) =>
              `• ${it.productName} x ${it.quantity} = ₹${it.total.toLocaleString("en-IN")}`,
          )
          .join("\n") +
        `\n\nThank you for choosing YAA Mart!`,
    );
    const waUrl = phone
      ? `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
    toast.success(`Opening WhatsApp for invoice ${sale.invoiceNo}`);
  };

  const handleShareSMS = (sale: SaleTransaction) => {
    setActiveShareDropdownId(null);
    setShareDropdownPos(null);
    const phone = sale.customerPhone
      ? sale.customerPhone.replace(/[^0-9]/g, "")
      : "";
    const message = encodeURIComponent(
      `YAA MART: Invoice ${sale.invoiceNo} for ${sale.customerName}. Total: Rs.${sale.grandTotal.toLocaleString("en-IN")}, Paid: Rs.${sale.paidAmount.toLocaleString("en-IN")}, Balance: Rs.${sale.balance.toLocaleString("en-IN")}. Thank you!`,
    );
    window.open(`sms:${phone}?body=${message}`, "_blank");
    toast.success(`Opening SMS for invoice ${sale.invoiceNo}`);
  };

  const handleToggleWithGst = (enableGst: boolean) => {
    setFormData((prev) => {
      const updatedItems = prev.items.map((it) => {
        const qty = it.quantity || 0;
        const price = it.unitPrice || 0;
        const disc = it.discountPercent || 0;
        const sub = Math.max(0, qty * price - disc);
        const tax = enableGst ? sub * ((it.taxPercent || 0) / 100) : 0;
        return { ...it, total: Math.round((sub + tax) * 100) / 100 };
      });
      return { ...prev, withGst: enableGst, items: updatedItems };
    });
  };

  const handleSetGstType = (type: "intra_state" | "inter_state") => {
    setFormData((prev) => ({ ...prev, gstType: type }));
  };

  // Split Payment handlers
  const handleAddSplitPayment = () => {
    const newSplit: PaymentSplitItem = {
      id: `ps_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      method: "Cash",
      amount: 0,
      referenceNo: "",
    };
    setFormData((prev) => ({
      ...prev,
      paymentSplits: [...prev.paymentSplits, newSplit],
    }));
  };

  const handleRemoveSplitPayment = (index: number) => {
    if (formData.paymentSplits.length <= 1) {
      toast.error("At least one payment method is required.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      paymentSplits: prev.paymentSplits.filter((_, i) => i !== index),
    }));
  };

  const handleSplitPaymentChange = (
    index: number,
    field: keyof PaymentSplitItem,
    value: string | number,
  ) => {
    setFormData((prev) => {
      const newSplits = [...prev.paymentSplits];
      newSplits[index] = { ...newSplits[index], [field]: value };
      return { ...prev, paymentSplits: newSplits };
    });
  };

  const customerSelectOptions = useMemo(() => {
    const list =
      customers && customers.length > 0 ? customers : (customerList as any[]);
    return list.map((c) => {
      const metrics = getCustomerMetrics ? getCustomerMetrics(c.id) : null;
      const out = metrics?.outstandingAmount || 0;
      return {
        value: c.id,
        label: c.name + (c.company ? ` (${c.company})` : ""),
        subLabel: `${c.customerCode || ""} • ${c.phone || ""}${out > 0 ? ` • Outstanding: ₹${out.toLocaleString()}` : ""}`,
        badge: c.customerCode,
      };
    });
  }, [customers, customerList, getCustomerMetrics]);

  // Selected Customer Credit Stats
  const selectedCustomerFinancials = useMemo(() => {
    if (!formData.customerId || !getCustomerMetrics) return null;
    return getCustomerMetrics(formData.customerId);
  }, [formData.customerId, getCustomerMetrics, sales]);

  // Handle URL Query Params for creating sale with preselected customer
  useEffect(() => {
    const custId = searchParams.get("customerId");
    const shouldCreate = searchParams.get("createSale");
    if (custId && shouldCreate === "true") {
      handleOpenCreateModal();
      setTimeout(() => {
        handleCustomerChange(custId);
      }, 50);
    }
  }, [searchParams]);

  // Quick Customer Creation
  const handleSaveQuickCustomer = () => {
    if (!quickCustomerForm.name.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    if (!quickCustomerForm.phone.trim()) {
      toast.error("Customer phone number is required.");
      return;
    }
    const cleanPhone = quickCustomerForm.phone.replace(/[\s\-()]/g, "");
    if (!/^(?:(?:\+?91)|0)?[6-9]\d{9}$/.test(cleanPhone)) {
      toast.error(
        "Phone number must be a valid 10-digit Indian mobile number (e.g. 9876543210).",
      );
      return;
    }
    const newCust: SalesCustomer = {
      id: `cust_${Date.now()}`,
      customerCode: `CUS-${1000 + (customers?.length || 0) + 1}`,
      name: quickCustomerForm.name.trim(),
      company: quickCustomerForm.company.trim() || undefined,
      customerType: quickCustomerForm.company ? "Business" : "Individual",
      phone: quickCustomerForm.phone.trim(),
      email:
        quickCustomerForm.email.trim() ||
        `${quickCustomerForm.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
      address: quickCustomerForm.address.trim(),
      city: quickCustomerForm.city.trim() || "Chennai",
      state: quickCustomerForm.state.trim() || "Tamil Nadu",
      country: "India",
      pincode: quickCustomerForm.pincode.trim() || "600001",
      gstNumber: quickCustomerForm.gstNumber.trim() || undefined,
      billingAddress:
        quickCustomerForm.address.trim() ||
        `${quickCustomerForm.city || "Chennai"}, ${quickCustomerForm.state || "Tamil Nadu"}`,
      shippingAddress:
        quickCustomerForm.address.trim() ||
        `${quickCustomerForm.city || "Chennai"}, ${quickCustomerForm.state || "Tamil Nadu"}`,
      sameAsBilling: true,
      creditLimit: Number(quickCustomerForm.creditLimit) || 0,
      paymentTerms: quickCustomerForm.paymentTerms.trim(),
      openingBalance: 0,
      status: "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveCustomer(newCust);
    handleCustomerChange(newCust.id);
    setIsQuickCustomerModalOpen(false);
    toast.success(`Customer ${newCust.name} registered & selected!`);
  };

  // Customer Select Change
  const handleCustomerChange = (custId: string) => {
    const cust =
      (customers && customers.find((c) => c.id === custId)) ||
      customerList.find((c) => c.id === custId);
    if (cust) {
      setFormData((prev) => ({
        ...prev,
        customerId: cust.id,
        customerName:
          cust.name || (cust as any).contactPerson || cust.company || "",
        customerCompany: cust.company || cust.name || "",
        customerPhone: cust.phone || "",
        customerEmail: cust.email || "",
        billingAddress:
          (cust as any).billingAddress ||
          cust.address ||
          `${(cust as any).city || ""} ${(cust as any).state || ""}`.trim() ||
          "Address on file",
        shippingAddress:
          (cust as any).shippingAddress ||
          (cust as any).billingAddress ||
          cust.address ||
          `${(cust as any).city || ""} ${(cust as any).state || ""}`.trim() ||
          "Address on file",
        paymentTerms:
          (cust as any).paymentTerms || prev.paymentTerms || "Net 15 Days",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        customerId: "",
        customerName: "",
        customerCompany: "",
        customerPhone: "",
        customerEmail: "",
        billingAddress: "",
        shippingAddress: "",
      }));
    }
  };

  // Line item updates
  const handleItemProductChange = (index: number, prodId: string) => {
    const prod = availableProducts.find((p) => p.id === prodId);
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      if (prod) {
        const activeBatch =
          prod.batches?.find((b: any) => b.quantity > 0) || prod.batches?.[0];
        item.productId = prod.id;
        item.productName = prod.name;
        item.sku = prod.sku;
        item.batch = activeBatch?.batchNo || "";
        const defaultSalePrice = Number(
          activeBatch?.sellingPrice ??
            prod.price ??
            (prod as any).salePrice ??
            0,
        );
        item.salesPrice = defaultSalePrice;
        item.unitPrice = defaultSalePrice;
        if (defaultSalePrice === 0) {
          toast.warning(
            `Product "${prod.name}" has no default Sale Price configured.`,
          );
        }
        item.taxPercent =
          item.taxPercent !== undefined && item.taxPercent !== null
            ? item.taxPercent
            : 18;
        const sub = (item.quantity || 1) * (item.unitPrice || 0);
        const tax = prev.withGst ? sub * ((item.taxPercent || 0) / 100) : 0;
        item.total = Math.round((sub + tax) * 100) / 100;
      } else {
        item.productId = "";
        item.productName = "";
        item.sku = "";
        item.batch = "";
        item.purchasePrice = 0;
        item.salesPrice = 0;
        item.unitPrice = 0;
        item.taxPercent = 0;
        item.total = 0;
      }
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const handleItemBatchChange = (index: number, batchNo: string) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      item.batch = batchNo;
      const prod = availableProducts.find((p) => p.id === item.productId);
      const selectedBatch = prod?.batches?.find(
        (b: any) => b.batchNo === batchNo,
      );
      if (selectedBatch) {
        if (selectedBatch.sellingPrice) {
          item.unitPrice = selectedBatch.sellingPrice;
          item.salesPrice = selectedBatch.sellingPrice;
        }
        if (selectedBatch.costPrice) {
          item.purchasePrice = selectedBatch.costPrice;
        }
        const sub = Math.max(
          0,
          (item.quantity || 1) * (item.unitPrice || 0) -
            (item.discountPercent || 0),
        );
        const tax = prev.withGst ? sub * ((item.taxPercent || 0) / 100) : 0;
        item.total = Math.round((sub + tax) * 100) / 100;
      }
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const handleItemFieldChange = (
    index: number,
    field: keyof SaleProductItem,
    val: number,
  ) => {
    const sanitizedVal = Math.max(0, val);
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: sanitizedVal };
      const qty = field === "quantity" ? sanitizedVal : item.quantity || 0;
      const unitPrice =
        field === "unitPrice" ? sanitizedVal : item.unitPrice || 0;
      const discount =
        field === "discountPercent" ? sanitizedVal : item.discountPercent || 0;
      const taxPercent =
        field === "taxPercent" ? sanitizedVal : item.taxPercent || 0;
      const sub = Math.max(0, qty * unitPrice - discount);
      const tax = prev.withGst ? sub * (taxPercent / 100) : 0;
      item.total = Math.round((sub + tax) * 100) / 100;
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const handleAddItemRow = () => {
    const newItem: SaleProductItem = {
      id: `s_item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: "",
      productName: "",
      sku: "",
      batch: "",
      quantity: 1,
      purchasePrice: 0,
      salesPrice: 0,
      unitPrice: 0,
      discountPercent: 0,
      taxPercent: 0,
      total: 0,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleRemoveItemRow = (index: number) => {
    if (formData.items.length <= 1) {
      toast.error("A sale must have at least one product line item.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Live Totals Calculations
  const calculatedTotals = useMemo(() => {
    const subtotal = formData.items.reduce(
      (acc, it) => acc + (it.quantity || 0) * (it.unitPrice || 0),
      0,
    );
    const lineDiscountTotal = formData.items.reduce(
      (acc, it) => acc + (it.discountPercent || 0),
      0,
    );
    const overallDiscount = Math.max(0, Number(formData.overallDiscount) || 0);
    const totalDiscount = lineDiscountTotal + overallDiscount;

    const totalTax = formData.withGst
      ? formData.items.reduce((acc, it) => {
          const lineBase = Math.max(
            0,
            (it.quantity || 0) * (it.unitPrice || 0) -
              (it.discountPercent || 0),
          );
          return acc + lineBase * ((it.taxPercent || 0) / 100);
        }, 0)
      : 0;
    const cgst =
      formData.withGst && formData.gstType === "intra_state"
        ? Math.round((totalTax / 2) * 100) / 100
        : 0;
    const sgst =
      formData.withGst && formData.gstType === "intra_state"
        ? Math.round((totalTax / 2) * 100) / 100
        : 0;
    const igst =
      formData.withGst && formData.gstType === "inter_state"
        ? Math.round(totalTax * 100) / 100
        : 0;
    const grandTotal = Math.max(
      0,
      Math.round((subtotal - totalDiscount + totalTax) * 100) / 100,
    );
    const paid = (formData.paymentSplits || []).reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0,
    );
    const balance = Math.max(0, Math.round((grandTotal - paid) * 100) / 100);

    return {
      subtotal,
      lineDiscountTotal,
      overallDiscount,
      totalDiscount,
      totalTax,
      cgst,
      sgst,
      igst,
      grandTotal,
      paid,
      balance,
    };
  }, [formData]);

  // Generate Invoice Handler (Creates invoice on backend and local store)
  const handleGenerateInvoice = async () => {
    if (!formData.customerName.trim()) {
      toast.error("Please select or specify a customer.");
      return;
    }
    const rawValidItems = formData.items.filter(
      (it) => it.productId || it.productName,
    );
    if (rawValidItems.length === 0) {
      toast.error("Please select at least one valid product.");
      return;
    }
    const hasInvalidQty = rawValidItems.some(
      (it) => !it.quantity || it.quantity <= 0,
    );
    if (hasInvalidQty) {
      toast.error("All products must have a quantity greater than 0.");
      return;
    }

    setIsActionLoading(true);
    try {
      const validItems: SaleProductItem[] = await Promise.all(
        rawValidItems.map(async (it) => {
          const validProdId = await ensureProductUUID(it);
          return {
            ...it,
            productId: validProdId,
          };
        }),
      );

      const resolvedCustomerId = ensureCustomerUUID(
        formData.customerId,
        formData.customerName,
      );

      const grandTotal = calculatedTotals.grandTotal;
      const currentPaid = editingSale?.paidAmount || formData.paidAmount || 0;
      const balance = Math.max(0, grandTotal - currentPaid);
      const paymentStatus: SalePaymentStatus =
        balance <= 0 ? "Paid" : currentPaid > 0 ? "Partial" : "Unpaid";
      const primaryPaymentMethod =
        formData.paymentSplits[0]?.method ||
        formData.paymentMethod ||
        "Bank Transfer";

      const isEdit = Boolean(
        editingSale && editingSale.id && UUID_REGEX.test(editingSale.id),
      );

      const salePayload: SaleTransaction = {
        id: isEdit ? editingSale!.id : `sale_${Date.now()}`,
        invoiceNo: isEdit ? formData.invoiceNo : "",
        invoiceStatus: "Generated",
        referenceNo: formData.referenceNo || undefined,
        saleDate: formData.saleDate,
        dueDate: formData.dueDate,
        customerId: resolvedCustomerId || "",
        customerName: formData.customerName,
        customerCompany: formData.customerCompany || undefined,
        customerPhone: formData.customerPhone || undefined,
        customerEmail: formData.customerEmail || undefined,
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress || formData.billingAddress,
        items: validItems,
        subtotal: calculatedTotals.subtotal,
        withGst: formData.withGst,
        gstType: formData.gstType,
        cgst: calculatedTotals.cgst,
        sgst: calculatedTotals.sgst,
        igst: calculatedTotals.igst,
        overallDiscount: calculatedTotals.overallDiscount,
        totalDiscount: calculatedTotals.totalDiscount,
        totalTax: calculatedTotals.totalTax,
        shippingCharges: Number(formData.shippingCharges) || 0,
        otherCharges: Number(formData.otherCharges) || 0,
        grandTotal: grandTotal,
        paidAmount: currentPaid,
        balance: balance,
        paymentMethod: primaryPaymentMethod as any,
        paymentSplits: formData.paymentSplits.filter(
          (p) => Number(p.amount) > 0,
        ),
        paymentRecords:
          editingSale?.paymentRecords || formData.paymentRecords || [],
        paymentTerms: formData.paymentTerms || "Net 15 Days",
        paymentStatus: paymentStatus,
        saleStatus: "Confirmed",
        createdBy: editingSale ? editingSale.createdBy : "James Wilson",
        salesperson: formData.salesperson || "Alex Rivera",
        notes: formData.notes || undefined,
        createdAt: editingSale
          ? editingSale.createdAt
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const apiPayload = mapSaleTransactionToInvoicePayload(salePayload);

      let savedApiSale: SaleTransaction;
      if (isEdit) {
        const updateRes = await commerceInvoiceApi.updateInvoice(
          editingSale!.id,
          apiPayload,
        );
        if (updateRes.data) {
          savedApiSale = mapApiInvoiceToSaleTransaction(updateRes.data);
        } else {
          savedApiSale = salePayload;
        }
      } else {
        const createRes = await commerceInvoiceApi.createInvoice(
          apiPayload as any,
        );
        if (createRes.data) {
          savedApiSale = mapApiInvoiceToSaleTransaction(createRes.data);
        } else {
          savedApiSale = {
            ...salePayload,
            invoiceNo: formData.invoiceNo || `INV-${Date.now()}`,
          };
        }
      }

      saveSale(savedApiSale);
      setEditingSale(savedApiSale);
      setSelectedSale(savedApiSale);
      setFormData((prev) => ({
        ...prev,
        invoiceNo: savedApiSale.invoiceNo,
        invoiceStatus: "Generated",
        paidAmount: savedApiSale.paidAmount,
        paymentRecords: savedApiSale.paymentRecords || [],
      }));

      toast.success(
        `Invoice ${savedApiSale.invoiceNo} ${isEdit ? "updated" : "generated"} successfully! Payment Status: ${savedApiSale.paymentStatus.toUpperCase()}`,
      );
      await fetchSalesInvoices();
    } catch (err: any) {
      console.error("Failed to generate invoice:", err);
      toast.error(err?.message || "Failed to save invoice to server.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Save Draft Sale Handler
  const handleSaveDraft = async () => {
    if (!formData.customerName.trim()) {
      toast.error("Please select or specify a customer.");
      return;
    }
    const rawValidItems = formData.items.filter(
      (it) => it.productId || it.productName,
    );
    if (rawValidItems.length === 0) {
      toast.error("Please select at least one valid product.");
      return;
    }

    setIsActionLoading(true);
    try {
      const validItems: SaleProductItem[] = await Promise.all(
        rawValidItems.map(async (it) => {
          const validProdId = await ensureProductUUID(it);
          return {
            ...it,
            productId: validProdId,
          };
        }),
      );

      const resolvedCustomerId = ensureCustomerUUID(
        formData.customerId,
        formData.customerName,
      );

      const grandTotal = calculatedTotals.grandTotal;
      const currentPaid = formData.paidAmount || 0;
      const balance = Math.max(0, grandTotal - currentPaid);
      const paymentStatus: SalePaymentStatus =
        balance <= 0 ? "Paid" : currentPaid > 0 ? "Partial" : "Unpaid";
      const primaryPaymentMethod =
        formData.paymentSplits[0]?.method ||
        formData.paymentMethod ||
        "Bank Transfer";

      const isEdit = Boolean(
        editingSale && editingSale.id && UUID_REGEX.test(editingSale.id),
      );

      const salePayload: SaleTransaction = {
        id: isEdit ? editingSale!.id : `sale_${Date.now()}`,
        invoiceNo: isEdit ? formData.invoiceNo : "",
        invoiceStatus: formData.invoiceStatus || "Draft",
        referenceNo: formData.referenceNo || undefined,
        saleDate: formData.saleDate,
        dueDate: formData.dueDate,
        customerId: resolvedCustomerId || "",
        customerName: formData.customerName,
        customerCompany: formData.customerCompany || undefined,
        customerPhone: formData.customerPhone || undefined,
        customerEmail: formData.customerEmail || undefined,
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress || formData.billingAddress,
        items: validItems,
        subtotal: calculatedTotals.subtotal,
        withGst: formData.withGst,
        gstType: formData.gstType,
        cgst: calculatedTotals.cgst,
        sgst: calculatedTotals.sgst,
        igst: calculatedTotals.igst,
        overallDiscount: calculatedTotals.overallDiscount,
        totalDiscount: calculatedTotals.totalDiscount,
        totalTax: calculatedTotals.totalTax,
        shippingCharges: Number(formData.shippingCharges) || 0,
        otherCharges: Number(formData.otherCharges) || 0,
        grandTotal: grandTotal,
        paidAmount: currentPaid,
        balance: balance,
        paymentMethod: primaryPaymentMethod as any,
        paymentSplits: formData.paymentSplits.filter(
          (p) => Number(p.amount) > 0,
        ),
        paymentRecords: formData.paymentRecords || [],
        paymentTerms: formData.paymentTerms || "Net 15 Days",
        paymentStatus: paymentStatus,
        saleStatus: "Draft",
        createdBy: editingSale ? editingSale.createdBy : "James Wilson",
        salesperson: formData.salesperson || "Alex Rivera",
        notes: formData.notes || undefined,
        createdAt: editingSale
          ? editingSale.createdAt
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const apiPayload = mapSaleTransactionToInvoicePayload(salePayload);

      let savedApiSale: SaleTransaction;
      if (isEdit) {
        const updateRes = await commerceInvoiceApi.updateInvoice(
          editingSale!.id,
          apiPayload,
        );
        if (updateRes.data) {
          savedApiSale = mapApiInvoiceToSaleTransaction(updateRes.data);
        } else {
          savedApiSale = salePayload;
        }
      } else {
        const createRes = await commerceInvoiceApi.createInvoice(
          apiPayload as any,
        );
        if (createRes.data) {
          savedApiSale = mapApiInvoiceToSaleTransaction(createRes.data);
        } else {
          savedApiSale = {
            ...salePayload,
            invoiceNo: formData.invoiceNo || `INV-${Date.now()}`,
          };
        }
      }

      saveSale(savedApiSale);
      setEditingSale(savedApiSale);
      setSelectedSale(savedApiSale);
      toast.success(
        `Draft invoice ${savedApiSale.invoiceNo} saved successfully!`,
      );
      await fetchSalesInvoices();
    } catch (err: any) {
      console.error("Failed to save draft invoice:", err);
      toast.error(err?.message || "Failed to save draft invoice to server.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Void / Cancel Invoice
  const handleCancelInvoice = async (sale: SaleTransaction) => {
    setIsActionLoading(true);
    try {
      const cleanId = (sale.id || "").trim();
      if (
        cleanId &&
        !cleanId.startsWith("mock_") &&
        !cleanId.startsWith("local_")
      ) {
        await commerceInvoiceApi.updateStatus(cleanId, "Cancelled");
      }
      const updatedSale: SaleTransaction = {
        ...sale,
        saleStatus: "Cancelled",
        updatedAt: new Date().toISOString(),
      };
      saveSale(updatedSale);
      toast.success(`Invoice ${sale.invoiceNo} cancelled successfully.`);
      await fetchSalesInvoices();
    } catch (err: any) {
      console.error("Failed to cancel invoice:", err);
      toast.error(err?.message || "Failed to cancel invoice.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete Invoice
  const handleDeleteSaleInvoice = async (sale: SaleTransaction) => {
    setIsActionLoading(true);
    try {
      const cleanId = (sale.id || "").trim();
      if (
        cleanId &&
        !cleanId.startsWith("mock_") &&
        !cleanId.startsWith("local_")
      ) {
        await commerceInvoiceApi.deleteInvoice(cleanId);
      }
      deleteSale(sale.id);
      setSalesList(
        sales.filter((s) => s.id !== sale.id && s.invoiceNo !== sale.invoiceNo),
      );
      try {
        const rawLocal = localStorage.getItem("yaa_crm_sales_transactions");
        if (rawLocal) {
          const list: SaleTransaction[] = JSON.parse(rawLocal);
          const updated = list.filter(
            (s) => s.id !== sale.id && s.invoiceNo !== sale.invoiceNo,
          );
          localStorage.setItem(
            "yaa_crm_sales_transactions",
            JSON.stringify(updated),
          );
        }
      } catch (e) {
        console.warn("Local storage delete notice:", e);
      }
      toast.success(`Invoice ${sale.invoiceNo} deleted successfully.`);
      await fetchSalesInvoices();
    } catch (err: any) {
      console.error("Failed to delete invoice:", err);
      toast.error(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to delete invoice.",
      );
    } finally {
      setIsActionLoading(false);
      setActiveDropdownId(null);
    }
  };

  // General Save Sale Form Handler (legacy support for form submit)
  const handleSaveSale = (mode: "draft" | "confirm" | "print" | "new") => {
    if (mode === "draft") {
      handleSaveDraft();
      return;
    }
    handleGenerateInvoice();
    if (mode === "print") {
      setIsFormModalOpen(false);
      setIsInvoiceModalOpen(true);
      setTimeout(() => window.print(), 300);
    } else if (mode === "new") {
      handleOpenCreateModal();
    }
  };

  // Open Add Payment Modal for a sale (or current form sale)
  const handleOpenAddPayment = (saleToPay?: SaleTransaction) => {
    let targetSale: SaleTransaction;
    if (saleToPay) {
      targetSale = saleToPay;
    } else if (editingSale) {
      const validItems = formData.items.filter(
        (it) => it.productId || it.productName,
      );
      const grandTotal = calculatedTotals.grandTotal;
      const currentPaid = editingSale.paidAmount || formData.paidAmount || 0;
      const balance = Math.max(0, grandTotal - currentPaid);
      const paymentStatus: SalePaymentStatus =
        balance <= 0 ? "Paid" : currentPaid > 0 ? "Partial" : "Unpaid";

      targetSale = {
        ...editingSale,
        invoiceNo: formData.invoiceNo,
        invoiceStatus: "Generated",
        referenceNo: formData.referenceNo,
        saleDate: formData.saleDate,
        dueDate: formData.dueDate,
        customerId: formData.customerId,
        customerName: formData.customerName,
        customerCompany: formData.customerCompany,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress,
        items: validItems.length > 0 ? validItems : editingSale.items,
        subtotal: calculatedTotals.subtotal,
        withGst: formData.withGst,
        gstType: formData.gstType,
        cgst: calculatedTotals.cgst,
        sgst: calculatedTotals.sgst,
        igst: calculatedTotals.igst,
        overallDiscount: calculatedTotals.overallDiscount,
        totalDiscount: calculatedTotals.totalDiscount,
        totalTax: calculatedTotals.totalTax,
        shippingCharges: Number(formData.shippingCharges) || 0,
        otherCharges: Number(formData.otherCharges) || 0,
        grandTotal: grandTotal,
        paidAmount: currentPaid,
        balance: balance,
        paymentStatus: paymentStatus,
        paymentRecords:
          editingSale.paymentRecords || formData.paymentRecords || [],
        notes: formData.notes,
        updatedAt: new Date().toISOString(),
      };
      saveSale(targetSale);
      setEditingSale(targetSale);
    } else {
      const validItems = formData.items.filter(
        (it) => it.productId || it.productName,
      );
      const grandTotal = calculatedTotals.grandTotal;
      const currentPaid = formData.paidAmount || 0;
      const balance = Math.max(0, grandTotal - currentPaid);
      const paymentStatus: SalePaymentStatus =
        balance <= 0 ? "Paid" : currentPaid > 0 ? "Partial" : "Unpaid";

      targetSale = {
        id: `sale_${Date.now()}`,
        invoiceNo:
          formData.invoiceNo ||
          `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceStatus: "Generated",
        referenceNo: formData.referenceNo,
        saleDate: formData.saleDate,
        dueDate: formData.dueDate,
        customerId: formData.customerId,
        customerName: formData.customerName || "Walk-in Customer",
        customerCompany: formData.customerCompany,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress,
        items: validItems,
        subtotal: calculatedTotals.subtotal,
        withGst: formData.withGst,
        gstType: formData.gstType,
        cgst: calculatedTotals.cgst,
        sgst: calculatedTotals.sgst,
        igst: calculatedTotals.igst,
        overallDiscount: calculatedTotals.overallDiscount,
        totalDiscount: calculatedTotals.totalDiscount,
        totalTax: calculatedTotals.totalTax,
        shippingCharges: Number(formData.shippingCharges) || 0,
        otherCharges: Number(formData.otherCharges) || 0,
        grandTotal: grandTotal,
        paidAmount: currentPaid,
        balance: balance,
        paymentMethod: "Bank Transfer",
        paymentSplits: formData.paymentSplits,
        paymentRecords: formData.paymentRecords || [],
        paymentTerms: formData.paymentTerms,
        paymentStatus: paymentStatus,
        saleStatus: "Confirmed",
        createdBy: "James Wilson",
        salesperson: formData.salesperson || "Alex Rivera",
        notes: formData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveSale(targetSale);
      setEditingSale(targetSale);
    }

    setSelectedSale(targetSale);
    const balanceDue =
      targetSale.balance !== undefined
        ? targetSale.balance
        : Math.max(0, targetSale.grandTotal - (targetSale.paidAmount || 0));
    setPaymentModalSplits([
      {
        id: `rec_${Date.now()}`,
        method: "Bank Transfer",
        amount: balanceDue,
        referenceNo: "",
      },
    ]);
    setPaymentModalDate(new Date().toISOString().split("T")[0]);
    setRecordNotes("");
    setIsPaymentModalOpen(true);
  };

  const handleAddPaymentModalSplit = () => {
    const allocated = paymentModalSplits.reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0,
    );
    const currentBalance = selectedSale
      ? selectedSale.balance !== undefined
        ? selectedSale.balance
        : Math.max(0, selectedSale.grandTotal - (selectedSale.paidAmount || 0))
      : calculatedTotals.balance;
    const remaining = Math.max(0, currentBalance - allocated);
    const newSplit: PaymentSplitItem = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      method: "Cash",
      amount: remaining,
      referenceNo: "",
    };
    setPaymentModalSplits((prev) => [...prev, newSplit]);
  };

  const handleRemovePaymentModalSplit = (index: number) => {
    if (paymentModalSplits.length <= 1) {
      toast.error("At least one payment method row is required.");
      return;
    }
    setPaymentModalSplits((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaymentModalSplitChange = (
    index: number,
    field: keyof PaymentSplitItem,
    value: string | number,
  ) => {
    setPaymentModalSplits((prev) => {
      const newSplits = [...prev];
      newSplits[index] = { ...newSplits[index], [field]: value };
      return newSplits;
    });
  };

  // Confirm Payment: Records payment against the SAME invoice and updates payment status
  const handleConfirmPayment = () => {
    if (!selectedSale) return;
    const totalAllocated = paymentModalSplits.reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0,
    );
    if (totalAllocated <= 0) {
      toast.error("Payment amount must be greater than zero.");
      return;
    }
    const currentBalance =
      selectedSale.balance !== undefined
        ? selectedSale.balance
        : Math.max(0, selectedSale.grandTotal - (selectedSale.paidAmount || 0));
    if (totalAllocated > currentBalance + 0.01) {
      toast.error(
        `Total payment (₹${totalAllocated.toLocaleString("en-IN")}) cannot exceed balance due (₹${currentBalance.toLocaleString("en-IN")}).`,
      );
      return;
    }

    const primaryMethod = paymentModalSplits[0]?.method || "Bank Transfer";
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Generate individual payment receipt records for this payment transaction
    const newRecords: SalePaymentRecord[] = paymentModalSplits
      .filter((p) => Number(p.amount) > 0)
      .map((p) => ({
        id: `PAY-${String(Math.floor(100000 + Math.random() * 900000))}`,
        invoiceNo: selectedSale.invoiceNo,
        paymentDate: paymentModalDate || now.toISOString().split("T")[0],
        paymentTime: timeStr,
        method: p.method,
        referenceNo:
          p.referenceNo || `TXN${Math.floor(100000 + Math.random() * 900000)}`,
        amount: Number(p.amount),
        status: "Paid",
        recordedBy: "Org Super Administrator",
        notes: recordNotes || `Payment received via ${p.method}`,
        createdAt: now.toISOString(),
      }));

    const updatedSalesList = updateSalePayment(
      selectedSale.id,
      totalAllocated,
      primaryMethod,
      recordNotes,
      paymentModalSplits,
      newRecords,
    );

    const updatedSale = updatedSalesList.find(
      (s) => s.id === selectedSale.id,
    ) || {
      ...selectedSale,
      paidAmount: (selectedSale.paidAmount || 0) + totalAllocated,
      balance: Math.max(
        0,
        selectedSale.grandTotal -
          ((selectedSale.paidAmount || 0) + totalAllocated),
      ),
      paymentStatus:
        Math.max(
          0,
          selectedSale.grandTotal -
            ((selectedSale.paidAmount || 0) + totalAllocated),
        ) <= 0
          ? ("Paid" as SalePaymentStatus)
          : ("Partial" as SalePaymentStatus),
      paymentRecords: [...(selectedSale.paymentRecords || []), ...newRecords],
      paymentSplits: [
        ...(selectedSale.paymentSplits || []),
        ...paymentModalSplits,
      ],
    };

    setSelectedSale(updatedSale);
    if (editingSale && editingSale.id === selectedSale.id) {
      setEditingSale(updatedSale);
    }
    setFormData((prev) => ({
      ...prev,
      paidAmount: updatedSale.paidAmount,
      invoiceStatus: "Generated",
      paymentRecords: updatedSale.paymentRecords || [],
      paymentSplits: updatedSale.paymentSplits || prev.paymentSplits,
    }));

    toast.success(
      `Payment of ₹${totalAllocated.toLocaleString("en-IN", { minimumFractionDigits: 2 })} recorded successfully for Invoice ${selectedSale.invoiceNo}!`,
    );
    setIsPaymentModalOpen(false);
  };

  const handleViewPaymentDetails = (record: SalePaymentRecord) => {
    setSelectedPaymentRecord(record);
    setIsPaymentDetailsModalOpen(true);
  };

  // Filtering Sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.invoiceNo.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        (s.customerCompany || "").toLowerCase().includes(q) ||
        s.items.some((it) => it.productName.toLowerCase().includes(q)) ||
        s.salesperson.toLowerCase().includes(q) ||
        (s.salesRepresentativeName || "").toLowerCase().includes(q);

      const matchesSaleStatus =
        appliedSaleStatus === "All" ||
        s.saleStatus.toLowerCase() === appliedSaleStatus.toLowerCase();

      const matchesPaymentStatus =
        appliedPaymentStatus === "All" ||
        s.paymentStatus.toLowerCase() === appliedPaymentStatus.toLowerCase();

      const matchesCustomer =
        appliedCustomer === "All" ||
        s.customerId === appliedCustomer ||
        s.customerName === appliedCustomer;

      const matchesSalesRep =
        appliedSalesRep === "All" ||
        s.salesRepresentativeId === appliedSalesRep ||
        s.salesRepresentativeName === appliedSalesRep;

      return (
        matchesSearch &&
        matchesSaleStatus &&
        matchesPaymentStatus &&
        matchesCustomer &&
        matchesSalesRep
      );
    });
  }, [
    sales,
    appliedSearch,
    appliedSaleStatus,
    appliedPaymentStatus,
    appliedCustomer,
    appliedSalesRep,
  ]);

  // Open Quick Assign Modal from Table Row Action
  const handleOpenAssignInvoiceModal = (sale: SaleTransaction) => {
    setAssignInvoiceTarget(sale);
    const cust = customers.find((c) => c.id === sale.customerId);
    setAssignRepId(
      cust?.salesRepresentativeId || sale.salesRepresentativeId || "",
    );
    setAssignStatus(sale.collectionStatus || "Pending Follow-up");
    setAssignNextFollowUp(sale.nextFollowUpDate || "");
    setIsAssignInvoiceModalOpen(true);
  };

  // Save Quick Assignment
  const handleSaveQuickAssignInvoice = () => {
    if (!assignInvoiceTarget) return;
    if (!assignRepId) {
      toast.error("Please select a sales representative");
      return;
    }
    const cust = customers.find((c) => c.id === assignInvoiceTarget.customerId);
    if (assignInvoiceTarget.customerId) {
      assignCustomerSalesRep(assignInvoiceTarget.customerId, assignRepId);
    }
    const rep = salesRepresentatives.find((r) => r.id === assignRepId);

    toast.success(
      `Sales Rep assigned to customer ${cust?.name || assignInvoiceTarget.customerName}!`,
      {
        description: `Assigned ${rep?.name || "Representative"} across all customer invoices.`,
      },
    );
    setIsAssignInvoiceModalOpen(false);
    setAssignInvoiceTarget(null);
  };

  // Save Assignment from Invoice Details Modal Card
  const handleSaveDetailAssignment = () => {
    if (!selectedSale) return;
    if (!detailRepId) {
      toast.error("Please select a sales representative");
      return;
    }
    const cust = customers.find((c) => c.id === selectedSale.customerId);
    if (selectedSale.customerId) {
      assignCustomerSalesRep(selectedSale.customerId, detailRepId);
    }
    const rep = salesRepresentatives.find((r) => r.id === detailRepId);

    setSelectedSale({
      ...selectedSale,
      salesRepresentativeId: detailRepId,
      salesRepresentativeName: rep?.name || "Unassigned",
      collectionStatus: detailCollectionStatus,
      nextFollowUpDate: detailNextFollowUp,
    });

    toast.success(
      `Sales Rep assigned to customer ${cust?.name || selectedSale.customerName}!`,
      {
        description: `Assigned ${rep?.name || "Representative"} across all customer invoices.`,
      },
    );
  };

  // Export Sales to Excel Report
  const handleExportExcel = () => {
    if (filteredSales.length === 0) {
      toast.info("No sales records to export.");
      return;
    }

    const excelRows = filteredSales.map((s, idx) => ({
      srNo: idx + 1,
      invoiceNo: s.invoiceNo,
      date: s.saleDate,
      dueDate: s.dueDate || "-",
      customerName: s.customerName,
      customerPhone: s.customerPhone || "-",
      itemsCount: s.items?.length || 0,
      itemsList:
        (s.items || [])
          .map((it) => `${it.productName} (x${it.quantity})`)
          .join(", ") || "-",
      subtotal: Number(s.subtotal || 0),
      discount: Number(s.totalDiscount || 0),
      tax: Number(s.totalTax || 0),
      grandTotal: Number(s.grandTotal || 0),
      paidAmount: Number(s.paidAmount || 0),
      balance: Number(s.balance || 0),
      paymentMethod: s.paymentMethod || "Cash",
      paymentStatus: s.paymentStatus || "Unpaid",
      saleStatus: s.saleStatus || "Confirmed",
      salesperson: s.salesperson || "-",
    }));

    exportTableToExcel({
      filename: `Sales_Invoices_Report_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Sales Invoices",
      title: "YAA CREATIONS CRM - SALES INVOICES & ORDERS REPORT",
      subtitle: `Filter: ${appliedSaleStatus} | Total Invoices: ${filteredSales.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: "#", key: "srNo", align: "center", width: 8 },
        { header: "Invoice No", key: "invoiceNo", align: "center", width: 16 },
        { header: "Sale Date", key: "date", align: "center", width: 14 },
        { header: "Due Date", key: "dueDate", align: "center", width: 14 },
        { header: "Customer", key: "customerName", align: "left", width: 26 },
        { header: "Contact", key: "customerPhone", align: "left", width: 16 },
        { header: "Items", key: "itemsList", align: "left", width: 32 },
        {
          header: "Total Amount (₹)",
          key: "grandTotal",
          align: "right",
          type: "currency",
          width: 18,
        },
        {
          header: "Paid Amount (₹)",
          key: "paidAmount",
          align: "right",
          type: "currency",
          width: 18,
        },
        {
          header: "Balance Due (₹)",
          key: "balance",
          align: "right",
          type: "currency",
          width: 18,
        },
        {
          header: "Payment Method",
          key: "paymentMethod",
          align: "left",
          width: 16,
        },
        {
          header: "Payment Status",
          key: "paymentStatus",
          align: "center",
          width: 16,
        },
        {
          header: "Sale Status",
          key: "saleStatus",
          align: "center",
          width: 14,
        },
        { header: "Salesperson", key: "salesperson", align: "left", width: 18 },
      ],
      data: excelRows,
      summaryRow: {
        srNo: "TOTAL",
        customerName: `${filteredSales.length} Sales Invoices`,
        grandTotal: summary.totalSalesAmount,
        paidAmount: Math.max(
          0,
          summary.totalSalesAmount - summary.pendingPaymentsAmount,
        ),
        balance: summary.pendingPaymentsAmount,
      },
    });

    toast.success(`Exported ${filteredSales.length} sales invoices to Excel!`);
  };

  // Print Sales Table Report via universal printUtils
  const handlePrintTableReport = () => {
    if (filteredSales.length === 0) {
      toast.info("No sales records to print.");
      return;
    }

    const printRows = filteredSales.map((s, idx) => ({
      srNo: idx + 1,
      invoiceNo: s.invoiceNo,
      date: s.saleDate,
      dueDate: s.dueDate || "-",
      customerName:
        s.customerName + (s.customerCompany ? ` (${s.customerCompany})` : ""),
      customerPhone: s.customerPhone || "-",
      itemsList:
        (s.items || [])
          .map((it) => `${it.productName} (x${it.quantity})`)
          .join(", ") || "-",
      grandTotal: Number(s.grandTotal || 0),
      paidAmount: Number(s.paidAmount || 0),
      balance: Number(s.balance || 0),
      paymentMethod: s.paymentMethod || "Cash",
      paymentStatus: s.paymentStatus || "Unpaid",
      saleStatus: s.saleStatus || "Confirmed",
      salesperson: s.salesperson || "-",
    }));

    printTableReport({
      title: "Sales Invoices & Transactions Ledger",
      subtitle: `Filter: ${appliedSaleStatus} | Total: ${filteredSales.length} Invoices`,
      orientation: "landscape",
      metrics: [
        { label: "Total Invoices", value: summary.totalCount },
        { label: "Total Sales", value: summary.totalSalesAmount },
        {
          label: "Total Paid",
          value: Math.max(
            0,
            summary.totalSalesAmount - summary.pendingPaymentsAmount,
          ),
        },
        { label: "Pending Balance", value: summary.pendingPaymentsAmount },
        { label: "Completed", value: summary.completedCount },
      ],
      columns: [
        { header: "#", key: "srNo", align: "center", width: "35px" },
        {
          header: "Invoice No",
          key: "invoiceNo",
          align: "center",
          width: "105px",
        },
        { header: "Date", key: "date", align: "center", width: "85px" },
        {
          header: "Customer",
          key: "customerName",
          align: "left",
          width: "160px",
        },
        { header: "Items Purchased", key: "itemsList", align: "left" },
        {
          header: "Total (₹)",
          key: "grandTotal",
          align: "right",
          type: "currency",
          width: "95px",
        },
        {
          header: "Paid (₹)",
          key: "paidAmount",
          align: "right",
          type: "currency",
          width: "95px",
        },
        {
          header: "Balance (₹)",
          key: "balance",
          align: "right",
          type: "currency",
          width: "95px",
        },
        {
          header: "Payment",
          key: "paymentStatus",
          align: "center",
          width: "80px",
        },
        {
          header: "Status",
          key: "saleStatus",
          align: "center",
          width: "80px",
        },
        {
          header: "Salesperson",
          key: "salesperson",
          align: "left",
          width: "100px",
        },
      ],
      data: printRows,
      summaryRow: {
        srNo: "TOTAL",
        customerName: `${filteredSales.length} Invoices`,
        grandTotal: summary.totalSalesAmount,
        paidAmount: Math.max(
          0,
          summary.totalSalesAmount - summary.pendingPaymentsAmount,
        ),
        balance: summary.pendingPaymentsAmount,
      },
    });
  };

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / pageSize) || 1;
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, currentPage, pageSize]);

  // Payment History Logs (Aggregated across all sales transactions)
  const allPaymentLogs = useMemo(() => {
    const logs: Array<{
      id: string;
      saleId: string;
      invoiceNo: string;
      customerName: string;
      date: string;
      method: string;
      referenceNo: string;
      amount: number;
      saleTotal: number;
      paymentStatus: SalePaymentStatus;
      notes?: string;
      sale: SaleTransaction;
    }> = [];

    sales.forEach((s) => {
      if (s.paymentSplits && s.paymentSplits.length > 0) {
        s.paymentSplits.forEach((split, idx) => {
          if (Number(split.amount) > 0 || s.paidAmount > 0) {
            logs.push({
              id: `${s.id}-split-${idx}-${split.id || idx}`,
              saleId: s.id,
              invoiceNo: s.invoiceNo,
              customerName: s.customerName,
              date: s.saleDate,
              method: split.method || s.paymentMethod || "Cash",
              referenceNo: split.referenceNo || "",
              amount: Number(split.amount || 0),
              saleTotal: s.grandTotal,
              paymentStatus: s.paymentStatus,
              notes: s.notes,
              sale: s,
            });
          }
        });
      } else if (s.paidAmount > 0) {
        logs.push({
          id: `${s.id}-single`,
          saleId: s.id,
          invoiceNo: s.invoiceNo,
          customerName: s.customerName,
          date: s.saleDate,
          method: s.paymentMethod || "Cash",
          referenceNo: "",
          amount: s.paidAmount,
          saleTotal: s.grandTotal,
          paymentStatus: s.paymentStatus,
          notes: s.notes,
          sale: s,
        });
      }
    });

    return logs;
  }, [sales]);

  const filteredPaymentLogs = useMemo(() => {
    return allPaymentLogs.filter((log) => {
      const q = paymentLogSearch.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        log.invoiceNo.toLowerCase().includes(q) ||
        log.customerName.toLowerCase().includes(q) ||
        log.referenceNo.toLowerCase().includes(q) ||
        log.method.toLowerCase().includes(q);

      const matchesMethod =
        paymentLogMethodFilter === "All" ||
        log.method.toLowerCase() === paymentLogMethodFilter.toLowerCase();

      return matchesSearch && matchesMethod;
    });
  }, [allPaymentLogs, paymentLogSearch, paymentLogMethodFilter]);

  const totalPaymentLogPages =
    Math.ceil(filteredPaymentLogs.length / paymentLogPageSize) || 1;
  const paginatedPaymentLogs = useMemo(() => {
    const start = (paymentLogPage - 1) * paymentLogPageSize;
    return filteredPaymentLogs.slice(start, start + paymentLogPageSize);
  }, [filteredPaymentLogs, paymentLogPage, paymentLogPageSize]);

  const getCustomerInitials = (name?: string): string => {
    if (!name) return "CU";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // =========================================================================
  // FULL PAGE CREATE / EDIT SALE VIEW (Matching New Quotation Page Layout)
  // =========================================================================
  return (
    <>
      {isFormModalOpen ? (
        <div className="space-y-6 animate-in fade-in duration-150 font-sans pb-12">
          {/* Top Full-Page Navigation Header with Back button on the RIGHT */}
          <div className="bg-[#33077C] rounded-2xl shadow-md p-5 sm:p-6 flex items-center justify-between gap-4 text-white">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {editingSale
                  ? `Edit Sale: ${editingSale.invoiceNo}`
                  : "New Sale"}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 font-medium mt-0.5">
                Create, configure, and issue a formal sale transaction.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="inline-flex items-center justify-center gap-2 h-10 px-4.5 bg-white text-[#33077C] hover:bg-slate-100 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
              <span>Back</span>
            </button>
          </div>

          {/* Full-Page Form Canvas */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-8">
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveSale("confirm");
              }}
              className="space-y-6"
            >
              {/* Flat 3-column Grid matching New Quotation layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Row 1, Col 1: Customer Selection & Quick Add */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Customer / Client <span className="text-slate-500">*</span>
                  </label>
                  <CustomCustomerSelect
                    value={formData.customerId}
                    onChange={(val) => handleCustomerChange(val)}
                    customers={
                      customers && customers.length > 0
                        ? customers
                        : (customerList as any[])
                    }
                    onAddNewCustomer={() => {
                      setQuickCustomerForm({
                        name: "",
                        company: "",
                        phone: "",
                        email: "",
                        address: "",
                        city: "",
                        state: "",
                        pincode: "",
                        gstNumber: "",
                        creditLimit: "",
                        paymentTerms: "",
                      });
                      setIsQuickCustomerModalOpen(true);
                    }}
                    getCustomerMetrics={getCustomerMetrics}
                  />
                </div>

                {/* Row 1, Col 2: Customer Name */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Customer Name <span className="text-slate-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customerName: e.target.value,
                      }))
                    }
                    required
                    placeholder="Customer Name"
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Row 1, Col 3: Quotation Number / Sale Number */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Quotation Number <span className="text-slate-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceNo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        invoiceNo: e.target.value,
                      }))
                    }
                    required
                    placeholder="EST-14168"
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Row 2, Col 1: Reference Number */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Reference Number <span className="text-slate-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.referenceNo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        referenceNo: e.target.value,
                      }))
                    }
                    required
                    placeholder="REF-7122"
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Row 2, Col 2: Date */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Date <span className="text-slate-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={isoToDdmmyyyy(formData.saleDate)}
                      onChange={(e) => {
                        const iso = ddmmyyyyToIso(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          saleDate: iso || e.target.value,
                        }));
                      }}
                      required
                      className="w-full h-11 pl-4 pr-11 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                    />
                    <label className="absolute right-3 text-slate-400 hover:text-[#33077C] cursor-pointer transition-colors p-1">
                      <Calendar className="w-4 h-4" />
                      <input
                        type="date"
                        value={formData.saleDate}
                        onChange={(e) => {
                          if (e.target.value) {
                            setFormData((prev) => ({
                              ...prev,
                              saleDate: e.target.value,
                            }));
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  </div>
                </div>

                {/* Row 2, Col 3: Expiry Date */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Expiry Date <span className="text-slate-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={isoToDdmmyyyy(formData.dueDate)}
                      onChange={(e) => {
                        const iso = ddmmyyyyToIso(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          dueDate: iso || e.target.value,
                        }));
                      }}
                      required
                      className="w-full h-11 pl-4 pr-11 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                    />
                    <label className="absolute right-3 text-slate-400 hover:text-[#33077C] cursor-pointer transition-colors p-1">
                      <Calendar className="w-4 h-4" />
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => {
                          if (e.target.value) {
                            setFormData((prev) => ({
                              ...prev,
                              dueDate: e.target.value,
                            }));
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  </div>
                </div>

                {/* Row 3, Col 1: Email Communications */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Email Communications{" "}
                    <span className="text-slate-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customerEmail: e.target.value,
                      }))
                    }
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Row 3, Col 2: Contact Number */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customerPhone: e.target.value,
                      }))
                    }
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Row 3, Col 3: Address */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Address <span className="text-slate-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.billingAddress}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        billingAddress: e.target.value,
                        shippingAddress: e.target.value,
                      }))
                    }
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Row 4: Customer Credit & Financials Summary Pill */}
                {selectedCustomerFinancials && (
                  <div className="md:col-span-3 p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                        <span className="font-semibold text-slate-500">
                          Credit Limit:
                        </span>
                        <span className="font-mono font-bold">
                          ₹
                          {selectedCustomerFinancials.creditLimit.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                        <span className="font-semibold text-slate-500">
                          Current Outstanding:
                        </span>
                        <span
                          className={`font-mono font-bold ${selectedCustomerFinancials.outstandingAmount > 0 ? "text-amber-600" : "text-slate-700"}`}
                        >
                          ₹
                          {selectedCustomerFinancials.outstandingAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                        <span className="font-semibold text-slate-500">
                          Available Credit:
                        </span>
                        <span className="font-mono font-bold text-emerald-600">
                          ₹
                          {selectedCustomerFinancials.availableCredit.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Credit Exceeded Warning Pill */}
                    {selectedCustomerFinancials.creditLimit > 0 &&
                      calculatedTotals.grandTotal >
                        selectedCustomerFinancials.availableCredit && (
                        <div className="flex items-center gap-1.5 text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shadow-2xs">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            ⚠ Customer credit limit exceeded by ₹
                            {(
                              calculatedTotals.grandTotal -
                              selectedCustomerFinancials.availableCredit
                            ).toLocaleString("en-IN", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      )}
                  </div>
                )}

                {/* Row 5: Note */}
                <div className="md:col-span-3">
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Looking forward for your business."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>
              </div>

              {/* SECTION: Taxation & GST Configuration Bar */}
              <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-slate-50 border border-purple-100/80 rounded-xl p-3 sm:p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#33077C] flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-[#4309A2]" />
                      Taxation &amp; GST Configuration
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Choose whether this sales invoice includes GST, and
                      configure Intra-State (CGST + SGST) or Inter-State (IGST)
                    </p>
                  </div>

                  {/* With GST vs Without GST Toggle */}
                  <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl self-start sm:self-auto shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleToggleWithGst(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        formData.withGst
                          ? "bg-[#33077C] text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${formData.withGst ? "bg-emerald-400" : "bg-slate-300"}`}
                      />
                      With GST
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleWithGst(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        !formData.withGst
                          ? "bg-amber-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${!formData.withGst ? "bg-white" : "bg-slate-300"}`}
                      />
                      Without GST
                    </button>
                  </div>
                </div>

                {/* GST Type Selection (Intra-State vs Inter-State) */}
                {formData.withGst ? (
                  <div className="pt-2 border-t border-purple-100/60 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">
                        GST Breakdown Type:
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formData.gstType === "intra_state"
                          ? "(Split 50% CGST + 50% SGST for same-state customer)"
                          : "(Single 100% IGST for interstate customer)"}
                      </span>
                    </div>
                    <div className="inline-flex rounded-lg border border-purple-200 bg-white p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleSetGstType("intra_state")}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          formData.gstType === "intra_state"
                            ? "bg-purple-100 text-[#33077C]"
                            : "text-slate-600 hover:text-[#33077C]"
                        }`}
                      >
                        Intra-State (CGST + SGST)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetGstType("inter_state")}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                          formData.gstType === "inter_state"
                            ? "bg-purple-100 text-[#33077C]"
                            : "text-slate-600 hover:text-[#33077C]"
                        }`}
                      >
                        Inter-State (IGST)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-amber-100/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-700 text-xs">
                      <Tag className="w-3.5 h-3.5" />
                      <span>
                        Invoice is marked <strong>Tax Exempt / Non-GST</strong>.
                        All product tax amounts are set to ₹0.00.
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[11px]">
                      0% GST Rate
                    </span>
                  </div>
                )}
              </div>

              {/* SECTION: Dynamic Itemized Table */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs sm:text-[13px] font-bold text-slate-700 block">
                    Add Items &amp; Pricing Details
                  </label>
                </div>

                {/* Table with Purple Header matching application theme */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs table-fixed min-w-[1060px] border-collapse border border-slate-200">
                      <colgroup>
                        <col className="w-auto min-w-[240px]" />
                        <col className="w-[160px]" />
                        <col className="w-[85px]" />
                        <col className="w-[95px]" />
                        <col className="w-[120px]" />
                        <col className="w-[120px]" />
                        <col className="w-[130px]" />
                        <col className="w-[75px]" />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#33077C] text-[11px] font-bold text-white tracking-wider uppercase">
                          <th className="py-4 px-5 text-left border border-[#33077C]/40 bg-[#33077C] text-white">
                            PROJECTS
                          </th>
                          <th className="py-4 px-3 text-center border border-[#33077C]/40 bg-[#33077C] text-white">
                            BATCH NO
                          </th>
                          <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">
                            QTY
                          </th>
                          <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">
                            {formData.withGst ? "GST (%)" : "GST (0%)"}
                          </th>
                          <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">
                            PRICE
                          </th>
                          <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">
                            DISCOUNT (₹)
                          </th>
                          <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">
                            TOTAL
                          </th>
                          <th className="py-4 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white">
                            ACTION
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {formData.items.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="py-12 text-center bg-slate-50/40 border border-slate-200"
                            >
                              <p className="text-xs sm:text-[13px] text-slate-400 font-medium">
                                No items added yet. Click &quot;+ Add Item&quot;
                                below to add line items.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          formData.items.map((item, idx) => (
                            <tr
                              key={item.id || idx}
                              className={`hover:bg-slate-50/70 transition-colors ${idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"}`}
                            >
                              {/* 1. Projects / Product Selection */}
                              <td className="px-5 py-3.5 align-top border border-slate-200">
                                <div className="space-y-1.5">
                                  <SearchableSelect
                                    value={item.productId}
                                    onChange={(val) =>
                                      handleItemProductChange(idx, val)
                                    }
                                    onSearch={handleProductSearch}
                                    isLoading={isSearchingProducts}
                                    options={productOptions}
                                    placeholder="Select Product..."
                                    searchPlaceholder="Search product by name or SKU..."
                                    emptyText="Type to search products..."
                                    allowClear
                                    size="md"
                                  />
                                  {item.productId && item.sku && (
                                    <div className="px-1 text-[11px] text-slate-400 font-medium">
                                      SKU: {item.sku}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 2. Batch No */}
                              <td className="px-3 py-3.5 align-top border border-slate-200">
                                {(() => {
                                  if (!item.productId) {
                                    return (
                                      <input
                                        type="text"
                                        disabled
                                        placeholder="—"
                                        className="w-full h-10 px-2 bg-slate-100/60 border border-slate-200 rounded-xl text-xs font-medium text-center text-slate-400 cursor-not-allowed"
                                      />
                                    );
                                  }
                                  const prod = availableProducts.find(
                                    (p) => p.id === item.productId,
                                  );
                                  const batches = prod?.batches || [];
                                  if (batches.length > 0) {
                                    return (
                                      <SearchableSelect
                                        value={item.batch || ""}
                                        onChange={(val) =>
                                          handleItemBatchChange(idx, val)
                                        }
                                        options={batches.map((b: any) => ({
                                          value: b.batchNo,
                                          label: b.batchNo,
                                          subLabel: `${b.quantity} in stock${b.expDate ? ` • Exp: ${b.expDate}` : ""}`,
                                          badge: `${b.quantity} in stock`,
                                        }))}
                                        placeholder="Select Batch..."
                                        searchPlaceholder="Search batch..."
                                        size="md"
                                        triggerClassName="bg-purple-50/60 hover:bg-purple-50 text-[#33077C] font-bold border-purple-200 hover:border-purple-300"
                                      />
                                    );
                                  }
                                  return (
                                    <input
                                      type="text"
                                      value={item.batch || ""}
                                      onChange={(e) =>
                                        setFormData((prev) => {
                                          const copy = [...prev.items];
                                          copy[idx] = {
                                            ...copy[idx],
                                            batch: e.target.value,
                                          };
                                          return { ...prev, items: copy };
                                        })
                                      }
                                      placeholder="Batch No"
                                      className="w-full h-10 px-2.5 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-bold text-center text-[#33077C] focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                                    />
                                  );
                                })()}
                              </td>

                              {/* 2. QTY */}
                              <td className="px-2 py-3.5 align-top border border-slate-200">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "quantity",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-semibold text-center text-slate-800 focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                                />
                              </td>

                              {/* 3. GST (%) */}
                              <td className="px-2 py-3.5 align-top border border-slate-200">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  disabled={!formData.withGst}
                                  value={formData.withGst ? item.taxPercent : 0}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "taxPercent",
                                      Number(e.target.value),
                                    )
                                  }
                                  className={`w-full h-10 px-2 text-center rounded-xl text-xs font-semibold outline-none shadow-2xs transition-all ${
                                    formData.withGst
                                      ? "bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] text-slate-800 focus:ring-3 focus:ring-[#4309A2]/10"
                                      : "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
                                  }`}
                                />
                              </td>

                              {/* 4. PRICE */}
                              <td className="px-2 py-3.5 align-top border border-slate-200">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "unitPrice",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-bold text-center text-slate-800 focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                                />
                              </td>

                              {/* 5. DISCOUNT (₹) */}
                              <td className="px-2 py-3.5 align-top border border-slate-200">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.discountPercent || 0}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "discountPercent",
                                      Number(e.target.value),
                                    )
                                  }
                                  placeholder="0"
                                  className="w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-semibold text-center text-slate-800 focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all"
                                />
                              </td>

                              {/* 6. TOTAL */}
                              <td className="px-2 py-3.5 align-top border border-slate-200">
                                <div className="h-10 flex items-center justify-center">
                                  <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/90 font-bold text-xs shadow-2xs font-sans min-w-[90px] text-center">
                                    ₹
                                    {item.total.toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                              </td>

                              {/* 7. ACTION */}
                              <td className="px-2 py-3.5 align-top border border-slate-200">
                                <div className="h-10 flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItemRow(idx)}
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

                {/* + Add Item Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="h-10 px-5 bg-[#33077C] hover:bg-[#4309A2] text-white rounded-xl text-xs sm:text-[13px] font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* BOTTOM SECTION: INVOICE SUMMARY & ACTION AREA */}
              <div className="pt-6 border-t border-slate-200/80 flex flex-col xl:flex-row items-start justify-between gap-6">
                {/* Left Column: Terms, Notes & Navigation */}
                <div className="w-full xl:flex-1 space-y-4 order-2 xl:order-1">
                  {/* 1. Payment Terms & Settlement Breakdown */}
                  <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/90 rounded-2xl sm:rounded-3xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-[#33077C]" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                          Payment Terms &amp; Settlement Overview
                        </h4>
                      </div>
                      <span className="text-xs font-semibold text-[#33077C] bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/60">
                        {formData.paymentTerms || "Net 15 Days"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Grand Total
                        </span>
                        <div className="text-sm sm:text-base font-black text-slate-800 mt-0.5">
                          ₹
                          {calculatedTotals.grandTotal.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                          Paid Amount
                        </span>
                        <div className="text-sm sm:text-base font-black text-emerald-600 mt-0.5">
                          ₹
                          {(
                            editingSale?.paidAmount ||
                            formData.paidAmount ||
                            0
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                          Balance Due
                        </span>
                        <div className="text-sm sm:text-base font-black text-amber-600 mt-0.5">
                          ₹
                          {Math.max(
                            0,
                            calculatedTotals.grandTotal -
                              (editingSale?.paidAmount ||
                                formData.paidAmount ||
                                0),
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>

                    {formData.notes && (
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                        <span className="font-semibold text-slate-600">
                          Notes:{" "}
                        </span>
                        <span className="text-slate-700">{formData.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* 2. ERP Workflow Guidance Box */}
                  <div className="p-4 bg-purple-50/60 border border-purple-100/90 rounded-2xl text-xs space-y-2">
                    <div className="flex items-center gap-2 text-[#33077C] font-bold">
                      <Sparkles className="w-4 h-4 text-[#33077C]" />
                      <span>Accounting Workflow Guide</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      1. Click <strong>Generate Invoice</strong> to create and
                      lock the official invoice (Payment Status:{" "}
                      <strong>UNPAID</strong>).
                      <br />
                      2. Use <strong>+ Add Payment</strong> to record single or
                      split customer payment transactions against the same
                      invoice.
                      <br />
                      3. The invoice number remains the same throughout the
                      lifecycle as payment status updates to{" "}
                      <strong>PARTIALLY PAID</strong> or <strong>PAID</strong>.
                    </p>
                  </div>

                  {/* Cancel Button on Left */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsFormModalOpen(false)}
                      className="h-11 px-6 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-bold shadow-2xs transition-all duration-200 cursor-pointer select-none active:scale-[0.98] flex items-center gap-2"
                    >
                      <X className="w-4 h-4 text-slate-500 stroke-[2.2]" />
                      <span>Cancel &amp; Return to List</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: CoreCentral Expanded Purple Summary & Workflow Action Card */}
                <div className="w-full xl:w-[580px] 2xl:w-[640px] shrink-0 bg-[#33077C] rounded-2xl sm:rounded-3xl p-6 sm:p-7 text-white shadow-2xl border border-purple-900/40 space-y-4 order-1 xl:order-2">
                  {/* 1. Header: GST Mode & Invoice Status Badge */}
                  <div className="flex items-center justify-between p-3 bg-white/10 border border-white/20 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${formData.withGst ? "bg-emerald-400" : "bg-amber-400"}`}
                      />
                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                        {formData.withGst
                          ? formData.gstType === "inter_state"
                            ? "With GST • Inter-State (IGST)"
                            : "With GST • Intra-State (CGST+SGST)"
                          : "Without GST (Exempt)"}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold shrink-0 ${
                        formData.invoiceStatus === "Generated"
                          ? "bg-purple-300 text-purple-950 shadow-2xs"
                          : "bg-white/15 text-purple-200"
                      }`}
                    >
                      {formData.invoiceStatus === "Generated"
                        ? `Invoice: ${formData.invoiceNo}`
                        : "Draft Status"}
                    </span>
                  </div>

                  {/* 2. Subtotal */}
                  <div className="flex justify-between items-center text-sm sm:text-base text-purple-200 font-medium pb-2 border-b border-white/15">
                    <span>
                      Subtotal (
                      {
                        formData.items.filter(
                          (it) => it.productId || it.productName,
                        ).length
                      }{" "}
                      items)
                    </span>
                    <span className="text-white font-bold text-sm sm:text-base">
                      ₹
                      {calculatedTotals.subtotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {/* 3. Embedded Discount (₹) Section */}
                  <div className="p-3.5 bg-white/10 rounded-xl border border-white/15 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs sm:text-[13px] font-semibold text-purple-200 flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-purple-300" />
                        <span>Discount (₹)</span>
                      </label>
                      {formData.overallDiscount > 0 && (
                        <span className="text-xs font-bold text-emerald-300">
                          -₹{formData.overallDiscount.toLocaleString("en-IN")}{" "}
                          applied
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-300 text-xs font-bold">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={formData.overallDiscount || ""}
                        placeholder="0"
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            overallDiscount: Math.max(
                              0,
                              Number(e.target.value),
                            ),
                          }))
                        }
                        className="w-full h-10 pl-7 pr-3 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 focus:border-white rounded-lg text-xs sm:text-sm font-bold text-white placeholder:text-purple-300 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* 4. GST Taxes Breakdown */}
                  {!formData.withGst ? (
                    <div className="flex justify-between items-center text-xs sm:text-sm text-amber-300 py-1.5 border-b border-white/15">
                      <span>GST (Without GST)</span>
                      <span className="text-amber-200 font-medium">
                        ₹0.00 (Exempt)
                      </span>
                    </div>
                  ) : formData.gstType === "intra_state" ? (
                    <div className="space-y-2 py-1.5 text-xs sm:text-sm border-b border-white/15">
                      <div className="flex justify-between items-center text-purple-200">
                        <span>CGST (Central Tax - 50%)</span>
                        <span className="text-white font-semibold">
                          +₹
                          {calculatedTotals.cgst.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-purple-200">
                        <span>SGST (State Tax - 50%)</span>
                        <span className="text-white font-semibold">
                          +₹
                          {calculatedTotals.sgst.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-purple-300 text-xs pt-0.5">
                        <span>Total GST Amount</span>
                        <span className="text-white font-bold">
                          +₹
                          {calculatedTotals.totalTax.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-1.5 text-xs sm:text-sm border-b border-white/15">
                      <div className="flex justify-between items-center text-purple-200">
                        <span>IGST (Integrated Tax - 100%)</span>
                        <span className="text-white font-semibold">
                          +₹
                          {calculatedTotals.igst.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-purple-300 text-xs pt-0.5">
                        <span>Total GST Amount</span>
                        <span className="text-white font-bold">
                          +₹
                          {calculatedTotals.totalTax.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 5. Grand Total */}
                  <div className="flex justify-between items-center text-base sm:text-lg font-bold text-white pt-1">
                    <span>Grand Total</span>
                    <span className="text-lg sm:text-2xl font-black text-white">
                      ₹
                      {calculatedTotals.grandTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {/* 6. Paid Amount & Balance Due & Payment Status */}
                  <div className="p-3.5 bg-white/10 rounded-xl border border-white/15 space-y-2">
                    <div className="flex justify-between items-center text-xs sm:text-sm text-purple-200">
                      <span>Paid Amount</span>
                      <span className="text-cyan-300 font-bold">
                        ₹
                        {(
                          editingSale?.paidAmount ||
                          formData.paidAmount ||
                          0
                        ).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm sm:text-base font-bold text-white pt-1 border-t border-white/10">
                      <span>Balance Due</span>
                      <span
                        className={`font-black ${Math.max(0, calculatedTotals.grandTotal - (editingSale?.paidAmount || formData.paidAmount || 0)) <= 0 ? "text-emerald-300" : "text-amber-300"}`}
                      >
                        ₹
                        {Math.max(
                          0,
                          calculatedTotals.grandTotal -
                            (editingSale?.paidAmount ||
                              formData.paidAmount ||
                              0),
                        ).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs text-purple-200 font-medium">
                        Payment Status:
                      </span>
                      {(() => {
                        const curPaid =
                          editingSale?.paidAmount || formData.paidAmount || 0;
                        const curBal = Math.max(
                          0,
                          calculatedTotals.grandTotal - curPaid,
                        );
                        if (formData.invoiceStatus !== "Generated") {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200/20 text-purple-100 border border-white/20">
                              UNPAID (Draft)
                            </span>
                          );
                        }
                        if (curBal <= 0) {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>PAID</span>
                            </span>
                          );
                        }
                        if (curPaid > 0) {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>PARTIALLY PAID</span>
                            </span>
                          );
                        }
                        return (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-400/20 text-rose-300 border border-rose-400/30 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>UNPAID</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 7. DYNAMIC WORKFLOW ACTION BUTTONS */}
                  <div className="pt-2">
                    {formData.invoiceStatus !== "Generated" ? (
                      /* STATE 1: SALE NOT INVOICED (Draft Mode) */
                      <div className="space-y-2.5">
                        <button
                          type="submit"
                          onClick={handleGenerateInvoice}
                          className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-[#33077C] font-black text-sm sm:text-base rounded-xl transition-all shadow-md hover:shadow-xl active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4.5 h-4.5 text-[#33077C]" />
                          <span>Generate Invoice</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          className="w-full py-2.5 px-4 bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm rounded-xl transition-all border border-white/20 active:scale-[0.98] cursor-pointer text-center flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4 text-white" />
                          <span>Save Draft</span>
                        </button>
                      </div>
                    ) : (
                      /* STATES 2, 3, 4: INVOICE GENERATED (Unpaid, Partially Paid, Paid) */
                      <div className="space-y-2.5">
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              const targetSale = editingSale ||
                                selectedSale || {
                                  id: `sale_${Date.now()}`,
                                  invoiceNo: formData.invoiceNo,
                                  invoiceStatus: "Generated",
                                  referenceNo: formData.referenceNo,
                                  saleDate: formData.saleDate,
                                  dueDate: formData.dueDate,
                                  customerId: formData.customerId,
                                  customerName: formData.customerName,
                                  customerCompany: formData.customerCompany,
                                  customerPhone: formData.customerPhone,
                                  customerEmail: formData.customerEmail,
                                  billingAddress: formData.billingAddress,
                                  shippingAddress: formData.shippingAddress,
                                  items: formData.items.filter(
                                    (it) => it.productId || it.productName,
                                  ),
                                  subtotal: calculatedTotals.subtotal,
                                  withGst: formData.withGst,
                                  gstType: formData.gstType,
                                  cgst: calculatedTotals.cgst,
                                  sgst: calculatedTotals.sgst,
                                  igst: calculatedTotals.igst,
                                  overallDiscount:
                                    calculatedTotals.overallDiscount,
                                  totalDiscount: calculatedTotals.totalDiscount,
                                  totalTax: calculatedTotals.totalTax,
                                  shippingCharges:
                                    Number(formData.shippingCharges) || 0,
                                  otherCharges:
                                    Number(formData.otherCharges) || 0,
                                  grandTotal: calculatedTotals.grandTotal,
                                  paidAmount: formData.paidAmount || 0,
                                  balance: Math.max(
                                    0,
                                    calculatedTotals.grandTotal -
                                      (formData.paidAmount || 0),
                                  ),
                                  paymentMethod: "Bank Transfer",
                                  paymentSplits: formData.paymentSplits,
                                  paymentRecords: formData.paymentRecords,
                                  paymentTerms: formData.paymentTerms,
                                  paymentStatus:
                                    (formData.paidAmount || 0) <= 0
                                      ? "Unpaid"
                                      : (formData.paidAmount || 0) >=
                                          calculatedTotals.grandTotal
                                        ? "Paid"
                                        : "Partial",
                                  saleStatus: "Confirmed",
                                  createdBy: "James Wilson",
                                  salesperson:
                                    formData.salesperson || "Alex Rivera",
                                  notes: formData.notes,
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                };
                              setSelectedSale(targetSale);
                              setIsInvoiceModalOpen(true);
                            }}
                            className="flex-1 py-3 px-3 bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm rounded-xl transition-all border border-white/30 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4 text-white" />
                            <span>View Invoice</span>
                          </button>

                          {Math.max(
                            0,
                            calculatedTotals.grandTotal -
                              (editingSale?.paidAmount ||
                                formData.paidAmount ||
                                0),
                          ) > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenAddPayment()}
                              className="flex-1 py-3 px-3 bg-white hover:bg-slate-100 text-[#33077C] font-black text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-xl active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                            >
                              <Plus className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
                              <span>+ Add Payment</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const histEl = document.getElementById(
                                  "new-sale-payment-history",
                                );
                                if (histEl)
                                  histEl.scrollIntoView({ behavior: "smooth" });
                              }}
                              className="flex-1 py-3 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                            >
                              <History className="w-4 h-4 text-white" />
                              <span>View History</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const targetSale = editingSale ||
                              selectedSale || {
                                id: `sale_${Date.now()}`,
                                invoiceNo: formData.invoiceNo,
                                invoiceStatus: "Generated",
                                referenceNo: formData.referenceNo,
                                saleDate: formData.saleDate,
                                dueDate: formData.dueDate,
                                customerId: formData.customerId,
                                customerName: formData.customerName,
                                customerCompany: formData.customerCompany,
                                customerPhone: formData.customerPhone,
                                customerEmail: formData.customerEmail,
                                billingAddress: formData.billingAddress,
                                shippingAddress: formData.shippingAddress,
                                items: formData.items.filter(
                                  (it) => it.productId || it.productName,
                                ),
                                subtotal: calculatedTotals.subtotal,
                                withGst: formData.withGst,
                                gstType: formData.gstType,
                                cgst: calculatedTotals.cgst,
                                sgst: calculatedTotals.sgst,
                                igst: calculatedTotals.igst,
                                overallDiscount:
                                  calculatedTotals.overallDiscount,
                                totalDiscount: calculatedTotals.totalDiscount,
                                totalTax: calculatedTotals.totalTax,
                                shippingCharges:
                                  Number(formData.shippingCharges) || 0,
                                otherCharges:
                                  Number(formData.otherCharges) || 0,
                                grandTotal: calculatedTotals.grandTotal,
                                paidAmount: formData.paidAmount || 0,
                                balance: Math.max(
                                  0,
                                  calculatedTotals.grandTotal -
                                    (formData.paidAmount || 0),
                                ),
                                paymentMethod: "Bank Transfer",
                                paymentSplits: formData.paymentSplits,
                                paymentRecords: formData.paymentRecords,
                                paymentTerms: formData.paymentTerms,
                                paymentStatus:
                                  (formData.paidAmount || 0) <= 0
                                    ? "Unpaid"
                                    : (formData.paidAmount || 0) >=
                                        calculatedTotals.grandTotal
                                      ? "Paid"
                                      : "Partial",
                                saleStatus: "Confirmed",
                                createdBy: "James Wilson",
                                salesperson:
                                  formData.salesperson || "Alex Rivera",
                                notes: formData.notes,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                              };
                            setSelectedSale(targetSale);
                            setIsInvoiceModalOpen(true);
                            setTimeout(() => window.print(), 300);
                          }}
                          className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white font-semibold text-xs rounded-xl transition-all border border-white/15 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Download / Print Invoice</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: FULL-WIDTH PAYMENT HISTORY AT THE VERY END OF SALES PAGE */}
              <div
                id="new-sale-payment-history"
                className="pt-6 border-t border-slate-200/90 space-y-3"
              >
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#33077C] text-white flex items-center justify-center shadow-xs">
                        <History className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          Payment History
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Track all payments recorded against this invoice (
                          {formData.invoiceNo || "Draft"}).
                        </p>
                      </div>
                    </div>

                    {/* Right Summary Badges */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200/80 text-xs">
                        <span className="text-slate-500 font-medium">
                          Invoice:{" "}
                        </span>
                        <span className="font-bold text-[#33077C]">
                          {formData.invoiceNo}
                        </span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs">
                        <span className="text-emerald-700 font-medium">
                          Total Paid:{" "}
                        </span>
                        <span className="font-bold text-emerald-800">
                          ₹
                          {(
                            editingSale?.paidAmount ||
                            formData.paidAmount ||
                            0
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs">
                        <span className="text-amber-700 font-medium">
                          Balance Due:{" "}
                        </span>
                        <span className="font-bold text-amber-800">
                          ₹
                          {Math.max(
                            0,
                            calculatedTotals.grandTotal -
                              (editingSale?.paidAmount ||
                                formData.paidAmount ||
                                0),
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      {formData.invoiceStatus === "Generated" &&
                        Math.max(
                          0,
                          calculatedTotals.grandTotal -
                            (editingSale?.paidAmount ||
                              formData.paidAmount ||
                              0),
                        ) > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenAddPayment()}
                            className="px-3 py-1.5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>+ Add Payment</span>
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Table of Recorded Payments */}
                  {(() => {
                    const records: SalePaymentRecord[] =
                      editingSale?.paymentRecords &&
                      editingSale.paymentRecords.length > 0
                        ? editingSale.paymentRecords
                        : formData.paymentRecords &&
                            formData.paymentRecords.length > 0
                          ? formData.paymentRecords
                          : [];

                    if (records.length === 0) {
                      return (
                        <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                          <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <h4 className="text-xs sm:text-sm font-bold text-slate-700">
                            No Payments Recorded Yet
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                            {formData.invoiceStatus === "Generated"
                              ? 'Invoice generated. Click "+ Add Payment" above or in the summary card to record customer payments.'
                              : "Generate the invoice first to begin recording customer payments against this transaction."}
                          </p>
                          {formData.invoiceStatus === "Generated" && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => handleOpenAddPayment()}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>+ Add Payment Now</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs min-w-[800px]">
                          <thead>
                            <tr className="bg-purple-50/80 border-b border-purple-100 text-purple-900 font-bold uppercase text-[10px] tracking-wider">
                              <th className="py-3 px-3.5">#</th>
                              <th className="py-3 px-3.5">Date &amp; Time</th>
                              <th className="py-3 px-3.5">Payment ID</th>
                              <th className="py-3 px-3.5">Payment Method</th>
                              <th className="py-3 px-3.5">
                                Reference / Txn No.
                              </th>
                              <th className="py-3 px-3.5 text-right">Amount</th>
                              <th className="py-3 px-3.5 text-center">
                                Status
                              </th>
                              <th className="py-3 px-3.5">Recorded By</th>
                              <th className="py-3 px-3.5 text-center">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {records.map((rec, rIdx) => (
                              <tr
                                key={rec.id || rIdx}
                                className="hover:bg-purple-50/30 transition-colors"
                              >
                                <td className="py-3 px-3.5 text-slate-400 font-medium">
                                  {rIdx + 1}
                                </td>
                                <td className="py-3 px-3.5 font-medium text-slate-700">
                                  <div>
                                    {isoToDdmmyyyy(rec.paymentDate) ||
                                      rec.paymentDate}
                                  </div>
                                  {rec.paymentTime && (
                                    <div className="text-[11px] text-slate-400">
                                      {rec.paymentTime}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3.5 font-mono font-bold text-[#33077C]">
                                  {rec.id}
                                </td>
                                <td className="py-3 px-3.5">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-purple-50 text-[#33077C] font-bold text-[11px] border border-purple-200">
                                    {rec.method}
                                  </span>
                                </td>
                                <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                                  {rec.referenceNo || "—"}
                                </td>
                                <td className="py-3 px-3.5 text-right font-bold text-emerald-600 text-xs sm:text-sm">
                                  ₹
                                  {Number(rec.amount || 0).toLocaleString(
                                    "en-IN",
                                    { minimumFractionDigits: 2 },
                                  )}
                                </td>
                                <td className="py-3 px-3.5 text-center">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>{rec.status || "Paid"}</span>
                                  </span>
                                </td>
                                <td className="py-3 px-3.5 text-slate-600 font-medium text-[11px]">
                                  {rec.recordedBy || "Org Super Administrator"}
                                </td>
                                <td className="py-3 px-3.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleViewPaymentDetails(rec)
                                    }
                                    className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-[#33077C] font-bold rounded-lg border border-purple-200 text-xs transition-all cursor-pointer shadow-2xs flex items-center gap-1 mx-auto"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View Details</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pb-12 font-sans">
          {/* 1. Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Sales Invoice
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                    {sales.length} total
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Create, process, track sales transactions, manage invoice
                  lifecycles, and monitor payment settlements.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
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
                onClick={() => setIsSalesGraphModalOpen(true)}
                icon={<BarChart2 className="w-4 h-4 text-[#33077C]" />}
                className="hover:border-[#33077C]/40 transition-colors"
              >
                Sales Graph
              </Button>

              <Button
                variant="primary"
                size="md"
                icon={<Plus className="w-4 h-4 text-white stroke-[2.5]" />}
                onClick={handleOpenCreateModal}
                className="bg-[#33077C] hover:bg-[#280563] text-white shadow-sm hover:shadow transition-all"
              >
                Add Invoice
              </Button>
            </div>
          </div>

          {/* 2. KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
            {/* Total Sales */}
            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Sales
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-slate-900">
                  ₹
                  {summary.totalSalesAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {summary.totalCount} total orders
                </div>
              </div>
            </div>

            {/* Today's Sales */}
            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Today's Sales
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-slate-900">
                  ₹
                  {summary.todayAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-emerald-600 font-medium mt-0.5">
                  {summary.todayCount} generated today
                </div>
              </div>
            </div>

            {/* Pending Payments */}
            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Pending Payments
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-amber-600">
                  ₹
                  {summary.pendingPaymentsAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Outstanding balance
                </div>
              </div>
            </div>

            {/* Completed Sales */}
            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Completed
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-slate-900">
                  {summary.completedCount}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Delivered & finalized
                </div>
              </div>
            </div>

            {/* Cancelled Sales */}
            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Cancelled
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-slate-900">
                  {summary.cancelledCount}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Voided transactions
                </div>
              </div>
            </div>
          </div>

          {/* 3. Search Bar & Filter Row */}
          <SearchBar
            value={pendingSearch}
            onChange={(val) => setPendingSearch(val)}
            placeholder="Search by invoice #, customer, rep, product..."
            onSubmit={() => {
              setAppliedSearch(pendingSearch);
              setAppliedSaleStatus(pendingSaleStatus);
              setAppliedPaymentStatus(pendingPaymentStatus);
              setAppliedCustomer(pendingCustomer);
              setAppliedSalesRep(pendingSalesRep);
              setCurrentPage(1);
            }}
            onReset={() => {
              setPendingSearch("");
              setAppliedSearch("");
              setPendingSaleStatus("All");
              setAppliedSaleStatus("All");
              setPendingPaymentStatus("All");
              setAppliedPaymentStatus("All");
              setPendingCustomer("All");
              setAppliedCustomer("All");
              setPendingSalesRep("All");
              setAppliedSalesRep("All");
              setCurrentPage(1);
            }}
            filterSlot={
              <div className="flex items-center gap-2.5 flex-wrap">
                <FilterDropdown
                  placeholder="Sale Status : All"
                  value={appliedSaleStatus}
                  onChange={(val) => {
                    setPendingSaleStatus(val);
                    setAppliedSaleStatus(val);
                    setCurrentPage(1);
                  }}
                  options={[
                    { label: "Sale Status : All", value: "All" },
                    { label: "Draft", value: "Draft", dotColor: "#64748b" },
                    {
                      label: "Confirmed",
                      value: "Confirmed",
                      dotColor: "#33077C",
                    },
                    {
                      label: "Completed",
                      value: "Completed",
                      dotColor: "#10b981",
                    },
                    {
                      label: "Cancelled",
                      value: "Cancelled",
                      dotColor: "#ef4444",
                    },
                  ]}
                />

                <FilterDropdown
                  placeholder="Payment : All"
                  value={appliedPaymentStatus}
                  onChange={(val) => {
                    setPendingPaymentStatus(val);
                    setAppliedPaymentStatus(val);
                    setCurrentPage(1);
                  }}
                  options={[
                    { label: "Payment : All", value: "All" },
                    { label: "Paid", value: "Paid", dotColor: "#10b981" },
                    { label: "Partial", value: "Partial", dotColor: "#f59e0b" },
                    { label: "Unpaid", value: "Unpaid", dotColor: "#ef4444" },
                    { label: "Pending", value: "Pending", dotColor: "#64748b" },
                  ]}
                />

                <FilterDropdown
                  placeholder="Customer : All"
                  value={appliedCustomer}
                  onChange={(val) => {
                    setPendingCustomer(val);
                    setAppliedCustomer(val);
                    setCurrentPage(1);
                  }}
                  options={[
                    { label: "Customer : All", value: "All" },
                    ...customerList.map((c) => ({
                      label: c.name || c.company,
                      value: c.id,
                    })),
                  ]}
                />

                <FilterDropdown
                  placeholder="Sales Rep : All"
                  value={appliedSalesRep}
                  onChange={(val) => {
                    setPendingSalesRep(val);
                    setAppliedSalesRep(val);
                    setCurrentPage(1);
                  }}
                  options={[
                    { label: "Sales Rep : All", value: "All" },
                    ...salesRepresentatives.map((r) => ({
                      label: r.name,
                      value: r.id,
                      dotColor: r.status === "Active" ? "#10b981" : "#94a3b8",
                    })),
                  ]}
                />
              </div>
            }
            rightSlot={
              <div className="flex items-center gap-3 pr-1">
                <span className="text-xs font-semibold text-slate-500">
                  Total Sales :{" "}
                  <span className="text-[#33077C] font-bold">
                    {filteredSales.length}
                  </span>
                </span>
              </div>
            }
          />

          {/* 4. Sales Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Header Bar with Transactions title & Tool Icons (Search, Analytics, Excel, Print) */}
            <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-white">
              <h3 className="text-base font-bold text-slate-800 tracking-tight">
                Transactions
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const searchInput = document.querySelector(
                      'input[placeholder*="Search by invoice"]',
                    ) as HTMLInputElement;
                    searchInput?.focus();
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Search"
                >
                  <Search className="w-4.5 h-4.5 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsSalesGraphModalOpen(true)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Sales Graph & Trends"
                >
                  <BarChart2 className="w-4.5 h-4.5 text-slate-500" />
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                  title="Export to Excel Report (.xls)"
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                </button>
                <button
                  type="button"
                  onClick={handlePrintTableReport}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Print Transactions Ledger"
                >
                  <Printer className="w-4.5 h-4.5 text-slate-600" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200 min-w-[1050px]">
                <thead>
                  <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">
                      CUSTOMER
                    </th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">
                      INVOICE NO.
                    </th>
                    <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>DATE</span>
                        <Calendar className="w-3.5 h-3.5 text-purple-200 opacity-80" />
                      </div>
                    </th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">
                      ITEMS
                    </th>
                    <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">
                      TOTAL AMOUNT
                    </th>
                    <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-right">
                      PAID / BALANCE
                    </th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">
                      PAYMENT
                    </th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">
                      STATUS
                    </th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">
                      SALES REP
                    </th>
                    <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {paginatedSales.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-16 text-center text-slate-400 border border-slate-200 font-medium"
                      >
                        <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                        <p className="font-semibold text-slate-600 text-sm">
                          No sales transactions found
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Try changing search filters or create a new sale
                          order.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSales.map((sale) => {
                      const isPaid = sale.paymentStatus === "Paid";
                      const isCancelled = sale.saleStatus === "Cancelled";
                      const initials = getCustomerInitials(sale.customerName);

                      return (
                        <tr
                          key={sale.id}
                          className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans"
                        >
                          {/* 1. Customer */}
                          <td className="py-4 px-5 border border-slate-200 whitespace-nowrap align-middle">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-[#33077C]" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 text-xs sm:text-[13px] block">
                                  {sale.customerName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium block">
                                  {sale.customerCompany || "Direct Customer"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Invoice No. */}
                          <td className="py-4 px-5 border border-slate-200 whitespace-nowrap align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#33077C] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0 select-none">
                                {initials}
                              </div>
                              <div className="flex flex-col">
                                <span
                                  className="font-bold text-[#33077C] text-xs sm:text-[14px] cursor-pointer hover:underline"
                                  onClick={() => handleOpenViewInvoice(sale)}
                                >
                                  {sale.invoiceNo}
                                </span>
                                {sale.referenceNo && (
                                  <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                                    Ref: {sale.referenceNo}
                                  </span>
                                )}
                                <DocumentLineageBadges
                                  docRef={sale.invoiceNo || sale.referenceNo}
                                  currentType="Invoice"
                                  className="justify-start mt-1"
                                />
                              </div>
                            </div>
                          </td>

                          {/* 3. Date */}
                          <td className="py-4 px-4 border border-slate-200 whitespace-nowrap align-middle font-medium text-slate-700">
                            <div className="font-semibold text-slate-800">
                              {sale.saleDate}
                            </div>
                            {sale.dueDate && (
                              <div className="text-[10.5px] text-slate-400 font-normal mt-0.5">
                                Due: {sale.dueDate}
                              </div>
                            )}
                          </td>

                          {/* 3. Items */}
                          <td className="py-4 px-5 border border-slate-200 whitespace-nowrap align-middle">
                            <div className="font-medium text-slate-800 text-xs">
                              {sale.items[0]?.productName || "Custom Line Item"}
                            </div>
                            {sale.items.length > 1 && (
                              <span className="text-[11px] text-[#33077C] font-bold block mt-0.5">
                                +{sale.items.length - 1} more item(s)
                              </span>
                            )}
                          </td>

                          {/* 4. Total Amount */}
                          <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap font-bold text-slate-900 text-xs sm:text-[13px] align-middle">
                            ₹
                            {sale.grandTotal.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>

                          {/* 5. Paid / Balance */}
                          <td className="py-4 px-4 border border-slate-200 text-right whitespace-nowrap align-middle">
                            <div className="font-bold text-emerald-600 text-xs">
                              ₹
                              {sale.paidAmount.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                            {sale.balance > 0 ? (
                              <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                                Bal: ₹
                                {sale.balance.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">
                                Settled
                              </div>
                            )}
                          </td>

                          {/* 6. Payment Status */}
                          <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap align-middle">
                            {sale.paymentStatus === "Paid" ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-300/80 text-xs font-bold shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>Paid</span>
                              </span>
                            ) : sale.paymentStatus === "Partial" ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-xs font-bold shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span>Partial</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                <span>Unpaid</span>
                              </span>
                            )}
                          </td>

                          {/* 7. Sale Status */}
                          <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap align-middle">
                            {sale.saleStatus === "Completed" ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-300/80 text-xs font-bold shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>Completed</span>
                              </span>
                            ) : sale.saleStatus === "Confirmed" ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#33077C] border border-purple-300 text-xs font-bold shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#33077C] shrink-0" />
                                <span>Confirmed</span>
                              </span>
                            ) : sale.saleStatus === "Cancelled" ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                <span>Cancelled</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                <span>Draft</span>
                              </span>
                            )}
                          </td>

                          {/* 8. Sales Rep */}
                          <td className="py-4 px-5 border border-slate-200 whitespace-nowrap align-middle">
                            <div className="flex flex-col gap-0.5">
                              {sale.salesRepresentativeName ||
                              sale.salesperson ? (
                                <span className="font-bold text-slate-900 text-xs sm:text-[13px] block">
                                  {sale.salesRepresentativeName ||
                                    sale.salesperson}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAssignInvoiceModal(sale);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#33077C] hover:underline cursor-pointer"
                                >
                                  + Assign Rep
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 9. Actions */}
                          <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap align-middle">
                            <div className="flex items-center justify-center gap-1.5 action-dropdown-container">
                              {/* 1. Share Action Button with Floating Popover */}
                              <UniversalShareDropdown
                                id={sale.id}
                                activeShareId={activeShareDropdownId}
                                setActiveShareId={setActiveShareDropdownId}
                                sharePos={shareDropdownPos}
                                setSharePos={setShareDropdownPos}
                                getShareData={() => formatInvoiceShare(sale)}
                                title="Share Invoice"
                              />

                              {/* 3. Actions Dropdown */}
                              <SaleActionDropdown
                                items={[
                                  {
                                    label: "View/Edit",
                                    variant: "edit",
                                    onClick: () => handleOpenEditModal(sale),
                                  },
                                  {
                                    label: "Assign Sales Rep",
                                    variant: "assign",
                                    onClick: () => handleOpenAssignInvoiceModal(sale),
                                  },
                                  {
                                    label: "Generate e-Invoice",
                                    variant: "invoice",
                                    onClick: () => {
                                      const irn = `IRN${Date.now().toString(36).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
                                      toast.success(
                                        `e-Invoice generated for ${sale.invoiceNo}!`,
                                        {
                                          description: `Ack No: ${Date.now()} | IRN: ${irn}`,
                                        },
                                      );
                                    },
                                  },
                                  {
                                    label: "Receive Payment",
                                    variant: "payment",
                                    onClick: () => handleOpenAddPayment(sale),
                                  },
                                  {
                                    label: "Convert To Return",
                                    variant: "return",
                                    onClick: () => {
                                      navigate(
                                        "/sale-management/sales/return",
                                      );
                                      toast.info(
                                        `Converting invoice ${sale.invoiceNo} to Sales Return / Credit Note`,
                                      );
                                    },
                                  },
                                  {
                                    label: "Preview Delivery Challan",
                                    variant: "challan",
                                    onClick: () => {
                                      navigate(
                                        "/sale-management/sales/delivery-challan",
                                      );
                                      toast.info(
                                        `Opening Delivery Challan preview for ${sale.invoiceNo}`,
                                      );
                                    },
                                  },
                                  {
                                    label: "Print Invoice",
                                    variant: "print",
                                    onClick: () => handlePrintSaleInvoice(sale),
                                  },
                                  {
                                    label: "Duplicate",
                                    variant: "duplicate",
                                    onClick: () => {
                                      const newInvoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
                                      const duplicatedSale: SaleTransaction = {
                                        ...sale,
                                        id: `sale_${Date.now()}`,
                                        invoiceNo: newInvoiceNo,
                                        saleDate: new Date()
                                          .toISOString()
                                          .split("T")[0],
                                        paidAmount: 0,
                                        balance: sale.grandTotal,
                                        paymentStatus: "Unpaid",
                                        saleStatus: "Draft",
                                        paymentRecords: [],
                                        paymentSplits: [],
                                        createdAt: new Date().toISOString(),
                                        updatedAt: new Date().toISOString(),
                                      };
                                      saveSale(duplicatedSale);
                                      toast.success(
                                        `Duplicated ${sale.invoiceNo} as new Invoice ${newInvoiceNo}!`,
                                      );
                                    },
                                  },
                                  {
                                    label: "Preview",
                                    variant: "preview",
                                    onClick: () => {
                                      setSelectedSale(sale);
                                      setIsInvoiceModalOpen(true);
                                    },
                                  },
                                  {
                                    label: "View History",
                                    variant: "view",
                                    onClick: () => {
                                      setSelectedSale(sale);
                                      setIsPaymentHistoryModalOpen(true);
                                    },
                                  },
                                  {
                                    label: "Cancel Invoice",
                                    variant: "cancel",
                                    dividerBefore: true,
                                    onClick: () => handleCancelInvoice(sale),
                                  },
                                  {
                                    label: "Delete",
                                    variant: "delete",
                                    danger: true,
                                    onClick: () => handleDeleteSaleInvoice(sale),
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
          </div>

          {/* Pagination */}
          {filteredSales.length > 0 && (
            <Pagination
              total={filteredSales.length}
              currentPage={currentPage}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={(newPage) => setCurrentPage(newPage)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          )}

          {/* =========================================================================
          BOTTOM SECTION: PAYMENT HISTORY & TRANSACTION AUDIT LOGS
         ========================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-5 sm:p-6 space-y-5">
            {/* Header & Filter Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#33077C] border border-purple-200 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <History className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Payment History &amp; Transaction Logs
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#33077C] text-xs font-bold border border-purple-200">
                      {allPaymentLogs.length} Total Logs
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Comprehensive settlement records, split payment traces, and
                    transaction audit trails across all sales.
                  </p>
                </div>
              </div>

              {/* Search & Method Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={paymentLogSearch}
                    onChange={(e) => {
                      setPaymentLogSearch(e.target.value);
                      setPaymentLogPage(1);
                    }}
                    placeholder="Search Txn ID, Inv #, Customer..."
                    className="w-full h-9 pl-8 pr-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-medium text-slate-700 outline-none transition-all shadow-2xs"
                  />
                  {paymentLogSearch && (
                    <button
                      type="button"
                      onClick={() => setPaymentLogSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Method Filter */}
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={paymentLogMethodFilter}
                    onChange={(e) => {
                      setPaymentLogMethodFilter(e.target.value);
                      setPaymentLogPage(1);
                    }}
                    className="h-9 px-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer transition-all shadow-2xs"
                  >
                    <option value="All">All Methods</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Credit">Credit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                  Total Collected Logged
                </span>
                <div className="text-base sm:text-lg font-black text-[#33077C] mt-0.5">
                  ₹
                  {allPaymentLogs
                    .reduce((acc, l) => acc + (Number(l.amount) || 0), 0)
                    .toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Total Payment Entries
                </span>
                <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
                  {allPaymentLogs.length} Receipts
                </div>
              </div>
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                  Active Sales Orders
                </span>
                <div className="text-base sm:text-lg font-black text-indigo-700 mt-0.5">
                  {sales.length} Invoices
                </div>
              </div>
              <div className="p-3.5 bg-amber-50/60 border border-amber-100 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Pending Payments Total
                </span>
                <div className="text-base sm:text-lg font-black text-amber-600 mt-0.5">
                  ₹
                  {sales
                    .reduce((acc, s) => acc + (s.balance || 0), 0)
                    .toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Table of Payment Logs */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3.5">#</th>
                    <th className="py-3 px-3.5">Invoice #</th>
                    <th className="py-3 px-3.5">Customer Name</th>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3.5">Payment Method</th>
                    <th className="py-3 px-3.5">Reference / Txn ID</th>
                    <th className="py-3 px-3.5 text-right">Amount Paid</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedPaymentLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-8 text-center text-slate-400"
                      >
                        <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">
                          No payment transaction logs found
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Try adjusting your search query or method filter.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedPaymentLogs.map((log, idx) => {
                      const globalIdx =
                        (paymentLogPage - 1) * paymentLogPageSize + idx + 1;
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-purple-50/30 transition-colors"
                        >
                          <td className="py-3 px-3.5 text-slate-400 font-medium">
                            {globalIdx}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-[#33077C]">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSale(log.sale);
                                setIsInvoiceModalOpen(true);
                              }}
                              className="hover:underline cursor-pointer"
                            >
                              {log.invoiceNo}
                            </button>
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-slate-900">
                            {log.customerName}
                          </td>
                          <td className="py-3 px-3.5 text-slate-500 font-medium">
                            {log.date}
                          </td>
                          <td className="py-3 px-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${
                                log.method === "UPI"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : log.method === "Bank Transfer"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : log.method === "Cash"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : log.method === "Card"
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                        : log.method === "Cheque"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {log.method}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                            {log.referenceNo || (
                              <span className="text-slate-300 italic">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-right font-bold text-emerald-600 text-[13px]">
                            ₹
                            {Number(log.amount).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Settled</span>
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSale(log.sale);
                                  setIsInvoiceModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
                                title="View Invoice"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSale(log.sale);
                                  setIsPaymentHistoryModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all cursor-pointer shadow-2xs"
                                title="View Payment History"
                              >
                                <History className="w-3.5 h-3.5" />
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

            {/* Bottom Pagination for Logs */}
            {filteredPaymentLogs.length > paymentLogPageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-500">
                  Showing{" "}
                  <strong className="text-slate-700">
                    {(paymentLogPage - 1) * paymentLogPageSize + 1}
                  </strong>{" "}
                  to{" "}
                  <strong className="text-slate-700">
                    {Math.min(
                      paymentLogPage * paymentLogPageSize,
                      filteredPaymentLogs.length,
                    )}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-slate-700">
                    {filteredPaymentLogs.length}
                  </strong>{" "}
                  logs
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={paymentLogPage === 1}
                    onClick={() => setPaymentLogPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-2">
                    Page {paymentLogPage} of {totalPaymentLogPages}
                  </span>
                  <button
                    type="button"
                    disabled={paymentLogPage >= totalPaymentLogPages}
                    onClick={() =>
                      setPaymentLogPage((p) =>
                        Math.min(totalPaymentLogPages, p + 1),
                      )
                    }
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: INVOICE DETAIL & PRINT PREVIEW
         ========================================== */}
      {selectedSale && (
        <Modal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          title={`Sales Invoice: ${selectedSale.invoiceNo}`}
          subtitle="View full invoice details and printable breakdown"
          maxWidth="4xl"
        >
          <div className="space-y-6 pt-2" id="printable-invoice">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{selectedSale.paymentStatus}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#33077C] border border-purple-200 text-xs font-bold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#33077C] shrink-0" />
                  <span>{selectedSale.saleStatus}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsInvoiceModalOpen(false);
                    navigate("/sale-management/sales/customer");
                  }}
                  className="h-9 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-[#33077C]" />
                  <span>View Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-9 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsInvoiceModalOpen(false);
                    navigate("/sale-management/sales/return");
                  }}
                  className="h-9 px-3.5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Create Return</span>
                </button>
              </div>
            </div>

            {/* Printable Invoice Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black text-[#33077C] tracking-tight">
                  Yaa Creations Inc.
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Enterprise Sales & Logistics Division
                </p>
                <p className="text-xs text-slate-500">
                  support@yaacreations.com | +91 98765 43210
                </p>
              </div>
              <div className="text-right">
                <div className="text-base font-extrabold text-[#33077C]">
                  {selectedSale.invoiceNo}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">
                  Date: {selectedSale.saleDate}
                </div>
                <div className="text-xs text-slate-500">
                  Due: {selectedSale.dueDate}
                </div>
              </div>
            </div>

            {/* Bill To & Ship To */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
                  Billed To:
                </span>
                <div className="font-bold text-slate-900 text-sm">
                  {selectedSale.customerName}
                </div>
                {selectedSale.customerCompany && (
                  <div className="font-semibold text-slate-700">
                    {selectedSale.customerCompany}
                  </div>
                )}
                <div className="text-slate-600 mt-1 whitespace-pre-line">
                  {selectedSale.billingAddress}
                </div>
                {selectedSale.customerPhone && (
                  <div className="text-slate-500 mt-1">
                    Phone: {selectedSale.customerPhone}
                  </div>
                )}
              </div>

              <div>
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
                  Shipped To:
                </span>
                <div className="text-slate-600 whitespace-pre-line">
                  {selectedSale.shippingAddress}
                </div>
                <div className="mt-2 text-slate-500">
                  <span className="font-semibold">Salesperson:</span>{" "}
                  {selectedSale.salesperson}
                </div>
                <div className="text-slate-500">
                  <span className="font-semibold">Terms:</span>{" "}
                  {selectedSale.paymentTerms}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs shadow-2xs">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left min-w-[620px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200 text-[11px]">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Product / Description</th>
                      <th className="py-2.5 px-3 text-center">Batch No</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-center">Disc</th>
                      <th className="py-2.5 px-3 text-center">GST%</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSale.items.map((it, idx) => (
                      <tr key={it.id}>
                        <td className="py-2.5 px-3 text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {it.productName}
                          {it.sku && (
                            <span className="text-slate-400 font-normal ml-1">
                              ({it.sku})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {it.batch ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-[#33077C] font-mono text-[11px] font-bold border border-purple-200/80">
                              {it.batch}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {it.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          ₹{it.unitPrice.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {it.discountPercent || 0}%
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {selectedSale.withGst !== false
                            ? `${it.taxPercent}%`
                            : "0% (Exempt)"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
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
            </div>

            {/* Bottom Breakdown */}
            <div className="flex justify-end text-xs">
              <div className="w-80 space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900">
                    ₹
                    {selectedSale.subtotal.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {selectedSale.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>
                      -₹
                      {selectedSale.totalDiscount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                {selectedSale.withGst !== false && selectedSale.totalTax > 0 ? (
                  selectedSale.gstType === "inter_state" ? (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST (Inter-State Tax):</span>
                      <span className="font-medium text-slate-800">
                        +₹
                        {(selectedSale.igst !== undefined
                          ? selectedSale.igst
                          : selectedSale.totalTax
                        ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST (Central Tax - 50%):</span>
                        <span className="font-medium text-slate-800">
                          +₹
                          {(selectedSale.cgst !== undefined
                            ? selectedSale.cgst
                            : selectedSale.totalTax / 2
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST (State Tax - 50%):</span>
                        <span className="font-medium text-slate-800">
                          +₹
                          {(selectedSale.sgst !== undefined
                            ? selectedSale.sgst
                            : selectedSale.totalTax / 2
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </>
                  )
                ) : (
                  <div className="flex justify-between text-amber-700 font-medium">
                    <span>Tax (Without GST):</span>
                    <span>₹0.00 (Exempt)</span>
                  </div>
                )}
                {selectedSale.shippingCharges > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping:</span>
                    <span>
                      +₹
                      {selectedSale.shippingCharges.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-[#33077C]">
                  <span>Grand Total:</span>
                  <span>
                    ₹
                    {selectedSale.grandTotal.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Amount Paid:</span>
                  <span>
                    ₹
                    {selectedSale.paidAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-amber-600 font-bold border-t border-slate-200 pt-1.5">
                  <span>Balance Due:</span>
                  <span>
                    ₹
                    {selectedSale.balance.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History & Transactions Section */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                    <History className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-[13px] font-bold text-slate-900">
                      Payment History &amp; Settlements
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Breakdown of recorded payments and transaction references
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      selectedSale.paymentStatus === "Paid"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : selectedSale.paymentStatus === "Partial"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {selectedSale.paymentStatus === "Paid" ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    <span>{selectedSale.paymentStatus}</span>
                  </span>
                </div>
              </div>

              {selectedSale.paymentSplits &&
              selectedSale.paymentSplits.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Payment Method</th>
                        <th className="py-2.5 px-3">Reference / Txn ID</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Amount Paid</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedSale.paymentSplits.map((split, sIdx) => (
                        <tr
                          key={split.id || sIdx}
                          className="hover:bg-slate-50/50"
                        >
                          <td className="py-2.5 px-3 text-slate-400 font-medium">
                            {sIdx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 font-bold text-[11px]">
                              {split.method}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {split.referenceNo || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-medium">
                            {selectedSale.saleDate}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            ₹
                            {Number(split.amount || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Settled</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">
                      Primary Method:
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 font-bold text-[11px]">
                      {selectedSale.paymentMethod || "Cash"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500">
                      Date:{" "}
                      <strong className="text-slate-700 font-semibold">
                        {selectedSale.saleDate}
                      </strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Amount Paid:</span>
                      <span className="font-bold text-emerald-600 text-sm">
                        ₹
                        {selectedSale.paidAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Collection Assignment Section as requested */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#33077C] shrink-0 shadow-2xs">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-[13px] font-bold text-slate-900">
                      Customer Sales Representative
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Representative assigned to customer{" "}
                      {selectedSale.customerName} (applies across all invoices)
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#33077C] border border-purple-200 text-xs font-bold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#33077C]" />
                  Customer Assignment
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {/* Sales Rep Selector */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Sales Representative
                  </label>
                  <select
                    value={detailRepId}
                    onChange={(e) => setDetailRepId(e.target.value)}
                    className="w-full h-10 px-3 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C] outline-none"
                  >
                    <option value="">-- Select Sales Rep --</option>
                    {salesRepresentatives.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Outstanding Amount */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Outstanding Amount
                  </label>
                  <div className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center font-bold text-rose-600 text-sm">
                    ₹
                    {selectedSale.balance.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Due Date
                  </label>
                  <div className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center font-semibold text-slate-700 text-xs">
                    {selectedSale.dueDate || "Immediate"}
                  </div>
                </div>

                {/* Collection Status */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Collection Status
                  </label>
                  <select
                    value={detailCollectionStatus}
                    onChange={(e) => setDetailCollectionStatus(e.target.value)}
                    className="w-full h-10 px-3 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C] outline-none"
                  >
                    <option value="Pending Follow-up">Pending Follow-up</option>
                    <option value="Customer Contacted">
                      Customer Contacted
                    </option>
                    <option value="Promise to Pay">Promise to Pay</option>
                    <option value="Dispute Raised">Dispute Raised</option>
                    <option value="Collected">Collected</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Next Follow-up
                  </label>
                  <input
                    type="date"
                    value={detailNextFollowUp}
                    onChange={(e) => setDetailNextFollowUp(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:border-[#33077C] outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveDetailAssignment}
                  className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer self-end"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Save Assignment</span>
                </button>
              </div>
            </div>

            {/* Close footer */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Close</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL: QUICK ASSIGN SALES REP TO INVOICE (FROM 3-DOTS)
         ========================================== */}
      {assignInvoiceTarget && (
        <Modal
          isOpen={isAssignInvoiceModalOpen}
          onClose={() => {
            setIsAssignInvoiceModalOpen(false);
            setAssignInvoiceTarget(null);
          }}
          title={`Assign Sales Rep to Customer: ${assignInvoiceTarget.customerName}`}
          subtitle={`Assigning a sales representative to ${assignInvoiceTarget.customerName} applies across all customer transactions.`}
          maxWidth="lg"
        >
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveQuickAssignInvoice();
            }}
            className="space-y-4 p-1 text-xs"
          >
            {/* Invoice Quick Summary Banner */}
            <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#33077C] text-sm block">
                  {assignInvoiceTarget.customerName}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Invoice #{assignInvoiceTarget.invoiceNo} • Grand Total: ₹
                  {assignInvoiceTarget.grandTotal.toLocaleString("en-IN")} |
                  Due: ₹{assignInvoiceTarget.balance.toLocaleString("en-IN")}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-[#33077C] border border-purple-200 font-bold text-xs shadow-2xs">
                {assignInvoiceTarget.paymentStatus}
              </span>
            </div>

            {/* Sales Rep Selector */}
            <div>
              <FormLabel required>Sales Representative</FormLabel>
              <select
                value={assignRepId}
                onChange={(e) => setAssignRepId(e.target.value)}
                className={FORM_SELECT_CLS}
              >
                <option value="">-- Select Sales Representative --</option>
                {salesRepresentatives.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.mobile}) - {r.status}
                  </option>
                ))}
              </select>
            </div>

            {/* Collection Status */}
            <div>
              <FormLabel>Collection Status</FormLabel>
              <select
                value={assignStatus}
                onChange={(e) => setAssignStatus(e.target.value)}
                className={FORM_SELECT_CLS}
              >
                <option value="Pending Follow-up">Pending Follow-up</option>
                <option value="Customer Contacted">Customer Contacted</option>
                <option value="Promise to Pay">Promise to Pay</option>
                <option value="Dispute Raised">Dispute Raised</option>
                <option value="Collected">Collected</option>
              </select>
            </div>

            {/* Next Follow-up Date */}
            <div>
              <FormLabel>Next Follow-up Date (Optional)</FormLabel>
              <input
                type="date"
                value={assignNextFollowUp}
                onChange={(e) => setAssignNextFollowUp(e.target.value)}
                className={FORM_INPUT_CLS}
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 flex justify-end items-center gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsAssignInvoiceModalOpen(false);
                  setAssignInvoiceTarget(null);
                }}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSaveQuickAssignInvoice}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Save Assignment</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ==========================================
          MODAL 3: RECORD PAYMENT MODAL (2-COLUMN 5XL LAYOUT)
         ========================================== */}
      {selectedSale && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title="Add Payment"
          subtitle={`Record a payment against invoice ${selectedSale.invoiceNo}.`}
          maxWidth="5xl"
        >
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirmPayment();
            }}
            className="space-y-5 pt-1 text-xs font-sans"
          >
            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEFT SIDE: Payment Details (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. Amount Due Banner */}
                <div className="p-3.5 bg-purple-50/60 border border-purple-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-700 font-semibold text-xs sm:text-[13px]">
                    <div className="w-8 h-8 rounded-lg bg-[#33077C] text-white flex items-center justify-center shadow-2xs">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <span>Amount Due on Invoice</span>
                  </div>
                  <span className="font-bold text-[#33077C] text-base sm:text-lg">
                    ₹
                    {selectedSale.balance.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* 2. Split / Multiple Payment Methods Area */}
                <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-[13px] font-bold text-slate-800">
                        Payment Details
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Enter payment amount, select method, and record
                        transaction reference
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPaymentModalSplit}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#33077C]/10 hover:bg-[#33077C]/15 text-[#33077C] rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Add Another Payment</span>
                    </button>
                  </div>

                  {/* Payment Rows */}
                  <div className="space-y-2.5">
                    {paymentModalSplits.map((split, sIdx) => (
                      <div
                        key={split.id || sIdx}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 sm:p-0 bg-slate-50 sm:bg-transparent rounded-lg border border-slate-200/80 sm:border-0"
                      >
                        {/* Method Select */}
                        <div className="w-full sm:w-40 shrink-0">
                          <select
                            value={split.method}
                            onChange={(e) =>
                              handlePaymentModalSplitChange(
                                sIdx,
                                "method",
                                e.target.value,
                              )
                            }
                            className="w-full h-10 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10 rounded-lg text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all cursor-pointer shadow-2xs"
                          >
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Online Payment">
                              Online Payment
                            </option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Amount Input */}
                          <div className="w-32 sm:w-36 shrink-0 relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-semibold">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={split.amount || ""}
                              onChange={(e) =>
                                handlePaymentModalSplitChange(
                                  sIdx,
                                  "amount",
                                  Number(e.target.value),
                                )
                              }
                              placeholder="0.00"
                              className="w-full h-10 pl-7 pr-3 text-right bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10 rounded-lg text-xs sm:text-[13px] font-semibold text-slate-900 outline-none transition-all shadow-2xs"
                            />
                          </div>

                          {/* Reference / Txn No */}
                          <div className="flex-1 min-w-[100px]">
                            <input
                              type="text"
                              value={split.referenceNo || ""}
                              onChange={(e) =>
                                handlePaymentModalSplitChange(
                                  sIdx,
                                  "referenceNo",
                                  e.target.value,
                                )
                              }
                              placeholder="Enter reference number"
                              className="w-full h-10 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10 rounded-lg text-xs sm:text-[13px] font-normal text-slate-700 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                            />
                          </div>

                          {/* Delete Row Button */}
                          {paymentModalSplits.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemovePaymentModalSplit(sIdx)
                              }
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer shrink-0"
                              title="Remove Payment Row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Payment Date & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <FormLabel required>Payment Date</FormLabel>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="dd/mm/yyyy"
                        value={isoToDdmmyyyy(paymentModalDate)}
                        onChange={(e) => {
                          const iso = ddmmyyyyToIso(e.target.value);
                          setPaymentModalDate(iso || e.target.value);
                        }}
                        required
                        className={`${FORM_INPUT_CLS} pr-10`}
                      />
                      <label className="absolute right-2.5 top-2.5 text-slate-400 hover:text-[#33077C] cursor-pointer transition-colors p-1">
                        <Calendar className="w-4 h-4" />
                        <input
                          type="date"
                          value={paymentModalDate}
                          onChange={(e) => {
                            if (e.target.value)
                              setPaymentModalDate(e.target.value);
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <FormLabel>Payment Notes</FormLabel>
                    <input
                      type="text"
                      value={recordNotes}
                      onChange={(e) => setRecordNotes(e.target.value)}
                      placeholder="Add payment notes..."
                      className={FORM_INPUT_CLS}
                    />
                  </div>
                </div>

                {/* 4. Live Calculation Box */}
                {(() => {
                  const currentAllocated = paymentModalSplits.reduce(
                    (acc, p) => acc + (Number(p.amount) || 0),
                    0,
                  );
                  const prevPaid = selectedSale.paidAmount || 0;
                  const remainingBal = Math.max(
                    0,
                    selectedSale.grandTotal - (prevPaid + currentAllocated),
                  );

                  return (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 text-slate-600">
                        <span>Invoice Total:</span>
                        <span className="font-semibold text-slate-900">
                          ₹
                          {selectedSale.grandTotal.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Previously Paid:</span>
                        <span className="font-medium text-slate-700">
                          ₹
                          {prevPaid.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700 font-medium">
                        <span>Current Payment:</span>
                        <span className="font-semibold text-emerald-600 text-xs sm:text-[13px]">
                          ₹
                          {currentAllocated.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-xs sm:text-[13px]">
                        <span>Remaining Balance:</span>
                        <span className="text-[#33077C] font-bold text-sm">
                          ₹
                          {remainingBal.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* RIGHT SIDE: Existing Invoice Summary (5 cols) */}
              <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-3.5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        EXISTING INVOICE
                      </span>
                      <div className="font-bold text-[#33077C] text-sm mt-0.5">
                        {selectedSale.invoiceNo}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-[#33077C] border border-purple-200">
                      Generated
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Invoice Date:</span>
                      <span className="font-medium text-slate-800">
                        {selectedSale.saleDate}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Customer:</span>
                      <span className="font-semibold text-slate-900">
                        {selectedSale.customerName}
                      </span>
                    </div>
                  </div>

                  {/* Products Table */}
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
                    <div className="p-2.5 bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-600 flex justify-between text-[11px]">
                      <span>Product / Item</span>
                      <span>Total</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-32 overflow-y-auto">
                      {selectedSale.items.map((it, idx) => (
                        <div
                          key={it.id || idx}
                          className="p-2.5 flex items-center justify-between text-slate-700"
                        >
                          <div className="truncate pr-2">
                            <span className="font-medium text-slate-900 text-xs block">
                              {it.productName}
                            </span>
                            <span className="text-slate-400 block text-[11px]">
                              Qty: {it.quantity} × ₹
                              {it.unitPrice.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-900 shrink-0 text-xs">
                            ₹
                            {it.total.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  {(() => {
                    const currentAllocated = paymentModalSplits.reduce(
                      (acc, p) => acc + (Number(p.amount) || 0),
                      0,
                    );
                    const prevPaid = selectedSale.paidAmount || 0;
                    const balAfter = Math.max(
                      0,
                      selectedSale.grandTotal - (prevPaid + currentAllocated),
                    );

                    return (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal:</span>
                          <span className="font-medium text-slate-800">
                            ₹
                            {selectedSale.subtotal.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>GST Amount:</span>
                          <span className="font-medium text-slate-800">
                            +₹
                            {selectedSale.totalTax.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200 text-xs sm:text-[13px]">
                          <span>Grand Total:</span>
                          <span>
                            ₹
                            {selectedSale.grandTotal.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Previously Paid:</span>
                          <span className="font-medium text-slate-700">
                            ₹
                            {prevPaid.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-700 font-medium">
                          <span>Current Payment:</span>
                          <span className="font-semibold text-emerald-600">
                            ₹
                            {currentAllocated.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between text-[#33077C] font-bold pt-1 border-t border-slate-200 text-xs sm:text-[13px]">
                          <span>Balance After Payment:</span>
                          <span className="text-sm">
                            ₹
                            {balAfter.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInvoiceModalOpen(true);
                    }}
                    className="w-full h-9 rounded-lg border border-slate-200 hover:border-purple-200 bg-white hover:bg-purple-50/50 text-[#33077C] text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Invoice</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Modal Actions */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="h-10 px-5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-[13px] font-bold transition-all cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleConfirmPayment}
                className="h-10 px-6 rounded-lg bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md shadow-[#33077C]/20 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Confirm Payment</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ==========================================
          MODAL 4: QUICK CUSTOMER ADD MODAL
         ========================================== */}
      <Modal
        isOpen={isQuickCustomerModalOpen}
        onClose={() => setIsQuickCustomerModalOpen(false)}
        title="Quick Register Customer"
        subtitle="Add a new customer profile without losing your current sale progress"
        maxWidth="lg"
      >
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveQuickCustomer();
          }}
          className="space-y-4 p-2 sm:p-4 text-xs animate-in fade-in duration-150"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="sm:col-span-2">
              <FormLabel required>Customer / Client Name</FormLabel>
              <input
                type="text"
                value={quickCustomerForm.name}
                onChange={(e) =>
                  setQuickCustomerForm({
                    ...quickCustomerForm,
                    name: e.target.value,
                  })
                }
                placeholder="e.g. Acme Corp / Sarah Connor"
                className={FORM_INPUT_CLS}
              />
            </div>
            <div>
              <FormLabel>Company Name (Optional)</FormLabel>
              <input
                type="text"
                value={quickCustomerForm.company}
                onChange={(e) =>
                  setQuickCustomerForm({
                    ...quickCustomerForm,
                    company: e.target.value,
                  })
                }
                placeholder="e.g. Acme Enterprises"
                className={FORM_INPUT_CLS}
              />
            </div>
            <div>
              <FormLabel required>Phone Number</FormLabel>
              <input
                type="text"
                value={quickCustomerForm.phone}
                onChange={(e) =>
                  setQuickCustomerForm({
                    ...quickCustomerForm,
                    phone: e.target.value,
                  })
                }
                placeholder="e.g. +91 98765 43210"
                className={FORM_INPUT_CLS}
              />
            </div>
            <div>
              <FormLabel>Email Address</FormLabel>
              <input
                type="email"
                value={quickCustomerForm.email}
                onChange={(e) =>
                  setQuickCustomerForm({
                    ...quickCustomerForm,
                    email: e.target.value,
                  })
                }
                placeholder="e.g. info@acme.com"
                className={FORM_INPUT_CLS}
              />
            </div>
            <div>
              <FormLabel>GSTIN / Tax ID</FormLabel>
              <input
                type="text"
                value={quickCustomerForm.gstNumber}
                onChange={(e) =>
                  setQuickCustomerForm({
                    ...quickCustomerForm,
                    gstNumber: e.target.value,
                  })
                }
                placeholder="e.g. 33AABCZ9876K1Z2"
                className={`${FORM_INPUT_CLS} font-mono uppercase`}
              />
            </div>
            <div className="sm:col-span-2">
              <FormLabel>Billing Address</FormLabel>
              <input
                type="text"
                value={quickCustomerForm.address}
                onChange={(e) =>
                  setQuickCustomerForm({
                    ...quickCustomerForm,
                    address: e.target.value,
                  })
                }
                placeholder="Street address..."
                className={FORM_INPUT_CLS}
              />
            </div>
            <div>
              <FormLabel>Credit Limit (₹)</FormLabel>
              <input
                type="number"
                min="0"
                value={quickCustomerForm.creditLimit}
                onChange={(e) =>
                  setQuickCustomerForm({
                    ...quickCustomerForm,
                    creditLimit: e.target.value,
                  })
                }
                className={FORM_INPUT_CLS}
              />
            </div>
            <div>
              <FormLabel>Payment Terms</FormLabel>
              <input
                type="text"
                value={quickCustomerForm.paymentTerms}
                onChange={(e) =>
                  setQuickCustomerForm({
                    ...quickCustomerForm,
                    paymentTerms: e.target.value,
                  })
                }
                placeholder="e.g. Net 30 Days"
                className={FORM_INPUT_CLS}
              />
            </div>
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsQuickCustomerModalOpen(false)}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              onClick={handleSaveQuickCustomer}
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Register &amp; Select</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ==========================================
          MODAL 5: PAYMENT HISTORY MODAL (GLOBAL VIEW)
         ========================================== */}
      {selectedSale && (
        <Modal
          isOpen={isPaymentHistoryModalOpen}
          onClose={() => setIsPaymentHistoryModalOpen(false)}
          title={`Payment History: ${selectedSale.invoiceNo}`}
          subtitle={`Transaction logs and payment settlements for ${selectedSale.customerName}`}
          maxWidth="2xl"
        >
          <div className="space-y-5 p-2 sm:p-4 text-xs animate-in fade-in duration-150">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                  Grand Total
                </span>
                <div className="text-base sm:text-lg font-black text-[#33077C] mt-0.5">
                  ₹
                  {selectedSale.grandTotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Total Paid
                </span>
                <div className="text-base sm:text-lg font-black text-emerald-600 mt-0.5">
                  ₹
                  {selectedSale.paidAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-2xl">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  Balance Due
                </span>
                <div className="text-base sm:text-lg font-black text-amber-600 mt-0.5">
                  ₹
                  {selectedSale.balance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Payment Status
                </span>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      selectedSale.paymentStatus === "Paid"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : selectedSale.paymentStatus === "Partial"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                    }`}
                  >
                    {selectedSale.paymentStatus === "Paid" ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    <span>{selectedSale.paymentStatus}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Collection Progress Bar */}
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-600">
                  Payment Collection Progress
                </span>
                <span className="text-indigo-600 font-bold">
                  {selectedSale.grandTotal > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (selectedSale.paidAmount / selectedSale.grandTotal) *
                            100,
                        ),
                      )
                    : 100}
                  % Paid
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#33077C] to-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${selectedSale.grandTotal > 0 ? Math.min(100, (selectedSale.paidAmount / selectedSale.grandTotal) * 100) : 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Transaction Logs Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-[13px] font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  <span>Recorded Payment Transactions</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">
                  {selectedSale.paymentRecords &&
                  selectedSale.paymentRecords.length > 0
                    ? `${selectedSale.paymentRecords.length} recorded transaction(s)`
                    : selectedSale.paymentSplits &&
                        selectedSale.paymentSplits.length > 0
                      ? `${selectedSale.paymentSplits.length} split transaction(s)`
                      : "1 single transaction"}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3.5">#</th>
                      <th className="py-3 px-3.5">Method</th>
                      <th className="py-3 px-3.5">Transaction / Ref No</th>
                      <th className="py-3 px-3.5">Date</th>
                      <th className="py-3 px-3.5 text-right">Amount (₹)</th>
                      <th className="py-3 px-3.5 text-center">Status</th>
                      <th className="py-3 px-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {selectedSale.paymentRecords &&
                    selectedSale.paymentRecords.length > 0 ? (
                      selectedSale.paymentRecords.map((rec, rIdx) => (
                        <tr
                          key={rec.id || rIdx}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="py-3 px-3.5 font-medium text-slate-400">
                            {rIdx + 1}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[11px]">
                              {rec.method}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                            {rec.referenceNo || (
                              <span className="text-slate-300 italic">
                                None
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-slate-500 font-medium">
                            {rec.paymentDate}{" "}
                            {rec.paymentTime ? `• ${rec.paymentTime}` : ""}
                          </td>
                          <td className="py-3 px-3.5 text-right font-bold text-emerald-600 text-[13px]">
                            ₹
                            {Number(rec.amount || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{rec.status || "Paid"}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                handleViewPaymentDetails(rec);
                              }}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-[#33077C] font-bold rounded-lg border border-purple-200 text-xs transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : selectedSale.paymentSplits &&
                      selectedSale.paymentSplits.length > 0 ? (
                      selectedSale.paymentSplits.map((split, sIdx) => (
                        <tr
                          key={split.id || sIdx}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="py-3 px-3.5 font-medium text-slate-400">
                            {sIdx + 1}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[11px]">
                              {split.method}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                            {split.referenceNo || (
                              <span className="text-slate-300 italic">
                                None
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-slate-500 font-medium">
                            {selectedSale.saleDate}
                          </td>
                          <td className="py-3 px-3.5 text-right font-bold text-emerald-600 text-[13px]">
                            ₹
                            {Number(split.amount || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Settled</span>
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span className="text-slate-400 text-xs">—</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3.5 font-medium text-slate-400">
                          1
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[11px]">
                            {selectedSale.paymentMethod || "Cash"}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-400 italic">
                          Standard Receipt
                        </td>
                        <td className="py-3 px-3.5 text-slate-500 font-medium">
                          {selectedSale.saleDate}
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-emerald-600 text-[13px]">
                          ₹
                          {selectedSale.paidAmount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>
                              {selectedSale.paymentStatus === "Paid"
                                ? "Full Settlement"
                                : "Partial Receipt"}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="text-slate-400 text-xs">—</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes / Details Box if any */}
            {selectedSale.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <span className="font-semibold text-slate-600 block mb-0.5">
                  Sale / Payment Remarks:
                </span>
                <p className="text-slate-700 italic">{selectedSale.notes}</p>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPaymentHistoryModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Close</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPaymentHistoryModalOpen(false);
                    setIsInvoiceModalOpen(true);
                  }}
                  className="h-10 px-4 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-[13px] font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Full Invoice</span>
                </button>

                {selectedSale.balance > 0 &&
                  selectedSale.saleStatus !== "Cancelled" && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsPaymentHistoryModalOpen(false);
                        handleOpenAddPayment(selectedSale);
                      }}
                      className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Record New Payment</span>
                    </button>
                  )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL 6: PAYMENT DETAILS & RECEIPT VIEW MODAL
         ========================================== */}
      {selectedPaymentRecord && (
        <Modal
          isOpen={isPaymentDetailsModalOpen}
          onClose={() => setIsPaymentDetailsModalOpen(false)}
          title={`Payment Receipt: ${selectedPaymentRecord.id}`}
          subtitle={`Payment details for Invoice ${selectedPaymentRecord.invoiceNo}`}
          maxWidth="lg"
        >
          <div
            className="space-y-4 p-2 sm:p-4 text-xs animate-in fade-in duration-150"
            id="printable-payment-receipt"
          >
            {/* Top Success Badge */}
            <div className="p-4 bg-emerald-50 border border-emerald-200/90 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">
                    Payment Successfully Settled
                  </h4>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    Recorded by{" "}
                    {selectedPaymentRecord.recordedBy ||
                      "Org Super Administrator"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                  Amount Paid
                </span>
                <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
                  ₹
                  {Number(selectedPaymentRecord.amount || 0).toLocaleString(
                    "en-IN",
                    { minimumFractionDigits: 2 },
                  )}
                </div>
              </div>
            </div>

            {/* Grid of Payment Attributes */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Payment ID
                  </span>
                  <span className="font-mono font-bold text-[#33077C] text-sm mt-0.5 block">
                    {selectedPaymentRecord.id}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Invoice Number
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                    {selectedPaymentRecord.invoiceNo}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Payment Date
                  </span>
                  <span className="font-medium text-slate-700 mt-0.5 block">
                    {isoToDdmmyyyy(selectedPaymentRecord.paymentDate) ||
                      selectedPaymentRecord.paymentDate}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Created Date &amp; Time
                  </span>
                  <span className="font-medium text-slate-700 mt-0.5 block">
                    {isoToDdmmyyyy(selectedPaymentRecord.paymentDate)}{" "}
                    {selectedPaymentRecord.paymentTime || ""}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Payment Method
                  </span>
                  <div className="mt-0.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs border border-purple-200">
                      {selectedPaymentRecord.method}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Reference / Transaction No.
                  </span>
                  <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                    {selectedPaymentRecord.referenceNo || "None / Cash"}
                  </span>
                </div>
              </div>

              {selectedPaymentRecord.notes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Payment Remarks / Notes
                  </span>
                  <p className="text-slate-700 italic">
                    {selectedPaymentRecord.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPaymentDetailsModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Close</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  printHtmlElement(
                    "printable-payment-receipt",
                    `Payment Receipt - ${selectedPaymentRecord.invoiceNo}`,
                  )
                }
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Download / Print Receipt</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Sales Graph Modal */}
      <SalesGraphModal
        isOpen={isSalesGraphModalOpen}
        onClose={() => setIsSalesGraphModalOpen(false)}
        sales={sales}
      />
    </>
  );
};
