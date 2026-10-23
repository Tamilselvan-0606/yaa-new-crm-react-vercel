import React from 'react';
import { Trash2, AlertCircle, Ban, Loader2 } from 'lucide-react';

export type ConfirmationType = 'Delete' | 'Suspend' | 'Inactive';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  type?: ConfirmationType;
  title?: string;
  description?: React.ReactNode;
  itemName?: string;
  itemTypeLabel?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type = 'Delete',
  title,
  description,
  itemName,
  itemTypeLabel,
  confirmButtonText,
  cancelButtonText = 'Cancel',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  // Determine Default Title
  const computedTitle =
    title ||
    (type === 'Delete'
      ? `Delete ${itemTypeLabel || 'Item'}`
      : type === 'Suspend'
        ? `Suspend ${itemTypeLabel || 'Item'}`
        : `Deactivate ${itemTypeLabel || 'Item'}`);

  // Determine Default Description
  const computedDescription = description || (
    <>
      {type === 'Delete' && (
        <>
          Are you sure you want to delete{' '}
          {itemName ? <span className="font-semibold text-slate-700">{itemName}</span> : `this ${itemTypeLabel || 'item'}`}? This action cannot be undone.
        </>
      )}
      {type === 'Suspend' && (
        <>
          Are you sure you want to mark{' '}
          {itemName ? <span className="font-semibold text-slate-700">{itemName}</span> : `this ${itemTypeLabel || 'item'}`}{' '}
          as <span className="font-semibold text-amber-600">Suspended</span>?
        </>
      )}
      {type === 'Inactive' && (
        <>
          Are you sure you want to mark{' '}
          {itemName ? <span className="font-semibold text-slate-700">{itemName}</span> : `this ${itemTypeLabel || 'item'}`}{' '}
          as <span className="font-semibold text-slate-700">Inactive</span>?
        </>
      )}
    </>
  );

  // Determine Default Button Text
  const computedButtonText =
    confirmButtonText ||
    (type === 'Delete'
      ? 'Yes, Delete'
      : type === 'Suspend'
        ? 'Yes, Suspend'
        : 'Yes, Inactive');

  // Button Color matching Icon style exactly
  const buttonColorClass =
    type === 'Delete'
      ? 'bg-rose-600 hover:bg-rose-700'
      : type === 'Suspend'
        ? 'bg-amber-600 hover:bg-amber-700'
        : 'bg-slate-600 hover:bg-slate-700';

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform scale-100 p-6 text-center animate-in zoom-in-95 duration-150"
      >
        {/* Action Icon */}
        <div className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center shadow-inner">
          {type === 'Delete' && (
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-7 h-7 stroke-[2.2]" />
            </div>
          )}
          {type === 'Suspend' && (
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 stroke-[2.2]" />
            </div>
          )}
          {type === 'Inactive' && (
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
              <Ban className="w-7 h-7 stroke-[2.2]" />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-800">{computedTitle}</h3>

        {/* Description */}
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">{computedDescription}</p>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="flex-1 h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
          >
            {cancelButtonText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`flex-1 h-10 px-4 rounded-xl text-white text-xs sm:text-[13px] font-bold shadow-sm hover:shadow transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 ${buttonColorClass}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
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
