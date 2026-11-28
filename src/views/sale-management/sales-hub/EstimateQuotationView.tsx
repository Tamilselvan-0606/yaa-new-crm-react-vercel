import { ProductStockLabel } from "../../../components/common/ProductStockLabel";
import { attachStockQty, appendZeroStockErrors } from "../../../utils/stockDisplay";
import { CommonTableHead } from "../../../components/common/CommonTableHead";
import { CustomerSearchableSelect } from "../../../components/common/paginated-select";
import { DocumentLineageBadges } from "../../../components/common/DocumentLineageBadges";
import {
  getConversionState,
  resolveConvertedTarget,
} from "../../../utils/salesDocumentWorkflow";
import { getNextEstimationNumber } from "../../../utils/documentNumbering";
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
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
  Truck,
  Phone,
} from "lucide-react";
import {
  useSalesManagementStore,
  SaleQuotation,
  SaleProductItem,
  QuotationStatus,
  SalesCustomer,
  InventoryStockItem,
} from "../../../store/useSalesManagementStore";
import { Button } from "../../../components/common/Button";
import { Modal } from "../../../components/common/Modal";
import { DeleteConfirmationModal } from "../../../components/common/DeleteConfirmationModal";
import { Pagination } from "../../../components/common/Pagination";
import { SearchBar } from "../../../components/common/SearchBar";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { fetchAllReportRows, runReport } from "../../../utils/reportData";
import { toast } from "../../../utils/toast";
import { useBillDraft } from "../../../hooks/useBillDraft";
import { DraftSyncIndicator, ResumeDraftBanner } from "../utils/BillDraftUi";
import { DRAFT_MODULES } from "../../../utils/documentDraft";
import {
  loadDraftCustomer,
  loadDraftProducts,
} from "../../../utils/documentDraftRestore";
import { useNavigate } from "react-router-dom";
import { useCompanyDocumentProfile } from "../../../hooks/useCompanyDocumentProfile";
import { exportTableToExcel } from "../../../utils/excelExport";
import {
  printTableReport,
  printBusinessDocument,
  downloadBusinessDocument,
  downloadTableReport,
  DocumentPrintOptions,
} from "../../../utils/printUtils";
import {
  SaleActionDropdown,
  ActionIconBadge,
} from "../utils/SaleActionDropdown";
import {
  DocumentSharePopover,
  formatEstimateQuotationShare,
} from "../../../utils/shareUtils";
import {
  quotationApi,
  mapApiQuotationToSaleQuotation,
  mapSaleQuotationToPayload,
  QuotationFilterParams,
  customerApi,
  mapApiCustomerToSalesCustomer,
  stockApi,
  mapApiStockToInventoryStockItem,
  productApi,
  ApiProduct,
  ApiStockBatch,
} from "../../../api";
import { isProductActive } from "../../../api/commerce/productApi";
import {
  commerceProformaApi,
  mapSaleProformaToPayload,
  SaleProformaInvoice,
} from "../../../api/commerce/proformaApi";
import {
  commerceSaleOrderApi,
  mapSaleOrderRecordToPayload,
  SaleOrderRecord,
} from "../../../api/commerce/saleOrderApi";
import {
  commerceInvoiceApi,
  mapSaleTransactionToInvoicePayload,
} from "../../../api/commerce/invoiceApi";
import {
  commerceDeliveryChallanApi,
  mapDeliveryChallanRecordToPayload,
  DeliveryChallanRecord,
  UUID_REGEX,
} from "../../../api/commerce/deliveryChallanApi";
import {
  recordDocumentConversion,
  syncConvertedProformaToStorage,
  syncConvertedOrderToStorage,
  syncConvertedInvoiceToStorage,
  syncConvertedChallanToStorage,
  syncQuotationStatusInStorage,
  initializeWorkflowIntegrity,
} from "../../../utils/salesDocumentWorkflow";
import { SaleTransaction } from "../../../store/useSalesManagementStore";
import {
  isValidIndianPhone,
  normalizeIndianPhoneTo10Digits,
  sanitizeHsnCodeInput,
} from "../../../utils/validation";
import { store } from "../../../store/store";
import { baseApi } from "../../../api/baseApi";
import {
  FormLabel,
  FORM_INPUT_CLS,
  FORM_SELECT_CLS,
  FORM_TEXTAREA_CLS,
  getFormInputCls,
  handleNonNegativeKeyDown,
} from "../utils/formUtils";
import { AddCustomerModal } from "./AddCustomerModal";
import { AddItemModal } from "../inventory/AddItemModal";
import {
  calculateLineItem,
  calculateDocumentTotals,
  determineGstType,
  parseTaxRate,
  round2,
} from "../../../utils/financialCalculations";
import {
  FieldErrors,
  checkDateNotBefore,
  checkRequiredDate,
  checkRequiredSelection,
  checkTotalConsistency,
  extractApiFieldErrors,
  fieldAttr,
  getApiErrorMessage,
  isUuid,
  useFieldErrors,
  useRevalidateAfterSubmit,
  useSubmitGuard,
  validateBatchStock,
  validateLineItems,
} from "../../../utils/formValidation";
import { useBatchStock } from "../../../hooks/useBatchStock";
import { FormError } from "../../../components/common/FormError";
import { ImageAttachmentBox } from "../utils/ImageAttachmentBox";
import { evictApiCache } from "../../../api/queryCache";
import { DateInput } from "../../../components/common/DateInput";
import { GstConfigurationBar } from "./sales-invoice/GstConfigurationBar";
import {
  SalesDocumentItemsTable,
  type SalesDocumentLineItem,
} from "./SalesDocumentItemsTable";
import { SalesDocumentSummaryPanel } from "./SalesDocumentSummaryPanel";

const PRODUCT_PICK_MSG = "Please choose the product from the list.";

/** Maps backend field paths (e.g. `items.0.quantity`) onto this form's error keys. */
const mapApiFieldsToForm = (
  apiErrors: FieldErrors,
  rowIndexes: number[],
): FieldErrors => {
  const lineField: Record<string, string> = {
    productId: "product",
    quantity: "quantity",
    unitPrice: "price",
    discountPercent: "discountPercent",
    discountAmount: "discountAmount",
    taxPercent: "taxPercent",
  };
  const topLevel: Record<string, string> = {
    customerId: "customerId",
    date: "date",
    validUntil: "validUntil",
    items: "items",
  };
  const out: FieldErrors = {};
  Object.entries(apiErrors).forEach(([path, message]) => {
    const m = path.match(/^items\.(\d+)\.(\w+)$/);
    if (m) {
      const row = rowIndexes[Number(m[1])] ?? Number(m[1]);
      const f = lineField[m[2]];
      if (f === "quantity" && /stock|insufficient|available/i.test(message)) {
        out[`items.${row}.quantity`] =
          "Not enough stock is available in this batch. Please reduce the quantity.";
      } else if (f) out[`items.${row}.${f}`] = message;
      else out.items = message;
    } else if (topLevel[path]) out[topLevel[path]] = message;
  });
  return out;
};

/**
 * Pure validation for the estimate form. Returns an error map (empty = valid).
 * Line keys are `items.{index}.{field}`. Estimate lines may be custom (name only, no product id).
 */
const validateEstimateForm = (
  form: {
    partyName: string;
    customerId?: string | null;
    date: string;
    validUntil?: string;
    withGst?: boolean;
    gstType?: "intra_state" | "inter_state";
    items: ExtendedEstimateItem[];
  },
  ctx: {
    isInclusive: boolean;
    finalAmount: number;
    roundOff: number;
    knownProductName: (id: string) => string | undefined;
  },
): FieldErrors => {
  const errors: FieldErrors = {};
  if (!form.partyName?.trim() && !form.customerId) {
    errors.customerId = checkRequiredSelection("", "customer") as string;
  }
  const dateErr = checkRequiredDate(form.date, "estimate date");
  if (dateErr) errors.date = dateErr;
  else {
    const e = checkDateNotBefore(
      form.validUntil,
      form.date,
      "valid-until date",
      "estimate date",
    );
    if (e) errors.validUntil = e;
  }

  const isReal = (i: ExtendedEstimateItem) =>
    !!i.productName?.trim() || Number(i.unitPrice) > 0;
  const realRows = form.items.filter(isReal);
  if (realRows.length === 0) {
    errors.items = "Please add at least one item before saving.";
    return errors;
  }
  const lines = form.items.map((it) =>
    isReal(it)
      ? {
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPercent: it.discountPercent,
          discountAmount: it.discountAmount,
          taxPercent: it.taxPercent,
        }
      : {},
  );
  Object.assign(
    errors,
    validateLineItems(lines, {
      requireProduct: true,
      allowZeroPrice: true,
      priceKey: "unitPrice",
    }),
  );
  form.items.forEach((it, i) => {
    if (!isReal(it) || errors[`items.${i}.product`]) return;
    if (!it.productName?.trim()) {
      errors[`items.${i}.product`] = checkRequiredSelection(
        "",
        "product",
      ) as string;
      return;
    }
    // Text edited after picking a product: the old id would point at a different product.
    if (it.productId && isUuid(it.productId)) {
      const known = ctx.knownProductName(it.productId);
      if (
        known &&
        known.trim().toLowerCase() !== it.productName.trim().toLowerCase()
      ) {
        errors[`items.${i}.product`] = PRODUCT_PICK_MSG;
      }
    }
  });

  if (Object.keys(errors).length === 0) {
    const expected = round2(
      realRows.reduce((sum, it) => {
        const useAmt =
          it.discountType === "amount" ||
          (Number(it.discountAmount) > 0 && Number(it.discountPercent) === 0);
        return (
          sum +
          calculateLineItem(
            {
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              discountPercent: useAmt ? 0 : it.discountPercent,
              discountAmount: useAmt ? it.discountAmount : 0,
              taxPercent: it.taxPercent,
              isTaxInclusive: ctx.isInclusive,
            },
            { withGst: form.withGst !== false, gstType: form.gstType },
          ).lineTotal
        );
      }, 0),
    );
    const totalErr = checkTotalConsistency(
      expected,
      round2(ctx.finalAmount - ctx.roundOff),
      "estimate total",
      0.01 * realRows.length + 0.05,
    );
    if (totalErr) errors.total = totalErr;
  }
  return errors;
};

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

// Formats an ISO timestamp or date into { date: 'DD/MM/YYYY', time: 'HH:MM AM/PM', full: string }
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

  const date = `${dd}/${mm}/${yyyy}`;
  const time = `${hh}:${minutes} ${ampm}`;
  return { date, time, full: `${date} ${time}` };
};

