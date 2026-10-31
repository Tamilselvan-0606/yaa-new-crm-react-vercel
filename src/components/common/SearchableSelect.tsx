import { useDebounce } from 'use-debounce';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X, Loader2, Plus } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  disabled?: boolean;
  data?: any;
}

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string, option?: SearchableOption) => void;
  options: (string | SearchableOption)[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  activeColor?: 'brand' | 'orange' | 'emerald';
  size?: 'sm' | 'md' | 'lg';
  allowClear?: boolean;
  emptyText?: string;
  onSearch?: (query: string) => void;
  onOpen?: () => void;
  isLoading?: boolean;
  // Server-side pagination & infinite scroll props
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  selectedItem?: SearchableOption;
  staticOptions?: SearchableOption[];
  onAddNew?: () => void;
  addNewText?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select Product...',
  className = '',
  triggerClassName = '',
  menuClassName = '',
  disabled = false,
  activeColor = 'brand',
  size = 'md',
  allowClear = false,
  emptyText = 'No options found',
  onSearch,
  onOpen,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  selectedItem,
  staticOptions = [],
  onAddNew,
  addNewText = 'Add New',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Normalize options
  const normalizedOptions: SearchableOption[] = useMemo(() => {
    return (Array.isArray(options) ? options : []).map((opt) =>
      typeof opt === 'string' ? { value: opt, label: opt } : opt
    );
  }, [options]);

  // Selected Option: checks explicitly passed selectedItem first (preserves value across pages)
  const selectedOption = useMemo(() => {
    if (selectedItem && String(selectedItem.value) === String(value)) {
      return selectedItem;
    }
    const inStatic = staticOptions.find((opt) => String(opt.value) === String(value));
    if (inStatic) return inStatic;
    return normalizedOptions.find((opt) => String(opt.value) === String(value));
  }, [normalizedOptions, value, selectedItem, staticOptions]);

  // Debounced search term via use-debounce
  const [debouncedSearchTerm] = useDebounce(searchTerm, 400);

  // Debounced API search callback when typing
  useEffect(() => {
    if (!onSearch || !isTyping) return;
    const trimmed = debouncedSearchTerm.trim();
    onSearch(trimmed);
  }, [debouncedSearchTerm, isTyping, onSearch]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!isTyping || !searchTerm.trim()) {
      return normalizedOptions;
    }
    // If external onSearch is provided, the backend supplies already-filtered items
    if (onSearch) {
      return normalizedOptions;
    }
    const query = searchTerm.toLowerCase().trim();
    return normalizedOptions.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(query);
      const matchSub = opt.subLabel?.toLowerCase().includes(query);
      const matchBadge = opt.badge?.toLowerCase().includes(query);
      const matchVal = opt.value.toLowerCase().includes(query);
      return matchLabel || matchSub || matchBadge || matchVal;
    });
  }, [normalizedOptions, isTyping, searchTerm, onSearch]);

  // Filter static options (e.g. None / Unassigned)
  const filteredStaticOptions = useMemo(() => {
    if (!staticOptions || staticOptions.length === 0) return [];
    if (!isTyping || !searchTerm.trim()) return staticOptions;
    const query = searchTerm.toLowerCase().trim();
    return staticOptions.filter((opt) =>
      opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query)
    );
  }, [staticOptions, isTyping, searchTerm]);

  // Calculate dropdown portal position
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 250 && spaceAbove > spaceBelow;
    const viewportWidth = window.innerWidth;
    const menuWidth = Math.min(Math.max(rect.width, 240), Math.max(160, viewportWidth - 16));
    const clampedLeft = Math.max(8, Math.min(rect.left, viewportWidth - menuWidth - 8));

    setDropdownPos({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left: clampedLeft,
      width: menuWidth,
      openUpward,
    });
  };

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    onOpen?.();
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsTyping(false);
    setSearchTerm('');
    setDropdownPos(null);
  };

  // Close on outside click or window scroll / resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      updatePosition();
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      handleClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
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

  // Infinite scroll trigger
  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || isLoading || isLoadingMore || !onLoadMore) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 30) {
      onLoadMore();
    }
  };

  const handleSelect = (opt: SearchableOption) => {
    onChange(opt.value, opt);
    handleClose();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setIsTyping(false);
  };

  // Determine what value to show inside the input
  const displayInputValue = isTyping
    ? searchTerm
    : selectedOption
    ? selectedOption.label
    : '';

  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs',
    md: 'h-10 px-3.5 text-xs font-bold',
    lg: 'h-11 px-4 text-xs sm:text-[13px] font-medium',
  }[size];

  return (
    <div ref={containerRef} className={`relative select-none w-full ${className}`}>
      {/* Searchable Input Trigger */}
      <div
        onClick={() => {
          if (!disabled) {
            handleOpen();
            inputRef.current?.focus();
          }
        }}
        className={`w-full ${sizeClasses} rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
          disabled
            ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
            ? 'bg-white border-[#4309A2] ring-3 ring-[#4309A2]/10 shadow-2xs text-slate-900'
            : 'bg-slate-50/70 hover:bg-white border-slate-200 hover:border-slate-300 text-slate-900 shadow-2xs'
        } ${triggerClassName}`}
      >
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={displayInputValue}
          placeholder={placeholder}
          onFocus={() => {
            handleOpen();
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsTyping(true);
            if (!isOpen) {
              handleOpen();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (isOpen && (filteredStaticOptions.length > 0 || filteredOptions.length > 0)) {
                e.preventDefault();
                e.stopPropagation();
                const firstOpt = filteredStaticOptions[0] || filteredOptions[0];
                if (firstOpt) handleSelect(firstOpt);
              } else if (isOpen) {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }
            } else if (e.key === 'Escape' && isOpen) {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }
          }}
          className={`w-full min-w-0 bg-transparent border-none outline-none truncate placeholder-slate-400 ${
            selectedOption && !isTyping ? 'font-bold text-slate-900' : 'font-medium text-slate-800'
          } ${disabled ? 'cursor-not-allowed text-slate-400' : 'cursor-text'}`}
        />

        <div className="flex items-center gap-1 shrink-0 ml-1.5 pointer-events-auto">
          {allowClear && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                if (isOpen) {
                  handleClose();
                } else {
                  handleOpen();
                  inputRef.current?.focus();
                }
              }
            }}
            className="p-0.5 text-slate-400 hover:text-[#33077C] transition-colors cursor-pointer"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-[#33077C]' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Floating Dropdown List */}
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
            className={`bg-white rounded-xl border border-slate-200/90 shadow-2xl shadow-slate-900/15 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs flex flex-col ${menuClassName}`}
          >
            {/* Options List Container */}
            <div
              onScroll={handleListScroll}
              className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar flex-1"
            >
              {isLoading && (
                <div className="px-3 py-2 mb-1 rounded-lg flex items-center gap-2 bg-[#33077C]/5 text-[11px] text-[#33077C] font-semibold border border-[#33077C]/15">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#33077C]" />
                  <span>Searching records...</span>
                </div>
              )}

              {/* Static Options (e.g. None / Unassigned) */}
              {filteredStaticOptions.length > 0 && (
                <div className="pb-1 mb-1 border-b border-slate-100 space-y-0.5">
                  {filteredStaticOptions.map((opt) => {
                    const isSelected = String(opt.value) === String(value);
                    return (
                      <button
                        key={`static_${opt.value}`}
                        type="button"
                        onClick={() => handleSelect(opt)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#33077C]/10 text-[#33077C] font-bold'
                            : 'text-slate-500 hover:bg-slate-50 font-medium italic'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#33077C]" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredOptions.length === 0 && filteredStaticOptions.length === 0 ? (
                <div className="py-6 px-3 text-center text-slate-400 font-medium text-xs">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2 text-[#33077C]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading records...</span>
                    </div>
                  ) : isTyping && searchTerm.trim() ? (
                    `No matching records for "${searchTerm}"`
                  ) : (
                    emptyText || 'Type to search records...'
                  )}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => !opt.disabled && handleSelect(opt)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        opt.disabled
                          ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400'
                          : isSelected
                          ? activeColor === 'brand'
                            ? 'bg-[#33077C]/10 text-[#33077C] font-bold'
                            : activeColor === 'emerald'
                            ? 'bg-emerald-50 text-emerald-800 font-bold'
                            : 'bg-orange-50 text-[#4309A2] font-bold'
                          : 'text-slate-700 hover:bg-purple-50/60 hover:text-[#33077C] font-medium'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-xs font-bold">
                          {opt.label}
                        </div>
                        {opt.subLabel && (
                          <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                            {opt.subLabel}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {opt.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}

              {/* Loading More Indicator for Infinite Scrolling */}
              {isLoadingMore && (
                <div className="py-2 px-3 text-center flex items-center justify-center gap-2 text-slate-500 font-semibold text-[11px] bg-slate-50/70 rounded-lg">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#33077C]" />
                  <span>Loading more...</span>
                </div>
              )}
            </div>

            {/* Quick Add New Footer Action Button */}
            {onAddNew && (
              <div className="p-1.5 border-t border-slate-100 bg-slate-50/80 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onAddNew();
                  }}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold text-[#33077C] hover:bg-[#33077C]/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{addNewText}</span>
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
