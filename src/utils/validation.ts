import { isValidPhoneNumber } from "libphonenumber-js";
import React from 'react';

/**
 * Indian Phone / Mobile Number Validation & Helpers
 *
 * Rules:
 * - Valid Indian mobile number is 10 digits starting with 6, 7, 8, or 9
 * - Allows optional country code prefix: +91, 91, or leading 0
 * - Allows common formatting characters (spaces, hyphens, parentheses)
 */

export const INDIAN_PHONE_STRICT_REGEX = /^[6-9]\d{9}$/;

export const INDIAN_PHONE_REGEX = /^(?:(?:\+?91)|0)?[6-9]\d{9}$/;


/**
 * Checks if a phone number is a valid Indian mobile number.
 * Allows optional +91, 91, or 0 prefix, along with formatting spaces/dashes.
 */
export const isValidIndianPhone = (val?: string | null): boolean => {
  if (!val) return false;
  const clean = val
    .toString()
    .trim()
    .replace(/[\s\-()]/g, "");
  return INDIAN_PHONE_REGEX.test(clean);
};


/**
 * Checks if a phone number is strictly 10 digits starting with 6, 7, 8, or 9.
 */
export const isStrict10DigitIndianPhone = (val?: string | null): boolean => {
  if (!val) return false;
  const clean = val
    .toString()
    .trim()
    .replace(/[\s\-()]/g, "");
  return INDIAN_PHONE_STRICT_REGEX.test(clean);
};


/**
 * Standard error message for Indian phone validation.
 */
export const INDIAN_PHONE_ERROR_MESSAGE =
  "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210 or +91 98765 43210)";

export const INDIAN_PHONE_STRICT_ERROR_MESSAGE =
  "Phone number must be a valid 10-digit Indian mobile number starting with 6-9";


/**
 * Normalizes an Indian phone string to 10 digits.
 * Automatically handles:
 * - spaces, hyphens, and brackets: "98765 43210" -> "9876543210"
 * - +91 / 91 prefix: "+919876543210" -> "9876543210"
 * - Leading 0: "09876543210" -> "9876543210"
 */
export const normalizeIndianPhoneTo10Digits = (val: string): string => {
  if (!val) return "";
  let digits = val.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
};

// ==========================================
// Centralized Numeric Validation Architecture
// ==========================================

export interface NumericValidationResult {
  isValid: boolean;
  value: number | null;
  error?: string;
}


/**
 * Safely parses any value into a finite number.
 * Returns null for empty, undefined, NaN, or non-finite numbers.
 * Does NOT silently convert empty or invalid input into zero.
 */
export const parseNumericValue = <T = null>(
  val: unknown,
  fallback: T = null as unknown as T
): number | T => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '') return fallback;
    const parsed = Number(trimmed);
    return !isNaN(parsed) && isFinite(parsed) ? parsed : fallback;
  }
  if (typeof val === 'number') {
    return !isNaN(val) && isFinite(val) ? val : fallback;
  }
  return fallback;
};


/**
 * Validates that a numeric field is present, valid, and strictly greater than zero.
 * Returns true if valid, or an error message string if invalid (compatible with React Hook Form validate).
 */
export const requiredPositiveNumber = (
  val: unknown,
  fieldName = 'Value',
  options?: { min?: number; max?: number; maxDecimals?: number }
): true | string => {
  if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
    return `${fieldName} is required`;
  }
  const num = parseNumericValue(val);
  if (num === null) {
    return `${fieldName} must be a valid number`;
  }
  if (num <= 0) {
    return `${fieldName} must be greater than zero`;
  }
  if (options?.min !== undefined && num < options.min) {
    return `${fieldName} must be at least ${options.min}`;
  }
  if (options?.max !== undefined && num > options.max) {
    return `${fieldName} cannot exceed ${options.max}`;
  }
  if (options?.maxDecimals !== undefined) {
    const str = String(val).trim();
    const decimalParts = str.split('.');
    if (decimalParts.length === 2 && decimalParts[1].length > options.maxDecimals) {
      return `${fieldName} cannot have more than ${options.maxDecimals} decimal places`;
    }
  }
  return true;
};


/**
 * Validates that a numeric field is present, valid, and non-negative (>= 0).
 * Allows zero, but rejects negative numbers.
 */
