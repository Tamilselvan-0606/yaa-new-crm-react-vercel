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

/** Looser phone check that also accepts +91 / 0 prefixes (used for alternate phone numbers). */
export const indianPhoneAnyFormat =
  (message: string): Validator =>
  (v) => (isEmpty(v) || isValidIndianPhone(v) ? null : message);

export const validGst: Validator = (v) =>
  isEmpty(v) || isValidGstin(v.replace(/[^a-zA-Z0-9]/g, '')) ? null : 'Enter a valid GST number (e.g. 33AAAAA0000A1Z5)';

export const validPan: Validator = (v) =>
  isEmpty(v) || isValidPan(v.replace(/[^a-zA-Z0-9]/g, '')) ? null : 'Enter a valid PAN number (e.g. AAAAA0000A)';

// No leading dot, no consecutive dots, no dot/hyphen at the domain start, TLD of 2+ letters.
const EMAIL_PATTERN = /^(?!\.)(?!.*\.\.)[A-Za-z0-9_'+\-.]*?[A-Za-z0-9_+-]@(?![.-])([A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/;
export const isValidEmailAddress = (v?: string | null): boolean => !!v && EMAIL_PATTERN.test(v.trim());

export const emailAddress: Validator = (v) =>
  isEmpty(v) || isValidEmailAddress(v) ? null : 'Please enter a valid email address';

// -----------------------------------------------------------------------------
// Typing helpers
// -----------------------------------------------------------------------------

/** Keeps digits only, capped at `max` characters. */
export const digitsOnly = (raw: string, max = 10): string => raw.replace(/\D/g, '').slice(0, max);

/** GST / PAN style input: letters and digits only, upper-cased, capped at `max` characters. */
export const alphanumericUpper = (raw: string, max: number): string =>
  raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, max);

/** While typing a mobile number, only the first digit can already be wrong. */
export const liveMobileStartError = (label: string, digits: string): string =>
  digits && !/^[6-9]/.test(digits) ? `${label} must start with 6, 7, 8 or 9` : '';
