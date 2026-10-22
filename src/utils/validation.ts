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