export const nonNegativeNumber = (
  val: unknown,
  fieldName = 'Value',
  options?: { max?: number; maxDecimals?: number }
): true | string => {
  if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
    return `${fieldName} is required`;
  }
  const num = parseNumericValue(val);
  if (num === null) {
    return `${fieldName} must be a valid number`;
  }
  if (num < 0) {
    return `${fieldName} cannot be negative`;
  }
  if (options?.max !== undefined && num > options.max) {
    return `${fieldName} cannot exceed ${options.max}`;
  }
  if (options?.maxDecimals !== undefined) {
    const str = String(val).trim();
    const decimalParts = str.split('.');
    if (decimalParts.length === 2 && decimalParts[1].length > options.maxDecimals) {
      return `${fieldName} cannot have more than ${options.maxDecimals} decimal places`;
    }
  }
  return true;
};


/**
 * Validates an optional numeric field: if empty, passes; if provided, must be >= 0.
 */
export const optionalNonNegativeNumber = (
  val: unknown,
  fieldName = 'Value',
  options?: { max?: number; maxDecimals?: number }
): true | string => {
  if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
    return true;
  }
  const num = parseNumericValue(val);
  if (num === null) {
    return `${fieldName} must be a valid number`;
  }
  if (num < 0) {
    return `${fieldName} cannot be negative`;
  }
  if (options?.max !== undefined && num > options.max) {
    return `${fieldName} cannot exceed ${options.max}`;
  }
  if (options?.maxDecimals !== undefined) {
    const str = String(val).trim();
    const decimalParts = str.split('.');
    if (decimalParts.length === 2 && decimalParts[1].length > options.maxDecimals) {
      return `${fieldName} cannot have more than ${options.maxDecimals} decimal places`;
    }
  }
  return true;
};


/**
 * Validates percentage values (0 to 100%).
 */
export const validPercentage = (
  val: unknown,
  fieldName = 'Percentage',
  options?: { optional?: boolean }
): true | string => {
  if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
    return options?.optional ? true : `${fieldName} is required`;
  }
  const num = parseNumericValue(val);
  if (num === null) {
    return `${fieldName} must be a valid number`;
  }
  if (num < 0) {
    return `${fieldName} cannot be negative`;
  }
  if (num > 100) {
    return `${fieldName} cannot exceed 100%`;
  }
  return true;
};


/**
 * Validates monetary / currency amounts (2-decimal precision, >= 0 or > 0).
 */
export const validCurrencyAmount = (
  val: unknown,
  fieldName = 'Amount',
  options?: { allowZero?: boolean; max?: number; allowNegative?: boolean }
): true | string => {
  if (options?.allowNegative) {
    const num = parseNumericValue(val);
    if (num === null) return `${fieldName} must be a valid number`;
    const str = String(val).trim();
    const decimalParts = str.split('.');
    if (decimalParts.length === 2 && decimalParts[1].length > 2) {
      return `${fieldName} cannot have more than 2 decimal places`;
    }
    if (options?.max !== undefined && Math.abs(num) > options.max) {
      return `${fieldName} cannot exceed ${options.max}`;
    }
    return true;
  }
  if (options?.allowZero) {
    return nonNegativeNumber(val, fieldName, { max: options?.max, maxDecimals: 2 });
  }
  return requiredPositiveNumber(val, fieldName, { max: options?.max, maxDecimals: 2 });
};


/**
 * Validates item quantities (allows decimals for units like Kg/Ltr, or integers for PCS).
 */
export const validQuantity = (
  val: unknown,
  fieldName = 'Quantity',
  options?: { allowZero?: boolean; integerOnly?: boolean; max?: number }
): true | string => {
  const check = options?.allowZero
    ? nonNegativeNumber(val, fieldName, { max: options?.max })
    : requiredPositiveNumber(val, fieldName, { max: options?.max });

  if (check !== true) return check;

  const num = parseNumericValue(val);
  if (options?.integerOnly && num !== null && !Number.isInteger(num)) {
    return `${fieldName} must be a whole number`;
  }
  return true;
};


/**
 * Validates that minVal does not exceed maxVal (for ranges and filters).
 */
