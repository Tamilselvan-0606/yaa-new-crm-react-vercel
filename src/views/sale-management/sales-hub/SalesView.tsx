import { ProductStockLabel } from "../../../components/common/ProductStockLabel";
import { attachStockQty } from "../../../utils/stockDisplay";
import { CommonTableHead } from "../../../components/common/CommonTableHead";
import { getNextSalesInvoiceNumber } from "../../../utils/documentNumbering";
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
  Phone,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import {
  useSalesManagementStore,
  SaleTransaction,
  SaleProductItem,
  SaleStatus,
  SalePaymentStatus,
  PaymentSplitItem,
  SalePaymentRecord,
  SalePaymentIn,
} from "../../../store/useSalesManagementStore";
import { Badge } from "../../../components/common/Badge";
import { Button } from "../../../components/common/Button";
import { Modal } from "../../../components/common/Modal";
import { DeleteConfirmationModal } from "../../../components/common/DeleteConfirmationModal";
import { Pagination } from "../../../components/common/Pagination";
import { SearchBar } from "../../../components/common/SearchBar";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import { SearchableSelect } from "../../../components/common/SearchableSelect";
import {
  CustomerSearchableSelect,
  BatchSearchableSelect,
} from "../../../components/common/paginated-select";
import { toast } from "../../../utils/toast";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { SalesCustomer } from "../../../store/useSalesManagementStore";
import {
  printTableReport,
  printHtmlElement,
  downloadBusinessDocument,
  downloadTableReport,
  DocumentPrintOptions,
} from "../../../utils/printUtils";
import { useCompanyDocumentProfile } from "../../../hooks/useCompanyDocumentProfile";
import { exportTableToExcel } from "../../../utils/excelExport";
import {
  UniversalShareDropdown,
  formatInvoiceShare,
} from "../../../utils/shareUtils";
import { SalesGraphModal } from "./SalesGraphModal";
import { salesRepresentativeApi } from "../../../api/commerce/salesRepresentativeApi";
import { collectionApi } from "../../../api/commerce/collectionApi";
import { SaleActionDropdown } from "../utils";
import { useAppDispatch } from "../../../hooks/redux";
import { baseApi } from "../../../api/baseApi";
import {
  commerceInvoiceApi,
  mapApiInvoiceToSaleTransaction,
  mapSaleTransactionToInvoicePayload,
  InvoiceFilterParams,
  CommerceInvoiceSummary,
  UUID_REGEX,
  customerApi,
  mapApiCustomerToSalesCustomer,
  stockApi,
  mapApiStockToInventoryStockItem,
  productApi,
  unpackProducts,
  ApiStockBatch,
  commercePaymentInApi,
  normalizeCommercePaymentType,
  quotationApi,
  commerceSaleOrderApi,
  commerceDeliveryChallanApi,
  commerceProformaApi,
  clientProductApi,
} from "../../../api";
import { DocumentLineageBadges } from "../../../components/common/DocumentLineageBadges";
import {
  initializeWorkflowIntegrity,
  recordDocumentConversion,
  findDocumentLineage,
  inferDocType,
  syncQuotationStatusInStorage,
  syncOrderStatusInStorage,
  syncProformaStatusInStorage,
  resolveDocumentConvertedAt,
} from "../../../utils/salesDocumentWorkflow";
import {
  calculateLineItem,
  calculateDocumentTotals,
  determineGstType,
  parseTaxRate,
  round2,
} from "../../../utils/financialCalculations";
import {
  FormLabel,
  FORM_INPUT_CLS,
  FORM_SELECT_CLS,
  FORM_TEXTAREA_CLS,
  handleNonNegativeKeyDown,
} from "../utils/formUtils";

import { FormError } from "../../../components/common/FormError";
import {
  FieldErrors,
  checkRequiredSelection,
  checkRequiredDate,
  checkDateNotBefore,
  checkNumber,
  checkMoney,
  checkPaymentWithinBalance,
  checkTotalConsistency,
  checkGstSplit,
  checkHasLineItems,
  validateLineItems,
  validateBatchStock,
  useFieldErrors,
  useRevalidateAfterSubmit,
  useSubmitGuard,
  fieldAttr,
  focusField,
  extractApiFieldErrors,
  getApiErrorMessage,
} from "../../../utils/formValidation";
import { parseNumericValue } from "../../../utils/validation";
import { useBatchStock } from "../../../hooks/useBatchStock";

import { AddCustomerModal } from "./AddCustomerModal";
import { AddItemModal } from "../inventory/AddItemModal";

import { formatDate } from "../utils/dateUtils";
import {
  SplitPaymentSection,
  makeSplitRowId,
} from "../purchase/SplitPaymentSection";
import {
  SALES_SPLIT_PAYMENT_METHODS,
  activeSplitRows,
  newSplitRow,
  rowAmount,
  splitRowToPaymentFields,
  summarizeSplit,
  validateSplit,
  SplitPaymentRow,
} from "../../../utils/splitPayments";
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

// -----------------------------------------------------------------------------
// Invoice form validation (pure, no API calls)
// -----------------------------------------------------------------------------
interface InvoiceFormInput {
  customerName: string;
  customerId: string;
  saleDate: string;
  dueDate: string;
  items: SaleProductItem[];
  withGst: boolean;
  gstType: "intra_state" | "inter_state";
  overallDiscount: number;
  shippingCharges: number;
  otherCharges: number;
  paidAmount: number;
  paymentSplits: PaymentSplitItem[];
  roundMode?: "none" | "up" | "down";
}

interface InvoiceValidationContext {
  /** Totals that are about to be submitted (calculatedTotals). */
  totals: {
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    cgst: number;
    sgst: number;
    igst: number;
    grandTotal: number;
  };
  /** Stock is only enforced when the invoice actually deducts stock (not for drafts). */
  checkStock: boolean;
  /** Resolves a line to a real product record id, or undefined when it cannot be matched. */
  resolveProductId: (item: SaleProductItem) => string | undefined;
  /** Backend stock of the chosen batch, or null/undefined when stock data is not loaded. */
  availableStock: (
    item: SaleProductItem,
    index: number,
  ) => number | null | undefined;
  /** Quantity this same saved invoice already holds for the line's product + batch (edit mode). */
  stockCredit?: (
    item: SaleProductItem,
    index: number,
  ) => number | null | undefined;
}

const rupees = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isInvoiceRowBlank = (it: SaleProductItem) =>
  !it.productId && !it.productName;

/**
 * Validates the whole invoice form. Returns a map keyed by field:
 *   customer, saleDate, dueDate, items, items.{i}.{product|quantity|price|discountPercent|discountAmount|taxPercent},
 *   shippingCharges, otherCharges, overallDiscount, paidAmount, paymentMethod, totals
 */
const validateInvoiceForm = (
  form: InvoiceFormInput,
  ctx: InvoiceValidationContext,
): FieldErrors => {
  const errors: FieldErrors = {};

  // Customer (a typed customer name without a saved record is still supported by the API)
  const customerErr = checkRequiredSelection(
    (form.customerName || "").trim(),
    "customer",
  );
  if (customerErr) errors.customer = customerErr;

  // Dates
  const saleDateErr = checkRequiredDate(form.saleDate, "invoice date");
  if (saleDateErr) errors.saleDate = saleDateErr;
  if (form.dueDate) {
    const dueErr =
      checkRequiredDate(form.dueDate, "due date") ||
      (saleDateErr
        ? null
        : checkDateNotBefore(
            form.dueDate,
            form.saleDate,
            "due date",
            "invoice date",
          ));
    if (dueErr) errors.dueDate = dueErr;
  }

  // Line items (blank rows are dropped on save, so they are ignored here too)
  const lineInputs = form.items.map((it) =>
    isInvoiceRowBlank(it)
      ? {}
      : {
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPercent: it.discountPercent,
          discountAmount: it.discountAmount,
          taxPercent: form.withGst ? it.taxPercent : undefined,
        },
  );
  const noItemsErr = checkHasLineItems(lineInputs);
  if (noItemsErr)
    errors.items = "Please add at least one product to the invoice.";

  Object.assign(
    errors,
    validateLineItems(lineInputs, {
      priceKey: "unitPrice",
      allowZeroPrice: true,
    }),
  );
  // Batch stock: all rows of the same product + batch are one combined demand on that batch.
  if (ctx.checkStock) {
    const stockErrs = validateBatchStock(
      form.items.map((it) =>
        isInvoiceRowBlank(it)
          ? {}
          : {
              id: it.id,
              productId: it.productId || ctx.resolveProductId(it),
              productName: it.productName,
              batch: it.batch,
              quantity: it.quantity,
            },
      ),
      {
        getAvailable: (_l, i) => ctx.availableStock(form.items[i], i),
        credit: ctx.stockCredit
          ? (_l, i) => ctx.stockCredit!(form.items[i], i)
          : undefined,
      },
    );
    Object.entries(stockErrs).forEach(([k, v]) => {
      if (!errors[k]) errors[k] = String(v);
    });
  }
  form.items.forEach((it, i) => {
    if (isInvoiceRowBlank(it)) return;
    const key = `items.${i}.product`;
    if (!errors[key] && !ctx.resolveProductId(it)) {
      errors[key] = "Please choose the product from the list.";
    }
  });

  // Charges / document discount (0 is fine, negatives are not)
  const chargeChecks: Array<[string, unknown, string]> = [
    ["shippingCharges", form.shippingCharges, "shipping charges"],
    ["otherCharges", form.otherCharges, "other charges"],
    ["overallDiscount", form.overallDiscount, "overall discount"],
  ];
  chargeChecks.forEach(([key, value, label]) => {
    const e = checkNumber(value, label, { allowZero: true });
    if (e) errors[key] = e;
  });

  // Payments
  const paid = parseNumericValue(form.paidAmount);
  if (
    form.paidAmount !== undefined &&
    form.paidAmount !== null &&
    String(form.paidAmount).trim() !== ""
  ) {
    if (paid === null) {
      errors.paidAmount = "Paid amount must be a valid number.";
    } else if (paid < 0) {
      errors.paidAmount = "Paid amount cannot be negative.";
    } else if (paid > 0) {
      const over = checkPaymentWithinBalance(
        paid,
        ctx.totals.grandTotal,
        "Paid amount",
      );
      if (over) errors.paidAmount = over;
      else if (!(form.paymentSplits[0]?.method || "").trim()) {
        errors.paymentMethod =
          "Please select a payment mode for the amount received.";
      }
    }
  }
  form.paymentSplits.forEach((p) => {
    const n = parseNumericValue(p.amount);
    if (n !== null && n < 0 && !errors.paidAmount) {
      errors.paidAmount = "Payment amount cannot be negative.";
    }
  });

  // Totals consistency with what will be submitted (only meaningful when the lines themselves are valid)
  if (Object.keys(errors).length === 0) {
    const rows = form.items.filter((it) => !isInvoiceRowBlank(it));
    const doc = calculateDocumentTotals({
      items: rows.map((it) => ({
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent,
        taxPercent: it.taxPercent,
      })),
      withGst: form.withGst,
      gstType: form.gstType,
      overallDiscount: Number(form.overallDiscount) || 0,
      shippingCharges: Number(form.shippingCharges) || 0,
      otherCharges: Number(form.otherCharges) || 0,
      roundMode: form.roundMode || "none",
      paidAmount: Math.max(0, Number(form.paidAmount) || 0),
    });
    const tol = Math.max(0.05, 0.01 * rows.length);
    const t = ctx.totals;
    const totalsErr =
      checkTotalConsistency(doc.subtotal, t.subtotal, "subtotal", tol) ||
      checkTotalConsistency(
        doc.totalDiscount,
        t.totalDiscount,
        "discount total",
        tol,
      ) ||
      checkTotalConsistency(doc.totalTax, t.totalTax, "tax total", tol) ||
      checkTotalConsistency(doc.grandTotal, t.grandTotal, "grand total", tol);
    if (totalsErr) {
      errors.totals = totalsErr;
    } else if (t.grandTotal < 0) {
      errors.totals =
        "The grand total cannot be negative. Please reduce the discount.";
    } else {
      const gstErr = checkGstSplit(
        { cgst: t.cgst, sgst: t.sgst, igst: t.igst, total: t.totalTax },
        !form.withGst
          ? "exempt"
          : form.gstType === "intra_state"
            ? "intra"
            : "inter",
      );
      if (gstErr) errors.totals = gstErr;
    }
  }

  return errors;
};

/** Maps backend field paths (e.g. `items.0.unitPrice`) to this form's error keys. */
const mapInvoiceApiErrorKey = (path: string): string => {
  const m = /^items\.(\d+)\.(\w+)$/.exec(path);
  if (m) {
    const field: Record<string, string> = {
      productId: "product",
      productName: "product",
      quantity: "quantity",
      unitPrice: "price",
      discountPercent: "discountPercent",
      discountAmount: "discountAmount",
      taxPercent: "taxPercent",
    };
    return `items.${m[1]}.${field[m[2]] || "product"}`;
  }
  if (path === "customerId" || path === "customerName") return "customer";
  if (path === "items") return "items";
  if (/^paymentSplits|^paymentMethod|^paidAmount/.test(path))
    return path === "paymentMethod" ? "paymentMethod" : "paidAmount";
  return path;
};

