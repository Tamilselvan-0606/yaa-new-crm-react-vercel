import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { purgeLegacyBusinessData } from '../src/utils/legacyLocalData';

/** Minimal in-memory stand-in for localStorage. */
const fakeStorage = (initial: Record<string, string>) => {
  const data = new Map(Object.entries(initial));
  return {
    get length() { return data.size; },
    key: (i: number) => [...data.keys()][i] ?? null,
    removeItem: (k: string) => { data.delete(k); },
    keys: () => [...data.keys()].sort(),
  };
};

describe('Legacy browser data cleanup', () => {
  it('removes saved business data', () => {
    const s = fakeStorage({
      yaa_crm_sales_transactions: '[]',
      yaa_crm_sales_customers: '[]',
      yaa_crm_purchase_orders: '[]',
      yaa_crm_proforma_invoices: '[]',
      yaa_crm_sale_orders: '[]',
      yaa_crm_delivery_challans: '[]',
      yaa_crm_inventory_stocks: '[]',
      yaa_crm_sales_document_lineage: '[]',
      yaa_crm_pure_db_v1: 'true',
      'crm_exp_receipt_abc': 'data:image/png;base64,xx',
      'crm_prod_img_sku-1': 'https://x/y.png',
    });
    purgeLegacyBusinessData(s as any);
    assert.deepEqual(s.keys(), []);
  });

  it('never removes sign-in, organisation scope or layout settings', () => {
    const keep = {
      yaa_crm_jwt_token: 'token',
      yaa_crm_organization_id: 'org-1',
      nexus_crm_user_id: 'user-1',
      nexus_crm_fallback_user: '{}',
      nexus_crm_whatsapp_config: '{}',
      active_organization: 'Acme',
      active_branch: 'All',
      active_branch_id: 'b-1',
      active_sub_organization_id: 's-1',
    };
    const s = fakeStorage({ ...keep, yaa_crm_sales_customers: '[]' });
    purgeLegacyBusinessData(s as any);
    assert.deepEqual(s.keys(), Object.keys(keep).sort());
  });

  it('does nothing (and does not throw) when storage is unavailable', () => {
    assert.doesNotThrow(() => purgeLegacyBusinessData(undefined));
  });
});
