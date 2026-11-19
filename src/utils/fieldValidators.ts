import { isValidIndianPhone } from './validation';
import { isValidGstin, isValidPan } from './formValidation';

/**
 * THE shared field-validation module. Every form (Organization, Sub Organization, Branch, Product,
 * Lead, Client, Sales Representative, ...) builds its rules from the validators below, so a rule such
 * as "Indian mobile number" or "GST number" exists in exactly one place.
 *
 * How it works
 *  - A `Validator` takes the raw string and returns an error message, or `null` when valid.
 *  - Every validator except `required` treats an empty value as valid, so
 *      optional field  ->  [indianMobile('WhatsApp Number')]
 *      required field  ->  [required('Mobile Number is required'), indianMobile('Mobile Number')]
 *  - Plain forms:   const errors = validateFields([[field, value, validators], ...]);
 *  - zod forms:     z.string().superRefine(zodValidate([required(...), emailAddress]))
 *  - Typing helpers (`digitsOnly`, `alphanumericUpper`, `liveMobileStartError`) keep inputs consistent.
 */

export type Validator = (value: string) => string | null;
export type FieldErrors = Record<string, string>;
/** [field key, current value, validators in the order they should run] */
export type FieldRule = readonly [field: string, value: string, validators: Validator[]];

const isEmpty = (v: string) => v.trim() === '';

// -----------------------------------------------------------------------------
// Runners
// -----------------------------------------------------------------------------

/** Runs validators in order and returns the first error ('' when the value is valid). */
export const firstError = (value: string, validators: Validator[]): string => {
  for (const validate of validators) {
    const error = validate(value);
    if (error) return error;
  }
  return '';
};

/** Collects the first error of every rule; fields without an error are left out. */
export const validateFields = (rules: readonly FieldRule[]): FieldErrors => {
  const errors: FieldErrors = {};
  for (const [field, value, validators] of rules) {
    const error = firstError(value, validators);
    if (error) errors[field] = error;
  }
  return errors;
};

/** Adapter for zod: `z.string().superRefine(zodValidate([...validators]))`. Needs no zod import. */
export const zodValidate =
  (validators: Validator[]) =>
  (value: string | undefined, ctx: { addIssue: (issue: { code: 'custom'; message: string }) => void }): void => {
    const message = firstError(value ?? '', validators);
    if (message) ctx.addIssue({ code: 'custom', message });
  };

/** Keeps only the server-reported errors that belong to fields shown in the form. */
export const pickFieldErrors = (all: FieldErrors, fields: readonly string[]): FieldErrors => {
  const picked: FieldErrors = {};
  for (const field of fields) if (all[field]) picked[field] = all[field];
  return picked;
};

// -----------------------------------------------------------------------------
// Composition helpers
// -----------------------------------------------------------------------------

/** Includes the validators only when `condition` is true (e.g. "only when creating"). */
export const when = (condition: boolean, validators: Validator[]): Validator[] => (condition ? validators : []);

/** `required(message)` in front of the validators, only when `isRequired` is true. */
export const requiredWhen = (isRequired: boolean, message: string, validators: Validator[] = []): Validator[] =>
  isRequired ? [required(message), ...validators] : validators;

// -----------------------------------------------------------------------------
// Validators
// -----------------------------------------------------------------------------

export const required =
  (message: string): Validator =>
  (v) => (isEmpty(v) ? message : null);

export const minLength =
  (min: number, message: string): Validator =>
  (v) => (isEmpty(v) || v.trim().length >= min ? null : message);

/** Strong password: 8+ characters with an uppercase letter, a lowercase letter, a number and a special character. */
export const strongPassword: Validator = (v) =>
  isEmpty(v) ||
  (v.length >= 8 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9\s]/.test(v) && !/\s/.test(v))
    ? null
    : 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character';

/** Indian mobile number: starts with 6-9 and is exactly 10 digits (formatting characters are ignored). */
export const indianMobile =
  (label: string): Validator =>
  (v) => {
    if (isEmpty(v)) return null;
    const digits = v.replace(/\D/g, '');
    if (!/^[6-9]/.test(digits)) return `${label} must start with 6, 7, 8 or 9`;
    if (digits.length !== 10) return `${label} must be exactly 10 digits`;
    return null;
  };

