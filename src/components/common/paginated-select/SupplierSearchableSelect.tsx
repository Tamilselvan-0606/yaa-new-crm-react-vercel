import React, { useMemo, useState, useEffect } from 'react';
import { SearchableSelect, SearchableOption } from '../SearchableSelect';
import { PartyBalanceBadge, extractSupplierOutstanding } from '../PartyBalanceBadge';
import { supplierApi, ApiSupplier } from '../../../api/commerce/supplierApi';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SupplierSearchableSelectProps {
  value: string;
  onChange: (supplierId: string, supplier?: ApiSupplier) => void;
  selectedSupplier?: {
    id: string;
    name: string;
    supplierCode?: string;
    phone?: string;
    outstandingBalance?: number;
  } | null;
  label?: string;
  required?: boolean;
  labelClassName?: string;
  showPartyBalance?: boolean;
  rightSlot?: React.ReactNode;
  onAddNewSupplier?: () => void;
  allowNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  allowClear?: boolean;
}

export const SupplierSearchableSelect: React.FC<SupplierSearchableSelectProps> = ({
  value,
  onChange,
  selectedSupplier,
  label,
  required = false,
  labelClassName = 'text-xs sm:text-[13px] font-medium text-slate-500',
  showPartyBalance = true,
  rightSlot,
  onAddNewSupplier,
  allowNone = false,
  noneLabel = 'Select',
  disabled = false,
  placeholder = 'Select or search supplier...',
  className = '',
  triggerClassName = '',
  size = 'md',
  allowClear = true,
}) => {
  // The supplier list is loaded ONCE when the page / form opens; typing in the search box filters that list on the
  // screen and never calls the API again.
  const [items, setItems] = useState<ApiSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedBalance, setFetchedBalance] = useState<{ id: string; balance: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    supplierApi
      .getSuppliers({ page_size: 100, pagination_required: false })
      .then((res) => {
        if (!cancelled) setItems(res?.data || []);
      })
      .catch((err) => console.warn('Supplier dropdown load error:', err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const options: SearchableOption[] = useMemo(() => {
    return items.map((s) => ({
      value: s.id,
      label: s.name + (s.supplierCode ? ` (${s.supplierCode})` : ''),
      subLabel: `${s.supplierCode || ''} • ${s.phone || (s as any).mobile || ''}`,
      badge: s.supplierCode,
      data: s,
    }));
  }, [items]);

  // Selected item preservation
  const selectedItemOption: SearchableOption | undefined = useMemo(() => {
    if (!value) return undefined;
    const inLoaded = options.find((o) => o.value === value);
    if (inLoaded) return inLoaded;

    if (selectedSupplier && selectedSupplier.id === value) {
      return {
        value: selectedSupplier.id,
        label: selectedSupplier.name + (selectedSupplier.supplierCode ? ` (${selectedSupplier.supplierCode})` : ''),
        subLabel: `${selectedSupplier.supplierCode || ''} • ${selectedSupplier.phone || ''}`,
        badge: selectedSupplier.supplierCode,
      };
    }

    return undefined;
  }, [value, options, selectedSupplier]);

  const staticOptions: SearchableOption[] = useMemo(() => {
    if (!allowNone) return [];
    return [{ value: '', label: noneLabel }];
  }, [allowNone, noneLabel]);

  const loadedMatch = useMemo(
    () => (value ? items.find((s) => s.id === value) : undefined),
    [items, value],
  );
  const directBalance = useMemo(() => {
    if (!value) return null;
    const fromLoaded = extractSupplierOutstanding(loadedMatch);
    if (fromLoaded !== null) return fromLoaded;
    const fromProp =
      selectedSupplier && selectedSupplier.id === value
        ? extractSupplierOutstanding(selectedSupplier)
        : null;
    if (fromProp !== null) return fromProp;
    if (fetchedBalance && fetchedBalance.id === value) return fetchedBalance.balance;
    return null;
  }, [value, loadedMatch, selectedSupplier, fetchedBalance]);

  useEffect(() => {
    if (!showPartyBalance || !value || !UUID_RE.test(value) || isLoading || directBalance !== null) {
      return;
    }
    let alive = true;
    supplierApi
      .getSupplierById(value)
      .then((res) => {
        if (!alive || !res?.data) return;
        const bal = extractSupplierOutstanding(res.data);
        if (bal !== null) setFetchedBalance({ id: value, balance: bal });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [showPartyBalance, value, isLoading, directBalance]);

  const selectEl = (
    <SearchableSelect
      value={value}
      onChange={(val, opt) => onChange(val, opt?.data)}
      options={options}
      selectedItem={selectedItemOption}
      staticOptions={staticOptions}
      isLoading={isLoading}
      onAddNew={onAddNewSupplier}
      addNewText="Add New Supplier"
      placeholder={placeholder}
      emptyText="No suppliers found"
      disabled={disabled}
      className={className}
      triggerClassName={triggerClassName}
      size={size}
      allowClear={allowClear}
    />
  );

  if (!label && !rightSlot && (!showPartyBalance || directBalance === null)) {
    return selectEl;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[18px]">
        {label ? (
          <label className={labelClassName}>
            {label} {required && <span className="text-rose-500 font-bold">*</span>}
          </label>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2 shrink-0">
          {rightSlot}
          {showPartyBalance && <PartyBalanceBadge balance={directBalance} />}
        </div>
      </div>
      {selectEl}
    </div>
  );
};

