import React from "react";
import {
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export interface SalesInvoiceCardSummary {
  totalCount: number;
  totalSalesAmount: number;
  todayAmount: number;
  todayCount: number;
  pendingPaymentsAmount: number;
  completedCount: number;
  cancelledCount: number;
}

interface SalesInvoiceSummaryCardsProps {
  cardSummary: SalesInvoiceCardSummary;
}

/** KPI cards on top of the Sales Invoice list (totals come from the API summary). */
export const SalesInvoiceSummaryCards: React.FC<
  SalesInvoiceSummaryCardsProps
> = ({ cardSummary }) => {
  return (
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
  );
};
