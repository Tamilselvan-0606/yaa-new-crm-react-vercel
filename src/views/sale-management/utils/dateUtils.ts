/**
 * Shared date display for the Sale Management tables: DD/MM/YYYY, matching the Payment In table.
 * Accepts ISO dates / date-times (2026-10-28, 2026-10-28T10:00:00Z), Date objects, and values that are
 * already DD/MM/YYYY (returned unchanged). Anything unparseable is returned as given.
 */
export const formatDate = (value?: string | Date | null, fallback = '-'): string => {
  if (value === undefined || value === null || value === '') return fallback;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return fallback;
    const dd = String(value.getDate()).padStart(2, '0');
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${value.getFullYear()}`;
  }

  const text = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(text);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return text;

  // Other textual dates (e.g. "28 Oct 2026"): parse and reformat, else leave as is
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? text : formatDate(parsed, fallback);
};
