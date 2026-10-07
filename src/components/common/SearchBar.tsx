import React from 'react';
import { Search, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /**
   * Called when the Apply button is clicked.
   * If omitted the Apply button is not rendered.
   */
  onSubmit?: (value: string) => void;
  /**
   * Called when the Reset button is clicked.
   * If omitted the Reset button is not rendered.
   */
  onReset?: () => void;
  /** Optional right-side slot pushed to the far right (e.g. a count label) */
  rightSlot?: React.ReactNode;
  /** Slot rendered right after the search input (e.g. a FilterDropdown) */
  filterSlot?: React.ReactNode;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  onSubmit,
  onReset,
  filterSlot,
  rightSlot,
  className = '',
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmit) onSubmit(value);
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-xs flex flex-wrap items-center gap-2.5 sm:gap-3 ${className}`}
    >
      {/* Search input &mdash; responsive fluid width */}
      <div className="relative flex-1 min-w-[200px] max-w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-10 sm:h-11 pl-10 pr-4 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200/80 focus:border-[#4309A2] rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Filter slot &mdash; wrapped flex row */}
      {filterSlot && (
        <div className="flex items-center gap-2 flex-wrap">{filterSlot}</div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {onSubmit && (
          <Button
            variant="primary"
            size="md"
            icon={<CheckCircle2 className="w-4 h-4" />}
            onClick={() => onSubmit(value)}
            title="Apply search"
          >
            Apply
          </Button>
        )}

        {onReset && (
          <Button
            variant="secondary"
            size="md"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={onReset}
            title="Clear search"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Right slot &mdash; pushed to the far right on larger screens */}
      {rightSlot && <div className="w-full sm:w-auto sm:ml-auto shrink-0 pt-1 sm:pt-0">{rightSlot}</div>}
    </div>
  );
};

export default SearchBar;
