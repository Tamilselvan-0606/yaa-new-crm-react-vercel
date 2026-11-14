import React from "react";
import { Percent, Tag } from "lucide-react";

interface GstConfigurationBarProps {
  withGst: boolean;
  gstType: "intra_state" | "inter_state";
  onToggleWithGst: (enableGst: boolean) => void;
  onSetGstType: (type: "intra_state" | "inter_state") => void;
}

/** "With GST / Without GST" toggle and Intra-State (CGST+SGST) vs Inter-State (IGST) selector. */
export const GstConfigurationBar: React.FC<GstConfigurationBarProps> = ({
  withGst,
  gstType,
  onToggleWithGst,
  onSetGstType,
}) => {
  return (
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
            onClick={() => onToggleWithGst(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              withGst
                ? "bg-[#33077C] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${withGst ? "bg-emerald-400" : "bg-slate-300"}`}
            />
            With GST
          </button>
          <button
            type="button"
            onClick={() => onToggleWithGst(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              !withGst
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${!withGst ? "bg-white" : "bg-slate-300"}`}
            />
            Without GST
          </button>
        </div>
      </div>

      {/* GST Type Selection (Intra-State vs Inter-State) */}
      {withGst ? (
        <div className="pt-2 border-t border-purple-100/60 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">
              GST Breakdown Type:
            </span>
            <span className="text-[11px] text-slate-500">
              {gstType === "intra_state"
                ? "(Split 50% CGST + 50% SGST for same-state customer)"
                : "(Single 100% IGST for interstate customer)"}
            </span>
          </div>
          <div className="inline-flex rounded-lg border border-purple-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => onSetGstType("intra_state")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                gstType === "intra_state"
                  ? "bg-purple-100 text-[#33077C]"
                  : "text-slate-600 hover:text-[#33077C]"
              }`}
            >
              Intra-State (CGST + SGST)
            </button>
            <button
              type="button"
              onClick={() => onSetGstType("inter_state")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                gstType === "inter_state"
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
  );
};
