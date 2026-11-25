import React from "react";

interface SalesDocumentSummaryPanelProps {
  withGst: boolean;
  gstType: "intra_state" | "inter_state";
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  enableRoundOff: boolean;
  onToggleRoundOff: (enabled: boolean) => void;
  onManualRoundOffChange: (val: number) => void;
}

const fmtCurrency = (amount: number): string =>
  Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Billing summary card showing GST breakdown (CGST+SGST vs IGST or Without GST), round-off, and grand total. */
export const SalesDocumentSummaryPanel: React.FC<SalesDocumentSummaryPanelProps> = ({
  withGst,
  gstType,
  subtotal,
  totalDiscount,
  taxableAmount,
  cgst,
  sgst,
  igst,
  totalTax,
  roundOff,
  grandTotal,
  enableRoundOff,
  onToggleRoundOff,
  onManualRoundOffChange,
}) => {
  return (
    <div className="w-full max-w-[495px] bg-white rounded-[4px] border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/40">
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">
          Billing Summary
        </h2>
        <span className="text-[11px] font-bold text-[#33077C] bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full">
          {withGst
            ? gstType === "inter_state"
              ? "With GST • Inter-State (IGST)"
              : "With GST • Intra-State (CGST+SGST)"
            : "Without GST (Exempt)"}
        </span>
      </div>

      {/* Body */}
      <div className="p-5 space-y-3.5 flex-1">
        {/* Sub Total, Discount & Amount (After Discount) */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-slate-600 font-medium">
            <span>Sub Total:</span>
            <span className="font-bold text-slate-900 text-sm">
              ₹{fmtCurrency(subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600 font-medium">
            <span>Discount:</span>
            <span
              className={`font-bold text-sm ${
                totalDiscount > 0 ? "text-rose-600" : "text-slate-900"
              }`}
            >
              {totalDiscount > 0 ? `-₹${fmtCurrency(totalDiscount)}` : "₹0.00"}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-700 font-semibold pt-2 border-t border-slate-100">
            <span>Amount (After Discount):</span>
            <span className="font-bold text-slate-900 text-sm">
              ₹{fmtCurrency(taxableAmount)}
            </span>
          </div>
        </div>

        {/* GST Breakdown */}
        {withGst ? (
          <div className="pt-3 pb-1 border-t border-slate-100 space-y-2 text-sm">
            {gstType === "intra_state" ? (
              <>
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>CGST:</span>
                  <span className="font-bold text-slate-900">
                    ₹{fmtCurrency(cgst)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>SGST:</span>
                  <span className="font-bold text-slate-900">
                    ₹{fmtCurrency(sgst)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>IGST:</span>
                <span className="font-bold text-slate-900">
                  ₹{fmtCurrency(igst)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-800 font-bold pt-2 border-t border-dashed border-slate-200/80">
              <span>Total GST:</span>
              <span className="font-bold text-slate-900">
                ₹{fmtCurrency(totalTax)}
              </span>
            </div>
          </div>
        ) : (
          <div className="pt-3 pb-1 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
            <span>GST (Without GST):</span>
            <span className="font-medium text-slate-500">₹0.00 (Exempt)</span>
          </div>
        )}

        {/* Round Off */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={enableRoundOff}
              onChange={(e) => onToggleRoundOff(e.target.checked)}
              className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C] border-slate-300 accent-[#33077C]"
            />
            <span>Round Off</span>
          </label>
          <input
            type="number"
            step="0.01"
            disabled={!enableRoundOff}
            value={roundOff ? roundOff : ""}
            placeholder="0.00"
            onChange={(e) => onManualRoundOffChange(Number(e.target.value))}
            className="w-28 h-9 px-2.5 text-right bg-white disabled:bg-slate-50 border border-slate-200 focus:border-[#33077C] rounded-[6px] text-xs font-bold text-slate-800 outline-none"
          />
        </div>

        {/* Grand Total Banner */}
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
            ₹{fmtCurrency(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  );
};
