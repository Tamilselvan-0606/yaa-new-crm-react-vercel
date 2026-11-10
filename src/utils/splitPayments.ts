/**
 * Split payments on a purchase bill: the amounts, the status preview and the validation.
 *
 * The saved paid amount, balance and status come from the server. This only drives what the form shows while the user
 * types and decides whether Save is allowed.
 */

export type SplitPaymentMethod = 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Card' | 'Other' | 'Online Payment';

/** Purchase bills (Payments Out). */
export const SPLIT_PAYMENT_METHODS: SplitPaymentMethod[] = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card', 'Other'];
/** Sales invoices: the six types Payments In accepts. */
export const SALES_SPLIT_PAYMENT_METHODS: SplitPaymentMethod[] = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card', 'Online Payment'];

export interface SplitPaymentRow {
  id: string;
  method: SplitPaymentMethod;
  /** Kept as typed so the user can enter "12." or "0.5" without the field jumping. */
  amount: string;
  /** UPI transaction id, bank transaction reference, cheque number, card approval code … */
  reference: string;
  /** Bank / account details (Bank Transfer, Cheque). */
  bankDetails: string;
}

export const round2 = (n: number): number => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const newSplitRow = (id: string, method: SplitPaymentMethod = 'Cash'): SplitPaymentRow => ({
  id,
  method,
  amount: '',
  reference: '',
  bankDetails: '',
});

/** What the extra fields of a method are called. `null` = the field is not shown. */
export const splitFieldLabels = (
  method: SplitPaymentMethod,
): { reference: string | null; bankDetails: string | null } => {
  switch (method) {
    case 'UPI':
      return { reference: 'UPI transaction reference', bankDetails: null };
    case 'Bank Transfer':
      return { reference: 'Transaction reference', bankDetails: 'Bank / account details' };
    case 'Cheque':
      return { reference: 'Cheque number', bankDetails: 'Bank details' };
    case 'Card':
      return { reference: 'Card approval / reference', bankDetails: null };
    case 'Other':
      return { reference: 'Reference', bankDetails: null };
    case 'Online Payment':
      return { reference: 'Transaction reference', bankDetails: null };
    default:
      return { reference: null, bankDetails: null };
  }
};

/** The amount of a row as a number (0 when empty or not a number; negatives never count). */
export const rowAmount = (row: Pick<SplitPaymentRow, 'amount'>): number => {
  const n = parseFloat(String(row.amount ?? '').replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? round2(n) : 0;
};

/** Rows that carry a payment. Empty rows are never submitted. */
export const activeSplitRows = (rows: SplitPaymentRow[]): SplitPaymentRow[] => rows.filter((r) => rowAmount(r) > 0);

export type SplitPaymentStatus = 'Paid' | 'Partial' | 'Unpaid';

export interface SplitSummary {
  /** Already paid before this form (an existing bill), plus the rows. */
  totalPaid: number;
  newPayments: number;
  balance: number;
  status: SplitPaymentStatus;
  overpaid: boolean;
}

export const summarizeSplit = (grandTotal: number, alreadyPaid: number, rows: SplitPaymentRow[]): SplitSummary => {
  const newPayments = round2(rows.reduce((s, r) => s + rowAmount(r), 0));
  const totalPaid = round2((Number(alreadyPaid) || 0) + newPayments);
  const gt = round2(grandTotal);
  const overpaid = totalPaid > gt + 0.005;
  const balance = round2(Math.max(0, gt - totalPaid));
  const status: SplitPaymentStatus = gt > 0 && totalPaid >= gt - 0.005 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid';
  return { totalPaid, newPayments, balance, status, overpaid };
};

export interface SplitValidation {
  ok: boolean;
  rowErrors: Record<string, string>;
  totalError?: string;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const validateSplit = (
  grandTotal: number,
  alreadyPaid: number,
  rows: SplitPaymentRow[],
  allowedMethods: SplitPaymentMethod[] = SPLIT_PAYMENT_METHODS,
): SplitValidation => {
  const rowErrors: Record<string, string> = {};
  rows.forEach((r) => {
    const raw = String(r.amount ?? '').trim();
    if (raw === '') return; // an empty row is simply not submitted
    const n = parseFloat(raw.replace(/,/g, ''));
    if (!Number.isFinite(n)) rowErrors[r.id] = 'Enter a valid amount.';
    else if (n < 0) rowErrors[r.id] = 'The amount cannot be negative.';
    else if (n === 0) rowErrors[r.id] = 'Enter an amount above zero, or remove this payment.';
    else if (!allowedMethods.includes(r.method)) rowErrors[r.id] = 'Choose a payment method.';
  });
  const s = summarizeSplit(grandTotal, alreadyPaid, rows);
  let totalError: string | undefined;
  if (s.overpaid) {
    totalError = `The payments add up to ${fmt(s.totalPaid)}, which is more than the bill total of ${fmt(round2(grandTotal))}. Reduce the amounts by ${fmt(round2(s.totalPaid - grandTotal))}.`;
  }
  return { ok: Object.keys(rowErrors).length === 0 && !totalError, rowErrors, totalError };
};

/** The fields Payments Out accepts for one row (the contract has no bank, account or date field, so those go in notes). */
export const splitRowToPaymentFields = (row: SplitPaymentRow, billNo: string) => {
  const labels = splitFieldLabels(row.method);
  const ref = labels.reference ? row.reference.trim() : '';
  const bank = labels.bankDetails ? row.bankDetails.trim() : '';
  const notes = [`Payment for ${billNo} (${row.method})`, bank ? `${labels.bankDetails}: ${bank}` : ''].filter(Boolean).join('. ');
  return {
    paymentType: row.method,
    amount: rowAmount(row),
    referenceNo: ref || undefined,
    notes,
  };
};
