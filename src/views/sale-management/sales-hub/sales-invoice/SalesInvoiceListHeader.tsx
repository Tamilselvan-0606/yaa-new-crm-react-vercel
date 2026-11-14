import React from "react";
import {
  ShoppingCart,
  FileSpreadsheet,
  Printer,
  BarChart2,
  Plus,
} from "lucide-react";
import { Button } from "../../../../components/common/Button";

interface SalesInvoiceListHeaderProps {
  totalCount: number;
  onExportExcel: () => void;
  onPrintReport: () => void;
  onOpenSalesGraph: () => void;
  onAddInvoice: () => void;
}

/** Title banner and primary actions (reports, graph, add) of the Sales Invoice list. */
export const SalesInvoiceListHeader: React.FC<SalesInvoiceListHeaderProps> = ({
  totalCount,
  onExportExcel,
  onPrintReport,
  onOpenSalesGraph,
  onAddInvoice,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
          <ShoppingCart className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Sales Invoice
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
              {totalCount} total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Create, process, track sales transactions, manage invoice
            lifecycles, and monitor payment settlements.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
        <Button
          variant="secondary"
          size="md"
          icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          onClick={onExportExcel}
          className="hover:border-emerald-500 hover:text-emerald-700 transition-colors"
        >
          Excel Report
        </Button>

        <Button
          variant="secondary"
          size="md"
          icon={<Printer className="w-4 h-4 text-slate-600" />}
          onClick={onPrintReport}
          className="hover:border-purple-300 transition-colors"
        >
          Print Report
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={onOpenSalesGraph}
          icon={<BarChart2 className="w-4 h-4 text-[#33077C]" />}
          className="hover:border-[#33077C]/40 transition-colors"
        >
          Sales Graph
        </Button>

        <Button
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4 text-white stroke-[2.5]" />}
          onClick={onAddInvoice}
          className="bg-[#33077C] hover:bg-[#280563] text-white shadow-sm hover:shadow transition-all"
        >
          Add Invoice
        </Button>
      </div>
    </div>
  );
};
