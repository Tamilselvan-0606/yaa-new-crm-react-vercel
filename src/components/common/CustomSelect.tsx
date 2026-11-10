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
  /** Shows a search box at the top of the menu (long lists such as countries). */
  searchable?: boolean;
  /** 'strong': larger, semi-bold options (the look of the invoice client / organization dropdown). */
  optionVariant?: 'default' | 'strong';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  className = '',
  triggerClassName = '',
  menuClassName = '',
  activeColor = 'brand',
  size = 'md',
  allowClear = false,
  disabled = false,
  error = false,
  searchable = false,
  optionVariant = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
    maxHeight: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  // The option the keyboard is on (Arrow keys move it, Enter picks it).
  const [activeIndex, setActiveIndex] = useState(0);

  const normalizedOptions: SelectOption[] = (Array.isArray(options) ? options : []).map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const visibleOptions = searchable && query.trim()
    ? normalizedOptions.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : normalizedOptions;

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // Open on the side with room for the list; when neither side fits it, use the larger side and scroll inside the list.
    const openUpward = spaceBelow < 224 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(110, Math.min(224, (openUpward ? spaceAbove : spaceBelow) - 14));
    const viewportWidth = window.innerWidth;
    const menuWidth = Math.min(Math.max(rect.width, 130), Math.max(120, viewportWidth - 16));
    const clampedLeft = Math.max(8, Math.min(rect.left, viewportWidth - menuWidth - 8));

    setDropdownPos({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left: clampedLeft,
      width: menuWidth,
      openUpward,
      maxHeight,
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
        setQuery('');
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

  const openMenu = (initialQuery = '') => {
    if (disabled) return;
    updatePosition();
    setQuery(initialQuery);
    setIsOpen(true);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setQuery('');
  };

  // Picking with the keyboard puts the focus back on the field, so Tab carries on to the next one.
  const selectWithKeyboard = (val: string) => {
    handleSelect(val);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  // When the list opens (or the search text changes) the keyboard starts on the chosen option, else the first match.
  useEffect(() => {
    if (!isOpen) return;
    const selectedIdx = query.trim() ? -1 : visibleOptions.findIndex((o) => String(o.value) === String(value));
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, query]);

  useEffect(() => {
    if (isOpen) itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  const moveActive = (delta: number) => {
    const n = visibleOptions.length;
    if (n === 0) return;
    setActiveIndex((i) => (i + delta + n) % n);
  };

  /** Arrow keys, Home / End, Enter and Escape. Returns true when the key was handled. */
  const handleNavKey = (e: React.KeyboardEvent): boolean => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) openMenu();
        else moveActive(1);
        return true;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) openMenu();
        else moveActive(-1);
        return true;
      case 'Home':
        if (!isOpen) return false;
        e.preventDefault();
        setActiveIndex(0);
        return true;
      case 'End':
        if (!isOpen) return false;
        e.preventDefault();
        setActiveIndex(Math.max(0, visibleOptions.length - 1));
        return true;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation(); // a field inside a form must not submit it
        if (!isOpen) openMenu();
        else if (visibleOptions[activeIndex]) selectWithKeyboard(visibleOptions[activeIndex].value);
        return true;
      case 'Escape':
        if (!isOpen) return false;
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        setQuery('');
        triggerRef.current?.focus();
        return true;
      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
          setQuery('');
        }
        return false;
      default:
        return false;
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ') {
      e.preventDefault();
      if (!isOpen) openMenu();
      else if (!searchable && visibleOptions[activeIndex]) selectWithKeyboard(visibleOptions[activeIndex].value);
      return;
    }
    if (handleNavKey(e)) return;
    // Typing straight onto the field: search lists start their search with that letter; plain lists jump to it.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (searchable) {
        openMenu(e.key);
      } else {
        const idx = normalizedOptions.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
        if (idx >= 0) {
          if (!isOpen) openMenu();
          setActiveIndex(idx);
        }
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Select Trigger Box */}
      <div
        ref={triggerRef}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={toggleDropdown}
        onKeyDown={handleTriggerKeyDown}
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
              maxHeight: dropdownPos.maxHeight,
              zIndex: 999999,
            }}
            className={`bg-white rounded-xl border border-slate-200/90 shadow-2xl shadow-slate-900/15 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs p-1 space-y-0.5 max-h-56 overflow-y-auto ${menuClassName}`}
          >
            {searchable && (
              <div className="p-1 pb-1.5 sticky top-0 bg-white z-10">
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    // Tab from the search box continues to the field after this one, not into the page behind the list.
                    if (e.key === 'Tab') triggerRef.current?.focus();
                    handleNavKey(e);
                  }}
                  onFocus={(e) => {
                    const end = e.target.value.length;
                    e.target.setSelectionRange(end, end);
                  }}
                  placeholder="Search..."
                  className="w-full h-8 px-2.5 text-[11.5px] border border-slate-200 rounded-md outline-none focus:border-[#4309A2]"
                />
              </div>
            )}

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

            {visibleOptions.length === 0 && (
              <div className="px-3 py-2.5 text-xs text-slate-400 text-center italic select-none">
                No options available
              </div>
            )}

            {visibleOptions.map((opt, index) => {
              const isSelected = String(opt.value) === String(value);
              const isActive = index === activeIndex;

              return (
                <div
                  key={opt.value}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(opt.value)}
                  className={`${optionVariant === 'strong' ? 'px-3.5 py-2.5 text-xs gap-3' : 'px-2.5 py-1.5 text-[11.5px]'} transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? activeColor === 'brand'
                        ? 'bg-[#33077C]/10 text-[#33077C] font-bold'
                        : activeColor === 'orange'
                        ? 'bg-orange-50 text-[#4309A2] font-bold'
                        : 'bg-emerald-50 text-emerald-700 font-bold'
                      : optionVariant === 'strong'
                      ? `text-slate-800 font-semibold ${isActive ? 'bg-slate-100' : 'hover:bg-slate-50'}`
                      : `text-slate-700 font-medium ${isActive ? 'bg-purple-50/80 text-[#33077C]' : 'hover:bg-purple-50/60 hover:text-[#33077C]'}`
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

