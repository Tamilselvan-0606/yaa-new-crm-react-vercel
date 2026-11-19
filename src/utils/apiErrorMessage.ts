const joinMessages = (list: any, format: (item: any) => string): string | null =>
  Array.isArray(list) ? list.map(format).join(', ') : null;

/**
 * Best human-readable message from an API / axios error.
 * Order: response.message, response.error.message, response.errors[], response.fields[], error.message, fallback.
 */
/** "receiptNo" -> "receipt number", "invoiceDate" -> "invoice date", ["items", 1, "quantity"] -> "item 2 quantity". */
export const humanizeFieldPath = (path: Array<string | number> | string | undefined): string => {
  const parts = Array.isArray(path) ? path : String(path ?? "").split(".");
  const words: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (typeof part === "number" || /^\d+$/.test(String(part))) continue;
    let text = String(part)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .toLowerCase()
      .trim();
    text = text.replace(/\bno$/, "number").replace(/\bid$/, "").trim();
    // "items" followed by a row index reads better as "item 2"
    const next = parts[i + 1];
    if ((text === "items" || text === "item") && next !== undefined && /^\d+$/.test(String(next))) {
      text = `item ${Number(next) + 1}`;
    }
    if (text) words.push(text);
  }
  return words.join(" ") || "value";
};

/** Turns one backend (zod-style) field message into a plain user-friendly sentence. */
export const friendlyFieldMessage = (path: Array<string | number> | string | undefined, message: string): string => {
  const label = humanizeFieldPath(path);
  const cap = label.charAt(0).toUpperCase() + label.slice(1);
  const m = String(message || "").trim();

  let hit = m.match(/Too small: expected string to have >=\s*(\d+) characters?/i);
  if (hit) return Number(hit[1]) <= 1 ? `Please enter the ${label}.` : `${cap} must be at least ${hit[1]} characters.`;
  hit = m.match(/Too big: expected string to have <=\s*(\d+) characters?/i);
  if (hit) return `${cap} must be at most ${hit[1]} characters.`;
  hit = m.match(/Too small: expected number to be >=\s*(-?[\d.]+)/i);
  if (hit) return Number(hit[1]) === 0 ? `${cap} cannot be negative.` : `${cap} must be at least ${hit[1]}.`;
  hit = m.match(/Too small: expected number to be >\s*(-?[\d.]+)/i);
  if (hit) return Number(hit[1]) === 0 ? `${cap} must be greater than zero.` : `${cap} must be greater than ${hit[1]}.`;
  hit = m.match(/Too big: expected number to be <=\s*(-?[\d.]+)/i);
  if (hit) return `${cap} cannot be more than ${hit[1]}.`;
  if (/expected (string|number|boolean|object|array), received undefined|Required|expected .* received null/i.test(m)) {
    return `Please enter the ${label}.`;
  }
  if (/Invalid (email|url|uuid)/i.test(m)) {
    const kind = m.match(/Invalid (email|url|uuid)/i)![1].toLowerCase();
    return kind === "email" ? "Please enter a valid email address." : `${cap} is not valid.`;
  }
  if (/Invalid input|Invalid option|Invalid enum/i.test(m)) return `${cap} is not valid.`;
  if (/^[A-Z].*[.!]$/.test(m) && !/expected|>=|<=/.test(m)) return m;
  return `${cap}: ${m}`;
};

/** The field-level reasons of a validation error: { error: { message: 'Invalid request', fields: [{ path, message }] } }. */
const fieldDetails = (data: any): string | null => {
  const fields = data?.error?.fields ?? data?.fields;
  if (!Array.isArray(fields) || fields.length === 0) return null;
  const sentences = fields
    .filter((f) => f && f.message)
    .slice(0, 3)
    .map((f) => friendlyFieldMessage(f.path ?? f.field, f.message));
  return sentences.length > 0 ? Array.from(new Set(sentences)).join('. ') : null;
};

export const getApiErrorMessage = (err: any, fallback = 'Something went wrong.'): string => {
  const data = err?.response?.data || err?.data;
  return (
    // A validation error says "Invalid request" and lists the real reasons in `fields`: show those.
    fieldDetails(data) ||
    (data?.error?.message && !/^(invalid request|validation error|bad request)$/i.test(data.error.message.trim()) ? data.error.message : null) ||
    (data?.message && !/^(invalid request|validation error|bad request)$/i.test(data.message.trim()) ? data.message : null) ||
    data?.error?.message ||
    data?.message ||
    joinMessages(data?.errors, (e) => e.message || e) ||
    err?.message ||
    fallback
  );
};
