import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { parseNumericValue } from './validation';

/**
 * Shared form-validation layer for Sale Management forms that are NOT driven by React Hook Form
 * (large document forms with dynamic line items), plus helpers every form can reuse.
 *
 * Design rules
 *  - Every check returns `null` when valid, or a short, user-friendly sentence when invalid.
 *  - Checks never call APIs and never mutate anything.
 *  - Empty input is NEVER treated as zero: it is reported as "missing", separate from "invalid".
 *  - Numeric-format rules live in `./validation` (parseNumericValue, validPercentage, ...); this file
 *    composes them into business-level messages. React Hook Form / zod forms keep their schemas.
 */

// -----------------------------------------------------------------------------
// Formats
// -----------------------------------------------------------------------------

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PINCODE_PATTERN = /^\d{6}$/;
// Statutory Indian formats (GSTIN: 15 chars, PAN: 10 chars).
const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;

export const isUuid = (v?: string | null): boolean => !!v && UUID_PATTERN.test(v);
export const isValidEmail = (v?: string | null): boolean => !!v && EMAIL_PATTERN.test(v.trim());
export const isValidPincode = (v?: string | null): boolean => !!v && PINCODE_PATTERN.test(v.trim());
export const isValidGstin = (v?: string | null): boolean => !!v && GSTIN_PATTERN.test(v.trim().toUpperCase());
export const isValidPan = (v?: string | null): boolean => !!v && PAN_PATTERN.test(v.trim().toUpperCase());

const isBlank = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/** "Supplier Name" -> "supplier name" for use inside a sentence. */
const lower = (label: string) =>
  // Keep acronyms intact ("GST percentage", "GSTIN"): only lower-case a normal capitalised word.
  /^[A-Z]{2,}/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1);
const upperFirst = (label: string) => label.charAt(0).toUpperCase() + label.slice(1);

// -----------------------------------------------------------------------------
// Text / selection checks
// -----------------------------------------------------------------------------

/** Required free-text field. `label` is lower-case noun phrase: "supplier name". */
export const checkRequiredText = (value: unknown, label: string, minLength = 1): string | null => {
  if (isBlank(value)) return `Please enter the ${lower(label)}.`;
  if (minLength > 1 && String(value).trim().length < minLength) {
    return `The ${lower(label)} must be at least ${minLength} characters.`;
  }
  return null;
};

/** Required dropdown / lookup. `label`: "product", "customer", "supplier". */
export const checkRequiredSelection = (value: unknown, label: string): string | null =>
  isBlank(value) ? `Please select a ${lower(label)} before continuing.` : null;

/** Selection that must resolve to a real record id (UUID) from the API, not free text. */
export const checkRecordId = (id: unknown, label: string): string | null => {
  if (isBlank(id)) return `Please select a ${lower(label)} before continuing.`;
  if (!isUuid(String(id))) return `Please choose the ${lower(label)} from the list.`;
  return null;
};

export const checkEmail = (value: unknown, required = false): string | null => {
  if (isBlank(value)) return required ? 'Please enter the email address.' : null;
  return isValidEmail(String(value)) ? null : 'Please enter a valid email address.';
};

/** Uses the app's Indian mobile rule (10 digits starting 6-9, optional +91/0). */
export const checkPhone = (
  value: unknown,
  isValidPhone: (v?: string | null) => boolean,
  required = false,
): string | null => {
  if (isBlank(value)) return required ? 'Please enter the mobile number.' : null;
  return isValidPhone(String(value)) ? null : 'Please enter a valid 10-digit mobile number.';
};

export const checkGstin = (value: unknown): string | null =>
  isBlank(value) || isValidGstin(String(value)) ? null : 'Please enter a valid 15-character GSTIN.';

export const checkPan = (value: unknown): string | null =>
  isBlank(value) || isValidPan(String(value)) ? null : 'Please enter a valid 10-character PAN.';

