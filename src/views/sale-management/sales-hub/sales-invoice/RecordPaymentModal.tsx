import React from "react";
import { Calendar, Check, Eye, Plus, Receipt, Trash2 } from "lucide-react";
import { formatDate } from "../../utils/dateUtils";
import type {
  SaleTransaction,
  PaymentSplitItem,
} from "../../../../store/useSalesManagementStore";
import { Modal } from "../../../../components/common/Modal";
import { FormError } from "../../../../components/common/FormError";
import { DateInput } from "../../../../components/common/DateInput";
import { type FieldErrors, fieldAttr } from "../../../../utils/formValidation";
import { FormLabel, FORM_INPUT_CLS } from "../../utils/formUtils";
import { isoToDdmmyyyy, ddmmyyyyToIso } from "./salesInvoiceFormat";

interface RecordPaymentModalProps {
  sale: SaleTransaction | null;
  isOpen: boolean;
  isSubmitting: boolean;
  paymentModalSplits: PaymentSplitItem[];
  paymentFormErrors: FieldErrors;
  paymentModalDate: string;
  recordNotes: string;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  onAddSplit: () => void;
  onRemoveSplit: (index: number) => void;
  onSplitChange: (
    index: number,
    field: keyof PaymentSplitItem,
    value: string | number,
  ) => void;
  onDateChange: (isoDate: string) => void;
  onNotesChange: (notes: string) => void;
  onViewInvoice: () => void;
}

