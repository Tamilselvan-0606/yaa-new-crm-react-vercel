import { useCallback, useState, type MouseEvent } from 'react';

/**
 * Copy text to the clipboard and remember which button was copied (to show "Copied!" for 2 seconds).
 * `onCopied` lets a screen add its own toast.
 */
export const useCopyToClipboard = (onCopied?: (label: string, text: string) => void) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = useCallback(
    (e: MouseEvent, text: string, key: string, label = 'Value') => {
      e.stopPropagation();
      if (!text) return;
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      onCopied?.(label, text);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    },
    [onCopied]
  );

  return { copiedKey, copy };
};
