import { productApi } from '../api/commerce/productApi';
import { customerApi } from '../api/commerce/customerApi';
import { supplierApi } from '../api/commerce/supplierApi';
import type { ApiProduct } from '../api/commerce/productTypes';
import { isDraftUuid } from './documentDraft';

/**
 * A saved draft only stores product ids, so resuming it needs the product details (name, unit, HSN ...) for the
 * form rows. Looks each distinct product up (a few at a time) and skips any that cannot be loaded; the caller
 * falls back to a generic row for those.
 */
export const loadDraftProducts = async (productIds: readonly string[], concurrency = 5): Promise<Map<string, ApiProduct>> => {
  const unique = Array.from(new Set(productIds.filter(isDraftUuid)));
  const found = new Map<string, ApiProduct>();
  let next = 0;
  const worker = async () => {
    while (next < unique.length) {
      const id = unique[next++];
      try {
        const res = await productApi.getProductById(id);
        if (res?.data) found.set(id, res.data);
      } catch {
        /* product deleted or not visible: the row keeps the saved price / quantity */
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker));
  return found;
};

/** Customer details for a restored sales draft (null when the id is missing or the customer cannot be loaded). */
export const loadDraftCustomer = async (customerId: string | null | undefined) => {
  if (!isDraftUuid(customerId)) return null;
  try {
    return (await customerApi.getCustomerById(customerId)).data ?? null;
  } catch {
    return null;
  }
};

/** Supplier details for a restored purchase draft (null when the id is missing or the supplier cannot be loaded). */
export const loadDraftSupplier = async (supplierId: string | null | undefined) => {
  if (!isDraftUuid(supplierId)) return null;
  try {
    return (await supplierApi.getSupplierById(supplierId)).data ?? null;
  } catch {
    return null;
  }
};
