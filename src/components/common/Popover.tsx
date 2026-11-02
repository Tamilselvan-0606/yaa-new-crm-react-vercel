import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  open: boolean;
  /** Element the popover hangs from; it opens below it, right-aligned. */
  anchorEl: HTMLElement | null;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

const VIEWPORT_MARGIN = 16;

/**
 * Floating panel anchored under a button. Clicking outside or pressing Escape closes it, and it is kept
 * inside the window. Rendered in a portal so table overflow can't clip it.
 */
export const Popover: React.FC<PopoverProps> = ({ open, anchorEl, onClose, children, className = '' }) => {
  const paperRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorEl || !paperRef.current) {
      setPos(null);
      return;
    }
    const anchor = anchorEl.getBoundingClientRect();
    const { width, height } = paperRef.current.getBoundingClientRect();
    const left = Math.max(VIEWPORT_MARGIN, Math.min(anchor.right - width, window.innerWidth - width - VIEWPORT_MARGIN));
    const top = Math.max(VIEWPORT_MARGIN, Math.min(anchor.bottom, window.innerHeight - height - VIEWPORT_MARGIN));
    setPos({ top, left });
  }, [open, anchorEl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onClose);
    };
  }, [open, onClose]);

  if (!open || !anchorEl) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1300]" onClick={onClose}>
      <div
        ref={paperRef}
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: pos?.top ?? 0,
          left: pos?.left ?? 0,
          visibility: pos ? 'visible' : 'hidden',
          maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
          background: 'var(--surface, #fff)',
          color: 'var(--text, #0f172a)',
        }}
        className={`animate-in fade-in zoom-in-95 duration-150 ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};