// Helper to extract 2-letter uppercase initials matching screenshot UI
const getInitials = (name?: string, fallback = "CU") => {
  if (!name || !name.trim()) return fallback;
  const clean = name.trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase();
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

const TAX_RATE_OPTIONS = [
  { label: "Select Tax", rate: 0 },
  { label: "Exempted (0%)", rate: 0 },
  { label: "GST @ 0%", rate: 0 },
  { label: "GST @ 0.25%", rate: 0.25 },
  { label: "GST @ 3%", rate: 3 },
  { label: "GST @ 5%", rate: 5 },
  { label: "GST @ 18%", rate: 18 },
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

export interface ExtendedEstimateItem extends SaleProductItem {
  unit?: string;
  discountAmount?: number;
  taxAmount?: number;
  category?: string;
  itemCode?: string;
  hsnCode?: string;
  description?: string;
  isCustomBatch?: boolean;
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
    estimateManualNo: string;
    referenceNo: string;
    date: string;
    validUntil: string;
    stateOfSupply: string;
    withGst: boolean;
    gstType: "intra_state" | "inter_state";
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
  const companyProfile = useCompanyDocumentProfile();
  const navigate = useNavigate();
  const {
    quotations,
    saveQuotation,
    setQuotationsList,
    deleteQuotation,
    updateQuotationStatus,
    convertQuotationToSale,
    saveSale,
    saveCustomer,
  } = useSalesManagementStore();
  // Customers shown in the UI come only from the Commerce customers API
  const [customers, setCustomers] = useState<SalesCustomer[]>([]);

  useEffect(() => {
    initializeWorkflowIntegrity();
  }, []);

  // View Mode: 'list' (table) vs 'form' (create/edit screen as in reference image)
  const [viewMode, setViewMode] = useState<"list" | "form">("list");

  // Search & Filter states (for list view)
  const [pendingSearch, setPendingSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pendingPeriod, setPendingPeriod] = useState("all");
  const [appliedPeriod, setAppliedPeriod] = useState("all");
  const [pendingStatus, setPendingStatus] = useState("ALL");
  const [appliedStatus, setAppliedStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Live Commerce API State
  const [liveQuotations, setLiveQuotations] = useState<SaleQuotation[]>([]);
  const [liveStocks, setLiveStocks] = useState<InventoryStockItem[]>([]);
  const [liveProducts, setLiveProducts] = useState<ApiProduct[]>([]);
  const [liveBatches, setLiveBatches] = useState<ApiStockBatch[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [apiSummary, setApiSummary] = useState<NonNullable<
    Awaited<ReturnType<typeof quotationApi.getQuotations>>["summary"]
  > | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fe = useFieldErrors();
  const { runOnce } = useSubmitGuard();
  const [isConverting, setIsConverting] = useState(false);

  // Convert Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertTargetQuotation, setConvertTargetQuotation] =
    useState<SaleQuotation | null>(null);
  const [convertType, setConvertType] = useState<
    "Invoice" | "Order" | "Proforma" | "Challan"
  >("Invoice");
  const [convertDueDate, setConvertDueDate] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
  );

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetQuotation, setDeleteTargetQuotation] = useState<{
    id: string;
    quotationNo: string;
  } | null>(null);
  const [isDeletingQuotation, setIsDeletingQuotation] = useState(false);
  const [deleteQuotationError, setDeleteQuotationError] = useState<
    string | null
  >(null);

  // Table Row Dropdowns
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

  // Preview Modal
  const [previewQuotation, setPreviewQuotation] =
    useState<SaleQuotation | null>(null);

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

  // Header tool popovers
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState("");
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [showShareFooterMenu, setShowShareFooterMenu] = useState(false);

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

  // Valid Upto Days (15 - 120 Days)
  const [validUptoDays, setValidUptoDays] = useState<string>("30");

  // Form State
  const [editingQuotation, setEditingQuotation] =
    useState<SaleQuotation | null>(null);
  const [partySearchOpen, setPartySearchOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const partySelectRef = useRef<HTMLDivElement>(null);

  // Computed next preview number based on currently loaded estimations in the table
  const computedPreviewNo = useMemo(() => {
    const allKnown = liveQuotations.length > 0 ? liveQuotations : quotations;
    return getNextEstimationNumber(allKnown);
  }, [liveQuotations, quotations]);

  // Sync preview number to newly opened initial form tab if empty
  useEffect(() => {
    if (!editingQuotation && computedPreviewNo) {
      setFormData((prev) => {
        if (!prev.quotationNo) {
          return {
            ...prev,
            quotationNo: computedPreviewNo,
          };
        }
        return prev;
      });
      setTabs((prevTabs) =>
        prevTabs.map((t) => {
          if (!t.editingQuotation && !t.formData.quotationNo) {
            return {
              ...t,
              formData: {
                ...t.formData,
                quotationNo: computedPreviewNo,
              },
            };
          }
          return t;
        }),
      );
    }
  }, [computedPreviewNo, editingQuotation]);

  // Initial Form Data (No mock content, no default reference number)
  const [formData, setFormData] = useState({
    customerId: "",
    partyName: "",
    customerPhone: "",
    customerEmail: "",
    customerCompany: "",
    billingAddress: "",
    quotationNo: "",
    estimateManualNo: "",
    referenceNo: "",
    date: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .split("T")[0],
    stateOfSupply: "33-Tamil Nadu",
    withGst: true,
    gstType: "intra_state" as "intra_state" | "inter_state",
    items: [
      {
        id: `row_${Date.now()}_1`,
        productId: "",
        productName: "",
        quantity: 0,
        unit: "NONE",
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        total: 0,
      },
    ] as ExtendedEstimateItem[],
    notes: "",
    terms: "",
  });

  // Multi-tab support for estimates
  const [activeTabId, setActiveTabId] = useState("tab_1");
  const [tabs, setTabs] = useState<EstimateTabItem[]>([
    {
      id: "tab_1",
      title: "Estimate #1",
      num: 1,
      formData: {
        customerId: "",
        partyName: "",
        customerPhone: "",
        customerEmail: "",
        customerCompany: "",
        billingAddress: "",
        quotationNo: "",
        estimateManualNo: "",
        referenceNo: "",
        date: new Date().toISOString().split("T")[0],
        validUntil: new Date(Date.now() + 30 * 86400000)
          .toISOString()
          .split("T")[0],
        stateOfSupply: "33-Tamil Nadu",
        withGst: true,
        gstType: "intra_state",
        items: [
          {
            id: `row_${Date.now()}_1`,
            productId: "",
            productName: "",
            quantity: 0,
            unit: "NONE",
            unitPrice: 0,
            discountPercent: 0,
            discountAmount: 0,
            taxPercent: 0,
            taxAmount: 0,
            total: 0,
          },
        ] as ExtendedEstimateItem[],
        notes: "",
        terms: "",
      },
    },
  ]);

  // Close outside dropdown listeners
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".quotation-action-dropdown-container") &&
        !target.closest(".quotation-action-dropdown-menu")
      ) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (
        !target.closest(".quotation-convert-dropdown-container") &&
        !target.closest(".quotation-convert-dropdown-menu")
      ) {
        setActiveConvertDropdownId(null);
        setConvertDropdownPos(null);
      }
      if (partySelectRef.current && !partySelectRef.current.contains(target)) {
        setPartySearchOpen(false);
      }
      if (!target.closest(".estimate-share-footer-container")) {
        setShowShareFooterMenu(false);
      }
      if (!target.closest(".estimate-calc-container")) {
        setShowCalculator(false);
      }
      if (!target.closest(".estimate-settings-container")) {
        setShowSettingsPopover(false);
      }
      if (
        !target.closest(".table-column-customize-popover") &&
        !target.closest(".table-column-customize-btn")
      ) {
        setShowColumnCustomizePopover(false);
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

  // Fetch Quotations from Live Commerce API
  const fetchRequestIdRef = useRef(0);
  const fetchQuotations = useCallback(
    async (
      pageNo: number = page,
      size: number = pageSize,
      searchQuery: string = appliedSearch,
      statusVal: string = appliedStatus,
      periodVal: string = appliedPeriod,
    ) => {
      const currentRequestId = ++fetchRequestIdRef.current;
      setIsApiLoading(true);
      setApiErrorMessage(null);

      const params: QuotationFilterParams = {
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
      if (periodVal && periodVal !== "all") {
        params.period = periodVal;
      }

      try {
        const response = await quotationApi.getQuotations(params);
        if (currentRequestId !== fetchRequestIdRef.current) return;

        if (response && (response.success || response.data)) {
          const list = Array.isArray(response.data) ? response.data : [];
          const mapped = list.map(mapApiQuotationToSaleQuotation);
          setLiveQuotations(mapped);
          setApiSummary(response.summary ?? null);
          setTotalApiRecords(
            response.pagination?.totalRecords ?? mapped.length,
          );
          setTotalApiPages(response.pagination?.totalPages ?? 1);
          setIsApiConnected(true);
        } else {
          throw new Error(response?.message || "Failed to fetch quotations");
        }
      } catch (err: any) {
        if (currentRequestId !== fetchRequestIdRef.current) return;
        console.warn("Commerce Quotations API notice:", err);
        setIsApiConnected(false);
        setApiErrorMessage(err.message || "Commerce API not reachable");
        setLiveQuotations([]);
        setTotalApiRecords(0);
        setTotalApiPages(1);
      } finally {
        if (currentRequestId === fetchRequestIdRef.current) {
          setIsApiLoading(false);
        }
      }
    },
    [appliedSearch, appliedStatus, appliedPeriod, page, pageSize],
  );

  // Trigger API fetch on filter/page change
  useEffect(() => {
    fetchQuotations(
      page,
      pageSize,
      appliedSearch,
      appliedStatus,
      appliedPeriod,
    );
  }, [
    fetchQuotations,
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
        detail?.path === "/sale-management/sales/quotation" ||
        detail?.path === "/sale-management/sales/estimate" ||
        detail?.id === "sales-hub-quotation" ||
        detail?.id === "billing-quotes"
      ) {
        fetchQuotations(
          page,
          pageSize,
          appliedSearch,
          appliedStatus,
          appliedPeriod,
        );
      }
    };
    const handleQuotationsUpdated = () => {
      fetchQuotations(
        page,
        pageSize,
        appliedSearch,
        appliedStatus,
        appliedPeriod,
      );
    };
    window.addEventListener("crm:sidebar-navigate", handleSidebarNav);
    window.addEventListener(
      "yaa_crm_quotations_updated",
      handleQuotationsUpdated,
    );
    return () => {
      window.removeEventListener("crm:sidebar-navigate", handleSidebarNav);
      window.removeEventListener(
        "yaa_crm_quotations_updated",
        handleQuotationsUpdated,
      );
    };
  }, [
    fetchQuotations,
    page,
    pageSize,
    appliedSearch,
    appliedStatus,
    appliedPeriod,
  ]);

  // Live Products loading state & fetch function
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const isFetchingProductsRef = useRef(false);

  const fetchLiveProducts = useCallback(async (searchQuery?: string) => {
    if (isFetchingProductsRef.current) return;
    isFetchingProductsRef.current = true;
    setIsLoadingProducts(true);
    try {
      let prods: ApiProduct[] = [];

      // 1. First attempt: pagination_required: false, page_size: 100
      try {
        const res = await productApi.getProducts({
          activeOnly: true,
          search: searchQuery?.trim() || undefined,
          page_size: 100,
          pagination_required: false,
        });
        const raw = Array.isArray(res?.data)
          ? res.data
          : Array.isArray((res?.data as any)?.items)
            ? (res.data as any).items
            : Array.isArray((res as any)?.items)
              ? (res as any).items
              : [];
        if (raw.length > 0) {
          prods = raw;
        }
      } catch (err) {
        console.warn(
          "Product load pagination_required:false error, falling back:",
          err,
        );
      }

      // 2. Second attempt if empty: pagination_required: true, page_no: 1, page_size: 100
      if (prods.length === 0) {
        try {
          const res2 = await productApi.getProducts({
            activeOnly: true,
            page_no: 1,
            page_size: 100,
            pagination_required: true,
            search: searchQuery?.trim() || undefined,
            sortOrder: "desc",
          });
          const raw2 = Array.isArray(res2?.data)
            ? res2.data
            : Array.isArray((res2?.data as any)?.items)
              ? (res2.data as any).items
              : [];
          if (raw2.length > 0) {
            prods = raw2;
          }
        } catch (err2) {
          console.warn("Product load pagination_required:true error:", err2);
        }
      }

      const activeProds = prods.filter(isProductActive);
      if (!searchQuery?.trim()) {
        setLiveProducts(activeProds);
      } else if (activeProds.length > 0) {
        setLiveProducts((prev) => {
          const map = new Map<string, ApiProduct>();
          prev.filter(isProductActive).forEach((p) => map.set(p.id, p));
          activeProds.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn("Error fetching products in EstimateQuotationView:", err);
    } finally {
      setIsLoadingProducts(false);
      isFetchingProductsRef.current = false;
    }
  }, []);

  // Debounced product search ref
  const productSearchTimerRef = useRef<any>(null);

  // Load live customers, products, and stocks when form mode is open
  const hasLoadedMasterDataRef = useRef(false);
  useEffect(() => {
    if (viewMode !== "form") return;

    if (!hasLoadedMasterDataRef.current || liveProducts.length === 0) {
      fetchLiveProducts();
    }

    if (hasLoadedMasterDataRef.current) return;
    hasLoadedMasterDataRef.current = true;
    let isMounted = true;

    customerApi
      .getCustomers({ pagination_required: false, page_size: 100 })
      .then((res) => {
        if (isMounted && res.data && Array.isArray(res.data)) {
          const mapped = res.data.map(mapApiCustomerToSalesCustomer);
          setCustomers(mapped);
        }
      })
      .catch((err) => console.warn("Customer load error:", err));

    return () => {
      isMounted = false;
    };
  }, [viewMode, liveProducts.length, fetchLiveProducts]);

  // Stocks and batches are live (never cached) and only needed by the item rows, so they are NOT loaded when the form
  // opens. They load on the first product dropdown open, or once the form holds a line item (edit / convert / duplicate).
  const stockDataLoadedRef = useRef(false);
  const batchDataLoadedRef = useRef(false);
  const ensureStocks = useCallback(() => {
    if (stockDataLoadedRef.current) return;
    stockDataLoadedRef.current = true;
    stockApi
      .getStocks({ pagination_required: false, page_size: 100 })
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setLiveStocks(res.data.map(mapApiStockToInventoryStockItem));
        }
      })
      .catch((err) => {
        stockDataLoadedRef.current = false;
        console.warn("Stock load error:", err);
      });
  }, []);
  const ensureBatches = useCallback(() => {
    if (batchDataLoadedRef.current) return;
    batchDataLoadedRef.current = true;
    stockApi
      .getStockBatches({ pagination_required: false, page_size: 100 })
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setLiveBatches(res.data);
        }
      })
      .catch((err) => {
        batchDataLoadedRef.current = false;
        console.warn("Stock batches load error:", err);
      });
  }, []);

  // Existing document opened with line items: its quantities / batches must display, so load stock data now.
  const formHasLineItems = (formData.items || []).some(
    (it: any) => it && (it.productId || it.productName),
  );
  useEffect(() => {
    if (viewMode !== "form" || !formHasLineItems) return;
    ensureStocks();
    ensureBatches();
  }, [viewMode, formHasLineItems, ensureStocks, ensureBatches]);

  // Clean products list: live products from Commerce API + inventory stocks + stock batches
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
      status?: string;
    }> = [];

    const seenIds = new Set<string>();

    const extractTaxPercent = (rateStr?: string | number): number => {
      if (typeof rateStr === "number") return rateStr;
      if (!rateStr) return 0;
      const numMatch = String(rateStr).match(/(\d+(\.\d+)?)/);
      return numMatch ? parseFloat(numMatch[1]) : 0;
    };

    const sourceStocks = liveStocks;

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
        if (
          !batchNo ||
          /^(null|undefined)$/i.test(batchNo) ||
          seenBatchNos.has(batchNo.toLowerCase())
        )
          return;
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

      // 1. From liveBatches (/commerce/stocks/batches)
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

      // 2. From rawStockBatches (passed from product.stockBatches or s.batches)
      if (Array.isArray(rawStockBatches) && rawStockBatches.length > 0) {
        rawStockBatches.forEach(addBatch);
      }

      // 3. From sourceStocks (liveStocks or stocks)
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

      // 4. Default fallback batch so every selected product has batch options
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
      if (!isProductActive(p)) return;
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
          category:
            (typeof p.category === "string"
              ? p.category
              : (p.category as any)?.name) || "",
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
          status: p.status || "Active",
        });
      }
    });

    return attachStockQty(list, sourceStocks).filter((s) => {
      const pid = String(s.productId || s.id || "");
      const name = String(s.productName || "").toLowerCase();
      if (pid.startsWith("PROD_10") || pid.startsWith("stk_")) return false;
      if (
        name.includes("aashirvaad") ||
        name.includes("india gate") ||
        name.includes("fortune sunlite") ||
        name.includes("tata salt") ||
        name.includes("toor dal") ||
        name.includes("amul pure cow ghee")
      ) {
        return false;
      }
      return true;
    });
  }, [liveProducts, liveStocks, liveBatches]);

  // Filter products for the active row dropdown
  // The quantity shown in each product row is read live: refresh the stock whenever a product dropdown opens, so it
  // reflects what the last saved document changed (the stock endpoint is never cached).
  useEffect(() => {
    if (openProductDropdownRow === null || openProductDropdownRow === undefined)
      return;
    stockDataLoadedRef.current = true; // this open fetches fresh stock itself
    ensureBatches();
    let cancelled = false;
    stockApi
      .getStocks({ pagination_required: false, page_size: 100 })
      .then((res) => {
        if (cancelled) return;
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setLiveStocks(res.data.map(mapApiStockToInventoryStockItem));
        }
      })
      .catch(() => {
        /* keep the quantities already shown */
      });
    return () => {
      cancelled = true;
    };
  }, [openProductDropdownRow, ensureBatches]);

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
        !target.closest(".estimate-product-cell") &&
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

  // Displayed quotations: Instant filtering for search, status, and period across live or local data
  const applyQuotationFilters = useCallback(
    (enrichedList: SaleQuotation[]) =>
      enrichedList.filter((item) => {
        const q = appliedSearch.toLowerCase().trim();
        const matchesSearch =
          q === "" ||
          item.partyName.toLowerCase().includes(q) ||
          (item.referenceNo &&
            String(item.referenceNo).toLowerCase().includes(q)) ||
          item.quotationNo.toLowerCase().includes(q) ||
          (item.estimateManualNo || "").toLowerCase().includes(q) ||
          (item.customerPhone && item.customerPhone.includes(q)) ||
          (item.customerCompany &&
            item.customerCompany.toLowerCase().includes(q)) ||
          (item.items &&
            item.items.some((it) => it.productName.toLowerCase().includes(q)));

        const matchesStatus =
          appliedStatus === "ALL" ||
          item.status?.toLowerCase() === appliedStatus.toLowerCase();

        const matchesPeriod = checkDateMatchesPeriod(item.date, appliedPeriod);

        return matchesSearch && matchesStatus && matchesPeriod;
      }),
    [appliedSearch, appliedStatus, appliedPeriod],
  );
  const displayQuotations = useMemo(
    () => applyQuotationFilters(liveQuotations),
    [liveQuotations, applyQuotationFilters],
  );

  // Report pages: same list API + applied filters as fetchQuotations, any page.
  const fetchQuotationsReportPage = async (pageNo: number, size: number) => {
    const params: QuotationFilterParams = {
      page_no: pageNo,
      page_size: size,
      pagination_required: true,
      sortOrder: "desc",
    };
    if (appliedSearch.trim()) params.search = appliedSearch.trim();
    if (appliedStatus && appliedStatus !== "ALL") params.status = appliedStatus;
    if (appliedPeriod && appliedPeriod !== "all") params.period = appliedPeriod;
    const response = await quotationApi.getQuotations(params);
    const list = Array.isArray(response?.data) ? response.data : [];
    return {
      items: list.map(mapApiQuotationToSaleQuotation),
      totalRecords: response?.pagination?.totalRecords,
      totalPages: response?.pagination?.totalPages,
      hasNextPage: response?.pagination?.hasNextPage,
    };
  };

  // Summary Metrics (List view)
  const metrics = useMemo(() => {
    const list = displayQuotations;
    const totalAmount = list.reduce(
      (sum, q) => sum + (Number(q.amount) || 0),
      0,
    );
    const convertedAmount = list
      .filter((q) => q.status === "Converted")
      .reduce((sum, q) => sum + (Number(q.amount) || 0), 0);
    const openAmount = list
      .filter((q) => q.status === "Open")
      .reduce((sum, q) => sum + (Number(q.amount) || 0), 0);
    const openCount = list.filter((q) => q.status === "Open").length;
    const convertedCount = list.filter((q) => q.status === "Converted").length;

    return {
      totalAmount,
      convertedAmount,
      openAmount,
      openCount,
      convertedCount,
      totalCount:
        isApiConnected && totalApiRecords !== null
          ? totalApiRecords
          : displayQuotations.length,
    };
  }, [displayQuotations, isApiConnected, totalApiRecords]);

  // KPI card metrics: prefer API summary, fall back to in-browser computation
  const cardMetrics = apiSummary ?? metrics;

  // Pagination calculation
  const totalPages =
    isApiConnected && totalApiPages !== null
      ? Math.max(1, totalApiPages)
      : Math.max(1, Math.ceil(displayQuotations.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedQuotations = useMemo(() => {
    if (displayQuotations.length > pageSize) {
      const start = (safePage - 1) * pageSize;
      return displayQuotations.slice(start, start + pageSize);
    }
    return displayQuotations;
  }, [displayQuotations, safePage, pageSize]);

  // Helper to build fresh estimate formData (NO MOCK DATA)
  const createDefaultFormData = (defaultNo: string = "") => {
    const initialRows: ExtendedEstimateItem[] = [
      {
        id: `row_${Date.now()}_1`,
        productId: "",
        productName: "",
        quantity: 0,
        unit: "NONE",
        unitPrice: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        total: 0,
      },
    ];

    return {
      customerId: "",
      partyName: "",
      customerPhone: "",
      customerEmail: "",
      customerCompany: "",
      billingAddress: "",
      quotationNo: defaultNo,
      estimateManualNo: "",
      referenceNo: "",
      date: new Date().toISOString().split("T")[0],
      validUntil: new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .split("T")[0],
      stateOfSupply: "33-Tamil Nadu",
      withGst: true,
      gstType: "intra_state" as "intra_state" | "inter_state",
      items: initialRows,
      notes: "",
      terms: "",
    };
  };

  // Document draft: the products added to a NEW estimate are saved on the server as a draft while the user types
  // (one draft per tab), restored on refresh, and marked COMPLETE once the estimate itself is saved.
  const billDraft = useBillDraft({
    module: "quotation",
    enabled: viewMode === "form" && !editingQuotation,
    contextKey: activeTabId,
    partyId: formData.customerId,
    lines: formData.items,
  });
  const [isResumingDraft, setIsResumingDraft] = useState(false);

  const handleResumeDraft = async () => {
    setIsResumingDraft(true);
    try {
      const restored = await billDraft.resume();
      if (!restored) return;
      const [productMap, customer] = await Promise.all([
        loadDraftProducts(restored.lines.map((l) => l.productId)),
        loadDraftCustomer(restored.draft.customer_id),
      ]);
      const isInclusive = priceTaxMode === "With Tax";
      const rows = restored.lines.map((l, i) => {
        const prod = productMap.get(l.productId);
        const lineRes = calculateLineItem(
          {
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPercent: l.discountPercent,
            taxPercent: l.taxPercent,
            isTaxInclusive: isInclusive,
          },
          { withGst: formData.withGst, gstType: formData.gstType },
        );
        return {
          id: `row_${Date.now()}_${i}`,
          productId: l.productId,
          productName: prod?.productName || "Product",
          sku: prod?.productCode || "",
          itemCode: prod?.productCode || "",
          category: prod?.category || "",
          hsnCode: prod?.hsnCode || "",
          batch: l.batch,
          quantity: l.quantity,
          unit: prod?.unit && prod.unit !== "NONE" ? prod.unit : "PCS",
          unitPrice: l.unitPrice,
          discountPercent: l.discountPercent,
          discountAmount: lineRes.discountAmount,
          taxPercent: l.taxPercent,
          taxAmount: lineRes.taxAmount,
          total: lineRes.lineTotal,
        } as ExtendedEstimateItem;
      });
      setFormData((prev) => ({
        ...prev,
        ...(customer
          ? {
              customerId: customer.id,
              partyName: customer.name || "",
              customerPhone: customer.phone || "",
              customerEmail: customer.email || "",
              customerCompany: customer.company || "",
              billingAddress: customer.billingAddress || customer.address || "",
            }
          : {}),
        items: rows.length > 0 ? rows : prev.items,
      }));
      toast.success(
        `Draft restored with ${rows.length} item${rows.length === 1 ? "" : "s"}.`,
      );
    } finally {
      setIsResumingDraft(false);
    }
  };

  // Form Initializer (Opens Estimate #...)
  const handleOpenCreateForm = () => {
    const nextPreviewNo = computedPreviewNo;
    const initialData = createDefaultFormData(nextPreviewNo);
    setValidUptoDays("30");
    const firstTab: EstimateTabItem = {
      id: "tab_1",
      title: "New Estimate",
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
    setActiveTabId("tab_1");
    setFormData(initialData);
    setEditingQuotation(null);
    setEnableRoundOff(true);
    setManualRoundOff(null);
    setViewMode("form");
  };

  // Add New Estimate Tab (clicks + button in tab bar)
  const handleAddNewTab = () => {
    const nextPreviewNo = computedPreviewNo;
    const newTabId = `tab_${Date.now()}`;
    const newFormData = createDefaultFormData(nextPreviewNo);
    const newTab: EstimateTabItem = {
      id: newTabId,
      title: `New Estimate ${tabs.length + 1}`,
      num: tabs.length + 1,
      formData: newFormData,
      editingQuotation: null,
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
              editingQuotation,
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
    setEditingQuotation(null);
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
              editingQuotation,
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
      setEditingQuotation(target.editingQuotation || null);
      if (target.enableRoundOff !== undefined)
        setEnableRoundOff(target.enableRoundOff);
      if (target.manualRoundOff !== undefined)
        setManualRoundOff(target.manualRoundOff);
      if (target.columnSettings !== undefined)
        setColumnSettings(target.columnSettings);
    }
  };

  // Close Tab
  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if (tabs.length <= 1) {
      setViewMode("list");
      return;
    }
    const remainingTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(remainingTabs);
    if (activeTabId === tabId) {
      const nextActive = remainingTabs[remainingTabs.length - 1];
      setActiveTabId(nextActive.id);
      setFormData(nextActive.formData);
      setEditingQuotation(nextActive.editingQuotation || null);
      if (nextActive.enableRoundOff !== undefined)
        setEnableRoundOff(nextActive.enableRoundOff);
      if (nextActive.manualRoundOff !== undefined)
        setManualRoundOff(nextActive.manualRoundOff);
      if (nextActive.columnSettings !== undefined)
        setColumnSettings(nextActive.columnSettings);
    }
  };

  const handleOpenEditForm = async (quot: SaleQuotation) => {
    let targetQuot = quot;
    try {
      const res = await quotationApi.getQuotationById(quot.id);
      if (res && res.data) {
        const mapped = mapApiQuotationToSaleQuotation(res.data);
        targetQuot = {
          ...mapped,
          estimateManualNo:
            mapped.estimateManualNo || quot.estimateManualNo || "",
        };
      }
    } catch (err) {
      console.warn("Could not fetch fresh single quotation from API:", err);
    }
    setEditingQuotation(targetQuot);
    const editWithGst = targetQuot.withGst !== false;
    const editGstType: "intra_state" | "inter_state" =
      targetQuot.gstType === "inter_state"
        ? "inter_state"
        : targetQuot.gstType === "intra_state"
          ? "intra_state"
          : determineGstType(targetQuot.stateOfSupply);
    const mappedItems: ExtendedEstimateItem[] = targetQuot.items.map((it) => {
      const useAmt =
        Number((it as any).discountAmount) > 0 &&
        Number(it.discountPercent) === 0;
      const lineRes = calculateLineItem(
        {
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          discountPercent: useAmt ? 0 : Number(it.discountPercent) || 0,
          discountAmount: useAmt ? Number((it as any).discountAmount) : 0,
          taxPercent: Number(it.taxPercent) || 0,
          isTaxInclusive: priceTaxMode === "With Tax",
        },
        { withGst: editWithGst, gstType: editGstType },
      );
      return {
        ...it,
        unit: (it as any).unit || "PCS",
        discountType: useAmt ? "amount" : "percent",
        discountAmount: useAmt ? lineRes.discountAmount : 0,
        taxAmount: lineRes.taxAmount,
        total: lineRes.lineTotal,
      };
    });

    const editData = {
      customerId: targetQuot.customerId || "",
      partyName: targetQuot.partyName || "",
      customerPhone: targetQuot.customerPhone || "",
      customerEmail: targetQuot.customerEmail || "",
      customerCompany: targetQuot.customerCompany || "",
      billingAddress: targetQuot.billingAddress || "",
      quotationNo: targetQuot.quotationNo || "",
      estimateManualNo: targetQuot.estimateManualNo || "",
      referenceNo: targetQuot.referenceNo || "",
      date: targetQuot.date || "",
      validUntil: targetQuot.validUntil || "",
      stateOfSupply: targetQuot.stateOfSupply || "",
      withGst: editWithGst,
      gstType: editGstType,
      items:
        mappedItems.length > 0
          ? mappedItems
          : [
              {
                id: `row_${Date.now()}`,
                productId: "",
                productName: "",
                quantity: 0,
                unit: "NONE",
                unitPrice: 0,
                discountPercent: 0,
                discountAmount: 0,
                taxPercent: 0,
                taxAmount: 0,
                total: 0,
              },
            ],
      notes: targetQuot.notes || "",
      terms: targetQuot.terms || "",
    };

    if (targetQuot.date && targetQuot.validUntil) {
      const diffDays = Math.round(
        (new Date(targetQuot.validUntil).getTime() -
          new Date(targetQuot.date).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if ([15, 30, 45, 60, 75, 90, 105, 120].includes(diffDays)) {
        setValidUptoDays(String(diffDays));
      } else if (diffDays > 0) {
        setValidUptoDays(String(diffDays));
      }
    }

    setFormData(editData);
    setTabs([
      {
        id: "tab_1",
        title: targetQuot.quotationNo
          ? `Estimate ${targetQuot.quotationNo}`
          : "Edit Estimate",
        num: 1,
        formData: editData,
        editingQuotation: targetQuot,
        enableRoundOff: true,
        manualRoundOff: null,
        columnSettings: { ...columnSettings },
      },
    ]);
    setActiveTabId("tab_1");
    setViewMode("form");
  };

  // Handler when a product is selected from dropdown popover or after creation
  const handleSelectProduct = (index: number, prod: any) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      const prevProductId = item.productId || "";
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
      // GST is applied only when the user picks a GST rate for the line. A product's own tax rate is NOT copied onto an estimate line.
      if (prod.hsnCode) {
        item.hsnCode = prod.hsnCode;
      }
      if (item.productId !== prevProductId) {
        // New product: the old batch belongs to another product.
        item.batch = "";
        item.isCustomBatch = false;
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
      const useAmt =
        item.discountType === "amount" ||
        (Number(item.discountAmount) > 0 && Number(item.discountPercent) === 0);
      const lineRes = calculateLineItem(
        {
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          discountPercent: useAmt ? 0 : Number(item.discountPercent) || 0,
          discountAmount: useAmt ? Number(item.discountAmount) || 0 : 0,
          taxPercent: item.taxPercent || 0,
          isTaxInclusive: isInclusive,
        },
        { withGst: prev.withGst, gstType: prev.gstType },
      );
      item.taxAmount = lineRes.taxAmount;
      item.total = lineRes.lineTotal;

      newItems[index] = item;
      return { ...prev, items: newItems };
    });
    setOpenProductDropdownRow(null);
  };

  const handleToggleWithGst = (enableGst: boolean) => {
    setFormData((prev) => {
      const isInclusive = priceTaxMode === "With Tax";
      const updatedItems = prev.items.map((it) => {
        const useAmt =
          it.discountType === "amount" ||
          (Number(it.discountAmount) > 0 && Number(it.discountPercent) === 0);
        const lineRes = calculateLineItem(
          {
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountPercent: useAmt ? 0 : it.discountPercent,
            discountAmount: useAmt ? it.discountAmount : 0,
            taxPercent: it.taxPercent,
            isTaxInclusive: isInclusive,
          },
          { withGst: enableGst, gstType: prev.gstType },
        );
        return {
          ...it,
          taxAmount: lineRes.taxAmount,
          total: lineRes.lineTotal,
        };
      });
      return { ...prev, withGst: enableGst, items: updatedItems };
    });
  };

  const handleSetGstType = (type: "intra_state" | "inter_state") => {
    setFormData((prev) => ({ ...prev, gstType: type }));
  };

  const handleClearProductRow = (index: number) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        productId: "",
        productName: "",
        sku: "",
        itemCode: "",
        batch: "",
        unitPrice: 0,
        taxPercent: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount: 0,
        total: 0,
      };
      return { ...prev, items: newItems };
    });
  };

  // Row operations
  const handleAddRow = () => {
    const newRow: ExtendedEstimateItem = {
      id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: "",
      productName: "",
      quantity: 0,
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
      toast.error("Estimate must have at least one line item row.");
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
    field: keyof ExtendedEstimateItem,
    value: any,
  ) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };
      const prevProductId = newItems[index].productId || "";
      const resetBatchOnProductChange = () => {
        if ((item.productId || "") !== prevProductId) {
          item.batch = "";
          item.isCustomBatch = false;
        }
      };

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
          // GST is applied only when the user picks a GST rate for the line. A product's own tax rate is NOT copied onto an estimate line.
          if ((prod as any).hsnCode) {
            item.hsnCode = (prod as any).hsnCode;
          }
          resetBatchOnProductChange();
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
          // GST is applied only when the user picks a GST rate for the line. A product's own tax rate is NOT copied onto an estimate line.
          if ((matched as any).hsnCode) {
            item.hsnCode = (matched as any).hsnCode;
          }
          resetBatchOnProductChange();
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
          // GST is applied only when the user picks a GST rate for the line. A product's own tax rate is NOT copied onto an estimate line.
          if ((matched as any).hsnCode) {
            item.hsnCode = (matched as any).hsnCode;
          }
          resetBatchOnProductChange();
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
      let rawDiscPct = Number(item.discountPercent) || 0;
      let rawDiscAmt = Number(item.discountAmount) || 0;
      if (field === "discountPercent") {
        item.discountType = "percent";
        rawDiscPct = Math.min(100, Math.max(0, Number(value) || 0));
        rawDiscAmt = 0;
        item.discountPercent = rawDiscPct;
        item.discountAmount = 0;
      } else if (field === "discountAmount") {
        item.discountType = "amount";
        rawDiscPct = 0;
        rawDiscAmt = Math.max(0, Number(value) || 0);
        item.discountPercent = 0;
      } else if (
        item.discountType === "amount" ||
        (Number(item.discountAmount) > 0 && Number(item.discountPercent) === 0)
      ) {
        rawDiscPct = 0;
      } else {
        rawDiscAmt = 0;
      }

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
          withGst: prev.withGst,
          gstType: prev.gstType,
        },
      );

      item.quantity = lineRes.quantity;
      item.unitPrice = lineRes.unitPrice;
      if (item.discountType === "amount") {
        item.discountPercent = 0;
        item.discountAmount = lineRes.discountAmount;
      } else {
        item.discountPercent = lineRes.discountPercent;
        item.discountAmount = 0;
      }
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
      items: formData.items.map((it) => {
        const useAmt =
          it.discountType === "amount" ||
          (Number(it.discountAmount) > 0 && Number(it.discountPercent) === 0);
        return {
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPercent: useAmt ? 0 : it.discountPercent,
          discountAmount: useAmt ? it.discountAmount : 0,
          taxPercent: it.taxPercent,
          isTaxInclusive: isInclusive,
        };
      }),
      withGst: formData.withGst,
      gstType: formData.gstType,
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
    formData.withGst,
    formData.gstType,
    priceTaxMode,
    enableRoundOff,
    manualRoundOff,
  ]);

  // Errors belong to the active tab's form; never carry them across tabs / modes.
  useEffect(() => {
    fe.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, viewMode, isConvertModalOpen]);

  // Batch-wise stock: backend data only (useBatchStock). Estimates never reserve or deduct stock.
  const batchStock = useBatchStock();
  const docProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          formData.items
            .map((it) => it.productId)
            .filter((id): id is string => !!id && isUuid(id)),
        ),
      ),
    [formData.items],
  );
  const docProductKey = docProductIds.join(",");
  const prevDocProductIdsRef = useRef<string[]>([]);
  useEffect(() => {
    // Only runs when the set of products on the document changes (not per keystroke).
    const prev = prevDocProductIdsRef.current;
    prev
      .filter((id) => !docProductIds.includes(id))
      .forEach((id) => batchStock.forget(id));
    docProductIds
      .filter((id) => !prev.includes(id))
      .forEach((id) => {
        void batchStock.loadProduct(id);
      });
    prevDocProductIdsRef.current = docProductIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docProductKey]);

  const getProductStockQty = (productId: string): number | undefined => {
    const matched = availableProducts.find(
      (pr: any) => pr.productId === productId || pr.id === productId,
    );
    return matched?.stockQty;
  };

  // Stock validation is used only when converting an estimate into Sale Order / Delivery Challan / Sales Invoice.
  // Creating or editing an Estimation/Quotation itself allows zero-stock products.
  const computeStockErrors = (
    items: Array<{
      productId?: string;
      productName?: string;
      batch?: string;
      quantity?: unknown;
    }>,
  ): FieldErrors => {
    const errs = validateBatchStock(
      items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        batch: it.batch,
        quantity: it.quantity,
      })),
      { getAvailable: (l) => batchStock.getAvailable(l.productId, l.batch) },
    );
    return appendZeroStockErrors(items, {
      errors: errs,
      getProductStockQty,
    });
  };
  const liveStockErrors: FieldErrors = {};

  const computeEstimateErrors = () => {
    return validateEstimateForm(formData, {
      isInclusive: priceTaxMode === "With Tax",
      finalAmount: formCalculations.grandTotal,
      roundOff: formCalculations.roundOffDiff,
      knownProductName: (id) =>
        availableProducts.find((pr: any) => pr.productId === id || pr.id === id)
          ?.productName,
    });
  };
  const computeConvertErrors = (): FieldErrors => {
    const errs: FieldErrors = {};
    const msg = convertTargetQuotation
      ? checkDateNotBefore(
          convertDueDate,
          convertTargetQuotation.date,
          "due date",
          "estimate date",
        )
      : null;
    if (msg) errs.convertDueDate = msg;
    if (convertTargetQuotation && convertType !== "Proforma") {
      // Converting to Sale Order / Delivery Challan / Sales Invoice requires available stock.
      const stockErrs = computeStockErrors(convertTargetQuotation.items || []);
      const first = Object.entries(stockErrs)[0];
      if (first) {
        const rowNo = Number(first[0].split(".")[1]) + 1;
        const it = (convertTargetQuotation.items || [])[rowNo - 1];
        errs.convertStock = `${it?.productName || `Item ${rowNo}`}${it?.batch ? ` (batch ${it.batch})` : ""}: ${first[1]}`;
      }
    }
    return errs;
  };
  // After the first submit attempt, keep errors in sync with the values (form or convert modal).
  useRevalidateAfterSubmit(
    fe,
    () =>
      isConvertModalOpen ? computeConvertErrors() : computeEstimateErrors(),
    [
      formData,
      priceTaxMode,
      formCalculations,
      availableProducts,
      isConvertModalOpen,
      convertDueDate,
      convertTargetQuotation,
      batchStock.version,
    ],
  );

  // Save Estimate via Commerce API
  const handleSaveEstimate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    return runOnce(async () => {
      // Re-read batch stock for every distinct product so stock changed elsewhere is checked.
      await batchStock.refresh(docProductIds);
      if (!fe.validateAll(computeEstimateErrors())) return;
      const validItems = formData.items.filter(
        (it) => it.productName.trim() || Number(it.unitPrice) > 0,
      );
      const { rawSubtotal, totalTax, totalDiscount, grandTotal } =
        formCalculations;
      const isEditing = Boolean(editingQuotation && editingQuotation.id);
      const calculatedGstType =
        formData.gstType || determineGstType(formData.stateOfSupply);

      const payload = mapSaleQuotationToPayload(
        {
          quotationNo:
            isEditing && formData.quotationNo
              ? formData.quotationNo.trim()
              : undefined,
          estimateManualNo:
            formData.estimateManualNo && formData.estimateManualNo.trim()
              ? formData.estimateManualNo.trim()
              : undefined,
          referenceNo:
            formData.referenceNo && formData.referenceNo.trim()
              ? formData.referenceNo.trim()
              : undefined,
          date: formData.date || undefined,
          validUntil: formData.validUntil || undefined,
          customerId: formData.customerId || undefined,
          partyName: formData.partyName.trim(),
          customerPhone: formData.customerPhone
            ? formData.customerPhone.trim()
            : undefined,
          customerEmail: formData.customerEmail
            ? formData.customerEmail.trim()
            : undefined,
          customerCompany: formData.customerCompany
            ? formData.customerCompany.trim()
            : undefined,
          billingAddress: formData.billingAddress
            ? formData.billingAddress.trim()
            : undefined,
          items: validItems as any,
          withGst: formData.withGst,
          gstType: calculatedGstType,
          roundOff: formCalculations.roundOffDiff,
          notes:
            formData.notes && formData.notes.trim()
              ? formData.notes.trim()
              : undefined,
          terms:
            formData.terms && formData.terms.trim()
              ? formData.terms.trim()
              : undefined,
          stateOfSupply:
            formData.stateOfSupply && formData.stateOfSupply.trim()
              ? formData.stateOfSupply.trim()
              : undefined,
        },
        !isEditing,
      );

      setIsSubmitting(true);
      try {
        if (editingQuotation && editingQuotation.id) {
          const res = await quotationApi.updateQuotation(
            editingQuotation.id,
            payload,
          );
          const mapped = mapApiQuotationToSaleQuotation(res.data);
          saveQuotation(mapped);
          toast.success(`Estimate ${mapped.quotationNo} updated successfully!`);
        } else {
          const res = await quotationApi.createQuotation(payload);
          const mapped = mapApiQuotationToSaleQuotation(res.data);
          // Explicitly guarantee newly created estimate is Open and clean from any conversion state
          mapped.status = "Open";
          mapped.convertedToInvoiceNo = undefined;
          mapped.convertedToId = undefined;
          mapped.convertedToType = undefined;
          mapped.convertedAt = undefined;
          saveQuotation(mapped);
          toast.success(`Estimate ${mapped.quotationNo} created successfully!`);
          void billDraft.finalize();
        }
        // Fresh batch stock for the next form (the estimate itself never changes stock).
        void batchStock.refresh(docProductIds);

        await fetchQuotations(
          1,
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
          setEditingQuotation(nextActive.editingQuotation || null);
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
        console.error("Save estimate error:", err);
        const rowIdx = formData.items
          .map((it, i) =>
            it.productName.trim() || Number(it.unitPrice) > 0 ? i : -1,
          )
          .filter((i) => i >= 0);
        const apiFieldErrors = mapApiFieldsToForm(
          extractApiFieldErrors(err),
          rowIdx,
        );
        if (Object.keys(apiFieldErrors).length > 0) {
          fe.merge(apiFieldErrors);
        } else {
          toast.error(getApiErrorMessage(err, "Failed to save estimate"));
        }
        // The server rejected the data (4xx): keep the form open with the entered values,
        // do not fall back to a local-only save.
        const httpStatus = err?.response?.status ?? err?.status;
        if (
          Object.keys(apiFieldErrors).length > 0 ||
          (typeof httpStatus === "number" &&
            httpStatus >= 400 &&
            httpStatus < 500)
        ) {
          return;
        }
        return;
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  // Helper to determine converted status for each document stage
  const getQuotationStages = (quot: SaleQuotation) => {
    const isInvoiceConverted = Boolean(
      quot.convertedToType === "Invoice" ||
      (quot.status === "Converted" &&
        quot.convertedToInvoiceNo &&
        quot.convertedToInvoiceNo.startsWith("INV-")),
    );

    const isOrderConverted = Boolean(
      quot.convertedToType === "Order" ||
      (quot.status === "Converted" &&
        quot.convertedToInvoiceNo &&
        (quot.convertedToInvoiceNo.startsWith("SO-") ||
          quot.convertedToInvoiceNo.startsWith("ORD-"))),
    );

    const isChallanConverted = Boolean(
      quot.convertedToType === "Challan" ||
      quot.convertedToType === "DeliveryChallan" ||
      (quot.status === "Converted" &&
        quot.convertedToInvoiceNo &&
        (quot.convertedToInvoiceNo.startsWith("DC-") ||
          quot.convertedToInvoiceNo.startsWith("CHAL-"))),
    );

    const isProformaConverted = Boolean(
      quot.convertedToType === "Proforma" ||
      (quot.status === "Converted" &&
        quot.convertedToInvoiceNo &&
        (quot.convertedToInvoiceNo.startsWith("PRO-") ||
          quot.convertedToInvoiceNo.startsWith("PI-"))),
    );

    const isGenericConverted =
      quot.status === "Converted" &&
      !isInvoiceConverted &&
      !isOrderConverted &&
      !isChallanConverted &&
      !isProformaConverted;

    const availableStages = [
      {
        type: "Invoice" as const,
        label: "Sale Invoice",
        isConverted: isInvoiceConverted,
      },
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
        type: "Proforma" as const,
        label: "Proforma",
        isConverted: isProformaConverted,
      },
    ].filter((s) => !s.isConverted);

    // A document converts once. When the server reports it converted, no further conversion is offered: every Convert
    // button, menu item, dialog and guard on this page reads these flags.
    const isFullyConverted = getConversionState(quot).isFullyConverted;
    const remainingStages = isFullyConverted ? [] : availableStages;

    return {
      lineage: undefined,
      isInvoiceConverted,
      isOrderConverted,
      isChallanConverted,
      isProformaConverted,
      isGenericConverted,
      availableStages: remainingStages,
      availableCount: remainingStages.length,
      isFullyConverted,
    };
  };

  // Preconditions shared by every conversion action. Returns a friendly message or null.
  const getConvertBlocker = (quot: SaleQuotation): string | null => {
    if (!quot?.id)
      return "This estimate could not be found. Please refresh the list.";
    if (quot.status === "Cancelled") {
      return `Estimate ${quot.quotationNo} is cancelled and cannot be converted.`;
    }
    const hasLines = (quot.items || []).some(
      (it) => Number(it.quantity) > 0 && (it.productName || it.productId),
    );
    if (!hasLines) {
      return `Estimate ${quot.quotationNo} has no items to convert. Please add items first.`;
    }
    return null;
  };

  // Convert handlers using Live Commerce API Modal
  const handleOpenConvertModal = (
    quot: SaleQuotation,
    type: "Invoice" | "Order" | "Proforma" | "Challan",
  ) => {
    const blocker = getConvertBlocker(quot);
    if (blocker) {
      toast.error(blocker);
      return;
    }
    fe.reset();
    const stages = getQuotationStages(quot);
    if (stages.isFullyConverted) {
      toast.info(
        `Quotation ${quot.quotationNo} has already completed conversion.`,
      );
      return;
    }

    let targetType = type;
    const isTargetConverted =
      (type === "Invoice" && stages.isInvoiceConverted) ||
      (type === "Order" && stages.isOrderConverted) ||
      (type === "Challan" && stages.isChallanConverted) ||
      (type === "Proforma" && stages.isProformaConverted);

    if (isTargetConverted) {
      if (stages.availableStages.length > 0) {
        targetType = stages.availableStages[0].type;
      } else {
        toast.info(
          `Quotation ${quot.quotationNo} has already completed this conversion stage.`,
        );
        return;
      }
    }

    setConvertTargetQuotation(quot);
    setConvertType(targetType);
    setConvertDueDate(
      new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    );
    setIsConvertModalOpen(true);
    setActiveConvertDropdownId(null);
    setConvertDropdownPos(null);
  };

  const handleExecuteConvert = () =>
    runOnce(async () => {
      if (!convertTargetQuotation) return;
      const quot = convertTargetQuotation;
      const blocker = getConvertBlocker(quot);
      if (blocker) {
        toast.error(blocker);
        return;
      }
      if (
        !getQuotationStages(quot).availableStages.some(
          (st) => st.type === convertType,
        )
      ) {
        toast.info(
          `Estimate ${quot.quotationNo} has already been converted to this document type.`,
        );
        return;
      }
      if (convertType !== "Proforma") {
        // Converted lines keep productId / batch / quantity: check them against fresh batch stock first.
        await batchStock.refresh(
          (quot.items || [])
            .map((it) => it.productId)
            .filter((id): id is string => !!id),
        );
      }
      if (!fe.validateAll(computeConvertErrors())) return;
      setIsConverting(true);

      try {
        if (convertType === "Invoice") {
          setIsConvertModalOpen(false);
          setConvertTargetQuotation(null);
          navigate("/sale-management/sales/sale", {
            state: {
              convertFrom: {
                sourceType: "Estimate",
                sourceId: quot.id,
                sourceNo: quot.quotationNo,
                customerId: quot.customerId,
                customerCode:
                  quot.customerCode ||
                  customers.find((c) => c.id === quot.customerId)
                    ?.customerCode ||
                  undefined,
                customerName: quot.partyName,
                customerCompany: quot.customerCompany,
                customerPhone: quot.customerPhone,
                customerEmail: quot.customerEmail,
                billingAddress: quot.billingAddress,
                shippingAddress: quot.shippingAddress || quot.billingAddress,
                items: (quot.items || []).map((it) => ({
                  id: it.id,
                  productId: it.productId,
                  productName: it.productName,
                  sku: it.sku,
                  batch: it.batch,
                  quantity: Number(it.quantity) || 1,
                  unitPrice: Number(it.unitPrice) || 0,
                  purchasePrice: Number(
                    (it as any).purchasePrice ?? (it as any).cost ?? 0,
                  ),
                  salesPrice: Number(it.unitPrice) || 0,
                  discountPercent: Number(it.discountPercent) || 0,
                  taxPercent: Number(it.taxPercent) || 0,
                  total: Number(it.total) || 0,
                })),
                subtotal: quot.subtotal,
                withGst: quot.withGst !== false,
                gstType: quot.gstType || "intra_state",
                cgst: quot.cgst || 0,
                sgst: quot.sgst || 0,
                igst: quot.igst || 0,
                discount: quot.discount || 0,
                overallDiscount: quot.discount || 0,
                totalDiscount: quot.discount || 0,
                taxAmount: quot.taxAmount || 0,
                grandTotal: quot.amount,
                paidAmount: 0,
                roundMode: (quot as any).roundMode || "none",
                paymentMethod: "Bank Transfer",
                paymentTerms: "Net 15 Days",
                dueDate: convertDueDate || quot.validUntil,
                notes: `Converted from Estimate ${quot.quotationNo}. ${quot.notes || ""}`,
              },
            },
          });
          return;
        }

        let apiConvertedDocNo = "";
        let apiConvertedDocId = "";
        let didBackendConvertCreateDoc = false;
        try {
          const res = await quotationApi.convertQuotation(quot.id, {
            targetType:
              convertType === "Challan"
                ? ("DeliveryChallan" as any)
                : convertType,
            dueDate: convertDueDate || undefined,
          });
          apiConvertedDocNo =
            res.data?.convertedTo?.documentNo ||
            (res.data as any)?.convertedTo?.proformaNo ||
            (res.data as any)?.convertedTo?.orderNo ||
            (res.data as any)?.convertedTo?.challanNo ||
            (res.data as any)?.document?.proformaNo ||
            (res.data as any)?.document?.orderNo ||
            (res.data as any)?.document?.challanNo ||
            (res.data as any)?.document?.documentNo ||
            (res.data as any)?.proforma?.proformaNo ||
            (res.data as any)?.order?.orderNo ||
            (res.data as any)?.challan?.challanNo ||
            (res.data as any)?.source?.convertedToInvoiceNo ||
            (res.data as any)?.proformaNo ||
            (res.data as any)?.orderNo ||
            (res.data as any)?.challanNo ||
            (res.data as any)?.documentNo ||
            "";
          apiConvertedDocId =
            res.data?.convertedTo?.id ||
            (res.data as any)?.document?.id ||
            (res.data as any)?.proforma?.id ||
            (res.data as any)?.order?.id ||
            (res.data as any)?.challan?.id ||
            (res.data as any)?.source?.convertedToId ||
            (res.data as any)?.id ||
            "";
          if (apiConvertedDocNo || apiConvertedDocId || res?.success) {
            didBackendConvertCreateDoc = true;
          }
        } catch (apiErr) {
          console.warn("Backend convertQuotation returned notice:", apiErr);
          if (/stock|insufficient/i.test(getApiErrorMessage(apiErr, ""))) {
            // Backend rejected for stock: show it inline in the modal and do not create anything locally.
            fe.merge({
              convertStock:
                "Not enough stock is available in one of the batches. Please reduce the quantity on the estimate first.",
            });
            void batchStock.refresh(
              (quot.items || [])
                .map((it) => it.productId)
                .filter((id): id is string => !!id),
            );
            return;
          }
          // Any other failure: nothing was converted. Say so and stop. (It used to carry on, create a separate document
          // through the normal create API and mark the estimate Converted on screen only.)
          toast.error(
            getApiErrorMessage(
              apiErr,
              `Failed to convert quotation to ${convertType}. Nothing was converted.`,
            ),
          );
          return;
        }

        // Converted only when the server confirmed it.
        if (!didBackendConvertCreateDoc) {
          toast.error(
            "The server did not confirm the conversion, so the estimate was left as it was.",
          );
          return;
        }

        if (convertType === "Proforma") {
          if (didBackendConvertCreateDoc && !apiConvertedDocNo) {
            try {
              const latestRes = await commerceProformaApi.getProformas({
                page_no: 1,
                page_size: 5,
                sortOrder: "desc",
              });
              const latestList = Array.isArray(latestRes?.data)
                ? latestRes.data
                : [];
              const matched = latestList.find(
                (p) =>
                  (p.sourceId && p.sourceId === quot.id) ||
                  (p.referenceNo && p.referenceNo === quot.quotationNo) ||
                  ((p.customerId === quot.customerId ||
                    p.partyName === quot.partyName) &&
                    Math.abs(
                      Number(p.amount ?? p.grandTotal ?? 0) - quot.amount,
                    ) < 1),
              );
              if (matched) {
                apiConvertedDocNo =
                  matched.proformaNo || (matched as any).documentNo || "";
                apiConvertedDocId = matched.id || apiConvertedDocId;
              }
            } catch (lookupErr) {
              console.warn("Proforma lookup after convert notice:", lookupErr);
            }
          }
          const finalDocNo = apiConvertedDocNo || "";
          const newProforma: SaleProformaInvoice = {
            id: apiConvertedDocId || `pro_conv_${Date.now()}`,
            proformaNo: finalDocNo,
            referenceNo: quot.quotationNo,
            date: new Date().toISOString().split("T")[0],
            validUntil:
              convertDueDate ||
              quot.validUntil ||
              new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
            customerId: quot.customerId,
            customerCode:
              quot.customerCode ||
              customers.find((c) => c.id === quot.customerId)?.customerCode ||
              undefined,
            partyName: quot.partyName,
            customerCompany: quot.customerCompany,
            customerPhone: quot.customerPhone,
            customerEmail: quot.customerEmail,
            billingAddress: quot.billingAddress,
            shippingAddress: quot.shippingAddress || quot.billingAddress,
            stateOfSupply: quot.stateOfSupply || "33-Tamil Nadu",
            items: quot.items.map((it, idx) => ({
              id: `row_${idx}_${Date.now()}`,
              productId: it.productId,
              productName: it.productName,
              sku: it.sku,
              batch: it.batch,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              taxPercent: it.taxPercent || 0,
              discountPercent: it.discountPercent || 0,
              total: it.total,
              unit: (it as any).unit || "PCS",
            })),
            subtotal: quot.subtotal,
            withGst: quot.withGst,
            gstType: quot.gstType,
            cgst: quot.cgst,
            sgst: quot.sgst,
            igst: quot.igst,
            discount: quot.discount || 0,
            taxAmount: quot.taxAmount || 0,
            roundOff: quot.roundOff || 0,
            amount: quot.amount,
            balance: quot.amount,
            status: "Open",
            notes: `Converted from Estimate ${quot.quotationNo}. ${quot.notes || ""}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Only call createProforma if convertQuotation did NOT already create the Proforma on the backend
          if (!didBackendConvertCreateDoc) {
            try {
              const payload = mapSaleProformaToPayload(newProforma, true);
              const pRes = await commerceProformaApi.createProforma(payload);
              if (pRes?.data?.id) newProforma.id = pRes.data.id;
              const backendNo =
                pRes?.data?.proformaNo || (pRes?.data as any)?.documentNo;
              if (backendNo) newProforma.proformaNo = backendNo;
            } catch (createErr) {
              console.warn("createProforma fallback:", createErr);
            }
          }

          syncConvertedProformaToStorage(newProforma);
          recordDocumentConversion({
            fromType: "Estimate",
            fromId: quot.id,
            fromNo: quot.quotationNo,
            toType: "Proforma",
            toId: newProforma.id,
            toNo: newProforma.proformaNo,
            partyName: quot.partyName,
            customerId: quot.customerId,
            customerCode: newProforma.customerCode,
            grandTotal: quot.amount,
          });

          syncQuotationStatusInStorage(quot.id, "Converted", {
            type: "Proforma",
            documentNo: newProforma.proformaNo,
            id: newProforma.id,
          });
          updateQuotationStatus(quot.id, "Converted");
          store.dispatch(
            baseApi.util.invalidateTags([
              { type: "Estimation", id: "LIST" },
              { type: "ProformaInvoice", id: "LIST" },
            ]),
          );
          toast.success(
            `Quotation ${quot.quotationNo} successfully converted to Proforma Invoice${newProforma.proformaNo ? ` ${newProforma.proformaNo}` : ""}!`,
          );
        } else if (convertType === "Order") {
          const finalDocNo = apiConvertedDocNo || "";
          const newOrder: SaleOrderRecord = {
            id: apiConvertedDocId || `order_conv_${Date.now()}`,
            orderNo: finalDocNo,
            referenceNo: quot.quotationNo,
            orderDate: new Date().toISOString().split("T")[0],
            dueDate:
              convertDueDate ||
              quot.validUntil ||
              new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
            customerId: quot.customerId,
            customerCode:
              quot.customerCode ||
              customers.find((c) => c.id === quot.customerId)?.customerCode ||
              undefined,
            partyName: quot.partyName,
            customerCompany: quot.customerCompany,
            customerPhone: quot.customerPhone,
            customerEmail: quot.customerEmail,
            billingAddress: quot.billingAddress,
            shippingAddress: quot.shippingAddress || quot.billingAddress,
            stateOfSupply: quot.stateOfSupply || "33-Tamil Nadu",
            paymentType: "Credit",
            items: quot.items.map((it, idx) => ({
              id: `row_${idx}_${Date.now()}`,
              productId: it.productId,
              productName: it.productName,
              sku: it.sku,
              batch: it.batch,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              taxPercent: it.taxPercent || 0,
              discountPercent: it.discountPercent || 0,
              total: it.total,
              unit: (it as any).unit || "PCS",
            })),
            subtotal: quot.subtotal,
            withGst: quot.withGst,
            gstType: quot.gstType,
            cgst: quot.cgst,
            sgst: quot.sgst,
            igst: quot.igst,
            discount: quot.discount || 0,
            taxAmount: quot.taxAmount || 0,
            roundOff: quot.roundOff || 0,
            amount: quot.amount,
            balance: quot.amount,
            advanceAmount: 0,
            status: "Open",
            notes: `Converted from Estimate ${quot.quotationNo}. ${quot.notes || ""}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Only call createOrder if convertQuotation did NOT already create the Sale Order on the backend
          if (!didBackendConvertCreateDoc) {
            try {
              const payload = mapSaleOrderRecordToPayload(newOrder, true);
              const oRes = await commerceSaleOrderApi.createOrder(payload);
              if (oRes?.data?.id) newOrder.id = oRes.data.id;
              const backendNo =
                oRes?.data?.orderNo || (oRes?.data as any)?.documentNo;
              if (backendNo) newOrder.orderNo = backendNo;
            } catch (createErr) {
              console.warn("createOrder fallback:", createErr);
            }
          }

          syncConvertedOrderToStorage(newOrder);
          recordDocumentConversion({
            fromType: "Estimate",
            fromId: quot.id,
            fromNo: quot.quotationNo,
            toType: "Order",
            toId: newOrder.id,
            toNo: newOrder.orderNo,
            partyName: quot.partyName,
            customerId: quot.customerId,
            customerCode: newOrder.customerCode,
            grandTotal: quot.amount,
          });

          syncQuotationStatusInStorage(quot.id, "Converted", {
            type: "Order",
            documentNo: newOrder.orderNo,
            id: newOrder.id,
          });
          updateQuotationStatus(quot.id, "Converted");
          store.dispatch(
            baseApi.util.invalidateTags([
              { type: "Estimation", id: "LIST" },
              { type: "SaleOrder", id: "LIST" },
            ]),
          );
          toast.success(
            `Quotation ${quot.quotationNo} successfully converted to Sale Order${newOrder.orderNo ? ` ${newOrder.orderNo}` : ""}!`,
          );
        } else if (convertType === "Challan") {
          const finalDocNo = apiConvertedDocNo || "";

          let resolvedCustomerId = quot.customerId;
          if (!resolvedCustomerId || !UUID_REGEX.test(resolvedCustomerId)) {
            const found = customers.find(
              (c) =>
                c.id === quot.customerId ||
                c.name.toLowerCase() === quot.partyName.trim().toLowerCase(),
            );
            if (found && UUID_REGEX.test(found.id)) {
              resolvedCustomerId = found.id;
            }
          }
          // Never attach a different customer: block when the estimate's customer cannot be resolved.
          if (!resolvedCustomerId || !UUID_REGEX.test(resolvedCustomerId)) {
            fe.merge({
              _form:
                "Please choose the customer from the list. Edit the estimate and select a customer before converting.",
            });
            return;
          }

          const newChallan: DeliveryChallanRecord = {
            id: apiConvertedDocId || `dc_conv_${Date.now()}`,
            challanNo: finalDocNo,
            referenceNo: quot.quotationNo,
            invoiceDate: new Date().toISOString().split("T")[0],
            dueDate:
              convertDueDate ||
              quot.validUntil ||
              new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
            customerId: resolvedCustomerId || quot.customerId,
            customerCode:
              quot.customerCode ||
              customers.find(
                (c) => c.id === (resolvedCustomerId || quot.customerId),
              )?.customerCode ||
              undefined,
            partyName: quot.partyName,
            customerCompany: quot.customerCompany,
            customerPhone: quot.customerPhone,
            customerEmail: quot.customerEmail,
            billingAddress: quot.billingAddress,
            shippingAddress: quot.shippingAddress || quot.billingAddress,
            stateOfSupply: quot.stateOfSupply || "33-Tamil Nadu",
            items: quot.items.map((it, idx) => ({
              id: `row_${idx}_${Date.now()}`,
              productId: it.productId,
              productName: it.productName,
              sku: it.sku,
              batch: it.batch,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              taxPercent: it.taxPercent || 0,
              discountPercent: it.discountPercent || 0,
              total: it.total,
              unit: (it as any).unit || "PCS",
            })),
            subtotal: quot.subtotal,
            withGst: quot.withGst,
            gstType: quot.gstType,
            cgst: quot.cgst,
            sgst: quot.sgst,
            igst: quot.igst,
            discount: quot.discount || 0,
            taxAmount: quot.taxAmount || 0,
            roundOff: quot.roundOff || 0,
            amount: quot.amount,
            balance: quot.amount,
            status: "Open",
            notes: `Converted from Estimate ${quot.quotationNo}. ${quot.notes || ""}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Only call createChallan if convertQuotation did NOT already create the Delivery Challan on the backend
          if (
            !didBackendConvertCreateDoc &&
            resolvedCustomerId &&
            newChallan.items &&
            newChallan.items.length > 0
          ) {
            try {
              const payload = mapDeliveryChallanRecordToPayload(
                newChallan,
                true,
              );
              payload.customerId = resolvedCustomerId;
              const cRes =
                await commerceDeliveryChallanApi.createChallan(payload);
              if (cRes?.data?.id) newChallan.id = cRes.data.id;
              const backendNo =
                cRes?.data?.challanNo || (cRes?.data as any)?.documentNo;
              if (backendNo) newChallan.challanNo = backendNo;
            } catch (createErr) {
              console.warn("createChallan fallback:", createErr);
            }
          }

          syncConvertedChallanToStorage(newChallan);
          recordDocumentConversion({
            fromType: "Estimate",
            fromId: quot.id,
            fromNo: quot.quotationNo,
            toType: "Challan",
            toId: newChallan.id,
            toNo: newChallan.challanNo,
            partyName: quot.partyName,
            customerId: quot.customerId,
            customerCode: newChallan.customerCode,
            grandTotal: quot.amount,
          });

          syncQuotationStatusInStorage(quot.id, "Converted", {
            type: "Challan",
            documentNo: newChallan.challanNo,
            id: newChallan.id,
          });
          updateQuotationStatus(quot.id, "Converted");
          store.dispatch(
            baseApi.util.invalidateTags([
              { type: "Estimation", id: "LIST" },
              { type: "DeliveryChallan", id: "LIST" },
            ]),
          );
          toast.success(
            `Quotation ${quot.quotationNo} successfully converted to Delivery Challan${newChallan.challanNo ? ` ${newChallan.challanNo}` : ""}!`,
          );
        }

        void batchStock.refresh(
          (quot.items || [])
            .map((it) => it.productId)
            .filter((id): id is string => !!id),
        );
        setIsConvertModalOpen(false);
        setConvertTargetQuotation(null);
        await fetchQuotations(
          page,
          pageSize,
          appliedSearch,
          appliedStatus,
          appliedPeriod,
        );
      } catch (err: any) {
        console.error("Convert API call error:", err);
        // Keep the modal open so the user can retry; entered values are preserved.
        toast.error(
          getApiErrorMessage(
            err,
            `Failed to convert quotation to ${convertType}`,
          ),
        );
      } finally {
        setIsConverting(false);
      }
    });

  // Delete via Live API with confirmation modal
  const handleDelete = (id: string, no: string) => {
    setActiveDropdownId(null);
    setDeleteTargetQuotation({ id, quotationNo: no });
    setDeleteQuotationError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteQuotation = () =>
    runOnce(async () => {
      if (!deleteTargetQuotation || !deleteTargetQuotation.id) {
        toast.error("Please select an estimate to delete.");
        return;
      }
      setIsDeletingQuotation(true);
      setDeleteQuotationError(null);
      try {
        await quotationApi.deleteQuotation(deleteTargetQuotation.id);
        toast.success(
          `Quotation "${deleteTargetQuotation.quotationNo}" deleted successfully.`,
        );
        deleteQuotation(deleteTargetQuotation.id);
        setIsDeleteModalOpen(false);
        setDeleteTargetQuotation(null);
        await fetchQuotations(
          page,
          pageSize,
          appliedSearch,
          appliedStatus,
          appliedPeriod,
        );
      } catch (err: any) {
        const errMsg = getApiErrorMessage(err, "Failed to delete quotation.");
        setDeleteQuotationError(errMsg);
        toast.error(errMsg);
      } finally {
        setIsDeletingQuotation(false);
      }
    });

  // Where each converted estimate went: when the server does not report the destination on the estimate, look for the
  // proforma / sale order / challan / invoice that references this estimate number.
  type EstimateTarget = {
    type: "Proforma" | "Order" | "Challan" | "Invoice";
    no: string;
  };
  const [downstreamByEstimate, setDownstreamByEstimate] = useState<
    Record<string, EstimateTarget>
  >({});
  // Estimate numbers already searched for. An estimate whose destination is not found is not searched again, so the
  // four list calls below happen once per estimate number, not on every reload of the estimate list.
  const searchedEstimatesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const pendingKeys = liveQuotations
      .filter(
        (q) =>
          q.status === "Converted" &&
          q.quotationNo &&
          !resolveConvertedTarget(q) &&
          !downstreamByEstimate[q.quotationNo.trim().toLowerCase()] &&
          !searchedEstimatesRef.current.has(q.quotationNo.trim().toLowerCase()),
      )
      .map((q) => q.quotationNo.trim().toLowerCase());
    if (pendingKeys.length === 0) return;
    pendingKeys.forEach((k) => searchedEstimatesRef.current.add(k));
    let cancelled = false;
    (async () => {
      const found: Record<string, EstimateTarget> = {};
      const take = (
        type: EstimateTarget["type"],
        ref?: string | null,
        no?: string | null,
      ) => {
        const key = (ref || "").trim().toLowerCase();
        if (key && no && !found[key]) found[key] = { type, no };
      };
      const params: any = { page_no: 1, page_size: 100 };
      const [proformas, orders, challans, invoices] = await Promise.allSettled([
        commerceProformaApi.getProformas(params),
        commerceSaleOrderApi.getOrders(params),
        commerceDeliveryChallanApi.getChallans(params),
        commerceInvoiceApi.getInvoices(params),
      ]);
      if (proformas.status === "fulfilled")
        (proformas.value?.data || []).forEach((p: any) =>
          take("Proforma", p.referenceNo, p.proformaNo),
        );
      if (orders.status === "fulfilled")
        (orders.value?.data || []).forEach((o: any) =>
          take("Order", o.referenceNo, o.orderNo),
        );
      if (challans.status === "fulfilled")
        (challans.value?.data || []).forEach((c: any) =>
          take("Challan", c.referenceNo, c.challanNo),
        );
      if (invoices.status === "fulfilled")
        (invoices.value?.data || []).forEach((i: any) =>
          take("Invoice", i.referenceNo, i.invoiceNo),
        );
      // Every call failed (e.g. offline): allow a later retry instead of remembering a search that never happened.
      if (
        [proformas, orders, challans, invoices].every(
          (r) => r.status === "rejected",
        )
      ) {
        pendingKeys.forEach((k) => searchedEstimatesRef.current.delete(k));
      }
      if (!cancelled && Object.keys(found).length > 0) {
        setDownstreamByEstimate((prev) => ({ ...prev, ...found }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveQuotations]);

  // Duplicate: open the New Estimate form prefilled with this estimate's reusable details.
  // Nothing is saved (and no number is generated) until the user presses Save.
  const handleDuplicate = (item: SaleQuotation) => {
    setActiveDropdownId(null);
    if (!item?.items || item.items.length === 0) {
      toast.error("This estimate has no items to duplicate.");
      return;
    }
    const stamp = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const validUntil = new Date(stamp + 30 * 86400000)
      .toISOString()
      .split("T")[0];
    const copiedItems: ExtendedEstimateItem[] = item.items.map((it, idx) => ({
      ...it,
      id: `row_${stamp}_${idx}`,
      unit: (it as any).unit || "PCS",
    })) as ExtendedEstimateItem[];
    const dupData = {
      customerId: item.customerId || "",
      partyName: item.partyName || "",
      customerPhone: item.customerPhone || "",
      customerEmail: item.customerEmail || "",
      customerCompany: item.customerCompany || "",
      billingAddress: item.billingAddress || "",
      quotationNo: computedPreviewNo,
      estimateManualNo: "",
      referenceNo: "",
      date: today,
      validUntil,
      stateOfSupply: item.stateOfSupply || "",
      withGst: item.withGst !== false,
      gstType: (item.gstType === "inter_state"
        ? "inter_state"
        : item.gstType === "intra_state"
          ? "intra_state"
          : determineGstType(item.stateOfSupply)) as
        | "intra_state"
        | "inter_state",
      items: copiedItems,
      notes: item.notes || "",
      terms: item.terms || "",
    };
    setValidUptoDays("30");
    setFormData(dupData);
    setEditingQuotation(null);
    setEnableRoundOff(true);
    setManualRoundOff(null);
    setTabs([
      {
        id: "tab_1",
        title: "New Estimate",
        num: 1,
        formData: dupData,
        editingQuotation: null,
        enableRoundOff: true,
        manualRoundOff: null,
        columnSettings: { ...columnSettings },
      },
    ]);
    setActiveTabId("tab_1");
    setViewMode("form");
    toast.info(
      `Duplicated ${item.quotationNo || "estimate"} into a new form. Save to create it.`,
    );
  };

  // Cancel / re-open an estimate (PATCH status). Guarded against double clicks.
  const handleUpdateQuotationStatus = (
    item: SaleQuotation,
    status: "Cancelled" | "Open",
  ) =>
    runOnce(async () => {
      if (!item?.id) {
        toast.error(
          "This estimate could not be found. Please refresh the list.",
        );
        return;
      }
      if (status === "Cancelled" && item.status !== "Open") {
        toast.error(
          `Estimate ${item.quotationNo} is not open, so it cannot be cancelled.`,
        );
        return;
      }
      if (status === "Open" && item.status !== "Cancelled") {
        toast.error(
          `Estimate ${item.quotationNo} is not cancelled, so it cannot be reopened.`,
        );
        return;
      }
      try {
        await quotationApi.updateStatus(item.id, { status });
        toast.success(
          status === "Cancelled"
            ? `Quotation ${item.quotationNo} marked as Cancelled`
            : `Quotation ${item.quotationNo} reopened as Open`,
        );
        updateQuotationStatus(item.id, status);
        await fetchQuotations(
          page,
          pageSize,
          appliedSearch,
          appliedStatus,
          appliedPeriod,
        );
      } catch (err: any) {
        toast.error(
          getApiErrorMessage(
            err,
            status === "Cancelled"
              ? "Failed to cancel quotation"
              : "Failed to reopen quotation",
          ),
        );
      }
    });

  // Open Preview with fresh server data
  const handleOpenPreview = async (item: SaleQuotation) => {
    setActiveDropdownId(null);
    try {
      const res = await quotationApi.getQuotationById(item.id);
      if (res && res.data) {
        const mapped = mapApiQuotationToSaleQuotation(res.data);
        setPreviewQuotation({
          ...mapped,
          estimateManualNo:
            mapped.estimateManualNo || item.estimateManualNo || "",
        });
      } else {
        setPreviewQuotation(item);
      }
    } catch {
      setPreviewQuotation(item);
    }
  };

  // Export to Excel
  const reportTotals = (list: SaleQuotation[]) => ({
    totalAmount: list.reduce((sum, q) => sum + (Number(q.amount) || 0), 0),
    openAmount: list
      .filter((q) => q.status === "Open")
      .reduce((sum, q) => sum + (Number(q.amount) || 0), 0),
  });

  const handleExport = () =>
    runReport<SaleQuotation>({
      label: "quotations",
      load: async () =>
        applyQuotationFilters(
          await fetchAllReportRows<SaleQuotation>(fetchQuotationsReportPage),
        ),
      onRows: (rows) => {
        const excelRows = rows.map((q) => {
          const created = formatDateTime(q.createdAt || q.date);
          const qStages = getQuotationStages(q);
          const isActuallyConverted = Boolean(
            q.convertedAt ||
            q.convertedToInvoiceNo ||
            q.convertedToId ||
            qStages.isFullyConverted ||
            (q.status === "Converted" &&
              (qStages.isInvoiceConverted ||
                qStages.isOrderConverted ||
                qStages.isChallanConverted ||
                qStages.isProformaConverted)),
          );
          const converted = isActuallyConverted
            ? formatDateTime(
                q.convertedAt ||
                  (q.status === "Converted" && q.updatedAt !== q.createdAt
                    ? q.updatedAt
                    : null),
              )
            : null;
          const code =
            q.customerCode ||
            customers.find(
              (c) =>
                (q.customerId && c.id === q.customerId) ||
                (c.phone && q.customerPhone && c.phone === q.customerPhone) ||
                (c.name &&
                  q.partyName &&
                  c.name.toLowerCase() === q.partyName.toLowerCase()),
            )?.customerCode ||
            "";

          return {
            estimateNo: q.quotationNo,
            estimateManualNo: q.estimateManualNo || "—",
            createdDateTime: created ? created.full : q.date,
            convertedDateTime: converted ? converted.full : "—",
            customerCode: code || "—",
            partyName: q.partyName,
            customerPhone: q.customerPhone || "-",
            amount: Number(q.amount || 0),
            balance: Number(q.balance || 0),
            status: q.status,
          };
        });

        exportTableToExcel({
          filename: `Estimates_Quotations_Report_${new Date().toISOString().split("T")[0]}`,
          sheetName: "Estimates & Quotations",
          title: "YAA CREATIONS CRM - ESTIMATE & QUOTATION REPORT",
          subtitle: `Filter: ${appliedPeriod} | Total Quotations: ${rows.length} | Generated: ${new Date().toLocaleDateString("en-GB")}`,
          columns: [
            {
              header: "Estimate ID",
              key: "estimateNo",
              align: "center",
              width: 18,
            },
            {
              header: "Estimate No.",
              key: "estimateManualNo",
              align: "center",
              width: 18,
            },
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
            {
              header: "Customer ID",
              key: "customerCode",
              align: "center",
              width: 15,
            },
            {
              header: "Customer Name",
              key: "partyName",
              align: "left",
              width: 25,
            },
            {
              header: "Contact",
              key: "customerPhone",
              align: "left",
              width: 18,
            },
            {
              header: "Amount (₹)",
              key: "amount",
              align: "right",
              type: "currency",
              width: 18,
            },
            {
              header: "Balance (₹)",
              key: "balance",
              align: "right",
              type: "currency",
              width: 18,
            },
            { header: "Status", key: "status", align: "center", width: 14 },
          ],
          data: excelRows,
          summaryRow: {
            estimateNo: "TOTAL",
            partyName: `${rows.length} Quotations`,
            amount: reportTotals(rows).totalAmount,
            balance: reportTotals(rows).openAmount,
          },
        });

        toast.success(
          `Estimates Excel report downloaded (${rows.length} records)!`,
        );
      },
    });

  // Print Estimates Table Report via universal printUtils
  const handlePrintTableReport = () =>
    runReport<SaleQuotation>({
      label: "quotations",
      load: async () =>
        applyQuotationFilters(
          await fetchAllReportRows<SaleQuotation>(fetchQuotationsReportPage),
        ),
      onRows: (rows) => {
        const printRows = rows.map((q) => {
          const created = formatDateTime(q.createdAt || q.date);
          const qStages = getQuotationStages(q);
          const isActuallyConverted = Boolean(
            q.convertedAt ||
            q.convertedToInvoiceNo ||
            q.convertedToId ||
            qStages.isFullyConverted ||
            (q.status === "Converted" &&
              (qStages.isInvoiceConverted ||
                qStages.isOrderConverted ||
                qStages.isChallanConverted ||
                qStages.isProformaConverted)),
          );
          const converted = isActuallyConverted
            ? formatDateTime(
                q.convertedAt ||
                  (q.status === "Converted" && q.updatedAt !== q.createdAt
                    ? q.updatedAt
                    : null),
              )
            : null;
          const code =
            q.customerCode ||
            customers.find(
              (c) =>
                (q.customerId && c.id === q.customerId) ||
                (c.phone && q.customerPhone && c.phone === q.customerPhone) ||
                (c.name &&
                  q.partyName &&
                  c.name.toLowerCase() === q.partyName.toLowerCase()),
            )?.customerCode ||
            "";

          return {
            quotationNo: q.quotationNo,
            estimateManualNo: q.estimateManualNo || "—",
            createdDateTime: created ? created.full : isoToDdmmyyyy(q.date),
            convertedDateTime: converted ? converted.full : "—",
            partyName: code ? `${q.partyName} (${code})` : q.partyName,
            customerPhone: q.customerPhone || "-",
            amount: Number(q.amount || 0),
            balance: Number(q.balance || 0),
            status: q.status,
          };
        });

        printTableReport({
          title: "ESTIMATE & QUOTATION LEDGER",
          subtitle: `Filter: ${appliedPeriod} | Total Quotations: ${rows.length}`,
          columns: [
            {
              header: "Estimate ID",
              key: "quotationNo",
              align: "center",
              width: "11%",
            },
            {
              header: "Estimate No.",
              key: "estimateManualNo",
              align: "center",
              width: "11%",
            },
            {
              header: "Created Date & Time",
              key: "createdDateTime",
              align: "center",
              width: "15%",
            },
            {
              header: "Converted Date & Time",
              key: "convertedDateTime",
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
              header: "Contact",
              key: "customerPhone",
              align: "left",
              width: "12%",
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
              width: "11%",
            },
          ],
          data: printRows,
          summaryRow: {
            quotationNo: "TOTAL",
            partyName: `${rows.length} Quotations`,
            amount: reportTotals(rows).totalAmount,
            balance: reportTotals(rows).openAmount,
          },
          metrics: [
            { label: "Total Value", value: reportTotals(rows).totalAmount },
            { label: "Open Amount", value: reportTotals(rows).openAmount },
            { label: "Total Quotations", value: rows.length },
          ],
        });
      },
    });

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const mapQuotationToDocumentPrintOptions = (
    quot: SaleQuotation,
  ): DocumentPrintOptions => {
    const isGstActive =
      quot.withGst !== false && Number(quot.taxAmount || 0) > 0;
    return {
      docTypeTitle: "ESTIMATE / QUOTATION",
      docNo: quot.quotationNo,
      docDate: isoToDdmmyyyy(quot.date),
      dueDate: quot.validUntil ? isoToDdmmyyyy(quot.validUntil) : undefined,
      status: /^converted$/i.test(String(quot.status || "").trim())
        ? ""
        : quot.status,
      statusColor:
        (quot.status as string) === "Accepted" || quot.status === "Converted"
          ? "emerald"
          : quot.status === "Open"
            ? "amber"
            : quot.status === "Expired"
              ? "rose"
              : "slate",
      companyName: companyProfile.companyName,
      companySubtitle: companyProfile.companySubtitle,
      companyAddress: companyProfile.companyAddress,
      companyGstin: companyProfile.companyGstin,
      companyPhone: companyProfile.companyPhone,
      companyEmail: companyProfile.companyEmail,
      partyTitle: "Estimate For (Party Details)",
      partyName: quot.partyName,
      partyCompany: quot.customerCompany,
      partyPhone: quot.customerPhone,
      partyEmail: quot.customerEmail,
      partyAddress: quot.billingAddress,
      extraMeta: [
        { label: "Estimate ID", value: quot.quotationNo },
        ...(quot.estimateManualNo
          ? [{ label: "Estimate No", value: quot.estimateManualNo }]
          : []),
        ...(quot.stateOfSupply
          ? [{ label: "State of Supply", value: quot.stateOfSupply }]
          : []),
        ...(!/^converted$/i.test(String(quot.status || "").trim()) &&
        quot.status
          ? [{ label: "Quotation Status", value: quot.status }]
          : []),
      ],
      items: (quot.items || []).map((it) => ({
        name: it.productName,
        sku: it.sku,
        batch: it.batch,
        unit: (it as any).unit || undefined,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent,
        taxPercent: isGstActive ? it.taxPercent || 0 : 0,
        total: it.total,
      })),
      subtotal: quot.subtotal,
      discount: quot.discount,
      tax: {
        withGst: isGstActive,
        gstType: quot.gstType,
        taxAmount: quot.taxAmount,
        cgst: quot.cgst || undefined,
        sgst: quot.sgst || undefined,
        igst: quot.igst || undefined,
      },
      roundOff: quot.roundOff,
      grandTotal: quot.amount,
      balance: quot.balance,
      notes: quot.notes,
      terms: quot.terms,
      primarySignatoryLabel: "Authorized Signatory",
    };
  };

  // Load the latest record (GET /commerce/quotations/:id) so print / download use server data
  const fetchLatestQuotation = async (
    quot: SaleQuotation,
  ): Promise<SaleQuotation> => {
    if (!quot.id) return quot;
    try {
      const res = await quotationApi.getQuotationById(quot.id);
      if (res && res.data) {
        const mapped = mapApiQuotationToSaleQuotation(res.data);
        return {
          ...mapped,
          estimateManualNo:
            mapped.estimateManualNo || quot.estimateManualNo || "",
        };
      }
    } catch (err) {
      console.warn("Could not fetch latest quotation for print/download:", err);
    }
    return quot;
  };

  const handleDownloadQuotation = async (listQuot: SaleQuotation) => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const toastId = `dl-quot-${listQuot.id}`;
    toast.loading(`Preparing PDF for Quotation ${listQuot.quotationNo}...`, {
      id: toastId,
    });
    try {
      const quot = await fetchLatestQuotation(listQuot);
      const options = mapQuotationToDocumentPrintOptions(quot);
      await downloadBusinessDocument(
        options,
        `Estimate_${quot.quotationNo.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
      );
      toast.success(`Quotation ${quot.quotationNo} downloaded successfully!`, {
        id: toastId,
      });
    } catch (err: any) {
      console.error("Quotation PDF download error:", err);
      toast.error("Failed to generate and download estimate PDF.", {
        id: toastId,
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Printable Document Generator (standardized via printBusinessDocument)
  const handlePrintQuotation = async (listQuot: SaleQuotation) => {
    const quot = await fetchLatestQuotation(listQuot);
    await printBusinessDocument(mapQuotationToDocumentPrintOptions(quot));
  };

  // Filtered party list for Party Search Dropdown (prioritizes live customers)
  const filteredCustomers = useMemo(() => {
    const q = partySearchQuery.toLowerCase().trim();
    const realCustomers = customers.filter((c) => !c.id.startsWith("cust_"));
    const sourceList = realCustomers.length > 0 ? realCustomers : customers;
    if (!q) return sourceList;
    return sourceList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(q)),
    );
  }, [customers, partySearchQuery]);

  // =========================================================================
  // VIEW MODE: FULL SCREEN CREATE / EDIT FORM (MATCHING REFERENCE IMAGE)
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
                  <span className="truncate max-w-[130px] font-bold">
                    {tab.title}
                  </span>
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
              <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                {editingQuotation ? (
                  <>
                    <span>Edit Quotation</span>
                    <span className="font-extrabold text-[#33077C] font-mono text-xs sm:text-[13px] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/80 shadow-2xs">
                      {editingQuotation.quotationNo}
                    </span>
                  </>
                ) : (
                  "Create a new customer estimation / quotation"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Saved draft: resume prompt + autosave status */}
        {!editingQuotation &&
          (billDraft.pendingDraft || billDraft.status !== "idle") && (
            <div className="mb-4 flex flex-col gap-3">
              {billDraft.pendingDraft && (
                <ResumeDraftBanner
                  draft={billDraft.pendingDraft}
                  documentLabel={DRAFT_MODULES.quotation.label}
                  busy={isResumingDraft}
                  onResume={handleResumeDraft}
                  onDiscard={billDraft.discardPending}
                />
              )}
              <div className="flex justify-end">
                <DraftSyncIndicator
                  status={billDraft.status}
                  lastSavedAt={billDraft.lastSavedAt}
                  totals={billDraft.totals}
                  error={billDraft.error}
                />
              </div>
            </div>
          )}

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
              {/* Left Column: Party (CRM Theme) */}
              <div className="lg:col-span-6 xl:col-span-5" ref={partySelectRef}>
                <div {...fieldAttr("customerId")}>
                  <CustomerSearchableSelect
                    label="Customer"
                    required
                    value={formData.customerId}
                    allowNone
                    size="lg"
                    onChange={(val, cust) => {
                      fe.clearError("customerId");
                      setFormData((prev) => ({
                        ...prev,
                        customerId: val,
                        partyName: cust ? cust.name : val ? prev.partyName : "",
                        customerCompany: cust
                          ? cust.company || ""
                          : val
                            ? prev.customerCompany
                            : "",
                        customerPhone: cust
                          ? cust.phone || ""
                          : val
                            ? prev.customerPhone
                            : "",
                        customerEmail: cust
                          ? cust.email || ""
                          : val
                            ? prev.customerEmail
                            : "",
                        billingAddress: cust
                          ? cust.billingAddress || cust.address || ""
                          : val
                            ? prev.billingAddress
                            : "",
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
                </div>
                <FormError message={fe.errors.customerId} />

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

              {/* Right Column: Estimation No, Invoice Date, State of supply, Valid Upto */}
              <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-end gap-3 text-xs">
                {/* Estimation No. (Bold Display) */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <span className="font-bold text-slate-700 w-24 sm:w-auto text-right">
                    Estimation S.No.
                  </span>
                  <div className="w-40 sm:w-48 h-9 px-3 bg-purple-50/70 border border-purple-200/90 rounded-lg flex items-center justify-between text-xs sm:text-[13px] font-extrabold text-[#33077C] font-mono shadow-2xs">
                    <span>
                      {editingQuotation?.quotationNo ||
                        formData.quotationNo ||
                        computedPreviewNo}
                    </span>
                  </div>
                </div>
                {/* Estimation No (manual entry) */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <span className="font-medium text-slate-600 w-24 sm:w-auto text-right">
                    Estimation No
                  </span>
                  <input
                    type="text"
                    value={formData.estimateManualNo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimateManualNo: e.target.value,
                      })
                    }
                    placeholder="Enter Estimation No"
                    className="w-40 sm:w-48 h-9 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none transition-colors"
                  />
                </div>
                {/* Estimation Date */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <span className="font-medium text-slate-600 w-24 sm:w-auto text-right">
                    Estimation Date
                  </span>
                  <div className="relative w-40 sm:w-48">
                    <DateInput
                      value={formData.date}
                      onChange={(v) =>
                        ((e) => {
                          fe.clearError("date");
                          fe.clearError("validUntil");
                          const newDate = e.target.value;
                          const days = Number(validUptoDays) || 30;
                          const d = new Date(
                            newDate || new Date().toISOString().split("T")[0],
                          );
                          d.setDate(d.getDate() + days);
                          const computedValidUntil = d
                            .toISOString()
                            .split("T")[0];
                          setFormData({
                            ...formData,
                            date: newDate,
                            validUntil: computedValidUntil,
                          });
                        })({ target: { value: v } } as any)
                      }
                      {...fieldAttr("date")}
                      heightClass="h-9"
                    />
                  </div>
                </div>
                <FormError message={fe.errors.date} />
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
                        gstType: determineGstType(e.target.value),
                      })
                    }
                    className="w-40 sm:w-48 h-9 px-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#33077C] rounded-lg text-xs font-semibold text-slate-800 outline-none cursor-pointer transition-colors"
                  >
                    {STATE_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st.replace(/^[0-9]+-/, "")}
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
                <FormError message={fe.errors.validUntil} />
              </div>
            </div>
            {/* 4. TAXATION & GST CONFIGURATION BAR + ITEMS TABLE */}
            <div className="mt-6 space-y-4">
              <GstConfigurationBar
                withGst={formData.withGst}
                gstType={formData.gstType}
                onToggleWithGst={handleToggleWithGst}
                onSetGstType={handleSetGstType}
                documentLabel="estimate"
              />

              <SalesDocumentItemsTable
                items={formData.items as SalesDocumentLineItem[]}
                withGst={formData.withGst}
                formErrors={fe.errors}
                liveStockErrors={liveStockErrors}
                openProductDropdownRow={openProductDropdownRow}
                setOpenProductDropdownRow={setOpenProductDropdownRow}
                productDropdownRef={productDropdownRef}
                productSearchQuery={productSearchQuery}
                setProductSearchQuery={setProductSearchQuery}
                productSearchTimerRef={productSearchTimerRef}
                isLoadingProducts={isLoadingProducts}
                hasProductsLoaded={liveProducts.length > 0}
                matchingProducts={matchingProducts}
                fetchLiveProducts={fetchLiveProducts}
                onOpenAddProductModal={(rowIdx) => {
                  setActiveItemRowIndex(rowIdx);
                  setIsAddItemModalOpen(true);
                }}
                onSelectProduct={handleSelectProduct}
                onClearProduct={handleClearProductRow}
                onProductNameChange={(rowIdx, val) =>
                  handleRowChange(rowIdx, "productName", val)
                }
                getBatchesForRow={(item) => {
                  const hookBatches = batchStock.getBatches(item.productId);
                  if (hookBatches.length > 0) return hookBatches;
                  const matchedProduct = availableProducts.find(
                    (s) =>
                      (item.productId &&
                        (s.productId === item.productId ||
                          s.id === item.productId)) ||
                      (item.productName &&
                        s.productName.toLowerCase() ===
                          item.productName.trim().toLowerCase()),
                  );
                  return (matchedProduct?.batches as any[]) || [];
                }}
                getBatchAvailable={(productId, batchNo) =>
                  batchStock.getAvailable(productId, batchNo)
                }
                onBatchChange={(rowIdx, batchNo) =>
                  handleRowChange(rowIdx, "batch", batchNo)
                }
                onUnitChange={(rowIdx, unit) =>
                  handleRowChange(rowIdx, "unit", unit)
                }
                onFieldChange={(rowIdx, field, val) =>
                  handleRowChange(rowIdx, field, val)
                }
                onAddRow={handleAddRow}
                onRemoveRow={handleRemoveRow}
                clearError={fe.clearError}
              />
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
                      placeholder="Enter quotation terms and conditions..."
                      className={FORM_TEXTAREA_CLS}
                    />
                  </div>
                )}

                {showDescriptionSection && (
                  <div className="p-3.5 bg-slate-50/70 border border-purple-100 rounded-xl space-y-1.5 animate-in fade-in duration-100">
                    <FormLabel>Quotation Description / Notes</FormLabel>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Add custom notes or delivery remarks for this estimate..."
                      className={FORM_TEXTAREA_CLS}
                    />
                  </div>
                )}

                {showImageSection && (
                  <ImageAttachmentBox
                    attachedImageName={attachedImageName}
                    onImageSelect={(fileName) => setAttachedImageName(fileName)}
                    onImageClear={() => setAttachedImageName(null)}
                  />
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

              {/* Right Column: GST Tax Breakdown, Round Off & Grand Total */}
              <div className="lg:col-span-5 flex justify-end">
                <SalesDocumentSummaryPanel
                  withGst={formData.withGst}
                  gstType={formData.gstType}
                  subtotal={formCalculations.rawSubtotal}
                  totalDiscount={formCalculations.totalDiscount}
                  taxableAmount={formCalculations.taxableAmount}
                  cgst={formCalculations.cgst}
                  sgst={formCalculations.sgst}
                  igst={formCalculations.igst}
                  totalTax={formCalculations.totalTax}
                  roundOff={formCalculations.roundOffDiff}
                  grandTotal={formCalculations.grandTotal}
                  enableRoundOff={enableRoundOff}
                  onToggleRoundOff={(checked) => {
                    setEnableRoundOff(checked);
                    if (!checked) setManualRoundOff(0);
                    else setManualRoundOff(null);
                  }}
                  onManualRoundOffChange={(val) => setManualRoundOff(val)}
                />
              </div>
            </div>
          </div>

          {/* 6. BOTTOM ACTION FOOTER (CRM THEME) */}
          <div className="flex items-center justify-end gap-3 pt-6 mt-8 border-t border-slate-200">
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
                        `Estimate Quotation from YAA Mart\nQuotation: ${formData.quotationNo}\nParty: ${formData.partyName}\nAmount: ₹${formCalculations.grandTotal}`,
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
                        `Estimate Quotation ${formData.quotationNo}`,
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
              form="quotation-form"
              icon={<Check className="w-4 h-4 text-white stroke-[3]" />}
            >
              Save
            </Button>
          </div>
        </form>

        {/* Full Add Customer Modal from Customer Page in Sales Hub */}
        {isAddCustomerModalOpen && (
          <AddCustomerModal
            isOpen={isAddCustomerModalOpen}
            onClose={() => setIsAddCustomerModalOpen(false)}
            onCustomerCreated={(newCust) => {
              setFormData((prev) => ({
                ...prev,
                customerId: newCust.id,
                partyName: newCust.name,
                customerPhone: newCust.phone || "",
                customerEmail: newCust.email || "",
                customerCompany: newCust.company || "",
                billingAddress: newCust.billingAddress || newCust.address || "",
                shippingAddress:
                  newCust.shippingAddress ||
                  newCust.billingAddress ||
                  newCust.address ||
                  "",
                ...(() => {
                  const nextState = newCust.state
                    ? STATE_OPTIONS.find((s) =>
                        s.toLowerCase().includes(newCust.state!.toLowerCase()),
                      ) || prev.stateOfSupply
                    : prev.stateOfSupply;
                  return {
                    stateOfSupply: nextState,
                    gstType: determineGstType(nextState),
                  };
                })(),
              }));
              setCustomers([
                newCust,
                ...customers.filter((c) => c.id !== newCust.id),
              ]);
              setIsAddCustomerModalOpen(false);
            }}
          />
        )}

        {/* Add Item / Product Modal from Inventory */}
        {isAddItemModalOpen && (
          <AddItemModal
            isOpen={isAddItemModalOpen}
            onClose={() => {
              setIsAddItemModalOpen(false);
              setActiveItemRowIndex(null);
            }}
            onProductCreated={(newProduct) => {
              const effProduct = {
                ...newProduct,
                productId: newProduct.id,
                productName: newProduct.productName || newProduct.name,
                sku: newProduct.productCode || newProduct.sku,
                unitPrice: newProduct.salePrice || newProduct.unitPrice || 0,
                batches: newProduct.batchNo
                  ? [{ batchNo: newProduct.batchNo }]
                  : [],
              };
              setLiveProducts((prev) => [effProduct, ...prev]);
              if (
                activeItemRowIndex !== null &&
                activeItemRowIndex >= 0 &&
                activeItemRowIndex < formData.items.length
              ) {
                handleSelectProduct(activeItemRowIndex, effProduct);
              }
              fetchLiveProducts();
              setIsAddItemModalOpen(false);
              setActiveItemRowIndex(null);
            }}
          />
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
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-[220px] flex-1">
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
              Create, track, and convert sales quotations & estimates into
              confirmed invoices.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
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

          {/* Print Report Button */}
          <Button
            variant="secondary"
            size="md"
            icon={<Printer className="w-4 h-4 text-slate-600" />}
            onClick={handlePrintTableReport}
            className="hover:border-purple-300 transition-colors"
          >
            Print Report
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
              ₹{" "}
              {cardMetrics.totalAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {cardMetrics.totalCount} quotations generated
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
              ₹{" "}
              {cardMetrics.openAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {cardMetrics.openCount} awaiting customer confirmation
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
              ₹{" "}
              {cardMetrics.convertedAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {cardMetrics.convertedCount} successfully converted
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
            fetchQuotations(1, pageSize, trimmed, pendingStatus, pendingPeriod);
          }
        }}
        onReset={() => {
          setPendingSearch("");
          setAppliedSearch("");
          setPendingPeriod("all");
          setAppliedPeriod("all");
          setPendingStatus("ALL");
          setAppliedStatus("ALL");
          setPage(1);
          fetchQuotations(1, pageSize, "", "ALL", "all");
        }}
        placeholder="Search by customer name, estimate #..."
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
              Total Quotations :{" "}
              <span className="text-[#33077C] font-bold">
                {metrics.totalCount}
              </span>
            </span>
          </div>
        }
      />

      {/* 4. Estimates & Quotations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            {/* Table Purple Themed Header with Standard Icons */}
            <CommonTableHead
              columns={[
                { label: "ESTIMATE ID", align: "center", minWidth: "140px" },
                { label: "ESTIMATE NO.", align: "center", minWidth: "130px" },
                { label: "CUSTOMER NAME", align: "left", minWidth: "200px" },
                {
                  label: "CREATED DATE & TIME",
                  align: "left",
                  minWidth: "140px",
                },
                {
                  label: "CONVERTED DATE & TIME",
                  align: "left",
                  minWidth: "140px",
                },
                { label: "AMOUNT", align: "right", minWidth: "120px" },
                { label: "BALANCE", align: "right", minWidth: "120px" },
                { label: "STATUS", align: "center", minWidth: "110px" },
                { label: "ACTIONS", align: "center", minWidth: "190px" },
              ]}
            />
            <tbody className="divide-y divide-slate-200 text-xs sm:text-[13px] text-slate-700">
              {isApiLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-16 text-center text-slate-500 font-medium"
                  >
                    <div className="inline-flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#33077C]" />
                      <span className="text-xs">
                        Fetching quotations from Commerce API...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : pagedQuotations.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    No estimate / quotation transactions found. Click "+ Add
                    Estimate" to create one.
                  </td>
                </tr>
              ) : (
                pagedQuotations.map((item) => {
                  const isConvertOpen = activeConvertDropdownId === item.id;
                  const isActionOpen = activeDropdownId === item.id;
                  const itemStages = getQuotationStages(item);
                  const resolvedCustomerCode =
                    item.customerCode ||
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
                    (item.customerId &&
                    !item.customerId.startsWith("cust_") &&
                    item.customerId.length > 5
                      ? item.customerId.slice(0, 8).toUpperCase()
                      : "");
                  const createdDt = formatDateTime(item.createdAt || item.date);
                  const isActuallyConverted = Boolean(
                    item.convertedAt ||
                    item.convertedToInvoiceNo ||
                    item.convertedToId ||
                    itemStages.isFullyConverted ||
                    (item.status === "Converted" &&
                      (itemStages.isInvoiceConverted ||
                        itemStages.isOrderConverted ||
                        itemStages.isChallanConverted ||
                        itemStages.isProformaConverted)),
                  );
                  const convertedDt = isActuallyConverted
                    ? formatDateTime(
                        item.convertedAt ||
                          (item.status === "Converted" &&
                          item.updatedAt !== item.createdAt
                            ? item.updatedAt
                            : null),
                      )
                    : null;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-50/30 transition-colors border-b border-slate-200"
                    >
                      {/* 1. Estimate / Quotation Code (from backend) */}
                      <td className="py-3.5 px-3 font-bold text-slate-800 text-center border-r border-slate-200 whitespace-nowrap align-middle">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span>{item.quotationNo || "—"}</span>
                          <DocumentLineageBadges
                            docRef={item.quotationNo}
                            currentType="Estimate"
                            targetDocNo={
                              resolveConvertedTarget(item)?.no ||
                              (item.status === "Converted"
                                ? downstreamByEstimate[
                                    (item.quotationNo || "")
                                      .trim()
                                      .toLowerCase()
                                  ]?.no
                                : undefined)
                            }
                            targetDocType={
                              resolveConvertedTarget(item)?.type ||
                              (item.status === "Converted"
                                ? downstreamByEstimate[
                                    (item.quotationNo || "")
                                      .trim()
                                      .toLowerCase()
                                  ]?.type
                                : undefined)
                            }
                            className="justify-center"
                          />
                        </div>
                      </td>

                      {/* 1b. Estimate No. (manual number entered by user) */}
                      <td className="py-3.5 px-3 font-semibold text-slate-700 text-center border-r border-slate-200 whitespace-nowrap align-middle">
                        {item.estimateManualNo || "—"}
                      </td>

                      {/* 2. Customer Name with Customer ID */}
                      <td className="py-3.5 px-3 sm:px-5 font-semibold text-slate-900 border-r border-slate-200 break-words align-middle">
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
                          <div>
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold font-mono tracking-tight">
                              <Phone className="w-3 h-3 text-[#33077C] shrink-0" />
                              {item.customerPhone}
                            </span>
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
                      <td className="py-3.5 px-3 sm:px-4 text-right font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap align-middle">
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

                      {/* Status (placed just before the Actions column) */}
                      <td className="py-3.5 px-3 sm:px-4 text-center border-r border-slate-200 whitespace-nowrap align-middle">
                        <div className="flex items-center justify-center">
                          {item.status === "Open" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Open
                            </span>
                          ) : item.status === "Converted" ? (
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
                        </div>
                      </td>

                      {/* 7. Actions */}
                      <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap align-middle min-w-[190px] w-48">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Convert Action Button slot with fixed width */}
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
                                title={`Quotation has been converted (${item.convertedToInvoiceNo || "Converted"})`}
                                className="text-xs sm:text-[13px] font-semibold text-emerald-700 bg-emerald-50/90 border border-emerald-200/90 px-2 py-1 rounded cursor-not-allowed select-none flex items-center justify-center gap-1 opacity-80"
                              >
                                <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                                <span>Converted</span>
                              </button>
                            ) : (
                              <div className="quotation-convert-dropdown-container relative inline-block text-left">
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
                                    }
                                  }}
                                  className="text-xs sm:text-[13px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-transparent hover:bg-blue-50/60 flex items-center justify-center gap-1 px-1.5 py-1 rounded transition-colors cursor-pointer select-none"
                                >
                                  <span>Convert</span>
                                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>

                                {/* Convert Floating Dropdown Menu - Converted stages are hidden */}
                                {isConvertOpen && convertDropdownPos && (
                                  <div
                                    style={{
                                      position: "fixed",
                                      top: `${convertDropdownPos.top}px`,
                                      right: `${convertDropdownPos.right}px`,
                                      zIndex: 9999,
                                    }}
                                    className="quotation-convert-dropdown-menu min-w-[260px] w-max bg-white rounded-xl shadow-2xl border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-left font-sans"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {!itemStages.isProformaConverted && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenConvertModal(
                                            item,
                                            "Proforma",
                                          )
                                        }
                                        className="w-full text-left px-3 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-3"
                                      >
                                        <ActionIconBadge variant="convert" />
                                        <span>Convert to Proforma</span>
                                      </button>
                                    )}
                                    {!itemStages.isOrderConverted && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenConvertModal(item, "Order")
                                        }
                                        className="w-full text-left px-3 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-3"
                                      >
                                        <ActionIconBadge variant="order" />
                                        <span>Convert to Sale Order</span>
                                      </button>
                                    )}

                                    {!itemStages.isChallanConverted && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenConvertModal(
                                            item,
                                            "Challan",
                                          )
                                        }
                                        className="w-full text-left px-3 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-3"
                                      >
                                        <ActionIconBadge variant="challan" />
                                        <span>Convert to Delivery Challan</span>
                                      </button>
                                    )}

                                    {!itemStages.isInvoiceConverted && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenConvertModal(
                                            item,
                                            "Invoice",
                                          )
                                        }
                                        className="w-full text-left px-3 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-3"
                                      >
                                        <ActionIconBadge variant="invoice" />
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
                            getShareData={() =>
                              formatEstimateQuotationShare(item)
                            }
                            title="Share Estimate / Quotation"
                          />

                          {/* 3-Dots Action Menu Button */}
                          <SaleActionDropdown
                            items={[
                              {
                                label: "View/Edit",
                                variant: "edit",
                                onClick: () => handleOpenEditForm(item),
                              },
                              {
                                label: "Duplicate",
                                variant: "duplicate",
                                onClick: () => handleDuplicate(item),
                              },
                              {
                                label: "Print Quotation",
                                variant: "print",
                                onClick: () => handlePrintQuotation(item),
                              },
                              {
                                label: "Download Estimate",
                                variant: "download",
                                onClick: () => handleDownloadQuotation(item),
                              },
                              {
                                label: "Mark as Cancelled",
                                variant: "cancel",
                                hidden: item.status !== "Open",
                                onClick: () =>
                                  handleUpdateQuotationStatus(
                                    item,
                                    "Cancelled",
                                  ),
                              },
                              {
                                label: "Mark as Open",
                                variant: "activate",
                                hidden: item.status !== "Cancelled",
                                onClick: () =>
                                  handleUpdateQuotationStatus(item, "Open"),
                              },
                              {
                                label: "Delete",
                                variant: "delete",
                                onClick: () =>
                                  handleDelete(item.id, item.quotationNo),
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

      {/* 5. Pagination */}
      <Pagination
        currentPage={safePage}
        total={metrics.totalCount}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setPage(1);
        }}
      />

      {/* 6. Preview Modal */}
      {previewQuotation && (
        <Modal
          isOpen={Boolean(previewQuotation)}
          onClose={() => setPreviewQuotation(null)}
          title={`Estimate Preview - ${previewQuotation.quotationNo}`}
          maxWidth="3xl"
          subtitle="Estimate details, line items, and totals"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setPreviewQuotation(null)}
        >
          <div className="p-1 sm:p-2 space-y-5 text-slate-800">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#33077C]">
                  {companyProfile.companyName}
                </h3>
                <p className="text-xs text-slate-500">Estimate / Quotation</p>
                <div className="mt-2 text-xs">
                  <strong>Customer: </strong>
                  {previewQuotation.partyName}
                  {previewQuotation.customerCompany &&
                    ` (${previewQuotation.customerCompany})`}
                </div>
              </div>
              <div className="sm:text-right text-xs">
                <div className="font-mono text-xl sm:text-2xl font-black text-[#33077C] tracking-tight">
                  #{previewQuotation.quotationNo}
                </div>
                {previewQuotation.estimateManualNo && (
                  <div className="text-slate-600 font-semibold mt-0.5">
                    Estimate No: {previewQuotation.estimateManualNo}
                  </div>
                )}
                <div className="text-slate-500 mt-1">
                  Date: {isoToDdmmyyyy(previewQuotation.date)}
                </div>
                <div className="mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                    {previewQuotation.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[480px] text-xs">
                <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-2.5 text-left text-white">Item</th>
                    <th className="p-2.5 text-center w-28 text-white">
                      Batch No
                    </th>
                    <th className="p-2.5 text-center w-16 text-white">Qty</th>
                    <th className="p-2.5 text-right w-24 text-white">
                      Rate (₹)
                    </th>
                    <th className="p-2.5 text-right w-28 text-white">
                      Amount (₹)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewQuotation.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-semibold text-slate-800">
                        {it.productName}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-[#33077C]">
                        {it.batch || "—"}
                      </td>
                      <td className="p-2.5 text-center">{it.quantity}</td>
                      <td className="p-2.5 text-right">
                        ₹{Number(it.unitPrice).toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right font-bold">
                        ₹{Number(it.total).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-end pt-2">
              <div className="text-right space-y-1 text-xs">
                <div className="text-slate-600">
                  Subtotal:{" "}
                  <strong>₹{previewQuotation.subtotal.toLocaleString()}</strong>
                </div>
                {previewQuotation.discount ? (
                  <div className="text-slate-600">
                    Discount:{" "}
                    <strong>
                      -₹{Number(previewQuotation.discount).toLocaleString()}
                    </strong>
                  </div>
                ) : null}
                {previewQuotation.taxAmount ? (
                  <div className="text-slate-600">
                    Tax:{" "}
                    <strong>
                      ₹{previewQuotation.taxAmount.toLocaleString()}
                    </strong>
                  </div>
                ) : null}
                <div className="text-base font-extrabold text-[#33077C] pt-1 border-t border-slate-200">
                  Grand Total: ₹{previewQuotation.amount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
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
                <div className="font-bold text-slate-800 text-sm">
                  {convertTargetQuotation.partyName}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Quotation:{" "}
                  <span className="font-semibold text-slate-700">
                    {convertTargetQuotation.quotationNo}
                  </span>{" "}
                  | Date: {isoToDdmmyyyy(convertTargetQuotation.date)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  Total Amount
                </div>
                <div className="text-base font-extrabold text-[#33077C]">
                  ₹{" "}
                  {convertTargetQuotation.amount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>

            {/* Target Type Selector - Converted stages are hidden */}
            {(() => {
              const modalStages = getQuotationStages(convertTargetQuotation);
              const availableOpts = [
                {
                  type: "Invoice" as const,
                  label: "Sale Invoice",
                  icon: ShoppingCart,
                  desc: "Deducts stock",
                  isConverted: modalStages.isInvoiceConverted,
                },
                {
                  type: "Challan" as const,
                  label: "Delivery Challan",
                  icon: Truck,
                  desc: "Transport dispatch",
                  isConverted: modalStages.isChallanConverted,
                },
                {
                  type: "Order" as const,
                  label: "Sale Order",
                  icon: FileCheck,
                  desc: "Order workflow",
                  isConverted: modalStages.isOrderConverted,
                },
                {
                  type: "Proforma" as const,
                  label: "Proforma",
                  icon: FileSpreadsheet,
                  desc: "Draft / Quote",
                  isConverted: modalStages.isProformaConverted,
                },
              ].filter((opt) => !opt.isConverted);

              const targetTypeLabel =
                convertType === "Challan"
                  ? "Delivery Challan"
                  : convertType === "Invoice"
                    ? "Sale Invoice"
                    : convertType === "Order"
                      ? "Sale Order"
                      : "Proforma";

              return (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      Convert To Document Type{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    {availableOpts.length === 0 ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-center text-xs">
                        All document conversion stages have already been
                        completed for this quotation.
                      </div>
                    ) : (
                      <div
                        className={`grid gap-2.5 ${availableOpts.length === 1 ? "grid-cols-1" : availableOpts.length === 2 ? "grid-cols-2" : availableOpts.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}
                      >
                        {availableOpts.map((opt) => {
                          const Icon = opt.icon;
                          const isSelected = convertType === opt.type;
                          return (
                            <button
                              key={opt.type}
                              type="button"
                              onClick={() => setConvertType(opt.type)}
                              className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? "border-[#33077C] bg-purple-50/50 text-[#33077C] shadow-xs"
                                  : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <Icon
                                  className={`w-4 h-4 ${isSelected ? "text-[#33077C]" : "text-slate-500"}`}
                                />
                                <span className="font-bold text-xs">
                                  {opt.label}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {opt.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Due Date Picker */}
                  <div>
                    <FormLabel>Payment / Document Due Date</FormLabel>
                    <DateInput
                      value={convertDueDate}
                      onChange={(v) =>
                        ((e) => {
                          fe.clearError("convertDueDate");
                          setConvertDueDate(e.target.value);
                        })({ target: { value: v } } as any)
                      }
                      {...fieldAttr("convertDueDate")}
                    />
                    <FormError message={fe.errors.convertDueDate} />
                    <FormError message={fe.errors.convertStock} />
                    <FormError message={fe.errors._form} />
                    <p className="text-[11px] text-slate-500 mt-1 pl-1">
                      Specifies the settlement due date for the generated{" "}
                      {targetTypeLabel}.
                    </p>
                  </div>

                  {/* Information Notice */}
                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      Converting will record this quotation in the cross-module
                      sales lineage.
                      {convertType === "Invoice" &&
                        " Inventory stock will be automatically updated."}
                      {convertType === "Challan" &&
                        " Goods delivery challan will be created for transport dispatch."}
                      {convertType === "Order" &&
                        " Sale order will be recorded for fulfillment tracking."}
                      {convertType === "Proforma" &&
                        " Proforma invoice will be generated."}
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
                      disabled={isConverting || availableOpts.length === 0}
                      icon={
                        isConverting ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Check className="w-4 h-4 text-white" />
                        )
                      }
                    >
                      {isConverting
                        ? `Converting to ${targetTypeLabel}...`
                        : `Confirm & Convert to ${targetTypeLabel}`}
                    </Button>
                  </div>
                </>
              );
            })()}
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        variant="centered"
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingQuotation) {
            setIsDeleteModalOpen(false);
            setDeleteTargetQuotation(null);
            setDeleteQuotationError(null);
          }
        }}
        onConfirm={handleConfirmDeleteQuotation}
        entityName="Quotation"
        recordName={deleteTargetQuotation?.quotationNo}
        isLoading={isDeletingQuotation}
        error={deleteQuotationError}
      />
    </div>
  );
};

export default EstimateQuotationView;
