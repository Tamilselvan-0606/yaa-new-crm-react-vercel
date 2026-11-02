import React from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

/** Shared look of a text input; red when it has an error. */
export const fieldClass = (hasError: boolean, extra = ''): string =>
  `w-full h-11 px-4 bg-white rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all ${
    hasError
      ? 'border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
      : 'border border-slate-200 hover:border-slate-300 focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
  } ${extra}`;

export const FIELD_LABEL_CLASS = 'text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5';

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'className'> {
  label: string;
  required?: boolean;
  error?: string;
  /** Receives the raw input value, so sanitising helpers (digitsOnly, alphanumericUpper) plug straight in. */
  onValueChange: (value: string) => void;
  inputClassName?: string;
}

/** Label + input + error message: the unit every CRM form repeats. */
export const TextField: React.FC<TextFieldProps> = ({
  label,
  required,
  error,
  onValueChange,
  inputClassName = '',
  ...inputProps
}) => (
  <div>
    <label className={FIELD_LABEL_CLASS}>
      {label} {required && <span className="text-rose-500 font-bold">*</span>}
    </label>
    <input
      type="text"
      {...inputProps}
      onChange={(e) => onValueChange(e.target.value)}
      className={fieldClass(!!error, inputClassName)}
    />
    {error && <p className="text-[11px] font-medium text-red-500 mt-1">{error}</p>}
  </div>
);

/** Greyed-out, non-editable field (auto-generated codes, locked defaults). */
export const ReadOnlyField: React.FC<{ label: string; value: string; placeholder?: string }> = ({ label, value, placeholder }) => (
  <div>
    <label className={FIELD_LABEL_CLASS}>{label}</label>
    <input
      type="text"
      value={value}
      readOnly
      placeholder={placeholder}
      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-600 outline-none cursor-not-allowed"
    />
  </div>
);

interface RegisteredFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'name' | 'onChange' | 'onBlur'> {
  label: string;
  required?: boolean;
  /** Error message from react-hook-form, e.g. `errors.email?.message`. */
  error?: string;
  /** The object returned by `register('field')`. */
  registration: UseFormRegisterReturn;
  inputClassName?: string;
}

/** TextField for react-hook-form forms: `<RegisteredField label="Email" registration={register('email')} error={errors.email?.message} />`. */
export const RegisteredField = React.forwardRef<HTMLInputElement, RegisteredFieldProps>(
  ({ label, required, error, registration, inputClassName = '', type = 'text', ...inputProps }, _ref) => (
    <div>
      <label className={FIELD_LABEL_CLASS}>
        {label} {required && <span className="text-rose-500 font-bold">*</span>}
      </label>
      <input {...registration} {...inputProps} type={type} className={fieldClass(!!error, inputClassName)} />
      {error && <p className="text-[11px] font-medium text-red-500 mt-1">{error}</p>}
    </div>
  )
);
RegisteredField.displayName = 'RegisteredField';
