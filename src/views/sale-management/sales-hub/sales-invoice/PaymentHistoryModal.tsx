import React from "react";
import {
  CheckCircle2,
  Clock,
  Receipt,
  Eye,
  X,
  FileText,
  CreditCard,
} from "lucide-react";
import type {
  SaleTransaction,
  SalePaymentRecord,
} from "../../../../store/useSalesManagementStore";
import { Modal } from "../../../../components/common/Modal";
import { formatDate } from "../../utils/dateUtils";

interface PaymentHistoryModalProps {
  sale: SaleTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onViewPaymentDetails: (record: SalePaymentRecord) => void;
  onViewFullInvoice: () => void;
  onRecordPayment: (sale: SaleTransaction) => void;
}

/** Payment history (recorded payments / splits) for one invoice. */
export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  sale,
  isOpen,
  onClose,
  onViewPaymentDetails,
  onViewFullInvoice,
  onRecordPayment,
}) => {
  if (!sale) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose()}
      title={`Payment History: ${sale.invoiceNo}`}
      subtitle={`Transaction logs and payment settlements for ${sale.customerName}`}
      maxWidth="2xl"
      headerGradient={true}
      showBackIcon={true}
      hideCloseButton={true}
      onBack={() => onClose()}
    >
      <div className="space-y-5 p-2 sm:p-4 text-xs animate-in fade-in duration-150">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
              Grand Total
            </span>
            <div className="text-base sm:text-lg font-black text-[#33077C] mt-0.5">
              ₹
              {sale.grandTotal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Total Paid
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-600 mt-0.5">
              ₹
              {sale.paidAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-2xl">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Balance Due
            </span>
            <div className="text-base sm:text-lg font-black text-amber-600 mt-0.5">
              ₹
              {sale.balance.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Payment Status
            </span>
            <div className="mt-1">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  sale.paymentStatus === "Paid"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : sale.paymentStatus === "Partial"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-rose-100 text-rose-800 border border-rose-300"
                }`}
              >
                {sale.paymentStatus === "Paid" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                <span>{sale.paymentStatus}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Collection Progress Bar */}
        <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-600">
              Payment Collection Progress
            </span>
            <span className="text-indigo-600 font-bold">
              {sale.grandTotal > 0
                ? Math.min(
                    100,
                    Math.round(
                      (sale.paidAmount / sale.grandTotal) *
                        100,
                    ),
                  )
                : 100}
              % Paid
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#33077C] to-emerald-500 rounded-full transition-all duration-500"
              style={{
                width: `${sale.grandTotal > 0 ? Math.min(100, (sale.paidAmount / sale.grandTotal) * 100) : 100}%`,
              }}
            />
          </div>
        </div>

        {/* Transaction Logs Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-[13px] font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" />
              <span>Recorded Payment Transactions</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">
              {sale.paymentRecords &&
              sale.paymentRecords.length > 0
                ? `${sale.paymentRecords.length} recorded transaction(s)`
                : sale.paymentSplits &&
                    sale.paymentSplits.length > 0
                  ? `${sale.paymentSplits.length} split transaction(s)`
                  : "1 single transaction"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3.5">#</th>
                  <th className="py-3 px-3.5">Method</th>
                  <th className="py-3 px-3.5">Transaction / Ref No</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5 text-right">Amount (₹)</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sale.paymentRecords &&
                sale.paymentRecords.length > 0 ? (
                  sale.paymentRecords.map((rec, rIdx) => (
                    <tr
                      key={rec.id || rIdx}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-3.5 font-medium text-slate-400">
                        {rIdx + 1}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[11px]">
                          {rec.method}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                        {rec.referenceNo || (
                          <span className="text-slate-300 italic">
                            None
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-slate-500 font-medium">
                        {formatDate(rec.paymentDate)}{" "}
                        {rec.paymentTime ? `• ${rec.paymentTime}` : ""}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-emerald-600 text-[13px]">
                        ₹
                        {Number(rec.amount || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{rec.status || "Paid"}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            onViewPaymentDetails(rec);
                          }}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-[#33077C] font-bold rounded-lg border border-purple-200 text-xs transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : sale.paymentSplits &&
                  sale.paymentSplits.length > 0 ? (
                  sale.paymentSplits.map((split, sIdx) => (
                    <tr
                      key={split.id || sIdx}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-3.5 font-medium text-slate-400">
                        {sIdx + 1}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[11px]">
                          {split.method}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                        {split.referenceNo || (
                          <span className="text-slate-300 italic">
                            None
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-slate-500 font-medium">
                        {formatDate(sale.saleDate)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-emerald-600 text-[13px]">
                        ₹
                        {Number(split.amount || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Settled</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="text-slate-400 text-xs">—</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3.5 font-medium text-slate-400">
                      1
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[11px]">
                        {sale.paymentMethod || "Cash"}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-400 italic">
                      Standard Receipt
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 font-medium">
                      {formatDate(sale.saleDate)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-emerald-600 text-[13px]">
                      ₹
                      {sale.paidAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>
                          {sale.paymentStatus === "Paid"
                            ? "Full Settlement"
                            : "Partial Receipt"}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span className="text-slate-400 text-xs">—</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes / Details Box if any */}
        {sale.notes && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <span className="font-semibold text-slate-600 block mb-0.5">
              Sale / Payment Remarks:
            </span>
            <p className="text-slate-700 italic">{sale.notes}</p>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="pt-4 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onClose()}
            className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Close</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewFullInvoice();
              }}
              className="h-10 px-4 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-[13px] font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>View Full Invoice</span>
            </button>

            {sale.balance > 0 &&
              sale.saleStatus !== "Cancelled" && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRecordPayment(sale);
                  }}
                  className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Record New Payment</span>
                </button>
              )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
