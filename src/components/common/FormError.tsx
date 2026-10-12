import React from 'react';
import { AlertCircle } from 'lucide-react';
import { FieldError } from 'react-hook-form';

interface FormErrorProps {
  message?: string;
  error?: string | FieldError | { message?: string } | null;
  className?: string;
  showIcon?: boolean;
}

export const FormError: React.FC<FormErrorProps> = ({
  message,
  error,
  className = '',
  showIcon = false,
}) => {
  const errorMessage =
    message ||
    (typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
      ? (error as { message?: string }).message
      : undefined);

  if (!errorMessage) return null;

  return (
    <p
      className={`text-[11px] font-semibold text-rose-500 mt-1 flex items-center gap-1 animate-in fade-in duration-100 ${className}`}
    >
      {showIcon && <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />}
      <span>{errorMessage}</span>
    </p>
  );
};
