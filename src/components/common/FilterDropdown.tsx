import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface FilterOption<T extends string = string> {
  label: string;
  value: T;
  /** Optional dot color for status indicators */
  dotColor?: string;
  count?: number;
}

interface FilterDropdownProps<T extends string = string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  /** Tailwind max-height class of the open list (default shows about six options before scrolling). */
  maxHeightClass?: string;
}

export function FilterDropdown<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = 'Filter',
  className = '',
  maxHeightClass = 'max-h-60',
}: FilterDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setAlignRight(rect.left + 190 > window.innerWidth - 12 && rect.right > 190);
    }
    setOpen((o) => !o);
  };

  return (
    <div ref={ref} className={`relative max-w-full ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-2 h-10 sm:h-11 px-3 sm:px-3.5 max-w-full bg-transparent hover:bg-slate-100/70 active:scale-[0.98] transition-all duration-150 cursor-pointer select-none text-xs sm:text-[13px] font-semibold text-slate-700"
        style={{ borderRadius: '4px' }}
      >
        {/* Active dot */}
        {selected?.dotColor && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: selected.dotColor }}
          />
        )}
        <span className="flex-1 text-left truncate">{selected?.label ?? placeholder}</span>
        {selected?.count !== undefined && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#33077C]/10 text-[#33077C] text-[10px] font-bold shrink-0">
            {selected.count}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180 text-[#33077C]' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={`absolute top-full mt-1.5 ${alignRight ? 'right-0' : 'left-0'} min-w-[170px] max-w-[calc(100vw-1.5rem)] ${maxHeightClass} overflow-y-auto bg-white shadow-xl border border-slate-200 p-1 z-50 space-y-0.5`}
          style={{ borderRadius: '4px' }}
        >
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#33077C]/10 text-[#33077C]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                style={{ borderRadius: '3px' }}
              >
                {option.dotColor && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: option.dotColor }}
                  />
                )}
                <span className="flex-1 truncate">{option.label}</span>
                {option.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-[#33077C]/10 text-[#33077C]'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {option.count}
                  </span>
                )}
                {isActive && <Check className="w-4 h-4 shrink-0 text-[#33077C] stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FilterDropdown;
