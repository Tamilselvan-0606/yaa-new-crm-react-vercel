import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Info,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Check,
  X,
} from "lucide-react";

export interface ItemSettingsConfig {
  enableItem: boolean;
  stockMaintenance: boolean;
  manufacturing: boolean;
  itemUnits: boolean;
  defaultUnitEnabled: boolean;
  defaultUnitId: string;
  defaultUnitLabel: string;
  itemCategory: boolean;
  partyWiseItemRate: boolean;
  wholesalePrice: boolean;
  quantityDecimalPlaces: number;
  itemWiseTax: boolean;
  calculateTaxOnMrp: boolean;
  itemWiseDiscount: boolean;
  updateSalePriceFromTxn: boolean;
  description: boolean;
  hsnSacCode: boolean;
}

export const DEFAULT_ITEM_SETTINGS: ItemSettingsConfig = {
  enableItem: true,
  stockMaintenance: true,
  manufacturing: false,
  itemUnits: true,
  defaultUnitEnabled: false,
  defaultUnitId: "",
  defaultUnitLabel: "",
  itemCategory: true,
  partyWiseItemRate: false,
  wholesalePrice: true,
  quantityDecimalPlaces: 1,
  itemWiseTax: true,
  calculateTaxOnMrp: true,
  itemWiseDiscount: true,
  updateSalePriceFromTxn: true,
  description: false,
  hsnSacCode: true,
};

const STORAGE_KEY = "yaa_crm_item_settings_v1";
const SETTINGS_UPDATED_EVENT = "yaa-item-settings-updated";

export function loadItemSettings(): ItemSettingsConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ITEM_SETTINGS;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_ITEM_SETTINGS;
    return {
      ...DEFAULT_ITEM_SETTINGS,
      ...parsed,
      quantityDecimalPlaces: Math.min(
        5,
        Math.max(0, Number(parsed.quantityDecimalPlaces ?? 1) || 0),
      ),
    };
  } catch {
    return DEFAULT_ITEM_SETTINGS;
  }
}

export function saveItemSettings(next: ItemSettingsConfig): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent<ItemSettingsConfig>(SETTINGS_UPDATED_EVENT, {
        detail: next,
      }),
    );
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function useItemSettings(): [
  ItemSettingsConfig,
  (updater: ItemSettingsConfig | ((prev: ItemSettingsConfig) => ItemSettingsConfig)) => void,
] {
  const [settings, setSettingsState] = useState<ItemSettingsConfig>(() =>
    loadItemSettings(),
  );

  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent<ItemSettingsConfig>).detail;
      setSettingsState(detail || loadItemSettings());
    };
    window.addEventListener(SETTINGS_UPDATED_EVENT, handleSync);
    return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSync);
  }, []);

  const updateSettings = (
    updater:
      | ItemSettingsConfig
      | ((prev: ItemSettingsConfig) => ItemSettingsConfig),
  ) => {
    setSettingsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveItemSettings(next);
      return next;
    });
  };

  return [settings, updateSettings];
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  ariaLabel,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#33077C]/30 ${
      checked ? "bg-[#33077C]" : "bg-slate-200"
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-150 ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

export interface ItemSettingsUnitOption {
  id: string;
  label: string;
}

interface ItemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ItemSettingsConfig;
  onChange: (
    updater:
      | ItemSettingsConfig
      | ((prev: ItemSettingsConfig) => ItemSettingsConfig),
  ) => void;
  unitOptions?: ItemSettingsUnitOption[];
}