/** Phone / WhatsApp number: digits only, 10 to 15 digits (international numbers allowed). */
export const PHONE_MAX_DIGITS = 15;
export const phoneNumber =
  (label: string): Validator =>
  (v) => {
    if (isEmpty(v)) return null;
    const digits = v.replace(/\D/g, '');
    // India (+91): exactly 10 digits after the code, starting with 6, 7, 8 or 9.
    if (v.trim().startsWith('+91')) {
      const national = digits.slice(2);
      if (!/^[6-9]/.test(national)) return `${label} must start with 6, 7, 8 or 9`;
      if (national.length !== 10) return `${label} must be exactly 10 digits`;
      return null;
    }
    if (digits.length < 10) return `${label} must be at least 10 digits`;
    if (digits.length > PHONE_MAX_DIGITS) return `${label} must be at most ${PHONE_MAX_DIGITS} digits`;
    return null;
  };

/** Looser phone check that also accepts +91 / 0 prefixes (used for alternate phone numbers). */
export const indianPhoneAnyFormat =
  (message: string): Validator =>
  (v) => (isEmpty(v) || isValidIndianPhone(v) ? null : message);

/**
 * Formats phone number to always have a clean space between the international dial code and the national number.
 * E.g., "+656574123698879" -> "+65 6574123698879", "+919962515246" -> "+91 9962515246".
 */
export const formatPhoneNumber = (value?: string | null): string => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  // If it already has a space after the dial code (e.g. "+91 9876543210"), keep clean single-spaced
  if (/^\+\d+\s+/.test(trimmed)) {
    return trimmed.replace(/\s+/g, ' ');
  }
  // If it starts with '+', parse dial code (1 to 4 digits) and separate with a space
  if (trimmed.startsWith('+')) {
    const raw = trimmed.slice(1).replace(/\D/g, '');
    if (!raw) return trimmed;

    // Common 1, 2, 3 digit prefixes:
    // +1 (US/Canada), +7 (Russia/Kazakhstan)
    // +20..+29, +30..+39, +40..+49, +51..+58, +60..+66, +81..+86, +90..+98
    const twoDigitPrefixes = [
      '20', '27', '28', '30', '31', '32', '33', '34', '36', '39',
      '40', '41', '43', '44', '45', '46', '47', '48', '49',
      '51', '52', '53', '54', '55', '56', '57', '58',
      '60', '61', '62', '63', '64', '65', '66',
      '81', '82', '84', '86',
      '90', '91', '92', '93', '94', '95', '98'
    ];

    if (raw.startsWith('1') || raw.startsWith('7')) {
      if (raw.length > 1) return `+${raw[0]} ${raw.slice(1)}`;
      return `+${raw}`;
    }

    const two = raw.slice(0, 2);
    if (twoDigitPrefixes.includes(two)) {
      if (raw.length > 2) return `+${two} ${raw.slice(2)}`;
      return `+${raw}`;
    }

    if (raw.length > 3) {
      return `+${raw.slice(0, 3)} ${raw.slice(3)}`;
    }
    return trimmed;
  }
  return trimmed;
};

const GST_FORMAT_MESSAGE = 'Enter a valid GST number (e.g. 33AAAAA0000A1Z5)';
const PAN_FORMAT_MESSAGE = 'Enter a valid PAN number (e.g. AAAAA0000A)';

export const validGst: Validator = (v) =>
  isEmpty(v) || isValidGstin(v.replace(/[^a-zA-Z0-9]/g, '')) ? null : GST_FORMAT_MESSAGE;

export const validPan: Validator = (v) =>
  isEmpty(v) || isValidPan(v.replace(/[^a-zA-Z0-9]/g, '')) ? null : PAN_FORMAT_MESSAGE;

/**
 * Pincode / postal code. Uses the country's own rule from the master data when there is one
 * (e.g. "^(\d{6})$" for India), otherwise the Indian 6-digit rule.
 */
export const pincodeMatching =
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (_regex?: string | null, _format?: string | null): Validator =>
  (v) => validPincode(v);

