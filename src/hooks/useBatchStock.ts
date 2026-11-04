import { useCallback, useRef, useState } from 'react';
import { useAppDispatch } from './redux';
import { stockEndpoints } from '../api/commerce/stockApi';
import type { ApiStockBatch } from '../api/commerce/productTypes';
import { isUuid } from '../utils/formValidation';

/**
 * Batch-wise stock for sales documents (Estimate, Proforma, Sale Order, Delivery Challan, Invoice).
 *
 * Source of truth is the backend: `GET /commerce/stocks/batches?productId=...` through the existing
 * RTK Query endpoint `getCommerceStockBatches` (tag `Stock`/`BATCHES`, so stock mutations invalidate
 * it). Organisation / sub-organisation / branch scope comes from the shared base query headers.
 *
 *  - `loadProduct(productId)`  : call when a product is chosen. Cached per product, so it is NOT
 *                                refetched on every keystroke or re-render.
 *  - `getBatches(productId)`   : batches belonging to that product only.
 *  - `getAvailable(productId, batchNo)` : on-hand quantity of the batch, or null when unknown
 *                                (not loaded yet / batch not found). Unknown is never an error.
 *  - `refresh(productIds)`     : force a refetch (use right before Save, so stock that changed
 *                                since the form was opened is checked against fresh data).
 *  - `forget(productId)`       : drop a product (e.g. when the row's product changes).
 *
 * Note: the batch payload has `quantity` (on hand) only. It has no reserved / allocated field, so
 * reservations by earlier documents cannot be subtracted on the client. See
 * docs/backend-batch-stock-requirements.md.
 */
export const useBatchStock = (opts: { branchId?: string } = {}) => {
  const dispatch = useAppDispatch();
  const branchId = opts.branchId;
  const cacheRef = useRef<Map<string, ApiStockBatch[]>>(new Map());
  const inFlightRef = useRef<Map<string, Promise<void>>>(new Map());
  // Bumped when the cache changes so components re-render with the new stock figures.
  const [version, setVersion] = useState(0);

  const fetchProduct = useCallback(
    (productId: string, force: boolean): Promise<void> => {
      if (!isUuid(productId)) return Promise.resolve();
      const existing = inFlightRef.current.get(productId);
      if (existing) return existing;

      const run = (async () => {
        try {
          const sub = dispatch(
            stockEndpoints.endpoints.getCommerceStockBatches.initiate(
              { productId, branchId, pagination_required: false },
              { forceRefetch: force, subscribe: false },
            ),
          );
          const res = await sub.unwrap();
          cacheRef.current.set(
            productId,
            (res?.data || []).filter((b) => b.productId === productId),
          );
          setVersion((v) => v + 1);
        } catch (err) {
          // Keep any previously loaded figures; stock stays "unknown" if it never loaded.
          console.warn('Could not load batch stock for product', productId, err);
        } finally {
          inFlightRef.current.delete(productId);
        }
      })();
      inFlightRef.current.set(productId, run);
      return run;
    },
    [dispatch, branchId],
  );

  const loadProduct = useCallback(
    (productId?: string | null): Promise<void> => {
      if (!productId || cacheRef.current.has(productId)) return Promise.resolve();
      // Stock availability is live data: always read it from the server (once per product while the form is open),
      // never from an RTK cache entry left by an earlier visit.
      return fetchProduct(productId, true);
    },
    [fetchProduct],
  );

  const refresh = useCallback(
    async (productIds: Array<string | undefined | null>): Promise<void> => {
      const ids = Array.from(new Set(productIds.filter((id): id is string => !!id && isUuid(id))));
      await Promise.all(ids.map((id) => fetchProduct(id, true)));
    },
    [fetchProduct],
  );

  const forget = useCallback((productId?: string | null) => {
    if (!productId) return;
    if (cacheRef.current.delete(productId)) setVersion((v) => v + 1);
  }, []);

  const getBatches = useCallback(
    (productId?: string | null): ApiStockBatch[] =>
      productId ? cacheRef.current.get(productId) ?? [] : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const getAvailable = useCallback(
    (productId?: string | null, batchNo?: string | null): number | null => {
      if (!productId || !batchNo) return null;
      const batches = cacheRef.current.get(productId);
      if (!batches) return null;
      const batch = batches.find((b) => b.batchNo === batchNo);
      if (!batch) return null;
      const qty = Number(batch.quantity);
      return isFinite(qty) ? qty : null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  return { loadProduct, refresh, forget, getBatches, getAvailable, version };
};
