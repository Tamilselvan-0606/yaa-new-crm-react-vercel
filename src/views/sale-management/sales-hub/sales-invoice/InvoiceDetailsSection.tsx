import React from "react";
import type { SaleTransaction } from "../../../../store/useSalesManagementStore";
import type {
  SalesInvoiceFormData,
  SalesInvoiceTotals,
} from "./salesInvoiceTypes";
import { type FieldErrors, fieldAttr } from "../../../../utils/formValidation";
import { AlertCircle, Calendar } from "lucide-react";
import { CustomerSearchableSelect } from "../../../../components/common/paginated-select";
import { DateInput } from "../../../../components/common/DateInput";
import { FormError } from "../../../../components/common/FormError";
import { isoToDdmmyyyy, ddmmyyyyToIso } from "./salesInvoiceFormat";

interface SelectedCustomerFinancials {
  creditLimit: number;
  outstandingAmount: number;
  availableCredit: number;
}

interface InvoiceDetailsSectionProps {
  formData: SalesInvoiceFormData;
  setFormData: React.Dispatch<React.SetStateAction<SalesInvoiceFormData>>;
  formErrors: FieldErrors;
  clearFormError: (key: string) => void;
  editingSale: SaleTransaction | null;
  computedPreviewNo: string;
  calculatedTotals: SalesInvoiceTotals;
  selectedCustomerFinancials: SelectedCustomerFinancials | null;
  handleCustomerChange: (customerId: string) => void;
  setIsAddCustomerModalOpen: (open: boolean) => void;
}

