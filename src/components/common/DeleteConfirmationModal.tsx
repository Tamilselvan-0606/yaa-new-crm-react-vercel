import React from 'react';
import { Modal } from './Modal';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
import { Button } from './Button';

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
  /** 'centered' = hero icon layout used across the sale-management modules; 'classic' = original boxed layout. */
  variant?: 'classic' | 'centered';
}

/**
 * Centralized, reusable Delete Confirmation Modal for YAA CRM.
 * Used across Inventory, Sales Hub, and Purchase modules.
 * Implements the vivid rose/red (#F51F4F) destructive styling with white text/icon,
 * while maintaining the deep-purple (#33077C) branding and existing modal architecture.
 */
export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Delete',
  entityName = 'Record',
  recordName,
  message,
  confirmButtonText,
  cancelButtonText = 'Cancel',
  isLoading = false,
  error = null,
  variant = 'classic',
}) => {
  const displayConfirmText = confirmButtonText || (isLoading ? 'Deleting...' : `Delete ${entityName}`);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) {
          onClose();
        }
      }}
      title={title}
      subtitle={`Confirm ${entityName.toLowerCase()} removal`}
      maxWidth="md"
      headerGradient={true}
      showBackIcon={true}
      hideCloseButton={isLoading}
      onBack={() => {
        if (!isLoading) {
          onClose();
        }
      }}
      closeOnOutsideClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="p-0.5 sm:p-1 space-y-4 text-xs font-sans animate-in fade-in duration-150">
        {/* Error Alert if Deletion Failed */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 animate-shake">
            <AlertTriangle className="w-4 h-4 text-[#F51F4F] shrink-0 mt-0.5" />
            <div className="text-xs min-w-0 break-words">
              <span className="font-bold">Deletion Failed: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {variant === 'centered' ? (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-rose-50 ring-8 ring-rose-100/80 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-[#F51F4F] stroke-[2.2]" />
              </div>
              <h4 className="mt-4 text-[15px] font-bold text-slate-900 tracking-tight">
                Delete this {entityName.toLowerCase()}?
              </h4>
              {recordName && (
                <span className="mt-2 max-w-full truncate font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 text-[13px]">
                  {recordName}
                </span>
              )}
            </div>

            {message && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3.5 text-xs text-slate-600 leading-relaxed break-words">
                {message}
              </div>
            )}

            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200/80 bg-rose-50/70 px-4 py-3 text-[11.5px] leading-relaxed text-rose-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-[#F51F4F]" />
              <p>
                <span className="font-bold">This action cannot be undone.</span> The {entityName.toLowerCase()} will be permanently removed.
              </p>
            </div>
          </>
        ) : (
          <>
          {/* Warning / Destructive Highlight Box */}
          <div className="flex items-start gap-3 sm:gap-3.5 p-3.5 sm:p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-[#F51F4F]/10 border border-[#F51F4F]/20 flex items-center justify-center shrink-0 shadow-2xs">
              <Trash2 className="w-5 h-5 text-[#F51F4F] stroke-[2.2]" />
            </div>
            <div className="space-y-1 pt-0.5 min-w-0 flex-1 break-words">
              <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                Are you sure you want to delete this {entityName.toLowerCase()}?
              </h4>
              <div className="text-xs text-slate-600 leading-relaxed">
                {message ? (
                  message
                ) : (
                  <>
                    You are about to permanently delete{' '}
                    {recordName ? (
                      <span className="font-bold text-slate-900 bg-white/80 px-1.5 py-0.5 rounded border border-rose-200">
                        "{recordName}"
                      </span>
                    ) : (
                      <span>this {entityName.toLowerCase()}</span>
                    )}
                    . This action cannot be undone.
                  </>
                )}
              </div>
            </div>
          </div>

          </>
        )}

        {/* Modal Action Buttons */}
        <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={isLoading}
            onClick={() => {
              if (!isLoading) {
                onClose();
              }
            }}
            icon={<X className="w-4 h-4 text-slate-500" />}
            className="w-full sm:w-auto h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs"
          >
            {cancelButtonText}
          </Button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#F51F4F] hover:bg-[#d91440] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            style={{ backgroundColor: '#F51F4F' }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Trash2 className="w-4 h-4 stroke-[2.2] text-white" />
            )}
            <span>{displayConfirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmationModal;
