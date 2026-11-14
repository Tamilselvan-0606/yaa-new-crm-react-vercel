import React, { useMemo, useCallback } from 'react';
import { SearchableSelect, SearchableOption } from '../SearchableSelect';
import { usePaginatedDropdown } from '../../../hooks/usePaginatedDropdown';
import { productApi, ApiProduct, isProductActive } from '../../../api/commerce/productApi';

export interface ProductSearchableSelectProps {
  value: string;
  onChange: (productId: string, product?: ApiProduct) => void;
  selectedProduct?: {
    id: string;
    productName: string;
    productCode?: string;
    salePrice?: number;
    purchasePrice?: number;
    currentStock?: number;
  } | null;
  onAddNewProduct?: () => void;
  allowNone?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  priceType?: 'sale' | 'purchase';
}

export const ProductSearchableSelect: React.FC<ProductSearchableSelectProps> = ({
  value,
  onChange,
  selectedProduct,
  onAddNewProduct,
  allowNone = false,
  disabled = false,
  placeholder = 'Select Product...',
  className = '',
  triggerClassName = '',
  size = 'sm',
  priceType = 'sale',
}) => {
  const fetchPage = useCallback(
    async ({ page, limit, search }: { page: number; limit: number; search: string }) => {
      try {
        const res = await productApi.getProducts({
          activeOnly: true,
          page_no: page,
          page_size: limit,
          pagination_required: true,
          search: search || undefined,
        });

        const data = (res?.data || []).filter(isProductActive);
        const pagination = res?.pagination;

        return {
          data,
          hasNextPage: pagination?.hasNextPage ?? (data.length >= limit),
          totalRecords: pagination?.totalRecords,
        };
      } catch (err) {
        console.warn('ProductSearchableSelect fetch error:', err);
        return {
          data: [],
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
    totalRecords,
    handleSearch,
    loadMore,
    loadInitial,
  } = usePaginatedDropdown<ApiProduct>({
    fetchPage,
    limit: 10,
    getId: (p) => p.id,
  });

  const options: SearchableOption[] = useMemo(() => {
    return items.filter(isProductActive).map((p) => {
      const price = priceType === 'purchase' ? p.purchasePrice : p.salePrice;
      const stock = p.currentStock ?? p.openingStock ?? 0;
      return {
        value: p.id,
        label: p.productName,
        subLabel: `${p.productCode || ''} • ₹${price || 0}${stock !== undefined ? ` • Stock: ${stock}` : ''}`,
        badge: p.productCode,
        data: p,
      };
    });
  }, [items, priceType]);

  // Selected item preservation
  const selectedItemOption: SearchableOption | undefined = useMemo(() => {
    if (!value) return undefined;
    const inLoaded = options.find((o) => o.value === value);
    if (inLoaded) return inLoaded;

    if (selectedProduct && selectedProduct.id === value) {
      const price = priceType === 'purchase' ? selectedProduct.purchasePrice : selectedProduct.salePrice;
      return {
        value: selectedProduct.id,
        label: selectedProduct.productName,
        subLabel: `${selectedProduct.productCode || ''} • ₹${price || 0}`,
        badge: selectedProduct.productCode,
      };
    }
    return undefined;
  }, [value, options, selectedProduct, priceType]);

  const staticOptions: SearchableOption[] = useMemo(() => {
    if (!allowNone) return [];
    return [{ value: '', label: 'None / Select Later' }];
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
      onAddNew={onAddNewProduct}
      addNewText="Add New Product"
      countLabel={{ singular: 'product', plural: 'products' }}
      totalCount={totalRecords}
      placeholder={placeholder}
      emptyText="No products found"
      disabled={disabled}
      className={className}
      triggerClassName={triggerClassName}
      size={size}
      allowClear
    />
  );
};