export const checkPincode = (value: unknown, required = false): string | null => {
  if (isBlank(value)) return required ? 'Please enter the pincode.' : null;
  return isValidPincode(String(value)) ? null : 'Please enter a valid 6-digit pincode.';
};

// -----------------------------------------------------------------------------
// Numeric checks (empty != 0)
// -----------------------------------------------------------------------------

interface NumberCheckOptions {
  /** Allow 0 as a legitimate value (e.g. free items, opening balance). Default false. */
  allowZero?: boolean;
  /** Allow negative numbers (round-off, adjustments). Default false. */
  allowNegative?: boolean;
  min?: number;
  max?: number;
  maxDecimals?: number;
  /** Field is optional: blank passes. Default false (blank fails). */
  optional?: boolean;
}

/**
 * Generic numeric check. `label` is a noun phrase, e.g. "quantity", "unit price".
 * Returns a sentence such as "Quantity must be greater than zero."
 */
export const checkNumber = (value: unknown, label: string, opts: NumberCheckOptions = {}): string | null => {
  const { allowZero = false, allowNegative = false, min, max, maxDecimals, optional = false } = opts;
  if (isBlank(value)) return optional ? null : `Please enter the ${lower(label)}.`;

  const n = parseNumericValue(value);
  if (n === null) return `${upperFirst(label)} must be a valid number.`;

  if (!allowNegative && n < 0) return `${upperFirst(label)} cannot be negative.`;
  if (!allowZero && !allowNegative && n === 0) return `${upperFirst(label)} must be greater than zero.`;
  if (!allowZero && allowNegative && n === 0) return `${upperFirst(label)} cannot be zero.`;
  if (min !== undefined && n < min) return `${upperFirst(label)} must be at least ${min}.`;
  if (max !== undefined && n > max) return `${upperFirst(label)} cannot exceed ${max}.`;

  if (maxDecimals !== undefined) {
    const parts = String(value).trim().split('.');
    if (parts.length === 2 && parts[1].length > maxDecimals) {
      return `${upperFirst(label)} can have at most ${maxDecimals} decimal places.`;
    }
  }
  return null;
};

/** Quantity: > 0 (or >= 0 with allowZero), optional integer-only for countable units. */
export const checkQuantity = (
  value: unknown,
  opts: { label?: string; allowZero?: boolean; integerOnly?: boolean; max?: number; maxDecimals?: number } = {},
): string | null => {
  const { label = 'quantity', allowZero = false, integerOnly = false, max, maxDecimals } = opts;
  if (isBlank(value)) return `Please enter a ${lower(label)} greater than zero.`;
  const err = checkNumber(value, label, { allowZero, max, maxDecimals: integerOnly ? 0 : maxDecimals });
  if (err) {
    if (err.endsWith('must be greater than zero.')) return `Please enter a ${lower(label)} greater than zero.`;
    if (integerOnly && err.includes('decimal places')) return `${upperFirst(label)} must be a whole number.`;
    return err;
  }
  return null;
};

export const checkMoney = (value: unknown, label: string, opts: { allowZero?: boolean; optional?: boolean; max?: number } = {}): string | null =>
  checkNumber(value, label, { allowZero: opts.allowZero, optional: opts.optional, max: opts.max, maxDecimals: 2 });

/** Percentage 0-100. `label`: "GST percentage", "discount percentage". */
export const checkPercent = (value: unknown, label: string, opts: { optional?: boolean } = {}): string | null => {
  if (isBlank(value)) return opts.optional ? null : `Please enter the ${lower(label)}.`;
  const n = parseNumericValue(value);
  if (n === null || n < 0 || n > 100) return `Please enter a valid ${lower(label)} between 0 and 100.`;
  return null;
};

// -----------------------------------------------------------------------------
// Dates
// -----------------------------------------------------------------------------

