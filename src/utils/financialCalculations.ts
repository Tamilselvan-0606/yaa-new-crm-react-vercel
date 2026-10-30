/**
 * YAA CRM - Centralized Financial Calculation Engine & GST Auditor
 * 
 * Strict implementation of Indian GST statutory rules, multi-tax reconciliation,
 * pre-tax discount allocation, banking-standard 2-decimal rounding, and payment balance tracking.
 */

export interface LineItemFinancialInput {
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxPercent?: number;
  isTaxInclusive?: boolean;
}

export interface LineItemFinancialResult {
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  taxPercent: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

export interface DocumentFinancialParams {
  items: LineItemFinancialInput[];
  withGst?: boolean;
  gstType?: 'intra_state' | 'inter_state';
  overallDiscount?: number;
  shippingCharges?: number;
  otherCharges?: number;
  roundMode?: 'none' | 'up' | 'down' | 'auto';
  manualRoundOff?: number | null;
  paidAmount?: number;
  stateOfSupply?: string;
  companyStateCode?: string;
}

export interface DocumentFinancialResult {
  totalQty: number;
  subtotal: number; // Gross amount before any discounts
  lineDiscountTotal: number;
  overallDiscount: number;
  totalDiscount: number;
  taxableAmount: number; // Net taxable amount after all eligible discounts
  totalTax: number;
  cgst: number;
  sgst: number;
  igst: number;
  shippingCharges: number;
  otherCharges: number;
  unroundedTotal: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  items: LineItemFinancialResult[];
}

/**
 * 2-Decimal banker's/half-up rounding avoiding IEEE-754 floating point artifacts
 */
export const round2 = (num: number): number => {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * 4-Decimal rounding for intermediate rate calculations
 */
export const round4 = (num: number): number => {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 10000) / 10000;
};

export const safeNum = (val: any, fallback = 0): number => {
  if (val === null || val === undefined || val === '') return fallback;
  const parsed = Number(val);
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Auto-detects intra_state (CGST + SGST) vs inter_state (IGST) based on State of Supply.
 * Default company state is 33 (Tamil Nadu).
 */
export const determineGstType = (
  stateOfSupply?: string | null,
  companyStateCode = '33'
): 'intra_state' | 'inter_state' => {
  if (!stateOfSupply || !stateOfSupply.trim()) {
    return 'intra_state';
  }
  const clean = stateOfSupply.trim();
  // Extract 2-digit code prefix (e.g. '33-Tamil Nadu' -> '33', '29-Karnataka' -> '29')
  const match = clean.match(/^(\d{2})/);
  if (match) {
    const supplyCode = match[1];
    return supplyCode === companyStateCode ? 'intra_state' : 'inter_state';
  }
  if (clean.toLowerCase().includes('tamil nadu') || clean.toLowerCase() === 'tn') {
    return 'intra_state';
  }
  return 'inter_state';
};

/**
 * Safely parses string or number tax rates (e.g. 'GST@18%', '18%', 'GST@5%', 'Exempted' -> 18, 18, 5, 0)
 */
export const parseTaxRate = (rate: string | number | null | undefined, fallback = 18): number => {
  if (rate === null || rate === undefined || rate === '') return fallback;
  if (typeof rate === 'number') return isNaN(rate) ? fallback : Math.max(0, rate);
  const str = String(rate).trim();
  if (str.toLowerCase().includes('exempt') || str.toLowerCase().includes('nil') || str.toLowerCase().includes('zero')) {
    return 0;
  }
  const match = str.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const val = parseFloat(match[1]);
    return isNaN(val) ? fallback : Math.max(0, val);
  }
  return fallback;
};

/**
 * Calculates a single line item according to Indian GST & Accounting Standards.
 * 
 * Sequence:
 * 1. Gross line amount = Quantity × Unit Price.
 * 2. Line discount = Gross line amount × Discount Percentage / 100 (or fixed discount).
 * 3. Taxable line amount = Gross line amount - Line Discount.
 * 4. GST on taxable amount = Taxable line amount × Tax Rate / 100.
 * 5. Line total = Taxable line amount + GST (or Net Inclusive if isTaxInclusive).
 */
export const calculateLineItem = (
  item: LineItemFinancialInput,
  options?: {
    withGst?: boolean;
    gstType?: 'intra_state' | 'inter_state';
  }
): LineItemFinancialResult => {
  const qty = Math.max(0, safeNum(item.quantity));
  const unitPrice = Math.max(0, safeNum(item.unitPrice));
  const rawDiscPct = safeNum(item.discountPercent);
  const rawDiscAmt = safeNum(item.discountAmount);
  const taxPct = Math.max(0, safeNum(item.taxPercent));
  const isInclusive = Boolean(item.isTaxInclusive);
  const withGst = options?.withGst !== false;
  const gstType = options?.gstType || 'intra_state';

  const grossAmount = round2(qty * unitPrice);

  // Line Discount: Validate and clamp to [0, grossAmount]
  let discountAmount = 0;
  let discountPercent = 0;

  if (rawDiscAmt > 0) {
    discountAmount = Math.min(grossAmount, round2(rawDiscAmt));
    discountPercent = grossAmount > 0 ? round2((discountAmount / grossAmount) * 100) : 0;
  } else if (rawDiscPct > 0) {
    discountPercent = Math.min(100, Math.max(0, rawDiscPct));
    discountAmount = round2((grossAmount * discountPercent) / 100);
  }

  let taxableAmount = 0;
  let taxAmount = 0;
  let lineTotal = 0;

  if (isInclusive && withGst && taxPct > 0) {
    // GST-inclusive pricing:
    // Net Inclusive = Gross - Discount
    // Taxable Amount = Net Inclusive / (1 + Tax Rate / 100)
    // Tax Amount = Net Inclusive - Taxable Amount
    const netInclusive = Math.max(0, grossAmount - discountAmount);
    taxableAmount = round2(netInclusive / (1 + taxPct / 100));
    taxAmount = round2(netInclusive - taxableAmount);
    lineTotal = netInclusive;
  } else {
    // GST-exclusive pricing (standard):
    taxableAmount = Math.max(0, grossAmount - discountAmount);
    taxAmount = withGst && taxPct > 0 ? round2((taxableAmount * taxPct) / 100) : 0;
    lineTotal = round2(taxableAmount + taxAmount);
  }

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (withGst && taxAmount > 0) {
    if (gstType === 'intra_state') {
      cgst = round2(taxAmount / 2);
      sgst = round2(taxAmount - cgst); // Guarantees cgst + sgst === taxAmount
    } else {
      igst = taxAmount;
    }
  }

  return {
    quantity: qty,
    unitPrice,
    grossAmount,
    discountPercent,
    discountAmount,
    taxableAmount,
    taxPercent: taxPct,
    taxAmount,
    cgst,
    sgst,
    igst,
    lineTotal,
  };
};

/**
 * End-to-end document totals calculation:
 * Reconciles line items, document-level discounts, GST splits, additional charges,
 * rounding policies, paid amounts, and outstanding balance.
 */
export const calculateDocumentTotals = (
  params: DocumentFinancialParams
): DocumentFinancialResult => {
  const withGst = params.withGst !== false;
  const gstType =
    params.gstType ||
    (params.stateOfSupply
      ? determineGstType(params.stateOfSupply, params.companyStateCode || '33')
      : 'intra_state');

  // 1. Calculate each line item independently
  const calculatedLines: LineItemFinancialResult[] = (params.items || []).map((it) =>
    calculateLineItem(it, { withGst, gstType })
  );

  const totalQty = calculatedLines.reduce((acc, it) => acc + it.quantity, 0);
  const subtotal = round2(calculatedLines.reduce((acc, it) => acc + it.grossAmount, 0));
  const lineDiscountTotal = round2(calculatedLines.reduce((acc, it) => acc + it.discountAmount, 0));
  const unadjustedTaxable = round2(calculatedLines.reduce((acc, it) => acc + it.taxableAmount, 0));

  // 2. Document-level overall discount:
  // Must reduce taxable base before GST calculation if specified
  const requestedOverallDiscount = Math.max(0, safeNum(params.overallDiscount));
  const overallDiscount = Math.min(unadjustedTaxable, round2(requestedOverallDiscount));
  const totalDiscount = round2(lineDiscountTotal + overallDiscount);

  // If overall discount exists, allocate proportionately across lines
  let finalLines: LineItemFinancialResult[] = calculatedLines;
  let netTaxableAmount = unadjustedTaxable;
  let totalTax = 0;

  if (overallDiscount > 0 && unadjustedTaxable > 0) {
    let allocatedDiscSum = 0;
    finalLines = calculatedLines.map((line, idx) => {
      // Pro-rata discount share
      const share = idx === calculatedLines.length - 1
        ? round2(overallDiscount - allocatedDiscSum)
        : round2((line.taxableAmount / unadjustedTaxable) * overallDiscount);
      allocatedDiscSum += share;

      const adjTaxable = Math.max(0, round2(line.taxableAmount - share));
      const adjTax = withGst && line.taxPercent > 0 ? round2((adjTaxable * line.taxPercent) / 100) : 0;
      const cgst = gstType === 'intra_state' ? round2(adjTax / 2) : 0;
      const sgst = gstType === 'intra_state' ? round2(adjTax - cgst) : 0;
      const igst = gstType === 'inter_state' ? adjTax : 0;

      return {
        ...line,
        taxableAmount: adjTaxable,
        taxAmount: adjTax,
        cgst,
        sgst,
        igst,
        lineTotal: round2(adjTaxable + adjTax),
      };
    });

    netTaxableAmount = round2(finalLines.reduce((acc, it) => acc + it.taxableAmount, 0));
    totalTax = round2(finalLines.reduce((acc, it) => acc + it.taxAmount, 0));
  } else {
    totalTax = round2(calculatedLines.reduce((acc, it) => acc + it.taxAmount, 0));
  }

  // 3. GST Tax Breakdown
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (withGst && totalTax > 0) {
    if (gstType === 'intra_state') {
      cgst = round2(totalTax / 2);
      sgst = round2(totalTax - cgst); // Guaranteed cgst + sgst === totalTax
    } else {
      igst = totalTax;
    }
  }

  // 4. Additional Charges
  const shippingCharges = Math.max(0, round2(safeNum(params.shippingCharges)));
  const otherCharges = Math.max(0, round2(safeNum(params.otherCharges)));

  const unroundedTotal = round2(netTaxableAmount + totalTax + shippingCharges + otherCharges);

  // 5. Rounding Adjustment
  let roundOff = 0;
  let grandTotal = unroundedTotal;

  if (params.manualRoundOff !== null && params.manualRoundOff !== undefined && !isNaN(params.manualRoundOff)) {
    roundOff = round2(params.manualRoundOff);
    grandTotal = Math.max(0, round2(unroundedTotal + roundOff));
  } else {
    const mode = params.roundMode || 'none';
    if (mode === 'auto') {
      const roundedInt = Math.round(unroundedTotal);
      roundOff = round2(roundedInt - unroundedTotal);
      grandTotal = Math.max(0, roundedInt);
    } else if (mode === 'up') {
      const ceilInt = Math.ceil(unroundedTotal);
      roundOff = round2(ceilInt - unroundedTotal);
      grandTotal = Math.max(0, ceilInt);
    } else if (mode === 'down') {
      const floorInt = Math.floor(unroundedTotal);
      roundOff = round2(floorInt - unroundedTotal);
      grandTotal = Math.max(0, floorInt);
    } else {
      roundOff = 0;
      grandTotal = unroundedTotal;
    }
  }

  // 6. Paid Amount & Outstanding Balance
  const rawPaid = Math.max(0, safeNum(params.paidAmount));
  const paidAmount = Math.min(grandTotal, round2(rawPaid));
  const balance = Math.max(0, round2(grandTotal - paidAmount));

  let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
  if (grandTotal > 0 && balance <= 0 && paidAmount >= grandTotal) {
    paymentStatus = 'Paid';
  } else if (paidAmount > 0) {
    paymentStatus = 'Partial';
  } else {
    paymentStatus = 'Unpaid';
  }

  return {
    totalQty,
    subtotal,
    lineDiscountTotal,
    overallDiscount,
    totalDiscount,
    taxableAmount: netTaxableAmount,
    totalTax,
    cgst,
    sgst,
    igst,
    shippingCharges,
    otherCharges,
    unroundedTotal,
    roundOff,
    grandTotal,
    paidAmount,
    balance,
    paymentStatus,
    items: finalLines,
  };
};
