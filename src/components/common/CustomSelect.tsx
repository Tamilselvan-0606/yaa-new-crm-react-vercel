import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  triggerClassName?: string;
  menuClassName?: string;
  activeColor?: 'orange' | 'emerald' | 'brand';
  size?: 'sm' | 'md';
  allowClear?: boolean;
  disabled?: boolean;
  error?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className = '',
  triggerClassName = '',
  menuClassName = '',
  activeColor = 'brand',
  size = 'md',
  allowClear = false,
  disabled = false,
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 220 && rect.top > 220;

    setDropdownPos({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 110),
      openUpward,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Select Trigger Box */}
      <div
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={toggleDropdown}
        onKeyDown={(e) => {
          if (disabled) return;
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
        className={`w-full ${
          size === 'sm' ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-xs sm:text-[13px]'
        } bg-white hover:bg-slate-50/60 border font-medium text-slate-800 rounded-xl flex items-center justify-between transition-all focus:outline-none ${
          disabled
            ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed'
            : error
            ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
            : isOpen
            ? 'border-[#4309A2] ring-4 ring-[#4309A2]/10 shadow-xs cursor-pointer'
            : 'border-slate-200 hover:border-slate-300 cursor-pointer focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10'
        } ${triggerClassName}`}
      >
        <span
          className={
            selectedOption
              ? 'text-slate-900 font-medium truncate'
              : 'text-slate-400 font-medium truncate'
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ml-1.5 ${
            isOpen ? 'rotate-180 text-[#33077C]' : ''
          }`}
        />
      </div>

      {/* Dropdown Floating Menu with Portal */}
      {isOpen &&
        dropdownPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: dropdownPos.openUpward ? undefined : dropdownPos.top,
              bottom: dropdownPos.openUpward
                ? window.innerHeight - dropdownPos.top
                : undefined,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 999999,
            }}
            className={`bg-white rounded-xl border border-slate-200/90 shadow-2xl shadow-slate-900/15 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs p-1 space-y-0.5 max-h-56 overflow-y-auto ${menuClassName}`}
          >
            {allowClear && (
              <div
                onClick={() => handleSelect('')}
                className={`px-3 py-2 text-xs sm:text-[13px] transition-all cursor-pointer flex items-center justify-between ${
                  !value
                    ? 'bg-[#33077C]/10 text-[#33077C] font-semibold'
                    : 'text-slate-400 font-medium hover:bg-slate-50 hover:text-slate-700'
                }`}
                style={{ borderRadius: '4px' }}
              >
                <span className="truncate">{placeholder}</span>
                {!value && (
                  <Check className="w-4 h-4 stroke-[2.5] ml-2 shrink-0 text-[#33077C]" />
                )}
              </div>
            )}

            {normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);

              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`px-2.5 py-1.5 text-[11.5px] transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? activeColor === 'brand'
                        ? 'bg-[#33077C]/10 text-[#33077C] font-bold'
                        : activeColor === 'orange'
                        ? 'bg-orange-50 text-[#4309A2] font-bold'
                        : 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-700 font-medium hover:bg-purple-50/60 hover:text-[#33077C]'
                  }`}
                  style={{ borderRadius: '4px' }}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 stroke-[2.5] ml-2 shrink-0 ${
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
          </div>,
          document.body
        )}
    </div>
  );
};

