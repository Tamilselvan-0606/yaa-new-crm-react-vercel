import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  className?: string;
  activeColor?: 'orange' | 'emerald' | 'brand';
  size?: 'sm' | 'md';
  allowClear?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className = '',
  activeColor = 'brand',
  size = 'md',
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const scrollParent = containerRef.current.closest('.overflow-y-auto');
      let spaceBelow = window.innerHeight - rect.bottom;
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        spaceBelow = Math.min(spaceBelow, parentRect.bottom - rect.bottom);
      }
      // Only flip upward if space below is very small (< 110px) and space above is larger
      const spaceAbove = rect.top;
      const shouldFlipUp = spaceBelow < 110 && spaceAbove > 150;
      setOpenUpward(shouldFlipUp);
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className} ${isOpen ? 'z-50' : 'z-auto'}`}>
      {/* Select Trigger Box */}
      <div
        tabIndex={0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={toggleDropdown}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            toggleDropdown();
          } else if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
          }
        }}
        className={`w-full ${size === 'sm' ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-xs sm:text-[13px]'} bg-white hover:bg-slate-50/60 border font-medium text-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition-all focus:outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 ${
          isOpen
            ? 'border-[#4309A2] ring-4 ring-[#4309A2]/10 shadow-xs'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className={selectedOption ? 'text-slate-900 font-medium truncate' : 'text-slate-400 font-medium truncate'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ml-2 ${
            isOpen ? 'rotate-180 text-[#33077C]' : ''
          }`}
        />
      </div>

      {/* Dropdown Floating Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } w-full bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 max-h-56 overflow-y-auto`}
        >
          {allowClear && (
            <div
              onClick={() => handleSelect('')}
              className={`px-3 py-2 text-xs sm:text-[13px] transition-all cursor-pointer flex items-center justify-between ${
                !value
                  ? 'bg-[#33077C]/10 text-[#33077C] font-semibold'
                  : 'text-slate-400 font-medium hover:bg-slate-50 hover:text-slate-700'
              }`}
              style={{ borderRadius: '3px' }}
            >
              <span className="truncate">{placeholder}</span>
              {!value && <Check className="w-4 h-4 stroke-[2.5] ml-2 shrink-0 text-[#33077C]" />}
            </div>
          )}

          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;

            return (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`px-3 py-2 text-xs sm:text-[13px] transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? activeColor === 'brand'
                      ? 'bg-[#33077C]/10 text-[#33077C] font-semibold'
                      : activeColor === 'orange'
                      ? 'bg-orange-50 text-[#4309A2] font-semibold'
                      : 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900'
                }`}
                style={{ borderRadius: '3px' }}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check
                    className={`w-4 h-4 stroke-[2.5] ml-2 shrink-0 ${
                      activeColor === 'brand'
                        ? 'text-[#33077C]'
                        : activeColor === 'orange'
                        ? 'text-[#4309A2]'
                        : 'text-emerald-600'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
