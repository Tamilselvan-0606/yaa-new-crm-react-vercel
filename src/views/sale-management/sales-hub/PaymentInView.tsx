import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  Plus,
  Search,
  Calendar,
  CreditCard,
  MoreVertical,
  X,
  Check,
  FileText,
  ChevronDown,
  Pencil,
  Printer,
  Trash2,
  Eye,
  IndianRupee,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Forward,
  Camera,
  User,
  RotateCcw,
  Loader2,
  FileCheck2,
} from "lucide-react";
import {
  useSalesManagementStore,
  SalePaymentIn,
  PaymentInType,
  SalesCustomer,
  SaleTransaction,
} from "../../../store/useSalesManagementStore";
import { Button } from "../../../components/common/Button";
import { Modal } from "../../../components/common/Modal";
import { Pagination } from "../../../components/common/Pagination";
import { SearchBar } from "../../../components/common/SearchBar";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { exportTableToExcel } from "../../../utils/excelExport";
import { UniversalShareDropdown, formatPaymentInShare } from "../../../utils/shareUtils";
import { FormLabel, FORM_INPUT_CLS, FORM_SELECT_CLS, FORM_TEXTAREA_CLS } from "../utils/formUtils";
import { toast } from "sonner";
import {
  commercePaymentInApi,
  mapApiPaymentInToSalePaymentIn,
  mapSalePaymentInToApiPayload,
  UUID_REGEX,
  PaymentInFilterParams,
} from "../../../api/commerce/paymentInApi";
import { customerApi, mapApiCustomerToSalesCustomer } from "../../../api/commerce/customerApi";
import { commerceInvoiceApi, mapApiInvoiceToSaleTransaction } from "../../../api/commerce/invoiceApi";

// Helper for DD/MM/YYYY <-> YYYY-MM-DD
const isoToDdmmyyyy = (iso?: string): string => {
  if (!iso) return "";
  const cleanDate = iso.split("T")[0];
  const parts = cleanDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
};

// Convert number to Indian currency words
function numberToWords(num: number): string {
  if (!num || isNaN(num)) return "Zero Rupees Only";
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const inWords = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return a[n] + " ";
    if (n < 100)
      return (
        b[Math.floor(n / 10)] + " " + (n % 10 !== 0 ? a[n % 10] + " " : "")
      );
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred " +
        (n % 100 !== 0 ? inWords(n % 100) : "")
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        "Thousand " +
        (n % 1000 !== 0 ? inWords(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        "Lakh " +
        (n % 100000 !== 0 ? inWords(n % 100000) : "")
      );
    return (
      inWords(Math.floor(n / 10000000)) +
      "Crore " +
      (n % 10000000 !== 0 ? inWords(n % 10000000) : "")
    );
  };

  const str = inWords(Math.floor(num)).trim();
  return `${str} Rupees Only`;
}

// Default payment type options
const DEFAULT_PAYMENT_TYPES: PaymentInType[] = [
  "Cash",
  "Bank Transfer",
  "Cheque",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Online Payment",
  "PayTM",
  "Google Pay",
  "PhonePe",
];

// Quick Date Range Presets
const PERIOD_OPTIONS = [
  { label: "This Month", value: "This Month" },
  { label: "Today", value: "Today" },
  { label: "Yesterday", value: "Yesterday" },
  { label: "This Week", value: "This Week" },
  { label: "Last Month", value: "Last Month" },
  { label: "This Quarter", value: "This Quarter" },
  { label: "This Year", value: "This Year" },
  { label: "All Time", value: "All Time" },
];

