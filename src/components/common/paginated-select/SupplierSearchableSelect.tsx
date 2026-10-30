import React, { useMemo, useCallback } from 'react';
import { SearchableSelect, SearchableOption } from '../SearchableSelect';
import { usePaginatedDropdown } from '../../../hooks/usePaginatedDropdown';
import { supplierApi, ApiSupplier } from '../../../api/commerce/supplierApi';
import { useSalesManagementStore } from '../../../store/useSalesManagementStore';

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
  const { suppliers = [] } = useSalesManagementStore();

  const fetchPage = useCallback(
    async ({ page, limit, search }: { page: number; limit: number; search: string }) => {
      try {
        const res = await supplierApi.getSuppliers({
          page,
          limit,
          page_no: page,
          page_size: limit,
          pagination_required: true,
          search: search || undefined,
        });

        const data = res?.data || [];
        const pagination = res?.pagination;

        return {
          data,
          hasNextPage: pagination?.hasNextPage ?? (data.length >= limit),
          totalRecords: pagination?.totalRecords,
        };
      } catch (err) {
        console.warn('SupplierSearchableSelect fetch error:', err);
        const q = search.toLowerCase();
        const filtered = suppliers.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.supplierCode && s.supplierCode.toLowerCase().includes(q)) ||
            (s.phone && s.phone.toLowerCase().includes(q))
        );
        const start = (page - 1) * limit;
        const paged = filtered.slice(start, start + limit);
        return {
          data: paged as any[],
          hasNextPage: start + limit < filtered.length,
          totalRecords: filtered.length,
        };
      }
    },
    [suppliers]
  );

  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    handleSearch,
    loadMore,
    loadInitial,
  } = usePaginatedDropdown<ApiSupplier>({
    fetchPage,
    limit: 10,
    getId: (s) => s.id,
  });

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

    const inStore = suppliers.find((s) => s.id === value);
    if (inStore) {
      return {
        value: inStore.id,
        label: inStore.name + (inStore.supplierCode ? ` (${inStore.supplierCode})` : ''),
        subLabel: `${inStore.supplierCode || ''} • ${inStore.phone || ''}`,
        badge: inStore.supplierCode,
        data: inStore,
      };
    }
    return undefined;
  }, [value, options, selectedSupplier, suppliers]);

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
      onOpen={loadInitial}
      onSearch={handleSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
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

