import React from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { DateInput } from "../../../../components/common/DateInput";
import { FormError } from "../../../../components/common/FormError";
import { fieldAttr } from "../../../../utils/formValidation";
import { formatDate } from "../../utils/dateUtils";
import type { SaleTransaction } from "../../../../store/useSalesManagementStore";
import { Modal } from "../../../../components/common/Modal";
import type { AssignableSalesRep } from "./QuickAssignInvoiceModal";

interface InvoiceDetailModalProps {
  sale: SaleTransaction | null;
  isOpen: boolean;
  isDownloadingPdf: boolean;
  salesRepresentatives: AssignableSalesRep[];
  detailRepId: string;
  detailRepError?: string;
  detailCollectionStatus: string;
  detailNextFollowUp: string;
  onDetailRepIdChange: (id: string) => void;
  onDetailCollectionStatusChange: (status: string) => void;
  onDetailNextFollowUpChange: (date: string) => void;
  onSaveAssignment: () => void | Promise<void>;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onPrint: (sale: SaleTransaction) => void | Promise<void>;
  onDownload: (sale: SaleTransaction) => void | Promise<void>;
}

/** Full invoice view with printable breakdown, payment summary and sales-rep assignment. */
export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  sale,
  isOpen,
  isDownloadingPdf,
  salesRepresentatives,
  detailRepId,
  detailRepError,
  detailCollectionStatus,
  detailNextFollowUp,
  onDetailRepIdChange,
  onDetailCollectionStatusChange,
  onDetailNextFollowUpChange,
  onSaveAssignment,
  onClose,
  onNavigate,
  onPrint,
  onDownload,
}) => {
  if (!sale) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose()}
      title={`Sales Invoice: ${sale.invoiceNo}`}
      subtitle="View full invoice details and printable breakdown"
      maxWidth="4xl"
      headerGradient={true}
      showBackIcon={true}
      hideCloseButton={true}
      onBack={() => onClose()}
    >
      <div className="space-y-6 pt-2" id="printable-invoice">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{sale.paymentStatus}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#33077C] border border-purple-200 text-xs font-bold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#33077C] shrink-0" />
              <span>{sale.saleStatus}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate("/sale-management/sales/customer");
              }}
              className="h-9 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-[#33077C]" />
              <span>View Customer</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (sale) {
                  onPrint(sale);
                } else {
                  window.print();
                }
              }}
              className="h-9 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
            <button
              type="button"
              disabled={isDownloadingPdf}
              onClick={() => {
                if (sale) {
                  onDownload(sale);
                }
              }}
              className="h-9 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>Download Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate("/sale-management/sales/return");
              }}
              className="h-9 px-3.5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Create Return</span>
            </button>
          </div>
        </div>

        {/* Printable Invoice Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black text-[#33077C] tracking-tight">
              Yaa Creations Inc.
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Enterprise Sales & Logistics Division
            </p>
            <p className="text-xs text-slate-500">
              support@yaacreations.com | +91 98765 43210
            </p>
          </div>
          <div className="text-right">
            <div className="text-base font-extrabold text-[#33077C]">
              {sale.invoiceNo}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              Date: {formatDate(sale.saleDate)}
            </div>
            <div className="text-xs text-slate-500">
              Due: {formatDate(sale.dueDate)}
            </div>
          </div>
        </div>

        {/* Bill To & Ship To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
          <div>
            <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
              Billed To:
            </span>
            <div className="font-bold text-slate-900 text-sm">
              {sale.customerName}
            </div>
            {sale.customerCompany && (
              <div className="font-semibold text-slate-700">
                {sale.customerCompany}
              </div>
            )}
            <div className="text-slate-600 mt-1 whitespace-pre-line">
              {sale.billingAddress}
            </div>
            {sale.customerPhone && (
              <div className="text-slate-500 mt-1">
                Phone: {sale.customerPhone}
              </div>
            )}
          </div>

          <div>
            <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
              Shipped To:
            </span>
            <div className="text-slate-600 whitespace-pre-line">
              {sale.shippingAddress}
            </div>
            <div className="mt-2 text-slate-500">
              <span className="font-semibold">Salesperson:</span>{" "}
              {sale.salesperson}
            </div>
            <div className="text-slate-500">
              <span className="font-semibold">Terms:</span>{" "}
              {sale.paymentTerms}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs shadow-2xs">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left min-w-[620px]">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Product / Description</th>
                  <th className="py-2.5 px-3 text-center">Batch No</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-center">Disc</th>
                  <th className="py-2.5 px-3 text-center">GST%</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((it, idx) => (
                  <tr key={it.id}>
                    <td className="py-2.5 px-3 text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {it.productName}
                      {it.sku && (
                        <span className="text-slate-400 font-normal ml-1">
                          ({it.sku})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {it.batch ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-[#33077C] font-mono text-[11px] font-bold border border-purple-200/80">
                          {it.batch}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">
                          —
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                      {it.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      ₹{it.unitPrice.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {it.discountPercent || 0}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {sale.withGst !== false
                        ? `${it.taxPercent}%`
                        : "0% (Exempt)"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      ₹
                      {it.total.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Breakdown */}
        <div className="flex justify-end text-xs">
          <div className="w-80 space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">
                ₹
                {sale.subtotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            {sale.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>
                  -₹
                  {sale.totalDiscount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            {sale.withGst !== false && sale.totalTax > 0 ? (
              sale.gstType === "inter_state" ? (
                <div className="flex justify-between text-slate-600">
                  <span>IGST (Inter-State Tax):</span>
                  <span className="font-medium text-slate-800">
                    +₹
                    {(sale.igst !== undefined
                      ? sale.igst
                      : sale.totalTax
                    ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (Central Tax - 50%):</span>
                    <span className="font-medium text-slate-800">
                      +₹
                      {(sale.cgst !== undefined
                        ? sale.cgst
                        : sale.totalTax / 2
                      ).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (State Tax - 50%):</span>
                    <span className="font-medium text-slate-800">
                      +₹
                      {(sale.sgst !== undefined
                        ? sale.sgst
                        : sale.totalTax / 2
                      ).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </>
              )
            ) : (
              <div className="flex justify-between text-amber-700 font-medium">
                <span>Tax (Without GST):</span>
                <span>₹0.00 (Exempt)</span>
              </div>
            )}
            {sale.shippingCharges > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Shipping:</span>
                <span>
                  +₹
                  {sale.shippingCharges.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-[#33077C]">
              <span>Grand Total:</span>
              <span>
                ₹
                {sale.grandTotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Amount Paid:</span>
              <span>
                ₹
                {sale.paidAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between text-amber-600 font-bold border-t border-slate-200 pt-1.5">
              <span>Balance Due:</span>
              <span>
                ₹
                {sale.balance.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Payment History & Transactions Section */}
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                <History className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-xs sm:text-[13px] font-bold text-slate-900">
                  Payment History &amp; Settlements
                </h4>
                <p className="text-[11px] text-slate-500">
                  Breakdown of recorded payments and transaction references
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  sale.paymentStatus === "Paid"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : sale.paymentStatus === "Partial"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
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

          {sale.paymentSplits &&
          sale.paymentSplits.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Payment Method</th>
                    <th className="py-2.5 px-3">Reference / Txn ID</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Amount Paid</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sale.paymentSplits.map((split, sIdx) => (
                    <tr
                      key={split.id || sIdx}
                      className="hover:bg-slate-50/50"
                    >
                      <td className="py-2.5 px-3 text-slate-400 font-medium">
                        {sIdx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 font-bold text-[11px]">
                          {split.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {split.referenceNo || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-medium">
                        {formatDate(sale.saleDate)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                        ₹
                        {Number(split.amount || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Settled</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-3.5 bg-white rounded-xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">
                  Primary Method:
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 font-bold text-[11px]">
                  {sale.paymentMethod || "Cash"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-500">
                  Date:{" "}
                  <strong className="text-slate-700 font-semibold">
                    {formatDate(sale.saleDate)}
                  </strong>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    ₹
                    {sale.paidAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Collection Assignment Section as requested */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#33077C] shrink-0 shadow-2xs">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-[13px] font-bold text-slate-900">
                  Customer Sales Representative
                </h4>
                <p className="text-[11px] text-slate-500">
                  Representative assigned to customer{" "}
                  {sale.customerName} (applies across all invoices)
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#33077C] border border-purple-200 text-xs font-bold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#33077C]" />
              Customer Assignment
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* Sales Rep Selector */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Sales Representative
              </label>
              <select
                value={detailRepId}
                {...fieldAttr("detailRepId")}
                onChange={(e) => {
                  onDetailRepIdChange(e.target.value);
                }}
                className="w-full h-10 px-3 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C] outline-none"
              >
                <option value="">-- Select Sales Rep --</option>
                {salesRepresentatives.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.status})
                  </option>
                ))}
              </select>
              <FormError message={detailRepError} />
            </div>

            {/* Outstanding Amount */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Outstanding Amount
              </label>
              <div className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center font-bold text-rose-600 text-sm">
                ₹
                {sale.balance.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Due Date
              </label>
              <div className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center font-semibold text-slate-700 text-xs">
                {sale.dueDate || "Immediate"}
              </div>
            </div>

            {/* Collection Status */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Collection Status
              </label>
              <select
                value={detailCollectionStatus}
                onChange={(e) => onDetailCollectionStatusChange(e.target.value)}
                className="w-full h-10 px-3 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C] outline-none"
              >
                <option value="Pending Follow-up">Pending Follow-up</option>
                <option value="Customer Contacted">
                  Customer Contacted
                </option>
                <option value="Promise to Pay">Promise to Pay</option>
                <option value="Dispute Raised">Dispute Raised</option>
                <option value="Collected">Collected</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Next Follow-up
              </label>
              <DateInput
                value={detailNextFollowUp}
                onChange={(v) => onDetailNextFollowUpChange(v)}
                heightClass="h-9"
              />
            </div>

            <button
              type="button"
              onClick={onSaveAssignment}
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer self-end"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Save Assignment</span>
            </button>
          </div>
        </div>

        {/* Close footer */}
        <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onClose()}
            className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4 text-slate-500" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
