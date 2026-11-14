import React, { useMemo, useCallback } from 'react';
import { SearchableSelect, SearchableOption } from '../SearchableSelect';
import { usePaginatedDropdown } from '../../../hooks/usePaginatedDropdown';
import { customerApi, ApiCustomer } from '../../../api/commerce/customerApi';

export interface CustomerSearchableSelectProps {
  value: string;
  onChange: (customerId: string, customer?: ApiCustomer) => void;
  selectedCustomer?: {
    id: string;
    name: string;
    company?: string;
    customerCode?: string;
    phone?: string;
  } | null;
  onAddNewCustomer?: () => void;
  allowNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  allowClear?: boolean;
}

export const CustomerSearchableSelect: React.FC<CustomerSearchableSelectProps> = ({
  value,
  onChange,
  selectedCustomer,
  onAddNewCustomer,
  allowNone = false,
  noneLabel = 'Select',
  disabled = false,
  placeholder = 'Select or search customer...',
  className = '',
  triggerClassName = '',
  size = 'md',
  allowClear = true,
}) => {
  const fetchPage = useCallback(
    async ({ page, limit, search }: { page: number; limit: number; search: string }) => {
      try {
        const res = await customerApi.getCustomers({
          page_no: page,
          page_size: limit,
          pagination_required: true,
          search: search || undefined,
          status: 'Active',
        });

        const data = (res?.data || []).filter(
          (c: ApiCustomer) => !c.status || String(c.status).toLowerCase() === 'active',
        );
        const pagination = res?.pagination;

        return {
          data,
          hasNextPage: pagination?.hasNextPage ?? (data.length >= limit),
          totalRecords: pagination?.totalRecords,
        };
      } catch (err) {
        console.warn('CustomerSearchableSelect fetch error:', err);
        // API unreachable: show no options (never browser/store data)
        return {
          data: [] as ApiCustomer[],
          hasNextPage: false,
          totalRecords: 0,
        };
      }
    },
    []
  );

  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    handleSearch,
    loadMore,
    loadInitial,
  } = usePaginatedDropdown<ApiCustomer>({
    fetchPage,
    limit: 10,
    getId: (c) => c.id,
  });

  // Convert customer items into SearchableOption
  const options: SearchableOption[] = useMemo(() => {
    return items.map((c) => ({
      value: c.id,
      label: c.name + (c.company ? ` (${c.company})` : ''),
      subLabel: `${c.customerCode || ''} • ${c.phone || ''}`,
      badge: c.customerCode,
      data: c,
    }));
  }, [items]);

  // Selected item preservation (even if not in current 10 records)
  const selectedItemOption: SearchableOption | undefined = useMemo(() => {
    if (!value) return undefined;
    // Check if in current loaded options
    const inLoaded = options.find((o) => o.value === value);
    if (inLoaded) return inLoaded;
    // Check passed selectedCustomer prop
    if (selectedCustomer && selectedCustomer.id === value) {
      return {
        value: selectedCustomer.id,
        label: selectedCustomer.name + (selectedCustomer.company ? ` (${selectedCustomer.company})` : ''),
        subLabel: `${selectedCustomer.customerCode || ''} • ${selectedCustomer.phone || ''}`,
        badge: selectedCustomer.customerCode,
      };
    }
    return undefined;
  }, [value, options, selectedCustomer]);

  // Static options (e.g. Select)
  const staticOptions: SearchableOption[] = useMemo(() => {
    if (!allowNone) return [];
    return [{ value: '', label: noneLabel }];
  }, [allowNone, noneLabel]);

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
      onAddNew={onAddNewCustomer}
      addNewText="Add New Customer"
      placeholder={placeholder}
      emptyText="No customers found"
      disabled={disabled}
      className={className}
      triggerClassName={triggerClassName}
      size={size}
      allowClear={allowClear}
    />
  );
};

