import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ArrowRight, Ban, CheckCircle2, Info, Loader2, X } from 'lucide-react';

export interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  /** Status the record will move to. */
  nextStatus: 'Active' | 'Inactive';
  /** Record type, e.g. "Customer". */
  entityName: string;
  recordName?: string;
  isLoading?: boolean;
}

const TONE = {
  Active: { accent: '#10B981', hover: '#059669', soft: 'bg-emerald-50', ring: 'ring-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', pill: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  Inactive: { accent: '#64748B', hover: '#475569', soft: 'bg-slate-100', ring: 'ring-slate-200/70', text: 'text-slate-700', dot: 'bg-slate-500', pill: 'bg-slate-100 border-slate-200 text-slate-600' },
} as const;

const StatusPill: React.FC<{ status: 'Active' | 'Inactive'; muted?: boolean }> = ({ status, muted }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold ${TONE[status].pill} ${muted ? 'opacity-60' : 'shadow-2xs'}`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${TONE[status].dot}`} />
    {status}
  </span>
);

/**
 * Activate / Deactivate confirmation for the sale-management modules. Built on the same `Modal`
 * (deep-purple #33077C gradient header, back arrow, subtitle) and button styling as DeleteConfirmationModal,
 * with the Actions-menu colours: Activate = emerald #10B981, Deactivate = slate #64748B.
 */
export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  nextStatus,
  entityName,
  recordName,
  isLoading = false,
}) => {
  const activating = nextStatus === 'Active';
  const currentStatus = activating ? 'Inactive' : 'Active';
  const tone = TONE[nextStatus];
  const Icon = activating ? CheckCircle2 : Ban;
  const verb = activating ? 'Activate' : 'Deactivate';
  const entityLower = entityName.toLowerCase();
  const close = () => {
    if (!isLoading) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={`${verb} ${entityName}`}
      subtitle={`Confirm ${entityLower} status change`}
      maxWidth="md"
      headerGradient={true}
      showBackIcon={true}
      hideCloseButton={isLoading}
      onBack={close}
      closeOnOutsideClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="p-0.5 sm:p-1 text-xs font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full ${tone.soft} ring-8 ${tone.ring} flex items-center justify-center`}>
            <Icon className="w-8 h-8 stroke-[2.2]" style={{ color: tone.accent }} />
          </div>
          <h4 className="mt-4 text-[15px] font-bold text-slate-900 tracking-tight">
            Mark this {entityLower} as {nextStatus}?
          </h4>
          {recordName && (
            <span className="mt-2 max-w-full truncate font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 text-[13px]">
              {recordName}
            </span>
          )}
        </div>

        {/* Status transition */}
        <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3.5">
          <StatusPill status={currentStatus} muted />
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
          <StatusPill status={nextStatus} />
        </div>

        {/* Note */}
        <div className="mt-3 flex items-start gap-2 px-1 text-[11.5px] leading-relaxed text-slate-500">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
          <p>
            {activating
              ? `The ${entityLower} will be marked Active again.`
              : `The ${entityLower} will be marked Inactive.`}{' '}
            You can change this back at any time from the Actions menu.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={isLoading}
            onClick={close}
            icon={<X className="w-4 h-4 text-slate-500" />}
            className="w-full sm:w-auto h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs"
          >
            Cancel
          </Button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="w-full sm:w-auto h-10 px-5 rounded-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            style={{ backgroundColor: tone.accent }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = tone.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = tone.accent;
            }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Icon className="w-4 h-4 stroke-[2.2] text-white" />
            )}
            <span>{isLoading ? 'Updating...' : activating ? 'Yes, Activate' : 'Yes, Inactive'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StatusChangeModal;
