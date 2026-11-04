import React, { useEffect, useState } from 'react';

/**
 * Drop-in replacement for `sonner`'s `toast`, rendered with Tailwind (no UI library).
 * Usage is unchanged: toast.success('Saved'), toast.error('Oops', { description: '...' }),
 * toast.loading('Working...', { id }) then toast.success('Done', { id }).
 * Mount <SnackbarHost /> once near the app root.
 */

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';
type ToastId = string | number;
type ToastMessage = React.ReactNode;

interface ToastOptions {
  id?: ToastId;
  description?: React.ReactNode;
  duration?: number;
}

interface ToastItem {
  id: ToastId;
  createdAt: number;
  type: ToastType;
  message: ToastMessage;
  description?: React.ReactNode;
  duration: number | null; // null = stays until replaced/dismissed
  open: boolean;
}

const DEFAULT_DURATION = 4000;
// An identical toast fired again within this window is dropped (two code paths reporting one event).
const DUPLICATE_WINDOW_MS = 1500;
const MAX_VISIBLE = 5;

let items: ToastItem[] = [];
let counter = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

// Timers live in the store (not in the toast component) so a toast always closes on schedule, even when the window is
// blurred or the pointer rests on it, and is always removed even if no exit-transition callback fires.
const EXIT_ANIMATION_MS = 400;
const hideTimers = new Map<ToastId, ReturnType<typeof setTimeout>>();
const removeTimers = new Map<ToastId, ReturnType<typeof setTimeout>>();

const clearTimer = (map: Map<ToastId, ReturnType<typeof setTimeout>>, id: ToastId) => {
  const t = map.get(id);
  if (t !== undefined) {
    clearTimeout(t);
    map.delete(id);
  }
};

const show = (type: ToastType, message: ToastMessage, opts: ToastOptions = {}): ToastId => {
  const now = Date.now();
  if (opts.id === undefined && type !== 'loading') {
    const dup = items.find(
      (t) =>
        t.open &&
        t.type === type &&
        t.message === message &&
        t.description === opts.description &&
        now - t.createdAt < DUPLICATE_WINDOW_MS,
    );
    if (dup) return dup.id;
  }
  const id = opts.id ?? `toast_${++counter}`;
  const item: ToastItem = {
    id,
    createdAt: now,
    type,
    message,
    description: opts.description,
    duration: type === 'loading' ? (opts.duration ?? null) : (opts.duration ?? DEFAULT_DURATION),
    open: true,
  };
  const idx = items.findIndex((t) => t.id === id);
  if (idx >= 0) {
    // Update in place (e.g. loading -> success) so the same snackbar morphs
    items = items.map((t, i) => (i === idx ? item : t));
  } else {
    items = [...items, item].slice(-MAX_VISIBLE);
  }
  // (Re)start the auto-hide clock for this toast; a replaced toast (loading -> success) restarts it.
  clearTimer(hideTimers, id);
  clearTimer(removeTimers, id);
  if (item.duration !== null) {
    hideTimers.set(
      id,
      setTimeout(() => dismiss(id), item.duration),
    );
  }
  emit();
  return id;
};

function dismiss(id?: ToastId) {
  const ids = id === undefined ? items.map((t) => t.id) : [id];
  ids.forEach((tid) => {
    clearTimer(hideTimers, tid);
    clearTimer(removeTimers, tid);
    // Fallback: take the toast out after the exit animation even if the transition callback never runs.
    removeTimers.set(
      tid,
      setTimeout(() => remove(tid), EXIT_ANIMATION_MS),
    );
  });
  items = items.map((t) => (ids.includes(t.id) ? { ...t, open: false } : t));
  emit();
}

function remove(id: ToastId) {
  clearTimer(hideTimers, id);
  clearTimer(removeTimers, id);
  items = items.filter((t) => t.id !== id);
  emit();
}

/** Number of toasts currently held (visible or exiting). Used by tests. */
export const getActiveToastCount = (): number => items.length;

export const toast = {
  success: (message: ToastMessage, opts?: ToastOptions) => show('success', message, opts),
  error: (message: ToastMessage, opts?: ToastOptions) => show('error', message, opts),
  info: (message: ToastMessage, opts?: ToastOptions) => show('info', message, opts),
  warning: (message: ToastMessage, opts?: ToastOptions) => show('warning', message, opts),
  loading: (message: ToastMessage, opts?: ToastOptions) => show('loading', message, opts),
  dismiss,
};

// Same colours, sizes and shadow MUI's filled <Alert> used, so toasts look unchanged.
const SEVERITY_BG: Record<Exclude<ToastType, 'loading'>, string> = {
  success: 'bg-[#2e7d32]',
  error: 'bg-[#d32f2f]',
  info: 'bg-[#0288d1]',
  warning: 'bg-[#ed6c02]',
};

const ICON_PATHS: Record<Exclude<ToastType, 'loading'>, string> = {
  success:
    'M20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4C12.76,4 13.5,4.11 14.2,4.31L15.77,2.74C14.61,2.26 13.34,2 12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12M7.91,10.08L6.5,11.5L11,16L21,6L19.59,4.58L11,13.17L7.91,10.08Z',
  error:
    'M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
  warning: 'M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z',
  info: 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
};

const CLOSE_PATH = 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';

const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) =>
  type === 'loading' ? (
    <span className="block w-[18px] h-[18px] rounded-full border-2 border-current border-t-transparent animate-spin" />
  ) : (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d={ICON_PATHS[type]} />
    </svg>
  );

const EXIT_MS = 200;

const ToastCard: React.FC<{ item: ToastItem }> = ({ item }) => {
  // Auto-hide is driven by the store timers (see show/dismiss), so a toast closes on schedule even while
  // hovered or when the window is in the background.

  // Once closed, wait for the fade-out and then drop it from the list.
  useEffect(() => {
    if (item.open) return;
    const timer = setTimeout(() => remove(item.id), EXIT_MS);
    return () => clearTimeout(timer);
  }, [item.open, item.id]);

  const severity = item.type === 'loading' ? 'info' : item.type;

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-center w-full min-w-[280px] max-w-[420px] rounded px-4 py-1.5 text-sm leading-[1.43] text-white shadow-[0_3px_3px_-2px_rgba(0,0,0,0.2),0_3px_4px_0_rgba(0,0,0,0.14),0_1px_8px_0_rgba(0,0,0,0.12)] transition-all duration-200 ${SEVERITY_BG[severity]} ${
        item.open ? 'opacity-100 scale-100 animate-in fade-in zoom-in-75' : 'opacity-0 scale-75'
      }`}
    >
      <div className="flex py-[7px] mr-3 shrink-0 opacity-90">
        <ToastIcon type={item.type} />
      </div>
      <div className="py-2 min-w-0 flex-1 overflow-auto">
        {item.description ? (
          <>
            <div className="font-medium -mt-0.5 mb-0.5">{item.message}</div>
            {item.description}
          </>
        ) : (
          item.message
        )}
      </div>
      {item.type !== 'loading' && (
        <div className="pt-1 pl-4 ml-auto -mr-2 shrink-0">
          <button
            type="button"
            aria-label="Close"
            onClick={() => dismiss(item.id)}
            className="p-[5px] rounded-full text-inherit opacity-90 hover:opacity-100 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d={CLOSE_PATH} />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export const SnackbarHost: React.FC = () => {
  const [, force] = useState(0);

  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[2000] flex flex-col gap-2 max-w-[calc(100vw-32px)] pointer-events-none">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  );
};
