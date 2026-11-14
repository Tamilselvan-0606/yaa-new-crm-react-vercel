import React from "react";
import { Check } from "lucide-react";
import type { SaleTransaction } from "../../../../store/useSalesManagementStore";
import { Modal } from "../../../../components/common/Modal";
import { DateInput } from "../../../../components/common/DateInput";
import { FormError } from "../../../../components/common/FormError";
import { fieldAttr } from "../../../../utils/formValidation";
import { FormLabel, FORM_SELECT_CLS } from "../../utils/formUtils";

export interface AssignableSalesRep {
  id: string;
  name: string;
  mobile?: string;
  status?: string;
}

interface QuickAssignInvoiceModalProps {
  target: SaleTransaction | null;
  isOpen: boolean;
  salesRepresentatives: AssignableSalesRep[];
  assignRepId: string;
  assignRepError?: string;
  assignStatus: string;
  assignNextFollowUp: string;
  onAssignRepIdChange: (id: string) => void;
  onAssignStatusChange: (status: string) => void;
  onNextFollowUpChange: (date: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

/** Quick "assign sales representative" dialog opened from an invoice's action menu. */
export const QuickAssignInvoiceModal: React.FC<QuickAssignInvoiceModalProps> = ({
  target: assignInvoiceTarget,
  isOpen,
  salesRepresentatives,
  assignRepId,
  assignRepError,
  assignStatus,
  assignNextFollowUp,
  onAssignRepIdChange,
  onAssignStatusChange,
  onNextFollowUpChange,
  onClose,
  onSubmit,
}) => {
  if (!assignInvoiceTarget) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Sales Rep to Customer: ${assignInvoiceTarget.customerName}`}
      subtitle={`Assigning a sales representative to ${assignInvoiceTarget.customerName} applies across all customer transactions.`}
      maxWidth="lg"
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4 p-1 text-xs"
      >
        {/* Invoice Quick Summary Banner */}
        <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200/80 flex items-center justify-between">
          <div>
            <span className="font-bold text-[#33077C] text-sm block">
              {assignInvoiceTarget.customerName}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Invoice #{assignInvoiceTarget.invoiceNo} • Grand Total: ₹
              {assignInvoiceTarget.grandTotal.toLocaleString("en-IN")} |
              Due: ₹{assignInvoiceTarget.balance.toLocaleString("en-IN")}
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-[#33077C] border border-purple-200 font-bold text-xs shadow-2xs">
            {assignInvoiceTarget.paymentStatus}
          </span>
        </div>

        {/* Sales Rep Selector */}
        <div>
          <FormLabel required>Sales Representative</FormLabel>
          <select
            value={assignRepId}
            {...fieldAttr("assignRepId")}
            onChange={(e) => {
              onAssignRepIdChange(e.target.value);
            }}
            className={FORM_SELECT_CLS}
          >
            <option value="">-- Select Sales Representative --</option>
            {salesRepresentatives.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.mobile}) - {r.status}
              </option>
            ))}
          </select>
          <FormError message={assignRepError} />
        </div>

        {/* Collection Status */}
        <div>
          <FormLabel>Collection Status</FormLabel>
          <select
            value={assignStatus}
            onChange={(e) => onAssignStatusChange(e.target.value)}
            className={FORM_SELECT_CLS}
          >
            <option value="Pending Follow-up">Pending Follow-up</option>
            <option value="Customer Contacted">Customer Contacted</option>
            <option value="Promise to Pay">Promise to Pay</option>
            <option value="Dispute Raised">Dispute Raised</option>
            <option value="Collected">Collected</option>
          </select>
        </div>

        {/* Next Follow-up Date */}
        <div>
          <FormLabel>Next Follow-up Date (Optional)</FormLabel>
          <DateInput
            value={assignNextFollowUp}
            onChange={(v) => onNextFollowUpChange(v)}
          />
        </div>

        {/* Modal Actions */}
        <div className="pt-3 flex justify-end items-center gap-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onClose();
            }}
            className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Save Assignment</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
