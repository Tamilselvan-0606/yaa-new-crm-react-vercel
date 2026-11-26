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

/**
 * Appends `items.{i}.quantity` errors for any non-blank product line whose known
 * product-level stock is zero or negative (`stockQty + credit <= 0`), covering
 * unbatched rows or missing batch records that batch-only stock validation skips.
 */
export function appendZeroStockErrors(
  items: Array<{
    productId?: string;
    productName?: string;
    quantity?: unknown;
  }>,
  opts: {
    errors: Record<string, string>;
    resolveProductId?: (item: any) => string | undefined;
    getProductStockQty: (productId: string) => number | null | undefined;
    getCredit?: (item: any, index: number) => number;
  },
): Record<string, string> {
  const out = { ...opts.errors };
  items.forEach((it, i) => {
    const key = `items.${i}.quantity`;
    if (out[key]) return;
    const hasLine = Boolean(it.productName?.trim() || it.productId);
    if (!hasLine) return;
    const pid =
      (opts.resolveProductId ? opts.resolveProductId(it) : undefined) ||
      it.productId;
    if (!pid) return;
    const stockQty = opts.getProductStockQty(pid);
    if (
      stockQty === null ||
      stockQty === undefined ||
      !Number.isFinite(Number(stockQty))
    ) {
      return;
    }
    const credit = opts.getCredit ? opts.getCredit(it, i) : 0;
    if (Number(stockQty) + credit <= 0) {
      out[key] = 'This product is out of stock (0 available).';
    }
  });
  return out;
}
