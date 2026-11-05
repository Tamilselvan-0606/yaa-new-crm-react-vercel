import React from 'react';
import { formatStockQty } from '../../utils/stockDisplay';

/**
 * The stock on hand with its unit, shown in a product dropdown row: "• 100 Pcs", "• 50 Kg".
 * Green when there is stock, red at zero. When the quantity is not known (no stock record received) it falls back
 * to the unit alone, so it never shows a made-up number.
 */
export const ProductStockLabel: React.FC<{ qty?: number | null; unit?: string | null }> = ({ qty, unit }) => {
  const u = (unit || '').trim();
  if (qty === undefined || qty === null || !Number.isFinite(Number(qty))) {
    return u ? <span>• {u}</span> : null;
  }
  const empty = Number(qty) <= 0;
  return (
    <span
      className={`font-bold tabular-nums ${empty ? 'text-rose-600' : 'text-emerald-700'}`}
      title={empty ? 'Out of stock' : 'Available in stock'}
    >
      • {formatStockQty(qty)} {u}
    </span>
  );
};
