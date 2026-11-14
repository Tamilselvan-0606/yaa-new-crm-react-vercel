import type {
  SaleProductItem,
  PaymentSplitItem,
} from "../../../../store/useSalesManagementStore";
import { calculateDocumentTotals } from "../../../../utils/financialCalculations";
import {
  FieldErrors,
  checkRequiredSelection,
  checkRequiredDate,
  checkDateNotBefore,
  checkNumber,
  checkPaymentWithinBalance,
  checkTotalConsistency,
  checkGstSplit,
  checkHasLineItems,
  validateLineItems,
  validateBatchStock,
} from "../../../../utils/formValidation";
import { parseNumericValue } from "../../../../utils/validation";

// -----------------------------------------------------------------------------
// Invoice form validation (pure, no API calls)
// -----------------------------------------------------------------------------
export interface InvoiceFormInput {
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

export interface InvoiceValidationContext {
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

export const isInvoiceRowBlank = (it: SaleProductItem) =>
  !it.productId && !it.productName;

/**
 * Validates the whole invoice form. Returns a map keyed by field:
 *   customer, saleDate, dueDate, items, items.{i}.{product|quantity|price|discountPercent|discountAmount|taxPercent},
 *   shippingCharges, otherCharges, overallDiscount, paidAmount, paymentMethod, totals
 */
export const validateInvoiceForm = (
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
export const mapInvoiceApiErrorKey = (path: string): string => {
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
