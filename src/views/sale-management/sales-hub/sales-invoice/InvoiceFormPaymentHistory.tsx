import React from "react";
import {
  History,
  Receipt,
  Eye,
  CheckCircle2,
  Plus,
} from "lucide-react";
import type {
  SaleTransaction,
  SalePaymentRecord,
} from "../../../../store/useSalesManagementStore";
import { isoToDdmmyyyy } from "./salesInvoiceFormat";
import type {
  SalesInvoiceFormData,
  SalesInvoiceTotals,
} from "./salesInvoiceTypes";

interface InvoiceFormPaymentHistoryProps {
  formData: SalesInvoiceFormData;
  editingSale: SaleTransaction | null;
  calculatedTotals: SalesInvoiceTotals;
  handleOpenAddPayment: (sale?: SaleTransaction) => void;
  handleViewPaymentDetails: (record: SalePaymentRecord) => void;
}

/** Payment history of the invoice being edited, shown at the end of the Create/Edit form. */
export const InvoiceFormPaymentHistory: React.FC<
  InvoiceFormPaymentHistoryProps
> = ({
  formData,
  editingSale,
  calculatedTotals,
  handleOpenAddPayment,
  handleViewPaymentDetails,
}) => {
  return (
    <div
      id="new-sale-payment-history"
      className="pt-6 border-t border-slate-200/90 space-y-3"
    >
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#33077C] text-white flex items-center justify-center shadow-xs">
              <History className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Payment History
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Track all payments recorded against this invoice (
                {formData.invoiceNo || "Draft"}).
              </p>
            </div>
          </div>

          {/* Right Summary Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200/80 text-xs">
              <span className="text-slate-500 font-medium">
                Invoice:{" "}
              </span>
              <span className="font-bold text-[#33077C]">
                {formData.invoiceNo}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs">
              <span className="text-emerald-700 font-medium">
                Total Paid:{" "}
              </span>
              <span className="font-bold text-emerald-800">
                ₹
                {(
                  editingSale?.paidAmount ||
                  formData.paidAmount ||
                  0
                ).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs">
              <span className="text-amber-700 font-medium">
                Balance Due:{" "}
              </span>
              <span className="font-bold text-amber-800">
                ₹
                {Math.max(
                  0,
                  calculatedTotals.grandTotal -
                    (editingSale?.paidAmount ||
                      formData.paidAmount ||
                      0),
                ).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            {formData.invoiceStatus === "Generated" &&
              Math.max(
                0,
                calculatedTotals.grandTotal -
                  (editingSale?.paidAmount ||
                    formData.paidAmount ||
                    0),
              ) > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenAddPayment()}
                  className="px-3 py-1.5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>+ Add Payment</span>
                </button>
              )}
          </div>
        </div>

        {/* Table of Recorded Payments */}
        {(() => {
          const records: SalePaymentRecord[] =
            editingSale?.paymentRecords &&
            editingSale.paymentRecords.length > 0
              ? editingSale.paymentRecords
              : formData.paymentRecords &&
                  formData.paymentRecords.length > 0
                ? formData.paymentRecords
                : [];

          if (records.length === 0) {
            return (
              <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-700">
                  No Payments Recorded Yet
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {formData.invoiceStatus === "Generated"
                    ? 'Invoice generated. Click "+ Add Payment" above or in the summary card to record customer payments.'
                    : "Generate the invoice first to begin recording customer payments against this transaction."}
                </p>
                {formData.invoiceStatus === "Generated" && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => handleOpenAddPayment()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>+ Add Payment Now</span>
                    </button>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs min-w-[800px]">
                <thead>
                  <tr className="bg-purple-50/80 border-b border-purple-100 text-purple-900 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3.5">#</th>
                    <th className="py-3 px-3.5">Date &amp; Time</th>
                    <th className="py-3 px-3.5">Payment ID</th>
                    <th className="py-3 px-3.5">Payment Method</th>
                    <th className="py-3 px-3.5">
                      Reference / Txn No.
                    </th>
                    <th className="py-3 px-3.5 text-right">Amount</th>
                    <th className="py-3 px-3.5 text-center">
                      Status
                    </th>
                    <th className="py-3 px-3.5">Recorded By</th>
                    <th className="py-3 px-3.5 text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {records.map((rec, rIdx) => (
                    <tr
                      key={rec.id || rIdx}
                      className="hover:bg-purple-50/30 transition-colors"
                    >
                      <td className="py-3 px-3.5 text-slate-400 font-medium">
                        {rIdx + 1}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-700">
                        <div>
                          {isoToDdmmyyyy(rec.paymentDate) ||
                            rec.paymentDate}
                        </div>
                        {rec.paymentTime && (
                          <div className="text-[11px] text-slate-400">
                            {rec.paymentTime}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-[#33077C]">
                        {rec.id}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-purple-50 text-[#33077C] font-bold text-[11px] border border-purple-200">
                          {rec.method}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                        {rec.referenceNo || "—"}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-emerald-600 text-xs sm:text-sm">
                        ₹
                        {Number(rec.amount || 0).toLocaleString(
                          "en-IN",
                          { minimumFractionDigits: 2 },
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{rec.status || "Paid"}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 font-medium text-[11px]">
                        {rec.recordedBy || "Org Super Administrator"}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleViewPaymentDetails(rec)
                          }
                          className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-[#33077C] font-bold rounded-lg border border-purple-200 text-xs transition-all cursor-pointer shadow-2xs flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
