import React from 'react';

export interface DropdownCountBarProps {
  /** e.g. "product" / "products": used for the label and the singular/plural wording. */
  singular: string;
  plural: string;
  /** How many are in the list right now. */
  shown: number;
  /** How many exist in total (or match the search), when the server tells us. */
  total?: number;
  /** True while the user has typed a search: the label becomes "Search results". */
  searching?: boolean;
  /** More pages exist but the total is not known: shows "10+". */
  hasMore?: boolean;
  className?: string;
}

/**
 * A slim strip at the top of a dropdown list that says how many records it holds:
 * "PRODUCTS  57", "PRODUCTS  10 of 57" (not all loaded yet), or "SEARCH RESULTS  3".
 */
export const DropdownCountBar: React.FC<DropdownCountBarProps> = ({ singular, plural, shown, total, searching, hasMore, className = '' }) => {
  const count = total ?? shown;
  const pill = total !== undefined ? (shown < total ? `${shown} of ${total}` : `${total}`) : hasMore ? `${shown}+` : `${shown}`;
  const label = searching ? 'Search results' : plural;
  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-100 bg-slate-50/80 text-[10.5px] ${className}`}
      aria-live="polite"
    >
      <span className="font-bold uppercase tracking-wider text-slate-500 truncate">{label}</span>
      <span
        className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 font-bold tabular-nums text-[#5B21B6]"
        title={`${pill} ${count === 1 ? singular : plural}`}
      >
        {pill}
      </span>
    </div>
  );
};