const toTime = (v?: string | null): number | null => {
  if (!v) return null;
  const t = new Date(v.includes('T') ? v : `${v}T00:00:00`).getTime();
  return isNaN(t) ? null : t;
};

export const checkRequiredDate = (value: unknown, label: string): string | null => {
  if (isBlank(value)) return `Please select the ${lower(label)}.`;
  return toTime(String(value)) === null ? `Please enter a valid ${lower(label)}.` : null;
};

/** `later` must not be earlier than `earlier`. Blank values are skipped (use checkRequiredDate for required). */
export const checkDateNotBefore = (
  later: string | null | undefined,
  earlier: string | null | undefined,
  laterLabel: string,
  earlierLabel: string,
): string | null => {
  const a = toTime(later);
  const b = toTime(earlier);
  if (a === null || b === null) return null;
  return a < b ? `The ${lower(laterLabel)} cannot be earlier than the ${lower(earlierLabel)}.` : null;
};

// -----------------------------------------------------------------------------
// Financial checks
// -----------------------------------------------------------------------------

/** Payment must not exceed the payable / outstanding balance. */
export const checkPaymentWithinBalance = (
  amount: unknown,
  balance: number | null | undefined,
  label = 'Payment amount',
): string | null => {
  const n = parseNumericValue(amount);
  if (n === null || balance === null || balance === undefined) return null;
  // one paisa of rounding slack
  return n > balance + 0.005 ? `${upperFirst(label)} cannot exceed the outstanding balance of ₹${balance.toFixed(2)}.` : null;
};

/** Message shown when a quantity is above what one batch holds. */
export const batchStockMessage = (available: number): string =>
  `Only ${available} units are available in this batch. Please reduce the quantity.`;

/** Message shown when several rows using the same batch together exceed its stock. */
export const batchTotalStockMessage = (available: number): string =>
  `Total quantity for this batch exceeds the available stock of ${available} units.`;

/** Quantity requested must not exceed the stock of the selected batch. */
export const checkStockAvailable = (
  qty: unknown,
  available: number | null | undefined,
  _productName?: string,
): string | null => {
  const n = parseNumericValue(qty);
  if (n === null || available === null || available === undefined) return null;
  return n > available ? batchStockMessage(Math.max(0, available)) : null;
};

export interface BatchStockLine {
  id?: string;
  productId?: string;
  productName?: string;
  batch?: string;
  quantity?: unknown;
}

/**
 * Batch-wise stock check that treats the whole document as ONE demand on each batch.
 * Rows that use the same product + batch are added together, so splitting a quantity over several
 * rows cannot exceed the stock (e.g. stock 100, rows 60 + 50 -> the second row is flagged).
 *
 *  - `getAvailable(line, index)` returns the batch stock from the backend, or null/undefined when it
 *    is unknown (unknown stock is never reported as an error).
 *  - `credit(line, index)` (optional) is stock this same saved document already holds for the batch,
 *    used when editing so an unchanged quantity is not flagged against stock it already consumed.
 *    It is added once per product + batch.
 * Only rows that overflow are flagged, keyed `items.{index}.quantity`.
 */
export const validateBatchStock = (
  lines: BatchStockLine[],
  opts: {
    getAvailable: (line: BatchStockLine, index: number) => number | null | undefined;
    credit?: (line: BatchStockLine, index: number) => number | null | undefined;
  },
): FieldErrors => {
  const errors: FieldErrors = {};
  const usedByKey = new Map<string, number>();
  const creditByKey = new Map<string, number>();

  lines.forEach((line, index) => {
    const qty = parseNumericValue(line.quantity);
    const product = (line.productId || line.productName || "").toString().trim();
    const batch = (line.batch || "").toString().trim();
    if (!product || !batch || qty === null || qty <= 0) return; // other checks cover these

    const base = opts.getAvailable(line, index);
    if (base === null || base === undefined || !isFinite(base)) return;

    const key = `${product}|${batch}`;
    // Stock this saved document already holds for the batch is credited once per product + batch.
    if (opts.credit && !creditByKey.has(key)) {
      creditByKey.set(key, Math.max(0, Number(opts.credit(line, index)) || 0));
    }
    const available = base + (creditByKey.get(key) ?? 0);

    const usedBefore = usedByKey.get(key) ?? 0;
    if (usedBefore + qty > available + 1e-9) {
      errors[`items.${index}.quantity`] =
        usedBefore === 0
          ? batchStockMessage(Math.max(0, available))
          : batchTotalStockMessage(Math.max(0, available));
    }
    usedByKey.set(key, usedBefore + qty);
  });

  return errors;
};