/** Typing filter for a pincode: digits only, max 6 (no spaces, letters or extra digits). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const cleanPincode = (raw: string, _regex?: string | null): string => raw.replace(/\D/g, '').slice(0, 6);

/** Optional non-negative number (amounts such as a discount). */
export const nonNegativeAmount =
  (label: string): Validator =>
  (v) => (isEmpty(v) || (Number.isFinite(Number(v)) && Number(v) >= 0) ? null : `${label} must be a valid amount`);

/** Indian PIN code: 6 digits, not starting with 0. */
export const validPincode: Validator = (v) =>
  isEmpty(v) || /^[1-9]\d{5}$/.test(v.trim()) ? null : 'Please enter a valid 6-digit pincode.';

// No leading dot, no consecutive dots, no dot/hyphen at the domain start, TLD of 2+ letters.
const EMAIL_PATTERN = /^(?!\.)(?!.*\.\.)[A-Za-z0-9_'+\-.]*?[A-Za-z0-9_+-]@(?![.-])([A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/;
export const isValidEmailAddress = (v?: string | null): boolean => !!v && EMAIL_PATTERN.test(v.trim());

export const emailAddress: Validator = (v) =>
  isEmpty(v) || isValidEmailAddress(v) ? null : 'Please enter a valid email address';

/** Letters (any language) separated by single spaces: no digits, symbols or punctuation. */
const LETTERS_AND_SPACES = /^\p{L}+(?: \p{L}+)*$/u;

/** A person's name: alphabets only. Use for Contact Person / Full Name fields. */
export const alphabetsOnly =
  (label: string): Validator =>
  (v) => (isEmpty(v) || LETTERS_AND_SPACES.test(v.trim()) ? null : `${label} should contain alphabets only`);

// -----------------------------------------------------------------------------
// Typing helpers
// -----------------------------------------------------------------------------

/** Keeps digits only, capped at `max` characters. */
export const digitsOnly = (raw: string, max = 10): string => raw.replace(/\D/g, '').slice(0, max);

/** GST / PAN style input: letters and digits only, upper-cased, capped at `max` characters. */
export const alphanumericUpper = (raw: string, max: number): string =>
  raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, max);


/** Name-style input: keeps only letters and spaces (digits and symbols are dropped as you type). */
export const lettersOnly = (raw: string, max = 100): string =>
  raw.replace(/[^\p{L}\s]/gu, '').replace(/\s{2,}/g, ' ').replace(/^\s+/, '').slice(0, max);
/** While typing a mobile number, only the first digit can already be wrong. */
export const liveMobileStartError = (label: string, digits: string): string =>
  digits && !/^[6-9]/.test(digits) ? `${label} must start with 6, 7, 8 or 9` : '';

// Character rules by position, used while typing. A character that breaks its slot is an error right away,
// the same way a mobile number starting with 0-5 is.
const GST_SLOTS = [/\d/, /\d/, /[A-Z]/, /[A-Z]/, /[A-Z]/, /[A-Z]/, /[A-Z]/, /\d/, /\d/, /\d/, /\d/, /[A-Z]/, /[1-9A-Z]/, /Z/, /[0-9A-Z]/];
const PAN_SLOTS = [/[A-Z]/, /[A-Z]/, /[A-Z]/, /[A-Z]/, /[A-Z]/, /\d/, /\d/, /\d/, /\d/, /[A-Z]/];


const slotError = (value: string, slots: RegExp[], message: string): string => {
  const chars = value.toUpperCase();
  for (let i = 0; i < chars.length; i++) {
    if (i >= slots.length || !slots[i].test(chars[i])) return message;
  }
  return '';
};

/** While typing a GST number: 2 digits, 5 letters, 4 digits, 1 letter, then a letter/digit, "Z", a letter/digit. */
export const liveGstError = (value: string): string => slotError(value, GST_SLOTS, GST_FORMAT_MESSAGE);

/** While typing a PAN: 5 letters, 4 digits, 1 letter. */
export const livePanError = (value: string): string => slotError(value, PAN_SLOTS, PAN_FORMAT_MESSAGE);
