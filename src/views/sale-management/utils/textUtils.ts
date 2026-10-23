import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Capitalizes the first letter of a string, leaving the rest of the string unchanged.
 * E.g., "chennai" -> "Chennai", "apple inc" -> "Apple inc", "123" -> "123", "" -> ""
 */
export const capitalizeFirstLetter = (value: string): string => {
  if (!value || typeof value !== 'string') return value || '';
  const first = value.charAt(0);
  const upper = first.toUpperCase();
  if (first === upper) return value;
  return upper + value.slice(1);
};

/**
 * Capitalizes the first letter of each word in a string.
 * E.g., "john doe" -> "John Doe", "chennai retail outlet" -> "Chennai Retail Outlet"
 */
export const capitalizeWords = (value: string): string => {
  if (!value || typeof value !== 'string') return value || '';
  return value.replace(/\b[a-z]/g, (char) => char.toUpperCase());
};

/**
 * Capitalizes the first letter of every sentence in a multi-sentence string.
 * E.g., "hello world. this is a note." -> "Hello world. This is a note."
 */
export const capitalizeSentences = (value: string): string => {
  if (!value || typeof value !== 'string') return value || '';
  return value.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, prefix, char) => `${prefix}${char.toUpperCase()}`);
};

/**
 * Determines whether an input or textarea element should be excluded from auto-capitalization.
 * Excludes emails, passwords, numbers, phone/tel numbers, URLs, dates, files, and elements marked with data-no-capitalize.
 */
export const isExcludedInput = (el: HTMLElement): boolean => {
  // Respect explicit opt-out attribute or class
  if (
    el.getAttribute('data-no-capitalize') === 'true' ||
    el.classList.contains('no-capitalize') ||
    el.getAttribute('autoCapitalize') === 'none' ||
    el.getAttribute('autocapitalize') === 'none' ||
    el.getAttribute('autocapitalize') === 'off'
  ) {
    return true;
  }

  // Only process input and textarea elements
  if (el instanceof HTMLInputElement) {
    const type = (el.type || 'text').toLowerCase();
    const excludedTypes = [
      'email',
      'password',
      'number',
      'tel',
      'url',
      'date',
      'time',
      'datetime-local',
      'month',
      'week',
      'file',
      'checkbox',
      'radio',
      'range',
      'color',
      'hidden',
      'submit',
      'button',
      'reset',
    ];
    if (excludedTypes.includes(type)) return true;

    // Check name, id, placeholder, and autocomplete for email, phone, url, password patterns
    const identifier = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${el.autocomplete || ''}`.toLowerCase();
    if (
      identifier.includes('email') ||
      identifier.includes('phone') ||
      identifier.includes('mobile') ||
      identifier.includes('password') ||
      identifier.includes('url') ||
      identifier.includes('website')
    ) {
      return true;
    }
  }

  // Exclude disabled or readonly fields
  if ((el as HTMLInputElement).readOnly || (el as HTMLInputElement).disabled) {
    return true;
  }

  return false;
};

/**
 * Programmatically updates an input or textarea element's value while updating React's valueTracker.
 */
export const setNativeInputValue = (
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
) => {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  
  // Reset React internal tracker if available so React detects the change
  const tracker = (element as any)._valueTracker;
  if (tracker && typeof tracker.setValue === 'function') {
    tracker.setValue('');
  }

  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
};

/**
 * Change event handler helper for React controlled components.
 * Capitalizes the first letter before calling the state setter.
 *
 * Example:
 * <input value={name} onChange={handleCapitalizeChange(setName)} />
 */
export const handleCapitalizeChange = <
  T extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement
>(
  setter: (val: string) => void
) => (e: React.ChangeEvent<T>) => {
  const capitalized = capitalizeFirstLetter(e.target.value);
  setter(capitalized);
};

/**
 * React hook that automatically capitalizes the first letter of text inputs and textareas
 * while typing. Works across all text fields (customer name, item description, remarks, addresses, etc.)
 * in all forms, modals, tables, and search inputs in Sale Management.
 *
 * Preserves caret/selection position, skips emails/numbers/phones/dates, and dispatches native events
 * so React controlled state and React Hook Form stay in perfect sync.
 */
export const useAutoCapitalizeFirstLetter = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    let isDispatched = false;

    const handleInput = (e: Event) => {
      // Prevent recursion from our own dispatched input event
      if (isDispatched) return;

      const target = e.target;
      if (
        !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      if (isExcludedInput(target)) {
        return;
      }

      const rawValue = target.value;
      if (!rawValue || typeof rawValue !== 'string') return;

      // Transform first letter to uppercase (handling optional leading whitespace)
      const updatedValue = rawValue.replace(/^(\s*)([a-z])/, (_, spaces, char) => `${spaces}${char.toUpperCase()}`);

      // Only transform if the text actually changed
      if (updatedValue !== rawValue) {
        isDispatched = true;
        try {
          const start = target.selectionStart;
          const end = target.selectionEnd;

          setNativeInputValue(target, updatedValue);

          // Restore cursor/selection range
          if (start !== null && end !== null) {
            target.setSelectionRange(start, end);
          }

          // Dispatch native input event so React's SyntheticEvent onChange/onInput
          // captures the updated capitalized value immediately
          target.dispatchEvent(new Event('input', { bubbles: true }));
        } finally {
          isDispatched = false;
        }
      }
    };

    // Attach in capture phase so it executes prior to React's synthetic event handler
    document.addEventListener('input', handleInput, true);

    return () => {
      document.removeEventListener('input', handleInput, true);
    };
  }, [enabled]);
};

/**
 * Sale Management Auto-Capitalize Provider Component.
 * Automatically enables real-time first-letter capitalization whenever
 * the user is on any `/sale-management/*` route.
 */
export const SaleManagementAutoCapitalize: React.FC = () => {
  const location = useLocation();
  const isSaleManagement = location.pathname.startsWith('/sale-management');

  useAutoCapitalizeFirstLetter(isSaleManagement);

  return null;
};
