import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface PaginationProps {
  /** Total number of records (before paging) */
  total?: number;
  totalItems?: number;
  /** Current page (1-indexed) */
  currentPage: number;
  /** Number of rows shown per page */
  pageSize: number;
  /** Available page-size options */
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  total: totalProp,
  totalItems,
  currentPage,
  pageSize,
  pageSizeOptions = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
  className = '',
}) => {
  const total = totalProp !== undefined ? totalProp : (totalItems !== undefined ? totalItems : 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /** Builds page numbers with ellipsis placeholders */
  const pageItems = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

  const navBtnBase =
    'w-6 h-6 rounded border text-[11px] font-semibold transition-colors flex items-center justify-center';
  const navBtnActive = 'bg-[#33077C] border-[#33077C] text-white shadow-xs font-bold';
  const navBtnDefault =
    'border-slate-200 bg-white text-slate-500 hover:border-[#33077C] hover:text-[#33077C]';
  const navBtnDisabled =
    'border-slate-100 bg-white text-slate-300 cursor-not-allowed opacity-60';

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 ${className}`}
    >
      {/* Left: rows per page + record range */}
      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
        <span>Rows per page:</span>

        {/* Custom page-size dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-slate-50/80 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer transition-colors select-none"
          >
            <span>{pageSize}</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute bottom-full mb-1.5 left-0 w-[56px] bg-white rounded-md shadow-lg border border-slate-100 py-1 z-50 overflow-hidden">
              {pageSizeOptions.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    onPageSizeChange(n);
                    onPageChange(1);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-center px-2 py-1.5 text-xs font-semibold transition-colors ${
                    n === pageSize
                      ? 'bg-purple-50 text-[#33077C] font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-slate-300">|</span>
        <span>
          Showing <span className="font-bold text-slate-800">{from}&ndash;{to}</span> of{' '}
          <span className="font-bold text-slate-800">{total}</span>
        </span>
      </div>

      {/* Right: page navigation */}
      <div className="flex items-center gap-1.5">
        {/* First */}
        <button
          onClick={() => onPageChange(1)}
          disabled={safePage === 1}
          className={`${navBtnBase} ${safePage === 1 ? navBtnDisabled : navBtnDefault}`}
          title="First page"
        >
          &laquo;
        </button>

        {/* Prev */}
        <button
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
          className={`${navBtnBase} ${safePage === 1 ? navBtnDisabled : navBtnDefault}`}
          title="Previous page"
        >
          &lsaquo;
        </button>

        {/* Page numbers */}
        {pageItems.map((item, idx) =>
          item === '...' ? (
            <span
              key={`ellipsis-${idx}`}
              className="w-6 h-6 flex items-center justify-center text-slate-400 text-xs font-semibold select-none"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item as number)}
              className={`${navBtnBase} ${safePage === item ? navBtnActive : navBtnDefault}`}
            >
              {item}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
          className={`${navBtnBase} ${safePage === totalPages ? navBtnDisabled : navBtnDefault}`}
          title="Next page"
        >
          &rsaquo;
        </button>

        {/* Last */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={safePage === totalPages}
          className={`${navBtnBase} ${safePage === totalPages ? navBtnDisabled : navBtnDefault}`}
          title="Last page"
        >
          &raquo;
        </button>
      </div>
    </div>
  );
};

export default Pagination;
