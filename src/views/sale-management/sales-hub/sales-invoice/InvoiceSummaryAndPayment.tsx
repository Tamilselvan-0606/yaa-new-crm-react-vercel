import React from "react";
import type {
  SaleTransaction,
} from "../../../../store/useSalesManagementStore";
import { type FieldErrors, fieldAttr } from "../../../../utils/formValidation";
import { FormError } from "../../../../components/common/FormError";
import { handleNonNegativeKeyDown } from "../../utils/formUtils";
import { SplitPaymentSection } from "../../purchase/SplitPaymentSection";
import { SALES_SPLIT_PAYMENT_METHODS } from "../../../../utils/splitPayments";
import type {
  SplitPaymentRow,
  SplitSummary,
  SplitValidation,
} from "../../../../utils/splitPayments";
import type {
  SalesInvoiceFormData,
  SalesInvoiceTotals,
} from "./salesInvoiceTypes";

interface InvoiceSummaryAndPaymentProps {
  formData: SalesInvoiceFormData;
  setFormData: React.Dispatch<React.SetStateAction<SalesInvoiceFormData>>;
  calculatedTotals: SalesInvoiceTotals;
  clearFormError: (key: string) => void;
  mergeFormErrors: (extra: FieldErrors) => void;
  formErrors: FieldErrors;
  editingSale: SaleTransaction | null;
  switchPaymentMode: (split: boolean) => void;
  isSplitMode: boolean;
  splitRows: SplitPaymentRow[];
  setSplitRows: React.Dispatch<React.SetStateAction<SplitPaymentRow[]>>;
  splitSummary: SplitSummary;
  splitValidation: SplitValidation;
  splitShowErrors: boolean;
  isActionLoading: boolean;
}

/** Notes, charges / round-off, totals and payment (single or split) section of the invoice form. */
export const InvoiceSummaryAndPayment: React.FC<
  InvoiceSummaryAndPaymentProps
