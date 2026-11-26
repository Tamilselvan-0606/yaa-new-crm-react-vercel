import React from 'react';
import { Ban, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  /** Status the record will move to. */
  nextStatus: 'Active' | 'Inactive' | 'Suspended';
  /** Record type, e.g. "Branch" or "Firm". */
  entityName: string;
  recordName?: string;
  itemName?: string;
  isLoading?: boolean;
}

/**
 * Clean centered Confirmation Modal for status changes (Active / Inactive / Suspended)
 * exactly matching the design in the user's reference image:
 * - Centered circular icon in soft rounded background
 * - Bold title "Deactivate Branch" / "Suspend Branch" / "Activate Branch"
 * - Clear prompt "Are you sure you want to mark {name} as {status}?"
 * - White Cancel button + Colored solid action button side-by-side
 */
export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  nextStatus = 'Active',
  entityName,
  recordName,
  itemName,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const displayName = recordName || itemName || `this ${entityName.toLowerCase()}`;
  const activating = nextStatus === 'Active';
  const suspending = nextStatus === 'Suspended';

  // Title: "Activate Firm", "Deactivate Firm", "Suspend Firm"
  const title = activating
    ? `Activate ${entityName}`
    : suspending
    ? `Suspend ${entityName}`
    : `Deactivate ${entityName}`;

  // Button text
  const confirmButtonText = activating
    ? 'Yes, Activate'
    : suspending
    ? 'Yes, Suspend'
    : 'Yes, Inactive';

  // Styling based on action type
  const iconContainerClass = activating
    ? 'bg-emerald-50 text-emerald-600'
    : suspending
    ? 'bg-amber-50 text-amber-600'
    : 'bg-slate-100 text-slate-600';

  const buttonClass = activating
    ? 'bg-emerald-600 hover:bg-emerald-700'
    : suspending
    ? 'bg-amber-600 hover:bg-amber-700'
    : 'bg-[#3e4c5e] hover:bg-[#323d4b]';

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-y-auto max-h-[92dvh] transform scale-100 p-6 sm:p-8 text-center animate-in zoom-in-95 duration-150 my-auto"
      >
        {/* Top Centered Circular Icon */}
        <div className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center">
          <div className={`w-16 h-16 rounded-full ${iconContainerClass} flex items-center justify-center`}>
            {activating ? (
              <CheckCircle2 className="w-8 h-8 stroke-[2]" />
            ) : suspending ? (
              <AlertCircle className="w-8 h-8 stroke-[2]" />
            ) : (
              <Ban className="w-8 h-8 stroke-[2]" />
            )}
          </div>
        </div>

        {/* Modal Title */}
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
          {title}
        </h3>

        {/* Question Prompt */}
        <p className="mt-2 text-xs sm:text-[13px] text-slate-500 leading-relaxed">
          Are you sure you want to mark{' '}
          <span className="font-bold text-slate-800">{displayName}</span> as{' '}
          <span className="font-semibold text-slate-800">{nextStatus}</span>?
        </p>

        {/* Action Buttons */}
        <div className="mt-7 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="w-full sm:flex-1 h-11 px-5 rounded-xl border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`w-full sm:flex-1 h-11 px-5 rounded-xl text-white text-xs sm:text-[13px] font-bold shadow-sm hover:shadow transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 ${buttonClass}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Updating...</span>
              </>
            ) : (
              <span>{confirmButtonText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusChangeModal;
