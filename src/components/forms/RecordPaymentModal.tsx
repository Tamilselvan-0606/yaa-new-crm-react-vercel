import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Check,
  Paperclip,
  Upload,
  FileText,
  Building2,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { CustomSelect } from '../common/CustomSelect';
import { SavedInvoice, InvoicePaymentDetails } from '../../store/useInvoiceStore';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SavedInvoice | null;
  onConfirmPayment: (paymentDetails: InvoicePaymentDetails) => void;
}

const inputClass =
  "w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all";
const labelClass = "text-xs sm:text-[13px] font-semibold text-slate-700 block mb-2.5";

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onConfirmPayment,
}) => {
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [taxDeductedType, setTaxDeductedType] = useState<'none' | 'gst' | 'income_tax' | 'both'>('none');
  const [gstTdsPercentage, setGstTdsPercentage] = useState<number | ''>('');
  const [incomeTaxTdsPercentage, setIncomeTaxTdsPercentage] = useState<number | ''>('');
  const [bankDeductions, setBankDeductions] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [referenceId, setReferenceId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [attachments, setAttachments] = useState<
    Array<{ id: string; name: string; size: string; type?: string; dataUrl?: string }>
  >([]);

  // Initialize or reset when modal opens or invoice changes
  useEffect(() => {
    if (isOpen && invoice) {
      const amt = invoice.paymentDetails?.amountPaid || invoice.grandTotal || 0;
      setAmountPaid(amt);
      
      const hasTds = (invoice.paymentDetails?.tdsDeduction || 0) > 0;
      const currentType = (invoice.paymentDetails?.taxDeductedType as any) || (hasTds ? 'income_tax' : 'none');
      setTaxDeductedType(currentType);

      if (currentType === 'gst') {
        setGstTdsPercentage(invoice.paymentDetails?.tdsPercentage ?? (hasTds && amt > 0 ? Math.round(((invoice.paymentDetails?.tdsDeduction || 0) / amt) * 10000) / 100 : ''));
        setIncomeTaxTdsPercentage('');
      } else if (currentType === 'income_tax') {
        setIncomeTaxTdsPercentage(invoice.paymentDetails?.tdsPercentage ?? (hasTds && amt > 0 ? Math.round(((invoice.paymentDetails?.tdsDeduction || 0) / amt) * 10000) / 100 : ''));
        setGstTdsPercentage('');
      } else if (currentType === 'both') {
        const gstPct = (invoice.paymentDetails as any)?.gstTdsPercentage ?? '';
        const itPct = (invoice.paymentDetails as any)?.incomeTaxTdsPercentage ?? '';
        setGstTdsPercentage(gstPct);
        setIncomeTaxTdsPercentage(itPct);
      } else {
        setGstTdsPercentage('');
        setIncomeTaxTdsPercentage('');
      }

      setBankDeductions(invoice.paymentDetails?.bankDeductions || 0);
      // Always reset to 'Select Payment Mode' on open
      setPaymentMode('');
      setPaymentDate(invoice.paymentDetails?.paymentDate || new Date().toISOString().split('T')[0]);
      setReferenceId(invoice.paymentDetails?.referenceId || '');
      setNotes(invoice.paymentDetails?.notes || '');
      setAttachments(invoice.paymentDetails?.attachments || []);
    } else if (!isOpen) {
      setPaymentMode('');
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  // Compute TDS Deduction based on percentage only
  const gstPctNum = taxDeductedType === 'gst' || taxDeductedType === 'both' ? (Number(gstTdsPercentage) || 0) : 0;
  const itPctNum = taxDeductedType === 'income_tax' || taxDeductedType === 'both' ? (Number(incomeTaxTdsPercentage) || 0) : 0;
  const gstTdsAmount = Math.round((amountPaid || 0) * (gstPctNum / 100) * 100) / 100;
  const itTdsAmount = Math.round((amountPaid || 0) * (itPctNum / 100) * 100) / 100;
  const tdsDeduction = gstTdsAmount + itTdsAmount;

  // Net Amount Received Calculation
  const netReceived = Math.max(
    0,
    (Number(amountPaid) || 0) - tdsDeduction - (Number(bankDeductions) || 0)
  );

  // File Upload Handlers
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const sizeFormatted =
          file.size < 1024
            ? `${file.size} B`
            : file.size < 1024 * 1024
            ? `${(file.size / 1024).toFixed(1)} KB`
            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

        setAttachments((prev) => [
          ...prev,
          {
            id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: file.name,
            size: sizeFormatted,
            type: file.type,
            dataUrl,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isTaxDeducted = taxDeductedType !== 'none';
    const gstPct = typeof gstTdsPercentage === 'number' ? gstTdsPercentage : parseFloat(String(gstTdsPercentage)) || 0;
    const itPct = typeof incomeTaxTdsPercentage === 'number' ? incomeTaxTdsPercentage : parseFloat(String(incomeTaxTdsPercentage)) || 0;
    
    let sectionLabel: string | undefined = undefined;
    if (taxDeductedType === 'both') {
      sectionLabel = `TDS (GST ${gstPct}% + IT ${itPct}%)`;
    } else if (taxDeductedType === 'gst' && gstPct > 0) {
      sectionLabel = `TDS/TCS (GST ${gstPct}%)`;
    } else if (taxDeductedType === 'income_tax' && itPct > 0) {
      sectionLabel = `TDS (Income Tax ${itPct}%)`;
    }

    const primaryPct = taxDeductedType === 'both' ? (gstPct + itPct) : taxDeductedType === 'gst' ? gstPct : itPct;

    const paymentDetails: InvoicePaymentDetails = {
      amountPaid: Number(amountPaid) || 0,
      taxDeductedType,
      tdsSection: sectionLabel,
      tdsPercentage: isTaxDeducted && primaryPct > 0 ? primaryPct : undefined,
      gstTdsPercentage: (taxDeductedType === 'gst' || taxDeductedType === 'both') && gstPct > 0 ? gstPct : undefined,
      incomeTaxTdsPercentage: (taxDeductedType === 'income_tax' || taxDeductedType === 'both') && itPct > 0 ? itPct : undefined,
      tdsDeduction: isTaxDeducted ? tdsDeduction : 0,
      bankDeductions: Number(bankDeductions) || 0,
      netReceived,
      paymentMode,
      paymentDate,
      referenceId: referenceId.trim() || undefined,
      notes: notes.trim() || undefined,
      attachments,
      recordedAt: new Date().toISOString(),
    };
    onConfirmPayment(paymentDetails);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      subtitle="Log customer payment details and tax deductions"
      maxWidth="4xl"
      headerGradient={true}
      showBackIcon={true}
      hideCloseButton={true}
    >
      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        {/* Highlighted Invoice Summary Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 via-[#33077C]/[0.02] to-indigo-50/30 border border-slate-200/90 rounded-[4px] shadow-2xs">
          <div className="min-w-0">
            <div className="text-xs sm:text-[13px] font-bold text-slate-900 font-sans">
              Invoice #{invoice.invoiceNumber}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{invoice.client.company}</span>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Invoice Amount
            </span>
            <span className="text-base font-extrabold text-[#33077C] font-sans">
              ${invoice.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* 3 Fields Per Row Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Field 1: Amount Paid */}
          <div>
            <label className={labelClass}>
              Amount Paid (₹) <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={amountPaid || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setAmountPaid(val);
                }}
                className={`${inputClass} pl-7 font-semibold text-slate-800`}
              />
            </div>
          </div>

          {/* Field 2: Payment Date */}
          <div>
            <label className={labelClass}>
              Payment Date <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Field 3: Payment Mode */}
          <div>
            <label className={labelClass}>
              Payment Mode <span className="text-rose-500 font-bold">*</span>
            </label>
            <CustomSelect
              value={paymentMode}
              onChange={(val) => setPaymentMode(val)}
              placeholder="Select Payment Mode"
              activeColor="brand"
              options={[
                'Bank Transfer (NEFT / RTGS)',
                'UPI / QR Code',
                'Credit / Debit Card',
                'Cheque / Demand Draft',
                'Cash',
                'Online Gateway',
                'Other',
              ]}
            />
            <input
              type="text"
              className="sr-only"
              required
              value={paymentMode}
              onChange={() => {}}
            />
          </div>

          {/* Field 4: Bank Charges / Deductions */}
          <div>
            <label className={labelClass}>Bank Charges / Deductions (₹)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={bankDeductions || ''}
                onChange={(e) => setBankDeductions(parseFloat(e.target.value) || 0)}
                className={`${inputClass} pl-7`}
              />
            </div>
          </div>

          {/* Field 5: Reference / Transaction # */}
          <div>
            <label className={labelClass}>Reference / Transaction #</label>
            <input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Field 6: Attachments */}
          <div>
            <label className={labelClass}>Attachments</label>
            <label className="flex items-center gap-3 cursor-pointer group">
              {/* Circle preview */}
              <div className="w-11 h-11 shrink-0 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                {attachments.length > 0 && attachments[0].dataUrl && attachments[0].type?.startsWith('image/') ? (
                  <img src={attachments[0].dataUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <Paperclip className="w-4 h-4 text-slate-400" />
                )}
              </div>
              {/* Upload button */}
              <span className="flex-1 h-11 px-4 bg-white hover:bg-slate-50 text-[#33077C] border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-semibold flex items-center gap-2 transition-all">
                <Upload className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {attachments.length === 0 ? 'Upload Files' : `${attachments.length} file(s) selected`}
                </span>
              </span>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </label>
          </div>
        </div>

        {/* Attached file chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-[4px] text-xs transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-700 max-w-[180px] truncate">{att.name}</span>
                <span className="text-[10px] text-slate-400 font-normal">({att.size})</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="text-slate-400 hover:text-rose-600 transition-colors ml-1 p-0.5"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Row 4: Tax Deducted */}
        <div className="pt-6 border-t border-slate-100">
          <div>
            <label className={labelClass}>Tax deducted?</label>
            <div className="flex flex-wrap items-center gap-2.5 pt-1 pb-2">
              {[
                { id: 'none', label: 'No Tax deducted' },
                { id: 'gst', label: 'TDS / TCS (GST)' },
                { id: 'income_tax', label: 'TDS (Income Tax)' },
                { id: 'both', label: 'Both (GST + IT)' },
              ].map((opt) => {
                const isSelected = taxDeductedType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTaxDeductedType(opt.id as any);
                      if (opt.id === 'none') {
                        setGstTdsPercentage('');
                        setIncomeTaxTdsPercentage('');
                      } else if (opt.id === 'gst') {
                        setIncomeTaxTdsPercentage('');
                      } else if (opt.id === 'income_tax') {
                        setGstTdsPercentage('');
                      }
                    }}
                    className={`h-10 px-4 rounded-[4px] text-xs sm:text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-[#33077C] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 stroke-[3] text-white" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Separate Percentage Inputs */}
          {taxDeductedType !== 'none' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pb-5 animate-in fade-in duration-200">
              {(taxDeductedType === 'gst' || taxDeductedType === 'both') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs sm:text-[13px] font-semibold text-slate-700">
                      TDS / TCS (GST) Percentage (%) <span className="text-rose-500 font-bold">*</span>
                    </label>
                    {gstTdsAmount > 0 && (
                      <span className="text-xs font-bold text-emerald-600">
                        = ₹{gstTdsAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={gstTdsPercentage !== '' ? gstTdsPercentage : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                        setGstTdsPercentage(val);
                      }}
                      className={`${inputClass} pr-8`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">%</span>
                  </div>
                </div>
              )}

              {(taxDeductedType === 'income_tax' || taxDeductedType === 'both') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs sm:text-[13px] font-semibold text-slate-700">
                      TDS (Income Tax) Percentage (%) <span className="text-rose-500 font-bold">*</span>
                    </label>
                    {itTdsAmount > 0 && (
                      <span className="text-xs font-bold text-emerald-600">
                        = ₹{itTdsAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={incomeTaxTdsPercentage !== '' ? incomeTaxTdsPercentage : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                        setIncomeTaxTdsPercentage(val);
                      }}
                      className={`${inputClass} pr-8`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Net Settlement Received Summary */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-[4px]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Net Settlement Received:</span>
              {(Number(tdsDeduction || 0) > 0 || Number(bankDeductions || 0) > 0) && (
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  (₹{Number(amountPaid || 0).toFixed(2)} - ₹{(Number(tdsDeduction || 0) + Number(bankDeductions || 0)).toFixed(2)} deductions)
                </span>
              )}
            </div>
            <span className="text-base font-extrabold text-[#33077C] font-sans">
              ₹{netReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Row 5: Notes & Remarks */}
        <div className="pt-2">
          <label className={labelClass}>Payment Notes & Remarks</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all shadow-2xs"
          />
        </div>



        {/* Modal Footer */}
        <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-[4px] text-sm border border-slate-200 transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>

          <button
            type="submit"
            className="h-11 px-6 bg-[#33077C] hover:bg-[#4309A2] text-white font-bold rounded-[4px] text-sm transition-all shadow-md shadow-[#33077C]/20 hover:shadow-lg hover:shadow-[#33077C]/30 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {Number(amountPaid) > 0 && Number(amountPaid) < (invoice.grandTotal - 0.001)
                ? 'Record Partial Payment'
                : 'Mark as Paid'}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
