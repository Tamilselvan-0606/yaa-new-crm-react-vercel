/**
 * The backend serialises Prisma / decimal.js `Decimal` values as their internal representation:
 *   { "s": 1, "e": 5, "d": [800000] }   ->  800000
 *   { "s": -1, "e": 1, "d": [12, 5000000] } -> -12.5
 * where `s` is the sign, `e` the base-10 exponent of the first digit and `d` the digits in base-1e7 words.
 * `Number(obj)` of that is NaN, which showed up as "₹NaN" / "NaN qty" in the screens.
 * These helpers turn such objects back into plain numbers, anywhere in a response.
 */

const BASE_DIGITS = 7; // decimal.js stores 7 decimal digits per array word

export const isDecimalLike = (v: unknown): v is { s: number; e: number; d: number[] } => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o);
  return (
    keys.length === 3 &&
    (o.s === 1 || o.s === -1) &&
    typeof o.e === 'number' &&
    Number.isInteger(o.e) &&
    Array.isArray(o.d) &&
    o.d.length > 0 &&
    o.d.every((w) => typeof w === 'number' && Number.isInteger(w) && w >= 0)
  );
};

/** Decimal.js internal form -> number. */
export const decimalToNumber = (dec: { s: number; e: number; d: number[] }): number => {
  const { s, e, d } = dec;
  // Digits: first word as-is, the rest left-padded to 7 digits.
  let digits = String(d[0]);
  for (let i = 1; i < d.length; i++) digits += String(d[i]).padStart(BASE_DIGITS, '0');

  const intLen = e + 1; // number of digits before the decimal point
  let text: string;
  if (intLen <= 0) {
    text = `0.${'0'.repeat(-intLen)}${digits}`;
  } else if (digits.length <= intLen) {
    text = digits + '0'.repeat(intLen - digits.length);
  } else {
    text = `${digits.slice(0, intLen)}.${digits.slice(intLen)}`;
  }
  const n = Number(text);
  if (!Number.isFinite(n)) return 0;
  return s < 0 ? -n : n;
};

/** Deep-copies a JSON value, replacing every Decimal-shaped object with a number. Other values are untouched. */
export const normalizeDecimals = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value;
  if (isDecimalLike(value)) return decimalToNumber(value) as unknown as T;
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((v) => {
      const n = normalizeDecimals(v);
      if (n !== v) changed = true;
      return n;
    });
    return (changed ? out : value) as unknown as T;
  }
  // Leave non-plain objects (Blob, ArrayBuffer, Date, ...) alone.
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = normalizeDecimals(v);
    if (n !== v) changed = true;
    out[k] = n;
  }
  return (changed ? out : value) as T;
};