/**
 * One price must not be greater than a reference price (e.g. wholesale / purchase price vs sale price).
 * Skipped while either value is blank or not a number (those are reported by the field's own check).
 */
export const checkNotGreaterThan = (
  value: unknown,
  limit: unknown,
  label: string,
  limitLabel: string,
): string | null => {
  const v = parseNumericValue(value);
  const l = parseNumericValue(limit);
  if (v === null || l === null) return null;
  return v > l + 0.005 ? `${upperFirst(label)} cannot be greater than the ${lower(limitLabel)} (₹${l}).` : null;
};

/** Discount amount cannot exceed the amount it applies to. */
export const checkDiscountWithinBase = (discountAmount: unknown, baseAmount: number): string | null => {
  const d = parseNumericValue(discountAmount);
  if (d === null) return null;
  if (d < 0) return 'Discount cannot be negative.';
  return d > baseAmount + 0.005 ? 'Discount cannot exceed the permitted amount.' : null;
};

/**
 * Verifies a computed total matches what is about to be submitted (guards against stale or tampered state).
 * `tolerance` should be roughly one paisa per rounded line.
 */
export const checkTotalConsistency = (
  expected: number,
  submitted: unknown,
  label = 'total',
  tolerance = 0.05,
): string | null => {
  const n = parseNumericValue(submitted);
  if (n === null) return `The ${lower(label)} is not a valid amount. Please review the items.`;
  return Math.abs(n - expected) > tolerance ? `The ${lower(label)} does not match the items. Please review the amounts.` : null;
};

/**
 * Intra-state vs inter-state GST consistency.
 * Intra-state: CGST + SGST (equal halves). Inter-state: IGST only. Exempt: no tax at all.
 */
export const checkGstSplit = (
  tax: { cgst?: number; sgst?: number; igst?: number; total: number },
  mode: 'intra' | 'inter' | 'exempt',
): string | null => {
  const cgst = tax.cgst ?? 0;
  const sgst = tax.sgst ?? 0;
  const igst = tax.igst ?? 0;
  const eps = 0.02;
  if (mode === 'exempt') return Math.abs(tax.total) > eps ? 'Tax cannot be charged on a tax-exempt transaction.' : null;
  if (mode === 'intra') {
    if (Math.abs(igst) > eps) return 'IGST cannot be applied to an intra-state transaction. Use CGST and SGST.';
    if (Math.abs(cgst + sgst - tax.total) > eps) return 'CGST and SGST must add up to the total tax.';
    return null;
  }
  if (Math.abs(cgst) > eps || Math.abs(sgst) > eps) return 'CGST and SGST cannot be applied to an inter-state transaction. Use IGST.';
  return Math.abs(igst - tax.total) > eps ? 'IGST must equal the total tax.' : null;
};

// -----------------------------------------------------------------------------
// Dynamic line items
// -----------------------------------------------------------------------------

export interface LineItemLike {
  productId?: string;
  productName?: string;
  quantity?: unknown;
  unitPrice?: unknown;
  purchasePrice?: unknown;
  salesPrice?: unknown;
  discountPercent?: unknown;
  discountAmount?: unknown;
  taxPercent?: unknown;
}

