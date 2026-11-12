import { HistoryTimelineView } from "../../../components/common/HistoryTimelineView";
import { CommonTableHead } from "../../../components/common/CommonTableHead";
import { SupplierSearchableSelect } from "../../../components/common/paginated-select";
import { getNextPurchaseOrderNumber } from "../../../utils/documentNumbering";
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  ShoppingBag,
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
  Truck,
  Building2,
  Calendar,
  Layers,
  CreditCard,
  RotateCcw,
  MoreVertical,
  PackageCheck,
  Check,
  X,
  Percent,
  Tag,
  ArrowLeft,
  Forward,
  FileSpreadsheet,
  Loader2,
  ChevronDown,
  FileText,
  History,
  Download,
  Receipt,
} from "lucide-react";
import {
  PurchaseOrder,
  PurchaseProductItem,
  PurchaseStatus,
  PurchasePaymentStatus,
  PurchaseReturn,
  PurchaseReturnItem,
  PurchaseRequest,
  PaymentOut,
} from "../../../store/useSalesManagementStore";
import {
  workPurchaseOrderApi,
  mapApiPurchaseOrderToUi,
  mapUiToCreatePurchaseOrderPayload,
  mapUiToUpdatePurchaseOrderPayload,
  productApi,
  resolveBaseUnitId,
  ApiProduct,
  CreateProductPayload,
  supplierApi,
  ApiSupplier,
  stockApi,
  ApiStockBatch,
  UUID_REGEX,
  ensureValidUuid,
  commercePurchaseRequestApi,
  mapApiPurchaseRequestToUi,
  baseApi,
} from "../../../api";
import {
  workPaymentOutApi,
  mapApiPaymentOutToUi,
  mapUiToCreatePaymentOutPayload,
} from "../../../api/work/paymentOutApi";
import { useDispatch } from "react-redux";
import {
  commercePurchaseReturnApi,
  mapApiPurchaseReturnToUi,
} from "../../../api/commerce/purchaseReturnApi";
import { Badge } from "../../../components/common/Badge";
import {
  FormLabel,
  FORM_INPUT_CLS,
  FORM_SELECT_CLS,
  handleNonNegativeKeyDown,
} from "../utils/formUtils";
import { SaleActionDropdown } from "../utils";
import { Button } from "../../../components/common/Button";
import { Modal } from "../../../components/common/Modal";
import { DeleteConfirmationModal } from "../../../components/common/DeleteConfirmationModal";
import { Pagination } from "../../../components/common/Pagination";
import { SearchBar } from "../../../components/common/SearchBar";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { SearchableSelect } from "../../../components/common/SearchableSelect";
import { CustomSelect } from "../../../components/common/CustomSelect";
import { exportTableToExcel } from "../../../utils/excelExport";
import {
  UniversalShareDropdown,
  formatPurchaseOrderShare,
} from "../../../utils/shareUtils";
import {
  printBusinessDocument,
  printTableReport,
  downloadBusinessDocument,
  DocumentPrintOptions,
} from "../../../utils/printUtils";
import {
  calculateLineItem,
  calculateDocumentTotals,
  determineGstType,
  parseTaxRate,
  round2,
} from "../../../utils/financialCalculations";
import { toast } from "../../../utils/toast";
import { FormError } from "../../../components/common/FormError";
import {
  FieldErrors,
  checkRequiredText,
  checkRequiredSelection,
  checkRecordId,
  checkNumber,
  checkQuantity,
  checkMoney,
  checkPercent,
  checkRequiredDate,
  checkDateNotBefore,
  checkPaymentWithinBalance,
  checkTotalConsistency,
  checkGstSplit,
  checkHasLineItems,
  validateLineItems,
  collectErrors,
  useFieldErrors,
  useSubmitGuard,
  useRevalidateAfterSubmit,
  fieldAttr,
  focusField,
  extractApiFieldErrors,
  getApiErrorMessage,
} from "../../../utils/formValidation";
import { useNavigate, useLocation } from "react-router-dom";

import { formatDate } from "../utils/dateUtils";
import { SplitPaymentSection, makeSplitRowId } from "./SplitPaymentSection";
import {
  activeSplitRows,
  newSplitRow,
  splitRowToPaymentFields,
  summarizeSplit,
  validateSplit,
  SplitPaymentRow,
} from "../../../utils/splitPayments";
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

// -----------------------------------------------------------------------------
// Validation (pure functions - no API calls, no state changes)
// -----------------------------------------------------------------------------

interface PurchaseFormValidationContext {
  totals: {
    subtotal: number;
    discount: number;
    taxableAmount: number;
    tax: number;
    cgst: number;
    sgst: number;
    igst: number;
    roundOffAmount: number;
    grandTotal: number;
  };
  /** Date of the payment being recorded with this bill (falls back to the purchase date). */
  paymentDate: string;
  isEditing: boolean;
  /** "With Purchase Request" chosen, requests are available, but none selected. */
  requestSelectionMissing: boolean;
}

const fmtInr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Validates the whole purchase bill form. Returns a map of `fieldKey -> message` (empty when valid). */
const validatePurchaseForm = (
  form: {
    supplierId: string;
    purchaseDate: string;
    dueDate: string;
    items: PurchaseProductItem[];
    withGst: boolean;
    gstType: "intra_state" | "inter_state";
    shipping: number;
    otherCharges: number;
    paymentMethod: string;
    paidAmount: number;
  },
  ctx: PurchaseFormValidationContext,
): FieldErrors => {
  const errors: FieldErrors = {};
  const { totals } = ctx;

  if (ctx.requestSelectionMissing) {
    errors.purchaseRequest =
      'Please select a purchase request or switch to "Without Purchase Request".';
  }

  // Header
  const supplierErr = ctx.isEditing
    ? checkRequiredSelection(form.supplierId, "supplier")
    : checkRecordId(form.supplierId, "supplier");
  Object.assign(
    errors,
    collectErrors([
      ["supplierId", supplierErr],
      ["purchaseDate", checkRequiredDate(form.purchaseDate, "purchase date")],
      [
        "dueDate",
        checkDateNotBefore(form.dueDate, form.purchaseDate, "due date", "purchase date"),
      ],
    ]),
  );

  // Line items
  const lineInputs = form.items.map((it) => ({
    productId: it.productId,
    productName: it.productName,
    quantity: it.quantity,
    unitPrice: it.purchasePrice,
    discountPercent: it.discountPercent,
    discountAmount: it.discountAmount,
    taxPercent: form.withGst ? it.taxPercent : undefined,
  }));
  const noLines = checkHasLineItems(lineInputs);
  if (noLines) errors.items = "Please add at least one item before saving.";
  Object.assign(
    errors,
    validateLineItems(lineInputs, {
      priceKey: "unitPrice",
      allowZeroPrice: true, // free / sample items are allowed
    }),
  );
  form.items.forEach((it, i) => {
    const freeErr = checkNumber(it.freeQuantity, "free quantity", {
      allowZero: true,
      optional: true,
    });
    if (freeErr) errors[`items.${i}.freeQuantity`] = freeErr;
    const saleErr = checkMoney(it.salePrice, "sale price", {
      allowZero: true,
      optional: true,
    });
    if (saleErr) errors[`items.${i}.salePrice`] = saleErr;

    // The line total that will be submitted must match its own quantity/price/discount/GST.
    // (Skipped for saved bills: their stored totals come from the server and may legitimately differ.)
    if (
      !ctx.isEditing &&
      !errors[`items.${i}.quantity`] &&
      !errors[`items.${i}.price`]
    ) {
      const expected = calculateLineItem(
        {
          quantity: it.quantity,
          unitPrice: it.purchasePrice,
          discountPercent: it.discountPercent,
          discountAmount: it.discountAmount,
          taxPercent: it.taxPercent,
        },
        { withGst: form.withGst, gstType: form.gstType },
      ).lineTotal;
      const totalErr = checkTotalConsistency(expected, it.total, "line total", 0.02);
      if (totalErr) errors[`items.${i}.total`] = totalErr;
    }
  });

  // Charges
  Object.assign(
    errors,
    collectErrors([
      ["shipping", checkMoney(form.shipping, "shipping charge", { allowZero: true })],
      ["otherCharges", checkMoney(form.otherCharges, "other charges", { allowZero: true })],
    ]),
  );

  // Totals (only when the lines themselves are usable)
  const hasLineErrors = Object.keys(errors).some((k) => k.startsWith("items."));
  if (!hasLineErrors && form.items.length > 0) {
    const lineTolerance = 0.01 * form.items.length + 0.05;
    const expectedGrand =
      totals.taxableAmount +
      totals.tax +
      (Number(form.shipping) || 0) +
      (Number(form.otherCharges) || 0) +
      totals.roundOffAmount;
    const grandErr = checkTotalConsistency(
      Math.max(0, expectedGrand),
      totals.grandTotal,
      "grand total",
      lineTolerance,
    );
    const gstErr = checkGstSplit(
      { cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst, total: totals.tax },
      !form.withGst ? "exempt" : form.gstType === "intra_state" ? "intra" : "inter",
    );
    const discountErr =
      totals.discount < 0 || totals.discount > totals.subtotal + 0.005
        ? "The total discount cannot exceed the subtotal."
        : null;
    Object.assign(
      errors,
      collectErrors([
        ["totals", gstErr || discountErr || grandErr],
      ]),
    );
  }

  // Payment
  const paid = Number(form.paidAmount);
  const paidErr =
    checkMoney(form.paidAmount, "paid amount", { allowZero: true }) ||
    (Number.isFinite(paid) && paid > totals.grandTotal + 0.005
      ? `Paid amount cannot exceed the grand total of ${fmtInr(totals.grandTotal)}.`
      : null);
  if (paidErr) errors.paidAmount = paidErr;
  if (!paidErr && paid > 0) {
    const modeErr = checkRequiredSelection(form.paymentMethod, "payment mode");
    if (modeErr) errors.paymentMethod = modeErr;
    const dateErr = checkRequiredDate(ctx.paymentDate || form.purchaseDate, "payment date");
    if (dateErr) errors.paymentDate = dateErr;
  }

  return errors;
};

/** Validates the "Record Payment" modal inside the bill form. */
const validateFormPayment = (
  details: { amountPaid: number; date: string; paymentType: string },
  balanceLimit: number,
  limitLabel: string,
): FieldErrors => {
  const errors: FieldErrors = {};
  const amountErr =
    checkNumber(details.amountPaid, "payment amount", { maxDecimals: 2 }) ||
    checkPaymentWithinBalance(details.amountPaid, balanceLimit, limitLabel);
  if (amountErr) {
    errors.amountPaid =
      amountErr === "Payment amount must be greater than zero."
        ? "Please enter a payment amount greater than zero."
        : amountErr;
  }
  const dateErr = checkRequiredDate(details.date, "payment date");
  if (dateErr) errors.date = dateErr;
  const typeErr = checkRequiredSelection(details.paymentType, "payment type");
  if (typeErr) errors.paymentType = typeErr;
  return errors;
};

/** Validates the standalone "Disburse Payment" modal against the bill's outstanding balance. */
const validateRecordPayment = (
  amount: number,
  balance: number,
  method: string,
): FieldErrors => {
  const errors: FieldErrors = {};
  const amountErr =
    checkNumber(amount, "payment amount", { maxDecimals: 2 }) ||
    checkPaymentWithinBalance(amount, balance);
  if (amountErr) {
    errors.amount =
      amountErr === "Payment amount must be greater than zero."
        ? "Please enter a payment amount greater than zero."
        : amountErr;
  }
  const modeErr = checkRequiredSelection(method, "payment mode");
  if (modeErr) errors.method = modeErr;
  return errors;
};

/** Validates the quick "Add New Product" modal. */
const validateQuickProduct = (f: {
  productName: string;
  purchasePrice: string;
  salePrice: string;
}): FieldErrors =>
  collectErrors([
    ["productName", checkRequiredText(f.productName, "product name")],
    ["purchasePrice", checkMoney(f.purchasePrice, "purchase price", { allowZero: true })],
    ["salePrice", checkMoney(f.salePrice, "sale price", { allowZero: true })],
  ]);

/**
 * Checks a saved purchase order before a status action (receive / approve / order / cancel).
 * Returns a friendly sentence, or null when the action may proceed.
 */
const validateStatusChange = (
  po: PurchaseOrder,
  newStatus: "Pending" | "Approved" | "Ordered" | "Received" | "Cancelled",
): string | null => {
  const current = po.purchaseStatus as string;
  if (current === newStatus) {
    return `This purchase order is already ${newStatus.toLowerCase()}.`;
  }
  if (current === "Received" || current === "Completed") {
    return "Received purchase orders are final and cannot be changed.";
  }
  if (current === "Cancelled") {
    return "Cancelled purchase orders cannot be changed.";
  }
  if (newStatus === "Approved" && current !== "Pending") {
    return "Only pending purchase orders can be approved.";
  }
  if (newStatus === "Ordered" && current !== "Pending" && current !== "Approved") {
    return "Only pending or approved purchase orders can be marked as ordered.";
  }
  if (newStatus === "Received") {
    if (!po.items || po.items.length === 0) {
      return "This purchase order has no items to receive.";
    }
    const supplierErr = checkRequiredSelection(po.supplierId, "supplier");
    if (supplierErr) return "This purchase order has no supplier. Please edit it and choose a supplier first.";
    for (let i = 0; i < po.items.length; i++) {
      const it = po.items[i];
      const name = it.productName || `item ${i + 1}`;
      if (checkRequiredSelection(it.productId, "product")) {
        return `Please choose the product from the list for "${name}" before receiving stock.`;
      }
      if (UUID_REGEX.test(po.id) && checkRecordId(it.productId, "product")) {
        return `Please choose the product from the list for "${name}" before receiving stock.`;
      }
      if (!(Number(it.quantity) > 0)) {
        return `Quantity must be greater than zero for "${name}" before receiving stock.`;
      }
    }
  }
  return null;
};

/** Maps backend field paths (`items.0.unitCost`) onto this form's field keys. */
const mapPurchaseApiFieldKey = (path: string): string => {
  const m = path.match(/^items\.(\d+)\.(.+)$/);
  if (m) {
    const map: Record<string, string> = {
      productId: "product",
      quantity: "quantity",
      unitCost: "price",
      unitPrice: "price",
      purchasePrice: "price",
      taxPercent: "taxPercent",
      discountPercent: "discountPercent",
      discountAmount: "discountAmount",
    };
    return `items.${m[1]}.${map[m[2]] || m[2]}`;
  }
  const top: Record<string, string> = {
    supplierId: "supplierId",
    dueDate: "dueDate",
    expectedDeliveryDate: "dueDate",
    purchaseDate: "purchaseDate",
    paidAmount: "paidAmount",
    discountAmount: "totals",
    amount: "amount",
  };
  return top[path] || path;
};

// Payment terms offered on a purchase bill: 15 to 120 days.
const PAYMENT_TERM_DAYS = [15, 30, 45, 60, 90, 120];
const PAYMENT_TERM_OPTIONS = PAYMENT_TERM_DAYS.map((d) => `Net ${d} Days`);

/**
 * Maps a stored term ("30 Days" on the supplier master, "Net 30 Days" on a bill) onto one of the
 * offered options. Anything else (e.g. "Immediate / Advance") is returned unchanged.
 */
const toBillPaymentTerms = (value?: string | null): string => {
  const raw = String(value || "").trim();
  const match = raw.match(/(\d+)\s*day/i);
  if (match && PAYMENT_TERM_DAYS.includes(Number(match[1]))) return `Net ${Number(match[1])} Days`;
  return raw;
};