export const PaymentInView: React.FC = () => {
  const {
    customers,
    setCustomersList,
    sales,
    setSalesList,
    savePaymentIn,
    deletePaymentIn: deleteStorePaymentIn,
    saveCustomer,
  } = useSalesManagementStore();

  // API & List State
  const [paymentIns, setPaymentIns] = useState<SalePaymentIn[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [serverTotal, setServerTotal] = useState(0);
  const isFetchingRef = useRef(false);
  const hasLoadedPrereqs = useRef(false);

  // Filter States
  const [selectedPeriod, setSelectedPeriod] = useState<string>("This Month");
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return start.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return end.toISOString().split("T")[0];
  });
  const [selectedFirm, setSelectedFirm] = useState<string>("All");
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>("All");
  const [pendingSearch, setPendingSearch] = useState<string>("");
  const [appliedSearch, setAppliedSearch] = useState<string>("");

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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPaymentIn, setEditingPaymentIn] =
    useState<SalePaymentIn | null>(null);
  const [isViewReceiptModalOpen, setIsViewReceiptModalOpen] = useState(false);
  const [selectedPaymentIn, setSelectedPaymentIn] =
    useState<SalePaymentIn | null>(null);

  // Quick Customer Modal
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerCompany, setNewCustomerCompany] = useState("");

  // Custom Payment Types list
  const [availablePaymentTypes, setAvailablePaymentTypes] = useState<string[]>(
    () => {
      const saved = localStorage.getItem("yaa_crm_custom_payment_types");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
      return DEFAULT_PAYMENT_TYPES;
    },
  );
  const [isAddPaymentTypeOpen, setIsAddPaymentTypeOpen] = useState(false);
  const [newPaymentTypeName, setNewPaymentTypeName] = useState("");

  // Form State for Create / Edit Modal
  const [formPartySearchOpen, setFormPartySearchOpen] = useState(false);
  const [formPartyQuery, setFormPartyQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerObj, setSelectedCustomerObj] =
    useState<SalesCustomer | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState("");
  const [formPaymentType, setFormPaymentType] = useState<PaymentInType>("Cash");
  const [formReceiptNo, setFormReceiptNo] = useState("");
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [formReceivedAmount, setFormReceivedAmount] = useState("");
  const [formReferenceNo, setFormReferenceNo] = useState("");
  const [formStatus, setFormStatus] = useState<
    "Completed" | "Received" | "Cleared" | "In Process"
  >("Completed");
  const [formDescription, setFormDescription] = useState("");
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);

  // 3-Dots Action Dropdown & Share Dropdown & History State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [activeShareDropdownId, setActiveShareDropdownId] = useState<
    string | null
  >(null);
  const [shareDropdownPos, setShareDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [historyPaymentIn, setHistoryPaymentIn] =
    useState<SalePaymentIn | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const partySelectDropdownRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------
  // API: Fetch Payment-In list with current filters and pagination
  // -------------------------------------------------------------
  const fetchPaymentIns = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsFetching(true);
    try {
      const params: PaymentInFilterParams = {
        page_no: currentPage,
        page_size: pageSize,
        pagination_required: true,
        sortOrder: "desc",
      };

      if (appliedSearch) {
        params.search = appliedSearch;
      }
      if (startDate) params.from = startDate;
      if (endDate) params.to = endDate;

      if (
        selectedPeriod &&
        selectedPeriod !== "All Time" &&
        selectedPeriod !== "Custom"
      ) {
        const pMap: Record<string, string> = {
          Today: "today",
          "This Week": "this_week",
          "This Month": "this_month",
          "Last Month": "last_month",
          "This Quarter": "this_quarter",
          "This Year": "this_year",
        };
        if (pMap[selectedPeriod]) params.period = pMap[selectedPeriod];
      }

      if (selectedPaymentType && selectedPaymentType !== "All") {
        params.paymentType = selectedPaymentType;
      }

      if (selectedFirm && selectedFirm !== "All" && UUID_REGEX.test(selectedFirm)) {
        params.customerId = selectedFirm;
      }

      const res = await commercePaymentInApi.getPaymentIns(params);
      if (res?.success && Array.isArray(res.data)) {
        const mapped = res.data.map(mapApiPaymentInToSalePaymentIn);
        setPaymentIns(mapped);
        if (res.pagination?.totalRecords !== undefined) {
          setServerTotal(res.pagination.totalRecords);
        } else {
          setServerTotal(mapped.length);
        }
      }
    } catch (err: any) {
      console.warn("Commerce Payments In API returned error:", err?.message || err);
    } finally {
      setIsFetching(false);
      setIsInitialLoading(false);
      isFetchingRef.current = false;
    }
  }, [
    currentPage,
    pageSize,
    appliedSearch,
    startDate,
    endDate,
    selectedPeriod,
    selectedPaymentType,
    selectedFirm,
  ]);

  // Load Customers for filter dropdown (Runs once on mount)
  const hasLoadedCustomersRef = useRef(false);
  useEffect(() => {
    if (hasLoadedCustomersRef.current) return;
    hasLoadedCustomersRef.current = true;
    customerApi
      .getCustomers({ pagination_required: false })
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setCustomersList(res.data.map(mapApiCustomerToSalesCustomer));
        }
      })
      .catch((e) => console.warn("Customer load error in PaymentIn:", e));
  }, [setCustomersList]);

  // Load Invoices for linking ONLY when Create or Edit Modal is opened
  const hasLoadedInvoicesRef = useRef(false);
  const loadInvoicesForModal = useCallback(async () => {
    if (hasLoadedInvoicesRef.current) return;
    hasLoadedInvoicesRef.current = true;
    try {
      const invRes = await commerceInvoiceApi.getInvoices({ pagination_required: false });
      if (invRes?.success && Array.isArray(invRes.data)) {
        setSalesList(invRes.data.map(mapApiInvoiceToSaleTransaction));
      }
    } catch (e) {
      console.warn("Invoices fetch for PaymentIn modal failed:", e);
    }
  }, [setSalesList]);

  useEffect(() => {
    if (isCreateModalOpen || editingPaymentIn) {
      loadInvoicesForModal();
    }
  }, [isCreateModalOpen, editingPaymentIn, loadInvoicesForModal]);

  // Trigger list fetch on dependency changes
  useEffect(() => {
    fetchPaymentIns();
  }, [fetchPaymentIns]);

  // Close dropdowns on outside click or scroll
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".payment-in-dropdown-container") &&
        !target.closest(".payment-in-dropdown-menu")
      ) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (
        !target.closest(".payment-in-share-dropdown-container") &&
        !target.closest(".payment-in-share-dropdown-menu")
      ) {
        setActiveShareDropdownId(null);
        setShareDropdownPos(null);
      }
      if (
        partySelectDropdownRef.current &&
        !partySelectDropdownRef.current.contains(target)
      ) {
        setFormPartySearchOpen(false);
      }
    };
    const handleScroll = () => {
      setActiveDropdownId(null);
      setDropdownPos(null);
      setActiveShareDropdownId(null);
      setShareDropdownPos(null);
    };
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  // Update date ranges when period changes
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();
    if (period === "This Month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    } else if (period === "Today") {
      const today = now.toISOString().split("T")[0];
      setStartDate(today);
      setEndDate(today);
    } else if (period === "Yesterday") {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (period === "This Week") {
      const curr = new Date();
      const day = curr.getDay();
      const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(curr.getFullYear(), curr.getMonth(), diffToMonday);
      const sun = new Date(
        mon.getFullYear(),
        mon.getMonth(),
        mon.getDate() + 6,
      );
      setStartDate(mon.toISOString().split("T")[0]);
      setEndDate(sun.toISOString().split("T")[0]);
    } else if (period === "Last Month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    } else if (period === "This Quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1);
      const end = new Date(now.getFullYear(), qMonth + 3, 0);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    } else if (period === "This Year") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(end.toISOString().split("T")[0]);
    } else if (period === "All Time") {
      setStartDate("");
      setEndDate("");
    }
    setCurrentPage(1);
  };

  // Calculate Next Receipt Number
  const getNextReceiptNo = useCallback((): string => {
    if (paymentIns.length === 0) return `PAY-${new Date().getFullYear()}-0001`;
    const numbers = paymentIns
      .map((p) => {
        const num = parseInt(p.receiptNo.replace(/\D/g, ""), 10);
        return isNaN(num) ? 0 : num;
      })
      .filter((n) => n > 0);
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `PAY-${new Date().getFullYear()}-${String(max + 1).padStart(4, "0")}`;
  }, [paymentIns]);

  // Open Create Modal
  const handleOpenCreateModal = (customer?: SalesCustomer) => {
    setEditingPaymentIn(null);
    setSelectedCustomerId(customer?.id || "");
    setSelectedCustomerObj(customer || null);
    setSelectedInvoiceId("");
    setSelectedInvoiceNo("");
    setFormPartyQuery(customer ? customer.name : "");
    setFormPaymentType("Cash");
    setFormReceiptNo(getNextReceiptNo());
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormReceivedAmount("");
    setFormReferenceNo("");
    setFormStatus("Completed");
    setFormDescription("");
    setImageAttachment(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: SalePaymentIn) => {
    setEditingPaymentIn(item);
    setSelectedCustomerId(item.customerId || "");
    const foundCust = customers.find(
      (c) =>
        c.id === item.customerId ||
        c.name.toLowerCase() === item.partyName.toLowerCase(),
    );
    setSelectedCustomerObj(foundCust || null);
    setSelectedInvoiceId(item.invoiceId || "");
    setSelectedInvoiceNo(item.invoiceNo || "");
    setFormPartyQuery(item.partyName);
    setFormPaymentType(item.paymentType || "Cash");
    setFormReceiptNo(item.receiptNo);
    setFormDate(item.date ? item.date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setFormReceivedAmount(String(item.receivedAmount));
    setFormReferenceNo(item.referenceNo || "");
    setFormStatus((item.status as any) || "Completed");
    setFormDescription(item.description || item.notes || "");
    setImageAttachment(item.imageAttachment || null);
    setIsCreateModalOpen(true);
  };

  // Handle Linked Invoice selection change
  const handleInvoiceSelect = (invId: string) => {
    setSelectedInvoiceId(invId);
    if (!invId) {
      setSelectedInvoiceNo("");
      return;
    }
    const inv = sales.find((s) => s.id === invId);
    if (inv) {
      setSelectedInvoiceNo(inv.invoiceNo);
      if (!selectedCustomerId) {
        setSelectedCustomerId(inv.customerId);
        const cust = customers.find((c) => c.id === inv.customerId);
        if (cust) {
          setSelectedCustomerObj(cust);
          setFormPartyQuery(cust.name);
        } else {
          setFormPartyQuery(inv.customerName);
        }
      }
      if (!formReceivedAmount || Number(formReceivedAmount) <= 0) {
        const bal = inv.balance > 0 ? inv.balance : inv.grandTotal;
        setFormReceivedAmount(String(bal));
      }
      if (!formDescription) {
        setFormDescription(`Payment against Invoice ${inv.invoiceNo}`);
      }
    }
  };

  // Filtered Customer Candidates for Modal Dropdown
  const filteredCustomerCandidates = useMemo(() => {
    const q = formPartyQuery.toLowerCase().trim();
    if (!q) return customers.slice(0, 15);
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)),
    );
  }, [customers, formPartyQuery]);

  // Handle Create Quick Customer
  const handleCreateQuickCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    const newCust: SalesCustomer = {
      id: `cust_${Date.now()}`,
      customerCode: `CUS-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim() || "N/A",
      email: "",
      company: newCustomerCompany.trim() || "",
      customerType: "Business",
      status: "Active",
      creditLimit: 50000,
      paymentTerms: "Net 15 Days",
      openingBalance: 0,
      preferredPaymentMethod: "Cash",
      address: "",
      billingAddress: "",
      shippingAddress: "",
      sameAsBilling: true,
      city: "Chennai",
      state: "Tamil Nadu",
      country: "India",
      pincode: "600001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await customerApi.createCustomer({
        name: newCust.name,
        phone: newCust.phone !== "N/A" ? newCust.phone : undefined,
        company: newCust.company || undefined,
        customerType: "Business",
      });
      if (res?.success && res.data) {
        const mapped = mapApiCustomerToSalesCustomer(res.data);
        saveCustomer(mapped);
        setSelectedCustomerId(mapped.id);
        setSelectedCustomerObj(mapped);
        setFormPartyQuery(mapped.name);
      } else {
        saveCustomer(newCust);
        setSelectedCustomerId(newCust.id);
        setSelectedCustomerObj(newCust);
        setFormPartyQuery(newCust.name);
      }
    } catch {
      saveCustomer(newCust);
      setSelectedCustomerId(newCust.id);
      setSelectedCustomerObj(newCust);
      setFormPartyQuery(newCust.name);
    }

    setIsQuickCustomerOpen(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerCompany("");
    toast.success(`Customer "${newCust.name}" added successfully`);
  };

  // Handle Add Custom Payment Type
  const handleAddPaymentType = () => {
    if (!newPaymentTypeName.trim()) {
      toast.error("Payment type name is required");
      return;
    }
    const formatted = newPaymentTypeName.trim();
    if (availablePaymentTypes.includes(formatted)) {
      toast.error("Payment type already exists");
      return;
    }
    const updated = [...availablePaymentTypes, formatted];
    setAvailablePaymentTypes(updated);
    localStorage.setItem(
      "yaa_crm_custom_payment_types",
      JSON.stringify(updated),
    );
    setFormPaymentType(formatted as PaymentInType);
    setIsAddPaymentTypeOpen(false);
    setNewPaymentTypeName("");
    toast.success(`Payment type "${formatted}" added`);
  };

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageAttachment(reader.result as string);
      toast.success("Receipt image attached");
    };
    reader.readAsDataURL(file);
  };

  // Print Receipt Slip
  const handlePrintReceipt = useCallback(async (item: SalePaymentIn) => {
    let activeItem = item;
    if (UUID_REGEX.test(item.id)) {
      try {
        const singleRes = await commercePaymentInApi.getPaymentInById(item.id);
        if (singleRes?.success && singleRes.data) {
          activeItem = mapApiPaymentInToSalePaymentIn(singleRes.data);
        }
      } catch (e) {
        console.warn("Could not fetch latest receipt details for print:", e);
      }
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups for this site.");
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt #${activeItem.receiptNo}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            padding: 40px;
            color: #1e293b;
            max-width: 650px;
            margin: auto;
          }
          .header {
            border-bottom: 2px solid #33077C;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .title { font-size: 24px; font-weight: 800; color: #33077C; }
          .badge {
            background: #f1f5f9;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
          }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
          .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px; }
          .val { font-size: 15px; font-weight: 700; color: #0f172a; }
          .amount-box {
            background: #ede9fe;
            border: 2px solid #c4b5fd;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 24px 0;
          }
          .amount { font-size: 32px; font-weight: 800; color: #33077C; }
          .words { font-size: 13px; color: #475569; font-style: italic; margin-top: 6px; }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px dashed #cbd5e1;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #64748b;
          }
          .sign { text-align: right; }
          .sign-line { width: 140px; border-top: 1px solid #0f172a; margin-top: 40px; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">PAYMENT RECEIPT</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">OFFICIAL CASH/BANK VOUCHER</div>
          </div>
          <div class="badge">RECEIPT #${activeItem.receiptNo}</div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="label">Received From (Customer)</div>
            <div class="val">${activeItem.partyName}</div>
            ${activeItem.customerCompany ? `<div style="font-size:12px; color:#64748b; margin-top:2px;">${activeItem.customerCompany}</div>` : ""}
            ${activeItem.customerPhone ? `<div style="font-size:12px; color:#64748b;">${activeItem.customerPhone}</div>` : ""}
          </div>
          <div class="card">
            <div class="label">Receipt Details</div>
            <div style="font-size:13px; margin-bottom:4px;"><strong>Date:</strong> ${isoToDdmmyyyy(activeItem.date)}</div>
            <div style="font-size:13px; margin-bottom:4px;"><strong>Mode:</strong> ${activeItem.paymentType}</div>
            ${activeItem.invoiceNo ? `<div style="font-size:13px;"><strong>Linked Invoice:</strong> ${activeItem.invoiceNo}</div>` : ""}
          </div>
        </div>

        <div class="amount-box">
          <div class="label" style="color:#33077C;">Amount Received</div>
          <div class="amount">₹ ${activeItem.receivedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div class="words">${numberToWords(activeItem.receivedAmount)}</div>
        </div>

        ${
          activeItem.description
            ? `<div class="card" style="margin-bottom:24px;">
                <div class="label">Remarks / Description</div>
                <div style="font-size:13px; color:#334155;">${activeItem.description}</div>
               </div>`
            : ""
        }

        <div class="footer">
          <div>
            <div>Generated electronically via CRM Sales Hub.</div>
            <div style="margin-top:4px;">Date: ${new Date().toLocaleDateString()}</div>
          </div>
          <div class="sign">
            <div>Authorized Signatory</div>
            <div class="sign-line"></div>
          </div>
        </div>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  }, []);

  // Share Handlers (Email, WhatsApp)
  const handleShareEmail = (item: SalePaymentIn) => {
    setActiveShareDropdownId(null);
    setShareDropdownPos(null);
    const customer = customers.find(
      (c) =>
        c.id === item.customerId ||
        c.name.toLowerCase() === item.partyName.toLowerCase(),
    );
    const email = customer?.email || "";
    const subject = encodeURIComponent(
      `Payment Receipt Voucher #${item.receiptNo} from YAA CRM`,
    );
    const body = encodeURIComponent(
      `Dear ${item.partyName},\n\n` +
        `We have received your payment. Here are the receipt details:\n\n` +
        `Receipt No: #${item.receiptNo}\n` +
        `Date: ${isoToDdmmyyyy(item.date)}\n` +
        `Payment Mode: ${item.paymentType}\n` +
        `Amount Received: ₹${item.receivedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
        (item.invoiceNo ? `Linked Invoice: ${item.invoiceNo}\n` : "") +
        (item.referenceNo
          ? `Reference / Cheque No: ${item.referenceNo}\n`
          : "") +
        (item.description ? `Notes: ${item.description}\n` : "") +
        `\nThank you for your prompt payment!\n\nBest regards,\nYAA Sales & Accounts Team`,
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
    toast.success(`Opening email for Receipt #${item.receiptNo}`);
  };

  const handleShareWhatsApp = (item: SalePaymentIn) => {
    setActiveShareDropdownId(null);
    setShareDropdownPos(null);
    const cleanPhone = (item.customerPhone || "").replace(/\D/g, "");
    const text = encodeURIComponent(
      `*PAYMENT RECEIPT ACKNOWLEDGEMENT*\n` +
        `--------------------------------\n` +
        `*Receipt #:* #${item.receiptNo}\n` +
        `*Customer Name:* ${item.partyName}\n` +
        `*Date:* ${isoToDdmmyyyy(item.date)}\n` +
        `*Payment Mode:* ${item.paymentType}\n` +
        `*Amount Received:* ₹${item.receivedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
        (item.invoiceNo ? `*Linked Invoice:* ${item.invoiceNo}\n` : "") +
        (item.referenceNo ? `*Ref / Txn No:* ${item.referenceNo}\n` : "") +
        (item.description ? `*Note:* ${item.description}\n` : "") +
        `\nThank you for choosing YAA CRM!`,
    );
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
    toast.success(`Opening WhatsApp for Receipt #${item.receiptNo}`);
  };

  // Delete / Void Payment Record via Backend API
  const handleDeletePayment = async (id: string, receiptNo: string) => {
    try {
      if (UUID_REGEX.test(id)) {
        await commercePaymentInApi.deletePaymentIn(id);
      }
      setPaymentIns((prev) => prev.filter((p) => p.id !== id));
      deleteStorePaymentIn(id);
      toast.success(`Payment-In #${receiptNo} voided successfully`);
      fetchPaymentIns();
    } catch (err: any) {
      console.error("Failed to void payment:", err);
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to void payment receipt";
      toast.error(msg);
    }
  };

  // Duplicate Payment Record
  const handleDuplicatePayment = (item: SalePaymentIn) => {
    const nextNo = getNextReceiptNo();
    setEditingPaymentIn(null);
    setSelectedCustomerId(item.customerId || "");
    const foundCust = customers.find(
      (c) =>
        c.id === item.customerId ||
        c.name.toLowerCase() === item.partyName.toLowerCase(),
    );
    setSelectedCustomerObj(foundCust || null);
    setSelectedInvoiceId(item.invoiceId || "");
    setSelectedInvoiceNo(item.invoiceNo || "");
    setFormPartyQuery(item.partyName);
    setFormPaymentType(item.paymentType || "Cash");
    setFormReceiptNo(nextNo);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormReceivedAmount(String(item.receivedAmount));
    setFormReferenceNo("");
    setFormStatus("Completed");
    setFormDescription(item.description ? `Copy: ${item.description}` : "");
    setImageAttachment(null);
    setIsCreateModalOpen(true);
    toast.info(`Configuring duplicate of Receipt #${item.receiptNo}`);
  };

  // Save / Submit Payment-In (Create or Update via Backend API)
  const handleSavePayment = useCallback(async () => {
    if (!selectedCustomerId && !formPartyQuery.trim()) {
      toast.error("Please select or enter a customer name");
      return;
    }
    const amountNum = parseFloat(formReceivedAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid received amount");
      return;
    }
    if (!formReceiptNo.trim()) {
      toast.error("Receipt number is required");
      return;
    }

    const partyName = selectedCustomerObj
      ? selectedCustomerObj.name
      : formPartyQuery.trim();

    const matchedCustomer =
      selectedCustomerObj ||
      customers.find(
        (c) =>
          c.id === selectedCustomerId ||
          c.name.toLowerCase() === partyName.toLowerCase(),
      );

    setIsSaving(true);
    try {
      const payload = mapSalePaymentInToApiPayload({
        receiptNo: formReceiptNo.trim(),
        customerId:
          matchedCustomer?.id && UUID_REGEX.test(matchedCustomer.id)
            ? matchedCustomer.id
            : selectedCustomerId && UUID_REGEX.test(selectedCustomerId)
              ? selectedCustomerId
              : undefined,
        partyName,
        customerPhone: matchedCustomer?.phone || undefined,
        customerCompany: matchedCustomer?.company || undefined,
        date: formDate,
        paymentType: formPaymentType,
        receivedAmount: amountNum,
        referenceNo: formReferenceNo.trim() || undefined,
        description: formDescription.trim() || undefined,
        notes: formDescription.trim() || undefined,
        imageAttachment: imageAttachment || undefined,
        status: formStatus || "Completed",
        invoiceNo: selectedInvoiceNo || undefined,
        invoiceId:
          selectedInvoiceId && UUID_REGEX.test(selectedInvoiceId)
            ? selectedInvoiceId
            : undefined,
      });

      if (
        editingPaymentIn &&
        editingPaymentIn.id &&
        UUID_REGEX.test(editingPaymentIn.id)
      ) {
        const res = await commercePaymentInApi.updatePaymentIn(
          editingPaymentIn.id,
          payload,
        );
        if (res?.success && res.data) {
          const mapped = mapApiPaymentInToSalePaymentIn(res.data);
          setPaymentIns((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)));
          savePaymentIn(mapped);
          toast.success(`Payment-In #${mapped.receiptNo} updated successfully!`);
        }
      } else {
        const res = await commercePaymentInApi.createPaymentIn(payload);
        if (res?.success && res.data) {
          const mapped = mapApiPaymentInToSalePaymentIn(res.data);
          setPaymentIns((prev) => [mapped, ...prev]);
          savePaymentIn(mapped);
          toast.success(`Payment-In #${mapped.receiptNo} recorded successfully!`);
        }
      }

      setIsCreateModalOpen(false);
      fetchPaymentIns();
    } catch (err: any) {
      console.error("Failed to save payment receipt:", err);
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save payment receipt";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedCustomerId,
    formPartyQuery,
    formReceivedAmount,
    formReceiptNo,
    selectedCustomerObj,
    customers,
    editingPaymentIn,
    formDate,
    formPaymentType,
    formReferenceNo,
    formDescription,
    imageAttachment,
    formStatus,
    selectedInvoiceNo,
    selectedInvoiceId,
    savePaymentIn,
    fetchPaymentIns,
  ]);

  // Keyboard shortcut: Alt+S or Ctrl+S to save modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        if (isCreateModalOpen && !isSaving) {
          e.preventDefault();
          handleSavePayment();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateModalOpen, isSaving, handleSavePayment]);

  // Aggregate Metrics directly from the fetched payments
  const totalAmount = useMemo(() => {
    return paymentIns.reduce(
      (acc, curr) => acc + (curr.receivedAmount || 0),
      0,
    );
  }, [paymentIns]);

  const cashCollections = useMemo(() => {
    return paymentIns
      .filter((p) => p.paymentType === "Cash")
      .reduce((acc, curr) => acc + (curr.receivedAmount || 0), 0);
  }, [paymentIns]);

  const onlineCollections = useMemo(() => {
    return paymentIns
      .filter((p) => p.paymentType !== "Cash")
      .reduce((acc, curr) => acc + (curr.receivedAmount || 0), 0);
  }, [paymentIns]);

  // The backend already handles pagination, so paymentIns contains the current page slice
  const pagedPaymentIns = useMemo(() => {
    return paymentIns;
  }, [paymentIns]);

  // Export to Excel
  const handleExportCSV = () => {
    if (paymentIns.length === 0) {
      toast.error("No payment records to export");
      return;
    }

    const excelRows = paymentIns.map((p, idx) => ({
      srNo: idx + 1,
      receiptNo: p.receiptNo,
      date: isoToDdmmyyyy(p.date),
      partyName: p.partyName,
      customerPhone: p.customerPhone || "-",
      paymentType: p.paymentType,
      receivedAmount: Number(p.receivedAmount || 0),
      status: p.status || "Completed",
      description: p.description || "-",
    }));

    exportTableToExcel({
      filename: `Payment_In_Report_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Payment Receipts",
      title: "YAA CREATIONS CRM - PAYMENT-IN REPORT",
      subtitle: `Filter: ${selectedPeriod} | Total Records: ${paymentIns.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: "#", key: "srNo", align: "center", width: 8 },
        { header: "Date", key: "date", align: "center", width: 15 },
        { header: "Receipt No.", key: "receiptNo", align: "center", width: 16 },
        { header: "Customer Name", key: "partyName", align: "left", width: 28 },
        { header: "Phone", key: "customerPhone", align: "left", width: 18 },
        {
          header: "Payment Type",
          key: "paymentType",
          align: "left",
          width: 16,
        },
        {
          header: "Amount Received (₹)",
          key: "receivedAmount",
          align: "right",
          type: "currency",
          width: 20,
        },
        { header: "Status", key: "status", align: "center", width: 14 },
        {
          header: "Remarks / Notes",
          key: "description",
          align: "left",
          width: 30,
        },
      ],
      data: excelRows,
      summaryRow: {
        srNo: "TOTAL",
        partyName: `${paymentIns.length} Receipts`,
        receivedAmount: totalAmount,
      },
    });

    toast.success(
      `Payment-In Excel report downloaded (${paymentIns.length} records)!`,
    );
  };

  const handleResetFilters = () => {
    setPendingSearch("");
    setAppliedSearch("");
    handlePeriodChange("This Month");
    setSelectedFirm("All");
    setSelectedPaymentType("All");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5 pb-16 font-sans">
      {/* 1. TOP HEADER CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Payment-In
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {serverTotal || paymentIns.length} total
              </span>
              {isFetching && (
                <Loader2 className="w-4 h-4 text-[#33077C] animate-spin" />
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Record customer payment receipts, track cash in counter, and monitor digital settlements.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Button
            variant="secondary"
            size="md"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            onClick={handleExportCSV}
            className="hover:border-emerald-500 hover:text-emerald-700 transition-colors"
          >
            Excel Report
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4 text-white stroke-[2.5]" />}
            onClick={() => handleOpenCreateModal()}
            className="bg-[#33077C] hover:bg-[#280563] text-white shadow-sm hover:shadow transition-all"
          >
            Add Payment-In
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Collections */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Collections
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              ₹
              {totalAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {paymentIns.length} recorded receipts
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#33077C] flex items-center justify-center font-bold">
            <IndianRupee className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        {/* Card 2: Cash in Hand */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cash In Hand
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              ₹
              {cashCollections.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Cash drawer deposits
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        {/* Card 3: Online Collections */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Online / Digital
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 mt-1">
              ₹
              {onlineCollections.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              UPI, Bank NEFT, Card
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        {/* Card 4: Average Receipt */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Avg. Receipt Size
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              ₹
              {paymentIns.length > 0
                ? (totalAmount / paymentIns.length).toLocaleString(
                    "en-IN",
                    {
                      maximumFractionDigits: 0,
                    },
                  )
                : "0"}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Per collection voucher
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* 3. FILTER BAR */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => {
          setPendingSearch(val);
          setCurrentPage(1);
        }}
        onSubmit={(val) => {
          setPendingSearch(val);
          setAppliedSearch(val.trim());
          setCurrentPage(1);
        }}
        placeholder="Search by customer name, receipt #, phone, or remarks..."
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              options={PERIOD_OPTIONS}
              value={selectedPeriod}
              onChange={handlePeriodChange}
              placeholder="Period : This Month"
            />
            <FilterDropdown
              options={[
                { label: "Payment Mode : All", value: "All" },
                ...availablePaymentTypes.map((t) => ({ label: t, value: t })),
              ]}
              value={selectedPaymentType}
              onChange={(val) => {
                setSelectedPaymentType(val);
                setCurrentPage(1);
              }}
              placeholder="Payment Mode : All"
            />
            <FilterDropdown
              options={[
                { label: "Customer : All", value: "All" },
                ...customers.map((c) => ({
                  label: c.name || c.company || "Unnamed",
                  value: c.id,
                })),
              ]}
              value={selectedFirm}
              onChange={(val) => {
                setSelectedFirm(val);
                setCurrentPage(1);
              }}
              placeholder="Customer : All"
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Receipts :{" "}
              <span className="text-[#33077C] font-bold">
                {serverTotal || paymentIns.length}
              </span>
            </span>
          </div>
        }
      />

      {/* 4. MAIN CONTENT: EMPTY STATE OR TRANSACTIONS TABLE */}
      {isInitialLoading && paymentIns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-16 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-10 h-10 text-[#33077C] animate-spin mb-3" />
          <h3 className="text-base font-bold text-slate-800">Loading Payment Receipts...</h3>
          <p className="text-xs text-slate-400 mt-1">Connecting to Commerce API</p>
        </div>
      ) : paymentIns.length === 0 ? (
        appliedSearch || selectedFirm !== "All" || selectedPaymentType !== "All" || selectedPeriod !== "This Month" ? (
          /* Filter Empty State */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-12 sm:p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#33077C] flex items-center justify-center mb-4">
              <Search className="w-8 h-8 stroke-[1.8]" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              No payment receipts match your filters
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md">
              Try adjusting your search terms, date range, payment mode, or customer filters.
            </p>
            <div className="mt-6">
              <Button
                variant="secondary"
                size="md"
                onClick={handleResetFilters}
                icon={<RotateCcw className="w-4 h-4" />}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        ) : (
          /* Total Empty State */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-16 sm:p-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-purple-50/70 border border-purple-100 flex items-center justify-center mb-6 relative shadow-inner">
              <div className="w-14 h-16 bg-[#33077C]/80 rounded-2xl p-2.5 flex flex-col justify-between shadow-md">
                <div className="flex items-center gap-1.5 border-b border-purple-400/50 pb-1.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-white/90" />
                  <div className="w-6 h-1.5 bg-white/90 rounded-full" />
                </div>
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-purple-300/80 rounded-full" />
                  <div className="w-3/4 h-1.5 bg-purple-300/80 rounded-full" />
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              No Payment Receipts Found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md">
              You haven't recorded any customer payment receipts yet. Click below to record your first incoming payment.
            </p>

            <div className="mt-8">
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleOpenCreateModal()}
                icon={<Plus className="w-5 h-5 text-white" />}
                className="bg-[#33077C] hover:bg-[#280563]"
              >
                Add Payment-In
              </Button>
            </div>
          </div>
        )
      ) : (
        /* Transactions Table */
        <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-opacity duration-200 ${isFetching ? "opacity-75" : "opacity-100"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#33077C] text-white text-xs font-bold uppercase tracking-wider select-none">
                  <th className="py-4 px-5 border-r border-[#4309A2]/60 min-w-[180px]">
                    CUSTOMER NAME
                  </th>
                  <th className="py-4 px-4 border-r border-[#4309A2]/60 whitespace-nowrap text-center min-w-[120px]">
                    RECEIPT NO.
                  </th>
                  <th className="py-4 px-4 border-r border-[#4309A2]/60 whitespace-nowrap min-w-[110px]">
                    <div className="flex items-center gap-1.5">
                      <span>DATE</span>
                      <Calendar className="w-3.5 h-3.5 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-4 px-4 border-r border-[#4309A2]/60 text-center whitespace-nowrap min-w-[120px]">
                    PAYMENT TYPE
                  </th>
                  <th className="py-4 px-4 border-r border-[#4309A2]/60 text-right whitespace-nowrap min-w-[130px]">
                    AMOUNT RECEIVED
                  </th>
                  <th className="py-4 px-4 border-r border-[#4309A2]/60 whitespace-nowrap min-w-[140px]">
                    DESCRIPTION
                  </th>
                  <th className="py-4 px-4 text-center whitespace-nowrap min-w-[130px] w-36">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-[13px] text-slate-700">
                {pagedPaymentIns.map((item) => {
                  const isActionOpen = activeDropdownId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-50/30 transition-colors border-b border-slate-200"
                    >
                      {/* Party Name */}
                      <td className="py-4 px-5 font-semibold text-slate-900 border-r border-slate-200 break-words align-middle">
                        <div className="font-bold text-sm text-slate-900">
                          {item.partyName}
                        </div>
                        {item.customerCompany && (
                          <div className="text-xs text-slate-500 font-normal mt-0.5">
                            {item.customerCompany}
                          </div>
                        )}
                        {item.customerPhone && (
                          <div className="text-xs text-slate-400 font-normal">
                            {item.customerPhone}
                          </div>
                        )}
                        {item.invoiceNo && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#33077C] mt-1 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60">
                            <FileCheck2 className="w-3 h-3" />
                            <span>Inv #{item.invoiceNo}</span>
                          </div>
                        )}
                      </td>

                      {/* Receipt No */}
                      <td className="py-4 px-4 font-extrabold text-slate-800 text-center border-r border-slate-200 whitespace-nowrap align-middle">
                        #{item.receiptNo}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap align-middle">
                        {isoToDdmmyyyy(item.date)}
                      </td>

                      {/* Payment Type Badge */}
                      <td className="py-4 px-4 text-center border-r border-slate-200 whitespace-nowrap align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            item.paymentType === "Cash"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                              : item.paymentType === "UPI"
                                ? "bg-purple-50 text-purple-700 border border-purple-200/80"
                                : item.paymentType === "Bank Transfer"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200/80"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.paymentType === "Cash"
                                ? "bg-emerald-500"
                                : item.paymentType === "UPI"
                                  ? "bg-[#33077C]"
                                  : "bg-blue-500"
                            }`}
                          />
                          <span>{item.paymentType}</span>
                        </span>
                      </td>

                      {/* Amount Received */}
                      <td className="py-4 px-4 text-right font-black text-slate-900 border-r border-slate-200 whitespace-nowrap align-middle">
                        <span className="text-[#33077C] text-sm sm:text-base font-extrabold">
                          ₹{" "}
                          {item.receivedAmount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-4 px-4 text-slate-600 border-r border-slate-200 max-w-xs truncate align-middle">
                        {item.description || item.notes || (
                          <span className="text-slate-300 italic">None</span>
                        )}
                      </td>

                      {/* Action Buttons Column */}
                      <td className="py-4 px-4 text-center whitespace-nowrap align-middle min-w-[130px] w-36">
                        <div className="inline-flex items-center justify-center gap-1">
                          {/* 1. Direct Print Button */}
                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(item)}
                            className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="Print Receipt Voucher"
                          >
                            <Printer className="w-4 h-4 text-slate-600" />
                          </button>

                          {/* 2. Share Dropdown Button */}
                          <UniversalShareDropdown
                            id={item.id}
                            activeShareId={activeShareDropdownId}
                            setActiveShareId={setActiveShareDropdownId}
                            sharePos={shareDropdownPos}
                            setSharePos={setShareDropdownPos}
                            getShareData={() => formatPaymentInShare(item)}
                            title="Share Payment Receipt"
                          />

                          {/* 3. 3-Dots Menu Button */}
                          <div className="payment-in-dropdown-container relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveShareDropdownId(null);
                                setShareDropdownPos(null);
                                if (isActionOpen) {
                                  setActiveDropdownId(null);
                                  setDropdownPos(null);
                                } else {
                                  const rect = (
                                    e.currentTarget as HTMLElement
                                  ).getBoundingClientRect();
                                  const spaceBelow =
                                    window.innerHeight - rect.bottom;
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
                                }
                              }}
                              className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                              title="More Options"
                            >
                              <MoreVertical className="w-4 h-4 text-slate-600" />
                            </button>

                            {/* Floating Dropdown Menu matching exact reference list */}
                            {isActionOpen && dropdownPos && (
                              <div
                                style={{
                                  position: "fixed",
                                  top:
                                    dropdownPos.top !== undefined
                                      ? `${dropdownPos.top}px`
                                      : "auto",
                                  bottom:
                                    dropdownPos.bottom !== undefined
                                      ? `${dropdownPos.bottom}px`
                                      : "auto",
                                  right: `${dropdownPos.right}px`,
                                  zIndex: 9999,
                                }}
                                className="payment-in-dropdown-menu w-44 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-2 animate-in fade-in zoom-in-95 duration-100 text-left font-sans overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* 1. View/Edit */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleOpenEditModal(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-[#33077C] hover:text-white transition-colors cursor-pointer block"
                                >
                                  View/Edit
                                </button>


                                {/* 4. Delete / Void */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleDeletePayment(
                                      item.id,
                                      item.receiptNo,
                                    );
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-rose-600 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer block"
                                >
                                  Void / Delete
                                </button>

                                {/* 5. Duplicate */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleDuplicatePayment(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-[#33077C] hover:text-white transition-colors cursor-pointer block"
                                >
                                  Duplicate
                                </button>

                                {/* 6. View History */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setHistoryPaymentIn(item);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-[#33077C] hover:text-white transition-colors cursor-pointer block"
                                >
                                  View History
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 sm:p-5 border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              total={serverTotal || paymentIns.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ADD / EDIT PAYMENT-IN MODAL                                            */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title={
            editingPaymentIn
              ? `Edit Payment-In: #${editingPaymentIn.receiptNo}`
              : "Add Payment-In"
          }
          subtitle={
            editingPaymentIn
              ? `Update payment voucher #${editingPaymentIn.receiptNo} and customer balance`
              : "Record client payment receipts, counter cash settlements, and digital collections"
          }
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsCreateModalOpen(false)}
        >
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleSavePayment();
            }}
            className="space-y-6 max-h-[75vh] overflow-y-auto p-2 sm:p-4 text-xs animate-in fade-in duration-150"
          >
            {/* Section 1: Customer & Basic Voucher Info */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                  <User className="w-3.5 h-3.5 text-[#4309A2]" />
                  1. Customer & Voucher Information
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Customer Name */}
                <div
                  className="sm:col-span-2 relative"
                  ref={partySelectDropdownRef}
                >
                  <div className="relative w-full">
                    <div className="flex items-center justify-between mb-1.5">
                      <FormLabel required className="mb-0">
                        Customer Name
                      </FormLabel>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsQuickCustomerOpen(true);
                        }}
                        className="text-xs font-semibold text-[#4309A2] hover:underline cursor-pointer"
                      >
                        + Add New Customer
                      </button>
                    </div>
                    <div
                      onClick={() => setFormPartySearchOpen(!formPartySearchOpen)}
                      className={`w-full h-11 px-4 bg-white border rounded-xl text-xs sm:text-[13px] font-medium flex items-center justify-between cursor-pointer transition-all ${
                        formPartySearchOpen
                          ? "border-[#4309A2] ring-4 ring-[#4309A2]/10"
                          : selectedCustomerObj
                            ? "border-purple-300 hover:border-[#33077C]"
                            : "border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      <div className="truncate pr-2">
                        {selectedCustomerObj ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                              {selectedCustomerObj.name}
                            </span>
                            {selectedCustomerObj.phone && (
                              <span className="text-slate-400 text-xs">
                                ({selectedCustomerObj.phone})
                              </span>
                            )}
                            {selectedCustomerObj.company && (
                              <span className="text-slate-500 text-xs">
                                • {selectedCustomerObj.company}
                              </span>
                            )}
                          </div>
                        ) : formPartyQuery ? (
                          <span className="font-bold text-slate-900">
                            {formPartyQuery}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            Search customer by name or phone...
                          </span>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  </div>

                  {/* Customer Dropdown Search Menu */}
                  {formPartySearchOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="relative mb-2">
                        <div className="flex items-center w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-[#33077C] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#33077C]/10 transition-all">
                          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                          <input
                            type="text"
                            placeholder="Type to filter customer name or phone..."
                            value={formPartyQuery}
                            onChange={(e) => {
                              setFormPartyQuery(e.target.value);
                              if (
                                selectedCustomerObj &&
                                selectedCustomerObj.name !== e.target.value
                              ) {
                                setSelectedCustomerId("");
                                setSelectedCustomerObj(null);
                              }
                            }}
                            autoFocus
                            className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                          />
                          {formPartyQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormPartyQuery("");
                                setSelectedCustomerId("");
                                setSelectedCustomerObj(null);
                              }}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredCustomerCandidates.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            No customer found matching "{formPartyQuery}".
                          </div>
                        ) : (
                          filteredCustomerCandidates.map((cust) => (
                            <div
                              key={cust.id}
                              onClick={() => {
                                setSelectedCustomerId(cust.id);
                                setSelectedCustomerObj(cust);
                                setFormPartyQuery(cust.name);
                                setFormPartySearchOpen(false);
                              }}
                              className="px-3 py-2 rounded-xl hover:bg-purple-50 cursor-pointer flex items-center justify-between transition-colors group"
                            >
                              <div>
                                <div className="font-bold text-xs text-slate-900 group-hover:text-[#33077C]">
                                  {cust.name}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {cust.phone}{" "}
                                  {cust.company ? `• ${cust.company}` : ""}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[11px] font-bold text-slate-700">
                                  Outstanding: ₹
                                  {(
                                    cust.outstandingAmount || 0
                                  ).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Receipt No */}
                <div>
                  <FormLabel required>Receipt Number</FormLabel>
                  <input
                    type="text"
                    value={formReceiptNo}
                    onChange={(e) => setFormReceiptNo(e.target.value)}
                    placeholder="e.g. PAY-2026-0001"
                    className={`${FORM_INPUT_CLS} font-mono font-bold text-[#33077C]`}
                  />
                </div>

                {/* Linked Invoice Selector */}
                <div>
                  <FormLabel>Linked Invoice (Optional)</FormLabel>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                    className={FORM_SELECT_CLS}
                  >
                    <option value="">No Linked Invoice</option>
                    {sales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.invoiceNo} - {s.customerName} (Bal: ₹{s.balance})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <FormLabel required>Payment Date</FormLabel>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className={FORM_INPUT_CLS}
                  />
                </div>

                {/* Payment Mode / Type */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <FormLabel required className="mb-0">
                      Payment Mode
                    </FormLabel>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAddPaymentTypeOpen(true);
                      }}
                      className="text-xs font-semibold text-[#4309A2] hover:underline cursor-pointer"
                    >
                      + Add Type
                    </button>
                  </div>
                  <select
                    value={formPaymentType}
                    onChange={(e) =>
                      setFormPaymentType(e.target.value as PaymentInType)
                    }
                    className={FORM_SELECT_CLS}
                  >
                    {availablePaymentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Payment & Amount Details */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                  <CreditCard className="w-3.5 h-3.5 text-[#4309A2]" />
                  2. Amount & Settlement Details
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Received Amount Input */}
                <div className="sm:col-span-2">
                  <FormLabel required>Received Amount (₹)</FormLabel>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formReceivedAmount}
                      onChange={(e) => setFormReceivedAmount(e.target.value)}
                      autoFocus
                      className={`${FORM_INPUT_CLS} pl-8 text-base font-extrabold text-[#33077C]`}
                    />
                  </div>
                  {formReceivedAmount && parseFloat(formReceivedAmount) > 0 && (
                    <div className="text-xs text-slate-500 font-medium italic mt-1.5">
                      {numberToWords(parseFloat(formReceivedAmount))}
                    </div>
                  )}
                </div>

                {/* Reference Number */}
                <div>
                  <FormLabel>Cheque / UPI / Ref No.</FormLabel>
                  <input
                    type="text"
                    value={formReferenceNo}
                    onChange={(e) => setFormReferenceNo(e.target.value)}
                    placeholder="e.g. UPI-UTR-9918237192"
                    className={FORM_INPUT_CLS}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Remarks & Proof Attachments */}
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-100">
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs flex items-center gap-1.5 border border-purple-200">
                  <FileText className="w-3.5 h-3.5 text-[#4309A2]" />
                  3. Description & Receipt Attachment
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start pt-1">
                {/* Description Textarea */}
                <div className="sm:col-span-2">
                  <FormLabel>Description / Remarks</FormLabel>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Enter transaction remarks, invoice reference, or settlement notes..."
                    className={FORM_TEXTAREA_CLS}
                  />
                </div>

                {/* Camera / Receipt Image Upload */}
                <div>
                  <FormLabel>Receipt Photo / Attachment</FormLabel>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  {!imageAttachment ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#33077C] text-slate-500 hover:text-[#33077C] hover:bg-purple-50/40 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Camera className="w-5 h-5 text-slate-400" />
                      <span className="text-xs font-bold">
                        Upload Photo Proof
                      </span>
                    </button>
                  ) : (
                    <div className="relative inline-block border border-slate-200 rounded-xl p-1.5 bg-slate-50">
                      <img
                        src={imageAttachment}
                        alt="Receipt Proof"
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setImageAttachment(null)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isSaving}
                className="bg-[#33077C] hover:bg-[#280563]"
                icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Check className="w-4 h-4 text-white" />}
              >
                {isSaving ? "Saving..." : editingPaymentIn ? "Update Payment" : "Save Payment"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 6. QUICK ADD CUSTOMER MODAL                                               */}
      {/* ========================================================================= */}
      {isQuickCustomerOpen && (
        <Modal
          isOpen={isQuickCustomerOpen}
          onClose={() => setIsQuickCustomerOpen(false)}
          title="Add New Customer"
          subtitle="Create customer record directly from voucher entry"
          maxWidth="md"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsQuickCustomerOpen(false)}
        >
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateQuickCustomer();
            }}
            className="p-2 space-y-4 text-xs sm:text-sm pt-3"
          >
            <div>
              <FormLabel required>Customer Name</FormLabel>
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="e.g. Acme Technologies Pvt Ltd"
                className={FORM_INPUT_CLS}
              />
            </div>

            <div>
              <FormLabel>Company / Firm Name</FormLabel>
              <input
                type="text"
                value={newCustomerCompany}
                onChange={(e) => setNewCustomerCompany(e.target.value)}
                placeholder="e.g. Acme Group"
                className={FORM_INPUT_CLS}
              />
            </div>

            <div>
              <FormLabel>Phone Number</FormLabel>
              <input
                type="text"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className={FORM_INPUT_CLS}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => setIsQuickCustomerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                className="bg-[#33077C] hover:bg-[#280563]"
              >
                Save Customer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 7. ADD CUSTOM PAYMENT TYPE MODAL                                          */}
      {/* ========================================================================= */}
      {isAddPaymentTypeOpen && (
        <Modal
          isOpen={isAddPaymentTypeOpen}
          onClose={() => setIsAddPaymentTypeOpen(false)}
          title="Add Custom Payment Type"
          subtitle="Add custom payment channel or bank"
          maxWidth="md"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsAddPaymentTypeOpen(false)}
        >
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleAddPaymentType();
            }}
            className="p-2 space-y-4 text-xs sm:text-sm pt-3"
          >
            <div>
              <FormLabel required>Payment Type Name</FormLabel>
              <input
                type="text"
                value={newPaymentTypeName}
                onChange={(e) => setNewPaymentTypeName(e.target.value)}
                placeholder="e.g. RTGS / NEFT or Google Pay"
                className={FORM_INPUT_CLS}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => setIsAddPaymentTypeOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                className="bg-[#33077C] hover:bg-[#280563]"
              >
                Add Type
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 8. VIEW RECEIPT VOUCHER MODAL                                            */}
      {/* ========================================================================= */}
      {isViewReceiptModalOpen && selectedPaymentIn && (
        <Modal
          isOpen={isViewReceiptModalOpen}
          onClose={() => {
            setIsViewReceiptModalOpen(false);
            setSelectedPaymentIn(null);
          }}
          title={`Payment Receipt Voucher #${selectedPaymentIn.receiptNo}`}
          subtitle="Official receipt record breakdown"
          maxWidth="lg"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => {
            setIsViewReceiptModalOpen(false);
            setSelectedPaymentIn(null);
          }}
        >
          <div className="space-y-6 text-xs sm:text-sm p-2">
            <div className="bg-purple-50/70 border-2 border-[#33077C]/20 rounded-2xl p-6 text-center">
              <div className="text-xs font-bold text-[#33077C] uppercase tracking-wider">
                Amount Received
              </div>
              <div className="text-4xl font-black text-[#33077C] mt-1.5">
                ₹{" "}
                {selectedPaymentIn.receivedAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 font-medium italic mt-1.5">
                {numberToWords(selectedPaymentIn.receivedAmount)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Customer Name
                </div>
                <div className="font-bold text-base text-slate-900 mt-1">
                  {selectedPaymentIn.partyName}
                </div>
                {selectedPaymentIn.customerCompany && (
                  <div className="text-slate-500 text-xs mt-0.5">
                    {selectedPaymentIn.customerCompany}
                  </div>
                )}
                {selectedPaymentIn.customerPhone && (
                  <div className="text-slate-400 text-xs mt-0.5">
                    {selectedPaymentIn.customerPhone}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-bold text-slate-900">
                    #{selectedPaymentIn.receiptNo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-bold text-slate-900">
                    {isoToDdmmyyyy(selectedPaymentIn.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-bold text-emerald-700">
                    {selectedPaymentIn.paymentType}
                  </span>
                </div>
                {selectedPaymentIn.invoiceNo && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Linked Invoice:</span>
                    <span className="font-bold text-[#33077C]">
                      {selectedPaymentIn.invoiceNo}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {selectedPaymentIn.description && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Remarks / Description
                </div>
                <div className="text-slate-800 font-medium">
                  {selectedPaymentIn.description}
                </div>
              </div>
            )}

            {selectedPaymentIn.imageAttachment && (
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Attached Receipt Proof
                </div>
                <img
                  src={selectedPaymentIn.imageAttachment}
                  alt="Proof"
                  className="max-h-56 rounded-2xl border border-slate-200 object-contain shadow-xs"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => {
                  setIsViewReceiptModalOpen(false);
                  handleOpenEditModal(selectedPaymentIn);
                }}
                icon={<Pencil className="w-4 h-4" />}
              >
                Edit
              </Button>
              <Button
                variant="primary"
                size="md"
                type="button"
                onClick={() => handlePrintReceipt(selectedPaymentIn)}
                icon={<Printer className="w-4 h-4" />}
                className="bg-[#33077C] hover:bg-[#280563]"
              >
                Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 9. PAYMENT HISTORY / AUDIT MODAL                                          */}
      {/* ========================================================================= */}
      {historyPaymentIn && (
        <Modal
          isOpen={Boolean(historyPaymentIn)}
          onClose={() => setHistoryPaymentIn(null)}
          title={`Payment History - Receipt #${historyPaymentIn.receiptNo}`}
          maxWidth="md"
        >
          <div className="p-6 space-y-4 text-xs font-sans">
            <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider">
                  Receipt No
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  #{historyPaymentIn.receiptNo}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {historyPaymentIn.partyName}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Amount
                </div>
                <div className="text-base font-extrabold text-[#33077C] mt-0.5">
                  ₹{" "}
                  {historyPaymentIn.receivedAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                  {historyPaymentIn.paymentType}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Activity Timeline
              </div>

              <div className="relative pl-6 space-y-4 border-l-2 border-purple-200 ml-2">
                {/* Event 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#33077C] ring-4 ring-purple-100" />
                  <div>
                    <div className="font-bold text-slate-800">
                      Payment-In Recorded
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Date: {isoToDdmmyyyy(historyPaymentIn.date)} • Mode:{" "}
                      {historyPaymentIn.paymentType}
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Recorded via CRM Sales Hub
                    </div>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  <div>
                    <div className="font-bold text-slate-800">
                      Receipt Voucher Generated
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Voucher #{historyPaymentIn.receiptNo} marked as{" "}
                      {historyPaymentIn.status || "Completed"}
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Timestamp:{" "}
                      {new Date(
                        historyPaymentIn.createdAt || Date.now(),
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-300 ring-4 ring-slate-100" />
                  <div>
                    <div className="font-bold text-slate-700">
                      Last Synchronized
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      Updated:{" "}
                      {new Date(
                        historyPaymentIn.updatedAt || Date.now(),
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
                onClick={() => setHistoryPaymentIn(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PaymentInView;
