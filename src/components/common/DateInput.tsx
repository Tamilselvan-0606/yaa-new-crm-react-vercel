import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
  /** Value in ISO format (yyyy-mm-dd), as used by <input type="date"> */
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  placeholder?: string;
  /** Height/size classes for the wrapper (default h-11) */
  heightClass?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  title?: string;
  /** Extra attributes (e.g. data-field for scroll-to-error) go onto the native input. */
  [attr: `data-${string}`]: string | undefined;
}

/** Formats yyyy-mm-dd as dd/mm/yyyy without timezone shifts. */
export const formatDMY = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

/**
 * Date field that always displays dd/mm/yyyy regardless of browser locale.
 * A transparent native date input sits on top so the native picker still works.
 */
export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  error,
  placeholder = 'dd/mm/yyyy',
  heightClass = 'h-11',
  disabled,
  min,
  max,
  title,
  ...rest
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const display = formatDMY(value);

  return (
    <div
      title={title}
      className={`relative w-full ${heightClass} ${disabled ? 'bg-slate-50 opacity-70' : 'bg-white'} rounded-xl transition-all focus-within:ring-4 ${
        error
          ? 'border border-red-500 focus-within:border-red-500 focus-within:ring-red-500/10'
          : 'border border-slate-200 hover:border-slate-300 focus-within:border-[#4309A2] focus-within:ring-[#4309A2]/10'
      }`}
    >
      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
        <span className={`text-xs sm:text-[13px] font-medium ${display ? 'text-slate-700' : 'text-slate-400'}`}>
          {display || placeholder}
        </span>
        <Calendar className="w-4 h-4 text-slate-500" />
      </div>
      <input
        ref={ref}
        type="date"
        value={value}
        disabled={disabled}
        min={min}
        max={max}
        {...rest}
        onChange={(e) => onChange(e.target.value)}
        onClick={() => {
          try {
            ref.current?.showPicker?.();
          } catch {
            /* picker unavailable; native behaviour still applies */
          }
        }}
        className={`absolute inset-0 w-full h-full opacity-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      />
    </div>
  );
};

export default DateInput;