export const validRange = (
  minVal: unknown,
  maxVal: unknown,
  minName = 'Minimum value',
  maxName = 'Maximum value'
): true | string => {
  const minNum = parseNumericValue(minVal);
  const maxNum = parseNumericValue(maxVal);

  if (minNum !== null && minNum < 0) {
    return `${minName} cannot be negative`;
  }
  if (maxNum !== null && maxNum < 0) {
    return `${maxName} cannot be negative`;
  }
  if (minNum !== null && maxNum !== null && minNum > maxNum) {
    return `${minName} cannot exceed ${maxName}`;
  }
  return true;
};


/**
 * Validates signed adjustments (e.g. manual round-off adjustments).
 * Legitimate signed values (positive or negative) are allowed within the bounds.
 */
export const validSignedAdjustment = (
  val: unknown,
  fieldName = 'Adjustment',
  options?: { min?: number; max?: number; baseTotal?: number; maxOffset?: number }
): true | string => {
  if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
    return true;
  }
  const num = parseNumericValue(val);
  if (num === null) {
    return `${fieldName} must be a valid number`;
  }
  if (options?.baseTotal !== undefined && options.baseTotal + num < 0) {
    return `${fieldName} cannot result in a negative total`;
  }
  if (options?.maxOffset !== undefined && Math.abs(num) > options.maxOffset) {
    return `${fieldName} cannot exceed ±${options.maxOffset}`;
  }
  if (options?.min !== undefined && num < options.min) {
    return `${fieldName} cannot be less than ${options.min}`;
  }
  if (options?.max !== undefined && num > options.max) {
    return `${fieldName} cannot exceed ${options.max}`;
  }
  return true;
};


/**
 * Keystroke sanitizer for non-negative inputs.
 * Blocks '-', '+', 'e', 'E', and optionally '.' if decimal not allowed.
 */
export const handleNonNegativeKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement>,
  allowDecimal = true
) => {
  if (
    e.key === 'Backspace' ||
    e.key === 'Delete' ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowRight' ||
    e.key === 'Tab' ||
    e.key === 'Enter' ||
    e.ctrlKey ||
    e.metaKey
  ) {
    return;
  }
  // Block negative minus, plus, exponential notation
  if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
    e.preventDefault();
    return;
  }
  if (!allowDecimal && e.key === '.') {
    e.preventDefault();
    return;
  }
  if (allowDecimal && e.key === '.') {
    if (e.currentTarget.value.includes('.')) {
      e.preventDefault();
    }
  }
};


/**
 * Sanitizes input string to ensure it contains only non-negative numeric characters.
 */
export const sanitizeNonNegativeInput = (raw: string, allowDecimal = true): string => {
  if (!raw) return '';
  if (allowDecimal) {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return `${parts[0]}.${parts.slice(1).join('')}`;
    }
    return cleaned;
  }
  return raw.replace(/[^0-9]/g, '');
};


/**
 * Phone numbers with a country code (from the PhoneField dropdown), e.g. "+919876543210" or "+14155552671".
 * Numbers without a "+" are treated as Indian (older records).
 */
export const isValidIntlPhone = (val?: string | null): boolean => {
  const v = (val || "").toString().trim().replace(/[\s()-]/g, "");
  if (!v) return false;
  return v.startsWith("+") ? isValidPhoneNumber(v) : isValidIndianPhone(v);
};

/**
 * Form check for a phone field that may carry a country code (PhoneField).
 * Returns null when valid, otherwise a user-friendly message.
 * `label` is a lower-case noun phrase, e.g. "phone number", "WhatsApp number".
 */
export const checkIntlPhone = (
  value?: string | null,
  required = false,
  label = "phone number",
): string | null => {
  const v = (value ?? "").toString().trim();
  if (!v) return required ? `Please enter the ${label}.` : null;
  return isValidIntlPhone(v) ? null : `Please enter a valid ${label}.`;
};

/**
 * Value stored/sent for a phone: always "+<country code><number>" (e.g. "+918484956848").
 * A number without a "+" (older records) is treated as Indian.
 */
export const normalizePhoneForSave = (val?: string | null): string => {
  if (!val) return "";
  const v = val.toString().trim();
  if (v.startsWith("+")) return `+${v.replace(/\D/g, "")}`;
  const national = normalizeIndianPhoneTo10Digits(v);
  return national ? `+91${national}` : "";
};
