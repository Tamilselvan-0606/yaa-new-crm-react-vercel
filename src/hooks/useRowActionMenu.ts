import { useCallback, useEffect, useState, type MouseEvent } from 'react';

export interface RowMenuPosition {
  top?: number;
  bottom?: number;
  right: number;
}

/** Put the trigger attribute on the 3-dots button wrapper and the menu attribute on the popup itself. */
export const ROW_MENU_TRIGGER_ATTR = 'data-row-menu-trigger';
export const ROW_MENU_ATTR = 'data-row-menu';

/**
 * State for a "3 dots" action menu rendered as a fixed-position popup next to the clicked button.
 * - opens below the button, or above it when there is not enough room;
 * - closes on outside click, scroll and resize.
 */
export const useRowActionMenu = (menuHeight = 240) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pos, setPos] = useState<RowMenuPosition | null>(null);

  const close = useCallback(() => {
    setActiveId(null);
    setPos(null);
  }, []);

  const toggle = useCallback(
    (e: MouseEvent, id: string) => {
      e.stopPropagation();
      if (activeId === id) return close();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const right = window.innerWidth - rect.right;
      const opensUp = window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight;
      setPos(opensUp ? { bottom: window.innerHeight - rect.top + 6, right } : { top: rect.bottom + 6, right });
      setActiveId(id);
    },
    [activeId, close, menuHeight]
  );

  useEffect(() => {
    if (!activeId) return;
    const onOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[${ROW_MENU_TRIGGER_ATTR}]`) && !target.closest(`[${ROW_MENU_ATTR}]`)) close();
    };
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [activeId, close]);

  return { activeId, pos, toggle, close };
};
