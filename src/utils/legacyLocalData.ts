/**
 * Business data used to be saved in the browser (localStorage) and shown on screen from there, which is how old or
 * deleted records kept appearing. The app now shows API data only. This removes whatever older versions left behind.
 *
 * It removes an explicit list of business-data keys only. Sign-in (token, user), organisation / branch scope, theme and
 * layout settings are never touched: several of them share the same name prefix, so a prefix match would be unsafe.
 */
export const LEGACY_BUSINESS_KEYS = [
  'yaa_crm_sales_transactions',
  'yaa_crm_sales_returns',
  'yaa_crm_sales_customers',
  'yaa_crm_suppliers',
  'yaa_crm_purchase_requests',
  'yaa_crm_purchase_orders',
  'yaa_crm_purchase_returns',
  'yaa_crm_payments_out',
  'yaa_crm_inventory_stocks',
  'yaa_crm_sale_quotations',
  'yaa_crm_sale_payment_ins',
  'yaa_crm_sales_representatives',
  'yaa_crm_collection_follow_ups',
  'yaa_crm_promises_to_pay',
  'yaa_crm_proforma_invoices',
  'yaa_crm_sale_orders',
  'yaa_crm_delivery_challans',
  'yaa_crm_converted_quotes',
  'yaa_crm_converted_proformas',
  'yaa_crm_custom_payment_types',
  'yaa_crm_sales_document_lineage',
  'yaa_crm_pure_db_v1',
  'nexus_crm_sale_quotations',
  'nexus_crm_sales_transactions',
  'crm_expenses_list',
];

/** Key families that carry an id after the prefix (receipt and product-image caches). */
export const LEGACY_BUSINESS_KEY_PREFIXES = ['crm_exp_receipt_', 'crm_prod_img_'];

type KeyValueStorage = Pick<Storage, 'length' | 'key' | 'removeItem'>;

export function purgeLegacyBusinessData(
  storage: KeyValueStorage | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
): void {
  try {
    if (!storage) return;
    const exact = new Set(LEGACY_BUSINESS_KEYS);
    const doomed: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && (exact.has(key) || LEGACY_BUSINESS_KEY_PREFIXES.some((p) => key.startsWith(p)))) doomed.push(key);
    }
    doomed.forEach((k) => storage.removeItem(k));
  } catch {
    /* storage unavailable: nothing to clean */
  }
}
