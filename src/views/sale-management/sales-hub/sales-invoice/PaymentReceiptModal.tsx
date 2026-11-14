import React from "react";
import { CheckCircle2, X, Printer, Download } from "lucide-react";
import { Modal } from "../../../../components/common/Modal";
import { printHtmlElement } from "../../../../utils/printUtils";
import type { SalePaymentRecord } from "../../../../store/useSalesManagementStore";
import { isoToDdmmyyyy } from "./salesInvoiceFormat";

interface PaymentReceiptModalProps {
  record: SalePaymentRecord | null;
  isOpen: boolean;
  isDownloadingPdf: boolean;
  onClose: () => void;
  onDownload: (record: SalePaymentRecord) => void | Promise<void>;
}

/** Payment details / printable receipt for a single recorded payment. */
export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  record,
  isOpen,
  isDownloadingPdf,
  onClose,
  onDownload,
}) => {
  if (!record) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose()}
      title={`Payment Receipt: ${record.id}`}
      subtitle={`Payment details for Invoice ${record.invoiceNo}`}
      maxWidth="lg"
      headerGradient={true}
      showBackIcon={true}
      hideCloseButton={true}
      onBack={() => onClose()}
    >
      <div
        className="space-y-4 p-2 sm:p-4 text-xs animate-in fade-in duration-150"
        id="printable-payment-receipt"
      >
        {/* Top Success Badge */}
        <div className="p-4 bg-emerald-50 border border-emerald-200/90 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-900">
                Payment Successfully Settled
              </h4>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                Recorded by{" "}
                {record.recordedBy ||
                  "Org Super Administrator"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
              Amount Paid
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
              ₹
              {Number(record.amount || 0).toLocaleString(
                "en-IN",
                { minimumFractionDigits: 2 },
              )}
            </div>
          </div>
        </div>

        {/* Grid of Payment Attributes */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Payment ID
              </span>
              <span className="font-mono font-bold text-[#33077C] text-sm mt-0.5 block">
                {record.id}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Invoice Number
              </span>
              <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                {record.invoiceNo}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Payment Date
              </span>
              <span className="font-medium text-slate-700 mt-0.5 block">
                {isoToDdmmyyyy(record.paymentDate) ||
                  record.paymentDate}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Created Date &amp; Time
              </span>
              <span className="font-medium text-slate-700 mt-0.5 block">
                {isoToDdmmyyyy(record.paymentDate)}{" "}
                {record.paymentTime || ""}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Payment Method
              </span>
              <div className="mt-0.5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-purple-50 text-[#33077C] font-bold text-xs border border-purple-200">
                  {record.method}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Reference / Transaction No.
              </span>
              <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                {record.referenceNo || "None / Cash"}
              </span>
            </div>
          </div>

          {record.notes && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Payment Remarks / Notes
              </span>
              <p className="text-slate-700 italic">
                {record.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onClose()}
            className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Close</span>
          </button>

          <button
            type="button"
            onClick={() =>
              printHtmlElement(
                "printable-payment-receipt",
                `Payment Receipt - ${record.invoiceNo}`,
              )
            }
            className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs sm:text-[13px] font-bold shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Receipt</span>
          </button>

          <button
            type="button"
            disabled={isDownloadingPdf}
            onClick={() =>
              onDownload(record)
            }
            className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Receipt</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
