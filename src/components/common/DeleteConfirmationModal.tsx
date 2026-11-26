import React from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  entityName?: string;
  recordName?: string;
  message?: React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isLoading?: boolean;
  error?: string | null;
  variant?: 'classic' | 'centered';
}

/**
 * Clean centered Delete Confirmation Modal matching the design in user's reference:
 * - Centered circular soft-rose icon badge with pink/red trash icon
 * - Centered Bold title: "Delete Branch" / "Delete Firm"
 * - Subtext: "Are you sure you want to delete {recordName}? This action cannot be undone."
 * - Side-by-side buttons: white "Cancel" and bold rose "Yes, Delete"
 */
export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  entityName = 'Record',
  recordName,
  message,
  confirmButtonText,
  cancelButtonText = 'Cancel',
  isLoading = false,
  error = null,
}) => {
  if (!isOpen) return null;

  const computedTitle = title || `Delete ${entityName}`;
  const computedButtonText = confirmButtonText || (isLoading ? 'Deleting...' : 'Yes, Delete');
  const displayName = recordName || `this ${entityName.toLowerCase()}`;

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
        {/* Error Alert if Deletion Failed */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-left animate-shake">
            <AlertTriangle className="w-4 h-4 text-[#F51F4F] shrink-0 mt-0.5" />
            <div className="text-xs min-w-0 break-words">
              <span className="font-bold">Deletion Failed: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Top Centered Circular Icon Badge */}
        <div className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-[#F51F4F] flex items-center justify-center">
            <Trash2 className="w-8 h-8 stroke-[2]" />
          </div>
        </div>

        {/* Modal Title */}
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
          {computedTitle}
        </h3>

        {/* Prompt Description */}
        <div className="mt-2 text-xs sm:text-[13px] text-slate-500 leading-relaxed">
          {message ? (
            message
          ) : (
            <>
              Are you sure you want to delete{' '}
              <span className="font-bold text-slate-800">{displayName}</span>? This action cannot be undone.
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-7 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="w-full sm:flex-1 h-11 px-5 rounded-xl border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
          >
            {cancelButtonText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="w-full sm:flex-1 h-11 px-5 rounded-xl bg-[#F51F4F] hover:bg-[#d91440] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>{computedButtonText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
