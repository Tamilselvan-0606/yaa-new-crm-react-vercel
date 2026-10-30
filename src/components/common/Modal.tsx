import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft } from 'lucide-react';

let nextModalOrder = 0;
const openModalStack: number[] = [];

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  headerRightSlot?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  headerGradient?: boolean;
  showBackIcon?: boolean;
  hideCloseButton?: boolean;
  onBack?: () => void;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  zIndex?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  headerRightSlot,
  children,
  maxWidth = 'lg',
  headerGradient = false,
  showBackIcon = false,
  hideCloseButton = false,
  onBack,
  closeOnOutsideClick = false,
  closeOnEscape = false,
  zIndex = 'z-50',
}) => {
  const orderRef = useRef<number | null>(null);
  if (isOpen) {
    if (orderRef.current === null) {
      nextModalOrder += 1;
      orderRef.current = nextModalOrder;
    }
  } else {
    orderRef.current = null;
    if (openModalStack.length === 0) {
      nextModalOrder = 0;
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const myOrder = orderRef.current ?? ++nextModalOrder;
    orderRef.current = myOrder;
    openModalStack.push(myOrder);
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      const isTopmost = openModalStack[openModalStack.length - 1] === myOrder;
      if (e.key === 'Escape' && closeOnEscape && isTopmost) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      const idx = openModalStack.lastIndexOf(myOrder);
      if (idx !== -1) openModalStack.splice(idx, 1);
      if (openModalStack.length === 0) {
        document.body.style.overflow = 'unset';
        nextModalOrder = 0;
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  const computedZIndexStyle =
    zIndex === 'z-50' && orderRef.current !== null
      ? { zIndex: 50 + orderRef.current }
      : undefined;

  const maxWidthClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
    '3xl': 'max-w-5xl',
    '4xl': 'max-w-6xl',
    '5xl': 'max-w-7xl',
  }[maxWidth];

  return createPortal(
    <div
      id="modal-backdrop"
      style={computedZIndexStyle}
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in`}
      onClick={(e) => {
        if (closeOnOutsideClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="modal-container"
        className={`relative w-full ${maxWidthClass} bg-white rounded-xl sm:rounded-2xl shadow-2xl ${
          headerGradient ? 'border-none' : 'border border-slate-200/80'
        } overflow-hidden transition-all duration-200 transform scale-100 flex flex-col max-h-[93dvh] sm:max-h-[90dvh]`}
      >
        {/* Modal Header */}
        <div
          className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4.5 shrink-0 ${
            headerGradient ? 'text-white border-b-0' : 'bg-slate-50/50 border-b border-slate-100'
          }`}
          style={
            headerGradient
              ? { background: '#33077C' }
              : undefined
          }
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {showBackIcon && (
              <button
                type="button"
                onClick={onBack || onClose}
                className={`p-1.5 -ml-1 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  headerGradient
                    ? 'text-white hover:bg-white/20 active:scale-95'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h3
                className={`text-lg sm:text-xl font-bold tracking-tight truncate ${
                  headerGradient ? 'text-white' : 'text-[#33077C]'
                }`}
              >
                {title}
              </h3>
              {subtitle && (
                <p
                  className={`text-sm mt-0.5 line-clamp-2 sm:truncate ${
                    headerGradient ? 'text-white/90 font-medium' : 'text-slate-500'
                  }`}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {headerRightSlot ? (
            <div className="shrink-0 flex items-center ml-auto max-w-full">{headerRightSlot}</div>
          ) : (
            !hideCloseButton && (
              <button
                id="modal-close-button"
                onClick={onClose}
                className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ml-auto ${
                  headerGradient
                    ? 'text-white/80 hover:text-white hover:bg-white/15'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                }`}
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )
          )}
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 min-w-0">{children}</div>
      </div>
    </div>,
    document.body
  );
};