export const ItemSettingsModal: React.FC<ItemSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  unitOptions = [],
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setShowSearch(false);
      setSearchQuery("");
    }
  }, [isOpen]);

  const query = searchQuery.trim().toLowerCase();
  const matches = useMemo(
    () => (label: string) => !query || label.toLowerCase().includes(query),
    [query],
  );

  if (!isOpen) return null;

  const setField = <K extends keyof ItemSettingsConfig>(
    key: K,
    value: ItemSettingsConfig[K],
  ) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const renderToggleRow = (
    key: keyof ItemSettingsConfig,
    label: string,
    tooltip: string,
    extraContent?: React.ReactNode,
  ) => {
    if (!matches(label)) return null;
    const checked = Boolean(settings[key]);
    return (
      <div key={String(key)} className="px-4 sm:px-5 py-3.5 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-[13px] font-semibold text-slate-800">
              {label}
            </span>
            <span
              title={tooltip}
              className="text-slate-400 hover:text-[#33077C] cursor-help shrink-0"
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          </div>
          <ToggleSwitch
            checked={checked}
            onChange={(val) => setField(key, val as ItemSettingsConfig[typeof key])}
            ariaLabel={label}
          />
        </div>
        {extraContent}
      </div>
    );
  };

  const showGstSection = matches("GST") || matches("HSN/SAC Code");

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90dvh] animate-in zoom-in-95 duration-100 my-auto">
        {/* Header matching mobile Item settings screen + CRM style */}
        <div
          className="px-4 sm:px-5 py-3.5 sm:py-4 text-white shrink-0 space-y-2.5"
          style={{ background: "#33077C" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 -ml-1 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Back to Add Item"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                  Item Settings
                </h3>
                <p className="text-[11px] text-white/80 font-medium truncate">
                  Configure item form fields, units, pricing, and GST options
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSearch((prev) => !prev);
                if (showSearch) setSearchQuery("");
              }}
              className="p-1.5 rounded-xl text-white/85 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
              title="Search settings"
              aria-label="Search settings"
            >
              {showSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>
          </div>

          {showSearch && (
            <div className="relative">
              <Search className="w-4 h-4 text-white/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search item settings..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/15 border border-white/25 text-xs sm:text-[13px] text-white placeholder:text-white/70 outline-none focus:bg-white/20 focus:border-white/40"
              />
            </div>
          )}
        </div>

        {/* Settings List */}
        <div className="flex-1 overflow-y-auto bg-[#fafbfc] divide-y divide-slate-100">
          {renderToggleRow(
            "enableItem",
            "Enable Item",
            "Enable items across inventory and sales transactions",
          )}

          {renderToggleRow(
            "stockMaintenance",
            "Stock maintenance",
            "Show stock levels, location, and batch & lot tracking fields in Add Item",
          )}

          {renderToggleRow(
            "manufacturing",
            "Manufacturing",
            "Enable manufacturing / bill of materials item tracking",
          )}

          {renderToggleRow(
            "itemUnits",
            "Item Units",
            "Show Unit selection field in Add Item",
          )}

          {renderToggleRow(
            "defaultUnitEnabled",
            "Default Unit",
            "Pre-select a default unit when creating a new item",
            settings.defaultUnitEnabled && unitOptions.length > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-500">
                  Selected Default Unit
                </span>
                <select
                  value={settings.defaultUnitId}
                  onChange={(e) => {
                    const selected = unitOptions.find(
                      (u) => u.id === e.target.value,
                    );
                    onChange((prev) => ({
                      ...prev,
                      defaultUnitId: selected?.id || "",
                      defaultUnitLabel: selected?.label || "",
                    }));
                  }}
                  className="h-9 px-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#4309A2] cursor-pointer max-w-[220px]"
                >
                  <option value="">Choose unit...</option>
                  {unitOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            ),
          )}

          {renderToggleRow(
            "itemCategory",
            "Item Category",
            "Show Category and Subcategory fields in Add Item",
          )}

          {renderToggleRow(
            "partyWiseItemRate",
            "Party wise item rate",
            "Enable party-specific pricing rules for items",
          )}

          {renderToggleRow(
            "wholesalePrice",
            "Wholesale Price",
            "Show Wholesale Price options in Add Item",
          )}

          {matches("Quantity (Upto Decimal places)") && (
            <div className="px-4 sm:px-5 py-3.5 bg-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs sm:text-[13px] font-semibold text-slate-800">
                  Quantity (Upto Decimal places)
                </span>
                <span
                  title="Maximum decimal precision allowed for item quantities (0 to 5)"
                  className="text-slate-400 hover:text-[#33077C] cursor-help shrink-0"
                >
                  <Info className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setField(
                      "quantityDecimalPlaces",
                      Math.max(0, settings.quantityDecimalPlaces - 1),
                    )
                  }
                  disabled={settings.quantityDecimalPlaces <= 0}
                  className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                  aria-label="Decrease decimal places"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center text-xs sm:text-[13px] font-bold text-slate-800 border-b border-slate-300 pb-0.5">
                  {settings.quantityDecimalPlaces}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setField(
                      "quantityDecimalPlaces",
                      Math.min(5, settings.quantityDecimalPlaces + 1),
                    )
                  }
                  disabled={settings.quantityDecimalPlaces >= 5}
                  className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                  aria-label="Increase decimal places"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {renderToggleRow(
            "itemWiseTax",
            "Item wise tax",
            "Show Taxes dropdown and tax-included/excluded selectors in Add Item",
          )}

          {renderToggleRow(
            "calculateTaxOnMrp",
            "Calculate Tax based on MRP",
            "Compute item tax using MRP when applicable",
          )}

          {renderToggleRow(
            "itemWiseDiscount",
            "Item wise discount",
            "Show Disc. On Sale Price field in Add Item",
          )}

          {renderToggleRow(
            "updateSalePriceFromTxn",
            "Update Sale Price from TXN",
            "Update item sale price automatically from transactions",
          )}

          {renderToggleRow(
            "description",
            "Description",
            "Show item Description input field in Add Item",
          )}

          {showGstSection && (
            <>
              <div className="px-4 sm:px-5 py-2 bg-slate-100/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                GST
              </div>
              {renderToggleRow(
                "hsnSacCode",
                "HSN/SAC Code",
                "Show Item HSN field in Add Item",
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3.5 bg-white border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_ITEM_SETTINGS)}
            className="h-9 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
