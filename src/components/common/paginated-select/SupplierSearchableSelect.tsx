import React, { useMemo, useState, useEffect } from 'react';
import { SearchableSelect, SearchableOption } from '../SearchableSelect';
import { supplierApi, ApiSupplier } from '../../../api/commerce/supplierApi';

export interface SupplierSearchableSelectProps {
  value: string;
  onChange: (supplierId: string, supplier?: ApiSupplier) => void;
  selectedSupplier?: {
    id: string;
    name: string;
    supplierCode?: string;
    phone?: string;
  } | null;
  onAddNewSupplier?: () => void;
  allowNone?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SupplierSearchableSelect: React.FC<SupplierSearchableSelectProps> = ({
  value,
  onChange,
  selectedSupplier,
  onAddNewSupplier,
  allowNone = false,
  disabled = false,
  placeholder = 'Select or search supplier...',
  className = '',
  triggerClassName = '',
  size = 'md',
}) => {
  // The supplier list is loaded ONCE when the page / form opens; typing in the search box filters that list on the
  // screen and never calls the API again.
  const [items, setItems] = useState<ApiSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
    return [{ value: '', label: 'None / Unassigned' }];
  }, [allowNone]);

  return (
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
    />
  );
};

