import React, { useEffect, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

/**
 * Drop-in replacement for `sonner`'s `toast`, rendered with MUI Snackbar + Alert.
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
  type: ToastType;
  message: ToastMessage;
  description?: React.ReactNode;
  duration: number | null; // null = stays until replaced/dismissed
  open: boolean;
}

const DEFAULT_DURATION = 4000;
const MAX_VISIBLE = 5;

let items: ToastItem[] = [];
let counter = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

const show = (type: ToastType, message: ToastMessage, opts: ToastOptions = {}): ToastId => {
  const id = opts.id ?? `toast_${++counter}`;
  const item: ToastItem = {
    id,
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
  emit();
  return id;
};

const dismiss = (id?: ToastId) => {
  items = id === undefined ? items.map((t) => ({ ...t, open: false })) : items.map((t) => (t.id === id ? { ...t, open: false } : t));
  emit();
};

const remove = (id: ToastId) => {
  items = items.filter((t) => t.id !== id);
  emit();
};

export const toast = {
  success: (message: ToastMessage, opts?: ToastOptions) => show('success', message, opts),
  error: (message: ToastMessage, opts?: ToastOptions) => show('error', message, opts),
  info: (message: ToastMessage, opts?: ToastOptions) => show('info', message, opts),
  warning: (message: ToastMessage, opts?: ToastOptions) => show('warning', message, opts),
  loading: (message: ToastMessage, opts?: ToastOptions) => show('loading', message, opts),
  dismiss,
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
    <Stack
      spacing={1}
      sx={{ position: 'fixed', top: 16, right: 16, zIndex: 2000, maxWidth: 'calc(100vw - 32px)', pointerEvents: 'none' }}
    >
      {items.map((t) => (
        <Snackbar
          key={t.id}
          open={t.open}
          autoHideDuration={t.duration}
          onClose={(_, reason) => {
            if (reason === 'clickaway') return;
            dismiss(t.id);
          }}
          slotProps={{ transition: { onExited: () => remove(t.id) } }}
          // Render inline inside the stack instead of MUI's default fixed positioning
          sx={{ position: 'static', transform: 'none', pointerEvents: 'auto' }}
        >
          <Alert
            severity={t.type === 'loading' ? 'info' : t.type}
            variant="filled"
            icon={t.type === 'loading' ? <CircularProgress size={18} color="inherit" /> : undefined}
            onClose={t.type === 'loading' ? undefined : () => dismiss(t.id)}
            sx={{ width: '100%', minWidth: 280, maxWidth: 420, alignItems: 'center', boxShadow: 3 }}
          >
            {t.description ? (
              <>
                <AlertTitle sx={{ mb: 0.25 }}>{t.message}</AlertTitle>
                {t.description}
              </>
            ) : (
              t.message
            )}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  );
};