> = ({
  formData,
  setFormData,
  calculatedTotals,
  clearFormError,
  mergeFormErrors,
  formErrors,
  editingSale,
  switchPaymentMode,
  isSplitMode,
  splitRows,
  setSplitRows,
  splitSummary,
  splitValidation,
  splitShowErrors,
  isActionLoading,
}) => {
  return (
    <div className="pt-6 border-t border-slate-200/80 flex flex-col md:flex-row items-start justify-between gap-6">
      {/* LEFT CARD: Notes / Instructions & Details */}
      <div className="w-full md:w-1/2 space-y-4">
        <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <label className="text-xs sm:text-sm font-bold text-slate-800 block">
            Notes / Instructions
          </label>
          <textarea
            rows={6}
            value={formData.notes || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
            placeholder="Carrier instructions, delivery address, customer notes..."
            className="w-full p-3.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#33077C] focus:ring-4 focus:ring-[#33077C]/10 transition-all resize-none"
          />
        </div>

        {/* Payment Terms & Tax Mode Info */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-600">
            <span className="font-semibold">Taxation Mode:</span>
            <span className="font-bold text-slate-800">
              {formData.withGst
                ? formData.gstType === "inter_state"
                  ? "With GST • Inter-State (IGST)"
                  : "With GST • Intra-State (CGST+SGST)"
                : "Without GST (Exempt)"}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="font-semibold">Payment Terms:</span>
            <span className="font-bold text-[#33077C]">
              {formData.paymentTerms || "Net 15 Days"}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT CARD: Billing Summary (Exact layout matching Image 1) */}
      <div className="w-full md:w-1/2 flex justify-end">
        <div className="w-full max-w-[495px] bg-white rounded-[4px] border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Billing Summary
            </h2>
          </div>

          {/* Body */}
          <div className="p-5 space-y-3.5 flex-1">
            {/* 1. Sub Total & Discount & Amount (After Discount) */}
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Sub Total:</span>
                <span className="font-bold text-slate-900 text-sm">
                  ₹
                  {calculatedTotals.subtotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Discount:</span>
                <span
                  className={`font-bold text-sm ${
                    calculatedTotals.totalDiscount > 0
                      ? "text-rose-600"
                      : "text-slate-900"
                  }`}
                >
                  {calculatedTotals.totalDiscount > 0
                    ? `-₹${calculatedTotals.totalDiscount.toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}`
                    : "₹0.00"}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-700 font-semibold pt-2 border-t border-slate-100">
                <span>Amount (After Discount):</span>
                <span className="font-bold text-slate-900 text-sm">
                  ₹
                  {calculatedTotals.taxableAmount.toLocaleString(
                    "en-IN",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                </span>
              </div>
            </div>

            {/* 2. CGST & SGST (or IGST) & Total GST */}
            {formData.withGst ? (
              <div className="pt-3 pb-1 border-t border-slate-100 space-y-2.5 text-sm">
                {formData.gstType === "intra_state" ? (
                  <>
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                      <span>CGST:</span>
                      <span className="font-bold text-slate-900">
                        ₹
                        {calculatedTotals.cgst.toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                      <span>SGST:</span>
                      <span className="font-bold text-slate-900">
                        ₹
                        {calculatedTotals.sgst.toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>IGST:</span>
                    <span className="font-bold text-slate-900">
                      ₹
                      {calculatedTotals.igst.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-800 font-bold pt-2 border-t border-dashed border-slate-200/80">
                  <span>Total GST:</span>
                  <span className="font-bold text-slate-900">
                    ₹
                    {calculatedTotals.totalTax.toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="pt-3 pb-1 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
                <span>GST (Without GST):</span>
                <span className="font-medium text-slate-500">
                  ₹0.00 (Exempt)
                </span>
              </div>
            )}

            {/* Freight / Shipping */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm">
              <span className="text-slate-600 font-medium">
                Freight / Shipping:
              </span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#33077C] font-bold text-xs sm:text-sm">
                  ₹
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={
                    formData.shippingCharges === 0
                      ? ""
                      : formData.shippingCharges
                  }
                  placeholder="0"
                  {...fieldAttr("shippingCharges")}
                  onKeyDown={handleNonNegativeKeyDown}
                  onChange={(e) => {
                    clearFormError("shippingCharges");
                    clearFormError("totals");
                    const raw = e.target.value.replace(
                      /[^0-9.]/g,
                      "",
                    );
                    if (raw === "") {
                      setFormData((prev) => ({
                        ...prev,
                        shippingCharges: 0,
                      }));
                      return;
                    }
                    const parts = raw.split(".");
                    const clean =
                      parts.length > 2
                        ? `${parts[0]}.${parts.slice(1).join("")}`
                        : raw;
                    const num = Math.max(0, parseFloat(clean) || 0);
                    setFormData((prev) => ({
                      ...prev,
                      shippingCharges: num,
                    }));
                  }}
                  className="w-28 h-9 text-right pl-6 pr-2.5 bg-white border-2 border-[#33077C] rounded-[6px] text-xs sm:text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#33077C]/20 shadow-2xs transition-all"
                />
              </div>
            </div>
            <FormError
              message={formErrors.shippingCharges}
              className="justify-end"
            />

            {/* 3. Rounding Adjustment */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Rounding Adjustment
                </label>
                <span className="text-[11px] text-slate-400">
                  click to apply
                </span>
              </div>

              <div className="space-y-2">
                {/* Round Down */}
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      roundMode:
                        prev.roundMode === "down" ? "none" : "down",
                    }))
                  }
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                    formData.roundMode === "down"
                      ? "bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-2xs"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        formData.roundMode === "down"
                          ? "border-amber-600 bg-amber-600"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {formData.roundMode === "down" && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </div>
                    <span className="text-xs">Round Down</span>
                  </div>
                  <span className="font-bold text-xs">
                    {calculatedTotals.roundDownDiff === 0
                      ? "₹0.00"
                      : `-₹${Math.abs(calculatedTotals.roundDownDiff).toFixed(2)}`}
                  </span>
                </button>

                {/* Round Up */}
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      roundMode:
                        prev.roundMode === "up" ? "none" : "up",
                    }))
                  }
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                    formData.roundMode === "up"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        formData.roundMode === "up"
                          ? "border-emerald-600 bg-emerald-600"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {formData.roundMode === "up" && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </div>
                    <span className="text-xs">Round Up</span>
                  </div>
                  <span className="font-bold text-xs">
                    {calculatedTotals.roundUpDiff === 0
                      ? "₹0.00"
                      : `+₹${calculatedTotals.roundUpDiff.toFixed(2)}`}
                  </span>
                </button>
              </div>
            </div>

            {/* 4. Grand Total Banner */}
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
                ₹
                {calculatedTotals.grandTotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div {...fieldAttr("totals")}>
              <FormError message={formErrors.totals} />
            </div>

            {/* 5. Paid Amount & Balance Due */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              {!editingSale && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-emerald-700">
                    Payment Received
                  </span>
                  <div
                    className="inline-flex rounded-lg border border-slate-200 overflow-hidden"
                    role="group"
                    aria-label="Payment mode"
                  >
                    <button
                      type="button"
                      onClick={() => switchPaymentMode(false)}
                      className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors ${!isSplitMode ? "bg-[#33077C] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      Single Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => switchPaymentMode(true)}
                      className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors border-l border-slate-200 ${isSplitMode ? "bg-[#33077C] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      Split Payment
                    </button>
                  </div>
                </div>
              )}

              {isSplitMode && !editingSale ? (
                <SplitPaymentSection
                  rows={splitRows}
                  onChange={setSplitRows}
                  summary={splitSummary}
                  alreadyPaid={0}
                  validation={splitValidation}
                  showErrors={splitShowErrors}
                  disabled={isActionLoading}
                  extraError={formErrors.paidAmount}
                  methods={SALES_SPLIT_PAYMENT_METHODS}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-700">
                      Paid Amount:
                    </span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs">
                        ₹
                      </span>
                      <input
                        id="sales-invoice-paid-amount"
                        type="text"
                        inputMode="decimal"
                        value={
                          formData.paidAmount === 0
                            ? ""
                            : formData.paidAmount
                        }
                        placeholder="0"
                        {...fieldAttr("paidAmount")}
                        onKeyDown={handleNonNegativeKeyDown}
                        onChange={(e) => {
                          clearFormError("paidAmount");
                          clearFormError("paymentMethod");
                          clearFormError("totals");
                          const raw = e.target.value.replace(
                            /[^0-9.]/g,
                            "",
                          );
                          if (raw === "") {
                            setFormData((prev) => ({
                              ...prev,
                              paidAmount: 0,
                              paymentSplits:
                                prev.paymentSplits.length > 0
                                  ? [
                                      {
                                        ...prev.paymentSplits[0],
                                        amount: 0,
                                      },
                                    ]
                                  : [
                                      {
                                        id: "ps_1",
                                        method:
                                          prev.paymentMethod ||
                                          "Bank Transfer",
                                        amount: 0,
                                        referenceNo: "",
                                      },
                                    ],
                            }));
                            return;
                          }
                          const parts = raw.split(".");
                          const clean =
                            parts.length > 2
                              ? `${parts[0]}.${parts.slice(1).join("")}`
                              : raw;
                          const cleanDecimals =
                            parts.length === 2 && parts[1].length > 2
                              ? `${parts[0]}.${parts[1].slice(0, 2)}`
                              : clean;
                          let newAmount = parseFloat(cleanDecimals);
                          let typed = cleanDecimals;
                          if (isNaN(newAmount) || newAmount < 0) {
                            newAmount = 0;
                          }
                          // More than the invoice total cannot be paid: hold the amount at the total and say why, inline.
                          const invoiceTotal =
                            calculatedTotals.grandTotal;
                          if (
                            invoiceTotal > 0 &&
                            newAmount > invoiceTotal + 0.005
                          ) {
                            newAmount = invoiceTotal;
                            typed = String(invoiceTotal);
                            mergeFormErrors({
                              paidAmount: `Paid amount cannot exceed the invoice total of ₹${invoiceTotal.toFixed(2)}.`,
                            });
                          }
                          setFormData((prev) => ({
                            ...prev,
                            paidAmount: typed.endsWith(".")
                              ? (typed as any)
                              : newAmount,
                            paymentSplits:
                              prev.paymentSplits.length > 0
                                ? [
                                    {
                                      ...prev.paymentSplits[0],
                                      amount: newAmount,
                                    },
                                  ]
                                : [
                                    {
                                      id: "ps_1",
                                      method:
                                        prev.paymentMethod ||
                                        "Bank Transfer",
                                      amount: newAmount,
                                      referenceNo: "",
                                    },
                                  ],
                          }));
                        }}
                        onBlur={() => {
                          const num = Math.max(
                            0,
                            parseFloat(String(formData.paidAmount)) ||
                              0,
                          );
                          // Normalise only; over-payment is reported inline on submit.
                          const clamped = num;
                          setFormData((prev) => ({
                            ...prev,
                            paidAmount: clamped,
                            paymentSplits:
                              prev.paymentSplits.length > 0
                                ? [
                                    {
                                      ...prev.paymentSplits[0],
                                      amount: clamped,
                                    },
                                  ]
                                : [
                                    {
                                      id: "ps_1",
                                      method:
                                        prev.paymentMethod ||
                                        "Bank Transfer",
                                      amount: clamped,
                                      referenceNo: "",
                                    },
                                  ],
                          }));
                        }}
                        className="w-32 h-8.5 text-right pl-6 pr-2.5 bg-white border-2 border-emerald-600 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-500/20 rounded-[6px] font-bold text-emerald-700 text-xs outline-none shadow-2xs transition-all"
                      />
                    </div>
                  </div>
                  <FormError
                    message={
                      formErrors.paidAmount ||
                      formErrors.paymentMethod
                    }
                    className="justify-end"
                  />
                </>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm">
                <span className="font-bold text-slate-800">
                  Total Balance:
                </span>
                <span
                  className={`font-bold text-sm ${
                    calculatedTotals.balance > 0
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}
                >
                  ₹
                  {calculatedTotals.balance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
