import React from "react";
import { FormError } from "../../../components/common/FormError";

/**
 * Standard Form Styling Tokens & Utilities for Sale Management
 * Consistent styling across all forms/modals in sales-hub, purchase, and inventory.
 */

// Form Label standard class
export const FORM_LABEL_CLS =
  "text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5";

// Form Input standard class (h-11, rounded-xl, slate-200 border, purple focus)
export const FORM_INPUT_CLS =
  "w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all";

// Form Input error state
export const FORM_INPUT_ERROR_CLS =
  "w-full h-11 px-4 bg-white border border-rose-400 hover:border-rose-500 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all";

// Form Input disabled state
export const FORM_INPUT_DISABLED_CLS =
  "w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-medium text-slate-500 cursor-not-allowed outline-none";

// Form Select dropdown class
export const FORM_SELECT_CLS =
  "w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all cursor-pointer";

// Form Textarea class
export const FORM_TEXTAREA_CLS =
  "w-full p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all resize-none";

// Standard 3-column / 2-column grid containers for modal forms
export const FORM_GRID_3_CLS = "grid grid-cols-1 md:grid-cols-3 gap-4";
export const FORM_GRID_2_CLS = "grid grid-cols-1 sm:grid-cols-2 gap-4";

// Standard Modal Footer Buttons
export const FORM_CANCEL_BTN_CLS =
  "h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2";

export const FORM_SUBMIT_BTN_CLS =
  "h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50";

/**
 * Helper to dynamically compute input class name with error handling
 */
export const getFormInputCls = (hasError?: boolean, extra = ""): string => {
  return `${hasError ? FORM_INPUT_ERROR_CLS : FORM_INPUT_CLS} ${extra}`.trim();
};

/**
 * Standard Form Label Component with optional red asterisk
 */
export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export const FormLabel: React.FC<FormLabelProps> = ({
  children,
  required = false,
  className = "",
  ...props
}) => (
  <label className={`${FORM_LABEL_CLS} ${className}`.trim()} {...props}>
    {children}
    {required && <span className="text-rose-500 ml-1">*</span>}
  </label>
);

/**
 * FormField wrapper container combining FormLabel, input/select children, and FormError
 */
export interface FormFieldProps {
  label?: React.ReactNode;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  className = "",
  children,
}) => (
  <div className={className}>
    {label && <FormLabel required={required}>{label}</FormLabel>}
    {children}
    {error && <FormError message={error} />}
  </div>
);

/**
 * Keystroke sanitizer: disallow typing non-numeric characters in number-only fields (e.g. phone)
 */
export const handleNumberOnlyKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement>
) => {
  if (
    e.key === "Backspace" ||
    e.key === "Delete" ||
    e.key === "ArrowLeft" ||
    e.key === "ArrowRight" ||
    e.key === "Tab" ||
    e.key === "Enter" ||
    e.ctrlKey ||
    e.metaKey
  ) {
    return;
  }
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

// Re-export text capitalization utilities
export {
  capitalizeFirstLetter,
  capitalizeWords,
  capitalizeSentences,
  handleCapitalizeChange,
  isExcludedInput,
  useAutoCapitalizeFirstLetter,
  SaleManagementAutoCapitalize,
} from './textUtils';
