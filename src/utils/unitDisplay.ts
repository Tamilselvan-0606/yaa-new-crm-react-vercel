/**
 * The unit text to print next to a quantity on documents (PDF, print view, downloads).
 * "NONE" / "N/A" / blank are placeholders meaning "no unit chosen", so they are not shown ("100", not "100 NONE").
 */
export const displayUnit = (unit?: string | null): string => {
  const u = String(unit ?? '').trim();
  if (!u) return '';
  return /^(none|n\/a|na|null|undefined|-)$/i.test(u) ? '' : u;
};
