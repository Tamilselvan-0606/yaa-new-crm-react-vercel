import React from 'react';
import { BATCH_PREFIX } from './textUtils';

interface Props {
  value?: string | null;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

/**
 * Initial Batch No field with a fixed, non-editable "BAT-" prefix. The user types only the rest;
 * the full value ("BAT-" + text) is reported through onChange. Existing batch numbers that do not start
 * with the prefix (older data) fall back to a plain editable input so they are never altered.
 */
export const BatchPrefixInput: React.FC<Props> = ({ value, onChange, className = '', placeholder = '', inputProps }) => {
  const v = value ?? '';
  const hasPrefix = !v || v.toUpperCase().startsWith(BATCH_PREFIX);

  if (!hasPrefix) {
    return (
      <input
        {...inputProps}
        type="text"
        data-uppercase="true"
        value={v}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className={`${className} font-mono`}
      />
    );
  }

  const suffix = v.slice(BATCH_PREFIX.length);
  return (
    <div className="flex items-stretch">
      <span
        className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-primary/30 bg-primary/10 text-primary font-mono text-sm font-extrabold tracking-wide select-none"
        aria-hidden="true"
      >
        {BATCH_PREFIX}
      </span>
      <input
        {...inputProps}
        type="text"
        data-uppercase="true"
        aria-label="Initial batch number (after BAT-)"
        placeholder={placeholder}
        value={suffix}
        onChange={(e) => onChange(BATCH_PREFIX + e.target.value.toUpperCase().replace(/^BAT-/, ''))}
        className={`${className} font-mono !rounded-l-none`}
      />
    </div>
  );
};
