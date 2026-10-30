import React, { useMemo, useCallback } from 'react';
import { SearchableSelect, SearchableOption } from '../SearchableSelect';
import { usePaginatedDropdown } from '../../../hooks/usePaginatedDropdown';
import { stockApi } from '../../../api/commerce/stockApi';
import { ApiStockBatch } from '../../../api/commerce/productTypes';

export interface BatchSearchableSelectProps {
  value: string;
  productId?: string;
  onChange: (batchNo: string, batch?: ApiStockBatch) => void;
  selectedBatch?: {
    batchNo: string;
    quantity?: number;
    expDate?: string;
  } | null;
  allowCustomBatch?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BatchSearchableSelect: React.FC<BatchSearchableSelectProps> = ({
  value,
  productId,
  onChange,
  selectedBatch,
  allowCustomBatch = true,
  disabled = false,
  placeholder = 'Select Batch...',
  className = '',
  triggerClassName = '',
  size = 'md',
}) => {
  const fetchPage = useCallback(
    async ({ page, limit, search }: { page: number; limit: number; search: string }) => {
      try {
        const res = await stockApi.getStockBatches({
          productId: productId || undefined,
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
        console.warn('BatchSearchableSelect fetch error:', err);
        return {
          data: [],
          hasNextPage: false,
          totalRecords: 0,
        };
      }
    },
    [productId]
  );

  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    handleSearch,
    loadMore,
    loadInitial,
  } = usePaginatedDropdown<ApiStockBatch>({
    fetchPage,
    limit: 10,
    getId: (b) => b.id || b.batchNo,
  });

  const options: SearchableOption[] = useMemo(() => {
    return items.map((b) => ({
      value: b.batchNo,
      label: b.batchNo,
      subLabel: `${b.quantity ?? 0} in stock${b.expDate ? ` • Exp: ${b.expDate}` : ''}`,
      badge: `${b.quantity ?? 0} in stock`,
      data: b,
    }));
  }, [items]);

  // Selected item preservation
  const selectedItemOption: SearchableOption | undefined = useMemo(() => {
    if (!value) return undefined;
    const inLoaded = options.find((o) => o.value === value);
    if (inLoaded) return inLoaded;

    if (selectedBatch && selectedBatch.batchNo === value) {
      return {
        value: selectedBatch.batchNo,
        label: selectedBatch.batchNo,
        subLabel: `${selectedBatch.quantity ?? 0} in stock${selectedBatch.expDate ? ` • Exp: ${selectedBatch.expDate}` : ''}`,
        badge: `${selectedBatch.quantity ?? 0} in stock`,
      };
    }

    return {
      value,
      label: value,
    };
  }, [value, options, selectedBatch]);

  // Custom batch option
  const staticOptions: SearchableOption[] = useMemo(() => {
    if (!allowCustomBatch) return [];
    return [{ value: '__enter_custom_batch__', label: '+ Enter Custom Batch...' }];
  }, [allowCustomBatch]);

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
      placeholder={placeholder}
      emptyText="No batches found"
      disabled={disabled}
      className={className}
      triggerClassName={triggerClassName}
      size={size}
    />
  );
};

