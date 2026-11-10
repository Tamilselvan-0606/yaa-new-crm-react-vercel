import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FormError } from '../../../components/common/FormError';
import {
  SPLIT_PAYMENT_METHODS, SplitPaymentMethod, SplitPaymentRow, SplitSummary, SplitValidation, newSplitRow, splitFieldLabels,
} from '../../../utils/splitPayments';

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  rows: SplitPaymentRow[];
  onChange: (rows: SplitPaymentRow[]) => void;
  summary: SplitSummary;
  /** Already paid before this form (editing a partly paid bill). */
  alreadyPaid: number;
  validation: SplitValidation;
  /** Errors are shown after the first Save attempt, or as soon as the total is over the bill. */
  showErrors: boolean;
  disabled?: boolean;
  /** Error coming from the form's own validation (for example paid above the total). */
  extraError?: string;
  /** The payment methods offered (purchase and sales accept different lists). */
  methods?: SplitPaymentMethod[];
}

const INPUT =
  'h-8.5 px-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10 rounded-[6px] text-xs font-semibold text-slate-700 outline-none transition-all';

let counter = 0;
export const makeSplitRowId = () => `sp_${Date.now()}_${++counter}`;

export const SplitPaymentSection: React.FC<Props> = ({ rows, onChange, summary, alreadyPaid, validation, showErrors, disabled, extraError, methods = SPLIT_PAYMENT_METHODS }) => {
  const update = (id: string, patch: Partial<SplitPaymentRow>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const statusLabel = summary.status === 'Partial' ? 'Partially Paid' : summary.status;
  const statusCls =
    summary.status === 'Paid'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : summary.status === 'Partial'
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-slate-600 bg-slate-50 border-slate-200';

  return (
    <div className="space-y-2.5">
      {alreadyPaid > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Already paid</span>
          <span className="font-bold text-emerald-700">{inr(alreadyPaid)}</span>
        </div>
      )}

      {rows.map((r, idx) => {
        const labels = splitFieldLabels(r.method);
        const err = showErrors ? validation.rowErrors[r.id] : undefined;
        return (
          <div key={r.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0">{idx + 1}</span>
              <select
                value={r.method}
                disabled={disabled}
                onChange={(e) => update(r.id, { method: e.target.value as SplitPaymentMethod })}
                className={`${INPUT} flex-1 min-w-0`}
                aria-label="Payment method"
              >
                {methods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <div className="relative w-28 shrink-0">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={r.amount}
                  disabled={disabled}
                  placeholder="0"
                  aria-label="Payment amount"
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault();
                  }}
                  onChange={(e) => {
                    // digits and one decimal point, at most two decimals
                    let v = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = v.split('.');
                    if (parts.length > 2) v = `${parts[0]}.${parts.slice(1).join('')}`;
                    const [i, d] = v.split('.');
                    update(r.id, { amount: d !== undefined ? `${i}.${d.slice(0, 2)}` : i });
                  }}
                  className={`${INPUT} w-full pl-5 text-right text-emerald-700`}
                />
              </div>
              <button
                type="button"
                disabled={disabled || rows.length <= 1}
                onClick={() => onChange(rows.filter((x) => x.id !== r.id))}
                title={rows.length <= 1 ? 'At least one payment entry stays' : 'Remove this payment'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {(labels.reference || labels.bankDetails) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                {labels.reference && (
                  <input
                    type="text"
                    value={r.reference}
                    disabled={disabled}
                    maxLength={100}
                    placeholder={labels.reference}
                    aria-label={labels.reference}
                    onChange={(e) => update(r.id, { reference: e.target.value })}
                    className={`${INPUT} w-full`}
                  />
                )}
                {labels.bankDetails && (
                  <input
                    type="text"
                    value={r.bankDetails}
                    disabled={disabled}
                    maxLength={150}
                    placeholder={labels.bankDetails}
                    aria-label={labels.bankDetails}
                    onChange={(e) => update(r.id, { bankDetails: e.target.value })}
                    className={`${INPUT} w-full`}
                  />
                )}
              </div>
            )}
            <FormError message={err} />
          </div>
        );
      })}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange([...rows, newSplitRow(makeSplitRowId(), 'Cash')])}
        className="w-full h-8.5 rounded-[6px] border border-dashed border-[#33077C]/40 text-[#33077C] text-xs font-bold hover:bg-purple-50/60 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Payment Method
      </button>

      <div className="space-y-1 pt-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Total Paid</span>
          <span className="font-bold text-emerald-700">{inr(summary.totalPaid)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Remaining Balance</span>
          <span className={`font-bold ${summary.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{inr(summary.balance)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Payment Status</span>
          <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${statusCls}`}>{statusLabel}</span>
        </div>
      </div>

      <FormError message={validation.totalError ?? (showErrors ? extraError : undefined)} showIcon />
    </div>
  );
};
