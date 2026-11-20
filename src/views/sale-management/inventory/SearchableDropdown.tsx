import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Search, Check, Plus, ChevronDown } from "lucide-react";
import { FormLabel } from "../utils/formUtils";

export interface SearchableDropdownOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

interface SearchableDropdownProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: SearchableDropdownOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  addNewButtonLabel?: string;
  onAddNew?: () => void;
  allowClear?: boolean;
  clearLabel?: string;
  emptyMessage?: string;
  disabled?: boolean;
  /** Inline error shown under the field (red border). */
  error?: string;
  footerAction?: {
    label: string;
    onClick: () => void;
  };
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  label,
  required = false,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  addNewButtonLabel,
  onAddNew,
  allowClear = false,
  clearLabel,
  emptyMessage,
  disabled = false,
  error,
  footerAction,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // The menu is drawn in a portal (fixed position) so a modal or scroll area can never clip it.
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  const updateMenuPos = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < 320 && r.top > spaceBelow;
    const width = Math.max(r.width, 260);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setMenuPos(
      openUp
        ? { bottom: window.innerHeight - r.top + 6, left, width }
        : { top: r.bottom + 6, left, width },
    );
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuPos();
    window.addEventListener("resize", updateMenuPos);
    window.addEventListener("scroll", updateMenuPos, true);
    return () => {
      window.removeEventListener("resize", updateMenuPos);
      window.removeEventListener("scroll", updateMenuPos, true);
    };
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  return (
    <div ref={dropdownRef} className="relative w-full">
      {label && <FormLabel required={required}>{label}</FormLabel>}
      <div
        ref={triggerRef}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearchQuery("");
          }
        }}
        className={`relative w-full h-11 px-4 bg-white rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
          disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : ""
        } ${
          isOpen
            ? "border-[#4309A2] ring-4 ring-[#4309A2]/10"
            : error
            ? "border-rose-400 ring-2 ring-rose-100"
            : value
            ? "border-slate-300 hover:border-slate-400"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span
          className={`text-xs sm:text-[13px] font-medium truncate ${
            value ? "text-slate-900 font-semibold" : "text-slate-400"
          }`}
        >
          {selectedOption
            ? selectedOption.label
            : placeholder || (label ? `Select ${label}` : "Select Option")}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isOpen ? "rotate-180 text-[#33077C]" : ""
          }`}
        />
      </div>

      {isOpen && menuPos && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: menuPos.top, bottom: menuPos.bottom, left: menuPos.left, width: menuPos.width, zIndex: 999999 }}
          className="max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Search Bar matching Customer Dropdown */}
          <div className="relative mb-2">
            <div className="flex items-center w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-[#33077C] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#33077C]/10 transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={
                  searchPlaceholder || (label ? `Search ${label}...` : "Search...")
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Action Button matching Customer Dropdown */}
          {addNewButtonLabel && onAddNew && (
            <div className="pb-1.5 mb-1 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNew();
                }}
                className="w-full py-1.5 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100/80 text-[#33077C] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-purple-200/80 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{addNewButtonLabel}</span>
              </button>
            </div>
          )}

          {/* Options List matching Customer Dropdown */}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5 divide-y divide-slate-100/60 custom-scrollbar">
            {allowClear && (
              <div
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  !value
                    ? "bg-purple-50 text-[#33077C] font-bold"
                    : "hover:bg-slate-50 text-slate-600"
                }`}
              >
                <span className="text-slate-400 italic">
                  {clearLabel || "None / Clear"}
                </span>
                {!value && <Check className="w-4 h-4 text-[#33077C]" />}
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="py-5 px-3 text-center text-slate-400">
                <p className="text-xs font-semibold text-slate-600">
                  {emptyMessage ||
                    (label ? `No ${label.toLowerCase()} found` : "No options found")}
                </p>
                {searchQuery.trim() && onAddNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNew();
                    }}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#33077C] text-white text-[11px] font-bold hover:bg-[#4309A2] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add "{searchQuery.trim()}"</span>
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer text-left ${
                      isSelected
                        ? "bg-purple-50 text-[#33077C] font-bold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subLabel && (
                        <span className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                          {opt.subLabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#33077C] shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Optional Footer Link */}
          {footerAction && (
            <div className="pt-2 mt-1 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  footerAction.onClick();
                }}
                className="text-[11px] font-bold text-[#33077C] hover:underline cursor-pointer"
              >
                {footerAction.label}
              </button>
            </div>
          )}
        </div>
        , document.body)}
    </div>
  );
};