/** "Add Payment" dialog: single or split payments recorded against an invoice. */
export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  sale: selectedSale,
  isOpen,
  isSubmitting,
  paymentModalSplits,
  paymentFormErrors,
  paymentModalDate,
  recordNotes,
  onClose,
  onSubmit,
  onAddSplit,
  onRemoveSplit,
  onSplitChange,
  onDateChange,
  onNotesChange,
  onViewInvoice,
}) => {
  if (!selectedSale) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose()}
      title="Add Payment"
      subtitle={`Record a payment against invoice ${selectedSale.invoiceNo}.`}
      maxWidth="5xl"
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-5 pt-1 text-xs font-sans"
      >
        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT SIDE: Payment Details (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Amount Due Banner */}
            <div className="p-3.5 bg-purple-50/60 border border-purple-200/80 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-700 font-semibold text-xs sm:text-[13px]">
                <div className="w-8 h-8 rounded-lg bg-[#33077C] text-white flex items-center justify-center shadow-2xs">
                  <Receipt className="w-4 h-4" />
                </div>
                <span>Amount Due on Invoice</span>
              </div>
              <span className="font-bold text-[#33077C] text-base sm:text-lg">
                ₹
                {selectedSale.balance.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* 2. Split / Multiple Payment Methods Area */}
            <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-800">
                    Payment Details
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Enter payment amount, select method, and record
                    transaction reference
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onAddSplit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#33077C]/10 hover:bg-[#33077C]/15 text-[#33077C] rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Another Payment</span>
                </button>
              </div>

              {/* Payment Rows */}
              <div className="space-y-2.5">
                {paymentModalSplits.map((split, sIdx) => (
                  <div
                    key={split.id || sIdx}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 sm:p-0 bg-slate-50 sm:bg-transparent rounded-lg border border-slate-200/80 sm:border-0"
                  >
                    {/* Method Select */}
                    <div className="w-full sm:w-40 shrink-0">
                      <select
                        {...fieldAttr(`payment.${sIdx}.method`)}
                        value={split.method}
                        onChange={(e) =>
                          onSplitChange(
                            sIdx,
                            "method",
                            e.target.value,
                          )
                        }
                        className="w-full h-10 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10 rounded-lg text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all cursor-pointer shadow-2xs"
                      >
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Online Payment">
                          Online Payment
                        </option>
                      </select>
                      <FormError
                        message={
                          paymentFormErrors[`payment.${sIdx}.method`]
                        }
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Amount Input */}
                      <div className="w-32 sm:w-36 shrink-0 relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-semibold">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          {...fieldAttr(`payment.${sIdx}.amount`)}
                          value={split.amount || ""}
                          onChange={(e) =>
                            onSplitChange(
                              sIdx,
                              "amount",
                              Number(e.target.value),
                            )
                          }
                          placeholder="0.00"
                          className="w-full h-10 pl-7 pr-3 text-right bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10 rounded-lg text-xs sm:text-[13px] font-semibold text-slate-900 outline-none transition-all shadow-2xs"
                        />
                      </div>

                      {/* Reference / Txn No */}
                      <div className="flex-1 min-w-[100px]">
                        <input
                          type="text"
                          value={split.referenceNo || ""}
                          onChange={(e) =>
                            onSplitChange(
                              sIdx,
                              "referenceNo",
                              e.target.value,
                            )
                          }
                          placeholder="Enter reference number"
                          className="w-full h-10 px-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-2 focus:ring-[#4309A2]/10 rounded-lg text-xs sm:text-[13px] font-normal text-slate-700 placeholder:text-slate-400 outline-none transition-all shadow-2xs"
                        />
                      </div>

                      {/* Delete Row Button */}
                      {paymentModalSplits.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveSplit(sIdx)
                          }
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer shrink-0"
                          title="Remove Payment Row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {paymentModalSplits.map((split, sIdx) => (
                  <FormError
                    key={`amt_err_${split.id || sIdx}`}
                    message={paymentFormErrors[`payment.${sIdx}.amount`]}
                  />
                ))}
                <FormError message={paymentFormErrors.payments} />
              </div>
            </div>

            {/* 3. Payment Date & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <FormLabel required>Payment Date</FormLabel>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={isoToDdmmyyyy(paymentModalDate)}
                    {...fieldAttr("paymentDate")}
                    onChange={(e) => {
                      const iso = ddmmyyyyToIso(e.target.value);
                      onDateChange(iso || e.target.value);
                    }}
                    required
                    className={`${FORM_INPUT_CLS} pr-10`}
                  />
                  <label className="absolute right-2.5 top-2.5 text-slate-400 hover:text-[#33077C] cursor-pointer transition-colors p-1">
                    <Calendar className="w-4 h-4" />
                    <DateInput
                      value={paymentModalDate}
                      onChange={(v) => {
                        if (v) onDateChange(v);
                      }}
                    />
                  </label>
                </div>
                <FormError message={paymentFormErrors.paymentDate} />
              </div>

              <div>
                <FormLabel>Payment Notes</FormLabel>
                <input
                  type="text"
                  value={recordNotes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Add payment notes..."
                  className={FORM_INPUT_CLS}
                />
              </div>
            </div>

            {/* 4. Live Calculation Box */}
            {(() => {
              const currentAllocated = paymentModalSplits.reduce(
                (acc, p) => acc + (Number(p.amount) || 0),
                0,
              );
              const prevPaid = selectedSale.paidAmount || 0;
              const remainingBal = Math.max(
                0,
                selectedSale.grandTotal - (prevPaid + currentAllocated),
              );

              return (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 text-slate-600">
                    <span>Invoice Total:</span>
                    <span className="font-semibold text-slate-900">
                      ₹
                      {selectedSale.grandTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Previously Paid:</span>
                    <span className="font-medium text-slate-700">
                      ₹
                      {prevPaid.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 font-medium">
                    <span>Current Payment:</span>
                    <span className="font-semibold text-emerald-600 text-xs sm:text-[13px]">
                      ₹
                      {currentAllocated.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-xs sm:text-[13px]">
                    <span>Remaining Balance:</span>
                    <span className="text-[#33077C] font-bold text-sm">
                      ₹
                      {remainingBal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* RIGHT SIDE: Existing Invoice Summary (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200 rounded-xl p-4.5 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    EXISTING INVOICE
                  </span>
                  <div className="font-bold text-[#33077C] text-sm mt-0.5">
                    {selectedSale.invoiceNo}
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-[#33077C] border border-purple-200">
                  Generated
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Invoice Date:</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(selectedSale.saleDate)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Customer:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedSale.customerName}
                  </span>
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
                <div className="p-2.5 bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-600 flex justify-between text-[11px]">
                  <span>Product / Item</span>
                  <span>Total</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-32 overflow-y-auto">
                  {selectedSale.items.map((it, idx) => (
                    <div
                      key={it.id || idx}
                      className="p-2.5 flex items-center justify-between text-slate-700"
                    >
                      <div className="truncate pr-2">
                        <span className="font-medium text-slate-900 text-xs block">
                          {it.productName}
                        </span>
                        <span className="text-slate-400 block text-[11px]">
                          Qty: {it.quantity} × ₹
                          {it.unitPrice.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-900 shrink-0 text-xs">
                        ₹
                        {it.total.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              {(() => {
                const currentAllocated = paymentModalSplits.reduce(
                  (acc, p) => acc + (Number(p.amount) || 0),
                  0,
                );
                const prevPaid = selectedSale.paidAmount || 0;
                const balAfter = Math.max(
                  0,
                  selectedSale.grandTotal - (prevPaid + currentAllocated),
                );

                return (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-medium text-slate-800">
                        ₹
                        {selectedSale.subtotal.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>GST Amount:</span>
                      <span className="font-medium text-slate-800">
                        +₹
                        {selectedSale.totalTax.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200 text-xs sm:text-[13px]">
                      <span>Grand Total:</span>
                      <span>
                        ₹
                        {selectedSale.grandTotal.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Previously Paid:</span>
                      <span className="font-medium text-slate-700">
                        ₹
                        {prevPaid.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-700 font-medium">
                      <span>Current Payment:</span>
                      <span className="font-semibold text-emerald-600">
                        ₹
                        {currentAllocated.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#33077C] font-bold pt-1 border-t border-slate-200 text-xs sm:text-[13px]">
                      <span>Balance After Payment:</span>
                      <span className="text-sm">
                        ₹
                        {balAfter.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onViewInvoice();
                }}
                className="w-full h-9 rounded-lg border border-slate-200 hover:border-purple-200 bg-white hover:bg-purple-50/50 text-[#33077C] text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Invoice</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Modal Actions */}
        <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onClose()}
            className="h-10 px-5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-[13px] font-bold transition-all cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-6 rounded-lg bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md shadow-[#33077C]/20 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Confirm Payment</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
