/**
 * Readers for backend-calculated financial values.
 *
 * The backend is the single source of truth for every financial calculation
 * (see BACKEND_CALCULATION_SPEC.md, sections 5.5 and 10.2). These helpers pull the
 * calculated fields out of an API line item / document response, tolerating the
 * alias names the different modules use, and return `undefined` for anything the
 * backend did not send so callers can fall back to a local derivation.
 */

/** First argument that is a finite number (numeric strings accepted), else undefined. */
export const pickNumber = (...candidates: unknown[]): number | undefined => {
  for (const c of candidates) {
    if (c === null || c === undefined || c === '') continue;
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

export interface CalculatedLineValues {
  grossAmount?: number;
  discountAmount?: number;
  taxableAmount?: number;
  taxAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  lineTotal?: number;
  isTaxInclusive?: boolean;
}

/** Backend line breakdown: { grossAmount, discountAmount, taxableAmount, taxAmount, cgst, sgst, igst, lineTotal }. */
export const readCalculatedLine = (it: any): CalculatedLineValues => ({
  grossAmount: pickNumber(it?.grossAmount, it?.gross),
  discountAmount: pickNumber(it?.discountAmount),
  taxableAmount: pickNumber(it?.taxableAmount, it?.taxable),
  taxAmount: pickNumber(it?.taxAmount),
  cgst: pickNumber(it?.cgst),
  sgst: pickNumber(it?.sgst),
  igst: pickNumber(it?.igst),
  lineTotal: pickNumber(it?.lineTotal, it?.totalAmount, it?.total),
  isTaxInclusive: typeof it?.isTaxInclusive === 'boolean' ? it.isTaxInclusive : undefined,
});

export type RoundMode = 'auto' | 'up' | 'down' | 'none';

export interface CalculatedDocumentValues {
  totalQty?: number;
  subtotal?: number;
  lineDiscountTotal?: number;
  overallDiscount?: number;
  totalDiscount?: number;
  /** "Amount (After Discount)" on the screens. */
  taxableAmount?: number;
  totalTax?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  shippingCharges?: number;
  otherCharges?: number;
  unroundedTotal?: number;
  roundOff?: number;
  roundMode?: RoundMode;
  grandTotal?: number;
  paidAmount?: number;
  balance?: number;
  paymentStatus?: string;
}

/** Backend document totals (spec 5.5 / 10.2). `balanceDue` and `balanceAmount` are accepted aliases of `balance`. */
export const readCalculatedTotals = (api: any): CalculatedDocumentValues => {
  const mode = typeof api?.roundMode === 'string' ? api.roundMode.toLowerCase() : undefined;
  return {
    totalQty: pickNumber(api?.totalQty),
    subtotal: pickNumber(api?.subtotal, api?.subTotal),
    lineDiscountTotal: pickNumber(api?.lineDiscountTotal),
    overallDiscount: pickNumber(api?.overallDiscount),
    totalDiscount: pickNumber(api?.totalDiscount),
    taxableAmount: pickNumber(api?.taxableAmount),
    totalTax: pickNumber(api?.totalTax, api?.taxAmount),
    cgst: pickNumber(api?.cgst),
    sgst: pickNumber(api?.sgst),
    igst: pickNumber(api?.igst),
    shippingCharges: pickNumber(api?.shippingCharges),
    otherCharges: pickNumber(api?.otherCharges),
    unroundedTotal: pickNumber(api?.unroundedTotal),
    roundOff: pickNumber(api?.roundOff),
    roundMode: mode === 'auto' || mode === 'up' || mode === 'down' || mode === 'none' ? mode : undefined,
    grandTotal: pickNumber(api?.grandTotal, api?.amount),
    paidAmount: pickNumber(api?.paidAmount),
    balance: pickNumber(api?.balanceDue, api?.balanceAmount, api?.balance),
    paymentStatus: typeof api?.paymentStatus === 'string' ? api.paymentStatus : undefined,
  };
};

/** Only the defined entries, so spreading never overwrites a value with `undefined`. */
export const definedOnly = <T extends object>(obj: T): Partial<T> => {
  const out: Partial<T> = {};
  (Object.keys(obj) as (keyof T)[]).forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
};

/**
 * Overlays the backend line breakdown on a mapped UI line item. Backend values win over the
 * locally derived ones; anything the backend did not send keeps the mapper's own value.
 */
export const withCalculatedLine = <
  T extends { total: number; discountAmount?: number; taxAmount?: number },
>(
  base: T,
  apiItem: any,
): T & CalculatedLineValues => {
  const c = readCalculatedLine(apiItem);
  return {
    ...base,
    total: c.lineTotal ?? base.total,
    discountAmount: c.discountAmount ?? base.discountAmount,
    taxAmount: c.taxAmount ?? base.taxAmount,
    ...definedOnly({
      grossAmount: c.grossAmount,
      taxableAmount: c.taxableAmount,
      cgst: c.cgst,
      sgst: c.sgst,
      igst: c.igst,
      isTaxInclusive: c.isTaxInclusive,
    }),
  };
};

/** Backend document totals that have no pre-existing UI field: spread these into a mapped document. */
export const readDocumentExtras = (api: any) => {
  const c = readCalculatedTotals(api);
  return definedOnly({
    totalQty: c.totalQty,
    lineDiscountTotal: c.lineDiscountTotal,
    taxableAmount: c.taxableAmount,
    unroundedTotal: c.unroundedTotal,
    roundMode: c.roundMode,
  });
};
