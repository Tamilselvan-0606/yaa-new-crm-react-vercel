import React from "react";
import { CheckCircle2, Clock, AlertCircle, X, Check, Loader2 } from "lucide-react";
import type { SalesInvoiceTotals } from "./salesInvoiceTypes";

interface InvoiceFormActionBarProps {
  calculatedTotals: SalesInvoiceTotals;
  isActionLoading: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
}

/** Payment-status badge plus Cancel / Generate Invoice buttons at the bottom of the invoice form. */
export const InvoiceFormActionBar: React.FC<InvoiceFormActionBarProps> = ({
  calculatedTotals,
  isActionLoading,
  isSubmitting,
  onCancel,
}) => {
  return (
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
          onClick={onCancel}
          className="h-11 px-5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4 text-slate-500" />
          <span>Cancel</span>
        </button>
        <button
          type="submit"
          disabled={isActionLoading || isSubmitting}
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
  );
};