export const PurchaseOrderView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  // Inline validation state (one error map per form / modal) and double-submit guards
  const formErr = useFieldErrors(); // purchase bill form
  const formPayErr = useFieldErrors(); // "Record Payment" modal inside the bill form
  const recordPayErr = useFieldErrors(); // "Disburse Payment" modal on the list
  const quickProdErr = useFieldErrors(); // quick "Add New Product" modal
  const saveGuard = useSubmitGuard();
  const statusGuard = useSubmitGuard();
  const paymentGuard = useSubmitGuard();
  const quickProductGuard = useSubmitGuard();
  const deleteGuard = useSubmitGuard();
  const convertGuard = useSubmitGuard();

  // Purchase Type State (With Purchase Request vs Without Purchase Request)
  const [purchaseType, setPurchaseType] = useState<
    "with_request" | "without_request"
  >("without_request");
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [availableRequests, setAvailableRequests] = useState<PurchaseRequest[]>(
    [],
  );
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Tracking for converted Purchase Request (so Commerce PATCH /status is only called upon Save Purchase Bill)
  const [originatingRequestId, setOriginatingRequestId] = useState<
    string | null
  >(null);
  const hasConvertedRef = useRef(false);

  // Live API Integration State
  const [livePurchases, setLivePurchases] = useState<PurchaseOrder[]>([]);

  // Computed next preview number based on currently loaded purchase bills / orders
  const computedPreviewNo = useMemo(() => {
    return getNextPurchaseOrderNumber(livePurchases);
  }, [livePurchases]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [apiSummary, setApiSummary] = useState<NonNullable<import("../../../api/work/purchaseOrderTypes").PurchaseOrderListResponse["summary"]> | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<ApiProduct[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [availableSuppliers, setAvailableSuppliers] = useState<ApiSupplier[]>(
    [],
  );
  const [availableBatches, setAvailableBatches] = useState<ApiStockBatch[]>([]);
  const [customBatchRows, setCustomBatchRows] = useState<
    Record<number, boolean>
  >({});

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [historyPurchase, setHistoryPurchase] = useState<PurchaseOrder | null>(
    null,
  );
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedPurchase, setSelectedPurchase] =
    useState<PurchaseOrder | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetPo, setDeleteTargetPo] = useState<PurchaseOrder | null>(
    null,
  );
  const [isDeletingPo, setIsDeletingPo] = useState(false);
  const [deletePoError, setDeletePoError] = useState<string | null>(null);

  const handleOpenHistory = async (po: PurchaseOrder) => {
    setActiveDropdownId(null);
    setHistoryPurchase(po);
    setIsLoadingHistory(true);
    try {
      if (po.id) {
        const res = await workPurchaseOrderApi.getPurchaseOrderById(po.id);
        if (res?.data) {
          const fresh = mapApiPurchaseOrderToUi(res.data);
          setHistoryPurchase(fresh);
        }
      }
    } catch (err) {
      console.warn("Failed to load purchase order history from API:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  const [editingPurchase, setEditingPurchase] = useState<PurchaseOrder | null>(
    null,
  );

  // Payment Recording State
  const [recordAmount, setRecordAmount] = useState<number>(0);
  const [recordMethod, setRecordMethod] = useState<
    "Cash" | "UPI" | "Card" | "Bank Transfer" | "Credit" | "Other"
  >("Bank Transfer");
  const [recordNotes, setRecordNotes] = useState("");

  // Form Payment Modal State (for recording payment directly inside Create / Edit Purchase form)
  const [isFormPaymentModalOpen, setIsFormPaymentModalOpen] = useState(false);
  const [formPaymentDetails, setFormPaymentDetails] = useState<{
    amountPaid: number;
    date: string;
    paymentType: string;
    transactionId: string;
    remarks: string;
  }>({
    amountPaid: 0,
    date: new Date().toISOString().split("T")[0],
    paymentType: "",
    transactionId: "",
    remarks: "",
  });

  // Split payment (Single / Split mode in the Billing Summary). In an existing bill the rows are ADDITIONAL payments.
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitPaymentRow[]>(() => [newSplitRow(makeSplitRowId())]);
  const [splitShowErrors, setSplitShowErrors] = useState(false);

  // Quick Add Product Modal state
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [addProductTargetRowIdx, setAddProductTargetRowIdx] = useState<
    number | null
  >(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [quickProductForm, setQuickProductForm] = useState({
    productName: "",
    productCode: "",
    category: "General",
    unit: "PCS",
    purchasePrice: "",
    salePrice: "",
    taxRate: "None",
    hsnCode: "",
  });

  const handleOpenAddProductModal = (targetRowIndex: number | null = null) => {
    setAddProductTargetRowIdx(targetRowIndex);
    quickProdErr.reset();
    setQuickProductForm({
      productName: "",
      productCode: "",
      category: "General",
      unit: "PCS",
      purchasePrice: "",
      salePrice: "",
      taxRate: "None",
      hsnCode: "",
    });
    setIsAddProductModalOpen(true);
  };

  const handleSaveQuickProduct = () =>
    quickProductGuard.runOnce(async () => {
      // Validate first: nothing is sent to the API unless every field is valid.
      if (!quickProdErr.validateAll(validateQuickProduct(quickProductForm))) {
        return;
      }
      await performSaveQuickProduct();
    });

  const performSaveQuickProduct = async () => {
    const purchasePriceNum = Number(quickProductForm.purchasePrice) || 0;
    const salePriceNum = Number(quickProductForm.salePrice) || 0;

    setIsCreatingProduct(true);
    try {
      let baseUnitId: string | undefined = undefined;
      const resolved = await resolveBaseUnitId(quickProductForm.unit || "PCS");
      if (resolved) {
        baseUnitId = resolved.baseUnitId;
      }

      const payload: CreateProductPayload = {
        itemType: "Product",
        productName: quickProductForm.productName.trim(),
        productCode: quickProductForm.productCode.trim() || undefined,
        category: quickProductForm.category.trim() || "General",
        unit: quickProductForm.unit || resolved?.unitCode || "PCS",
        baseUnitId,
        purchasePrice: purchasePriceNum,
        salePrice: salePriceNum,
        taxRate: quickProductForm.taxRate,
        hsnCode: quickProductForm.hsnCode.trim() || undefined,
        openingStock: 0,
        status: "Active",
      };

      const res = await productApi.createProduct(payload);
      if (res && res.data) {
        const newProd = res.data;
        setAvailableProducts((prev) => [newProd, ...prev]);

        setFormData((prev) => {
          const items = [...prev.items];
          let targetIdx = addProductTargetRowIdx;
          if (
            targetIdx === null ||
            targetIdx < 0 ||
            targetIdx >= items.length
          ) {
            const emptyIdx = items.findIndex((it) => !it.productId);
            if (emptyIdx >= 0) {
              targetIdx = emptyIdx;
            } else {
              targetIdx = items.length;
              items.push({
                id: `po_it_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                productId: "",
                productName: "",
                batch: "",
                quantity: 1,
                freeQuantity: 0,
                unit: "NONE",
                packingUnit: "",
                expDate: "",
                purchasePrice: 0,
                salePrice: 0,
                discountPercent: 0,
                discountAmount: 0,
                taxPercent: 18,
                total: 0,
              });
            }
          }

          const currentItem = { ...items[targetIdx] };
          currentItem.productId = newProd.id;
          currentItem.productName = newProd.productName;
          currentItem.purchasePrice = purchasePriceNum;
          currentItem.salePrice = salePriceNum;
          currentItem.unit = newProd.unit || "PCS";
          currentItem.quantity = currentItem.quantity || 1;

          const taxMatch = String(
            newProd.taxRate || quickProductForm.taxRate,
          ).match(/(\d+(\.\d+)?)/);
          if (taxMatch) {
            currentItem.taxPercent = parseFloat(taxMatch[1]);
          }

          const sub = (currentItem.quantity || 1) * purchasePriceNum;
          const disc =
            currentItem.discountAmount !== undefined &&
            currentItem.discountAmount > 0
              ? currentItem.discountAmount
              : sub * ((currentItem.discountPercent || 0) / 100);
          const tax = prev.withGst
            ? (sub - disc) * ((currentItem.taxPercent || 18) / 100)
            : 0;
          currentItem.total = Math.round((sub - disc + tax) * 100) / 100;

          items[targetIdx] = currentItem;
          return { ...prev, items };
        });

        toast.success(
          `Product "${newProd.productName}" created and added to bill!`,
        );
        setIsAddProductModalOpen(false);
      }
    } catch (err: any) {
      console.error("Failed to create product from purchase bill:", err);
      const apiFields = extractApiFieldErrors(err);
      const mapped: FieldErrors = {};
      Object.entries(apiFields).forEach(([k, msg]) => {
        const key = k === "name" ? "productName" : k;
        if (["productName", "purchasePrice", "salePrice"].includes(key)) {
          mapped[key] = msg;
        }
      });
      if (Object.keys(mapped).length > 0) quickProdErr.merge(mapped);
      toast.error(
        getApiErrorMessage(
          err,
          "We could not create the product. Please try again.",
        ),
      );
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState<{
    purchaseNo: string;
    purchaseInvoiceNo: string;
    purchaseBillManualNo: string;
    supplierId: string;
    supplierName: string;
    purchaseDate: string;
    dueDate: string;
    items: PurchaseProductItem[];
    withGst: boolean;
    gstType: "intra_state" | "inter_state";
    shipping: number;
    otherCharges: number;
    paymentMethod: string;
    paymentTerms: string;
    paidAmount: number;
    purchaseStatus: PurchaseStatus;
    roundMode: "none" | "up" | "down";
    notes: string;
  }>({
    purchaseNo: "",
    purchaseInvoiceNo: "",
    purchaseBillManualNo: "",
    supplierId: "",
    supplierName: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    items: [],
    withGst: true,
    gstType: "intra_state",
    shipping: 0,
    otherCharges: 0,
    paymentMethod: "Cash",
    paymentTerms: "Net 30 Days",
    paidAmount: 0,
    purchaseStatus: "Pending",
    roundMode: "none",
    notes: "",
  });

  // On-demand master data loader for form modal (products, suppliers, batches, purchase requests)
  // ONLY loaded when the user actually opens the Create / Edit purchase bill form modal.
  const hasLoadedFormMasterDataRef = useRef(false);
  const loadFormMasterData = useCallback(async () => {
    if (hasLoadedFormMasterDataRef.current) return;
    hasLoadedFormMasterDataRef.current = true;

    try {
      setIsLoadingRequests(true);
      const [suppRes, stockBatchRes, prRes, prodRes] = await Promise.allSettled(
        [
          supplierApi.getSuppliers({
            page_size: 100,
            pagination_required: false,
          }),
          stockApi.getStockBatches({
            page_size: 100,
            pagination_required: false,
          }),
          commercePurchaseRequestApi.getPurchaseRequests({
            page_size: 100,
            pagination_required: false,
          }),
          productApi.getProducts({
            page_size: 100,
            pagination_required: false,
          }),
        ],
      );

      if (
        suppRes.status === "fulfilled" &&
        suppRes.value?.data &&
        Array.isArray(suppRes.value.data)
      ) {
        setAvailableSuppliers(suppRes.value.data);
      }
      if (
        stockBatchRes.status === "fulfilled" &&
        stockBatchRes.value?.data &&
        Array.isArray(stockBatchRes.value.data)
      ) {
        setAvailableBatches(stockBatchRes.value.data);
      }
      if (
        prRes.status === "fulfilled" &&
        prRes.value?.data &&
        Array.isArray(prRes.value.data)
      ) {
        setAvailableRequests(prRes.value.data.map(mapApiPurchaseRequestToUi));
      }
      if (
        prodRes.status === "fulfilled" &&
        prodRes.value?.data &&
        Array.isArray(prodRes.value.data)
      ) {
        setAvailableProducts(prodRes.value.data);
      }
    } catch (err) {
      console.warn("Error loading form master data in Purchase Bills:", err);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  // Trigger form master data ONLY when the form modal is active
  useEffect(() => {
    if (isFormModalOpen) {
      loadFormMasterData();
    }
  }, [isFormModalOpen, loadFormMasterData]);

  // On-demand product search: calls products API when user is searching or opening product selector
  const handleProductSearch = useCallback(async (query = "") => {
    const trimmed = query.trim();
    setIsSearchingProducts(true);
    try {
      const res = await productApi.getProducts({
        search: trimmed || undefined,
        page_size: 50,
        pagination_required: false,
      });
      if (res && res.data && Array.isArray(res.data)) {
        setAvailableProducts((prev) => {
          const map = new Map<string, ApiProduct>();
          if (trimmed) {
            prev.forEach((p) => map.set(p.id, p));
          }
          res.data.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn("Failed to search products in Purchase Bills:", err);
    } finally {
      setIsSearchingProducts(false);
    }
  }, []);

  // Suppliers list (API only)
  const mergedSuppliers = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; supplierCode?: string; paymentTerms?: string }
    >();
    availableSuppliers.forEach((s) => {
      map.set(s.id, {
        id: s.id,
        name: s.name,
        supplierCode: s.supplierCode,
        paymentTerms: s.paymentTerms,
      });
    });
    return Array.from(map.values());
  }, [availableSuppliers]);

  // Product options (from the products API)
  const productOptions = useMemo(() => {
    const map = new Map<
      string,
      {
        value: string;
        label: string;
        subLabel?: string;
        badge?: string;
        unitCost: number;
        salePrice?: number;
        unit?: string;
      }
    >();

    availableProducts.forEach((p) => {
      const prodName = p.productName || (p as any).name || "Product";
      const prodCost = Number(p.purchasePrice ?? (p as any).costPrice ?? 0);
      const prodSale = Number(p.salePrice ?? (p as any).sellingPrice ?? 0);
      const sku = p.productCode || p.sku || "";
      map.set(p.id, {
        value: p.id,
        label: prodName,
        subLabel: sku
          ? `SKU: ${sku} • Cost: ₹${prodCost} • Sale: ₹${prodSale}`
          : `Cost: ₹${prodCost} • Sale: ₹${prodSale}`,
        badge: sku || undefined,
        unitCost: prodCost,
        salePrice: prodSale,
        unit: p.unit || "PCS",
      });
    });

    // Also include line items currently on the purchase order
    formData.items.forEach((it) => {
      if (it.productId && !map.has(it.productId)) {
        map.set(it.productId, {
          value: it.productId,
          label: it.productName || "Product",
          unitCost: it.purchasePrice || 0,
          salePrice: it.salePrice || 0,
          unit: it.unit || "PCS",
        });
      }
    });

    // Only products returned by the products API are selectable (no stale inventory-store fallback).
    return Array.from(map.values());
  }, [availableProducts, formData.items]);

  // Eligible Purchase Requests (API only)
  // Only shows pending/approved purchase requests that have not yet been converted into purchase bills
  const eligiblePurchaseRequests = useMemo(() => {
    const map = new Map<string, PurchaseRequest>();
    availableRequests.forEach((r) => {
      map.set(r.id, r);
    });

    const editingMatch =
      editingPurchase?.notes?.match(/PR-\d+-\d+/i) ||
      editingPurchase?.purchaseInvoiceNo?.match(/PR-\d+-\d+/i);
    const editingRequestNo = editingMatch ? editingMatch[0].toLowerCase() : "";

    return Array.from(map.values()).filter((r) => {
      // Retain currently selected request or the one linked to the purchase bill being edited
      if (selectedRequestId && r.id === selectedRequestId) return true;
      if (editingRequestNo && r.requestNo.toLowerCase() === editingRequestNo)
        return true;

      const rawStatus = (r.status || "").toLowerCase().trim();

      // Exclude requests that already had a purchase created, or are completed/cancelled/rejected
      if (
        rawStatus === "purchase created" ||
        rawStatus === "completed" ||
        rawStatus === "rejected" ||
        rawStatus === "cancelled" ||
        Boolean(r.createdPurchaseId)
      ) {
        return false;
      }

      // Include pending/approved requests waiting for purchase bill creation
      return (
        rawStatus === "approved" ||
        rawStatus === "pending approval" ||
        rawStatus === "submitted" ||
        rawStatus === "pending" ||
        rawStatus === "draft" ||
        rawStatus === ""
      );
    });
  }, [availableRequests, selectedRequestId, editingPurchase]);

  // Current selected purchase request details
  const selectedPurchaseRequest = useMemo(() => {
    if (!selectedRequestId) return null;
    return (
      eligiblePurchaseRequests.find((r) => r.id === selectedRequestId) || null
    );
  }, [selectedRequestId, eligiblePurchaseRequests]);

  // If navigated from Purchase Request (Convert to Purchase)
  useEffect(() => {
    const locState = location.state as
      | {
          newPo?: PurchaseOrder;
          newPoId?: string;
          convertFromPr?: {
            requestId?: string;
            requestNo: string;
            supplierId?: string;
            supplierName?: string;
            dueDate?: string;
            notes?: string;
            items: {
              productId: string;
              productName: string;
              quantity: number;
              purchasePrice: number;
              unit?: string;
            }[];
          };
        }
      | undefined;

    if (!locState?.convertFromPr) {
      hasConvertedRef.current = false;
    }

    if (locState?.convertFromPr && !hasConvertedRef.current) {
      hasConvertedRef.current = true;
      const prData = locState.convertFromPr;
      const nextPoNo = ""; // server generates the PO number on save

      setPurchaseType("with_request");
      if (prData.requestId) {
        setSelectedRequestId(prData.requestId);
        setOriginatingRequestId(prData.requestId);

        // Ensure converted request is available in dropdown and requisition banner
        setAvailableRequests((prev) => {
          if (
            prev.some(
              (r) =>
                r.id === prData.requestId || r.requestNo === prData.requestNo,
            )
          )
            return prev;
          const synthetic: PurchaseRequest = {
            id: prData.requestId!,
            requestNo: prData.requestNo,
            requestDate: new Date().toISOString().split("T")[0],
            requestedBy: "Requisition Owner",
            department: "Operations",
            requiredDate: prData.dueDate || "",
            priority: "Medium",
            status: "Approved",
            items: (prData.items || []).map((it, idx) => ({
              id: `req_it_${idx}`,
              productId: it.productId,
              productName: it.productName,
              currentStock: 0,
              requestedQuantity: it.quantity,
              estimatedUnitPrice: it.purchasePrice,
              requiredDate: prData.dueDate || "",
            })),
            supplierId: prData.supplierId,
            supplierName: prData.supplierName,
            notes: prData.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return [synthetic, ...prev];
        });
      }

      const prefilledItems: PurchaseProductItem[] = prData.items.map((it) => {
        const matchingProd = availableProducts.find(
          (p) => p.id === it.productId,
        );
        const prodOpt = productOptions.find((p) => p.value === it.productId);
        const pPrice =
          it.purchasePrice ||
          matchingProd?.purchasePrice ||
          prodOpt?.unitCost ||
          0;
        const sPrice = matchingProd?.salePrice || prodOpt?.salePrice || 0;
        const u = it.unit || matchingProd?.unit || prodOpt?.unit || "PCS";
        const qty = Math.max(1, it.quantity || 1);
        const itemTax = pPrice * qty * 0.18;
        const initialBatch =
          (it as any).batchNo ||
          (it as any).batch ||
          matchingProd?.batchNo ||
          (matchingProd as any)?.initialBatchNo ||
          "";
        const initialExpDate =
          (it as any).expDate || matchingProd?.expDate || "";

        return {
          id: `po_item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          productId: it.productId,
          productName:
            it.productName ||
            matchingProd?.productName ||
            prodOpt?.label ||
            "Product",
          batch: initialBatch,
          quantity: qty,
          freeQuantity: 0,
          unit: u,
          packingUnit: "",
          expDate: initialExpDate,
          purchasePrice: pPrice,
          salePrice: sPrice,
          discountPercent: 0,
          discountAmount: 0,
          taxPercent: 18,
          total: Math.round((pPrice * qty + itemTax) * 100) / 100,
        };
      });

      const matchedSupplier =
        mergedSuppliers.find((s) => s.id === prData.supplierId) || null;

      setFormData({
        purchaseNo: nextPoNo,
        purchaseInvoiceNo: `INV-REQ-${prData.requestNo}`,
        supplierId: matchedSupplier
          ? matchedSupplier.id
          : prData.supplierId || "",
        supplierName: matchedSupplier
          ? matchedSupplier.name
          : prData.supplierName || "",
        purchaseDate: new Date().toISOString().split("T")[0],
        dueDate:
          prData.dueDate ||
          new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        items: prefilledItems,
        withGst: true,
        gstType: "intra_state",
        shipping: 0,
        otherCharges: 0,
        paymentMethod: "Bank Transfer",
        paymentTerms: toBillPaymentTerms(matchedSupplier?.paymentTerms) || "Net 30 Days",
        paidAmount: 0,
        purchaseStatus: "Pending",
        roundMode: "none",
        notes: prData.notes
          ? `Converted from ${prData.requestNo}. ${prData.notes}`
          : `Converted from Purchase Requisition ${prData.requestNo}`,
      });

      formErr.reset();
      setEditingPurchase(null);
      setIsFormModalOpen(true);
      // Clean up React Router location state immediately so closing/saving won't re-trigger this block
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }

    if (locState?.newPo) {
      const incomingPo = locState.newPo;
      setLivePurchases((prev) => {
        if (
          !prev.some(
            (p) =>
              p.id === incomingPo.id || p.purchaseNo === incomingPo.purchaseNo,
          )
        ) {
          return [incomingPo, ...prev];
        }
        return prev;
      });
      // Clear React Router state so refresh or re-render doesn't duplicate
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [
    location.state,
    productOptions,
    mergedSuppliers,
    navigate,
    location.pathname,
  ]);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pendingPurchaseStatus, setPendingPurchaseStatus] = useState("All");
  const [appliedPurchaseStatus, setAppliedPurchaseStatus] = useState("All");
  const [pendingPaymentStatus, setPendingPaymentStatus] = useState("All");
  const [appliedPaymentStatus, setAppliedPaymentStatus] = useState("All");
  const [pendingSupplier, setPendingSupplier] = useState("All");
  const [appliedSupplier, setAppliedSupplier] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [priceTaxMode, setPriceTaxMode] = useState<"Without Tax" | "With Tax">(
    "Without Tax",
  );

  // Deduplication & Sync Refs (prevents multiple redundant API calls)
  const isFetchingRef = useRef(false);
  const lastFetchKeyRef = useRef("");

  // Fetch Purchase Orders from Work API with deduplication
  const fetchPurchaseOrders = useCallback(
    async (
      forceRefresh = false,
      overrides?: {
        search?: string;
        status?: string;
        page?: number;
      }
    ) => {
      const targetPage = overrides?.page ?? currentPage;
      const targetSearch = overrides?.search !== undefined ? overrides.search : appliedSearch;
      const targetStatus = overrides?.status !== undefined ? overrides.status : appliedPurchaseStatus;
      const fetchKey = `${targetPage}_${pageSize}_${targetSearch.trim()}_${targetStatus}`;
      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;
      setIsApiLoading(true);

      try {
        const statusParam =
          targetStatus !== "All" ? targetStatus : undefined;

        const response = await workPurchaseOrderApi.getPurchaseOrders({
          page: targetPage,
          limit: pageSize,
          search: targetSearch.trim() || undefined,
          status: statusParam,
          pagination_required: true,
        });

        if (response && response.success && Array.isArray(response.data)) {
          const mapped = response.data.map(mapApiPurchaseOrderToUi);
          setIsApiConnected(true);
          setApiErrorMessage(null);
          setLivePurchases(mapped);

          setApiSummary(response.summary ?? null);
          if (response.pagination) {
            setTotalApiRecords(
              response.pagination.totalRecords ?? mapped.length,
            );
            setTotalApiPages(Math.max(1, response.pagination.totalPages || 1));
          } else {
            setTotalApiRecords(mapped.length);
            setTotalApiPages(Math.ceil(mapped.length / pageSize) || 1);
          }
        } else {
          setIsApiConnected(true);
          setLivePurchases([]);
          setTotalApiRecords(0);
          setTotalApiPages(1);
        }
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load purchase bills from the API";
        console.warn("Work Purchase Orders API unavailable:", errMsg);
        setIsApiConnected(false);
        setApiErrorMessage(errMsg);
        setLivePurchases([]);
        setTotalApiRecords(null);
        setTotalApiPages(null);
      } finally {
        isFetchingRef.current = false;
        setIsApiLoading(false);
      }
    },
    [
      currentPage,
      pageSize,
      appliedSearch,
      appliedPurchaseStatus,
    ],
  );

  // Initial and reactive fetch on filter change
  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  // 3-Dots Action dropdown & Share Popover State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [sharePos, setSharePos] = useState<{
    top?: number;
    bottom?: number;
    right?: number;
  } | null>(null);

  // Close action dropdown & share popover on click outside or scroll
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
        !target.closest(".share-popover-container") &&
        !target.closest(".share-popover-menu")
      ) {
        setActiveShareId(null);
        setSharePos(null);
      }
    };
    const handleScroll = () => {
      if (activeDropdownId) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (activeShareId) {
        setActiveShareId(null);
        setSharePos(null);
      }
    };
    window.addEventListener("click", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("click", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [activeDropdownId, activeShareId]);

  // Summary Metrics
  const localSummary = useMemo(() => {
    const pool = livePurchases;
    const totalAmount = pool.reduce((acc, p) => acc + (p.grandTotal || 0), 0);
    const todayStr = new Date().toISOString().split("T")[0];
    const todayPurchases = pool.filter((p) => p.purchaseDate === todayStr);
    const todayAmount = todayPurchases.reduce(
      (acc, p) => acc + (p.grandTotal || 0),
      0,
    );
    const pendingPayments = pool.reduce((acc, p) => acc + (p.balance || 0), 0);
    const paidCount = pool.filter((p) => p.paymentStatus === "Paid").length;
    const completedCount = pool.filter(
      (p) =>
        p.purchaseStatus === "Completed" ||
        p.purchaseStatus === "Received" ||
        p.purchaseStatus === "Approved",
    ).length;

    return {
      totalCount: totalApiRecords !== null ? totalApiRecords : pool.length,
      totalAmount,
      todayAmount,
      todayCount: todayPurchases.length,
      pendingPayments,
      paidCount,
      completedCount,
    };
  }, [livePurchases, totalApiRecords]);
  const summary = useMemo(() => {
    if (apiSummary) {
      const returnDeduction = Number(apiSummary.totalPurchaseReturnAmount || 0);
      const effectiveTotalAmount = returnDeduction > 0
        ? Math.max(0, Number(apiSummary.totalAmount) - returnDeduction)
        : Number(apiSummary.totalAmount);
      return {
        ...apiSummary,
        totalAmount: effectiveTotalAmount,
        originalTotalAmount: Number(apiSummary.totalAmount),
        totalPurchaseReturnAmount: returnDeduction,
      };
    }
    return localSummary;
  }, [apiSummary, localSummary]);

  // Open Create Modal (No mock data: uses live products/suppliers if available or clean empty inputs)
  const handleOpenCreateModal = () => {
    loadFormMasterData();
    const nextPoNo = ""; // server generates the PO number on save

    const initialItem: PurchaseProductItem = {
      id: `po_it_${Date.now()}`,
      productId: "",
      productName: "",
      batch: "",
      quantity: 1,
      freeQuantity: 0,
      unit: "NONE",
      expDate: "",
      purchasePrice: 0,
      salePrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 18,
      total: 0,
    };

    const validProduct =
      productOptions.find((p) => UUID_REGEX.test(p.value)) || productOptions[0];
    if (validProduct) {
      initialItem.productId = validProduct.value;
      initialItem.productName = validProduct.label;
      initialItem.purchasePrice = validProduct.unitCost;
      initialItem.salePrice = validProduct.salePrice || 0;
      initialItem.unit = validProduct.unit || "NONE";
      initialItem.total = Math.round(validProduct.unitCost * 1.18 * 100) / 100;
    }

    const defaultSupplier =
      mergedSuppliers.find((s) => UUID_REGEX.test(s.id)) ||
      (mergedSuppliers.length > 0 ? mergedSuppliers[0] : null);

    setPurchaseType("without_request");
    setSelectedRequestId("");
    setOriginatingRequestId(null);

    setFormData({
      purchaseNo: nextPoNo,
      purchaseInvoiceNo: "",
      purchaseBillManualNo: "",
      supplierId: "",
      supplierName: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      items: [],
      withGst: true,
      gstType: "intra_state",
      shipping: 0,
      otherCharges: 0,
      paymentMethod: "Cash",
      paymentTerms: "Net 30 Days",
      paidAmount: 0,
      purchaseStatus: "Pending",
      roundMode: "none",
      notes: "",
    });
    setCustomBatchRows({});
    formErr.reset();
    setEditingPurchase(null);
    setIsFormModalOpen(true);
  };

  // Open the view modal, then load the latest record (GET /purchase-orders/:id)
  const handleOpenViewModal = async (po: PurchaseOrder) => {
    setSelectedPurchase(po);
    setIsDetailModalOpen(true);
    try {
      if (po.id) {
        const res = await workPurchaseOrderApi.getPurchaseOrderById(po.id);
        if (res?.data) {
          const fresh = mapApiPurchaseOrderToUi(res.data);
          setSelectedPurchase((prev) => (prev && prev.id === po.id ? { ...prev, ...fresh } : prev));
        }
      }
    } catch (err) {
      console.warn("Could not fetch purchase order details:", err);
    }
  };

  const handleOpenEditModal = (po: PurchaseOrder) => {
    if (po.purchaseStatus === "Received" || po.purchaseStatus === "Cancelled") {
      toast.warning(
        `Purchase order ${po.purchaseNo} is ${po.purchaseStatus.toLowerCase()} and locked from modifications.`,
      );
      setSelectedPurchase(po);
      setIsDetailModalOpen(true);
      return;
    }

    const hasLinkedPr = Boolean(
      po.purchaseInvoiceNo?.startsWith("INV-REQ-") ||
      po.notes?.includes("Converted from"),
    );
    loadFormMasterData();
    setPurchaseType(hasLinkedPr ? "with_request" : "without_request");
    let matchedPrId = "";
    if (hasLinkedPr) {
      const allRequests = availableRequests;
      const match =
        po.notes?.match(/PR-\d+-\d+/i) ||
        po.purchaseInvoiceNo?.match(/PR-\d+-\d+/i);
      if (match) {
        const found = allRequests.find(
          (r) => r.requestNo.toLowerCase() === match[0].toLowerCase(),
        );
        if (found) matchedPrId = found.id;
      }
    }
    setSelectedRequestId(matchedPrId);
    setOriginatingRequestId(matchedPrId || null);
    setFormData({
      purchaseNo: po.purchaseNo,
      purchaseInvoiceNo: po.purchaseInvoiceNo || "",
      purchaseBillManualNo: po.purchaseBillManualNo || "",
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      purchaseDate: po.purchaseDate,
      dueDate: po.dueDate || po.expectedDeliveryDate || "",
      items: JSON.parse(JSON.stringify(po.items)),
      withGst: po.withGst !== undefined ? po.withGst : po.tax > 0,
      gstType: po.gstType || "intra_state",
      shipping: po.shipping || 0,
      otherCharges: po.otherCharges || 0,
      paymentMethod: po.paymentMethod || "Bank Transfer",
      paymentTerms: toBillPaymentTerms(po.paymentTerms) || "Net 30 Days",
      paidAmount: po.paidAmount || 0,
      purchaseStatus: po.purchaseStatus,
      roundMode: (po as any).roundMode || "none",
      notes: po.notes || "",
    });
    setCustomBatchRows({});
    formErr.reset();
    setEditingPurchase(po);
    setIsFormModalOpen(true);
  };

  // Duplicate Purchase Bill: Pre-fills form fields so user can review/edit before saving
  const handleDuplicatePurchase = (po: PurchaseOrder) => {
    const nextPoNo = ""; // server generates the PO number on save

    setFormData({
      purchaseNo: nextPoNo,
      purchaseInvoiceNo: po.purchaseInvoiceNo
        ? `${po.purchaseInvoiceNo}-COPY`
        : "",
      purchaseBillManualNo: "",
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      purchaseDate: new Date().toISOString().split("T")[0],
      dueDate:
        po.dueDate ||
        po.expectedDeliveryDate ||
        new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      items: po.items.map((it) => ({
        ...it,
        id: `po_item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      })),
      withGst: po.withGst !== undefined ? po.withGst : po.tax > 0,
      gstType: po.gstType || "intra_state",
      shipping: po.shipping || 0,
      otherCharges: po.otherCharges || 0,
      paymentMethod: po.paymentMethod || "Bank Transfer",
      paymentTerms: toBillPaymentTerms(po.paymentTerms) || "Net 30 Days",
      paidAmount: 0,
      purchaseStatus: "Pending",
      roundMode: (po as any).roundMode || "none",
      notes: po.notes
        ? `Duplicated from ${po.purchaseNo}. ${po.notes}`
        : `Duplicated from ${po.purchaseNo}`,
    });

    setCustomBatchRows({});
    formErr.reset();
    setEditingPurchase(null);
    setIsFormModalOpen(true);
    toast.info(
      `Duplicated ${po.purchaseNo} into editor (${nextPoNo}). Review and save when ready.`,
    );
  };

  // Convert Purchase to Purchase Return: opens Purchase Return creation form with fields prefilled
  const handleConvertToReturn = (po: PurchaseOrder) =>
    convertGuard.runOnce(async () => {
      setActiveDropdownId(null);
      setDropdownPos(null);
      // Preconditions: only a received bill with real items can be returned.
      if (!po.items || po.items.length === 0) {
        toast.warning("This purchase bill has no items to return.");
        return;
      }
      if (po.purchaseStatus === "Cancelled") {
        toast.warning("A cancelled purchase bill cannot be returned.");
        return;
      }
      const badItem = po.items.find(
        (it) => checkRecordId(it.productId, "product") !== null,
      );
      if (badItem) {
        toast.warning(
          `Please choose the product from the list for "${badItem.productName || "an item"}" before creating a return.`,
        );
        return;
      }
      performConvertToReturn(po);
    });

  const performConvertToReturn = (po: PurchaseOrder) => {
    const returnItems: PurchaseReturnItem[] = po.items.map((it) => ({
      id: `pret_it_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: it.productId,
      productName: it.productName,
      batch: it.batch,
      purchasedQuantity: it.quantity,
      returnQuantity: it.quantity,
      unitPrice: it.purchasePrice,
      returnAmount: it.total,
      reason: "Defective",
      remarks: "Returned from Purchase Bill " + po.purchaseNo,
    }));

    toast.info(`Opening Purchase Return for ${po.purchaseNo}...`);

    navigate("/sale-management/purchase/return", {
      state: {
        convertFromPo: {
          purchaseId: po.id,
          purchaseNo: po.purchaseNo,
          supplierId: po.supplierId,
          supplierName: po.supplierName,
          items: returnItems,
          totalAmount: po.grandTotal,
          notes: `Return generated from Purchase Bill ${po.purchaseNo}`,
        },
      },
    });
  };

  // Print & Download Purchase Bill via universal printUtils
  const [isPrintingBill, setIsPrintingBill] = useState(false);
  const [isDownloadingBill, setIsDownloadingBill] = useState(false);

  const getTargetPurchaseOrderWithItems = async (
    po: PurchaseOrder,
  ): Promise<PurchaseOrder> => {
    // Always load the latest record (GET /purchases/:id) so print / download use server data
    let targetPo = po;
    try {
      if (po.id) {
        const res = await workPurchaseOrderApi.getPurchaseOrderById(po.id);
        if (res?.data) {
          targetPo = mapApiPurchaseOrderToUi(res.data);
        }
      }
    } catch (err) {
      console.warn("Could not fetch single purchase order details:", err);
    }
    return targetPo;
  };

  const buildPurchaseBillPrintOptions = (
    targetPo: PurchaseOrder,
  ): DocumentPrintOptions => {
    const matchedSup = mergedSuppliers.find(
      (s) => s.id === targetPo.supplierId || s.name === targetPo.supplierName,
    );
    const isGstActive =
      targetPo.withGst !== false &&
      Number(targetPo.tax || targetPo.taxAmount || 0) > 0;

    return {
      docTypeTitle: "PURCHASE ORDER / BILL",
      docNo: targetPo.purchaseNo || targetPo.poNo || "PO-DRAFT",
      docDate:
        targetPo.purchaseDate ||
        targetPo.orderDate ||
        new Date().toISOString().split("T")[0],
      dueDate: targetPo.dueDate || targetPo.expectedDeliveryDate,
      status: targetPo.purchaseStatus,
      statusColor:
        targetPo.purchaseStatus === "Received"
          ? "emerald"
          : targetPo.purchaseStatus === "Cancelled"
            ? "rose"
            : "purple",
      referenceNo: targetPo.purchaseInvoiceNo,
      partyTitle: "Supplier / Vendor",
      partyName: targetPo.supplierName,
      partyCompany: targetPo.supplier?.name || (matchedSup as any)?.company,
      partyPhone: (matchedSup as any)?.phone || (matchedSup as any)?.mobile,
      partyEmail: (matchedSup as any)?.email,
      partyAddress:
        (matchedSup as any)?.billingAddress || (matchedSup as any)?.address,
      partyGstin: (matchedSup as any)?.gstNumber,
      extraMeta: [
        {
          label: "Payment Terms",
          value: targetPo.paymentTerms || "—",
        },
        { label: "Payment Status", value: targetPo.paymentStatus },
        ...(targetPo.expectedDeliveryDate
          ? [
              {
                label: "Expected Delivery",
                value: targetPo.expectedDeliveryDate,
              },
            ]
          : []),
        ...(targetPo.purchaseInvoiceNo
          ? [{ label: "Supplier Invoice #", value: targetPo.purchaseInvoiceNo }]
          : []),
        ...(targetPo.totalReturned && targetPo.totalReturned > 0
          ? [
              {
                label: "Original Bill Amount",
                value: `₹${(targetPo.originalBillAmount ?? targetPo.subtotal + (targetPo.tax || 0) - (targetPo.discount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
              },
              {
                label: "Purchase Return",
                value: `-₹${targetPo.totalReturned.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
              },
              ...(targetPo.supplierCredit && targetPo.supplierCredit > 0
                ? [
                    {
                      label: "Supplier Credit",
                      value: `₹${targetPo.supplierCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                    },
                  ]
                : []),
            ]
          : []),
      ],
      items: (targetPo.items || []).map((it) => ({
        name: it.productName,
        sku: (it as any).sku,
        batch: it.batch,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.purchasePrice,
        taxPercent: isGstActive ? (it.taxPercent || 0) : 0,
        total: it.total,
      })),
      subtotal: targetPo.subtotal || targetPo.subTotal,
      discount: targetPo.discount || targetPo.discountAmount || 0,
      tax: {
        withGst: isGstActive,
        gstType: targetPo.gstType || "intra_state",
        taxAmount: targetPo.tax || targetPo.taxAmount,
        cgst: targetPo.cgst,
        sgst: targetPo.sgst,
        igst: targetPo.igst,
      },
      shipping: targetPo.shipping || 0,
      otherCharges: targetPo.otherCharges || 0,
      grandTotal: targetPo.grandTotal,
      paidAmount: targetPo.paidAmount,
      balance: targetPo.balance,
      notes: targetPo.notes,
    };
  };

  const handlePrintPurchaseBill = async (po: PurchaseOrder) => {
    if (isPrintingBill) return;
    setIsPrintingBill(true);
    if (!po.items || po.items.length === 0) {
      toast.info(`Fetching bill details for ${po.purchaseNo}...`);
    }
    try {
      const targetPo = await getTargetPurchaseOrderWithItems(po);
      printBusinessDocument(buildPurchaseBillPrintOptions(targetPo));
    } finally {
      setIsPrintingBill(false);
    }
  };

  const handleDownloadPurchaseBill = async (po: PurchaseOrder) => {
    if (isDownloadingBill) return;
    setIsDownloadingBill(true);
    const docNo = po.purchaseNo || po.poNo || "PO";
    const filename = `PurchaseBill_${docNo.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
    try {
      if (!po.items || po.items.length === 0) {
        toast.info(`Preparing ${docNo} for download...`);
      }
      const targetPo = await getTargetPurchaseOrderWithItems(po);
      await downloadBusinessDocument(
        buildPurchaseBillPrintOptions(targetPo),
        filename,
      );
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      console.error("Failed to download purchase bill PDF:", err);
      toast.error("Failed to download purchase bill PDF. Please try again.");
    } finally {
      setIsDownloadingBill(false);
    }
  };

  // Print Table Report for Purchase Orders
  const handlePrintTableReport = () => {
    if (paginatedPurchases.length === 0) {
      toast.info("No purchase orders to print.");
      return;
    }

    const printRows = paginatedPurchases.map((p) => ({
      purchaseNo: p.purchaseNo,
      purchaseDate: p.purchaseDate,
      supplierName: p.supplierName,
      purchaseStatus: p.purchaseStatus,
      paymentStatus: p.paymentStatus,
      grandTotal: p.grandTotal,
      paidAmount: p.paidAmount,
      balance: p.balance,
    }));

    printTableReport({
      title: "Purchase Orders & Bills Report",
      subtitle: `Total Orders: ${totalRecordsCount} | Filters: Status [${appliedPurchaseStatus}], Payment [${appliedPaymentStatus}], Supplier [${appliedSupplier}]`,
      columns: [
        { header: "PO / Bill #", key: "purchaseNo", width: "15%" },
        { header: "Date", key: "purchaseDate", width: "12%" },
        { header: "Supplier Name", key: "supplierName", width: "25%" },
        {
          header: "Order Status",
          key: "purchaseStatus",
          align: "center",
          width: "12%",
        },
        {
          header: "Payment Status",
          key: "paymentStatus",
          align: "center",
          width: "12%",
        },
        {
          header: "Total (₹)",
          key: "grandTotal",
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
      ],
      data: printRows,
      metrics: [
        { label: "Total Purchases", value: summary.totalAmount },
        { label: "Pending Payments", value: summary.pendingPayments },
        { label: "Fully Paid Count", value: summary.paidCount },
        { label: "Total Orders", value: totalRecordsCount },
      ],
      summaryRow: {
        purchaseNo: "Total",
        grandTotal: paginatedPurchases.reduce(
          (acc, p) => acc + (p.grandTotal || 0),
          0,
        ),
        balance: paginatedPurchases.reduce(
          (acc, p) => acc + (p.balance || 0),
          0,
        ),
      },
    });
  };

  const handleSupplierChange = (supId: string) => {
    formErr.clearError("supplierId");
    const sup = mergedSuppliers.find((s) => s.id === supId);
    if (sup) {
      setFormData((prev) => ({
        ...prev,
        supplierId: sup.id,
        supplierName: sup.name,
        paymentTerms: toBillPaymentTerms(sup.paymentTerms) || prev.paymentTerms,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        supplierId: "",
        supplierName: "",
      }));
    }
  };

  // Handle switching Purchase Type (With Purchase Request vs Without Purchase Request)
  const handlePurchaseTypeChange = (
    type: "with_request" | "without_request",
  ) => {
    setPurchaseType(type);
    if (type === "without_request") {
      setSelectedRequestId("");
      setOriginatingRequestId(null);
      setFormData((prev) => ({
        ...prev,
        purchaseInvoiceNo: prev.purchaseInvoiceNo.startsWith("INV-REQ-")
          ? ""
          : prev.purchaseInvoiceNo,
        notes: prev.notes.startsWith("Converted from Purchase Requisition")
          ? ""
          : prev.notes,
      }));
    }
  };

  // Handle Selecting a Purchase Request
  const handleSelectPurchaseRequest = (prId: string) => {
    if (!prId) {
      setSelectedRequestId("");
      setOriginatingRequestId(null);
      return;
    }

    const pr = eligiblePurchaseRequests.find((r) => r.id === prId);
    if (!pr) {
      setSelectedRequestId("");
      setOriginatingRequestId(null);
      return;
    }

    setSelectedRequestId(pr.id);
    setOriginatingRequestId(pr.id);

    // 1. Match supplier from request
    const matchedSupplier =
      mergedSuppliers.find((s) => s.id === pr.supplierId) ||
      mergedSuppliers.find(
        (s) =>
          s.name.trim().toLowerCase() ===
          (pr.supplierName || "").trim().toLowerCase(),
      );

    // Never substitute an unrelated "first available" supplier: if the request's supplier
    // cannot be resolved, the supplier field keeps the request's own value (or stays empty)
    // and the user is asked to choose one before saving.

    // 2. Map line items from request
    const prItems: PurchaseProductItem[] = (pr.items || []).map((it, idx) => {
      const matchingProd = availableProducts.find(
        (p) =>
          p.id === it.productId ||
          p.productName.toLowerCase() === (it.productName || "").toLowerCase(),
      );
      const prodOpt = productOptions.find(
        (p) =>
          p.value === it.productId ||
          p.label.toLowerCase() === (it.productName || "").toLowerCase(),
      );
      const pPrice = Number(
        it.estimatedUnitPrice ||
          matchingProd?.purchasePrice ||
          prodOpt?.unitCost ||
          0,
      );
      const sPrice = Number(matchingProd?.salePrice || prodOpt?.salePrice || 0);
      const u =
        (it as any).unit || matchingProd?.unit || prodOpt?.unit || "PCS";
      const qty = Math.max(1, it.requestedQuantity || 1);
      const taxPct = 18;
      const sub = qty * pPrice;
      const tax = formData.withGst ? sub * (taxPct / 100) : 0;
      const initialBatch =
        (it as any).batchNo ||
        (it as any).batch ||
        matchingProd?.batchNo ||
        (matchingProd as any)?.initialBatchNo ||
        "";
      const initialExpDate = (it as any).expDate || matchingProd?.expDate || "";

      return {
        id: `po_item_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        productId: it.productId || matchingProd?.id || prodOpt?.value || "",
        productName:
          it.productName ||
          matchingProd?.productName ||
          prodOpt?.label ||
          "Product",
        batch: initialBatch,
        quantity: qty,
        freeQuantity: 0,
        unit: u,
        packingUnit: "",
        expDate: initialExpDate,
        purchasePrice: pPrice,
        salePrice: sPrice,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: taxPct,
        total: Math.round((sub + tax) * 100) / 100,
      };
    });

    setFormData((prev) => ({
      ...prev,
      supplierId: matchedSupplier
        ? matchedSupplier.id
        : pr.supplierId || prev.supplierId,
      supplierName: matchedSupplier
        ? matchedSupplier.name
        : pr.supplierName || prev.supplierName,
      purchaseInvoiceNo: prev.purchaseInvoiceNo || `INV-REQ-${pr.requestNo}`,
      dueDate: pr.requiredDate || prev.dueDate,
      notes: pr.notes
        ? `Converted from Purchase Requisition ${pr.requestNo}. ${pr.notes}`
        : `Converted from Purchase Requisition ${pr.requestNo}`,
      items: prItems.length > 0 ? prItems : prev.items,
    }));

    toast.success(
      `Populated details from Purchase Request ${pr.requestNo} (${prItems.length} items).`,
    );
  };

  const handleToggleWithGst = (enableGst: boolean) => {
    setFormData((prev) => {
      const updatedItems = prev.items.map((it) => {
        const lineRes = calculateLineItem(
          {
            quantity: it.quantity,
            unitPrice: it.purchasePrice,
            discountPercent: it.discountPercent,
            discountAmount: it.discountAmount,
            taxPercent: it.taxPercent,
          },
          { withGst: enableGst, gstType: prev.gstType },
        );
        return { ...it, total: lineRes.lineTotal };
      });
      return { ...prev, withGst: enableGst, items: updatedItems };
    });
  };

  const handleSetGstType = (type: "intra_state" | "inter_state") => {
    setFormData((prev) => ({ ...prev, gstType: type }));
  };

  // Helper to fetch/derive batch options for a given product
  const getProductBatchOptions = useCallback(
    (productId: string, productName?: string, currentBatch?: string) => {
      if (!productId) return [];

      const batchMap = new Map<
        string,
        {
          batchNo: string;
          expDate?: string;
          costPrice?: number;
          sellingPrice?: number;
        }
      >();

      // 1. Live stock batches from Commerce API
      availableBatches.forEach((b) => {
        if (
          b.batchNo &&
          (b.productId === productId ||
            (b.productName &&
              productName &&
              b.productName.trim().toLowerCase() ===
                productName.trim().toLowerCase()))
        ) {
          batchMap.set(b.batchNo, {
            batchNo: b.batchNo,
            expDate: b.expDate || undefined,
            costPrice: b.costPrice,
            sellingPrice: b.sellingPrice,
          });
        }
      });

      // 3. Catalog products (availableProducts)
      const matchingProd = availableProducts.find((p) => p.id === productId);
      if (matchingProd) {
        const prodBatches =
          (matchingProd as any).batches || (matchingProd as any).stockBatches;
        if (Array.isArray(prodBatches)) {
          prodBatches.forEach((b: any) => {
            const bNo = b.batchNo || b.batch;
            if (bNo && !batchMap.has(bNo)) {
              batchMap.set(bNo, {
                batchNo: bNo,
                expDate: b.expDate,
                costPrice: b.costPrice ?? b.purchasePrice,
                sellingPrice: b.sellingPrice ?? b.salePrice,
              });
            }
          });
        }
        if (
          (matchingProd as any).batchNo &&
          !batchMap.has((matchingProd as any).batchNo)
        ) {
          batchMap.set((matchingProd as any).batchNo, {
            batchNo: (matchingProd as any).batchNo,
            expDate: (matchingProd as any).expDate,
            costPrice: matchingProd.purchasePrice,
            sellingPrice: matchingProd.salePrice,
          });
        }
      }

      // 4. Historical batches from purchase bills
      const allPurchases = livePurchases;
      allPurchases.forEach((po) => {
        po.items?.forEach((it) => {
          if (
            it.batch &&
            (it.productId === productId ||
              (it.productName &&
                productName &&
                it.productName.trim().toLowerCase() ===
                  productName.trim().toLowerCase()))
          ) {
            if (!batchMap.has(it.batch)) {
              batchMap.set(it.batch, {
                batchNo: it.batch,
                expDate: it.expDate,
                costPrice: it.purchasePrice,
                sellingPrice: it.salePrice,
              });
            }
          }
        });
      });


      // 6. Ensure currentBatch is present if non-empty
      if (
        currentBatch &&
        currentBatch.trim() &&
        !batchMap.has(currentBatch.trim())
      ) {
        batchMap.set(currentBatch.trim(), { batchNo: currentBatch.trim() });
      }

      const options = Array.from(batchMap.values()).map((b) => ({
        value: b.batchNo,
        label: b.batchNo + (b.expDate ? ` (Exp: ${b.expDate})` : ""),
      }));

      return options;
    },
    [availableBatches, availableProducts, livePurchases],
  );

  const findBatchDetails = useCallback(
    (productId: string, batchNo: string) => {
      if (!productId || !batchNo) return null;
      const fromApi = availableBatches.find(
        (b) =>
          b.productId === productId &&
          b.batchNo.toLowerCase() === batchNo.toLowerCase(),
      );
      if (fromApi) return fromApi;

      const matchingProd = availableProducts.find((p) => p.id === productId);
      const prodBatches =
        (matchingProd as any)?.batches || (matchingProd as any)?.stockBatches;
      if (Array.isArray(prodBatches)) {
        const fromProd = prodBatches.find(
          (b: any) =>
            (b.batchNo || b.batch || "").toLowerCase() ===
            batchNo.toLowerCase(),
        );
        if (fromProd) return fromProd;
      }

      return null;
    },
    [availableBatches, availableProducts],
  );

  const handleItemBatchChange = (index: number, batchVal: string) => {
    if (batchVal === "__enter_custom_batch__") {
      setCustomBatchRows((prev) => ({ ...prev, [index]: true }));
      return;
    }
    setFormData((prev) => {
      const copy = [...prev.items];
      const item = { ...copy[index] };
      item.batch = batchVal;
      const batchDetails = findBatchDetails(item.productId, batchVal);
      if (batchDetails?.expDate) {
        item.expDate = batchDetails.expDate;
      }
      if (
        batchDetails?.costPrice &&
        (!item.purchasePrice || item.purchasePrice === 0)
      ) {
        item.purchasePrice = batchDetails.costPrice;
        const sub = (item.quantity || 1) * item.purchasePrice;
        const disc =
          item.discountAmount !== undefined && item.discountAmount > 0
            ? item.discountAmount
            : sub * ((item.discountPercent || 0) / 100);
        const tax = prev.withGst
          ? (sub - disc) * ((item.taxPercent || 18) / 100)
          : 0;
        item.total = Math.round((sub - disc + tax) * 100) / 100;
      }
      copy[index] = item;
      return { ...prev, items: copy };
    });
  };

  const handleItemProductChange = (index: number, prodId: string) => {
    const option = productOptions.find((p) => p.value === prodId);
    if (!option) return;
    formErr.clearError(`items.${index}.product`);
    formErr.clearError(`items.${index}.price`);
    formErr.clearError(`items.${index}.total`);
    formErr.clearError("items");
    formErr.clearError("totals");

    // Reset custom batch toggle for this row when switching product
    setCustomBatchRows((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    const batchOpts = getProductBatchOptions(option.value, option.label);
    const firstRealBatch = batchOpts.find(
      (b) => b.value !== "__enter_custom_batch__",
    );
    const autoBatch = firstRealBatch ? firstRealBatch.value : "";

    setFormData((prev) => {
      const copy = [...prev.items];
      const item = { ...copy[index] };
      item.productId = option.value;
      item.productName = option.label;
      item.batch = autoBatch;
      item.purchasePrice = option.unitCost;
      item.salePrice =
        option.salePrice !== undefined ? option.salePrice : item.salePrice;
      item.unit = option.unit || item.unit || "NONE";

      // Auto-populate expiry date if found on the selected batch
      const batchDetails = findBatchDetails(option.value, autoBatch);
      if (batchDetails?.expDate) {
        item.expDate = batchDetails.expDate;
      }

      const sub = (item.quantity || 1) * option.unitCost;
      const disc =
        item.discountAmount !== undefined && item.discountAmount > 0
          ? item.discountAmount
          : sub * ((item.discountPercent || 0) / 100);
      const tax = prev.withGst
        ? (sub - disc) * ((item.taxPercent || 18) / 100)
        : 0;
      item.total = Math.round((sub - disc + tax) * 100) / 100;
      copy[index] = item;
      return { ...prev, items: copy };
    });
  };

  const handleItemFieldChange = (
    index: number,
    field: keyof PurchaseProductItem,
    val: any,
  ) => {
    const errKeyByField: Record<string, string> = {
      purchasePrice: "price",
      salePrice: "salePrice",
      freeQuantity: "freeQuantity",
    };
    formErr.clearError(`items.${index}.${errKeyByField[field as string] || field}`);
    formErr.clearError(`items.${index}.total`);
    formErr.clearError(`items.${index}.discountAmount`);
    formErr.clearError("totals");
    setFormData((prev) => {
      const copy = [...prev.items];
      const current = { ...copy[index] };

      if (field === "quantity") {
        current.quantity = Math.max(1, Number(val) || 1);
      } else if (field === "purchasePrice") {
        current.purchasePrice = Math.max(0, Number(val) || 0);
      } else if (field === "discountPercent") {
        current.discountPercent = Math.max(0, Math.min(100, Number(val) || 0));
        current.discountAmount = 0;
      } else if (field === "discountAmount") {
        current.discountAmount = Math.max(0, Number(val) || 0);
        current.discountPercent = 0;
      } else {
        (current as any)[field] = val;
      }

      const lineRes = calculateLineItem(
        {
          quantity: current.quantity,
          unitPrice: current.purchasePrice,
          discountPercent: current.discountPercent,
          discountAmount: current.discountAmount,
          taxPercent: current.taxPercent,
        },
        { withGst: prev.withGst, gstType: prev.gstType },
      );
      current.discountPercent = lineRes.discountPercent;
      current.discountAmount = lineRes.discountAmount;
      current.total = lineRes.lineTotal;

      copy[index] = current;
      return { ...prev, items: copy };
    });
  };

  const handleAddItemRow = () => {
    const newItem: PurchaseProductItem = {
      id: `po_it_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: "",
      productName: "",
      batch: "",
      quantity: 1,
      freeQuantity: 0,
      unit: "NONE",
      packingUnit: "",
      expDate: "",
      purchasePrice: 0,
      salePrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 18,
      total: 0,
    };

    formErr.clearError("items");
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleRemoveItemRow = (index: number) => {
    // Row indexes shift after a removal, so drop all per-row messages.
    formErr.clearGroup("items.");
    formErr.clearError("totals");
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Calculations using Centralized Financial Calculation Engine
  const calculatedTotals = useMemo(() => {
    const docTotals = calculateDocumentTotals({
      items: formData.items.map((it) => ({
        quantity: it.quantity,
        unitPrice: it.purchasePrice,
        discountPercent: it.discountPercent,
        discountAmount: it.discountAmount,
        taxPercent: it.taxPercent,
      })),
      withGst: formData.withGst,
      gstType: formData.gstType,
      shippingCharges: Number(formData.shipping) || 0,
      otherCharges: Number(formData.otherCharges) || 0,
      roundMode: formData.roundMode || "none",
      paidAmount: Number(formData.paidAmount) || 0,
    });

    return {
      subtotal: docTotals.subtotal,
      discount: docTotals.totalDiscount,
      taxableAmount: docTotals.taxableAmount,
      tax: docTotals.totalTax,
      cgst: docTotals.cgst,
      sgst: docTotals.sgst,
      igst: docTotals.igst,
      rawGrandTotal: docTotals.unroundedTotal,
      roundUpDiff: docTotals.roundOff > 0 ? docTotals.roundOff : 0,
      roundDownDiff: docTotals.roundOff < 0 ? docTotals.roundOff : 0,
      roundOffAmount: docTotals.roundOff,
      grandTotal: docTotals.grandTotal,
      paid: docTotals.paidAmount,
      balance: docTotals.balance,
    };
  }, [formData]);

  // Auto-clamp paidAmount if Grand Total changes (e.g. items edited or removed)
  useEffect(() => {
    if (isSplitMode) return; // the split rows are checked (and shown) by the split section instead
    if (formData.paidAmount > calculatedTotals.grandTotal) {
      setFormData((prev) => ({
        ...prev,
        paidAmount: Math.max(0, calculatedTotals.grandTotal),
      }));
    } else if (formData.paidAmount < 0) {
      setFormData((prev) => ({
        ...prev,
        paidAmount: 0,
      }));
    }
  }, [calculatedTotals.grandTotal, formData.paidAmount, isSplitMode]);

  // Split payment: what was already paid on this bill, the live totals and the validation
  const splitAlreadyPaid = editingPurchase ? Number(editingPurchase.paidAmount || 0) : 0;
  const splitSummary = summarizeSplit(calculatedTotals.grandTotal, splitAlreadyPaid, splitRows);
  const splitValidation = validateSplit(calculatedTotals.grandTotal, splitAlreadyPaid, splitRows);

  // Every time the form opens (or another bill is edited) it starts in Single mode with one empty entry
  useEffect(() => {
    setIsSplitMode(false);
    setSplitRows([newSplitRow(makeSplitRowId())]);
    setSplitShowErrors(false);
  }, [isFormModalOpen, editingPurchase?.id]);

  // The bill's paid amount follows the split entries, so the totals and balance update on every keystroke
  useEffect(() => {
    if (!isSplitMode) return;
    setFormData((prev) =>
      prev.paidAmount === splitSummary.totalPaid
        ? prev
        : {
            ...prev,
            paidAmount: splitSummary.totalPaid,
            paymentMethod: splitSummary.newPayments > 0 ? prev.paymentMethod || "Cash" : prev.paymentMethod,
          },
    );
  }, [isSplitMode, splitSummary.totalPaid, splitSummary.newPayments]);

  const switchPaymentMode = (split: boolean) => {
    if (split === isSplitMode) return;
    if (split) {
      // carry over what was typed in the single field as the first entry
      const carried = Math.max(0, Number(formData.paidAmount || 0) - splitAlreadyPaid);
      setSplitRows([{ ...newSplitRow(makeSplitRowId(), (formData.paymentMethod as any) === "UPI" ? "UPI" : "Cash"), amount: carried > 0 ? String(carried) : "" }]);
      setSplitShowErrors(false);
    }
    setIsSplitMode(split);
  };

  interface PurchasePaymentHistoryItem {
    id: string;
    paymentNo: string;
    paymentDate: string;
    amount: number;
    paymentMode: string;
    referenceNo?: string;
    notes?: string;
    status: string;
    isInitial?: boolean;
  }

  // Payment vouchers of the bill being edited, loaded from GET /work/payments-out
  const [billPayments, setBillPayments] = useState<PaymentOut[]>([]);
  useEffect(() => {
    const billNo = editingPurchase?.purchaseNo;
    if (!editingPurchase?.id || !billNo) {
      setBillPayments([]);
      return;
    }
    let cancelled = false;
    workPaymentOutApi
      .getPaymentsOut({ search: billNo, limit: 100, pagination_required: false })
      .then((res) => {
        if (!cancelled) setBillPayments(Array.isArray(res?.data) ? res.data.map(mapApiPaymentOutToUi) : []);
      })
      .catch(() => {
        if (!cancelled) setBillPayments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [editingPurchase?.id, editingPurchase?.purchaseNo, editingPurchase?.paidAmount]);

  // Payment History records for current editing purchase bill
  const matchingPaymentHistory: PurchasePaymentHistoryItem[] = useMemo(() => {
    if (!editingPurchase && formData.paidAmount <= 0) return [];

    const purchaseRefId = editingPurchase?.id;
    const purchaseRefNo = editingPurchase?.purchaseNo || formData.purchaseNo;
    const purchaseRefPoNo = (editingPurchase as any)?.poNo;
    const purchaseRefInv =
      editingPurchase?.purchaseInvoiceNo || formData.purchaseInvoiceNo;

    // 1. Matching payment vouchers, exactly as the Payment Out API returned them
    const apiMatches = billPayments.filter((pm) => {
      if (pm.status === "Cancelled") return false;
      const matchId = purchaseRefId && pm.purchaseId === purchaseRefId;
      const matchNo =
        purchaseRefNo &&
        (pm.purchaseNo === purchaseRefNo || pm.referenceNo === purchaseRefNo);
      const matchPoNo =
        purchaseRefPoNo &&
        (pm.purchaseNo === purchaseRefPoNo ||
          pm.referenceNo === purchaseRefPoNo);
      const matchInv =
        purchaseRefInv &&
        (pm.referenceNo === purchaseRefInv || pm.purchaseNo === purchaseRefInv);
      return Boolean(matchId || matchNo || matchPoNo || matchInv);
    });

    // Deduplicate by ID
    const voucherMap = new Map<string, PurchasePaymentHistoryItem>();
    apiMatches.forEach((pm) => {
      voucherMap.set(pm.id, {
        id: pm.id,
        paymentNo: pm.paymentNo || pm.id,
        paymentDate:
          pm.paymentDate ||
          editingPurchase?.purchaseDate ||
          formData.purchaseDate,
        amount: Number(pm.amount) || 0,
        paymentMode: pm.paymentMode || pm.paymentType || "Bank Transfer",
        referenceNo: pm.referenceNo || purchaseRefInv || purchaseRefNo,
        notes: pm.notes || "",
        status: pm.status || "Completed",
      });
    });

    const list = Array.from(voucherMap.values());
    const totalVoucherAmount = list.reduce((acc, item) => acc + item.amount, 0);

    // 3. If there is an initial paid amount recorded on the purchase order that exceeds existing vouchers
    const recordedPaid = editingPurchase
      ? Number(editingPurchase.paidAmount || 0)
      : Number(formData.paidAmount || 0);
    if (recordedPaid > totalVoucherAmount) {
      const initialDelta = recordedPaid - totalVoucherAmount;
      list.unshift({
        id: `initial_${purchaseRefId || purchaseRefNo || "bill"}`,
        paymentNo: `PV-INIT-${(purchaseRefNo || "BILL").replace(/[^a-zA-Z0-9]/g, "")}`,
        paymentDate:
          editingPurchase?.purchaseDate ||
          formData.purchaseDate ||
          new Date().toISOString().split("T")[0],
        amount: initialDelta,
        paymentMode:
          editingPurchase?.paymentMethod || formData.paymentMethod || "Cash",
        referenceNo: purchaseRefInv || purchaseRefNo,
        notes: "Initial payment recorded on creation of purchase bill",
        status: "Completed",
        isInitial: true,
      });
    }

    return list;
  }, [
    editingPurchase,
    formData.paidAmount,
    formData.purchaseNo,
    formData.purchaseInvoiceNo,
    formData.purchaseDate,
    formData.paymentMethod,
    billPayments,
  ]);

  const handleOpenRecordPaymentModal = () => {
    const remainingBalance = Math.max(
      0,
      calculatedTotals.grandTotal - (Number(formData.paidAmount) || 0),
    );
    formPayErr.reset();
    setFormPaymentDetails({
      amountPaid:
        remainingBalance > 0
          ? remainingBalance
          : Number(formData.paidAmount) || calculatedTotals.grandTotal,
      date: new Date().toISOString().split("T")[0],
      paymentType: formData.paymentMethod || "Bank Transfer",
      transactionId: "",
      remarks: "",
    });
    setIsFormPaymentModalOpen(true);
  };

  const handlePrintPaymentReceipt = (pm: PurchasePaymentHistoryItem) => {
    const docOptions: DocumentPrintOptions = {
      docTypeTitle: "PAYMENT OUT VOUCHER",
      docNo: pm.paymentNo,
      docDate: pm.paymentDate,
      status: "Paid",
      statusColor: "emerald",
      partyTitle: "Paid To (Supplier)",
      partyName:
        editingPurchase?.supplierName || formData.supplierName || "Supplier",
      extraMeta: [
        {
          label: "Purchase Bill #",
          value: editingPurchase?.purchaseNo || formData.purchaseNo,
        },
        { label: "Payment Mode", value: pm.paymentMode || "Bank Transfer" },
        { label: "Reference #", value: pm.referenceNo || "N/A" },
      ],
      items: [
        {
          name: `Payment towards Purchase Bill #${editingPurchase?.purchaseNo || formData.purchaseNo}`,
          quantity: 1,
          unitPrice: pm.amount,
          total: pm.amount,
          remarks: pm.notes || "Payment disbursement recorded successfully",
        },
      ],
      grandTotal: pm.amount,
      paidAmount: pm.amount,
      balance: 0,
      notes: pm.notes,
      primarySignatoryLabel: "Authorized Officer",
    };
    printBusinessDocument(docOptions);
  };

  const handleDownloadPaymentReceipt = async (
    pm: PurchasePaymentHistoryItem,
  ) => {
    const toastId = `dl-pv-${pm.id}`;
    toast.loading(`Preparing Payment Voucher ${pm.paymentNo}...`, {
      id: toastId,
    });
    try {
      const docOptions: DocumentPrintOptions = {
        docTypeTitle: "PAYMENT OUT VOUCHER",
        docNo: pm.paymentNo,
        docDate: pm.paymentDate,
        status: "Paid",
        statusColor: "emerald",
        partyTitle: "Paid To (Supplier)",
        partyName:
          editingPurchase?.supplierName || formData.supplierName || "Supplier",
        extraMeta: [
          {
            label: "Purchase Bill #",
            value: editingPurchase?.purchaseNo || formData.purchaseNo,
          },
          { label: "Payment Mode", value: pm.paymentMode || "Bank Transfer" },
          { label: "Reference #", value: pm.referenceNo || "N/A" },
        ],
        items: [
          {
            name: `Payment towards Purchase Bill #${editingPurchase?.purchaseNo || formData.purchaseNo}`,
            quantity: 1,
            unitPrice: pm.amount,
            total: pm.amount,
            remarks: pm.notes || "Payment disbursement recorded successfully",
          },
        ],
        grandTotal: pm.amount,
        paidAmount: pm.amount,
        balance: 0,
        notes: pm.notes,
        primarySignatoryLabel: "Authorized Officer",
      };
      await downloadBusinessDocument(
        docOptions,
        `Payment_Voucher_${pm.paymentNo.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
      );
      toast.success(`Payment Voucher ${pm.paymentNo} downloaded!`, {
        id: toastId,
      });
    } catch (err) {
      console.error("Download voucher error:", err);
      toast.error("Failed to download payment voucher PDF.", { id: toastId });
    }
  };

  // Save Purchase Order (Create or Update with Work API).
  // Wrapped in a submit guard so double-clicks / repeated Enter cannot send it twice.
  const handleSavePurchase = (status: PurchaseStatus = "Pending") =>
    saveGuard.runOnce(() => performSavePurchase(status));

  /** Runs the full form validation; returns true (and clears messages) only when the form is valid. */
  const computePurchaseErrors = (): FieldErrors =>
    validatePurchaseForm(formData, {
      totals: calculatedTotals,
      paymentDate: formPaymentDetails.date,
      isEditing: Boolean(editingPurchase),
      requestSelectionMissing:
        purchaseType === "with_request" &&
        !selectedRequestId &&
        eligiblePurchaseRequests.length > 0,
    });
  const validatePurchaseBeforeSave = (): boolean =>
    formErr.validateAll(computePurchaseErrors());

  // After the first Save attempt keep errors in sync with the values (cleared only when valid).
  useRevalidateAfterSubmit(formErr, computePurchaseErrors, [
    formData,
    calculatedTotals,
    formPaymentDetails.date,
    editingPurchase,
    purchaseType,
    selectedRequestId,
    eligiblePurchaseRequests.length,
  ]);

  // Every form / modal starts and ends clean: no errors carried across open/close.
  useEffect(() => {
    formErr.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormModalOpen]);
  useEffect(() => {
    formPayErr.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormPaymentModalOpen]);
  useEffect(() => {
    recordPayErr.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaymentModalOpen]);
  useEffect(() => {
    quickProdErr.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddProductModalOpen]);
  useRevalidateAfterSubmit(
    formPayErr,
    () =>
      validateFormPayment(
        {
          amountPaid: formPaymentDetails.amountPaid,
          date: formPaymentDetails.date,
          paymentType: formPaymentDetails.paymentType || "Cash",
        },
        editingPurchase
          ? Math.max(
              0,
              calculatedTotals.grandTotal - (Number(formData.paidAmount) || 0),
            )
          : calculatedTotals.grandTotal,
        "Payment amount",
      ),
    [
      formPaymentDetails,
      editingPurchase,
      calculatedTotals.grandTotal,
      formData.paidAmount,
    ],
  );
  useRevalidateAfterSubmit(
    quickProdErr,
    () => validateQuickProduct(quickProductForm),
    [quickProductForm],
  );

  /**
   * Records each split entry as its own Payments Out record against this bill and supplier (the bill API has no payment
   * list). Entries are sent one at a time and NEVER retried: if one fails the rest are not sent and the caller is told
   * how many were saved, so nothing is paid twice.
   */
  const recordSplitPayments = async (
    po: PurchaseOrder,
  ): Promise<{ total: number; saved: number; failed?: string }> => {
    const rows = activeSplitRows(splitRows);
    let saved = 0;
    if (!UUID_REGEX.test(po.supplierId)) {
      return { total: rows.length, saved, failed: "The supplier of this bill is not valid for recording payments." };
    }
    for (const row of rows) {
      const fields = splitRowToPaymentFields(row, po.purchaseNo);
      try {
        await workPaymentOutApi.createPaymentOut(
          mapUiToCreatePaymentOutPayload({
            supplierId: po.supplierId,
            purchaseOrderId: po.id,
            paymentType: fields.paymentType,
            amount: fields.amount,
            referenceNo: fields.referenceNo,
            notes: fields.notes,
          }),
        );
        saved += 1;
      } catch (e) {
        dispatch(
          baseApi.util.invalidateTags([
            { type: "PaymentOut", id: "LIST" },
            { type: "PurchaseOrder", id: "LIST" },
            { type: "PurchaseBill", id: "LIST" },
            { type: "SupplierLedger" },
            { type: "Supplier", id: "LIST" },
          ]),
        );
        return { total: rows.length, saved, failed: getApiErrorMessage(e, "A payment could not be saved.") };
      }
    }
    dispatch(
      baseApi.util.invalidateTags([
        { type: "PaymentOut", id: "LIST" },
        { type: "PurchaseOrder", id: "LIST" },
        { type: "PurchaseBill", id: "LIST" },
        { type: "SupplierLedger" },
        { type: "Supplier", id: "LIST" },
      ]),
    );
    return { total: rows.length, saved };
  };

  const splitOutcomeMessage = (poNo: string, o: { total: number; saved: number; failed?: string }) =>
    `Purchase bill ${poNo} was saved, but only ${o.saved} of ${o.total} payments were recorded. ${o.failed} Record the remaining payments from the bill (Record Payment). Nothing was retried.`;

  const performSavePurchase = async (_status: PurchaseStatus = "Pending") => {
    // Split payments are checked first so the message appears next to the entries
    if (isSplitMode) {
      setSplitShowErrors(true);
      if (!splitValidation.ok) return;
    }
    // Validate BEFORE any API call, voucher creation or stock adjustment.
    // Missing suppliers / products are never replaced by "the first available" record.
    if (!validatePurchaseBeforeSave()) {
      return;
    }
    const targetSupplierId = formData.supplierId;

    const finalPaid = Math.min(
      calculatedTotals.grandTotal,
      Math.max(0, Number(formData.paidAmount) || 0),
    );
    const finalBalance = Math.max(0, calculatedTotals.grandTotal - finalPaid);
    const finalPaymentStatus: PurchasePaymentStatus =
      finalBalance <= 0 ? "Paid" : finalPaid > 0 ? "Partial" : "Unpaid";

    setIsSubmitting(true);
    let splitOutcome: { total: number; saved: number; failed?: string } | null = null;

    try {
      if (editingPurchase) {
        // UPDATE existing purchase order via Work API
        const payload = mapUiToUpdatePurchaseOrderPayload(
          {
            purchaseBillManualNo: formData.purchaseBillManualNo,
            dueDate: formData.dueDate,
            expectedDeliveryDate: formData.dueDate,
            discount: calculatedTotals.discount,
            notes: formData.notes,
          },
          formData.items,
        );

        let updatedPo: PurchaseOrder;
        const apiRes = await workPurchaseOrderApi.updatePurchaseOrder(
          editingPurchase.id,
          payload,
        );
        if (apiRes && apiRes.data) {
          const mapped = mapApiPurchaseOrderToUi(apiRes.data);
          // Work API PUT /work/purchase-orders/{id} only stores line items/due date/notes.
          // Retain the payment disbursement and form line item details (batch, unit, expDate):
          updatedPo = {
            ...mapped,
            items: formData.items.map((formIt, idx) => {
              const apiIt = mapped.items?.[idx];
              return {
                ...formIt,
                id: apiIt?.id || formIt.id,
                total: apiIt?.total || formIt.total,
              };
            }),
            purchaseInvoiceNo:
              formData.purchaseInvoiceNo || mapped.purchaseInvoiceNo,
            paidAmount: finalPaid,
            balance: finalBalance,
            paymentStatus: finalPaymentStatus,
            hasManualPayment: finalPaid > 0,
            paymentMethod:
              (formData.paymentMethod as any) ||
              (finalPaid > 0 ? "Cash" : "Bank Transfer"),
            paymentTerms: formData.paymentTerms || mapped.paymentTerms,
            withGst: formData.withGst,
            gstType: formData.gstType,
            shipping: formData.shipping,
            otherCharges: formData.otherCharges,
          };
        } else {
          throw new Error("The server did not return the saved purchase order. Please try again.");
        }

        // Auto-generate Payment Out voucher if new payment was recorded during edit
        const prevPaid = Number(editingPurchase.paidAmount || 0);
        const existingVouchersSum = billPayments
          .filter(
            (pm) =>
              pm.status !== "Cancelled" &&
              (pm.purchaseId === updatedPo.id ||
                pm.purchaseNo === updatedPo.purchaseNo),
          )
          .reduce((sum, pm) => sum + (Number(pm.amount) || 0), 0);
        const basePaidBenchmark = Math.max(prevPaid, existingVouchersSum);

        if (!isSplitMode && finalPaid > basePaidBenchmark) {
          const deltaAmount = finalPaid - basePaidBenchmark;

          if (UUID_REGEX.test(updatedPo.supplierId)) {
            try {
              const pRes = await workPaymentOutApi.createPaymentOut(
                mapUiToCreatePaymentOutPayload({
                  supplierId: updatedPo.supplierId,
                  purchaseOrderId: updatedPo.id,
                  paymentType: formData.paymentMethod || "Bank Transfer",
                  paymentMode: formData.paymentMethod || "Bank Transfer",
                  amount: deltaAmount,
                  referenceNo:
                    formPaymentDetails.transactionId ||
                    formData.purchaseInvoiceNo ||
                    updatedPo.purchaseNo,
                  notes:
                    formPaymentDetails.remarks ||
                    `Payment for ${updatedPo.purchaseNo}`,
                }),
              );
            } catch (pErr) {
              console.warn(
                "API Payment Out creation on purchase bill edit warning:",
                pErr,
              );
            }
          }

        }

        if (isSplitMode) splitOutcome = await recordSplitPayments(updatedPo);

        setLivePurchases((prev) =>
          prev.map((p) => (p.id === updatedPo.id ? updatedPo : p)),
        );
        if (splitOutcome?.failed) {
          toast.error(splitOutcomeMessage(updatedPo.purchaseNo, splitOutcome));
        } else {
          toast.success(
            `Purchase order ${updatedPo.purchaseNo} updated successfully!`,
          );
        }
        setIsFormModalOpen(false);
        fetchPurchaseOrders(true);
      } else {
        // CREATE new purchase order via Work API
        const payload = mapUiToCreatePurchaseOrderPayload(
          {
            supplierId: targetSupplierId,
            purchaseBillManualNo: formData.purchaseBillManualNo,
            dueDate: formData.dueDate,
            expectedDeliveryDate: formData.dueDate,
            discount: calculatedTotals.discount,
            // In split mode the payments are recorded one by one after the bill is saved
            paidAmount: isSplitMode ? 0 : finalPaid,
            notes: formData.notes,
          },
          formData.items,
        );

        let createdPo: PurchaseOrder;
        const apiRes = await workPurchaseOrderApi.createPurchaseOrder(payload);
        if (apiRes && apiRes.data) {
          createdPo = mapApiPurchaseOrderToUi(apiRes.data);
        } else {
          throw new Error("The server did not return the saved purchase order. Please try again.");
        }

        createdPo = {
          ...createdPo,
          items: formData.items.map((formIt, idx) => {
            const apiIt = createdPo.items?.[idx];
            return {
              ...formIt,
              id: apiIt?.id || formIt.id,
              total: apiIt?.total || formIt.total,
            };
          }),
          purchaseInvoiceNo:
            formData.purchaseInvoiceNo || createdPo.purchaseInvoiceNo,
          paidAmount: finalPaid,
          balance: finalBalance,
          paymentStatus: finalPaymentStatus,
          hasManualPayment: finalPaid > 0,
          paymentMethod:
            (formData.paymentMethod as any) ||
            (finalPaid > 0 ? "Cash" : "Bank Transfer"),
          paymentTerms: formData.paymentTerms || createdPo.paymentTerms,
          withGst: formData.withGst,
          gstType: formData.gstType,
          shipping: formData.shipping,
          otherCharges: formData.otherCharges,
        };

        // Record payment voucher in Work Payment Out API & local store if initial payment was specified
        if (!isSplitMode && finalPaid > 0) {

          if (UUID_REGEX.test(createdPo.supplierId)) {
            try {
              const pRes = await workPaymentOutApi.createPaymentOut(
                mapUiToCreatePaymentOutPayload({
                  supplierId: createdPo.supplierId,
                  paymentType: formData.paymentMethod || "Bank Transfer",
                  paymentMode: formData.paymentMethod || "Bank Transfer",
                  amount: finalPaid,
                  referenceNo:
                    formPaymentDetails.transactionId ||
                    formData.purchaseInvoiceNo ||
                    createdPo.purchaseNo,
                  notes:
                    formPaymentDetails.remarks ||
                    `Initial payment for ${createdPo.purchaseNo}`,
                }),
              );
            } catch (pErr) {
              console.warn(
                "API Payment Out creation on purchase bill create warning:",
                pErr,
              );
            }
          }

        }

        if (isSplitMode) splitOutcome = await recordSplitPayments(createdPo);

        setLivePurchases((prev) => [createdPo, ...prev]);

        // If created directly in an inwarded state (Approved or Received), inward stock into Commerce API
        if (
          !createdPo.stockReceived &&
          (createdPo.purchaseStatus === "Received" ||
            createdPo.purchaseStatus === "Completed")
        ) {
          for (const item of createdPo.items) {
            if (!item.productId || !item.quantity) continue;
            try {
              const matchingProd = availableProducts.find(
                (p) =>
                  p.id === item.productId ||
                  p.productName.toLowerCase() ===
                    (item.productName || "").toLowerCase(),
              );
              const prodBatch =
                matchingProd?.batchNo || (matchingProd as any)?.initialBatchNo;
              const cleanBatch =
                item.batch && item.batch.trim() && item.batch !== "SELECT BATCH"
                  ? item.batch.trim()
                  : prodBatch || undefined;
              await stockApi.adjustStock({
                productId: item.productId,
                quantity: item.quantity,
                batchNo: cleanBatch,
                adjustmentType: "INWARD",
                reason: `Purchase Bill ${createdPo.purchaseNo} created (${createdPo.purchaseStatus})`,
                costPrice: item.purchasePrice,
                sellingPrice: item.salePrice,
                expDate: item.expDate || matchingProd?.expDate || undefined,
                supplierName: createdPo.supplierName,
              });
            } catch (adjErr) {
              console.warn(
                "Backend stock adjustment warning on purchase create:",
                adjErr,
              );
            }
          }
          dispatch(
            baseApi.util.invalidateTags([
              { type: "Stock", id: "LIST" },
              { type: "Batch", id: "LIST" },
              { type: "Stock", id: "LEDGER" },
              { type: "Product", id: "LIST" },
            ]),
          );
        }

        // If this purchase was converted from a Purchase Request, update its status to "Purchase Created" NOW
        if (originatingRequestId) {
          try {
            await commercePurchaseRequestApi.patchPurchaseRequestStatus(
              originatingRequestId,
              {
                status: "Purchase Created",
              },
            );
          } catch (statusErr) {
            console.warn(
              "API purchase request status update (Purchase Created) warning:",
              statusErr,
            );
          }
          // The request list must be re-read from the API the next time the form opens
          hasLoadedFormMasterDataRef.current = false;
          setOriginatingRequestId(null);
        }

        if (splitOutcome?.failed) {
          toast.error(splitOutcomeMessage(createdPo.purchaseNo, splitOutcome));
        } else {
          toast.success(
            `Purchase order ${createdPo.purchaseNo} created successfully!`,
          );
        }
        setIsFormModalOpen(false);
        fetchPurchaseOrders(true);
      }
    } catch (err: any) {
      console.error("Error saving purchase order:", err);
      // Keep everything the user typed; show backend field problems next to the fields.
      const apiFields = extractApiFieldErrors(err);
      const mapped: FieldErrors = {};
      Object.entries(apiFields).forEach(([path, msg]) => {
        mapped[mapPurchaseApiFieldKey(path)] = msg;
      });
      if (Object.keys(mapped).length > 0) {
        formErr.merge(mapped);
        requestAnimationFrame(() => focusField(Object.keys(mapped)[0]));
      }
      toast.error(
        getApiErrorMessage(
          err,
          "We could not save the purchase order. Please review the details and try again.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change Purchase Order Status via Work API & sync Stock Inward to Commerce
  const handleUpdateStatus = (
    po: PurchaseOrder,
    newStatus: "Pending" | "Approved" | "Ordered" | "Received" | "Cancelled",
  ) =>
    statusGuard.runOnce(async () => {
      setActiveDropdownId(null);
      setDropdownPos(null);
      // Check the action is allowed for this order BEFORE any API call or stock inward.
      const problem = validateStatusChange(po, newStatus);
      if (problem) {
        toast.warning(problem);
        return;
      }
      await performUpdateStatus(po, newStatus);
    });

  const performUpdateStatus = async (
    po: PurchaseOrder,
    newStatus: "Pending" | "Approved" | "Ordered" | "Received" | "Cancelled",
  ) => {
    // Helper to perform live stock inward to Commerce API
    const inwardStockViaApi = async (targetPo: PurchaseOrder) => {
      if (targetPo.stockReceived) {
        dispatch(
          baseApi.util.invalidateTags([
            { type: "Stock", id: "LIST" },
            { type: "Batch", id: "LIST" },
            { type: "Stock", id: "LEDGER" },
            { type: "Product", id: "LIST" },
          ]),
        );
        return;
      }
      let inwardedCount = 0;
      for (const item of targetPo.items) {
        if (!item.productId || !item.quantity) continue;
        try {
          const matchingProd = availableProducts.find(
            (p) =>
              p.id === item.productId ||
              p.productName.toLowerCase() ===
                (item.productName || "").toLowerCase(),
          );
          const prodBatch =
            matchingProd?.batchNo || (matchingProd as any)?.initialBatchNo;
          const cleanBatch =
            item.batch && item.batch.trim() && item.batch !== "SELECT BATCH"
              ? item.batch.trim()
              : prodBatch || undefined;
          await stockApi.adjustStock({
            productId: item.productId,
            quantity: item.quantity,
            batchNo: cleanBatch,
            adjustmentType: "INWARD",
            reason: `Purchase Bill ${targetPo.purchaseNo} (${newStatus})`,
            costPrice: item.purchasePrice,
            sellingPrice: item.salePrice,
            expDate: item.expDate || matchingProd?.expDate || undefined,
            supplierName: targetPo.supplierName,
          });
          inwardedCount++;
        } catch (stkErr) {
          console.warn(
            "API Stock inward warning for item:",
            item.productName,
            stkErr,
          );
        }
      }
      if (inwardedCount > 0) {
        dispatch(
          baseApi.util.invalidateTags([
            { type: "Stock", id: "LIST" },
            { type: "Batch", id: "LIST" },
            { type: "Stock", id: "LEDGER" },
            { type: "Product", id: "LIST" },
          ]),
        );
      }
    };

    // If it's a local draft / offline record (e.g. "po_1792142284518"), update locally without 404ing the API
    if (!UUID_REGEX.test(po.id)) {
      const updated: PurchaseOrder = {
        ...po,
        purchaseStatus: newStatus as any,
      };
      setLivePurchases((prev) =>
        prev.map((p) => (p.id === po.id ? updated : p)),
      );
      if (newStatus === "Received") {
        await inwardStockViaApi(updated);
        toast.success(
          `Purchase order ${po.purchaseNo} marked as ${newStatus} & inventory stock inwarded!`,
        );
      } else {
        toast.success(
          `Purchase order ${po.purchaseNo} status changed to ${newStatus}`,
        );
      }
      return;
    }

    const batchPayload = po.items.map((it) => {
      const matchingProd = availableProducts.find(
        (p) =>
          p.id === it.productId ||
          p.productName.toLowerCase() === (it.productName || "").toLowerCase(),
      );
      const prodBatch =
        matchingProd?.batchNo || (matchingProd as any)?.initialBatchNo;
      const cleanBatch =
        it.batch && it.batch.trim() && it.batch !== "SELECT BATCH"
          ? it.batch.trim()
          : prodBatch || undefined;
      return {
        productId: ensureValidUuid(it.productId),
        quantity: Math.max(1, Number(it.quantity) || 1),
        unitCost: Math.max(0, Number(it.purchasePrice) || 0),
        taxPercent: Math.max(0, Number(it.taxPercent) || 0),
        batchNo: cleanBatch,
        batch: cleanBatch,
        expDate: it.expDate || matchingProd?.expDate || undefined,
        mfgDate: it.mfgDate || matchingProd?.mfgDate || undefined,
      };
    });

    try {
      // If receiving, ensure line items in the backend purchase order carry a batch number first
      if (newStatus === "Received") {
        try {
          await workPurchaseOrderApi.updatePurchaseOrder(po.id, {
            items: batchPayload,
          });
        } catch (putErr) {
          console.warn("Syncing batch to PO before receiving warning:", putErr);
        }
      }

      // Status patch strictly expects { status: newStatus }
      const res = await workPurchaseOrderApi.patchPurchaseOrderStatus(
        po.id,
        newStatus,
      );

      if (res && res.data) {
        const mapped = mapApiPurchaseOrderToUi(res.data);
        setLivePurchases((prev) =>
          prev.map((p) => (p.id === po.id ? mapped : p)),
        );
        if (newStatus === "Received") {
          await inwardStockViaApi(mapped);
          toast.success(
            `Purchase order ${po.purchaseNo} marked as ${newStatus} & inventory stock inwarded!`,
          );
        } else {
          toast.success(
            `Purchase order ${po.purchaseNo} status changed to ${newStatus}`,
          );
        }
      } else {
        const updated: PurchaseOrder = {
          ...po,
          purchaseStatus: newStatus as any,
        };
        setLivePurchases((prev) =>
          prev.map((p) => (p.id === po.id ? updated : p)),
        );
        if (newStatus === "Received") {
          await inwardStockViaApi(updated);
          toast.success(
            `Purchase order ${po.purchaseNo} marked as ${newStatus} & inventory stock inwarded!`,
          );
        } else {
          toast.success(
            `Purchase order ${po.purchaseNo} status changed to ${newStatus}`,
          );
        }
      }
      fetchPurchaseOrders(true);
    } catch (err: any) {
      toast.error(
        getApiErrorMessage(
          err,
          `We could not change the status to ${newStatus}. Please try again.`,
        ),
      );
    }
  };

  // Delete Purchase Order via Work API with confirmation modal
  const handleOpenDeleteModal = (po: PurchaseOrder) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    if (po.purchaseStatus === "Received") {
      toast.error("Received purchase orders are final and cannot be deleted.");
      return;
    }
    setDeleteTargetPo(po);
    setDeletePoError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeletePo = () =>
    deleteGuard.runOnce(() => performDeletePo());

  const performDeletePo = async () => {
    if (!deleteTargetPo) return;
    if (
      deleteTargetPo.purchaseStatus === "Received" ||
      (deleteTargetPo.purchaseStatus as string) === "Completed"
    ) {
      setDeletePoError(
        "Received purchase orders are final and cannot be deleted.",
      );
      return;
    }
    setIsDeletingPo(true);
    setDeletePoError(null);

    if (!UUID_REGEX.test(deleteTargetPo.id)) {
      setLivePurchases((prev) =>
        prev.filter((p) => p.id !== deleteTargetPo.id),
      );
      toast.success(`Purchase order "${deleteTargetPo.purchaseNo}" deleted.`);
      setIsDeleteModalOpen(false);
      setDeleteTargetPo(null);
      setIsDeletingPo(false);
      return;
    }

    try {
      await workPurchaseOrderApi.deletePurchaseOrder(deleteTargetPo.id);
      setLivePurchases((prev) =>
        prev.filter((p) => p.id !== deleteTargetPo.id),
      );
      toast.success(
        `Purchase order "${deleteTargetPo.purchaseNo}" deleted successfully.`,
      );
      setIsDeleteModalOpen(false);
      setDeleteTargetPo(null);
      fetchPurchaseOrders(true);
    } catch (err: any) {
      const errMsg = getApiErrorMessage(
        err,
        "We could not delete this purchase order. Please try again.",
      );
      setDeletePoError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeletingPo(false);
    }
  };

  // Payment Recording
  const handleOpenPaymentModal = (po: PurchaseOrder) => {
    setSelectedPurchase(po);
    setRecordAmount(po.balance);
    setRecordMethod("Bank Transfer");
    setRecordNotes("");
    recordPayErr.reset();
    setIsPaymentModalOpen(true);
  };

  useRevalidateAfterSubmit(
    recordPayErr,
    () =>
      validateRecordPayment(
        recordAmount,
        Number(selectedPurchase?.balance) || 0,
        recordMethod,
      ),
    [recordAmount, recordMethod, selectedPurchase],
  );

  const handleConfirmPayment = () =>
    paymentGuard.runOnce(() => performConfirmPayment());

  const performConfirmPayment = async () => {
    if (!selectedPurchase) return;
    // Validate against the outstanding balance BEFORE creating any payment voucher.
    if (
      !recordPayErr.validateAll(
        validateRecordPayment(
          recordAmount,
          Number(selectedPurchase.balance) || 0,
          recordMethod,
        ),
      )
    ) {
      return;
    }

    try {
      // 1. If backend supplier ID is valid UUID, create live Payment Out in Work API
      if (UUID_REGEX.test(selectedPurchase.supplierId)) {
        try {
          const pRes = await workPaymentOutApi.createPaymentOut(
            mapUiToCreatePaymentOutPayload({
              supplierId: selectedPurchase.supplierId,
              purchaseOrderId: selectedPurchase.id,
              paymentType: recordMethod,
              paymentMode: recordMethod,
              amount: recordAmount,
              referenceNo: recordNotes || selectedPurchase.purchaseNo,
              notes:
                `Payment for ${selectedPurchase.purchaseNo}. ${recordNotes || ""}`.trim(),
            }),
          );
        } catch (apiErr) {
          console.warn("API Payment Out creation warning:", apiErr);
        }
      }


      // The bill's paid amount, balance and status are re-read from the API below.
      toast.success(
        `Payment of ₹${recordAmount.toLocaleString("en-IN")} recorded for ${selectedPurchase.purchaseNo}`,
      );
      setIsPaymentModalOpen(false);
      fetchPurchaseOrders(true);
    } catch (err: any) {
      const apiFields = extractApiFieldErrors(err);
      if (apiFields.amount || apiFields.paymentType) {
        recordPayErr.merge({
          ...(apiFields.amount ? { amount: apiFields.amount } : {}),
          ...(apiFields.paymentType ? { method: apiFields.paymentType } : {}),
        });
      }
      toast.error(
        getApiErrorMessage(
          err,
          "We could not record the payment. Please try again.",
        ),
      );
    }
  };

  // Filtered Purchases (Reflects API data)
  const displayedPurchases = useMemo(() => {
    const base: PurchaseOrder[] = livePurchases;

    return base.filter((p) => {
      const q = appliedSearch.toLowerCase().trim();
      if (q) {
        const matchesSearch =
          p.purchaseNo.toLowerCase().includes(q) ||
          (p.purchaseInvoiceNo || "").toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q) ||
          p.items.some((it) => it.productName.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      if (appliedPurchaseStatus !== "All") {
        const matchesPurchaseStatus =
          p.purchaseStatus.toLowerCase() ===
          appliedPurchaseStatus.toLowerCase();
        if (!matchesPurchaseStatus) return false;
      }

      const matchesPaymentStatus =
        appliedPaymentStatus === "All" ||
        p.paymentStatus.toLowerCase() === appliedPaymentStatus.toLowerCase();

      const matchesSupplier =
        appliedSupplier === "All" || p.supplierId === appliedSupplier;

      return matchesPaymentStatus && matchesSupplier;
    });
  }, [
    isApiConnected,
    livePurchases,
    appliedSearch,
    appliedPurchaseStatus,
    appliedPaymentStatus,
    appliedSupplier,
  ]);

  const totalPages =
    isApiConnected &&
    totalApiPages !== null &&
    appliedPaymentStatus === "All" &&
    appliedSupplier === "All" &&
    displayedPurchases.length <= (totalApiRecords || 0)
      ? Math.max(1, totalApiPages)
      : Math.ceil(displayedPurchases.length / pageSize) || 1;

  const totalRecordsCount =
    isApiConnected &&
    totalApiRecords !== null &&
    appliedPaymentStatus === "All" &&
    appliedSupplier === "All" &&
    displayedPurchases.length <= (totalApiRecords || 0)
      ? totalApiRecords
      : displayedPurchases.length;

  const paginatedPurchases = useMemo(() => {
    // If backend pagination is in place and returns at most pageSize items:
    if (
      isApiConnected &&
      appliedPaymentStatus === "All" &&
      appliedSupplier === "All" &&
      displayedPurchases.length <= pageSize
    ) {
      return displayedPurchases;
    }
    const start = (currentPage - 1) * pageSize;
    return displayedPurchases.slice(start, start + pageSize);
  }, [
    isApiConnected,
    displayedPurchases,
    currentPage,
    pageSize,
    appliedPaymentStatus,
    appliedSupplier,
  ]);

  // Export Purchases to Excel
  const handleExportExcel = () => {
    if (displayedPurchases.length === 0) {
      toast.error("No purchase records available to export.");
      return;
    }

    const excelRows = displayedPurchases.map((p, idx) => ({
      sNo: idx + 1,
      purchaseNo: p.purchaseNo,
      purchaseInvoiceNo: p.purchaseInvoiceNo || "-",
      purchaseDate: p.purchaseDate,
      supplierName: p.supplierName,
      supplierCode: p.supplierCode || "-",
      subtotal: Number(p.subtotal || 0),
      tax: Number(p.tax || 0),
      grandTotal: Number(p.grandTotal || 0),
      paidAmount: Number(p.paidAmount || 0),
      balance: Number(p.balance || 0),
      paymentStatus: p.paymentStatus,
      purchaseStatus: p.purchaseStatus,
    }));

    const totalGrand = excelRows.reduce((acc, row) => acc + row.grandTotal, 0);
    const totalPaid = excelRows.reduce((acc, row) => acc + row.paidAmount, 0);
    const totalBal = excelRows.reduce((acc, row) => acc + row.balance, 0);

    exportTableToExcel({
      filename: `Purchase_Bills_Report_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Purchase Bills",
      title: "YAA CREATIONS CRM - PURCHASE ORDERS & BILLS DIRECTORY",
      subtitle: `Total Purchase Orders: ${displayedPurchases.length} | Generated: ${new Date().toLocaleDateString('en-GB')}`,
      columns: [
        { header: "#", key: "sNo", align: "center", width: 8 },
        { header: "PO #", key: "purchaseNo", align: "center", width: 16 },
        {
          header: "Supplier Bill #",
          key: "purchaseInvoiceNo",
          align: "center",
          width: 16,
        },
        { header: "Date", key: "purchaseDate", align: "center", width: 14 },
        {
          header: "Supplier Name",
          key: "supplierName",
          align: "left",
          width: 24,
        },
        {
          header: "Subtotal (₹)",
          key: "subtotal",
          align: "right",
          type: "currency",
          width: 16,
        },
        {
          header: "Tax (₹)",
          key: "tax",
          align: "right",
          type: "currency",
          width: 14,
        },
        {
          header: "Grand Total (₹)",
          key: "grandTotal",
          align: "right",
          type: "currency",
          width: 18,
        },
        {
          header: "Paid (₹)",
          key: "paidAmount",
          align: "right",
          type: "currency",
          width: 16,
        },
        {
          header: "Balance (₹)",
          key: "balance",
          align: "right",
          type: "currency",
          width: 16,
        },
        {
          header: "Payment Status",
          key: "paymentStatus",
          align: "center",
          width: 16,
        },
        { header: "Status", key: "purchaseStatus", align: "center", width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: "TOTAL",
        purchaseNo: `${displayedPurchases.length} Bills`,
        grandTotal: totalGrand,
        paidAmount: totalPaid,
        balance: totalBal,
      },
    });

    toast.success(
      `Purchase Bills Excel report downloaded (${displayedPurchases.length} records)!`,
    );
  };

  return (
    <>
      {isFormModalOpen ? (
        <div className="space-y-6 animate-in fade-in duration-150 font-sans pb-12">
          {/* Top Full-Page Navigation Header with Back button on the RIGHT */}
          <div className="bg-[#33077C] rounded-2xl shadow-md p-5 sm:p-6 flex items-center justify-between gap-4 text-white">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {editingPurchase
                  ? `Edit Purchase Order: ${editingPurchase.purchaseNo}`
                  : "New Purchase Bill"}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 font-medium mt-0.5">
                {editingPurchase
                  ? `Update purchase order ${editingPurchase.purchaseNo} details and line items`
                  : "Configure supplier procurement, product items, and payment breakdown"}
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
              id="purchase-order-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (!isSubmitting) {
                  handleSavePurchase(
                    editingPurchase
                      ? editingPurchase.purchaseStatus
                      : "Pending",
                  );
                }
              }}
              className="space-y-6 text-xs sm:text-sm"
            >
              {/* Purchase Type Configuration Bar */}
              <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/30 to-slate-50 border border-purple-100/90 rounded-xl p-4.5 space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  <div>
                    <FormLabel required>Purchase Type</FormLabel>
                    <CustomSelect
                      value={purchaseType}
                      onChange={(val) =>
                        handlePurchaseTypeChange(
                          val as "with_request" | "without_request",
                        )
                      }
                      options={[
                        {
                          value: "without_request",
                          label: "Without Purchase Request (Direct Bill)",
                        },
                        {
                          value: "with_request",
                          label: "With Purchase Request",
                        },
                      ]}
                      placeholder="Select Purchase Type"
                    />
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      {purchaseType === "with_request"
                        ? "Select an approved requisition to load vendor and items"
                        : "Create direct supplier purchase bill without a request"}
                    </p>
                  </div>

                  {purchaseType === "with_request" && (
                    <div className="md:col-span-1 lg:col-span-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between mb-1">
                        <FormLabel required>Select Purchase Request</FormLabel>
                        {selectedRequestId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequestId("");
                              setOriginatingRequestId(null);
                            }}
                            className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                          >
                            Clear Selection
                          </button>
                        )}
                      </div>
                      <div {...fieldAttr("purchaseRequest")}>
                      <CustomSelect
                        value={selectedRequestId}
                        onChange={(val) => {
                          formErr.clearError("purchaseRequest");
                          handleSelectPurchaseRequest(val);
                        }}
                        options={eligiblePurchaseRequests.map((r) => ({
                          value: r.id,
                          label: `${r.requestNo} — ${r.supplierName || r.requestedBy || "Requisition"} (${r.items?.length || 0} items) • [${r.status}]`,
                        }))}
                        placeholder={
                          isLoadingRequests
                            ? "Loading requests..."
                            : "Select Approved Purchase Request..."
                        }
                      />
                      </div>
                      <FormError message={formErr.errors.purchaseRequest} />
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        {eligiblePurchaseRequests.length === 0
                          ? 'No pending purchase requests found. You can switch to "Without Purchase Request".'
                          : `${eligiblePurchaseRequests.length} pending request(s) found in system`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Linked Request Summary Banner */}
                {purchaseType === "with_request" && selectedPurchaseRequest && (
                  <div className="p-3.5 bg-white border border-purple-200 rounded-lg shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#33077C] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-[#33077C] flex items-center gap-2">
                          <span>
                            Requisition: {selectedPurchaseRequest.requestNo}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-[#33077C] border border-purple-200 font-bold">
                            {selectedPurchaseRequest.status}
                          </span>
                        </div>
                        <div className="text-slate-600 mt-0.5 flex flex-wrap items-center gap-2 font-medium text-[11px]">
                          <span>
                            Requested by:{" "}
                            <strong>
                              {selectedPurchaseRequest.requestedBy}
                            </strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            Dept: {selectedPurchaseRequest.department}
                          </span>
                          {selectedPurchaseRequest.requiredDate && (
                            <>
                              <span>&bull;</span>
                              <span>
                                Required by:{" "}
                                {formatDate(
                                  selectedPurchaseRequest.requiredDate,
                                )}
                              </span>
                            </>
                          )}
                          <span>&bull;</span>
                          <span>
                            Items: {selectedPurchaseRequest.items?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Estimated Requisition Total
                      </span>
                      <span className="font-bold text-[#33077C] text-sm">
                        ₹
                        {(
                          selectedPurchaseRequest.totalEstimatedAmount || 0
                        ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Supplier & Header Config in 3-column rows */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <FormLabel required>Select Supplier</FormLabel>
                  <div {...fieldAttr("supplierId")}>
                  <SupplierSearchableSelect
                    value={formData.supplierId}
                    onChange={(val, sup) => {
                      handleSupplierChange(val);
                      if (sup?.supplierCode) {
                        setFormData((prev) => ({
                          ...prev,
                          supplierName: sup.name,
                        }));
                      }
                    }}
                    selectedSupplier={
                      formData.supplierId
                        ? {
                            id: formData.supplierId,
                            name: formData.supplierName,
                          }
                        : null
                    }
                    placeholder="Select or search supplier..."
                  />
                  </div>
                  <FormError message={formErr.errors.supplierId} />
                </div>

                <div>
                  <FormLabel>Purchase Order / Bill No</FormLabel>
                  <input
                    type="text"
                    value={editingPurchase ? formData.purchaseNo : (formData.purchaseNo || computedPreviewNo)}
                    readOnly
                    placeholder="Auto-generated on save"
                    className="w-full h-11 px-4 bg-purple-50/70 border border-purple-200/90 rounded-xl text-xs sm:text-[13px] font-extrabold text-[#33077C] font-mono outline-none cursor-default"
                  />
                </div>

                <div>
                  <FormLabel>Purchase Bill No</FormLabel>
                  <input
                    type="text"
                    value={formData.purchaseBillManualNo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        purchaseBillManualNo: e.target.value,
                      }))
                    }
                    placeholder="Enter Purchase Bill No"
                    className={FORM_INPUT_CLS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <FormLabel required>Purchase Date</FormLabel>
                  <input
                    type="date"
                    {...fieldAttr("purchaseDate")}
                    value={formData.purchaseDate}
                    onChange={(e) => {
                      formErr.clearError("purchaseDate");
                      formErr.clearError("dueDate");
                      setFormData((prev) => ({
                        ...prev,
                        purchaseDate: e.target.value,
                      }));
                    }}
                    className={FORM_INPUT_CLS}
                  />
                  <FormError message={formErr.errors.purchaseDate} />
                </div>

                <div>
                  <FormLabel>Due Date</FormLabel>
                  <input
                    type="date"
                    {...fieldAttr("dueDate")}
                    value={formData.dueDate}
                    onChange={(e) => {
                      formErr.clearError("dueDate");
                      setFormData((prev) => ({
                        ...prev,
                        dueDate: e.target.value,
                      }));
                    }}
                    className={FORM_INPUT_CLS}
                  />
                  <FormError message={formErr.errors.dueDate} />
                </div>

                <div>
                  <FormLabel>Payment Terms</FormLabel>
                  <select
                    value={toBillPaymentTerms(formData.paymentTerms) || "Net 30 Days"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentTerms: e.target.value,
                      }))
                    }
                    className={FORM_SELECT_CLS}
                  >
                    {PAYMENT_TERM_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    {/* Keep an existing value that is not one of the standard terms selectable */}
                    {toBillPaymentTerms(formData.paymentTerms) &&
                      !PAYMENT_TERM_OPTIONS.includes(toBillPaymentTerms(formData.paymentTerms)) && (
                        <option value={toBillPaymentTerms(formData.paymentTerms) || "Net 30 Days"}>
                          {toBillPaymentTerms(formData.paymentTerms)}
                        </option>
                      )}
                  </select>
                </div>
              </div>

              {/* GST & Tax Configuration Bar */}
              <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-slate-50 border border-purple-100/80 rounded-xl p-4 space-y-3 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#33077C] flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-[#4309A2] stroke-[2.5]" />
                      Tax &amp; GST Settings
                    </span>
                    <p className="text-xs text-slate-500 font-normal leading-relaxed mt-1 max-w-3xl">
                      Choose whether GST applies to the invoice. If the supplier
                      is in the same state, GST is split equally between CGST
                      and SGST. If the supplier is in another state, the full
                      GST is applied as IGST.
                    </p>
                  </div>

                  {/* With GST vs Without GST Toggle (Styled as independent buttons per 2nd reference image) */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleWithGst(true)}
                      className={`h-9 px-4 rounded-[4px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                        formData.withGst
                          ? "bg-[#33077C] text-white shadow-sm"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {formData.withGst && (
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                      <span>With GST</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleWithGst(false)}
                      className={`h-9 px-4 rounded-[4px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                        !formData.withGst
                          ? "bg-[#33077C] text-white shadow-sm"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {!formData.withGst && (
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                      <span>Without GST</span>
                    </button>
                  </div>
                </div>

                {/* GST Type Selection (Same State vs Other State) */}
                {formData.withGst ? (
                  <div className="pt-3 border-t border-purple-100/70 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-[13px] font-bold text-slate-800 tracking-tight">
                        GST Type:
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {formData.gstType === "intra_state"
                          ? "(Same State: CGST + SGST applied equally)"
                          : "(Other State: Full IGST applied)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetGstType("intra_state")}
                        className={`h-9 px-4 rounded-[4px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                          formData.gstType === "intra_state"
                            ? "bg-[#33077C] text-white shadow-sm"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        {formData.gstType === "intra_state" && (
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        )}
                        <span>Same State: CGST + SGST</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetGstType("inter_state")}
                        className={`h-9 px-4 rounded-[4px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                          formData.gstType === "inter_state"
                            ? "bg-[#33077C] text-white shadow-sm"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        {formData.gstType === "inter_state" && (
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        )}
                        <span>Other State: IGST</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2.5 border-t border-amber-100/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-700 text-xs">
                      <Tag className="w-3.5 h-3.5" />
                      <span>
                        Invoice is marked <strong>Tax Exempt / Non-GST</strong>.
                        All product tax amounts are set to ₹0.00.
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-semibold text-xs">
                      0% GST Rate
                    </span>
                  </div>
                )}
              </div>

              {/* Product Items Table Matching Requested Column Spec */}
              <div className="border border-slate-200 rounded-[4px] overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#33077C] text-white font-bold uppercase text-[11px] border-b border-[#33077C] tracking-wider select-none">
                        <th className="py-2.5 px-2.5 text-center border-r border-white/20 w-10 text-white/80 font-extrabold">
                          #
                        </th>
                        <th className="py-2.5 px-3 text-left border-r border-white/20 min-w-[210px] text-white">
                          <span>Product Name</span>
                        </th>
                        <th className="py-2.5 px-2 text-center border-r border-white/20 min-w-[150px] text-[11px] text-white">
                          Batch No
                        </th>
                        <th className="py-2.5 px-2 text-center border-r border-white/20 w-20 text-white">
                          Quantity
                        </th>
                        <th className="py-2.5 px-2 text-center border-r border-white/20 w-20 text-white">
                          Free Quantity
                        </th>
                        <th className="py-2.5 px-2 text-center border-r border-white/20 w-24 text-white">
                          Unit
                        </th>
                        <th className="py-2.5 px-2 text-center border-r border-white/20 w-24 text-white">
                          Packing Unit
                        </th>
                        <th className="py-2.5 px-2 text-center border-r border-white/20 min-w-[110px] text-white">
                          Expiry Date
                        </th>
                        <th className="py-2.5 px-3 text-right border-r border-white/20 min-w-[130px] text-white">
                          <div>Purchase Price</div>
                          <div className="mt-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setPriceTaxMode(
                                  priceTaxMode === "Without Tax"
                                    ? "With Tax"
                                    : "Without Tax",
                                )
                              }
                              title="Click to toggle With/Without Tax"
                              className="inline-flex items-center gap-1 text-[10px] text-white font-medium bg-transparent border-0 p-0 cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
                            >
                              <span>({priceTaxMode.toLowerCase()})</span>
                              <ChevronDown className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        </th>
                        <th className="py-2.5 px-3 text-right border-r border-white/20 min-w-[105px] text-white">
                          Sale Price
                        </th>
                        <th
                          colSpan={2}
                          className="py-2 px-2 text-center border-r border-white/20 w-40 text-white"
                        >
                          <div className="text-[10.5px]">Discount (%)</div>
                          <div className="grid grid-cols-[1.1fr_1fr] text-[9.5px] text-white/80 font-semibold mt-0.5 border-t border-white/20 pt-1">
                            <span>%</span>
                            <span className="text-right pr-1">Amount</span>
                          </div>
                        </th>
                        {formData.withGst && (
                          <th
                            colSpan={2}
                            className="py-2 px-2 text-center border-r border-white/20 w-36 text-white"
                          >
                            <div className="text-[10.5px]">GST (%)</div>
                            <div className="grid grid-cols-2 text-[9.5px] text-white/80 font-semibold mt-0.5 border-t border-white/20 pt-1">
                              <span>%</span>
                              <span className="text-right pr-1">Amount</span>
                            </div>
                          </th>
                        )}
                        <th className="py-2.5 px-3 text-right border-r border-white/20 w-32 text-white">
                          Amount
                        </th>
                        <th className="py-2.5 px-2 text-center w-10 text-white/80"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {formData.items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={formData.withGst ? 15 : 13}
                            className="py-12 text-center bg-slate-50/40"
                          >
                            <p className="text-xs sm:text-[13px] text-slate-400 font-medium">
                              No items added yet. Click &quot;+ Add Item&quot;
                              below to add line items.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        formData.items.map((it, idx) => {
                          const itemSub =
                            (it.quantity || 1) * (it.purchasePrice || 0);
                          const itemDisc =
                            it.discountAmount !== undefined &&
                            it.discountAmount > 0
                              ? it.discountAmount
                              : itemSub * ((it.discountPercent || 0) / 100);
                          const itemTaxable = Math.max(0, itemSub - itemDisc);
                          const itemTaxAmt = formData.withGst
                            ? itemTaxable * ((it.taxPercent || 0) / 100)
                            : 0;
                          const taxRate = formData.withGst
                            ? it.taxPercent || 0
                            : 0;
                          const unitPriceWithTax = it.purchasePrice
                            ? it.purchasePrice * (1 + taxRate / 100)
                            : 0;

                          return (
                            <tr
                              key={it.id || idx}
                              className="hover:bg-purple-50/20 transition-colors group"
                            >
                              {/* 1. Row Number */}
                              <td className="py-3 px-2 text-center font-bold text-slate-500 border-r border-slate-200 bg-slate-50/30 align-top">
                                <div className="h-10 flex items-center justify-center">
                                  {idx + 1}
                                </div>
                              </td>

                              {/* 2. Product Name Selection */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <div {...fieldAttr(`items.${idx}.product`)}>
                                <SearchableSelect
                                  value={it.productId}
                                  onChange={(val) =>
                                    handleItemProductChange(idx, val)
                                  }
                                  onOpen={() => {
                                    if (availableProducts.length === 0) {
                                      handleProductSearch("");
                                    }
                                  }}
                                  onSearch={handleProductSearch}
                                  isLoading={isSearchingProducts}
                                  options={productOptions}
                                  placeholder="Select Product..."
                                  searchPlaceholder="Search product..."
                                  countLabel={{ singular: "product", plural: "products" }}
                                  emptyText={
                                    isSearchingProducts
                                      ? "Searching products..."
                                      : "No products found"
                                  }
                                  allowClear
                                  triggerClassName="!h-10 !rounded-[4px] !border !border-slate-300 hover:!border-slate-400 focus:!border-[#33077C] !bg-white shadow-2xs text-xs font-semibold"
                                  size="sm"
                                />
                                </div>
                                <FormError
                                  message={formErr.errors[`items.${idx}.product`]}
                                />
                              </td>

                              {/* 3. Batch No */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top min-w-[150px]">
                                {customBatchRows[idx] ? (
                                  <div className="relative flex items-center">
                                    <input
                                      type="text"
                                      value={it.batch || ""}
                                      onChange={(e) =>
                                        handleItemFieldChange(
                                          idx,
                                          "batch",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Enter Batch..."
                                      className="w-full h-10 pl-2.5 pr-7 bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-semibold font-mono text-purple-900 outline-none shadow-2xs transition-all text-center"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCustomBatchRows((prev) => ({
                                          ...prev,
                                          [idx]: false,
                                        }))
                                      }
                                      title="Switch back to batch dropdown"
                                      className="absolute right-1 p-1 text-slate-400 hover:text-[#33077C] rounded hover:bg-slate-100 transition-colors"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <div className="flex-1 min-w-0">
                                      <CustomSelect
                                        value={it.batch || ""}
                                        onChange={(val) =>
                                          handleItemBatchChange(idx, val)
                                        }
                                        options={getProductBatchOptions(
                                          it.productId,
                                          it.productName,
                                          it.batch,
                                        )}
                                        placeholder={
                                          it.productId
                                            ? "Select Batch"
                                            : "Select Product"
                                        }
                                        disabled={!it.productId}
                                        triggerClassName="!h-10 !rounded-[4px] !border !border-slate-300 hover:!border-slate-400 focus:!border-[#33077C] !bg-white shadow-2xs text-xs font-semibold font-mono uppercase text-purple-900 justify-between"
                                        size="sm"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCustomBatchRows((prev) => ({
                                          ...prev,
                                          [idx]: true,
                                        }))
                                      }
                                      title="Enter custom batch"
                                      disabled={!it.productId}
                                      className={`h-10 w-8 flex-shrink-0 flex items-center justify-center border rounded-[4px] transition-colors ${
                                        !it.productId
                                          ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                                          : "border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-400 hover:text-[#33077C]"
                                      }`}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* 4. Quantity */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <input
                                  type="number"
                                  min="1"
                                  {...fieldAttr(`items.${idx}.quantity`)}
                                  value={it.quantity === 0 ? "" : it.quantity}
                                  onKeyDown={handleNonNegativeKeyDown}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "quantity",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-full h-10 px-2 text-center bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-bold text-slate-800 outline-none shadow-2xs transition-all"
                                />
                                <FormError
                                  message={formErr.errors[`items.${idx}.quantity`]}
                                />
                              </td>

                              {/* 5. Free Quantity */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <input
                                  type="number"
                                  min="0"
                                  value={
                                    it.freeQuantity === 0 ||
                                    it.freeQuantity === undefined
                                      ? ""
                                      : it.freeQuantity
                                  }
                                  onKeyDown={handleNonNegativeKeyDown}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "freeQuantity" as any,
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-full h-10 px-2 text-center bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-semibold text-emerald-700 outline-none shadow-2xs transition-all"
                                />
                                <FormError
                                  message={
                                    formErr.errors[`items.${idx}.freeQuantity`]
                                  }
                                />
                              </td>

                              {/* 6. Unit */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <CustomSelect
                                  value={it.unit || "NONE"}
                                  onChange={(val) =>
                                    handleItemFieldChange(idx, "unit", val)
                                  }
                                  options={UNIT_OPTIONS.map((u) => ({
                                    value: u,
                                    label: u,
                                  }))}
                                  placeholder="NONE"
                                  triggerClassName="!h-10 !rounded-[4px] !border !border-slate-300 hover:!border-slate-400 focus:!border-[#33077C] !bg-white shadow-2xs text-xs font-semibold uppercase justify-center"
                                  size="sm"
                                />
                              </td>

                              {/* 7. Packing Unit (Number input) */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={
                                    it.packingUnit === undefined ||
                                    it.packingUnit === ""
                                      ? ""
                                      : it.packingUnit
                                  }
                                  onKeyDown={handleNonNegativeKeyDown}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "packingUnit" as any,
                                      e.target.value === ""
                                        ? ""
                                        : Number(e.target.value),
                                    )
                                  }
                                  className="w-full h-10 px-2 text-center bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-bold text-slate-800 outline-none shadow-2xs transition-all"
                                />
                              </td>

                              {/* 8. Expiry Date */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <input
                                  type="date"
                                  value={it.expDate || ""}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "expDate" as any,
                                      e.target.value,
                                    )
                                  }
                                  className="w-full h-10 px-2 text-center bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-medium text-slate-700 outline-none shadow-2xs transition-all"
                                />
                              </td>

                              {/* 9. Purchase Price (with and without tax separation) */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    {...fieldAttr(`items.${idx}.price`)}
                                    value={
                                      priceTaxMode === "With Tax"
                                        ? unitPriceWithTax
                                          ? Number(unitPriceWithTax.toFixed(2))
                                          : ""
                                        : it.purchasePrice === 0
                                          ? ""
                                          : it.purchasePrice
                                    }
                                    onKeyDown={handleNonNegativeKeyDown}
                                    onChange={(e) => {
                                      const entered = Number(e.target.value);
                                      if (priceTaxMode === "With Tax") {
                                        const base =
                                          taxRate > 0
                                            ? entered / (1 + taxRate / 100)
                                            : entered;
                                        handleItemFieldChange(
                                          idx,
                                          "purchasePrice",
                                          Number(base.toFixed(2)),
                                        );
                                      } else {
                                        handleItemFieldChange(
                                          idx,
                                          "purchasePrice",
                                          entered,
                                        );
                                      }
                                    }}
                                    className="w-full h-10 px-2.5 text-right bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-bold text-slate-800 outline-none shadow-2xs transition-all"
                                  />
                                  <div className="text-[9.5px] text-slate-400 text-right pr-1 mt-1 leading-none font-medium">
                                    {priceTaxMode === "With Tax"
                                      ? `Excl: ₹${(it.purchasePrice || 0).toFixed(2)}`
                                      : `Incl: ₹${unitPriceWithTax.toFixed(2)}`}
                                  </div>
                                  <FormError
                                    message={formErr.errors[`items.${idx}.price`]}
                                  />
                                </div>
                              </td>

                              {/* 10. Sale Price */}
                              <td className="py-3 px-2 border-r border-slate-200 align-top">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={
                                    it.salePrice === 0 ||
                                    it.salePrice === undefined
                                      ? ""
                                      : it.salePrice
                                  }
                                  onKeyDown={handleNonNegativeKeyDown}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "salePrice" as any,
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-full h-10 px-2.5 text-right bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-bold text-slate-800 outline-none shadow-2xs transition-all"
                                />
                                <FormError
                                  message={formErr.errors[`items.${idx}.salePrice`]}
                                />
                              </td>

                              {/* 11. Discount (%) - Separation of % and Amount */}
                              <td className="py-3 px-2 border-r border-slate-200 w-20 align-top">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={
                                    it.discountPercent === 0
                                      ? ""
                                      : it.discountPercent
                                  }
                                  onKeyDown={handleNonNegativeKeyDown}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "discountPercent",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-full h-10 px-2 text-center bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-medium text-slate-700 outline-none shadow-2xs transition-all"
                                />
                                <FormError
                                  message={
                                    formErr.errors[`items.${idx}.discountPercent`]
                                  }
                                />
                              </td>
                              <td className="py-3 px-2 border-r border-slate-200 w-20 align-top">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={
                                    it.discountAmount === 0 ||
                                    !it.discountAmount
                                      ? ""
                                      : it.discountAmount
                                  }
                                  onKeyDown={handleNonNegativeKeyDown}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "discountAmount",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-full h-10 px-2 text-right bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-medium text-slate-700 outline-none shadow-2xs transition-all"
                                />
                                <FormError
                                  message={
                                    formErr.errors[`items.${idx}.discountAmount`]
                                  }
                                />
                              </td>

                              {/* 12. GST (%) - Separation of % and Amount */}
                              {formData.withGst && (
                                <>
                                  <td className="py-3 px-2 border-r border-slate-200 w-24 align-top">
                                    <CustomSelect
                                      disabled={!formData.withGst}
                                      value={String(it.taxPercent)}
                                      onChange={(val) =>
                                        handleItemFieldChange(
                                          idx,
                                          "taxPercent",
                                          Number(val),
                                        )
                                      }
                                      options={TAX_RATE_OPTIONS.map((t) => ({
                                        value: String(t.rate),
                                        label: `${t.rate}%`,
                                      }))}
                                      placeholder="0%"
                                      triggerClassName="!h-10 !rounded-[4px] !border !border-slate-300 hover:!border-slate-400 focus:!border-[#33077C] !bg-white shadow-2xs text-xs font-semibold justify-center"
                                      size="sm"
                                    />
                                    <FormError
                                      message={
                                        formErr.errors[`items.${idx}.taxPercent`]
                                      }
                                    />
                                  </td>
                                  <td className="py-3 px-2 border-r border-slate-200 w-20 align-top">
                                    <div className="h-10 flex items-center justify-end px-2.5 bg-slate-50/70 border border-slate-200 rounded-[4px] text-xs font-semibold text-slate-700">
                                      {itemTaxAmt > 0
                                        ? itemTaxAmt.toFixed(2)
                                        : "0.00"}
                                    </div>
                                  </td>
                                </>
                              )}

                              {/* 13. Amount (Row Total) */}
                              <td className="py-3 px-2 border-r border-slate-200 text-right align-top">
                                <div className="h-10 flex items-center justify-end px-3 rounded-[4px] bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold text-xs font-sans">
                                  ₹
                                  {(it.total || 0).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                                </div>
                                <FormError
                                  message={formErr.errors[`items.${idx}.total`]}
                                />
                              </td>

                              {/* 14. Delete Action */}
                              <td className="py-3 px-2 text-center align-top">
                                <div className="h-10 flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItemRow(idx)}
                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-[4px] transition-all cursor-pointer"
                                    title="Delete row"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
              </div>

              <div {...fieldAttr("items")} className="!mt-1">
                <FormError message={formErr.errors.items} showIcon />
              </div>

              {/* Bottom Table Bar: Add Item Button on left, Financial Breakdown below */}
              <div className="flex flex-col md:flex-row items-start justify-between gap-5 !mt-2.5">
                <div className="w-full md:w-1/2 flex flex-col">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={handleAddItemRow}
                      icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                    >
                      Add Item
                    </Button>
                    
                  </div>

                  <div className="pt-6 mt-2">
                    <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                      Notes / Instructions
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Carrier instructions, delivery address..."
                      className="w-full p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10 transition-all resize-none"
                    />
                  </div>

                  {/* Payment History & Recorded Disbursements */}
                  {(editingPurchase || formData.paidAmount > 0) && (
                    <div className="mt-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                      {/* Header */}
                      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center shrink-0">
                            <History className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Payment History
                              </h3>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#33077C]/10 text-[#33077C]">
                                {matchingPaymentHistory.length} transaction
                                {matchingPaymentHistory.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Total Paid:{" "}
                              <strong className="text-emerald-700">
                                ₹
                                {(
                                  Number(formData.paidAmount) || 0
                                ).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </strong>
                              {calculatedTotals.balance > 0 ? (
                                <span>
                                  {" "}
                                  • Balance:{" "}
                                  <strong className="text-amber-700">
                                    ₹
                                    {calculatedTotals.balance.toLocaleString(
                                      "en-IN",
                                      { minimumFractionDigits: 2 },
                                    )}
                                  </strong>
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-semibold">
                                  {" "}
                                  • Fully Settled
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {calculatedTotals.balance > 0 ? (
                          <button
                            type="button"
                            onClick={handleOpenRecordPaymentModal}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#33077C] hover:bg-[#4309A2] text-white text-[11px] font-bold shadow-xs hover:shadow transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>+ Record Payment</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Paid in Full</span>
                          </span>
                        )}
                      </div>

                      {/* Transactions Table */}
                      {matchingPaymentHistory.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                          <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                          <p className="text-xs font-semibold text-slate-600">
                            No payment vouchers found
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {formData.paidAmount > 0
                              ? `₹${formData.paidAmount.toLocaleString("en-IN")} recorded against this bill.`
                              : 'Click "+ Record Payment" to disburse a vendor payment.'}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-56 overflow-y-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 bg-slate-100/90 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 z-10 backdrop-blur-xs">
                              <tr>
                                <th className="py-2.5 px-3">Date</th>
                                <th className="py-2.5 px-3">Voucher / Ref #</th>
                                <th className="py-2.5 px-3">Mode</th>
                                <th className="py-2.5 px-3 text-right">
                                  Amount Paid
                                </th>
                                <th className="py-2.5 px-3 text-center">
                                  Status
                                </th>
                                <th className="py-2.5 px-3 text-center">
                                  Receipt
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {matchingPaymentHistory.map((pm, idx) => (
                                <tr
                                  key={pm.id || idx}
                                  className="hover:bg-slate-50/80 transition-colors"
                                >
                                  <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                                    {formatDate(pm.paymentDate)}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-[#33077C] whitespace-nowrap">
                                    {pm.paymentNo}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                      {pm.paymentMode}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700 whitespace-nowrap">
                                    ₹
                                    {pm.amount.toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      {pm.status}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handlePrintPaymentReceipt(pm)
                                        }
                                        title="Print Voucher Receipt"
                                        className="p-1.5 text-slate-500 hover:text-[#33077C] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDownloadPaymentReceipt(pm)
                                        }
                                        title="Download PDF Voucher"
                                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT CARD: Billing Summary */}
                <div className="w-full md:w-1/2 flex justify-end">
                  <div className="w-full max-w-[495px] bg-white rounded-[4px] border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                        Billing Summary
                      </h2>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-3.5 flex-1">
                      {/* 1. Sub Total & Discount & Amount with Discount */}
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center justify-between text-slate-600 font-medium">
                          <span>Sub Total:</span>
                          <span className="font-bold text-slate-900 text-sm">
                            ₹
                            {calculatedTotals.subtotal.toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600 font-medium">
                          <span>Discount:</span>
                          <span
                            className={`font-bold text-sm ${calculatedTotals.discount > 0 ? "text-rose-600" : "text-slate-900"}`}
                          >
                            {calculatedTotals.discount > 0
                              ? `-₹${calculatedTotals.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : "₹0.00"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-700 font-semibold pt-2 border-t border-slate-100">
                          <span>Amount (After Discount):</span>
                          <span className="font-bold text-slate-900 text-sm">
                            ₹
                            {calculatedTotals.taxableAmount.toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </span>
                        </div>
                      </div>

                      {/* 2. CGST & SGST (or IGST) & Total GST */}
                      {formData.withGst && (
                        <div className="pt-3 pb-1 border-t border-slate-100 space-y-2.5 text-sm">
                          {formData.gstType === "intra_state" ? (
                            <>
                              <div className="flex items-center justify-between text-slate-600 font-medium">
                                <span>CGST:</span>
                                <span className="font-bold text-slate-900">
                                  ₹
                                  {calculatedTotals.cgst.toLocaleString(
                                    undefined,
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    },
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-600 font-medium">
                                <span>SGST:</span>
                                <span className="font-bold text-slate-900">
                                  ₹
                                  {calculatedTotals.sgst.toLocaleString(
                                    undefined,
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    },
                                  )}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-between text-slate-600 font-medium">
                              <span>IGST:</span>
                              <span className="font-bold text-slate-900">
                                ₹
                                {calculatedTotals.igst.toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-slate-800 font-bold pt-2 border-t border-dashed border-slate-200/80">
                            <span>Total GST:</span>
                            <span className="font-bold text-slate-900">
                              ₹
                              {calculatedTotals.tax.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Freight / Shipping optional row */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm">
                        <span className="text-slate-600 font-medium">
                          Freight / Shipping:
                        </span>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#33077C] font-bold text-xs sm:text-sm">
                            ₹
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={
                              formData.shipping === 0 ? "" : formData.shipping
                            }
                            placeholder="0"
                            onKeyDown={(e) => {
                              if (
                                e.key === "-" ||
                                e.key === "e" ||
                                e.key === "E" ||
                                e.key === "+"
                              ) {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => {
                              const raw = e.target.value.replace(
                                /[^0-9.]/g,
                                "",
                              );
                              if (raw === "") {
                                setFormData((prev) => ({
                                  ...prev,
                                  shipping: 0,
                                }));
                                return;
                              }
                              const parts = raw.split(".");
                              const clean =
                                parts.length > 2
                                  ? `${parts[0]}.${parts.slice(1).join("")}`
                                  : raw;
                              const num = Math.max(0, parseFloat(clean) || 0);
                              setFormData((prev) => ({
                                ...prev,
                                shipping: num,
                              }));
                            }}
                            className="w-28 h-9 text-right pl-6 pr-2.5 bg-white border-2 border-[#33077C] rounded-[6px] text-xs sm:text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#33077C]/20 shadow-2xs transition-all"
                          />
                        </div>
                      </div>

                      <div {...fieldAttr("shipping")} className="text-right">
                        <FormError
                          message={formErr.errors.shipping}
                          className="justify-end"
                        />
                      </div>

                      {/* 3. Rounding Adjustment */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Rounding Adjustment
                          </label>
                          <span className="text-[11px] text-slate-400">
                            click to apply
                          </span>
                        </div>

                        <div className="space-y-2">
                          {/* Round Down */}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                roundMode:
                                  prev.roundMode === "down" ? "none" : "down",
                              }))
                            }
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                              formData.roundMode === "down"
                                ? "bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-2xs"
                                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                  formData.roundMode === "down"
                                    ? "border-amber-600 bg-amber-600"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {formData.roundMode === "down" && (
                                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                )}
                              </div>
                              <span className="text-xs">Round Down</span>
                            </div>
                            <span className="font-bold text-xs">
                              {calculatedTotals.roundDownDiff === 0
                                ? "₹0.00"
                                : `-₹${Math.abs(calculatedTotals.roundDownDiff).toFixed(2)}`}
                            </span>
                          </button>

                          {/* Round Up */}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                roundMode:
                                  prev.roundMode === "up" ? "none" : "up",
                              }))
                            }
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                              formData.roundMode === "up"
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs"
                                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                  formData.roundMode === "up"
                                    ? "border-emerald-600 bg-emerald-600"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {formData.roundMode === "up" && (
                                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                )}
                              </div>
                              <span className="text-xs">Round Up</span>
                            </div>
                            <span className="font-bold text-xs">
                              {calculatedTotals.roundUpDiff === 0
                                ? "₹0.00"
                                : `+₹${calculatedTotals.roundUpDiff.toFixed(2)}`}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* 4. Grand Total Banner */}
                      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[11px] text-blue-600 block uppercase tracking-wider">
                            Grand Total
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Net payable amount
                          </span>
                        </div>
                        <span className="font-bold text-base sm:text-lg text-blue-600">
                          ₹
                          {calculatedTotals.grandTotal.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </span>
                      </div>

                      <div {...fieldAttr("totals")}>
                        <FormError message={formErr.errors.totals} showIcon />
                      </div>

                      {/* 5. Paid to Supplier & Balance Payable */}
                      <div className="pt-2 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-emerald-700">Paid to Supplier</span>
                          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden" role="group" aria-label="Payment mode">
                            <button
                              type="button"
                              onClick={() => switchPaymentMode(false)}
                              className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors ${!isSplitMode ? "bg-[#33077C] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                            >
                              Single Payment
                            </button>
                            <button
                              type="button"
                              onClick={() => switchPaymentMode(true)}
                              className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors border-l border-slate-200 ${isSplitMode ? "bg-[#33077C] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                            >
                              Split Payment
                            </button>
                          </div>
                        </div>

                        {isSplitMode ? (
                          <SplitPaymentSection
                            rows={splitRows}
                            onChange={setSplitRows}
                            summary={splitSummary}
                            alreadyPaid={splitAlreadyPaid}
                            validation={splitValidation}
                            showErrors={splitShowErrors}
                            disabled={isSubmitting}
                            extraError={formErr.errors.paidAmount}
                          />
                        ) : (
                          <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-emerald-700">
                            Paid to Supplier:
                          </span>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs">
                              ₹
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              {...fieldAttr("paidAmount")}
                              onInput={() => {
                                formErr.clearError("paidAmount");
                                formErr.clearError("paymentMethod");
                                formErr.clearError("paymentDate");
                              }}
                              value={
                                formData.paidAmount === 0
                                  ? ""
                                  : formData.paidAmount
                              }
                              placeholder="0"
                              onKeyDown={(e) => {
                                if (
                                  e.key === "-" ||
                                  e.key === "e" ||
                                  e.key === "E" ||
                                  e.key === "+"
                                ) {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) => {
                                const raw = e.target.value.replace(
                                  /[^0-9.]/g,
                                  "",
                                );
                                if (raw === "") {
                                  setFormData((prev) => ({
                                    ...prev,
                                    paidAmount: 0,
                                  }));
                                  return;
                                }
                                const parts = raw.split(".");
                                const clean =
                                  parts.length > 2
                                    ? `${parts[0]}.${parts.slice(1).join("")}`
                                    : raw;
                                let newAmount = parseFloat(clean);
                                if (isNaN(newAmount) || newAmount < 0) {
                                  newAmount = 0;
                                }
                                setFormData((prev) => ({
                                  ...prev,
                                  paidAmount: newAmount,
                                  paymentMethod:
                                    newAmount > 0
                                      ? prev.paymentMethod || "Cash"
                                      : prev.paymentMethod,
                                }));
                              }}
                              className="w-32 h-8.5 text-right pl-6 pr-2.5 bg-white border-2 border-emerald-600 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-500/20 rounded-[6px] font-bold text-emerald-700 text-xs outline-none shadow-2xs transition-all"
                            />
                          </div>
                        </div>

                        <div className="text-right">
                          <FormError
                            message={formErr.errors.paidAmount}
                            className="justify-end"
                          />
                          <FormError
                            message={formErr.errors.paymentMethod}
                            className="justify-end"
                          />
                          <FormError
                            message={formErr.errors.paymentDate}
                            className="justify-end"
                          />
                        </div>

                          </>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm">
                          <span className="font-bold text-slate-800">
                            Total Balance:
                          </span>
                          <span
                            className={`font-bold text-sm ${
                              calculatedTotals.balance > 0
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            ₹
                            {calculatedTotals.balance.toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-end gap-4 border-t border-slate-100">
                {isSplitMode && (
                  <div className="text-[11px] text-slate-500 max-w-xs">
                    Split payment: enter each payment in the Billing Summary. Each one is saved as its own payment when you save the bill.
                  </div>
                )}

                {/* Right side: Cancel & Save Purchase Bill */}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="h-11 px-5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSavePurchase(
                        editingPurchase
                          ? editingPurchase.purchaseStatus
                          : "Pending",
                      );
                    }}
                    className="h-11 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    )}
                    <span>
                      {isSubmitting
                        ? "Saving..."
                        : editingPurchase
                          ? "Save Changes"
                          : "Save Purchase Bill"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Record Payment Modal for Purchase Form */}
              <Modal
                isOpen={isFormPaymentModalOpen}
                onClose={() => setIsFormPaymentModalOpen(false)}
                title="Record Payment"
                subtitle={
                  <span className="text-white/80 text-xs font-normal">
                    Specify payment transaction details for this purchase bill
                  </span>
                }
                maxWidth="4xl"
                headerGradient={true}
                showBackIcon={true}
                hideCloseButton={true}
                onBack={() => setIsFormPaymentModalOpen(false)}
              >
                <div className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150">
                  {/* Bill Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Card 1: Supplier Info */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-[4px]">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Supplier
                      </span>
                      <div
                        className="font-bold text-slate-900 text-xs sm:text-[13px] truncate mt-1"
                        title={formData.supplierName || "Not Selected"}
                      >
                        {formData.supplierName || "Not Selected"}
                      </div>
                    </div>

                    {/* Card 2: Grand Total */}
                    <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-[4px]">
                      <span className="text-[11px] font-bold text-[#33077C] uppercase tracking-wider block">
                        Grand Total
                      </span>
                      <div className="text-base sm:text-lg font-semibold text-[#33077C] mt-0.5">
                        ₹
                        {calculatedTotals.grandTotal.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>

                    {/* Card 3: Balance Pending */}
                    <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-[4px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                          Remaining Balance
                        </span>
                        {(Number(formData.paidAmount) || 0) > 0 && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded">
                            ₹
                            {(Number(formData.paidAmount) || 0).toLocaleString(
                              "en-IN",
                            )}{" "}
                            Paid
                          </span>
                        )}
                      </div>
                      <div className="text-base sm:text-lg font-semibold text-amber-700 mt-0.5">
                        ₹
                        {calculatedTotals.balance.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Row 1: Amount Paid (₹) | Date | Payment Type */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Amount Paid */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs sm:text-[13px] font-medium text-slate-500">
                          {editingPurchase &&
                          (Number(formData.paidAmount) || 0) > 0
                            ? "Payment Amount to Add (₹)"
                            : "Payment Amount (₹)"}{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                        {calculatedTotals.balance > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormPaymentDetails((prev) => ({
                                ...prev,
                                amountPaid: calculatedTotals.balance,
                              }))
                            }
                            className="text-[10px] font-bold text-[#33077C] hover:underline cursor-pointer"
                          >
                            Pay Full Balance (₹
                            {calculatedTotals.balance.toLocaleString("en-IN")})
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        {...fieldAttr("amountPaid")}
                        onInput={() => formPayErr.clearError("amountPaid")}
                        value={
                          formPaymentDetails.amountPaid === 0
                            ? ""
                            : formPaymentDetails.amountPaid
                        }
                        placeholder="0"
                        onKeyDown={(e) => {
                          if (
                            e.key === "-" ||
                            e.key === "e" ||
                            e.key === "E" ||
                            e.key === "+"
                          ) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, "");
                          if (raw === "") {
                            setFormPaymentDetails((prev) => ({
                              ...prev,
                              amountPaid: 0,
                            }));
                            return;
                          }
                          const parts = raw.split(".");
                          const clean =
                            parts.length > 2
                              ? `${parts[0]}.${parts.slice(1).join("")}`
                              : raw;
                          let newAmount = parseFloat(clean);
                          if (isNaN(newAmount) || newAmount < 0) {
                            newAmount = 0;
                          }
                          setFormPaymentDetails((prev) => ({
                            ...prev,
                            amountPaid: newAmount,
                          }));
                        }}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-semibold text-emerald-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                      <FormError message={formPayErr.errors.amountPaid} />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                        Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        {...fieldAttr("date")}
                        value={formPaymentDetails.date}
                        onChange={(e) => {
                          formPayErr.clearError("date");
                          setFormPaymentDetails((prev) => ({
                            ...prev,
                            date: e.target.value,
                          }));
                        }}
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                      <FormError message={formPayErr.errors.date} />
                    </div>

                    {/* Payment Type */}
                    <div>
                      <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                        Payment Type <span className="text-rose-500">*</span>
                      </label>
                      <div {...fieldAttr("paymentType")}>
                      <CustomSelect
                        value={formPaymentDetails.paymentType || "Cash"}
                        onChange={(val) => {
                          formPayErr.clearError("paymentType");
                          setFormPaymentDetails((prev) => ({
                            ...prev,
                            paymentType: val as any,
                          }));
                        }}
                        options={[
                          { value: "Cash", label: "Cash" },
                          {
                            value: "Bank Transfer",
                            label: "Bank Transfer / NEFT / RTGS",
                          },
                          { value: "UPI", label: "UPI / GPay / PhonePe" },
                          { value: "Card", label: "Debit / Corporate Card" },
                          { value: "Credit", label: "Supplier Credit" },
                          { value: "Other", label: "Other" },
                        ]}
                        placeholder="Select Payment Mode"
                      />
                      </div>
                      <FormError message={formPayErr.errors.paymentType} />
                    </div>
                  </div>

                  {/* Row 2: Transaction ID | Remarks */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Transaction ID */}
                    <div>
                      <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                        Transaction ID
                      </label>
                      <input
                        type="text"
                        value={formPaymentDetails.transactionId}
                        onChange={(e) =>
                          setFormPaymentDetails((prev) => ({
                            ...prev,
                            transactionId: e.target.value,
                          }))
                        }
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                    </div>

                    {/* Remarks (single column like other fields in 3-col grid) */}
                    <div>
                      <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                        Remarks
                      </label>
                      <input
                        type="text"
                        value={formPaymentDetails.remarks}
                        onChange={(e) =>
                          setFormPaymentDetails((prev) => ({
                            ...prev,
                            remarks: e.target.value,
                          }))
                        }
                        className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      icon={<X className="w-4 h-4 text-slate-500" />}
                      onClick={() => setIsFormPaymentModalOpen(false)}
                      className="w-full sm:w-auto justify-center"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      icon={<Check className="w-4 h-4 stroke-[2.5]" />}
                      onClick={() => paymentGuard.runOnce(async () => {
                        // Validate amount (vs outstanding balance), date and payment type first.
                        const currentPaid = Number(formData.paidAmount) || 0;
                        const limit = editingPurchase
                          ? Math.max(0, calculatedTotals.grandTotal - currentPaid)
                          : calculatedTotals.grandTotal;
                        const payErrs = validateFormPayment(
                          {
                            amountPaid: formPaymentDetails.amountPaid,
                            date: formPaymentDetails.date,
                            paymentType: formPaymentDetails.paymentType || "Cash",
                          },
                          limit,
                          "Payment amount",
                        );
                        if (!formPayErr.validateAll(payErrs)) {
                          return;
                        }
                        const enteredAmount =
                          Number(formPaymentDetails.amountPaid) || 0;

                        if (editingPurchase) {
                          const newTotalPaid = Math.min(
                            calculatedTotals.grandTotal,
                            currentPaid + enteredAmount,
                          );

                          setFormData((prev) => ({
                            ...prev,
                            paidAmount: newTotalPaid,
                            paymentMethod:
                              formPaymentDetails.paymentType ||
                              prev.paymentMethod,
                          }));
                          setIsFormPaymentModalOpen(false);
                          toast.success(
                            `Payment of ₹${enteredAmount.toLocaleString("en-IN")} applied! Click Update Purchase Bill to save.`,
                          );
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            paidAmount: enteredAmount,
                            paymentMethod:
                              formPaymentDetails.paymentType || "Cash",
                          }));
                          setIsFormPaymentModalOpen(false);
                          toast.success(
                            `Payment amount of ₹${enteredAmount.toLocaleString("en-IN")} (${formPaymentDetails.paymentType || "Cash"}) updated!`,
                          );
                        }
                        formErr.clearError("paidAmount");
                        formErr.clearError("paymentMethod");
                        formErr.clearError("paymentDate");
                      })}
                      className="w-full sm:w-auto justify-center"
                    >
                      Apply Payment
                    </Button>
                  </div>
                </div>
              </Modal>

              {/* Quick Add Product Modal */}
              <Modal
                isOpen={isAddProductModalOpen}
                onClose={() => setIsAddProductModalOpen(false)}
                title="Add New Product"
                subtitle={
                  <span className="text-white/80 text-xs font-normal">
                    Create product master record and add directly to this
                    purchase bill
                  </span>
                }
                maxWidth="2xl"
                headerGradient={true}
                showBackIcon={true}
                hideCloseButton={true}
                onBack={() => setIsAddProductModalOpen(false)}
              >
                <div className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150">
                  {/* Row 1: Product Name */}
                  <div>
                    <FormLabel required>Product Name</FormLabel>
                    <input
                      type="text"
                      placeholder="e.g. Wireless Mouse"
                      {...fieldAttr("productName")}
                      value={quickProductForm.productName}
                      onChange={(e) => {
                        quickProdErr.clearError("productName");
                        setQuickProductForm((prev) => ({
                          ...prev,
                          productName: e.target.value,
                        }));
                      }}
                      className={FORM_INPUT_CLS}
                      autoFocus
                    />
                    <FormError message={quickProdErr.errors.productName} />
                  </div>

                  {/* Row 2: Product Code / SKU & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FormLabel>Product Code</FormLabel>
                      <input
                        type="text"
                        readOnly
                        placeholder="Auto-generated"
                        value={quickProductForm.productCode}
                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-600 outline-none cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <FormLabel>Category</FormLabel>
                      <input
                        type="text"
                        placeholder="General"
                        value={quickProductForm.category}
                        onChange={(e) =>
                          setQuickProductForm((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        className={FORM_INPUT_CLS}
                      />
                    </div>
                  </div>

                  {/* Row 3: Unit & HSN Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FormLabel>Unit of Measurement</FormLabel>
                      <select
                        value={quickProductForm.unit}
                        onChange={(e) =>
                          setQuickProductForm((prev) => ({
                            ...prev,
                            unit: e.target.value,
                          }))
                        }
                        className={FORM_SELECT_CLS}
                      >
                        <option value="PCS">PCS (Pieces)</option>
                        <option value="BOX">BOX</option>
                        <option value="KG">KG (Kilograms)</option>
                        <option value="GM">GM (Grams)</option>
                        <option value="LTR">LTR (Liters)</option>
                        <option value="MTR">MTR (Meters)</option>
                        <option value="PACK">PACK</option>
                        <option value="SET">SET</option>
                        <option value="NOS">NOS</option>
                      </select>
                    </div>
                    <div>
                      <FormLabel>HSN / SAC Code</FormLabel>
                      <input
                        type="text"
                        placeholder="e.g. 8471"
                        value={quickProductForm.hsnCode}
                        onChange={(e) =>
                          setQuickProductForm((prev) => ({
                            ...prev,
                            hsnCode: e.target.value,
                          }))
                        }
                        className={FORM_INPUT_CLS}
                      />
                    </div>
                  </div>

                  {/* Row 4: Pricing Section (Purchase Price, Sale Price, Tax Rate) */}
                  <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
                    <div className="text-xs font-bold text-[#33077C] flex items-center gap-1.5">
                      <span>Pricing & Tax Configuration</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <FormLabel required>Purchase Price (₹)</FormLabel>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          {...fieldAttr("purchasePrice")}
                          onKeyDown={handleNonNegativeKeyDown}
                          value={quickProductForm.purchasePrice}
                          onChange={(e) => {
                            quickProdErr.clearError("purchasePrice");
                            setQuickProductForm((prev) => ({
                              ...prev,
                              purchasePrice: e.target.value,
                            }));
                          }}
                          className={FORM_INPUT_CLS}
                        />
                        <FormError message={quickProdErr.errors.purchasePrice} />
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          Supplier cost price
                        </span>
                      </div>
                      <div>
                        <FormLabel required>Sale Price (₹)</FormLabel>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          {...fieldAttr("salePrice")}
                          onKeyDown={handleNonNegativeKeyDown}
                          value={quickProductForm.salePrice}
                          onChange={(e) => {
                            quickProdErr.clearError("salePrice");
                            setQuickProductForm((prev) => ({
                              ...prev,
                              salePrice: e.target.value,
                            }));
                          }}
                          className={FORM_INPUT_CLS}
                        />
                        <FormError message={quickProdErr.errors.salePrice} />
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          Default customer price
                        </span>
                      </div>
                      <div>
                        <FormLabel>GST Tax Rate</FormLabel>
                        <select
                          value={quickProductForm.taxRate}
                          onChange={(e) =>
                            setQuickProductForm((prev) => ({
                              ...prev,
                              taxRate: e.target.value,
                            }))
                          }
                          className={FORM_SELECT_CLS}
                        >
                          <option value="None">None (0%)</option>
                          <option value="GST @ 0%">GST @ 0%</option>
                          <option value="GST @ 5%">GST @ 5%</option>
                          <option value="GST @ 12%">GST @ 12%</option>
                          <option value="GST @ 18%">GST @ 18%</option>
                          <option value="GST @ 28%">GST @ 28%</option>
                        </select>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          Applicable tax rate
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={() => setIsAddProductModalOpen(false)}
                      disabled={isCreatingProduct}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={handleSaveQuickProduct}
                      disabled={isCreatingProduct}
                      icon={
                        isCreatingProduct ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        )
                      }
                    >
                      {isCreatingProduct
                        ? "Creating..."
                        : "Save & Select Product"}
                    </Button>
                  </div>
                </div>
              </Modal>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pb-12 font-sans">
          {/* 1. Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-[220px] flex-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
                  <ShoppingBag className="w-4.5 h-4.5" />
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Purchase Orders &amp; Bills
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Execute supplier purchases, manage stock receipts, and disburse
                vendor payments
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="secondary"
                size="md"
                className="flex-1 sm:flex-initial justify-center"
                onClick={handlePrintTableReport}
                icon={<Printer className="w-4 h-4 text-[#33077C]" />}
              >
                Print Report
              </Button>

              <Button
                variant="secondary"
                size="md"
                className="flex-1 sm:flex-initial justify-center"
                onClick={handleExportExcel}
                icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              >
                Excel Report
              </Button>

              <Button
                variant="primary"
                size="md"
                className="flex-1 sm:flex-initial justify-center"
                onClick={handleOpenCreateModal}
                icon={<Plus className="w-4 h-4 text-white" />}
              >
                Create Purchase Bill
              </Button>
            </div>
          </div>

          {/* 2. KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Purchases
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-slate-900">
                  ₹
                  {summary.totalAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {summary.totalCount} orders total
                  {Boolean((summary as any).totalPurchaseReturnAmount && (summary as any).totalPurchaseReturnAmount > 0) && (
                    <span className="text-rose-600 font-semibold ml-1.5">
                      (Returns: -₹{Number((summary as any).totalPurchaseReturnAmount).toLocaleString("en-IN")})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Today's Purchases
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
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

            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Pending Payments
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-amber-600">
                  ₹
                  {summary.pendingPayments.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Payable to suppliers
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Fully Paid
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-slate-900">
                  {summary.paidCount}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Zero balance remaining
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Received / Stocked
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
                  <PackageCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-slate-900">
                  {summary.completedCount}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Added to warehouse stock
                </div>
              </div>
            </div>
          </div>

          {/* 3. Search Bar & Filter Row */}
          <SearchBar
            value={pendingSearch}
            onChange={(val) => setPendingSearch(val)}
            placeholder="Search by PO #, invoice #, supplier, product..."
            onSubmit={() => {
              const trimmed = pendingSearch.trim();
              const isSame =
                appliedSearch === trimmed &&
                appliedPurchaseStatus === pendingPurchaseStatus &&
                appliedPaymentStatus === pendingPaymentStatus &&
                appliedSupplier === pendingSupplier &&
                currentPage === 1;

              setAppliedSearch(trimmed);
              setAppliedPurchaseStatus(pendingPurchaseStatus);
              setAppliedPaymentStatus(pendingPaymentStatus);
              setAppliedSupplier(pendingSupplier);
              setCurrentPage(1);

              if (isSame) {
                fetchPurchaseOrders(true);
              }
            }}
            onReset={() => {
              isFetchingRef.current = false;
              lastFetchKeyRef.current = null;
              setPendingSearch("");
              setAppliedSearch("");
              setPendingPurchaseStatus("All");
              setAppliedPurchaseStatus("All");
              setPendingPaymentStatus("All");
              setAppliedPaymentStatus("All");
              setPendingSupplier("All");
              setAppliedSupplier("All");
              setCurrentPage(1);
              fetchPurchaseOrders(true, {
                search: "",
                status: "All",
                page: 1,
              });
            }}
            filterSlot={
              <div className="flex items-center gap-2.5 flex-wrap">
                <FilterDropdown
                  placeholder="Purchase Status : All"
                  value={pendingPurchaseStatus}
                  onChange={(val) => {
                    setPendingPurchaseStatus(val);
                  }}
                  options={[
                    { label: "Purchase Status : All", value: "All" },
                    { label: "Pending", value: "Pending", dotColor: "#f59e0b" },
                    {
                      label: "Approved",
                      value: "Approved",
                      dotColor: "#3b82f6",
                    },
                    { label: "Ordered", value: "Ordered", dotColor: "#8b5cf6" },
                    {
                      label: "Received",
                      value: "Received",
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
                  placeholder="Payment Status : All"
                  value={pendingPaymentStatus}
                  onChange={(val) => {
                    setPendingPaymentStatus(val);
                  }}
                  options={[
                    { label: "Payment Status : All", value: "All" },
                    { label: "Paid", value: "Paid", dotColor: "#10b981" },
                    { label: "Partial", value: "Partial", dotColor: "#f59e0b" },
                    { label: "Unpaid", value: "Unpaid", dotColor: "#ef4444" },
                    { label: "Pending", value: "Pending", dotColor: "#64748b" },
                  ]}
                />

                <FilterDropdown
                  placeholder="Supplier : All"
                  value={pendingSupplier}
                  onChange={(val) => {
                    setPendingSupplier(val);
                  }}
                  options={[
                    { label: "Supplier : All", value: "All" },
                    ...mergedSuppliers.map((s) => ({
                      label: s.name,
                      value: s.id,
                    })),
                  ]}
                />
              </div>
            }
            rightSlot={
              <div className="flex items-center gap-3 pr-1">
                <span className="text-xs font-semibold text-slate-500">
                  Total Purchases :{" "}
                  <span className="text-[#33077C] font-bold">
                    {totalRecordsCount}
                  </span>
                </span>
              </div>
            }
          />

          {/* 4. Purchase Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200 min-w-[1050px]">
                <CommonTableHead
                  columns={[
                    {
                      label: "PURCHASE NO & DATE",
                      align: "center",
                      minWidth: "160px",
                    },
                    { label: "SUPPLIER", align: "left", minWidth: "180px" },
                    { label: "ITEMS", align: "left", minWidth: "150px" },
                    {
                      label: "TOTAL AMOUNT",
                      align: "right",
                      minWidth: "130px",
                    },
                    { label: "PAID", align: "right", minWidth: "120px" },
                    { label: "BALANCE", align: "right", minWidth: "120px" },
                    { label: "PAYMENT", align: "center", minWidth: "110px" },
                    { label: "STATUS", align: "center", minWidth: "110px" },
                    { label: "ACTIONS", align: "center", minWidth: "130px" },
                  ]}
                />
                <tbody className="text-sm">
                  {isApiLoading && paginatedPurchases.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-16 text-center text-slate-400 border border-slate-200 font-medium"
                      >
                        <Loader2 className="w-8 h-8 mx-auto mb-2 text-[#33077C] animate-spin" />
                        <p className="font-semibold text-slate-600 text-sm">
                          Loading purchase orders...
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Connecting to Work API...
                        </p>
                      </td>
                    </tr>
                  ) : paginatedPurchases.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-16 text-center text-slate-400 border border-slate-200 font-medium"
                      >
                        <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                        <p className="font-semibold text-slate-600 text-sm">
                          No purchase orders found
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Create a purchase order to stock inventory items.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedPurchases.map((po) => {
                      const isPaid = po.paymentStatus === "Paid";
                      const isCompleted =
                        po.purchaseStatus === "Completed" ||
                        po.purchaseStatus === "Received";

                      return (
                        <tr
                          key={po.id}
                          className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans"
                        >
                          {/* 1. Purchase No & Date */}
                          <td className="py-3.5 px-3 font-bold text-slate-800 text-center border-r border-slate-200 whitespace-nowrap align-middle">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <div className="flex flex-col items-center">
                                <span
                                  onClick={() => handleOpenViewModal(po)}
                                  className="cursor-pointer hover:underline"
                                >
                                  {po.purchaseNo}
                                </span>
                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                                  <span>{po.purchaseDate}</span>
                                  {po.purchaseInvoiceNo && (
                                    <>
                                      <span className="text-slate-300">
                                        &bull;
                                      </span>
                                      <span>Inv: {po.purchaseInvoiceNo}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Supplier */}
                          <td className="py-4 px-5 border border-slate-200">
                            <div className="font-bold text-slate-900 leading-snug">
                              {po.supplierName}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 font-medium">
                              Due:{" "}
                              <span className="text-slate-600 font-semibold">
                                {formatDate(po.dueDate)}
                              </span>
                            </div>
                          </td>

                          {/* 3. Items */}
                          <td className="py-4 px-5 border border-slate-200">
                            <div className="font-semibold text-slate-900 leading-snug text-xs">
                              {po.items[0]?.productName} (
                              {po.items[0]?.quantity} qty)
                            </div>
                            {po.items.length > 1 && (
                              <span className="text-[#33077C] text-[11px] font-bold mt-0.5 block">
                                +{po.items.length - 1} more item(s)
                              </span>
                            )}
                          </td>

                          {/* 4. Total Amount */}
                          <td className="py-4 px-5 border border-slate-200 text-right whitespace-nowrap">
                            <span className="font-bold text-slate-900 text-sm">
                              ₹
                              {po.grandTotal.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                            {po.totalReturned && po.totalReturned > 0 ? (
                              <span className="text-[10px] text-rose-600 block font-semibold leading-tight mt-0.5">
                                Return: -₹{po.totalReturned.toLocaleString("en-IN")}
                              </span>
                            ) : null}
                          </td>

                          {/* 5. Paid */}
                          <td className="py-4 px-5 border border-slate-200 text-right whitespace-nowrap">
                            <span className="font-bold text-emerald-600 text-sm">
                              ₹
                              {po.paidAmount.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </td>

                          {/* 6. Balance */}
                          <td className="py-4 px-5 border border-slate-200 text-right whitespace-nowrap">
                            {po.balance > 0 ? (
                              <span className="font-bold text-amber-600 text-sm">
                                ₹
                                {po.balance.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            ) : (
                              <span className="font-semibold text-slate-400 text-xs">
                                ₹0.00
                              </span>
                            )}
                          </td>

                          {/* 7. Payment Status */}
                          <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap min-w-[130px] w-36 align-middle">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                po.paymentStatus === "Paid"
                                  ? "bg-emerald-50/90 text-emerald-700 border border-emerald-300/80"
                                  : po.paymentStatus === "Partial"
                                    ? "bg-amber-50/90 text-amber-700 border border-amber-300/80"
                                    : "bg-rose-50/90 text-rose-700 border border-rose-300/80"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  po.paymentStatus === "Paid"
                                    ? "bg-emerald-500"
                                    : po.paymentStatus === "Partial"
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                }`}
                              />
                              {po.paymentStatus}
                            </span>
                          </td>

                          {/* 8. Purchase Status */}
                          <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap min-w-[130px] w-36 align-middle">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                po.purchaseStatus === "Completed" ||
                                po.purchaseStatus === "Received"
                                  ? "bg-emerald-50/90 text-emerald-700 border border-emerald-300/80"
                                  : po.purchaseStatus === "Approved"
                                    ? "bg-blue-50/90 text-blue-700 border border-blue-300/80"
                                    : po.purchaseStatus === "Ordered"
                                      ? "bg-purple-50/90 text-[#33077C] border border-[#33077C]/30"
                                      : po.purchaseStatus === "Pending"
                                        ? "bg-amber-50/90 text-amber-700 border border-amber-300/80"
                                        : po.purchaseStatus === "Cancelled"
                                          ? "bg-rose-50/90 text-rose-700 border border-rose-300/80"
                                          : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  po.purchaseStatus === "Completed" ||
                                  po.purchaseStatus === "Received"
                                    ? "bg-emerald-500"
                                    : po.purchaseStatus === "Approved"
                                      ? "bg-blue-500"
                                      : po.purchaseStatus === "Ordered"
                                        ? "bg-[#33077C]"
                                        : po.purchaseStatus === "Pending"
                                          ? "bg-amber-500"
                                          : po.purchaseStatus === "Cancelled"
                                            ? "bg-rose-500"
                                            : "bg-slate-400"
                                }`}
                              />
                              {po.purchaseStatus}
                            </span>
                          </td>

                          {/* 9. Actions */}
                          <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap min-w-[130px] w-36 align-middle">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Share / Forward Popover */}
                              <UniversalShareDropdown
                                id={po.id}
                                activeShareId={activeShareId}
                                setActiveShareId={setActiveShareId}
                                sharePos={sharePos}
                                setSharePos={setSharePos}
                                getShareData={() =>
                                  formatPurchaseOrderShare(po)
                                }
                                title="Share Purchase Bill"
                              />

                              {/* 3-dots Actions Dropdown */}
                              <SaleActionDropdown
                                items={[
                                  {
                                    label: "View",
                                    variant: "view",
                                    onClick: () => handleOpenViewModal(po),
                                  },
                                  {
                                    label: "Edit",
                                    variant: "edit",
                                    onClick: () => handleOpenEditModal(po),
                                  },
                                  {
                                    label: "Print Bill",
                                    variant: "print",
                                    onClick: () => handlePrintPurchaseBill(po),
                                  },
                                  {
                                    label: "Download Bill",
                                    variant: "download",
                                    onClick: () =>
                                      handleDownloadPurchaseBill(po),
                                  },
                                  {
                                    label: "Duplicate",
                                    variant: "duplicate",
                                    onClick: () => handleDuplicatePurchase(po),
                                  },
                                  po.balance > 0 && {
                                    label: "Record Payment",
                                    variant: "payment",
                                    onClick: () => handleOpenPaymentModal(po),
                                  },
                                  po.purchaseStatus === "Pending" && {
                                    label: "Mark as Approved",
                                    variant: "approve",
                                    onClick: () =>
                                      handleUpdateStatus(po, "Approved"),
                                  },
                                  (po.purchaseStatus === "Pending" ||
                                    po.purchaseStatus === "Approved" ||
                                    po.purchaseStatus === "Ordered") && {
                                    label: "Mark as Received (Inward Stock)",
                                    variant: "activate",
                                    onClick: () =>
                                      handleUpdateStatus(po, "Received"),
                                  },
                                  (po.purchaseStatus === "Approved" ||
                                    po.purchaseStatus === "Pending") && {
                                    label: "Mark as Ordered",
                                    variant: "order",
                                    onClick: () =>
                                      handleUpdateStatus(po, "Ordered"),
                                  },
                                  po.purchaseStatus !== "Received" &&
                                    po.purchaseStatus !== "Cancelled" && {
                                      label: "Cancel Order",
                                      variant: "cancel",
                                      onClick: () =>
                                        handleUpdateStatus(po, "Cancelled"),
                                    },
                                  {
                                    label: "View History",
                                    variant: "view",
                                    onClick: () => handleOpenHistory(po),
                                  },
                                  !(
                                    (po.purchaseStatus as string) === "Returned" ||
                                    (po.purchaseStatus as string) === "Converted" ||
                                    (po.purchaseStatus as string)?.toLowerCase() === "returned" ||
                                    (po.purchaseStatus as string)?.toLowerCase() === "converted" ||
                                    (po.status as string)?.toLowerCase() === "returned" ||
                                    (po.status as string)?.toLowerCase() === "converted" ||
                                    false
                                  ) && {
                                    label: "Convert to Return",
                                    variant: "return",
                                    onClick: () => handleConvertToReturn(po),
                                  },
                                  {
                                    label: "Delete",
                                    variant: "delete",
                                    danger: true,
                                    dividerBefore: true,
                                    onClick: () => handleOpenDeleteModal(po),
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
          {totalRecordsCount > 0 && (
            <Pagination
              currentPage={currentPage}
              total={totalRecordsCount}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={(p) => setCurrentPage(p)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          )}

          {/* ==========================================
          MODAL 2: VIEW PURCHASE DETAIL
         ========================================== */}
          {selectedPurchase && (
            <Modal
              isOpen={isDetailModalOpen}
              onClose={() => setIsDetailModalOpen(false)}
              title={`Purchase Order: ${selectedPurchase.purchaseNo}`}
              subtitle="Purchase order items, supplier billing, and payment summary"
              maxWidth="4xl"
              headerGradient={true}
              showBackIcon={true}
              hideCloseButton={true}
              onBack={() => setIsDetailModalOpen(false)}
            >
              <div className="space-y-4 p-2 sm:p-4 max-h-[75vh] overflow-y-auto text-xs">
                <div className="flex flex-wrap justify-between items-center p-3 bg-purple-50 rounded-xl border border-purple-100 gap-2">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px]">
                      Supplier / Vendor
                    </span>
                    <div className="font-bold text-slate-900 text-sm">
                      {selectedPurchase.supplierName}
                    </div>
                    {selectedPurchase.purchaseInvoiceNo && (
                      <div className="text-slate-500">
                        Bill #: {selectedPurchase.purchaseInvoiceNo}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        selectedPurchase.withGst !== false
                          ? "bg-purple-100 text-[#33077C] border border-purple-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {selectedPurchase.withGst !== false
                        ? selectedPurchase.gstType === "inter_state"
                          ? "With GST • Inter-State (IGST)"
                          : "With GST • Intra-State (CGST+SGST)"
                        : "Without GST (Exempt)"}
                    </span>
                    <Badge variant="primary" size="md" dot>
                      {selectedPurchase.purchaseStatus}
                    </Badge>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-left min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200 text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Product Name</th>
                          <th className="py-2.5 px-3 text-center">Batch No</th>
                          <th className="py-2.5 px-3 text-center">Quantity</th>
                          <th className="py-2.5 px-3 text-center">
                            Free Quantity
                          </th>
                          <th className="py-2.5 px-3 text-center">Unit</th>
                          <th className="py-2.5 px-3 text-center">
                            Packing Unit
                          </th>
                          <th className="py-2.5 px-3 text-center">
                            Expiry Date
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            Purchase Price
                          </th>
                          <th className="py-2.5 px-3 text-right">Sale Price</th>
                          <th className="py-2.5 px-3 text-center">
                            Discount (%)
                          </th>
                          <th className="py-2.5 px-3 text-center">GST (%)</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedPurchase.items.map((it) => {
                          const itemSub =
                            (it.quantity || 1) * (it.purchasePrice || 0);
                          const discAmt =
                            it.discountAmount !== undefined &&
                            it.discountAmount > 0
                              ? it.discountAmount
                              : itemSub * ((it.discountPercent || 0) / 100);
                          const taxRate =
                            selectedPurchase.withGst !== false
                              ? it.taxPercent || 0
                              : 0;
                          const taxAmt =
                            selectedPurchase.withGst !== false
                              ? Math.max(0, itemSub - discAmt) * (taxRate / 100)
                              : 0;

                          return (
                            <tr
                              key={it.id}
                              className="hover:bg-slate-50/70 transition-colors"
                            >
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                <div>{it.productName}</div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {it.batch ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-[#33077C] font-mono font-bold text-[10px] border border-purple-200">
                                    {it.batch}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-purple-900">
                                {it.quantity}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                                {it.freeQuantity || 0}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600 font-medium uppercase text-[11px]">
                                {it.unit || "NONE"}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600 font-medium uppercase text-[11px]">
                                {it.packingUnit || "NONE"}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-[11px]">
                                {it.expDate || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium">
                                <div>
                                  ₹
                                  {it.purchasePrice.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                                </div>
                                {taxRate > 0 && (
                                  <div className="text-[10px] text-slate-400">
                                    Incl: ₹
                                    {(
                                      it.purchasePrice *
                                      (1 + taxRate / 100)
                                    ).toFixed(2)}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                                {it.salePrice
                                  ? `₹${Number(it.salePrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                  : "—"}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="font-semibold text-slate-800">
                                  {it.discountPercent}%
                                </span>
                                <span className="block text-[10px] text-slate-400">
                                  ₹{discAmt.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="font-semibold text-slate-800">
                                  {taxRate}%
                                </span>
                                <span className="block text-[10px] text-slate-400">
                                  ₹{taxAmt.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                ₹
                                {it.total.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-80 space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 font-medium">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal (Base):</span>
                      <span>
                        ₹{selectedPurchase.subtotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>
                        -₹{selectedPurchase.discount.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* GST Itemized in View Detail */}
                    {selectedPurchase.withGst === false ||
                    selectedPurchase.tax === 0 ? (
                      <div className="flex justify-between text-amber-700 py-0.5 font-semibold">
                        <span>Tax (Without GST):</span>
                        <span>₹0.00 (Exempt)</span>
                      </div>
                    ) : selectedPurchase.gstType === "inter_state" ? (
                      <div className="flex justify-between text-purple-900 py-0.5">
                        <span>IGST (Integrated Tax):</span>
                        <span className="font-bold">
                          +₹
                          {selectedPurchase.tax.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-purple-900 py-0.5">
                          <span>CGST (Central Tax - 50%):</span>
                          <span className="font-bold">
                            +₹
                            {(
                              selectedPurchase.cgst ?? selectedPurchase.tax / 2
                            ).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between text-purple-900 py-0.5">
                          <span>SGST (State Tax - 50%):</span>
                          <span className="font-bold">
                            +₹
                            {(
                              selectedPurchase.sgst ?? selectedPurchase.tax / 2
                            ).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </>
                    )}

                    {selectedPurchase.shipping > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Shipping:</span>
                        <span>
                          +₹{selectedPurchase.shipping.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}

                    {selectedPurchase.totalReturned && selectedPurchase.totalReturned > 0 ? (
                      <>
                        <div className="border-t border-slate-200 pt-1 flex justify-between text-xs text-slate-500 font-medium">
                          <span>Original Bill Amount:</span>
                          <span>
                            ₹
                            {(
                              selectedPurchase.originalBillAmount ??
                              selectedPurchase.subtotal +
                                (selectedPurchase.tax || 0) -
                                (selectedPurchase.discount || 0)
                            ).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-rose-600 font-semibold">
                          <span>Purchase Return Deduction:</span>
                          <span>
                            -₹
                            {selectedPurchase.totalReturned.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="border-t border-dashed border-purple-300 pt-1 flex justify-between font-bold text-sm text-purple-900">
                          <span>Net Bill Amount:</span>
                          <span>
                            ₹
                            {selectedPurchase.grandTotal.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-sm text-purple-900">
                        <span>Grand Total:</span>
                        <span>
                          ₹
                          {selectedPurchase.grandTotal.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Amount Paid:</span>
                      <span>
                        ₹
                        {selectedPurchase.paidAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    {Boolean(
                      selectedPurchase.supplierCredit &&
                        selectedPurchase.supplierCredit > 0,
                    ) && (
                      <div className="flex justify-between items-center text-xs text-purple-800 bg-purple-100/70 p-2 rounded-lg border border-purple-200 font-semibold">
                        <span>Supplier Credit (Refund Pending):</span>
                        <span className="font-bold">
                          ₹
                          {selectedPurchase.supplierCredit?.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-amber-600 font-bold border-t border-slate-200 pt-1">
                      <span>Balance Payable:</span>
                      <span>
                        ₹
                        {selectedPurchase.balance.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      navigate("/sale-management/purchase/return");
                    }}
                    className="h-10 px-4 rounded-lg border border-purple-200 hover:border-purple-300 text-xs sm:text-[13px] font-bold text-[#33077C] hover:bg-purple-50 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Create Purchase Return</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="h-10 px-5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center shadow-2xs whitespace-nowrap"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintPurchaseBill(selectedPurchase)}
                    className="h-10 px-5 rounded-lg bg-[#33077C] hover:bg-[#26055d] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Bill</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDownloadingBill}
                    onClick={() => handleDownloadPurchaseBill(selectedPurchase)}
                    className="h-10 px-5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                  >
                    {isDownloadingBill ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>
                      {isDownloadingBill ? "Generating..." : "Download Bill"}
                    </span>
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* ==========================================
          MODAL 3: RECORD SUPPLIER PAYMENT
         ========================================== */}
          {selectedPurchase && (
            <Modal
              isOpen={isPaymentModalOpen}
              onClose={() => setIsPaymentModalOpen(false)}
              title={`Disburse Payment: ${selectedPurchase.purchaseNo}`}
              subtitle="Record vendor settlement, payment method, and update payable ledger"
              maxWidth="2xl"
              headerGradient={true}
              showBackIcon={true}
              hideCloseButton={true}
              onBack={() => setIsPaymentModalOpen(false)}
            >
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  handleConfirmPayment();
                }}
                className="space-y-4 p-2 sm:p-4 text-xs"
              >
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex justify-between items-center">
                  <div>
                    <span className="text-slate-500 font-medium">
                      Supplier:
                    </span>
                    <div className="font-bold text-slate-900">
                      {selectedPurchase.supplierName}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-medium">
                      Balance Due:
                    </span>
                    <div className="font-bold text-amber-600 text-sm">
                      ₹
                      {selectedPurchase.balance.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div>
                    <FormLabel required>Disbursed Amount (₹)</FormLabel>
                    <input
                      type="text"
                      inputMode="decimal"
                      {...fieldAttr("amount")}
                      onInput={(e) => {
                        const typed = parseFloat(
                          (e.target as HTMLInputElement).value.replace(/[^0-9.]/g, ""),
                        );
                        const due = Number(selectedPurchase?.balance) || 0;
                        if (!(typed > due)) recordPayErr.clearError("amount");
                      }}
                      value={recordAmount === 0 ? "" : recordAmount}
                      onKeyDown={(e) => {
                        if (["-", "e", "E", "+"].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const rawVal = e.target.value.replace(/[^0-9.]/g, "");
                        if (rawVal === "") {
                          setRecordAmount(0);
                          return;
                        }
                        const num = parseFloat(rawVal);
                        if (isNaN(num)) {
                          setRecordAmount(0);
                        } else if (num < 0) {
                          setRecordAmount(0);
                        } else {
                          const due = Number(selectedPurchase?.balance) || 0;
                          if (num > due) {
                            // Never allow more than the balance due.
                            setRecordAmount(due);
                            recordPayErr.validateField(
                              "amount",
                              `Amount cannot exceed the balance due (₹${due.toLocaleString("en-IN", { minimumFractionDigits: 2 })}).`,
                            );
                          } else {
                            setRecordAmount(num);
                          }
                        }
                      }}
                      className={`${FORM_INPUT_CLS} !text-emerald-600 font-bold`}
                    />
                    <FormError message={recordPayErr.errors.amount} />
                  </div>

                  <div>
                    <FormLabel required>Payment Mode</FormLabel>
                    <select
                      value={recordMethod}
                      {...fieldAttr("method")}
                      onChange={(e) => {
                        recordPayErr.clearError("method");
                        setRecordMethod(e.target.value as any);
                      }}
                      className={FORM_SELECT_CLS}
                    >
                      <option value="Bank Transfer">
                        Bank Transfer / NEFT / RTGS
                      </option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Corporate Card</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>

                  <div>
                    <FormLabel>Remarks / Transaction Ref</FormLabel>
                    <input
                      type="text"
                      value={recordNotes}
                      onChange={(e) => setRecordNotes(e.target.value)}
                      placeholder="Bank UTR, Cheque..."
                      className={FORM_INPUT_CLS}
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    disabled={paymentGuard.isSubmitting}
                    className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm Payment</span>
                  </button>
                </div>
              </form>
            </Modal>
          )}

          {/* ==========================================
              MODAL 4: PURCHASE ORDER HISTORY & AUDIT TRAIL
             ========================================== */}
          {historyPurchase && (
            <Modal
              isOpen={Boolean(historyPurchase)}
              onClose={() => setHistoryPurchase(null)}
              title={`Order History & Audit Trail: ${historyPurchase.purchaseNo}`}
              subtitle={
                isLoadingHistory
                  ? "Syncing live history from Work API..."
                  : "Complete lifecycle progression and timeline audit log"
              }
              maxWidth="md"
              headerGradient={true}
              showBackIcon={true}
              hideCloseButton={true}
              onBack={() => setHistoryPurchase(null)}
            >
              <HistoryTimelineView
                isLoading={isLoadingHistory}
                eyebrow="Purchase Order No"
                title={historyPurchase.purchaseNo}
                subtitle={
                  <>
                    Supplier: <span className="font-semibold text-slate-800">{historyPurchase.supplierName}</span>
                    {historyPurchase.purchaseInvoiceNo ? ` • Inv Ref: ${historyPurchase.purchaseInvoiceNo}` : ""}
                  </>
                }
                amount={{ label: "Total Amount", value: `₹${Number(historyPurchase.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }}
                badges={[
                  { label: historyPurchase.paymentStatus, tone: historyPurchase.paymentStatus === "Paid" ? "success" : historyPurchase.paymentStatus === "Partial" ? "warning" : "danger" },
                  { label: historyPurchase.purchaseStatus, tone: historyPurchase.purchaseStatus === "Completed" || historyPurchase.purchaseStatus === "Received" ? "success" : historyPurchase.purchaseStatus === "Approved" ? "info" : historyPurchase.purchaseStatus === "Ordered" ? "primary" : historyPurchase.purchaseStatus === "Cancelled" ? "danger" : "warning" },
                ]}
                facts={[
                  { label: "Order Date", value: historyPurchase.purchaseDate ? formatDate(historyPurchase.purchaseDate) : "" },
                  { label: "Due Date", value: historyPurchase.dueDate ? formatDate(historyPurchase.dueDate) : "" },
                  { label: "Items", value: `${historyPurchase.items?.length || 0} product(s)` },
                  { label: "Payment Terms", value: historyPurchase.paymentTerms },
                  { label: "Payment Mode", value: historyPurchase.paymentMethod },
                  { label: "Balance Payable", value: `₹${Number(historyPurchase.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                ]}
                events={[
                  {
                    title: "Purchase Order Created",
                    at: (historyPurchase as any).createdAt || historyPurchase.purchaseDate,
                    tone: "primary",
                    description: `Order raised for ${historyPurchase.supplierName}.`,
                    details: [
                      { label: "Order Date", value: historyPurchase.purchaseDate ? formatDate(historyPurchase.purchaseDate) : "" },
                      { label: "Due Date", value: historyPurchase.dueDate ? formatDate(historyPurchase.dueDate) : "" },
                      { label: "Line Items", value: String(historyPurchase.items?.length || 0) },
                    ],
                  },
                  {
                    title: `Status: ${historyPurchase.purchaseStatus}`,
                    at: historyPurchase.purchaseStatus === "Pending" ? undefined : (historyPurchase as any).updatedAt,
                    tone: historyPurchase.purchaseStatus === "Completed" || historyPurchase.purchaseStatus === "Received" ? "success" : historyPurchase.purchaseStatus === "Approved" ? "info" : historyPurchase.purchaseStatus === "Ordered" ? "primary" : historyPurchase.purchaseStatus === "Cancelled" ? "danger" : "warning",
                    description:
                      historyPurchase.purchaseStatus === "Received" || historyPurchase.purchaseStatus === "Completed"
                        ? "Goods delivered and stocked into warehouse inventory."
                        : historyPurchase.purchaseStatus === "Ordered"
                          ? "Dispatched to supplier; awaiting shipment arrival."
                          : historyPurchase.purchaseStatus === "Approved"
                            ? "Order authorized and cleared for supplier dispatch."
                            : historyPurchase.purchaseStatus === "Cancelled"
                              ? "Purchase order voided/cancelled."
                              : "Order drafted, pending authorization.",
                  },
                  {
                    title: `Payment Settlement: ${historyPurchase.paymentStatus}`,
                    tone: historyPurchase.balance <= 0 ? "success" : historyPurchase.paidAmount > 0 ? "warning" : "danger",
                    description: "Supplier payment progress against the bill amount.",
                    details: [
                      { label: "Paid", value: `₹${Number(historyPurchase.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                      { label: "Balance", value: `₹${Number(historyPurchase.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                      { label: "Terms", value: historyPurchase.paymentTerms },
                      { label: "Mode", value: historyPurchase.paymentMethod },
                    ],
                  },
                  ...(Number((historyPurchase as any).totalReturned || (historyPurchase as any).totalPurchaseReturnAmount || 0) > 0
                    ? [
                        {
                          title: "Purchase Return Adjusted",
                          tone: "warning" as const,
                          description: "A purchase return reduced the payable amount on this bill.",
                          details: [
                            { label: "Returned", value: `₹${Number((historyPurchase as any).totalReturned || (historyPurchase as any).totalPurchaseReturnAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                            { label: "Supplier Credit", value: `₹${Number((historyPurchase as any).supplierCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
                          ],
                        },
                      ]
                    : []),
                ]}
                updatedAt={(historyPurchase as any).updatedAt}
                onClose={() => setHistoryPurchase(null)}
              />
            </Modal>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingPo) {
            setIsDeleteModalOpen(false);
            setDeleteTargetPo(null);
            setDeletePoError(null);
          }
        }}
        onConfirm={handleConfirmDeletePo}
        entityName="Purchase Order"
        recordName={deleteTargetPo?.purchaseNo}
        isLoading={isDeletingPo}
        error={deletePoError}
      />
    </>
  );
};