export interface LineItemRules {
  /** Which price field to validate. Default: first defined of unitPrice / purchasePrice / salesPrice. */
  priceKey?: 'unitPrice' | 'purchasePrice' | 'salesPrice';
  /** Product must resolve to a real record id (UUID). Default true. */
  requireProduct?: boolean;
  /** Price may be 0 (free item / sample). Default false. */
  allowZeroPrice?: boolean;
  integerQty?: boolean;
  /** Max stock lookup per line (e.g. for sales). Return undefined/null when unknown. */
  availableStock?: (item: LineItemLike, index: number) => number | null | undefined;
}

/**
 * Validates every line. Keys are `items.{index}.{field}` so they can be rendered next to the matching input.
 * Rows that are completely empty (no product and no quantity) are skipped, matching how forms drop blank rows.
 */
export const validateLineItems = (items: LineItemLike[], rules: LineItemRules = {}): FieldErrors => {
  const errors: FieldErrors = {};
  const { requireProduct = true, allowZeroPrice = false, integerQty = false } = rules;

  items.forEach((it, i) => {
    const untouched = isBlank(it.productId) && isBlank(it.productName) && isBlank(it.quantity);
    if (untouched) return;
    const key = (f: string) => `items.${i}.${f}`;

    if (requireProduct) {
      const e = isBlank(it.productId) && isBlank(it.productName)
        ? checkRequiredSelection('', 'product')
        : isBlank(it.productId) ? null : checkRecordId(it.productId, 'product');
      if (e) errors[key('product')] = e;
    } else if (isBlank(it.productName)) {
      errors[key('product')] = checkRequiredSelection('', 'product') as string;
    }

    const qErr = checkQuantity(it.quantity, { integerOnly: integerQty });
    if (qErr) errors[key('quantity')] = qErr;

    const priceKey = rules.priceKey ?? (['unitPrice', 'purchasePrice', 'salesPrice'] as const).find((k) => k in it) ?? 'unitPrice';
    const pErr = checkMoney((it as any)[priceKey], 'unit price', { allowZero: allowZeroPrice });
    if (pErr) errors[key('price')] = pErr;

    if (!isBlank(it.discountPercent)) {
      const e = checkPercent(it.discountPercent, 'discount percentage');
      if (e) errors[key('discountPercent')] = e;
    }
    if (!isBlank(it.taxPercent)) {
      const e = checkPercent(it.taxPercent, 'GST percentage');
      if (e) errors[key('taxPercent')] = e;
    }

    const qty = parseNumericValue(it.quantity);
    const price = parseNumericValue((it as any)[priceKey]);
    if (!isBlank(it.discountAmount) && qty !== null && price !== null) {
      const e = checkDiscountWithinBase(it.discountAmount, qty * price);
      if (e) errors[key('discountAmount')] = e;
    }

    if (rules.availableStock && !errors[key('quantity')]) {
      const e = checkStockAvailable(it.quantity, rules.availableStock(it, i), it.productName);
      if (e) errors[key('quantity')] = e;
    }
  });

  return errors;
};

/** Document needs at least one usable line. */
export const checkHasLineItems = (items: LineItemLike[]): string | null =>
  items.some((it) => !(isBlank(it.productId) && isBlank(it.productName) && isBlank(it.quantity)))
    ? null
    : 'Please add at least one item before saving.';

// -----------------------------------------------------------------------------
// Error state for non-RHF forms
// -----------------------------------------------------------------------------

export type FieldErrors = Record<string, string>;

/** Drops null results so a list of `[key, checkResult]` pairs can be turned into an error map. */
export const collectErrors = (checks: Array<[string, string | null | undefined]>): FieldErrors => {
  const out: FieldErrors = {};
  for (const [key, msg] of checks) if (msg) out[key] = msg;
  return out;
};