const FORM_ERROR_INPUT_CLS = "!border-rose-400 !bg-rose-50/40";

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

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Standard Select Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-full h-10 px-3.5 bg-white border rounded-xl text-xs font-medium outline-none flex items-center justify-between cursor-pointer transition-all duration-200 ${
          isOpen || value
            ? "border-[#33077C] ring-2 ring-[#33077C]/10"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <div className="truncate pr-2">
          {selectedCustomer ? (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">
                {selectedCustomer.name}
              </span>
              {selectedCustomer.company && (
                <span className="text-slate-500 text-xs">
                  ({selectedCustomer.company})
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">Select or search customer...</span>
          )}
        </div>

        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-purple-100 shadow-2xl shadow-purple-900/15 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* 1. Search Bar */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search Customer by name, phone or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/15 text-slate-900 placeholder-slate-400 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Add New Customer Action Button */}
          <div className="px-2 pt-2 pb-1 border-b border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAddNewCustomer();
              }}
              className="w-full py-1.5 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100/80 text-[#33077C] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-purple-200/80 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Add New Customer</span>
            </button>
          </div>

          {/* 3. Customer List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-slate-100/60 custom-scrollbar">
            {/* Clear / None Option */}
            <div
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                !value
                  ? "bg-purple-50 text-[#33077C] font-bold"
                  : "hover:bg-slate-50 text-slate-600"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-400 italic">None / Unassigned</span>
              </div>
              {!value && <Check className="w-4 h-4 text-[#33077C]" />}
            </div>

            {filteredCustomers.length === 0 ? (
              <div className="py-6 px-3 text-center text-slate-400">
                <p className="text-xs font-semibold text-slate-600">
                  No customers found
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Try searching with a different name, phone or code
                </p>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNewCustomer();
                    }}
                    className="mt-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#33077C] text-white text-[11px] font-bold hover:bg-[#4309A2] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add "{searchQuery.trim()}"</span>
                  </button>
                )}
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = value === c.id;
                const out = c.outstandingAmount ?? c.openingBalance;

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      onChange(isSelected ? "" : c.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-purple-50 text-[#33077C] font-semibold border border-purple-200/60"
                        : "hover:bg-slate-50/80 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Avatar Initials Circle matching SalesRepSearchableSelect */}
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-[#33077C] font-bold text-xs flex items-center justify-center shrink-0 border border-purple-200/60">
                        {getInitials(c.name, "CU")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 truncate">
                            {c.name}
                          </span>
                          {c.company && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium truncate max-w-[140px]">
                              {c.company}
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Active
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                          {c.phone ? (
                            <span className="flex items-center gap-1 font-mono text-slate-600">
                              <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{c.phone}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">No phone</span>
                          )}
                          {(c.customerCode || c.code) && (
                            <span className="text-[10px] font-mono text-slate-400">
                              #{c.customerCode || c.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {out !== undefined && out !== null && Number(out) > 0 ? (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-normal leading-tight">
                            Balance
                          </span>
                          <span className="font-bold text-[#33077C] text-xs">
                            ₹{Number(out).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ) : null}
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
  );
};

export const SalesView: React.FC = () => {
  const companyProfile = useCompanyDocumentProfile();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const {
    saveSale: storeSaveSale,
    deleteSale,
    updateSalePayment,
    saveCustomer,
    setCustomersList,
    setStocksList,
    setSalesList: storeSetSalesList,
    adjustStock,
    savePaymentIn,
    updateQuotationStatus,
  } = useSalesManagementStore();
  // Everything displayed comes from component state filled ONLY by API responses.
  const [sales, setSales] = useState<SaleTransaction[]>([]);

  // Computed next preview number based on currently loaded sales invoices
  const computedPreviewNo = useMemo(() => {
    return getNextSalesInvoiceNumber(sales);
  }, [sales]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [salesRepresentatives, setSalesRepresentatives] = useState<any[]>([]);
  const [customerList, setCustomerList] = useState<any[]>([]);
  const customers = customerList;
  // Keep shared session memory in sync for other screens, but never read it here.
  const setSalesList = useCallback(
    (list: SaleTransaction[]) => {
      setSales(list);
      storeSetSalesList(list);
    },
    [storeSetSalesList],
  );
  // Upsert an API-returned invoice into the displayed list.
  const saveSale = useCallback(
    (sale: SaleTransaction) => {
      setSales((prev) =>
        prev.some((s) => s.id === sale.id)
          ? prev.map((s) => (s.id === sale.id ? sale : s))
          : [sale, ...prev],
      );
      storeSaveSale(sale);
    },
    [storeSaveSale],
  );
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
      const rawCust = unpackProducts(custRes);
      const mapped = rawCust.map(mapApiCustomerToSalesCustomer);
      setCustomerList(mapped);
      setCustomersList(mapped);
    } catch (err) {
      console.warn("Failed to load customers in SalesView:", err);
    }
  }, [setCustomersList]);

  useEffect(() => {
    loadCustomersData();
  }, [loadCustomersData]);

  // Sales representatives for filters / assignment pickers come from the API only.
  useEffect(() => {
    let cancelled = false;
    salesRepresentativeApi
      .getList({ page: 1, limit: 100 }, { fresh: true })
      .then((res) => {
        if (!cancelled)
          setSalesRepresentatives(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setSalesRepresentatives([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
  const [pageSize, setPageSize] = useState(5);
  const [isSalesGraphModalOpen, setIsSalesGraphModalOpen] = useState(false);

  useEffect(() => {
    initializeWorkflowIntegrity();
  }, []);

  // Track upstream document conversion source info
  const convertSourceRef = useRef<{
    sourceType?: string;
    sourceId?: string;
    sourceNo?: string;
  } | null>(null);

  // Handle conversion navigation from Sale Order, Estimate, Proforma, or Challan
  useEffect(() => {
    const convertData = (location.state as any)?.convertFrom;
    if (convertData) {
      convertSourceRef.current = {
        sourceType: convertData.sourceType || "Estimate",
        sourceId: convertData.sourceId || "",
        sourceNo: convertData.sourceNo || convertData.referenceNo || "",
      };

      const resolvedItems: SaleProductItem[] = (convertData.items || []).map(
        (it: any, idx: number) => {
          const qty = Number(it.quantity) || 1;
          const uPrice = Number(it.unitPrice ?? it.price ?? 0);
          const pPrice = Number(it.purchasePrice ?? it.cost ?? 0);
          const dPct = Number(it.discountPercent ?? 0);
          const tPct = Number(it.taxPercent ?? 0);
          const lineRes = calculateLineItem(
            {
              quantity: qty,
              unitPrice: uPrice,
              discountPercent: dPct,
              taxPercent: tPct,
            },
            {
              withGst: convertData.withGst !== false,
              gstType: convertData.gstType || "intra_state",
            },
          );
          return {
            id: it.id || `s_item_${Date.now()}_${idx}`,
            productId: it.productId || "",
            productName: it.productName || it.name || "Product",
            sku: it.sku || "",
            batch: it.batch || it.batchNo || "",
            quantity: qty,
            purchasePrice: pPrice,
            salesPrice: uPrice,
            unitPrice: uPrice,
            discountPercent: dPct,
            taxPercent: tPct,
            total: lineRes.lineTotal,
          };
        },
      );

      if (resolvedItems.length === 0) {
        resolvedItems.push({
          id: `s_item_${Date.now()}`,
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
        });
      }

      const initialPaid = Number(
        convertData.paidAmount ?? convertData.advanceAmount ?? 0,
      );
      const initialMethod = convertData.paymentMethod || "Bank Transfer";

      setFormData({
        invoiceNo: "",
        salesInvoiceManualNo: "",
        referenceNo: convertData.sourceNo || convertData.referenceNo || "",
        saleDate: new Date().toISOString().split("T")[0],
        dueDate:
          convertData.dueDate ||
          new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        customerId: convertData.customerId || "",
        customerName: convertData.customerName || convertData.partyName || "",
        customerCompany: convertData.customerCompany || "",
        customerPhone: convertData.customerPhone || "",
        customerEmail: convertData.customerEmail || "",
        billingAddress: convertData.billingAddress || "",
        shippingAddress:
          convertData.shippingAddress || convertData.billingAddress || "",
        items: resolvedItems,
        withGst: convertData.withGst !== false,
        gstType: convertData.gstType || "intra_state",
        overallDiscount: Number(
          convertData.overallDiscount ?? convertData.discount ?? 0,
        ),
        shippingCharges: Number(convertData.shippingCharges ?? 0),
        otherCharges: Number(convertData.otherCharges ?? 0),
        paymentMethod: initialMethod,
        paymentSplits: [
          {
            id: "ps_1",
            method: initialMethod,
            amount: initialPaid,
            referenceNo: convertData.sourceNo || "",
          },
        ],
        paymentRecords: [],
        paymentTerms: convertData.paymentTerms || "Net 15 Days",
        paidAmount: initialPaid,
        roundMode: (convertData.roundMode as any) || "none",
        invoiceStatus: "Draft",
        saleStatus: "Confirmed",
        salesperson: convertData.salesperson || "",
        notes:
          convertData.notes ||
          `Converted from ${convertData.sourceType || "Document"} ${convertData.sourceNo || ""}`,
      });

      setEditingSale(null);
      resetFormErrors();
      setIsFormModalOpen(true);
      toast.info(
        `Loaded details from ${convertData.sourceType || "document"} ${convertData.sourceNo || ""}. Review payment calculations and confirm invoice.`,
      );

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) {
      setPendingSearch(q);
      setAppliedSearch(q);
    }
  }, [searchParams]);

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

  // Next Stage / Convert Dropdown state
  const [activeConvertDropdownId, setActiveConvertDropdownId] = useState<
    string | null
  >(null);
  const [convertDropdownPos, setConvertDropdownPos] = useState<{
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
  // Split payment (Single / Split mode in the Billing Summary) for a NEW invoice
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitPaymentRow[]>(() => [
    newSplitRow(makeSplitRowId()),
  ]);
  const [splitShowErrors, setSplitShowErrors] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] =
    useState(false);
  const [isPaymentDetailsModalOpen, setIsPaymentDetailsModalOpen] =
    useState(false);
  const [selectedPaymentRecord, setSelectedPaymentRecord] =
    useState<SalePaymentRecord | null>(null);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [activeItemRowIndex, setActiveItemRowIndex] = useState<number | null>(
    null,
  );
  const [openProductDropdownRow, setOpenProductDropdownRow] = useState<
    number | null
  >(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedSale, setSelectedSale] = useState<SaleTransaction | null>(
    null,
  );
  const [editingSale, setEditingSale] = useState<SaleTransaction | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetSale, setDeleteTargetSale] =
    useState<SaleTransaction | null>(null);
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  const [deleteSaleError, setDeleteSaleError] = useState<string | null>(null);

  // Live Batches & Products state for Search & Dropdown Popover
  const [liveBatches, setLiveBatches] = useState<ApiStockBatch[]>([]);
  const isFetchingProductsRef = useRef(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const productSearchTimerRef = useRef<any>(null);

  // Robust live product loader with multi-source fallback (Commerce products, client products, stocks)
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
        console.warn(
          "Product load pagination_required:true error in SalesView:",
          err,
        );
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
          console.warn(
            "Product load pagination_required:false error in SalesView:",
            err2,
          );
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
          console.warn(
            "clientProductApi load fallback error in SalesView:",
            cErr,
          );
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
          console.warn("stockApi load fallback error in SalesView:", sErr);
        }
      }

      if (prods.length > 0) {
        setProductList((prev) => {
          const map = new Map<string, any>();
          if (searchQuery?.trim()) {
            prev.forEach((p) => map.set(p.id, p));
          }
          prods.forEach((p: any) => {
            const pId = p.id || p.productId;
            if (!pId) return;
            map.set(pId, {
              id: pId,
              productId: pId,
              name: p.productName || p.name || "Unnamed Product",
              productName: p.productName || p.name || "Unnamed Product",
              code: p.productCode || p.sku || p.code || pId,
              sku: p.productCode || p.sku || p.code || pId,
              price: Number(
                p.salePrice ?? p.sellingPrice ?? p.price ?? p.unitPrice ?? 0,
              ),
              salePrice: Number(
                p.salePrice ?? p.sellingPrice ?? p.price ?? p.unitPrice ?? 0,
              ),
              unitPrice: Number(
                p.salePrice ?? p.sellingPrice ?? p.price ?? p.unitPrice ?? 0,
              ),
              cost: Number(p.purchasePrice ?? p.costPrice ?? 0),
              unit: p.unit || "PCS",
              batches: p.batches || p.stockBatches || [],
              hsnCode: p.hsnCode || "",
              category: p.category || "General",
              imageUrl:
                (p as any).images?.[0] ||
                (p as any).image ||
                (p as any).imageUrl ||
                "",
            });
          });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn("Failed to search products in SalesView:", err);
    } finally {
      setIsLoadingProducts(false);
      isFetchingProductsRef.current = false;
    }
  }, []);

  // Load Stocks & Products on demand when Form Modal is opened
  const hasLoadedProductsRef = useRef(false);
  const loadProductAndStockData = useCallback(async () => {
    fetchLiveProducts();

    if (hasLoadedProductsRef.current) return;
    hasLoadedProductsRef.current = true;
    try {
      const stockRes = await stockApi
        .getStocks({ pagination_required: false, page_size: 100 })
        .catch(() => null);
      const rawStocks = unpackProducts(stockRes);
      if (rawStocks.length > 0) {
        const mappedStocks = rawStocks.map(mapApiStockToInventoryStockItem);
        setStocks(mappedStocks);
        setStocksList(mappedStocks);
      }
    } catch (err) {
      console.warn("Failed to load stocks for form modal in SalesView:", err);
    }

    try {
      const batchRes = await stockApi
        .getStockBatches({ pagination_required: false, page_size: 100 })
        .catch(() => null);
      const rawBatches = unpackProducts(batchRes);
      if (rawBatches.length > 0) {
        setLiveBatches(rawBatches);
      }
    } catch (err) {
      console.warn("Failed to load batches for form modal in SalesView:", err);
    }
  }, [fetchLiveProducts, setStocksList]);

  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  // On-demand product search: calls products API
  const handleProductSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      fetchLiveProducts(trimmed);
    },
    [fetchLiveProducts],
  );

  useEffect(() => {
    if (isFormModalOpen) {
      loadProductAndStockData();
      if (!hasLoadedProductsRef.current || productList.length === 0) {
        fetchLiveProducts();
      }
    }
  }, [
    isFormModalOpen,
    loadProductAndStockData,
    fetchLiveProducts,
    productList.length,
  ]);

  // API States
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [totalApiRecords, setTotalApiRecords] = useState(0);
  const [apiSummary, setApiSummary] = useState<CommerceInvoiceSummary | null>(
    null,
  );
  const [totalApiPages, setTotalApiPages] = useState(1);

  // Resolves a line to a real product record id. It never creates a product and never substitutes a
  // different one: when nothing matches it returns undefined and the form asks the user to pick from the list.
  const resolveProductId = (item: SaleProductItem): string | undefined => {
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
    return undefined;
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
  const fetchSalesInvoices = useCallback(
    async (overrides?: {
      page?: number;
      search?: string;
      saleStatus?: string;
      paymentStatus?: string;
      customer?: string;
    }): Promise<boolean> => {
      if (isFetchingInvoicesRef.current) return false;
      isFetchingInvoicesRef.current = true;
      setIsApiLoading(true);
      try {
        const targetPage = overrides?.page ?? currentPage;
        const targetSearch =
          overrides?.search !== undefined ? overrides.search : appliedSearch;
        const targetSaleStatus =
          overrides?.saleStatus !== undefined
            ? overrides.saleStatus
            : appliedSaleStatus;
        const targetPaymentStatus =
          overrides?.paymentStatus !== undefined
            ? overrides.paymentStatus
            : appliedPaymentStatus;
        const targetCustomer =
          overrides?.customer !== undefined
            ? overrides.customer
            : appliedCustomer;

        const params: InvoiceFilterParams = {
          page_no: targetPage,
          page_size: pageSize,
          pagination_required: "true",
          sortOrder: "desc",
        };
        if (targetSearch && targetSearch.trim()) {
          params.search = targetSearch.trim();
        }
        if (targetSaleStatus && targetSaleStatus.toUpperCase() !== "ALL") {
          params.status = targetSaleStatus;
        }
        if (
          targetPaymentStatus &&
          targetPaymentStatus.toUpperCase() !== "ALL"
        ) {
          params.paymentStatus = targetPaymentStatus;
        }
        if (
          targetCustomer &&
          targetCustomer.toUpperCase() !== "ALL" &&
          UUID_REGEX.test(targetCustomer)
        ) {
          params.customerId = targetCustomer;
        }

        const res = await commerceInvoiceApi.getInvoices(params);
        if (res && res.data && Array.isArray(res.data)) {
          const mapped = res.data.map((inv) =>
            mapApiInvoiceToSaleTransaction(inv),
          );

          setSalesList(mapped);

          // Self-heal and record cross-module lineage for all fetched invoices with references
          mapped.forEach((sale) => {
            if (!sale.invoiceNo) return;
            const ref = sale.referenceNo?.trim();
            if (!ref) return;

            const existing = findDocumentLineage(sale.invoiceNo);
            if (!existing || !existing.invoiceNo) {
              const inferredType = inferDocType(ref);
              if (inferredType) {
                recordDocumentConversion({
                  fromType: inferredType,
                  fromNo: ref,
                  toType: "Invoice",
                  toNo: sale.invoiceNo,
                  toId: sale.id,
                  partyName: sale.customerName,
                  customerId: sale.customerId,
                });
              }
            }
          });
          setApiSummary(res.summary ?? null);
          if (res.pagination) {
            setTotalApiRecords(res.pagination.totalRecords ?? mapped.length);
            setTotalApiPages(
              Math.max(
                1,
                Math.ceil(
                  (res.pagination.totalRecords ?? mapped.length) / pageSize,
                ),
              ),
            );
          } else {
            setTotalApiRecords(mapped.length);
            setTotalApiPages(1);
          }
          setIsApiConnected(true);
          return true;
        }
        return false;
      } catch (err: any) {
        console.error("Failed to fetch invoices:", err);
        setSalesList([]);
        setTotalApiRecords(0);
        setTotalApiPages(1);
        setIsApiConnected(false);
        return false;
      } finally {
        setIsApiLoading(false);
        isFetchingInvoicesRef.current = false;
      }
    },
    [
      currentPage,
      pageSize,
      appliedSearch,
      appliedSaleStatus,
      appliedPaymentStatus,
      appliedCustomer,
      setSalesList,
    ],
  );

  useEffect(() => {
    fetchSalesInvoices();
  }, [fetchSalesInvoices]);

  // Listen for sidebar click navigation events to immediately re-fetch sales invoices
  useEffect(() => {
    const handleSidebarNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ path: string; id: string }>;
      if (
        customEvent.detail?.path === "/sale-management/sales/sale" ||
        customEvent.detail?.id === "sale"
      ) {
        isFetchingInvoicesRef.current = false;
        fetchSalesInvoices();
      }
    };
    window.addEventListener("crm:sidebar-navigate", handleSidebarNavigate);
    return () => {
      window.removeEventListener("crm:sidebar-navigate", handleSidebarNavigate);
    };
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
    salesInvoiceManualNo: string;
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
    roundMode: "none" | "up" | "down";
    saleStatus: SaleStatus;
    salesperson: string;
    notes: string;
  }>({
    invoiceNo: "",
    salesInvoiceManualNo: "",
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
    roundMode: "none",
    saleStatus: "Confirmed",
    salesperson: "",
    notes: "",
  });

  // Inline validation state + double-submit protection for the invoice form and its actions
  const invoiceFe = useFieldErrors();
  const {
    errors: formErrors,
    validateAll: validateAllFields,
    clearError: clearFormError,
    clearGroup: clearFormGroup,
    merge: mergeFormErrors,
    reset: resetFormErrors,
  } = invoiceFe;
  const saveGuard = useSubmitGuard();
  // Backend batch stock (per product, cached; fetched on product selection and refreshed on submit only).
  const batchStock = useBatchStock();
  const {
    loadProduct: loadBatchStock,
    refresh: refreshBatchStock,
    forget: forgetBatchStock,
    getBatches: getStockBatches,
    getAvailable: getBatchAvailable,
  } = batchStock;
  // Products already on the form (opened for edit, prefilled by a conversion, or picked by the user)
  // get their batch stock loaded once; cached products are not refetched.
  const invoiceProductIdsKey = isFormModalOpen
    ? Array.from(
        new Set(formData.items.map((it) => it.productId).filter(Boolean)),
      )
        .sort()
        .join(",")
    : "";
  useEffect(() => {
    if (!invoiceProductIdsKey) return;
    invoiceProductIdsKey.split(",").forEach((id) => {
      void loadBatchStock(id);
    });
  }, [invoiceProductIdsKey, loadBatchStock]);
  // Every open/close of the invoice form or the Add Payment modal starts with a clean slate.
  useEffect(() => {
    resetFormErrors();
  }, [isFormModalOpen, resetFormErrors]);
  useEffect(() => {
    paymentFe.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaymentModalOpen]);
  const paymentGuard = useSubmitGuard();
  const cancelGuard = useSubmitGuard();
  const deleteGuard = useSubmitGuard();
  // Add Payment modal errors (shown only after the first submit attempt).
  const paymentFe = useFieldErrors();
  const paymentFormErrors = paymentFe.errors;
  const setPaymentFormErrors = paymentFe.setErrors;
  const assignFe = useFieldErrors();
  const detailFe = useFieldErrors();
  const assignRepError = assignFe.errors.assignRepId;
  const detailRepError = detailFe.errors.detailRepId;

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

  // KPI card metrics come ONLY from the API summary (zeros until the API responds).
  const cardSummary = {
    totalCount: apiSummary?.totalCount ?? 0,
    totalSalesAmount: apiSummary?.totalSalesAmount ?? 0,
    todayAmount: apiSummary?.todayAmount ?? 0,
    todayCount: apiSummary?.todayCount ?? 0,
    pendingPaymentsAmount: apiSummary?.pendingPaymentsAmount ?? 0,
    completedCount: apiSummary?.completedCount ?? 0,
    cancelledCount: apiSummary?.cancelledCount ?? 0,
  };
  const summary = cardSummary;

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

  // Product Selection helper with real stock batches and searched products
  const availableProducts = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Live Products from /commerce/products
    productList.forEach((p: any) => {
      const pId = String(p.id || p.productId || "");
      if (!pId) return;
      const sku = p.sku || p.code || p.productCode || "";
      const name = p.name || p.productName || "Unnamed Product";
      const batches = getBatchesForProduct(
        pId,
        sku,
        name,
        p.batches || p.stockBatches,
      );
      map.set(pId, {
        id: pId,
        productId: pId,
        name,
        productName: name,
        price: Number(p.price ?? p.salePrice ?? p.unitPrice ?? 0),
        salePrice: Number(p.price ?? p.salePrice ?? p.unitPrice ?? 0),
        unitPrice: Number(p.price ?? p.salePrice ?? p.unitPrice ?? 0),
        cost: Number(p.cost ?? p.purchasePrice ?? 0),
        sku,
        code: sku,
        category: p.category || "General",
        unit: p.unit || "PCS",
        imageUrl: p.imageUrl || p.image || (p as any).images?.[0] || "",
        batches,
        stock: p.stock ?? 0,
      });
    });

    // 2. Stocks from /commerce/stocks
    stocks.forEach((stk: any) => {
      const pid = String(stk.productId || stk.id || "");
      if (pid && !map.has(pid)) {
        const sku = stk.sku || stk.productCode || "";
        const name = stk.productName || stk.name || "Unnamed Product";
        const batches = getBatchesForProduct(pid, sku, name, stk.batches);
        map.set(pid, {
          id: pid,
          productId: pid,
          name,
          productName: name,
          price: Number(stk.unitPrice ?? stk.salePrice ?? 0),
          salePrice: Number(stk.unitPrice ?? stk.salePrice ?? 0),
          unitPrice: Number(stk.unitPrice ?? stk.salePrice ?? 0),
          cost: Number(stk.unitCost ?? stk.purchasePrice ?? 0),
          sku,
          code: sku,
          category: stk.category || "General",
          unit: stk.unit || "PCS",
          imageUrl: stk.imageUrl || stk.image || (stk as any).images?.[0] || "",
          batches,
          stock: stk.inStock ?? 0,
        });
      }
    });

    // Also include line items currently on the invoice so their names are retained
    formData.items.forEach((it: any) => {
      const itPid = String(it.productId || "");
      if (itPid && !map.has(itPid)) {
        map.set(itPid, {
          id: itPid,
          productId: itPid,
          name: it.productName || "Product",
          productName: it.productName || "Product",
          price: Number(it.unitPrice ?? it.salesPrice ?? 0),
          salePrice: Number(it.unitPrice ?? it.salesPrice ?? 0),
          unitPrice: Number(it.unitPrice ?? it.salesPrice ?? 0),
          cost: Number(it.purchasePrice || 0),
          sku: it.sku || "",
          code: it.sku || "",
          category: it.category || "General",
          unit: it.unit || "PCS",
          imageUrl: it.imageUrl || it.image || "",
          batches: [],
          stock: 0,
        });
      }
    });

    return attachStockQty(Array.from(map.values()), stocks).filter((s: any) => {
      const pid = String(s.productId || s.id || "").trim();
      const name = String(s.name || s.productName || "").trim();
      if (!pid && !name) return false;
      if (pid.startsWith("mock_")) return false;
      return true;
    });
  }, [stocks, productList, formData.items, getBatchesForProduct]);

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

  // The quantity shown in each product row is read live: refresh the stock whenever a product dropdown opens, so it
  // reflects what the last saved document changed (the stock endpoint is never cached).
  useEffect(() => {
    if (openProductDropdownRow === null || openProductDropdownRow === undefined)
      return;
    let cancelled = false;
    stockApi
      .getStocks({ pagination_required: false, page_size: 100 })
      .then((res) => {
        if (cancelled) return;
        const raw = unpackProducts(res);
        if (raw.length > 0) setStocks(raw.map(mapApiStockToInventoryStockItem));
      })
      .catch(() => {
        /* keep the quantities already shown */
      });
    return () => {
      cancelled = true;
    };
  }, [openProductDropdownRow]);

  const matchingProducts = useMemo(() => {
    const q = productSearchQuery.toLowerCase().trim();
    if (!q) return availableProducts;
    return availableProducts.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.productName && p.productName.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)),
    );
  }, [availableProducts, productSearchQuery]);

  const handleSelectProduct = (index: number, product: any) => {
    const prodId = product.productId || product.id;
    handleItemProductChange(index, prodId);
    setOpenProductDropdownRow(null);
    setProductSearchQuery("");
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest(".si-product-cell") &&
        !target.closest(".si-product-dropdown")
      ) {
        setOpenProductDropdownRow(null);
      }
      if (
        !target.closest(".invoice-convert-dropdown-container") &&
        !target.closest(".invoice-convert-dropdown-menu")
      ) {
        setActiveConvertDropdownId(null);
        setConvertDropdownPos(null);
      }
    };
    const handleScroll = () => {
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

  // Handle opening Create Modal
  const handleOpenCreateModal = () => {
    const initialItem: SaleProductItem = {
      id: `s_item_${Date.now()}`,
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
      invoiceNo: "",
      salesInvoiceManualNo: "",
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
      items: [initialItem],
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
      roundMode: "none",
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
    resetFormErrors();
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
      salesInvoiceManualNo: sale.salesInvoiceManualNo || "",
      referenceNo: sale.referenceNo || "",
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
      roundMode: (sale as any).roundMode || "none",
      invoiceStatus: sale.invoiceStatus || "Generated",
      paymentRecords: sale.paymentRecords || [],
      saleStatus: sale.saleStatus,
      salesperson: sale.salesperson,
      notes: sale.notes || "",
    });
    setEditingSale(sale);
    setIsFormModalOpen(true);
  };

  // Duplicate: open the New Invoice form prefilled from this invoice. Nothing is saved until the user presses Save,
  // so the copy is created through the API like any other new invoice (it is never a hidden local draft).
  const handleDuplicateSale = (sale: SaleTransaction) => {
    resetFormErrors();
    const today = new Date().toISOString().split("T")[0];
    const dayMs = 86_400_000;
    const termDays =
      sale.dueDate && sale.saleDate
        ? Math.max(
            0,
            Math.round(
              (new Date(sale.dueDate).getTime() -
                new Date(sale.saleDate).getTime()) /
                dayMs,
            ),
          )
        : 0;
    const dueDate = new Date(Date.now() + termDays * dayMs)
      .toISOString()
      .split("T")[0];
    setFormData({
      invoiceNo: "",
      salesInvoiceManualNo: "",
      referenceNo: "",
      saleDate: today,
      dueDate,
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
      paymentSplits: [
        {
          id: "ps_1",
          method: sale.paymentMethod || "Bank Transfer",
          amount: 0,
          referenceNo: "",
        },
      ],
      paymentTerms: sale.paymentTerms,
      paidAmount: 0,
      roundMode: (sale as any).roundMode || "none",
      invoiceStatus: "Draft",
      paymentRecords: [],
      saleStatus: "Draft",
      salesperson: sale.salesperson,
      notes: sale.notes || "",
    });
    setEditingSale(null);
    setIsFormModalOpen(true);
    toast.info(
      `Review the copy of ${sale.invoiceNo} and press Save to create the new invoice.`,
    );
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const mapSaleToDocumentPrintOptions = (
    sale: SaleTransaction,
  ): DocumentPrintOptions => {
    const isGstActive =
      sale.withGst !== false && Number(sale.totalTax || 0) > 0;
    return {
      docTypeTitle: "TAX INVOICE",
      docNo: sale.invoiceNo,
      docDate: isoToDdmmyyyy(sale.saleDate),
      dueDate: sale.dueDate ? isoToDdmmyyyy(sale.dueDate) : undefined,
      status: sale.paymentStatus,
      statusColor:
        sale.paymentStatus === "Paid"
          ? "emerald"
          : sale.paymentStatus === "Partial"
            ? "amber"
            : "rose",
      referenceNo: sale.referenceNo,
      companyName: companyProfile.companyName,
      companySubtitle: companyProfile.companySubtitle,
      companyAddress: companyProfile.companyAddress,
      companyGstin: companyProfile.companyGstin,
      companyPhone: companyProfile.companyPhone,
      companyEmail: companyProfile.companyEmail,
      partyTitle: "Billed To",
      partyName: sale.customerName,
      partyCompany: sale.customerCompany,
      partyPhone: sale.customerPhone,
      partyEmail: sale.customerEmail,
      partyAddress: sale.billingAddress,
      extraMeta: [
        { label: "Payment Status", value: sale.paymentStatus },
        { label: "Payment Method", value: sale.paymentMethod || "Cash" },
        { label: "Salesperson", value: sale.salesperson || "Staff" },
        { label: "Payment Terms", value: sale.paymentTerms || "Net 15 Days" },
      ],
      items: (sale.items || []).map((it) => ({
        name: it.productName,
        sku: it.sku,
        batch: it.batch,
        unit: (it as any).unit || "PCS",
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent,
        taxPercent: isGstActive ? it.taxPercent || 0 : 0,
        total: it.total,
      })),
      subtotal: sale.subtotal,
      discount: sale.totalDiscount,
      tax: {
        withGst: isGstActive,
        taxAmount: sale.totalTax,
        cgst: sale.cgst,
        sgst: sale.sgst,
        igst: sale.igst,
      },
      shipping: sale.shippingCharges,
      otherCharges: sale.otherCharges,
      roundOff: (sale as any).roundOff,
      grandTotal: sale.grandTotal,
      paidAmount: sale.paidAmount,
      balance: sale.balance,
      notes: sale.notes,
      terms: (sale as any).terms || sale.paymentTerms,
      primarySignatoryLabel: "Authorized Signatory",
    };
  };

  // Load the latest record (GET /commerce/invoices/:id) so print / download use server data
  const fetchLatestInvoice = async (
    sale: SaleTransaction,
  ): Promise<SaleTransaction> => {
    if (!UUID_REGEX.test(sale.id)) return sale;
    try {
      const res = await commerceInvoiceApi.getInvoiceById(sale.id);
      if (res?.data) return mapApiInvoiceToSaleTransaction(res.data);
    } catch (err) {
      console.warn("Could not fetch latest invoice for print/download:", err);
    }
    return sale;
  };

  const handleDownloadSaleInvoice = async (listSale: SaleTransaction) => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const toastId = `dl-sale-${listSale.id}`;
    toast.loading(`Preparing PDF for Invoice ${listSale.invoiceNo}...`, {
      id: toastId,
    });
    try {
      const sale = await fetchLatestInvoice(listSale);
      const options = mapSaleToDocumentPrintOptions(sale);
      await downloadBusinessDocument(
        options,
        `Invoice_${sale.invoiceNo.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
      );
      toast.success(`Invoice ${sale.invoiceNo} downloaded successfully!`, {
        id: toastId,
      });
    } catch (err: any) {
      console.error("Invoice PDF download error:", err);
      toast.error("Failed to generate and download invoice PDF.", {
        id: toastId,
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadPaymentReceipt = async (record: SalePaymentRecord) => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    const toastId = `dl-rcpt-${record.id}`;
    toast.loading(`Preparing payment receipt...`, { id: toastId });
    try {
      const parentSale = sales.find((s) => s.invoiceNo === record.invoiceNo);
      const receiptOptions: DocumentPrintOptions = {
        docTypeTitle: "PAYMENT IN RECEIPT",
        docNo: record.referenceNo || record.id,
        docDate: record.paymentDate,
        status: "Received",
        statusColor: "emerald",
        partyTitle: "Received From (Customer)",
        partyName:
          (record as any).customerName ||
          parentSale?.customerName ||
          "Customer",
        extraMeta: [
          { label: "Invoice No", value: record.invoiceNo },
          {
            label: "Payment Mode",
            value: (record as any).paymentMode || record.method || "Cash",
          },
          { label: "Recorded By", value: record.recordedBy || "Cashier" },
        ],
        items: [
          {
            name: `Payment towards Invoice #${record.invoiceNo}`,
            quantity: 1,
            unitPrice: record.amount,
            total: record.amount,
            remarks: record.notes || "Payment received in full/part",
          },
        ],
        grandTotal: record.amount,
        paidAmount: record.amount,
        balance: 0,
        paidAmountLabel: "Amount Received",
        notes: record.notes || "Thank you for your business!",
        primarySignatoryLabel: "Cashier / Accounts",
      };
      await downloadBusinessDocument(
        receiptOptions,
        `Receipt_${record.invoiceNo}_${record.id}.pdf`,
      );
      toast.success("Payment receipt downloaded successfully!", {
        id: toastId,
      });
    } catch (err: any) {
      console.error("Receipt download error:", err);
      toast.error("Failed to download payment receipt.", { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Direct Print Invoice
  const handlePrintSaleInvoice = async (listSale: SaleTransaction) => {
    const sale = await fetchLatestInvoice(listSale);
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
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; color: #1e293b;">${sale.withGst !== false && Number(sale.totalTax || 0) > 0 ? `${item.taxPercent || 0}%` : "0%"}</td>
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
                <h1 style="font-size: 22px; font-weight: 800; color: #33077C; margin-bottom: 4px;">${companyProfile.companyName}</h1>
                <p style="font-size: 12px; color: #64748b; line-height: 1.4;">
                  ${companyProfile.companyAddress || ""}<br/>
                  GSTIN: ${companyProfile.companyGstin || ""} | Phone: ${companyProfile.companyPhone || ""}<br/>
                  Email: ${companyProfile.companyEmail || ""}
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
      `*INVOICE*\n` +
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
        const lineRes = calculateLineItem(
          {
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountPercent: it.discountPercent,
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
    const list = customerList as any[];
    return list.map((c) => {
      const out = Number(c.outstandingAmount) || 0;
      return {
        value: c.id,
        label: c.name + (c.company ? ` (${c.company})` : ""),
        subLabel: `${c.customerCode || ""} • ${c.phone || ""}${out > 0 ? ` • Outstanding: ₹${out.toLocaleString()}` : ""}`,
        badge: c.customerCode,
      };
    });
  }, [customerList]);

  // Selected Customer Credit Stats (from the customer API record)
  const selectedCustomerFinancials = useMemo(() => {
    if (!formData.customerId) return null;
    const c = customerList.find((x: any) => x.id === formData.customerId);
    if (!c) return null;
    const creditLimit = Number(c.creditLimit) || 0;
    const outstandingAmount = Number(c.outstandingAmount) || 0;
    return {
      creditLimit,
      outstandingAmount,
      availableCredit: Math.max(0, creditLimit - outstandingAmount),
    };
  }, [formData.customerId, customerList]);

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

  // Customer Select Change
  const handleCustomerChange = (custId: string) => {
    clearFormError("customer");
    const cust = customerList.find((c) => c.id === custId);
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
  const handleItemProductNameChange = (index: number, val: string) => {
    clearFormError(`items.${index}.product`);
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], productName: val };
      return { ...prev, items: newItems };
    });
  };

  const handleItemProductChange = (index: number, prodId: string) => {
    const prod = availableProducts.find((p) => p.id === prodId);
    [
      "product",
      "quantity",
      "price",
      "discountPercent",
      "discountAmount",
      "taxPercent",
    ].forEach((f) => clearFormError(`items.${index}.${f}`));
    clearFormError("items");
    clearFormError("totals");
    // The line's batch and stock belong to the old product: drop stale stock, then load the new one.
    const oldProductId = formData.items[index]?.productId;
    if (oldProductId && oldProductId !== prodId) {
      const usedElsewhere = formData.items.some(
        (o, i) => i !== index && o.productId === oldProductId,
      );
      if (!usedElsewhere) forgetBatchStock(oldProductId);
    }
    if (prod) void loadBatchStock(prod.id);
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
        // GST is applied only when the user picks a GST rate for the line; a product's own tax rate is not copied onto the line.
        item.taxPercent = item.taxPercent ?? 0;
        const lineRes = calculateLineItem(
          {
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent || 0,
            taxPercent: item.taxPercent,
          },
          { withGst: prev.withGst, gstType: prev.gstType },
        );
        item.total = lineRes.lineTotal;
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
    clearFormError(`items.${index}.quantity`);
    clearFormError(`items.${index}.price`);
    clearFormError("totals");
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
        const lineRes = calculateLineItem(
          {
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            discountPercent: item.discountPercent || 0,
            taxPercent: item.taxPercent,
          },
          { withGst: prev.withGst, gstType: prev.gstType },
        );
        item.total = lineRes.lineTotal;
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
    const errField: Record<string, string> = { unitPrice: "price" };
    clearFormError(`items.${index}.${errField[field as string] || field}`);
    if (field === "quantity" || field === "unitPrice") {
      clearFormError(`items.${index}.discountAmount`);
    }
    clearFormError("totals");
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      const qty = field === "quantity" ? sanitizedVal : item.quantity || 0;
      const unitPrice =
        field === "unitPrice" ? sanitizedVal : item.unitPrice || 0;
      const taxPercent =
        field === "taxPercent" ? sanitizedVal : item.taxPercent || 0;
      const gross = qty * unitPrice;

      let discountPercent = item.discountPercent || 0;
      let discountAmount = item.discountAmount || 0;

      if (field === "discountPercent") {
        item.discountType = "percent";
        discountPercent = Math.min(100, sanitizedVal);
        discountAmount = 0;
        item.discountPercent = discountPercent;
        item.discountAmount = 0;
      } else if (field === "discountAmount") {
        item.discountType = "amount";
        discountAmount = Math.min(gross, sanitizedVal);
        discountPercent = 0;
        item.discountAmount = discountAmount;
        item.discountPercent = 0;
      } else if (field === "quantity" || field === "unitPrice") {
        item[field] = sanitizedVal;
      } else {
        (item as any)[field] = sanitizedVal;
      }

      item.quantity = qty;
      item.unitPrice = unitPrice;
      item.taxPercent = taxPercent;

      const lineRes = calculateLineItem(
        {
          quantity: qty,
          unitPrice,
          discountPercent,
          discountAmount,
          taxPercent,
        },
        { withGst: prev.withGst, gstType: prev.gstType },
      );
      item.total = lineRes.lineTotal;
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
      unitPrice: 0,
      taxPercent: 0,
      discountPercent: 0,
      discountAmount: 0,
      discountType: "amount",
      total: 0,
    };
    clearFormError("items");
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
    // Row indices shift after removal, so stale per-row errors are dropped.
    clearFormGroup("items.");
    clearFormError("totals");
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Live Totals Calculations using Centralized Financial Calculation Engine
  const calculatedTotals = useMemo(() => {
    const rawPaid =
      formData.paidAmount !== undefined
        ? Number(formData.paidAmount) || 0
        : (formData.paymentSplits || []).reduce(
            (acc, p) => acc + (Number(p.amount) || 0),
            0,
          );
    const paid = Math.max(0, rawPaid);
    const docTotals = calculateDocumentTotals({
      items: formData.items.map((it) => ({
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent,
        taxPercent: it.taxPercent,
      })),
      withGst: formData.withGst,
      gstType: formData.gstType,
      overallDiscount: Number(formData.overallDiscount) || 0,
      shippingCharges: Number(formData.shippingCharges) || 0,
      otherCharges: Number(formData.otherCharges) || 0,
      roundMode: formData.roundMode || "none",
      paidAmount: paid,
    });

    const unrounded = docTotals.unroundedTotal;
    const floorInt = Math.floor(unrounded);
    const ceilInt = Math.ceil(unrounded);
    const roundDownDiff = round2(floorInt - unrounded);
    const roundUpDiff = round2(ceilInt - unrounded);

    return {
      subtotal: docTotals.subtotal,
      lineDiscountTotal: docTotals.lineDiscountTotal,
      overallDiscount: docTotals.overallDiscount,
      totalDiscount: docTotals.totalDiscount,
      taxableAmount: docTotals.taxableAmount,
      totalTax: docTotals.totalTax,
      cgst: docTotals.cgst,
      sgst: docTotals.sgst,
      igst: docTotals.igst,
      shippingCharges: docTotals.shippingCharges,
      roundOff: docTotals.roundOff,
      roundDownDiff,
      roundUpDiff,
      grandTotal: docTotals.grandTotal,
      paid: docTotals.paidAmount,
      balance: docTotals.balance,
      paymentStatus: docTotals.paymentStatus,
    };
  }, [formData]);

  // Immediately clamp paid amount if invoice grand total is reduced below current paid amount
  useEffect(() => {
    if (isSplitMode) return; // split entries are checked (and shown) by the split section instead
    const currentPaid = Number(formData.paidAmount) || 0;
    if (
      calculatedTotals.grandTotal >= 0 &&
      currentPaid > calculatedTotals.grandTotal
    ) {
      setFormData((prev) => ({
        ...prev,
        paidAmount: calculatedTotals.grandTotal,
        paymentSplits:
          prev.paymentSplits.length > 0
            ? [
                {
                  ...prev.paymentSplits[0],
                  amount: calculatedTotals.grandTotal,
                },
              ]
            : [
                {
                  id: "ps_1",
                  method: prev.paymentMethod || "Bank Transfer",
                  amount: calculatedTotals.grandTotal,
                  referenceNo: "",
                },
              ],
      }));
    }
  }, [calculatedTotals.grandTotal, isSplitMode]);

  // Split payment: live totals and validation for the entries (a new invoice starts with nothing paid)
  const splitSummary = summarizeSplit(
    calculatedTotals.grandTotal,
    0,
    splitRows,
  );
  const splitValidation = validateSplit(
    calculatedTotals.grandTotal,
    0,
    splitRows,
    SALES_SPLIT_PAYMENT_METHODS,
  );

  // Every time the form opens (or another invoice is edited) it starts in Single mode with one empty entry
  useEffect(() => {
    setIsSplitMode(false);
    setSplitRows([newSplitRow(makeSplitRowId())]);
    setSplitShowErrors(false);
  }, [isFormModalOpen, editingSale?.id]);

  // The invoice's paid amount and payment list follow the split entries, so the balance updates on every keystroke
  useEffect(() => {
    if (!isSplitMode) return;
    const active = activeSplitRows(splitRows);
    setFormData((prev) => ({
      ...prev,
      paidAmount: splitSummary.totalPaid,
      paymentMethod:
        active.length > 0 ? (active[0].method as any) : prev.paymentMethod,
      paymentSplits:
        active.length > 0
          ? active.map((r) => ({
              id: r.id,
              method: r.method as any,
              amount: rowAmount(r),
              referenceNo: r.reference.trim(),
            }))
          : [
              {
                id: "ps_1",
                method: prev.paymentMethod || "Bank Transfer",
                amount: 0,
                referenceNo: "",
              },
            ],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSplitMode, splitRows]);

  const switchPaymentMode = (split: boolean) => {
    if (split === isSplitMode) return;
    if (split) {
      // carry over what was typed in the single field as the first entry
      const carried = Math.max(0, Number(formData.paidAmount) || 0);
      const m = formData.paymentSplits[0]?.method || formData.paymentMethod;
      setSplitRows([
        {
          ...newSplitRow(
            makeSplitRowId(),
            (SALES_SPLIT_PAYMENT_METHODS as string[]).includes(m as string)
              ? (m as any)
              : "Cash",
          ),
          amount: carried > 0 ? String(carried) : "",
        },
      ]);
      setSplitShowErrors(false);
    }
    setIsSplitMode(split);
  };

  // Generate Invoice Handler (Creates invoice on backend and local store)
  // Available stock of the line's chosen batch (null when stock data is not loaded for it).
  // Other lines of this form using the same product + batch are deducted; when editing a saved
  // invoice its own previously-deducted quantity is added back.
  // Stock of the line's batch comes from the backend (useBatchStock), never from local/mock data.
  const getLineAvailableStock = (it: SaleProductItem): number | null => {
    const pid = it.productId || resolveProductId(it);
    return getBatchAvailable(pid, it.batch);
  };

  // Stock this same saved (non-draft) invoice already holds for the line's product + batch: the
  // backend deducted it when the invoice was posted, so an unchanged quantity must not be flagged.
  const getLineStockCredit = (it: SaleProductItem): number => {
    if (!editingSale || !UUID_REGEX.test(editingSale.id)) return 0;
    if (editingSale.invoiceStatus === "Draft") return 0;
    const pid = it.productId || resolveProductId(it);
    return (editingSale.items || [])
      .filter(
        (o) => o.productId === pid && (o.batch || "") === (it.batch || ""),
      )
      .reduce((acc, o) => acc + (Number(o.quantity) || 0), 0);
  };

  const buildInvoiceValidationContext = (
    checkStock: boolean,
  ): InvoiceValidationContext => ({
    totals: calculatedTotals,
    checkStock,
    resolveProductId,
    availableStock: getLineAvailableStock,
    stockCredit: getLineStockCredit,
  });

  // LIVE stock errors (explicit exception to submit-first): recomputed whenever quantities, products,
  // batches or the loaded stock change, so the Qty cell reacts immediately. Never a toast.
  const liveStockErrors = useMemo<FieldErrors>(() => {
    if (!isFormModalOpen) return {};
    return validateBatchStock(
      formData.items.map((it) =>
        isInvoiceRowBlank(it)
          ? {}
          : {
              id: it.id,
              productId: it.productId || resolveProductId(it),
              productName: it.productName,
              batch: it.batch,
              quantity: it.quantity,
            },
      ),
      {
        getAvailable: (_l, i) => getLineAvailableStock(formData.items[i]),
        credit: (_l, i) => getLineStockCredit(formData.items[i]),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormModalOpen, formData.items, editingSale, batchStock.version]);

  // Submit-first: errors appear only after a submit attempt, then stay in sync with the values.
  const lastCheckStockRef = useRef(true);
  useRevalidateAfterSubmit(
    invoiceFe,
    () =>
      validateInvoiceForm(
        formData,
        buildInvoiceValidationContext(lastCheckStockRef.current),
      ),
    [formData, calculatedTotals],
  );

  // Maps backend `error.fields` onto the form and shows a friendly toast for system errors.
  const handleInvoiceSaveError = (err: any, fallback: string) => {
    const raw = extractApiFieldErrors(err);
    const mapped: FieldErrors = {};
    Object.entries(raw).forEach(([k, v]) => {
      const mk = mapInvoiceApiErrorKey(k);
      if (!(mk in mapped)) mapped[mk] = v;
    });
    // A stock rejection from the backend is shown inline on the quantity field in friendly wording.
    const stockWording = /stock|insufficient|not enough|available|quantity/i;
    let stockRejected = false;
    Object.keys(mapped).forEach((k) => {
      if (/^items.d+.quantity$/.test(k) && stockWording.test(mapped[k])) {
        mapped[k] =
          "Not enough stock is available in this batch. Please reduce the quantity.";
        stockRejected = true;
      }
    });
    if (stockRejected) {
      // Stock changed since the form was opened: pull fresh figures for the next check.
      void refreshBatchStock(formData.items.map((it) => it.productId));
    }
    const keys = Object.keys(mapped);
    if (keys.length > 0) {
      mergeFormErrors(mapped);
      requestAnimationFrame(() => focusField(keys[0]));
      if (!stockRejected) {
        toast.error(
          getApiErrorMessage(
            err,
            "Please correct the highlighted fields and try again.",
          ),
        );
      }
    } else {
      toast.error(getApiErrorMessage(err, fallback));
    }
  };

  const handleGenerateInvoice = async (): Promise<boolean> => {
    const result = await saveGuard.runOnce(() => generateInvoiceInner());
    return result === true;
  };

  const generateInvoiceInner = async (): Promise<boolean> => {
    // Split payments are checked first so the message appears next to the entries
    if (isSplitMode) {
      setSplitShowErrors(true);
      if (!splitValidation.ok) return false;
    }
    lastCheckStockRef.current = true;
    // Stock may have changed since the form was opened: refetch each distinct product once, then
    // run the full validation (every line) against the fresh batch stock.
    await refreshBatchStock(
      formData.items.map((it) => it.productId || resolveProductId(it)),
    );
    const errs = validateInvoiceForm(
      formData,
      buildInvoiceValidationContext(true),
    );
    if (!validateAllFields(errs)) return false;

    const rawValidItems = formData.items.filter(
      (it) => it.productId || it.productName,
    );

    setIsActionLoading(true);
    try {
      const validItems: SaleProductItem[] = rawValidItems.map((it) => ({
        ...it,
        productId: resolveProductId(it) as string,
      }));

      const resolvedCustomerId = ensureCustomerUUID(
        formData.customerId,
        formData.customerName,
      );

      const grandTotal = calculatedTotals.grandTotal;
      const currentPaid =
        formData.paidAmount !== undefined
          ? Number(formData.paidAmount) || 0
          : editingSale?.paidAmount || 0;
      const balance = Math.max(0, grandTotal - currentPaid);
      const paymentStatus: SalePaymentStatus =
        grandTotal > 0 && balance <= 0
          ? "Paid"
          : currentPaid > 0
            ? "Partial"
            : "Unpaid";
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
        salesInvoiceManualNo: (formData.salesInvoiceManualNo || "").trim() || undefined,
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
        createdBy: editingSale ? editingSale.createdBy : "",
        salesperson: formData.salesperson || editingSale?.salesperson || "",
        notes: formData.notes || undefined,
        convertedAt:
          convertSourceRef.current ||
          (formData.referenceNo &&
            /^(EST|QT|SO|DC|PRO)-/i.test(formData.referenceNo.trim()))
            ? editingSale?.convertedAt || new Date().toISOString()
            : editingSale?.convertedAt || undefined,
        createdAt: editingSale
          ? editingSale.createdAt
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Only send values the user actually entered (no silent defaults)
      const apiPayload = mapSaleTransactionToInvoicePayload({
        ...salePayload,
        dueDate: "",
        paymentTerms: "",
        shippingAddress: formData.shippingAddress || "",
        shippingCharges: Number(formData.shippingCharges) || (undefined as any),
        otherCharges: Number(formData.otherCharges) || (undefined as any),
        // On create the payment is recorded right after as Payment In receipt(s); sending the splits
        // here as well would make the backend count the same money twice (paid = 2x total).
        ...(isEdit ? {} : { paymentSplits: [] }),
      });

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
            invoiceNo: formData.invoiceNo || "",
          };
        }
      }

      if (
        (convertSourceRef.current ||
          (formData.referenceNo &&
            /^(EST|QT|SO|DC|PRO)-/i.test(formData.referenceNo.trim()))) &&
        !savedApiSale.convertedAt
      ) {
        savedApiSale.convertedAt =
          salePayload.convertedAt || new Date().toISOString();
      }

      saveSale(savedApiSale);

      // The backend posted the stock movement for this invoice: drop cached batch stock so the next
      // form (and the Stock screens) read fresh figures.
      dispatch(
        baseApi.util.invalidateTags([
          { type: "Batch", id: "LIST" },
          { type: "Stock", id: "LIST" },
        ]),
      );
      validItems.forEach((it) => forgetBatchStock(it.productId));
      editingSale?.items?.forEach((it) => forgetBatchStock(it.productId));

      // Execute inventory stock reduction & payment in recording for new sales
      if (!isEdit) {
        // 1. Stock Reduction for every item sold
        for (const it of validItems) {
          adjustStock(it.productId, -Number(it.quantity), it.batch, {
            sku: it.sku,
            productName: it.productName,
            sellingPrice: it.unitPrice,
            costPrice: it.purchasePrice,
          });

          // The backend deducts invoice stock itself when the invoice is created in a stock-holding status
          // (syncInvoiceStock); a second OUTWARD adjustment here would deduct the same goods twice.
        }
        dispatch(
          baseApi.util.invalidateTags([
            { type: "Stock", id: "LIST" },
            { type: "Product", id: "LIST" },
          ]),
        );

        // 2. Payment In entry creation if payment received
        if (currentPaid > 0) {
          const newPaymentInRecord: SalePaymentIn = {
            id: `payin_${Date.now()}`,
            receiptNo: "",
            date:
              savedApiSale.saleDate || new Date().toISOString().split("T")[0],
            paymentDate:
              savedApiSale.saleDate || new Date().toISOString().split("T")[0],
            partyName: savedApiSale.customerName,
            customerId: savedApiSale.customerId,
            customerPhone: savedApiSale.customerPhone,
            customerCompany: savedApiSale.customerCompany,
            paymentType: normalizeCommercePaymentType(primaryPaymentMethod),
            paymentMethod: primaryPaymentMethod,
            amount: currentPaid,
            receivedAmount: currentPaid,
            invoiceId: savedApiSale.id,
            invoiceNo: savedApiSale.invoiceNo,
            referenceNo: savedApiSale.referenceNo || savedApiSale.invoiceNo,
            notes: `Payment received on creation of Invoice ${savedApiSale.invoiceNo}`,
            status: "Completed",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          let paymentFailed = false;
          let paymentFailureReason = "";
          let splitSaved = 0;
          const splitToRecord = isSplitMode ? activeSplitRows(splitRows) : [];
          try {
            const payInPayload: any = {
              date:
                savedApiSale.saleDate || new Date().toISOString().split("T")[0],
              partyName: savedApiSale.customerName,
              paymentType: normalizeCommercePaymentType(primaryPaymentMethod),
              receivedAmount: currentPaid,
              invoiceNo: savedApiSale.invoiceNo,
              referenceNo: savedApiSale.referenceNo || savedApiSale.invoiceNo,
              // receiptNo is left out on purpose: the server assigns it. Sending an empty string is
              // rejected by the API ("expected string to have >=1 characters").
              notes: `Payment received on creation of Invoice ${savedApiSale.invoiceNo}`,
            };
            if (UUID_REGEX.test(savedApiSale.customerId)) {
              payInPayload.customerId = savedApiSale.customerId;
            }
            if (UUID_REGEX.test(savedApiSale.id)) {
              payInPayload.invoiceId = savedApiSale.id;
            }
            if (isSplitMode) {
              // One receipt per split entry, sent one at a time and never retried: if one fails the rest are not sent.
              for (const row of splitToRecord) {
                const fields = splitRowToPaymentFields(
                  row,
                  savedApiSale.invoiceNo,
                );
                await commercePaymentInApi.createPaymentIn({
                  ...payInPayload,
                  paymentType: normalizeCommercePaymentType(fields.paymentType),
                  receivedAmount: fields.amount,
                  referenceNo: fields.referenceNo || payInPayload.referenceNo,
                  notes: fields.notes,
                });
                splitSaved += 1;
              }
            } else {
              await commercePaymentInApi.createPaymentIn(payInPayload);
            }
          } catch (payInErr) {
            console.warn(
              "commercePaymentInApi.createPaymentIn notice:",
              payInErr,
            );
            paymentFailed = true;
            paymentFailureReason = getApiErrorMessage(payInErr, "");
          }

          // The backend owns the receipt and the customer's paid total. A local copy with an empty receipt
          // number would show up as a phantom receipt (and add the amount again to the local customer
          // balance), so it is only kept for local-only invoices that never reached the server.
          if (!UUID_REGEX.test(savedApiSale.id)) {
            savePaymentIn(newPaymentInRecord);
          }
          dispatch(
            baseApi.util.invalidateTags([
              { type: "PaymentIn", id: "LIST" },
              { type: "SalesInvoice", id: "LIST" },
              { type: "Customer", id: "LIST" },
            ]),
          );

          if (paymentFailed) {
            toast.warning(
              `Invoice ${savedApiSale.invoiceNo} was generated, but ${isSplitMode ? `only ${splitSaved} of ${splitToRecord.length} split payments were recorded` : "the initial payment could not be recorded"}${paymentFailureReason ? `: ${paymentFailureReason}` : "."} You can add the payment from the invoice without re-creating it.`,
              { duration: 8000 },
            );
          }
        }

        // 3. Upstream document lineage synchronization
        const srcInfo = convertSourceRef.current;
        const refNo = (formData.referenceNo || srcInfo?.sourceNo || "").trim();
        const srcType = srcInfo?.sourceType;
        const srcId = srcInfo?.sourceId;

        // A. Originating from Estimate / Quotation
        if (
          srcType === "Estimate" ||
          srcType === "Quotation" ||
          refNo.startsWith("EST-") ||
          refNo.startsWith("QT-")
        ) {
          const quotId = srcId || "";
          const quotNo = srcInfo?.sourceNo || refNo;

          // 1. Update quotation status in backend API
          if (quotId && UUID_REGEX.test(quotId)) {
            try {
              await quotationApi.updateStatus(quotId, { status: "Converted" });
            } catch (quotErr) {
              console.warn("Backend quotation status update notice:", quotErr);
            }
          }

          // 2. Update quotation in memory store
          try {
            updateQuotationStatus(quotId || quotNo, "Converted");
          } catch (stErr) {
            console.warn("Store updateQuotationStatus notice:", stErr);
          }

          // 3. Dispatch storage sync event
          syncQuotationStatusInStorage(quotId || quotNo, "Converted", {
            type: "Invoice",
            documentNo: savedApiSale.invoiceNo,
            id: savedApiSale.id,
          });

          // 4. Record cross-module document conversion lineage
          recordDocumentConversion({
            fromType: "Estimate",
            fromId: quotId || undefined,
            fromNo: quotNo || undefined,
            toType: "Invoice",
            toId: savedApiSale.id,
            toNo: savedApiSale.invoiceNo,
            partyName: savedApiSale.customerName,
            customerId: savedApiSale.customerId,
            grandTotal: savedApiSale.grandTotal,
          });

          // 5. Invalidate RTK cache
          dispatch(
            baseApi.util.invalidateTags([
              { type: "Estimation", id: "LIST" },
              ...(quotId && UUID_REGEX.test(quotId)
                ? [{ type: "Estimation" as const, id: quotId }]
                : []),
              { type: "SalesInvoice", id: "LIST" },
            ]),
          );
        }

        // B. Originating from Sale Order
        if (srcType === "Order" || refNo.startsWith("SO-")) {
          const orderId = srcId || "";
          const orderNo = srcInfo?.sourceNo || refNo;
          if (orderId && UUID_REGEX.test(orderId)) {
            try {
              await commerceSaleOrderApi.updateStatus(orderId, "Converted");
            } catch (soErr) {
              console.warn("Backend order status update notice:", soErr);
            }
          }
          syncOrderStatusInStorage(orderId || orderNo, "Converted", {
            type: "Invoice",
            documentNo: savedApiSale.invoiceNo,
            id: savedApiSale.id,
          });
          recordDocumentConversion({
            fromType: "Order",
            fromId: orderId || undefined,
            fromNo: orderNo || undefined,
            toType: "Invoice",
            toId: savedApiSale.id,
            toNo: savedApiSale.invoiceNo,
            partyName: savedApiSale.customerName,
            customerId: savedApiSale.customerId,
            grandTotal: savedApiSale.grandTotal,
          });
          dispatch(
            baseApi.util.invalidateTags([
              { type: "SaleOrder", id: "LIST" },
              ...(orderId && UUID_REGEX.test(orderId)
                ? [{ type: "SaleOrder" as const, id: orderId }]
                : []),
            ]),
          );
        }

        // C. Originating from Proforma Invoice
        if (srcType === "Proforma" || refNo.startsWith("PRO-")) {
          const proformaId = srcId || "";
          const proformaNo = srcInfo?.sourceNo || refNo;
          if (proformaId && UUID_REGEX.test(proformaId)) {
            try {
              await commerceProformaApi.updateStatus(proformaId, "Converted");
            } catch (pfErr) {
              console.warn("Backend proforma status update notice:", pfErr);
            }
          }
          syncProformaStatusInStorage(proformaId || proformaNo, "Converted", {
            type: "Invoice",
            documentNo: savedApiSale.invoiceNo,
            id: savedApiSale.id,
          });
          recordDocumentConversion({
            fromType: "Proforma",
            fromId: proformaId || undefined,
            fromNo: proformaNo || undefined,
            toType: "Invoice",
            toId: savedApiSale.id,
            toNo: savedApiSale.invoiceNo,
            partyName: savedApiSale.customerName,
            customerId: savedApiSale.customerId,
            grandTotal: savedApiSale.grandTotal,
          });
          dispatch(
            baseApi.util.invalidateTags([
              { type: "ProformaInvoice", id: "LIST" },
            ]),
          );
        }

        // D. Originating from Delivery Challan
        if (srcType === "Challan" || refNo.startsWith("DC-")) {
          const challanId = srcId || "";
          const challanNo = srcInfo?.sourceNo || refNo;
          // Mark the source delivery challan as Converted in the backend
          if (challanId && UUID_REGEX.test(challanId)) {
            try {
              await commerceDeliveryChallanApi.updateStatus(challanId, "Converted");
            } catch (dcErr) {
              console.warn("Backend challan status update notice:", dcErr);
            }
          }
          recordDocumentConversion({
            fromType: "Challan",
            fromId: challanId || undefined,
            fromNo: challanNo || undefined,
            toType: "Invoice",
            toId: savedApiSale.id,
            toNo: savedApiSale.invoiceNo,
            partyName: savedApiSale.customerName,
            customerId: savedApiSale.customerId,
            grandTotal: savedApiSale.grandTotal,
          });
          dispatch(
            baseApi.util.invalidateTags([
              { type: "DeliveryChallan", id: "LIST" },
              ...(challanId && UUID_REGEX.test(challanId)
                ? [{ type: "DeliveryChallan" as const, id: challanId }]
                : []),
            ]),
          );
        }

        // Clear conversion source ref
        convertSourceRef.current = null;
      }
      setIsFormModalOpen(false);
      setEditingSale(null);
      setSelectedSale(savedApiSale);

      toast.success(
        `Invoice ${savedApiSale.invoiceNo} ${isEdit ? "updated" : "generated"} successfully! Payment Status: ${savedApiSale.paymentStatus.toUpperCase()}`,
      );
      resetFormErrors();
      await fetchSalesInvoices();
      return true;
    } catch (err: any) {
      console.error("Failed to generate invoice:", err);
      // Entered values are kept; backend field errors are shown inline.
      handleInvoiceSaveError(
        err,
        "Failed to save the invoice. Please try again.",
      );
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  // Save Draft Sale Handler
  const handleSaveDraft = async (): Promise<boolean> => {
    const result = await saveGuard.runOnce(() => saveDraftInner());
    return result === true;
  };

  const saveDraftInner = async (): Promise<boolean> => {
    // Drafts do not deduct stock, so stock availability is not enforced here.
    lastCheckStockRef.current = false;
    const errs = validateInvoiceForm(
      formData,
      buildInvoiceValidationContext(false),
    );
    if (!validateAllFields(errs)) return false;

    const rawValidItems = formData.items.filter(
      (it) => it.productId || it.productName,
    );

    setIsActionLoading(true);
    try {
      const validItems: SaleProductItem[] = rawValidItems.map((it) => ({
        ...it,
        productId: resolveProductId(it) as string,
      }));

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
        salesInvoiceManualNo: (formData.salesInvoiceManualNo || "").trim() || undefined,
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
        createdBy: editingSale ? editingSale.createdBy : "",
        salesperson: formData.salesperson || editingSale?.salesperson || "",
        notes: formData.notes || undefined,
        createdAt: editingSale
          ? editingSale.createdAt
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Only send values the user actually entered (no silent defaults)
      const apiPayload = mapSaleTransactionToInvoicePayload({
        ...salePayload,
        dueDate: "",
        paymentTerms: "",
        shippingAddress: formData.shippingAddress || "",
        shippingCharges: Number(formData.shippingCharges) || (undefined as any),
        otherCharges: Number(formData.otherCharges) || (undefined as any),
      });

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
            invoiceNo: formData.invoiceNo || "",
          };
        }
      }

      saveSale(savedApiSale);
      setEditingSale(savedApiSale);
      setSelectedSale(savedApiSale);
      toast.success(
        `Draft invoice ${savedApiSale.invoiceNo} saved successfully!`,
      );
      resetFormErrors();
      await fetchSalesInvoices();
      return true;
    } catch (err: any) {
      console.error("Failed to save draft invoice:", err);
      handleInvoiceSaveError(
        err,
        "Failed to save the draft invoice. Please try again.",
      );
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  // Void / Cancel Invoice
  const handleCancelInvoice = async (sale: SaleTransaction) => {
    await cancelGuard.runOnce(() => cancelInvoiceInner(sale));
  };

  const cancelInvoiceInner = async (sale: SaleTransaction) => {
    if (!(sale?.id || "").trim()) {
      toast.error(
        "This invoice could not be identified. Please refresh the page and try again.",
      );
      return;
    }
    if (String(sale.saleStatus).toLowerCase() === "cancelled") {
      toast.warning(`Invoice ${sale.invoiceNo} is already cancelled.`);
      return;
    }
    setIsActionLoading(true);
    try {
      const cleanId = (sale.id || "").trim();
      if (
        cleanId &&
        !cleanId.startsWith("mock_") &&
        !cleanId.startsWith("local_")
      ) {
        await commerceInvoiceApi.updateStatus(cleanId, "Cancelled");
        // The backend posts the stock movement for the cancelled invoice: refresh stock figures.
        dispatch(
          baseApi.util.invalidateTags([
            { type: "Batch", id: "LIST" },
            { type: "Stock", id: "LIST" },
          ]),
        );
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
      toast.error(
        getApiErrorMessage(
          err,
          "Failed to cancel the invoice. Please try again.",
        ),
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete Invoice with confirmation modal
  const handleOpenDeleteModal = (sale: SaleTransaction) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setDeleteTargetSale(sale);
    setDeleteSaleError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteSale = async () => {
    await deleteGuard.runOnce(() => confirmDeleteSaleInner());
  };

  const confirmDeleteSaleInner = async () => {
    if (!deleteTargetSale) return;
    if (!(deleteTargetSale.id || "").trim()) {
      setDeleteSaleError(
        "This invoice could not be identified. Please refresh the page and try again.",
      );
      return;
    }
    setIsDeletingSale(true);
    setDeleteSaleError(null);
    try {
      const cleanId = (deleteTargetSale.id || "").trim();
      if (
        cleanId &&
        !cleanId.startsWith("mock_") &&
        !cleanId.startsWith("local_")
      ) {
        await commerceInvoiceApi.deleteInvoice(cleanId);
      }
      deleteSale(deleteTargetSale.id);
      setSalesList(
        sales.filter(
          (s) =>
            s.id !== deleteTargetSale.id &&
            s.invoiceNo !== deleteTargetSale.invoiceNo,
        ),
      );
      dispatch(
        baseApi.util.invalidateTags([
          { type: "SalesInvoice", id: deleteTargetSale.id },
          { type: "SalesInvoice", id: "LIST" },
          { type: "Customer", id: "LIST" },
          { type: "Batch", id: "LIST" },
          { type: "Stock", id: "LIST" },
          "Dashboard",
          "Collection",
        ]),
      );
      toast.success(
        `Invoice "${deleteTargetSale.invoiceNo}" deleted successfully.`,
      );
      setIsDeleteModalOpen(false);
      setDeleteTargetSale(null);
      await fetchSalesInvoices();
    } catch (err: any) {
      console.error("Failed to delete invoice:", err);
      const errMsg = getApiErrorMessage(
        err,
        "Failed to delete the invoice. Please try again.",
      );
      setDeleteSaleError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeletingSale(false);
    }
  };

  // General Save Sale Form Handler (legacy support for form submit)
  const handleSaveSale = async (
    mode: "draft" | "confirm" | "print" | "new",
  ) => {
    if (mode === "draft") {
      await handleSaveDraft();
      return;
    }
    // Only continue to print / new when validation passed and the invoice was actually saved.
    const saved = await handleGenerateInvoice();
    if (!saved) return;
    if (mode === "print") {
      setIsFormModalOpen(false);
      setIsInvoiceModalOpen(true);
      if (selectedSale) {
        handlePrintSaleInvoice(selectedSale);
      }
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
        salesInvoiceManualNo: (formData.salesInvoiceManualNo || "").trim() || undefined,
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
      storeSaveSale(targetSale);
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
        invoiceNo: formData.invoiceNo || "",
        salesInvoiceManualNo: (formData.salesInvoiceManualNo || "").trim() || undefined,
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
        createdBy: editingSale ? editingSale.createdBy : "",
        salesperson: formData.salesperson || editingSale?.salesperson || "",
        notes: formData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      storeSaveSale(targetSale);
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
    paymentFe.reset();
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
    // Row indices shift; errors are recomputed by useRevalidateAfterSubmit after a submit attempt.
    paymentFe.clearGroup("payment");
    setPaymentModalSplits((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaymentModalSplitChange = (
    index: number,
    field: keyof PaymentSplitItem,
    value: string | number,
  ) => {
    if (field === "amount" && selectedSale) {
      const due =
        selectedSale.balance !== undefined
          ? selectedSale.balance
          : Math.max(
              0,
              selectedSale.grandTotal - (selectedSale.paidAmount || 0),
            );
      const otherRows = paymentModalSplits.reduce(
        (acc, p, i) => (i === index ? acc : acc + (Number(p.amount) || 0)),
        0,
      );
      const room = Math.max(0, round2(due - otherRows));
      if (Number(value) > room + 0.005) {
        value = room;
        paymentFe.merge({
          [`payment.${index}.amount`]: `Payment cannot exceed the outstanding balance of ₹${due.toFixed(2)}.`,
        });
      } else {
        paymentFe.clearError(`payment.${index}.amount`);
      }
    }
    setPaymentModalSplits((prev) => {
      const newSplits = [...prev];
      newSplits[index] = { ...newSplits[index], [field]: value };
      return newSplits;
    });
  };

  // Confirm Payment: Records payment against the SAME invoice and updates payment status
  // Validates the Add Payment modal. Keys: payment.{i}.amount, payment.{i}.method, paymentDate, payments
  const validatePaymentModal = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!selectedSale) return errs;
    const balance =
      selectedSale.balance !== undefined
        ? selectedSale.balance
        : Math.max(0, selectedSale.grandTotal - (selectedSale.paidAmount || 0));

    if (String(selectedSale.saleStatus).toLowerCase() === "cancelled") {
      errs.payments =
        "Payments cannot be recorded against a cancelled invoice.";
      return errs;
    }

    let total = 0;
    paymentModalSplits.forEach((p, i) => {
      const n = parseNumericValue(p.amount);
      if (n === null) {
        if (String(p.amount ?? "").trim() !== "") {
          errs[`payment.${i}.amount`] =
            "Payment amount must be a valid number.";
        }
        return;
      }
      if (n < 0) {
        errs[`payment.${i}.amount`] = "Payment amount cannot be negative.";
        return;
      }
      if (n > 0) {
        total += n;
        if (!String(p.method || "").trim()) {
          errs[`payment.${i}.method`] = "Please select a payment mode.";
        }
      }
    });

    if (Object.keys(errs).length === 0) {
      if (total <= 0) {
        errs["payment.0.amount"] =
          "Please enter a payment amount greater than zero.";
      } else {
        const over = checkPaymentWithinBalance(total, balance);
        if (over) errs["payment.0.amount"] = over;
      }
    }

    const dateErr = checkRequiredDate(paymentModalDate, "payment date");
    if (dateErr) errs.paymentDate = dateErr;
    return errs;
  };

  useRevalidateAfterSubmit(paymentFe, () => validatePaymentModal(), [
    selectedSale,
    paymentModalSplits,
    paymentModalDate,
  ]);

  const handleConfirmPayment = async () => {
    await paymentGuard.runOnce(() => confirmPaymentInner());
  };

  const confirmPaymentInner = async () => {
    if (!selectedSale) return;
    if (!paymentFe.validateAll(validatePaymentModal())) return;
    const totalAllocated = paymentModalSplits.reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0,
    );

    const primaryMethod = paymentModalSplits[0]?.method || "Bank Transfer";
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const paymentDateStr = paymentModalDate || now.toISOString().split("T")[0];

    // Attempt to persist to backend via Commerce Payment-In API
    try {
      const isUuidInvoice = UUID_REGEX.test(selectedSale.id);
      const isUuidCust =
        selectedSale.customerId && UUID_REGEX.test(selectedSale.customerId);
      await commercePaymentInApi.createPaymentIn({
        partyName: selectedSale.customerName || "Customer",
        customerId: isUuidCust ? selectedSale.customerId : undefined,
        paymentType: normalizeCommercePaymentType(primaryMethod),
        receivedAmount: totalAllocated,
        invoiceId: isUuidInvoice ? selectedSale.id : undefined,
        invoiceNo: selectedSale.invoiceNo,
        date: paymentDateStr,
        notes:
          recordNotes ||
          `Payment received for Invoice ${selectedSale.invoiceNo}`,
      });
      dispatch(
        baseApi.util.invalidateTags([
          { type: "SalesInvoice", id: selectedSale.id },
          { type: "SalesInvoice", id: "LIST" },
          { type: "PaymentIn", id: "LIST" },
          { type: "Customer", id: "LIST" },
          "Dashboard",
          "Collection",
        ]),
      );
    } catch (apiErr: any) {
      console.warn("Backend payment recording notice:", apiErr);
      // A saved invoice must not show a payment that the server did not record: keep the modal open
      // with the entered values. Unsaved/local invoices keep the previous local-only behaviour.
      if (UUID_REGEX.test(selectedSale.id)) {
        const apiFieldErrs = extractApiFieldErrors(apiErr);
        const mapped: FieldErrors = {};
        Object.entries(apiFieldErrs).forEach(([k, v]) => {
          if (/amount/i.test(k)) mapped["payment.0.amount"] = v;
          else if (/date/i.test(k)) mapped.paymentDate = v;
          else if (/type|method/i.test(k)) mapped["payment.0.method"] = v;
        });
        if (Object.keys(mapped).length > 0) {
          setPaymentFormErrors(mapped);
          requestAnimationFrame(() => focusField(Object.keys(mapped)[0]));
        }
        toast.error(
          getApiErrorMessage(
            apiErr,
            "Failed to record the payment. Please try again.",
          ),
        );
        return;
      }
    }

    // Generate individual payment receipt records for this payment transaction
    const newRecords: SalePaymentRecord[] = paymentModalSplits
      .filter((p) => Number(p.amount) > 0)
      .map((p) => ({
        id: `local_pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        invoiceNo: selectedSale.invoiceNo,
        paymentDate: paymentDateStr,
        paymentTime: timeStr,
        method: p.method,
        referenceNo: p.referenceNo || "",
        amount: Number(p.amount),
        status: "Paid",
        recordedBy: "Org Super Administrator",
        notes: recordNotes || `Payment received via ${p.method}`,
        createdAt: now.toISOString(),
      }));

    // Shared session memory is updated for other screens, but this screen never displays from it:
    // the list is re-fetched from the API right after, and the open dialog mirrors the recorded payment.
    updateSalePayment(
      selectedSale.id,
      totalAllocated,
      primaryMethod,
      recordNotes,
      paymentModalSplits,
      newRecords,
    );

    const updatedSale = {
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
    await fetchSalesInvoices();
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

  // Submit-first validation for the two assign-rep forms.
  const validateAssignRep = (repId: string, key: string): FieldErrors =>
    repId
      ? {}
      : { [key]: "Please select a sales representative before saving." };
  useRevalidateAfterSubmit(
    assignFe,
    () => validateAssignRep(assignRepId, "assignRepId"),
    [assignRepId],
  );
  useRevalidateAfterSubmit(
    detailFe,
    () => validateAssignRep(detailRepId, "detailRepId"),
    [detailRepId],
  );
  useEffect(() => {
    assignFe.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAssignInvoiceModalOpen]);
  useEffect(() => {
    detailFe.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInvoiceModalOpen, selectedSale?.id]);

  // Open Quick Assign Modal from Table Row Action
  const handleOpenAssignInvoiceModal = (sale: SaleTransaction) => {
    setAssignInvoiceTarget(sale);
    assignFe.reset();
    const cust = customers.find((c) => c.id === sale.customerId);
    setAssignRepId(
      cust?.salesRepresentativeId || sale.salesRepresentativeId || "",
    );
    setAssignStatus(sale.collectionStatus || "Pending Follow-up");
    setAssignNextFollowUp(sale.nextFollowUpDate || "");
    setIsAssignInvoiceModalOpen(true);
  };

  // Assign the representative on the server (the same API the Customer screen uses). Returns true only when it was saved.
  const assignRepViaApi = async (
    customerId: string,
    repId: string,
  ): Promise<boolean> => {
    if (!customerId) return true;
    try {
      const res = await collectionApi.assignCustomer({
        customerId,
        salesRepresentativeId: repId,
        assignmentType: "Primary",
      });
      if (res && res.success === false)
        throw new Error(res.message || "The assignment was not saved");
      const assigned = salesRepresentatives.find((r) => r.id === repId);
      setCustomerList((prev) =>
        prev.map((c: any) =>
          c.id === customerId
            ? {
                ...c,
                salesRepresentativeId: repId,
                salesRepresentativeName:
                  assigned?.name || c.salesRepresentativeName,
              }
            : c,
        ),
      );
      return true;
    } catch (err: any) {
      toast.error("Could not assign the sales representative", {
        description:
          err?.response?.data?.error?.message ||
          err?.message ||
          "Please try again.",
      });
      return false;
    }
  };

  // Save Quick Assignment
  const handleSaveQuickAssignInvoice = async () => {
    if (!assignInvoiceTarget) return;
    if (!assignFe.validateAll(validateAssignRep(assignRepId, "assignRepId")))
      return;
    const cust = customers.find((c) => c.id === assignInvoiceTarget.customerId);
    if (!(await assignRepViaApi(assignInvoiceTarget.customerId, assignRepId)))
      return;
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
  const handleSaveDetailAssignment = async () => {
    if (!selectedSale) return;
    if (!detailFe.validateAll(validateAssignRep(detailRepId, "detailRepId")))
      return;
    const cust = customers.find((c) => c.id === selectedSale.customerId);
    if (!(await assignRepViaApi(selectedSale.customerId, detailRepId))) return;
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

    const excelRows = filteredSales.map((s, idx) => {
      const createdDt = formatDateTime(s.createdAt);
      const convertedAt = resolveDocumentConvertedAt("Invoice", s);
      const convertedDt = formatDateTime(convertedAt);
      return {
        srNo: idx + 1,
        invoiceNo: s.invoiceNo,
        date: s.saleDate,
        dueDate: s.dueDate || "-",
        createdDt: createdDt ? createdDt.full : "—",
        convertedDt: convertedDt ? convertedDt.full : "—",
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
      };
    });

    exportTableToExcel({
      filename: `Sales_Invoices_Report_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Sales Invoices",
      title: "YAA CREATIONS CRM - SALES INVOICES & ORDERS REPORT",
      subtitle: `Filter: ${appliedSaleStatus} | Total Invoices: ${filteredSales.length} | Generated: ${new Date().toLocaleDateString("en-GB")}`,
      columns: [
        { header: "#", key: "srNo", align: "center", width: 8 },
        { header: "Invoice No", key: "invoiceNo", align: "center", width: 16 },
        { header: "Sale Date", key: "date", align: "center", width: 14 },
        { header: "Due Date", key: "dueDate", align: "center", width: 14 },
        {
          header: "Created Date & Time",
          key: "createdDt",
          align: "center",
          width: 22,
        },
        {
          header: "Converted Date & Time",
          key: "convertedDt",
          align: "center",
          width: 22,
        },
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

    const printRows = filteredSales.map((s, idx) => {
      const createdDt = formatDateTime(s.createdAt);
      const convertedAt = resolveDocumentConvertedAt("Invoice", s);
      const convertedDt = formatDateTime(convertedAt);
      return {
        srNo: idx + 1,
        invoiceNo: s.invoiceNo,
        date: s.saleDate,
        dueDate: s.dueDate || "-",
        createdDt: createdDt ? createdDt.full : "—",
        convertedDt: convertedDt ? convertedDt.full : "—",
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
      };
    });

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
          header: "Created At",
          key: "createdDt",
          align: "center",
          width: "110px",
        },
        {
          header: "Converted At",
          key: "convertedDt",
          align: "center",
          width: "110px",
        },
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
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {editingSale ? "Edit Sale" : "New Sale"}
                </h1>
                {editingSale && formData.invoiceNo && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[#33077C] font-mono text-xs sm:text-[13px] bg-white px-2.5 py-0.5 rounded-md border border-purple-200/80 shadow-2xs">
                      #{formData.invoiceNo}
                    </span>
                  </div>
                )}
              </div>
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
                  <div {...fieldAttr("customer")}>
                    <CustomerSearchableSelect
                      value={formData.customerId}
                      onChange={(val, cust) => {
                        clearFormError("customer");
                        handleCustomerChange(val);
                        if (cust) {
                          setFormData((prev) => ({
                            ...prev,
                            customerName: cust.name,
                            customerCompany: cust.company || "",
                            customerPhone: cust.phone || "",
                            customerEmail: cust.email || "",
                            billingAddress:
                              cust.billingAddress || cust.address || "",
                          }));
                        }
                      }}
                      selectedCustomer={
                        formData.customerId
                          ? {
                              id: formData.customerId,
                              name: formData.customerName,
                              company: formData.customerCompany,
                              phone: formData.customerPhone,
                            }
                          : null
                      }
                      onAddNewCustomer={() => {
                        setIsAddCustomerModalOpen(true);
                      }}
                    />
                  </div>
                  <FormError message={formErrors.customer} />
                </div>

                {/* Row 1, Col 2: Customer Name */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => {
                      clearFormError("customer");
                      setFormData((prev) => ({
                        ...prev,
                        customerName: e.target.value,
                      }));
                    }}
                    required
                    placeholder="Customer Name"
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Row 1, Col 3: Invoice Number / Sale Number */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Invoice S.No.
                  </label>
                  <input
                    type="text"
                    value={
                      editingSale
                        ? formData.invoiceNo
                        : formData.invoiceNo || computedPreviewNo
                    }
                    readOnly
                    placeholder="Auto-generated on save"
                    className="w-full h-11 px-4 bg-purple-50/70 border border-purple-200/90 rounded-xl text-xs sm:text-[13px] font-bold text-[#33077C] font-mono outline-none cursor-default"
                  />
                </div>

                {/* Invoice No (manual entry) */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Invoice No
                  </label>
                  <input
                    type="text"
                    value={formData.salesInvoiceManualNo || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salesInvoiceManualNo: e.target.value,
                      })
                    }
                    placeholder="Enter Invoice No"
                    className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                  />
                </div>

                {/* Row 2, Col 2: Date */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Date
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={isoToDdmmyyyy(formData.saleDate)}
                      {...fieldAttr("saleDate")}
                      onChange={(e) => {
                        const iso = ddmmyyyyToIso(e.target.value);
                        clearFormError("saleDate");
                        clearFormError("dueDate");
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
                            clearFormError("saleDate");
                            clearFormError("dueDate");
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
                  <FormError message={formErrors.saleDate} />
                </div>

                {/* Row 2, Col 3: Expiry Date */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Expiry Date
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={isoToDdmmyyyy(formData.dueDate)}
                      {...fieldAttr("dueDate")}
                      onChange={(e) => {
                        const iso = ddmmyyyyToIso(e.target.value);
                        clearFormError("dueDate");
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
                            clearFormError("dueDate");
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
                  <FormError message={formErrors.dueDate} />
                </div>

                {/* Row 3, Col 1: Email Communications */}
                <div>
                  <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                    Email Communications
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
                    Address
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
                  <div className="overflow-x-auto min-h-[380px] pb-36">
                    <table className="w-full text-left text-xs table-fixed min-w-[1060px] border-collapse border border-slate-200">
                      <colgroup>
                        <col className="w-auto min-w-[240px]" />
                        <col className="w-[160px]" />
                        <col className="w-[85px]" />
                        <col className="w-[95px]" />
                        <col className="w-[110px]" />
                        <col className="w-[80px]" />
                        <col className="w-[110px]" />
                        <col className="w-[120px]" />
                        <col className="w-[70px]" />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#33077C] text-[11px] font-bold text-white tracking-wider uppercase">
                          <th
                            rowSpan={2}
                            className="py-3 px-5 text-left border border-[#33077C]/40 bg-[#33077C] text-white align-middle"
                          >
                            PROJECTS
                          </th>
                          <th
                            rowSpan={2}
                            className="py-3 px-3 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle"
                          >
                            BATCH NO
                          </th>
                          <th
                            rowSpan={2}
                            className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle"
                          >
                            QTY
                          </th>
                          <th
                            rowSpan={2}
                            className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle"
                          >
                            {formData.withGst ? "GST (%)" : "GST (0%)"}
                          </th>
                          <th
                            rowSpan={2}
                            className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle"
                          >
                            PRICE
                          </th>
                          <th
                            colSpan={2}
                            className="py-1.5 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white"
                          >
                            <span className="text-[11px] font-bold">
                              DISCOUNT
                            </span>
                          </th>
                          <th
                            rowSpan={2}
                            className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle"
                          >
                            TOTAL
                          </th>
                          <th
                            rowSpan={2}
                            className="py-3 px-2 text-center border border-[#33077C]/40 bg-[#33077C] text-white align-middle"
                          >
                            ACTION
                          </th>
                        </tr>
                        <tr className="bg-[#33077C] text-[10px] font-bold text-purple-200 tracking-wider uppercase">
                          <th className="py-1.5 px-1 text-center border border-[#33077C]/40 bg-[#33077C]">
                            %
                          </th>
                          <th className="py-1.5 px-2 text-center border border-[#33077C]/40 bg-[#33077C]">
                            AMOUNT
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {formData.items.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
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
                              {/* 1. Product Selection */}
                              <td className="px-4 py-3 align-top border border-slate-200 relative si-product-cell">
                                <div
                                  className="relative"
                                  ref={
                                    openProductDropdownRow === idx
                                      ? productDropdownRef
                                      : undefined
                                  }
                                >
                                  <div
                                    className={`w-full min-h-[38px] px-3 py-1.5 bg-white border rounded-xl flex items-center justify-between text-xs cursor-pointer transition-all ${
                                      openProductDropdownRow === idx
                                        ? "border-[#33077C] ring-2 ring-[#33077C]/10 bg-white"
                                        : item.productName
                                          ? "border-slate-300 hover:border-slate-400"
                                          : "border-slate-200 hover:border-slate-300"
                                    }`}
                                  >
                                    <input
                                      type="text"
                                      placeholder="Type or select product item..."
                                      value={item.productName || ""}
                                      {...fieldAttr(`items.${idx}.product`)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenProductDropdownRow(idx);
                                        setProductSearchQuery(
                                          item.productName || "",
                                        );
                                        if (productList.length === 0) {
                                          fetchLiveProducts();
                                        }
                                      }}
                                      onFocus={() => {
                                        setOpenProductDropdownRow(idx);
                                        setProductSearchQuery(
                                          item.productName || "",
                                        );
                                        if (productList.length === 0) {
                                          fetchLiveProducts();
                                        }
                                      }}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        handleItemProductNameChange(idx, val);
                                        setProductSearchQuery(val);
                                        setOpenProductDropdownRow(idx);
                                        if (productSearchTimerRef.current) {
                                          clearTimeout(
                                            productSearchTimerRef.current,
                                          );
                                        }
                                        if (val.trim()) {
                                          productSearchTimerRef.current =
                                            setTimeout(() => {
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
                                            setProductSearchQuery(
                                              item.productName || "",
                                            );
                                            if (productList.length === 0) {
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
                                      className="si-product-dropdown absolute left-0 top-full mt-1.5 w-[360px] sm:w-[420px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-purple-100 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100"
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
                                              if (
                                                productSearchTimerRef.current
                                              ) {
                                                clearTimeout(
                                                  productSearchTimerRef.current,
                                                );
                                              }
                                              if (val.trim().length >= 1) {
                                                productSearchTimerRef.current =
                                                  setTimeout(() => {
                                                    fetchLiveProducts(
                                                      val.trim(),
                                                    );
                                                  }, 300);
                                              }
                                            }}
                                            autoFocus
                                            className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                                          />
                                          {productSearchQuery && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setProductSearchQuery("")
                                              }
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
                                            handleItemProductChange(idx, "");
                                            setOpenProductDropdownRow(null);
                                          }}
                                          className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                            !item.productName
                                              ? "bg-purple-50 text-[#33077C] font-bold"
                                              : "hover:bg-slate-50 text-slate-600"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="text-slate-400 italic">
                                              None / Clear Product
                                            </span>
                                          </div>
                                          {!item.productName && (
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
                                              Try typing a different name,
                                              category, or SKU
                                            </p>
                                            {productSearchQuery.trim() && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setActiveItemRowIndex(idx);
                                                  setOpenProductDropdownRow(
                                                    null,
                                                  );
                                                  setIsAddItemModalOpen(true);
                                                }}
                                                className="mt-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#33077C] text-white text-[11px] font-bold hover:bg-[#4309A2] transition-colors"
                                              >
                                                <Plus className="w-3 h-3" />
                                                <span>
                                                  Add "
                                                  {productSearchQuery.trim()}"
                                                </span>
                                              </button>
                                            )}
                                          </div>
                                        ) : (
                                          matchingProducts.map((p: any) => {
                                            const isSelected =
                                              item.productId === p.id ||
                                              (item.productName &&
                                                item.productName === p.name);
                                            const imgUrl =
                                              p.imageUrl || p.image;
                                            const pName =
                                              p.name || p.productName || "";
                                            const pSku =
                                              p.sku || p.code || "PRD";
                                            const pCategory = p.category;
                                            const pUnit = p.unit || "Pcs";
                                            const pPrice = Number(
                                              p.price || p.unitPrice || 0,
                                            );

                                            return (
                                              <div
                                                key={p.id}
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
                                                        alt={pName}
                                                        className="w-full h-full object-cover"
                                                      />
                                                    ) : (
                                                      <span>
                                                        {getInitials(
                                                          pName,
                                                          "PR",
                                                        )}
                                                      </span>
                                                    )}
                                                  </div>

                                                  <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                      <span className="font-bold text-slate-900 truncate">
                                                        {pName}
                                                      </span>
                                                      {pCategory && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium truncate max-w-[120px]">
                                                          {pCategory}
                                                        </span>
                                                      )}
                                                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                        Active
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                                                      <span className="font-mono text-slate-600">
                                                        SKU: {pSku}
                                                      </span>
                                                      <ProductStockLabel
                                                        qty={p.stockQty}
                                                        unit={pUnit}
                                                      />
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
                                                    {pPrice.toLocaleString(
                                                      "en-IN",
                                                    )}
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
                                  <FormError
                                    message={formErrors[`items.${idx}.product`]}
                                  />
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
                                  // Batches of THIS product from the backend stock; the local product
                                  // list is only a fallback until the stock has loaded.
                                  const stockBatches = getStockBatches(
                                    item.productId,
                                  );
                                  const batches: any[] =
                                    stockBatches.length > 0
                                      ? stockBatches
                                      : prod?.batches || [];
                                  if (batches.length > 0) {
                                    const batchAvail = getBatchAvailable(
                                      item.productId,
                                      item.batch,
                                    );
                                    return (
                                      <>
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
                                        {batchAvail !== null && (
                                          <p className="mt-1 text-[10px] font-semibold text-slate-500 text-center">
                                            {batchAvail} in stock
                                          </p>
                                        )}
                                      </>
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
                                  {...fieldAttr(`items.${idx}.quantity`)}
                                  onKeyDown={handleNonNegativeKeyDown}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "quantity",
                                      Number(e.target.value),
                                    )
                                  }
                                  className={`w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-semibold text-center text-slate-800 focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all ${formErrors[`items.${idx}.quantity`] || liveStockErrors[`items.${idx}.quantity`] ? FORM_ERROR_INPUT_CLS : ""}`}
                                />
                                <FormError
                                  message={
                                    formErrors[`items.${idx}.quantity`] ||
                                    liveStockErrors[`items.${idx}.quantity`]
                                  }
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
                                  {...fieldAttr(`items.${idx}.taxPercent`)}
                                  onKeyDown={handleNonNegativeKeyDown}
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
                                <FormError
                                  message={
                                    formErrors[`items.${idx}.taxPercent`]
                                  }
                                />
                              </td>

                              {/* 4. PRICE */}
                              <td className="px-2 py-3.5 align-top border border-slate-200">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitPrice}
                                  {...fieldAttr(`items.${idx}.price`)}
                                  onKeyDown={handleNonNegativeKeyDown}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "unitPrice",
                                      Number(e.target.value),
                                    )
                                  }
                                  className={`w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-bold text-center text-slate-800 focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all ${formErrors[`items.${idx}.price`] ? FORM_ERROR_INPUT_CLS : ""}`}
                                />
                                <FormError
                                  message={formErrors[`items.${idx}.price`]}
                                />
                              </td>

                              {/* 5. DISCOUNT (%) */}
                              <td className="px-1.5 py-3.5 align-top border border-slate-200">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={
                                    item.discountPercent === 0
                                      ? ""
                                      : item.discountPercent || ""
                                  }
                                  {...fieldAttr(`items.${idx}.discountPercent`)}
                                  onKeyDown={handleNonNegativeKeyDown}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "discountPercent",
                                      Number(e.target.value),
                                    )
                                  }
                                  placeholder="0"
                                  className={`w-full h-10 px-1 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-semibold text-center text-slate-800 focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all ${formErrors[`items.${idx}.discountPercent`] ? FORM_ERROR_INPUT_CLS : ""}`}
                                />
                                <FormError
                                  message={
                                    formErrors[`items.${idx}.discountPercent`]
                                  }
                                />
                              </td>

                              {/* 6. DISCOUNT (AMOUNT) */}
                              <td className="px-1.5 py-3.5 align-top border border-slate-200">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={
                                    item.discountAmount === 0
                                      ? ""
                                      : item.discountAmount || ""
                                  }
                                  {...fieldAttr(`items.${idx}.discountAmount`)}
                                  onKeyDown={handleNonNegativeKeyDown}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      idx,
                                      "discountAmount",
                                      Number(e.target.value),
                                    )
                                  }
                                  placeholder="0.00"
                                  className={`w-full h-10 px-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] rounded-xl text-xs font-semibold text-center text-slate-800 focus:ring-3 focus:ring-[#4309A2]/10 outline-none shadow-2xs transition-all ${formErrors[`items.${idx}.discountAmount`] ? FORM_ERROR_INPUT_CLS : ""}`}
                                />
                                <FormError
                                  message={
                                    formErrors[`items.${idx}.discountAmount`]
                                  }
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
                  <div {...fieldAttr("items")}>
                    <FormError message={formErrors.items} />
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION: INVOICE SUMMARY & ACTION AREA */}
              <div className="pt-6 border-t border-slate-200/80 flex flex-col md:flex-row items-start justify-between gap-6">
                {/* LEFT CARD: Notes / Instructions & Details */}
                <div className="w-full md:w-1/2 space-y-4">
                  <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <label className="text-xs sm:text-sm font-bold text-slate-800 block">
                      Notes / Instructions
                    </label>
                    <textarea
                      rows={6}
                      value={formData.notes || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Carrier instructions, delivery address, customer notes..."
                      className="w-full p-3.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#33077C] focus:ring-4 focus:ring-[#33077C]/10 transition-all resize-none"
                    />
                  </div>

                  {/* Payment Terms & Tax Mode Info */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold">Taxation Mode:</span>
                      <span className="font-bold text-slate-800">
                        {formData.withGst
                          ? formData.gstType === "inter_state"
                            ? "With GST • Inter-State (IGST)"
                            : "With GST • Intra-State (CGST+SGST)"
                          : "Without GST (Exempt)"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold">Payment Terms:</span>
                      <span className="font-bold text-[#33077C]">
                        {formData.paymentTerms || "Net 15 Days"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT CARD: Billing Summary (Exact layout matching Image 1) */}
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
                      {/* 1. Sub Total & Discount & Amount (After Discount) */}
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center justify-between text-slate-600 font-medium">
                          <span>Sub Total:</span>
                          <span className="font-bold text-slate-900 text-sm">
                            ₹
                            {calculatedTotals.subtotal.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600 font-medium">
                          <span>Discount:</span>
                          <span
                            className={`font-bold text-sm ${
                              calculatedTotals.totalDiscount > 0
                                ? "text-rose-600"
                                : "text-slate-900"
                            }`}
                          >
                            {calculatedTotals.totalDiscount > 0
                              ? `-₹${calculatedTotals.totalDiscount.toLocaleString(
                                  "en-IN",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}`
                              : "₹0.00"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-700 font-semibold pt-2 border-t border-slate-100">
                          <span>Amount (After Discount):</span>
                          <span className="font-bold text-slate-900 text-sm">
                            ₹
                            {calculatedTotals.taxableAmount.toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </span>
                        </div>
                      </div>

                      {/* 2. CGST & SGST (or IGST) & Total GST */}
                      {formData.withGst ? (
                        <div className="pt-3 pb-1 border-t border-slate-100 space-y-2.5 text-sm">
                          {formData.gstType === "intra_state" ? (
                            <>
                              <div className="flex items-center justify-between text-slate-600 font-medium">
                                <span>CGST:</span>
                                <span className="font-bold text-slate-900">
                                  ₹
                                  {calculatedTotals.cgst.toLocaleString(
                                    "en-IN",
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
                                    "en-IN",
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
                                {calculatedTotals.igst.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-slate-800 font-bold pt-2 border-t border-dashed border-slate-200/80">
                            <span>Total GST:</span>
                            <span className="font-bold text-slate-900">
                              ₹
                              {calculatedTotals.totalTax.toLocaleString(
                                "en-IN",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-3 pb-1 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
                          <span>GST (Without GST):</span>
                          <span className="font-medium text-slate-500">
                            ₹0.00 (Exempt)
                          </span>
                        </div>
                      )}

                      {/* Freight / Shipping */}
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
                              formData.shippingCharges === 0
                                ? ""
                                : formData.shippingCharges
                            }
                            placeholder="0"
                            {...fieldAttr("shippingCharges")}
                            onKeyDown={handleNonNegativeKeyDown}
                            onChange={(e) => {
                              clearFormError("shippingCharges");
                              clearFormError("totals");
                              const raw = e.target.value.replace(
                                /[^0-9.]/g,
                                "",
                              );
                              if (raw === "") {
                                setFormData((prev) => ({
                                  ...prev,
                                  shippingCharges: 0,
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
                                shippingCharges: num,
                              }));
                            }}
                            className="w-28 h-9 text-right pl-6 pr-2.5 bg-white border-2 border-[#33077C] rounded-[6px] text-xs sm:text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#33077C]/20 shadow-2xs transition-all"
                          />
                        </div>
                      </div>
                      <FormError
                        message={formErrors.shippingCharges}
                        className="justify-end"
                      />

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
                          {calculatedTotals.grandTotal.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div {...fieldAttr("totals")}>
                        <FormError message={formErrors.totals} />
                      </div>

                      {/* 5. Paid Amount & Balance Due */}
                      <div className="pt-2 border-t border-slate-100 space-y-3">
                        {!editingSale && (
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-emerald-700">
                              Payment Received
                            </span>
                            <div
                              className="inline-flex rounded-lg border border-slate-200 overflow-hidden"
                              role="group"
                              aria-label="Payment mode"
                            >
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
                        )}

                        {isSplitMode && !editingSale ? (
                          <SplitPaymentSection
                            rows={splitRows}
                            onChange={setSplitRows}
                            summary={splitSummary}
                            alreadyPaid={0}
                            validation={splitValidation}
                            showErrors={splitShowErrors}
                            disabled={isActionLoading}
                            extraError={formErrors.paidAmount}
                            methods={SALES_SPLIT_PAYMENT_METHODS}
                          />
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-emerald-700">
                                Paid Amount:
                              </span>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs">
                                  ₹
                                </span>
                                <input
                                  id="sales-invoice-paid-amount"
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    formData.paidAmount === 0
                                      ? ""
                                      : formData.paidAmount
                                  }
                                  placeholder="0"
                                  {...fieldAttr("paidAmount")}
                                  onKeyDown={handleNonNegativeKeyDown}
                                  onChange={(e) => {
                                    clearFormError("paidAmount");
                                    clearFormError("paymentMethod");
                                    clearFormError("totals");
                                    const raw = e.target.value.replace(
                                      /[^0-9.]/g,
                                      "",
                                    );
                                    if (raw === "") {
                                      setFormData((prev) => ({
                                        ...prev,
                                        paidAmount: 0,
                                        paymentSplits:
                                          prev.paymentSplits.length > 0
                                            ? [
                                                {
                                                  ...prev.paymentSplits[0],
                                                  amount: 0,
                                                },
                                              ]
                                            : [
                                                {
                                                  id: "ps_1",
                                                  method:
                                                    prev.paymentMethod ||
                                                    "Bank Transfer",
                                                  amount: 0,
                                                  referenceNo: "",
                                                },
                                              ],
                                      }));
                                      return;
                                    }
                                    const parts = raw.split(".");
                                    const clean =
                                      parts.length > 2
                                        ? `${parts[0]}.${parts.slice(1).join("")}`
                                        : raw;
                                    const cleanDecimals =
                                      parts.length === 2 && parts[1].length > 2
                                        ? `${parts[0]}.${parts[1].slice(0, 2)}`
                                        : clean;
                                    let newAmount = parseFloat(cleanDecimals);
                                    let typed = cleanDecimals;
                                    if (isNaN(newAmount) || newAmount < 0) {
                                      newAmount = 0;
                                    }
                                    // More than the invoice total cannot be paid: hold the amount at the total and say why, inline.
                                    const invoiceTotal =
                                      calculatedTotals.grandTotal;
                                    if (
                                      invoiceTotal > 0 &&
                                      newAmount > invoiceTotal + 0.005
                                    ) {
                                      newAmount = invoiceTotal;
                                      typed = String(invoiceTotal);
                                      mergeFormErrors({
                                        paidAmount: `Paid amount cannot exceed the invoice total of ₹${invoiceTotal.toFixed(2)}.`,
                                      });
                                    }
                                    setFormData((prev) => ({
                                      ...prev,
                                      paidAmount: typed.endsWith(".")
                                        ? (typed as any)
                                        : newAmount,
                                      paymentSplits:
                                        prev.paymentSplits.length > 0
                                          ? [
                                              {
                                                ...prev.paymentSplits[0],
                                                amount: newAmount,
                                              },
                                            ]
                                          : [
                                              {
                                                id: "ps_1",
                                                method:
                                                  prev.paymentMethod ||
                                                  "Bank Transfer",
                                                amount: newAmount,
                                                referenceNo: "",
                                              },
                                            ],
                                    }));
                                  }}
                                  onBlur={() => {
                                    const num = Math.max(
                                      0,
                                      parseFloat(String(formData.paidAmount)) ||
                                        0,
                                    );
                                    // Normalise only; over-payment is reported inline on submit.
                                    const clamped = num;
                                    setFormData((prev) => ({
                                      ...prev,
                                      paidAmount: clamped,
                                      paymentSplits:
                                        prev.paymentSplits.length > 0
                                          ? [
                                              {
                                                ...prev.paymentSplits[0],
                                                amount: clamped,
                                              },
                                            ]
                                          : [
                                              {
                                                id: "ps_1",
                                                method:
                                                  prev.paymentMethod ||
                                                  "Bank Transfer",
                                                amount: clamped,
                                                referenceNo: "",
                                              },
                                            ],
                                    }));
                                  }}
                                  className="w-32 h-8.5 text-right pl-6 pr-2.5 bg-white border-2 border-emerald-600 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-500/20 rounded-[6px] font-bold text-emerald-700 text-xs outline-none shadow-2xs transition-all"
                                />
                              </div>
                            </div>
                            <FormError
                              message={
                                formErrors.paidAmount ||
                                formErrors.paymentMethod
                              }
                              className="justify-end"
                            />
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
                            {calculatedTotals.balance.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Bar (with Cancel and Generate Invoice button ONLY - 3 buttons removed) */}
              <div className="pt-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-t border-slate-200">
                {/* Left side: Payment Status */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Payment Status:
                  </span>
                  {calculatedTotals.grandTotal === 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      UNPAID
                    </span>
                  ) : calculatedTotals.paid >= calculatedTotals.grandTotal ||
                    calculatedTotals.balance <= 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>PAID</span>
                    </span>
                  ) : calculatedTotals.paid > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>PARTIALLY PAID</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>UNPAID</span>
                    </span>
                  )}
                </div>

                {/* Right side: ONLY Cancel and Generate Invoice buttons! */}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
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
                    disabled={isActionLoading || saveGuard.isSubmitting}
                    className="h-11 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[2.5] text-white" />
                    )}
                    <span>Generate Invoice</span>
                  </button>
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
                icon={<Printer className="w-4 h-4 text-slate-600" />}
                onClick={handlePrintTableReport}
                className="hover:border-purple-300 transition-colors"
              >
                Print Report
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
                  {cardSummary.totalSalesAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {cardSummary.totalCount} total orders
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
                  {cardSummary.todayAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-emerald-600 font-medium mt-0.5">
                  {cardSummary.todayCount} generated today
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
                  {cardSummary.pendingPaymentsAmount.toLocaleString("en-IN", {
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
                  {cardSummary.completedCount}
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
                  {cardSummary.cancelledCount}
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
              const trimmed = pendingSearch.trim();
              const isSame =
                appliedSearch === trimmed &&
                appliedSaleStatus === pendingSaleStatus &&
                appliedPaymentStatus === pendingPaymentStatus &&
                appliedCustomer === pendingCustomer &&
                appliedSalesRep === pendingSalesRep &&
                currentPage === 1;

              setAppliedSearch(trimmed);
              setAppliedSaleStatus(pendingSaleStatus);
              setAppliedPaymentStatus(pendingPaymentStatus);
              setAppliedCustomer(pendingCustomer);
              setAppliedSalesRep(pendingSalesRep);
              setCurrentPage(1);

              if (isSame) {
                isFetchingInvoicesRef.current = false;
                fetchSalesInvoices();
              }
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

              isFetchingInvoicesRef.current = false;
              fetchSalesInvoices({
                page: 1,
                search: "",
                saleStatus: "All",
                paymentStatus: "All",
                customer: "All",
              });
            }}
            filterSlot={
              <div className="flex items-center gap-2.5 flex-wrap">
                <FilterDropdown
                  placeholder="Sale Status : All"
                  value={pendingSaleStatus}
                  onChange={(val) => {
                    setPendingSaleStatus(val);
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
                      label: "Cancelled",
                      value: "Cancelled",
                      dotColor: "#ef4444",
                    },
                  ]}
                />

                <FilterDropdown
                  placeholder="Payment : All"
                  value={pendingPaymentStatus}
                  onChange={(val) => {
                    setPendingPaymentStatus(val);
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
                  value={pendingCustomer}
                  onChange={(val) => {
                    setPendingCustomer(val);
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
                  value={pendingSalesRep}
                  onChange={(val) => {
                    setPendingSalesRep(val);
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
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200 min-w-[1050px]">
                <CommonTableHead
                  columns={[
                    {
                      label: "INVOICE S.NO.",
                      align: "center",
                      minWidth: "140px",
                    },
                    { label: "CUSTOMER", align: "left", minWidth: "180px" },
                    {
                      label: "CREATED DATE & TIME",
                      align: "left",
                      minWidth: "150px",
                    },
                    {
                      label: "CONVERTED DATE & TIME",
                      align: "left",
                      minWidth: "150px",
                    },
                    { label: "ITEMS", align: "left", minWidth: "150px" },
                    {
                      label: "TOTAL AMOUNT",
                      align: "right",
                      minWidth: "130px",
                    },
                    {
                      label: "PAID / BALANCE",
                      align: "right",
                      minWidth: "140px",
                    },
                    { label: "PAYMENT", align: "center", minWidth: "110px" },
                    { label: "STATUS", align: "center", minWidth: "110px" },
                    { label: "ACTIONS", align: "center", minWidth: "130px" },
                  ]}
                />
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
                      const createdDt = formatDateTime(sale.createdAt);
                      const convertedAt = resolveDocumentConvertedAt(
                        "Invoice",
                        sale,
                      );
                      const convertedDt = formatDateTime(convertedAt);
                      const resolvedCustomerCode =
                        sale.customerCode ||
                        customers.find(
                          (c) =>
                            (sale.customerId && c.id === sale.customerId) ||
                            (c.phone &&
                              sale.customerPhone &&
                              c.phone === sale.customerPhone) ||
                            (c.name &&
                              sale.customerName &&
                              c.name.trim().toLowerCase() ===
                                sale.customerName.trim().toLowerCase()),
                        )?.customerCode ||
                        customerList.find(
                          (c) =>
                            (sale.customerId && c.id === sale.customerId) ||
                            (c.phone &&
                              sale.customerPhone &&
                              c.phone === sale.customerPhone) ||
                            (c.name &&
                              sale.customerName &&
                              c.name.trim().toLowerCase() ===
                                sale.customerName.trim().toLowerCase()),
                        )?.customerCode ||
                        findDocumentLineage(sale.invoiceNo)?.customerCode ||
                        (sale.referenceNo
                          ? findDocumentLineage(sale.referenceNo)?.customerCode
                          : "") ||
                        "";

                      return (
                        <tr
                          key={sale.id}
                          className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans"
                        >
                          {/* 1. Invoice No. */}
                          <td className="py-3.5 px-3 font-bold text-slate-800 text-center border border-slate-200 whitespace-nowrap align-middle">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span
                                className="cursor-pointer hover:underline"
                                onClick={() => handleOpenViewInvoice(sale)}
                              >
                                {sale.invoiceNo}
                              </span>
                              <DocumentLineageBadges
                                docRef={sale.invoiceNo}
                                sourceDocNo={sale.referenceNo}
                                currentType="Invoice"
                                className="justify-center"
                              />
                            </div>
                          </td>

                          {/* 2. Customer */}
                          <td className="py-4 px-5 border border-slate-200 whitespace-nowrap align-middle">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-[#33077C]" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                                    {sale.customerName}
                                  </span>
                                  {resolvedCustomerCode && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-[#33077C] border border-purple-200/80">
                                      {resolvedCustomerCode}
                                    </span>
                                  )}
                                </div>
                                {sale.customerCompany && (
                                  <span className="text-[10px] text-slate-400 font-medium block">
                                    {sale.customerCompany}
                                  </span>
                                )}
                                {sale.customerPhone && (
                                  <div>
                                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold font-mono tracking-tight"><Phone className="w-3 h-3 text-[#33077C] shrink-0" />{sale.customerPhone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* CREATED DATE & TIME */}
                          <td className="py-4 px-4 border border-slate-200 whitespace-nowrap align-middle">
                            {createdDt ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800 text-xs sm:text-[13px]">
                                  {createdDt.date}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{createdDt.time}</span>
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>

                          {/* CONVERTED DATE & TIME */}
                          <td className="py-4 px-4 border border-slate-200 whitespace-nowrap align-middle">
                            {convertedDt ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-emerald-800 text-xs sm:text-[13px]">
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
                          <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap align-middle min-w-[130px] w-36">
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
                          <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap align-middle min-w-[130px] w-36">
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

                          {/* 9. Actions */}
                          <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap align-middle min-w-[130px] w-36">
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
                                    label: "Duplicate",
                                    variant: "duplicate",
                                    onClick: () => handleDuplicateSale(sale),
                                  },
                                  {
                                    label: "Print Invoice",
                                    variant: "print",
                                    onClick: () => handlePrintSaleInvoice(sale),
                                  },
                                  {
                                    label: "Download Invoice",
                                    variant: "download",
                                    onClick: () =>
                                      handleDownloadSaleInvoice(sale),
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
                                    label: "Receive Payment",
                                    variant: "payment",
                                    disabled:
                                      sale.paymentStatus === "Paid" ||
                                      sale.balance <= 0,
                                    onClick: () => handleOpenAddPayment(sale),
                                  },
                                  {
                                    label: "Assign Sales Rep",
                                    variant: "assign",
                                    onClick: () =>
                                      handleOpenAssignInvoiceModal(sale),
                                  },
                                  {
                                    label: "Convert To Return",
                                    variant: "return",
                                    disabled: sale.saleStatus === "Cancelled",
                                    onClick: () => {
                                      navigate(
                                        "/sale-management/sales/return",
                                        {
                                          state: {
                                            invoiceNo: sale.invoiceNo,
                                            saleId: sale.id,
                                            customerName: sale.customerName,
                                            customerPhone: sale.customerPhone,
                                            amount: sale.grandTotal,
                                            items: sale.items,
                                          },
                                        },
                                      );
                                      toast.info(
                                        `Converting invoice ${sale.invoiceNo} to Sales Return`,
                                      );
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
                                    onClick: () => handleOpenDeleteModal(sale),
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
                <CommonTableHead
                  columns={[
                    { label: "#", align: "center", width: "45px" },
                    { label: "INVOICE #", align: "left", minWidth: "140px" },
                    {
                      label: "CUSTOMER NAME",
                      align: "left",
                      minWidth: "160px",
                    },
                    { label: "DATE", align: "left", minWidth: "120px" },
                    {
                      label: "PAYMENT METHOD",
                      align: "center",
                      minWidth: "140px",
                    },
                    {
                      label: "REFERENCE / TXN ID",
                      align: "left",
                      minWidth: "150px",
                    },
                    { label: "AMOUNT PAID", align: "right", minWidth: "130px" },
                    { label: "STATUS", align: "center", minWidth: "110px" },
                    { label: "ACTIONS", align: "center", minWidth: "90px" },
                  ]}
                />
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
                            {formatDate(log.date)}
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
            {filteredPaymentLogs.length > 0 && (
              <Pagination
                total={filteredPaymentLogs.length}
                currentPage={paymentLogPage}
                pageSize={paymentLogPageSize}
                pageSizeOptions={[5, 10, 20, 50]}
                onPageChange={(p) => setPaymentLogPage(p)}
                onPageSizeChange={(newSize) => {
                  setPaymentLogPageSize(newSize);
                  setPaymentLogPage(1);
                }}
              />
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
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsInvoiceModalOpen(false)}
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
                  onClick={() => {
                    if (selectedSale) {
                      handlePrintSaleInvoice(selectedSale);
                    } else {
                      window.print();
                    }
                  }}
                  className="h-9 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice</span>
                </button>
                <button
                  type="button"
                  disabled={isDownloadingPdf}
                  onClick={() => {
                    if (selectedSale) {
                      handleDownloadSaleInvoice(selectedSale);
                    }
                  }}
                  className="h-9 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[#EA580C]" />
                  <span>Download Invoice</span>
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
                  Date: {formatDate(selectedSale.saleDate)}
                </div>
                <div className="text-xs text-slate-500">
                  Due: {formatDate(selectedSale.dueDate)}
                </div>
              </div>
            </div>

            {/* Bill To & Ship To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
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
                            {formatDate(selectedSale.saleDate)}
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
                        {formatDate(selectedSale.saleDate)}
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
                    {...fieldAttr("detailRepId")}
                    onChange={(e) => {
                      setDetailRepId(e.target.value);
                    }}
                    className="w-full h-10 px-3 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C] outline-none"
                  >
                    <option value="">-- Select Sales Rep --</option>
                    {salesRepresentatives.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.status})
                      </option>
                    ))}
                  </select>
                  <FormError message={detailRepError} />
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
                {...fieldAttr("assignRepId")}
                onChange={(e) => {
                  setAssignRepId(e.target.value);
                }}
                className={FORM_SELECT_CLS}
              >
                <option value="">-- Select Sales Representative --</option>
                {salesRepresentatives.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.mobile}) - {r.status}
                  </option>
                ))}
              </select>
              <FormError message={assignRepError} />
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
                            {...fieldAttr(`payment.${sIdx}.method`)}
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
                          </select>
                          <FormError
                            message={
                              paymentFormErrors[`payment.${sIdx}.method`]
                            }
                          />
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
                              {...fieldAttr(`payment.${sIdx}.amount`)}
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
                    {paymentModalSplits.map((split, sIdx) => (
                      <FormError
                        key={`amt_err_${split.id || sIdx}`}
                        message={paymentFormErrors[`payment.${sIdx}.amount`]}
                      />
                    ))}
                    <FormError message={paymentFormErrors.payments} />
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
                        {...fieldAttr("paymentDate")}
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
                            if (e.target.value) {
                              setPaymentModalDate(e.target.value);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>
                    <FormError message={paymentFormErrors.paymentDate} />
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
                        {formatDate(selectedSale.saleDate)}
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
                disabled={paymentGuard.isSubmitting}
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
          ADD CUSTOMER & ADD ITEM MODALS
         ========================================== */}
      <AddCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onCustomerCreated={(newCust) => {
          dispatch(baseApi.util.invalidateTags(["Customer"]));
          hasLoadedCustomersRef.current = false;
          loadCustomersData();
          handleCustomerChange(newCust.id);
        }}
      />

      <AddItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => {
          setIsAddItemModalOpen(false);
          setActiveItemRowIndex(null);
        }}
        onProductCreated={(newProd) => {
          dispatch(baseApi.util.invalidateTags(["Product", "Stock", "Batch"]));
          const pId = newProd.id || (newProd as any).productId;
          const mapped = {
            id: pId,
            productId: pId,
            name:
              newProd.productName || (newProd as any).name || "Unnamed Product",
            productName:
              newProd.productName || (newProd as any).name || "Unnamed Product",
            code: newProd.productCode || (newProd as any).sku || pId,
            sku: newProd.productCode || (newProd as any).sku || pId,
            price: Number(newProd.salePrice ?? (newProd as any).unitPrice ?? 0),
            salePrice: Number(
              newProd.salePrice ?? (newProd as any).unitPrice ?? 0,
            ),
            unitPrice: Number(
              newProd.salePrice ?? (newProd as any).unitPrice ?? 0,
            ),
            cost: Number(newProd.purchasePrice ?? 0),
            unit: newProd.unit || "PCS",
            batches: newProd.batches || [],
            hsnCode: newProd.hsnCode || "",
            category: newProd.category || "General",
            imageUrl: (newProd as any).imageUrl || (newProd as any).image || "",
          };
          setProductList((prev) => [
            mapped,
            ...prev.filter((p) => p.id !== pId),
          ]);
          hasLoadedProductsRef.current = false;
          loadProductAndStockData();
          if (activeItemRowIndex !== null) {
            handleItemProductChange(activeItemRowIndex, pId);
          }
          setIsAddItemModalOpen(false);
          setActiveItemRowIndex(null);
        }}
      />

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
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsPaymentHistoryModalOpen(false)}
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
                            {formatDate(rec.paymentDate)}{" "}
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
                            {formatDate(selectedSale.saleDate)}
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
                          {formatDate(selectedSale.saleDate)}
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
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsPaymentDetailsModalOpen(false)}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
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
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs sm:text-[13px] font-bold shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Receipt</span>
              </button>

              <button
                type="button"
                disabled={isDownloadingPdf}
                onClick={() =>
                  handleDownloadPaymentReceipt(selectedPaymentRecord)
                }
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Receipt</span>
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingSale) {
            setIsDeleteModalOpen(false);
            setDeleteTargetSale(null);
            setDeleteSaleError(null);
          }
        }}
        onConfirm={handleConfirmDeleteSale}
        entityName="Sales Invoice"
        recordName={deleteTargetSale?.invoiceNo}
        isLoading={isDeletingSale}
        error={deleteSaleError}
      />
    </>
  );
};
