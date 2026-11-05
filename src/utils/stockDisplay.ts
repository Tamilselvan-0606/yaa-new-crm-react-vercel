/** Quantity as shown next to a unit: "100", "12.5", "1,250". Up to 3 decimals so weights and volumes read correctly. */
export const formatStockQty = (qty: unknown): string => {
  const n = Number(qty);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 3 });
};

interface StockRow {
  productId?: string;
  id?: string;
  inStock?: number;
}

/**
 * Adds `stockQty` (quantity on hand, from the stock API's `inStock`) to every product option whose stock row is known.
 * A product with no stock row keeps `stockQty` undefined, so the screen never claims a quantity it did not receive.
 */
export function attachStockQty<T extends { productId?: string; id?: string }>(
  items: T[],
  stockRows: StockRow[] | undefined | null,
): Array<T & { stockQty?: number }> {
  const byProduct = new Map<string, number>();
  (stockRows || []).forEach((s) => {
    const pid = String(s.productId || s.id || '');
    if (pid && Number.isFinite(Number(s.inStock))) byProduct.set(pid, Number(s.inStock));
  });
  return items.map((it) => {
    const pid = String(it.productId || it.id || '');
    return byProduct.has(pid) ? { ...it, stockQty: byProduct.get(pid) } : it;
  });
}