/**
 * Field-error state for forms that do not use React Hook Form.
 *
 * Behaviour (submit-first):
 *  - Nothing is shown while the form is untouched, and nothing is shown just because a field was
 *    focused or blurred. Errors appear only when the user attempts to submit.
 *  - `validateAll(errors)` : call in the submit handler; shows ALL errors at once and returns true
 *    when there are none. It also marks the form as "submit attempted".
 *  - After a submit attempt, pair the form with `useRevalidateAfterSubmit`: errors stay visible and
 *    are recomputed as values change, so a field clears only when it actually becomes valid.
 *  - `validateField` (kept for compatibility) is ignored until a submit has been attempted.
 *  - `reset()` : call when the form is opened or closed so the next opening starts clean.
 *  - Key `_form` is reserved for a form-level message that is not tied to one field.
 */
export const useFieldErrors = () => {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const submitAttemptedRef = useRef(false);
  // Set by useRevalidateAfterSubmit: when true, error clearing is handled by revalidation, so
  // change handlers calling clearError must not flash an error away that is still invalid.
  const liveRevalidationRef = useRef(false);

  const validateAll = useCallback((next: FieldErrors): boolean => {
    submitAttemptedRef.current = true;
    setSubmitAttempted(true);
    setErrors(next);
    const keys = Object.keys(next).filter((k) => k !== "_form");
    if (Object.keys(next).length === 0) return true;
    // Bring the first offending field into view and focus it.
    if (keys.length > 0) requestAnimationFrame(() => focusField(keys[0]));
    return false;
  }, []);

  const validateField = useCallback((key: string, message: string | null | undefined) => {
    if (!submitAttemptedRef.current) return; // never show errors just because a field was visited
    setErrors((prev) => {
      if (message) return prev[key] === message ? prev : { ...prev, [key]: message };
      if (!(key in prev)) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearError = useCallback((key: string) => {
    if (submitAttemptedRef.current && liveRevalidationRef.current) return;
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  /** Clear a whole group, e.g. all `items.` keys after rows are removed or reordered. */
  const clearGroup = useCallback((prefix: string) => {
    if (submitAttemptedRef.current && liveRevalidationRef.current) return;
    setErrors((prev) => {
      const keys = Object.keys(prev).filter((k) => k.startsWith(prefix));
      if (keys.length === 0) return prev;
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    submitAttemptedRef.current = false;
    setSubmitAttempted(false);
    setErrors({});
  }, []);
  const merge = useCallback((extra: FieldErrors) => setErrors((prev) => ({ ...prev, ...extra })), []);

  return {
    errors,
    setErrors,
    merge,
    validateAll,
    validateField,
    clearError,
    clearGroup,
    reset,
    submitAttempted,
    liveRevalidationRef,
    hasErrors: Object.keys(errors).length > 0,
  };
};

/**
 * Keeps errors in sync with the form AFTER the first submit attempt.
 * Pass the same pure validator the submit handler uses and the values it depends on:
 *
 *   const fe = useFieldErrors();
 *   useRevalidateAfterSubmit(fe, () => validateInvoiceForm(formData, ctx), [formData, ctx]);
 *
 * Before any submit attempt it does nothing (the form stays clean). After one, every change to
 * `deps` recomputes all errors, so existing errors stay until the field is valid and are removed
 * the moment it becomes valid. It runs in a layout effect so there is no flash of a stale error.
 */
export const useRevalidateAfterSubmit = (
  fe: { submitAttempted: boolean; setErrors: (e: FieldErrors) => void; liveRevalidationRef: { current: boolean } },
  compute: () => FieldErrors,
  deps: ReadonlyArray<unknown>,
) => {
  const computeRef = useRef(compute);
  computeRef.current = compute;

  useLayoutEffect(() => {
    fe.liveRevalidationRef.current = true;
    return () => {
      fe.liveRevalidationRef.current = false;
    };
  }, [fe.liveRevalidationRef]);

  useLayoutEffect(() => {
    if (fe.submitAttempted) fe.setErrors(computeRef.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fe.submitAttempted, ...deps]);
};

/**
 * Put `data-field="<key>"` on (or around) each input so the first error can be focused.
 * Example: <input {...fieldAttr('items.0.quantity')} />
 */
export const fieldAttr = (key: string) => ({ 'data-field': key });

export const focusField = (key: string) => {
  const el = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(key)}"]`);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const target = el.matches('input,select,textarea,button') ? el : el.querySelector<HTMLElement>('input,select,textarea,button');
  target?.focus({ preventScroll: true });
};

// -----------------------------------------------------------------------------
// Submission protection
// -----------------------------------------------------------------------------

/**
 * Prevents double submission (double-click, Enter + click, repeated Enter) independently of the
 * button's disabled state. The ref flips synchronously, so a second call in the same tick is dropped.
 *
 *   const { isSubmitting, runOnce } = useSubmitGuard();
 *   const onSave = () => runOnce(async () => { if (!validate()) return; await api.create(...); });
 */
export const useSubmitGuard = () => {
  const inFlight = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runOnce = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setIsSubmitting(true);
    try {
      return await fn();
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return { isSubmitting, runOnce };
};

// -----------------------------------------------------------------------------
// Backend errors
// -----------------------------------------------------------------------------

interface ApiFieldIssue {
  path?: Array<string | number> | string;
  field?: string;
  message?: string;
}

const readApiPayload = (err: any) => err?.response?.data ?? err?.data ?? null;

/**
 * Backend field errors, shaped like `{ error: { fields: [{ path: ['items', 0, 'quantity'], message }] } }`.
 * Returns a map keyed by dotted path (`items.0.quantity`). Callers map these keys to their form keys.
 */
export const extractApiFieldErrors = (err: any): FieldErrors => {
  const data = readApiPayload(err);
  const list: ApiFieldIssue[] | undefined = data?.error?.fields ?? data?.error?.details ?? data?.errors;
  const out: FieldErrors = {};
  if (!Array.isArray(list)) return out;
  for (const issue of list) {
    if (!issue || typeof issue !== 'object' || !issue.message) continue;
    const key = Array.isArray(issue.path) ? issue.path.join('.') : issue.path || issue.field;
    if (key && !(key in out)) out[String(key)] = String(issue.message);
  }
  return out;
};

const TECHNICAL_PATTERNS = [
  /status code \d{3}/i,
  /^axioserror/i,
  /network error/i,
  /timeout of \d+ms/i,
  /unexpected error occurred/i,
  /\b(stack|undefined|null reference|ECONN|ENOTFOUND|SQL|prisma|constraint)\b/i,
  /^(invalid input|validation failed|bad request|internal server error)$/i,
];

/**
 * Turns any thrown error into a message that is safe to show to a user.
 * Backend messages are kept when they read like sentences; raw HTTP / stack text is replaced by `fallback`.
 */
export const getApiErrorMessage = (err: any, fallback = 'Something went wrong. Please try again.'): string => {
  const status: number | undefined = err?.status ?? err?.response?.status;
  const data = readApiPayload(err);
  const raw: string | undefined = data?.error?.message || data?.message || err?.message;

  if (!err?.response && /network error|failed to fetch/i.test(String(err?.message || ''))) {
    return 'Unable to reach the server. Please check your connection and try again.';
  }
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The record could not be found. It may have been deleted.';
  if (status === 409 && (!raw || TECHNICAL_PATTERNS.some((p) => p.test(raw)))) {
    return 'This record already exists or was changed by someone else. Please refresh and try again.';
  }
  if (status && status >= 500) return fallback;

  if (raw && !TECHNICAL_PATTERNS.some((p) => p.test(raw))) {
    // The shared axios interceptor appends "(path: message)" details; keep the readable lead sentence.
    return raw.replace(/\s*\([^)]*:[^)]*\)\s*$/, '').trim() || fallback;
  }
  return fallback;
};