/** Customer, invoice number / dates, shipping and credit-limit details at the top of the invoice form. */
export const InvoiceDetailsSection: React.FC<InvoiceDetailsSectionProps> = ({
  formData,
  setFormData,
  formErrors,
  clearFormError,
  editingSale,
  computedPreviewNo,
  calculatedTotals,
  selectedCustomerFinancials,
  handleCustomerChange,
  setIsAddCustomerModalOpen,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Row 1, Col 1: Customer Selection & Quick Add */}
      <div>
        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
          Customer / Client <span className="text-slate-500">*</span>
        </label>
        <div {...fieldAttr("customer")}>
          <CustomerSearchableSelect
            value={formData.customerId}
            onChange={(val, cust) => {
              clearFormError("customer");
              handleCustomerChange(val);
              if (cust) {
                setFormData((prev) => ({
                  ...prev,
                  customerName: cust.name,
                  customerCompany: cust.company || "",
                  customerPhone: cust.phone || "",
                  customerEmail: cust.email || "",
                  billingAddress:
                    cust.billingAddress || cust.address || "",
                }));
              }
            }}
            selectedCustomer={
              formData.customerId
                ? {
                    id: formData.customerId,
                    name: formData.customerName,
                    company: formData.customerCompany,
                    phone: formData.customerPhone,
                  }
                : null
            }
            onAddNewCustomer={() => {
              setIsAddCustomerModalOpen(true);
            }}
          />
        </div>
        <FormError message={formErrors.customer} />
      </div>

      {/* Row 1, Col 2: Customer Name */}
      <div>
        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
          Customer Name
        </label>
        <input
          type="text"
          value={formData.customerName}
          onChange={(e) => {
            clearFormError("customer");
            setFormData((prev) => ({
              ...prev,
              customerName: e.target.value,
            }));
          }}
          required
          placeholder="Customer Name"
          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
        />
      </div>

      {/* Row 1, Col 3: Invoice Number / Sale Number */}
      <div>
        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
          Invoice S.No.
        </label>
        <input
          type="text"
          value={
            editingSale
              ? formData.invoiceNo
              : formData.invoiceNo || computedPreviewNo
          }
          readOnly
          placeholder="Auto-generated on save"
          className="w-full h-11 px-4 bg-purple-50/70 border border-purple-200/90 rounded-xl text-xs sm:text-[13px] font-bold text-[#33077C] font-mono outline-none cursor-default"
        />
      </div>

      {/* Invoice No (manual entry) */}
      <div>
        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
          Invoice No
        </label>
        <input
          type="text"
          value={formData.salesInvoiceManualNo || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              salesInvoiceManualNo: e.target.value,
            })
          }
          placeholder="Enter Invoice No"
          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
        />
      </div>

      {/* Row 2, Col 2: Date */}
      <div>
        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
          Date
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="dd/mm/yyyy"
            value={isoToDdmmyyyy(formData.saleDate)}
            {...fieldAttr("saleDate")}
            onChange={(e) => {
              const iso = ddmmyyyyToIso(e.target.value);
              clearFormError("saleDate");
              clearFormError("dueDate");
              setFormData((prev) => ({
                ...prev,
                saleDate: iso || e.target.value,
              }));
            }}
            required
            className="w-full h-11 pl-4 pr-11 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
          />
          <label className="absolute right-3 text-slate-400 hover:text-[#33077C] cursor-pointer transition-colors p-1">
            <Calendar className="w-4 h-4" />
            <DateInput
              value={formData.saleDate}
              onChange={(v) =>
                ((e) => {
                  if (e.target.value) {
                    clearFormError("saleDate");
                    clearFormError("dueDate");
                    setFormData((prev) => ({
                      ...prev,
                      saleDate: e.target.value,
                    }));
                  }
                })({ target: { value: v } } as any)
              }
            />
          </label>
        </div>
        <FormError message={formErrors.saleDate} />
      </div>

      {/* Row 2, Col 3: Expiry Date */}
      <div>
        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
          Expiry Date
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="dd/mm/yyyy"
            value={isoToDdmmyyyy(formData.dueDate)}
            {...fieldAttr("dueDate")}
            onChange={(e) => {
              const iso = ddmmyyyyToIso(e.target.value);
              clearFormError("dueDate");
              setFormData((prev) => ({
                ...prev,
                dueDate: iso || e.target.value,
              }));
            }}
            required
            className="w-full h-11 pl-4 pr-11 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
          />
          <label className="absolute right-3 text-slate-400 hover:text-[#33077C] cursor-pointer transition-colors p-1">
            <Calendar className="w-4 h-4" />
            <DateInput
              value={formData.dueDate}
              onChange={(v) =>
                ((e) => {
                  if (e.target.value) {
                    clearFormError("dueDate");
                    setFormData((prev) => ({
                      ...prev,
                      dueDate: e.target.value,
                    }));
                  }
                })({ target: { value: v } } as any)
              }
            />
          </label>
        </div>
        <FormError message={formErrors.dueDate} />
      </div>

      {/* Row 3, Col 1: Email Communications */}
      <div>
        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
          Email Communications
        </label>
        <input
          type="email"
          value={formData.customerEmail}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              customerEmail: e.target.value,
            }))
          }
          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
        />
      </div>

      {/* Row 3, Col 2: Contact Number */}
      <div>
        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
          Contact Number
        </label>
        <input
          type="tel"
          value={formData.customerPhone}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              customerPhone: e.target.value,
            }))
          }
          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
        />
      </div>

      {/* Row 3, Col 3: Address */}
      <div>
        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
          Address
        </label>
        <input
          type="text"
          value={formData.billingAddress}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              billingAddress: e.target.value,
              shippingAddress: e.target.value,
            }))
          }
          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
        />
      </div>

      {/* Row 4: Customer Credit & Financials Summary Pill */}
      {selectedCustomerFinancials && (
        <div className="md:col-span-3 p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <span className="font-semibold text-slate-500">
                Credit Limit:
              </span>
              <span className="font-mono font-bold">
                ₹
                {selectedCustomerFinancials.creditLimit.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <span className="font-semibold text-slate-500">
                Current Outstanding:
              </span>
              <span
                className={`font-mono font-bold ${selectedCustomerFinancials.outstandingAmount > 0 ? "text-amber-600" : "text-slate-700"}`}
              >
                ₹
                {selectedCustomerFinancials.outstandingAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <span className="font-semibold text-slate-500">
                Available Credit:
              </span>
              <span className="font-mono font-bold text-emerald-600">
                ₹
                {selectedCustomerFinancials.availableCredit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Credit Exceeded Warning Pill */}
          {selectedCustomerFinancials.creditLimit > 0 &&
            calculatedTotals.grandTotal >
              selectedCustomerFinancials.availableCredit && (
              <div className="flex items-center gap-1.5 text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shadow-2xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  ⚠ Customer credit limit exceeded by ₹
                  {(
                    calculatedTotals.grandTotal -
                    selectedCustomerFinancials.availableCredit
                  ).toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
            )}
        </div>
      )}

      {/* Row 5: Note */}
      <div className="md:col-span-3">
        <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
          Note
        </label>
        <input
          type="text"
          placeholder="e.g. Looking forward for your business."
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              notes: e.target.value,
            }))
          }
          className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
        />
      </div>
    </div>
  );
};
