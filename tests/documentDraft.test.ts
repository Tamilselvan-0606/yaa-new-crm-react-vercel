import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDraftItems,
  draftItemsToLines,
  draftSnapshot,
  isResumableDraft,
  toDraftMoney,
  DRAFT_MODULES,
} from '../src/utils/documentDraft';

const P1 = 'a1b2c3d4-0000-4000-8000-000000000101';
const P2 = 'a1b2c3d4-0000-4000-8000-000000000102';

test('buildDraftItems sends raw inputs only, fixed-decimal strings', () => {
  const items = buildDraftItems([
    { productId: P1, batch: ' BATCH-01 ', quantity: 2, unitPrice: 100, discountPercent: 5, taxPercent: 18 },
  ]);
  assert.deepEqual(items, [
    { product_id: P1, batch_no: 'BATCH-01', qty: '2.000', price_per_unit: '100.00', discount_percent: '5.00', tax_percentage: '18.00' },
  ]);
  for (const forbidden of ['discount_amount', 'tax_amount', 'sub_total', 'grand_total']) {
    assert.equal(forbidden in items[0], false);
  }
});

test('buildDraftItems skips rows the backend would reject', () => {
  const items = buildDraftItems([
    { productId: '', quantity: 1, unitPrice: 10 },
    { productId: 'not-a-uuid', quantity: 1, unitPrice: 10 },
    { productId: P1, quantity: 0, unitPrice: 10 },
    { productId: P1, quantity: 1, unitPrice: -5 },
    { productId: P2, quantity: '3', unitPrice: '2.5' },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].product_id, P2);
  assert.equal(items[0].qty, '3.000');
  assert.equal(items[0].price_per_unit, '2.50');
  assert.equal(items[0].batch_no, null);
});

test('buildDraftItems clamps percentages, converts flat discounts and honours withGst=false', () => {
  const [a] = buildDraftItems([{ productId: P1, quantity: 1, unitPrice: 100, discountPercent: 150, taxPercent: -3 }]);
  assert.equal(a.discount_percent, '100.00');
  assert.equal(a.tax_percentage, '0.00');

  const [b] = buildDraftItems([{ productId: P1, quantity: 2, unitPrice: 100, discountType: 'amount', discountAmount: 20, taxPercent: 18 }]);
  assert.equal(b.discount_percent, '10.00');

  const [c] = buildDraftItems([{ productId: P1, quantity: 1, unitPrice: 100, taxPercent: 18 }], { withGst: false });
  assert.equal(c.tax_percentage, '0.00');
});

test('draftSnapshot ignores irrelevant differences and changes when a sent value changes', () => {
  const base = buildDraftItems([{ productId: P1, quantity: 2, unitPrice: 100 }]);
  const same = buildDraftItems([{ productId: P1, quantity: '2', unitPrice: '100.00' }]);
  assert.equal(draftSnapshot({ items: base }), draftSnapshot({ items: same }));
  const more = buildDraftItems([{ productId: P1, quantity: 3, unitPrice: 100 }]);
  assert.notEqual(draftSnapshot({ items: base }), draftSnapshot({ items: more }));
  assert.notEqual(draftSnapshot({ items: base, overallDiscount: 5 }), draftSnapshot({ items: base }));
});

test('toDraftMoney and resumable / restore helpers', () => {
  assert.equal(toDraftMoney(''), '0.00');
  assert.equal(toDraftMoney('12.5'), '12.50');
  assert.equal(toDraftMoney(-4), '0.00');
  assert.equal(isResumableDraft({ status: 'DRAFT', item_count: 2 }), true);
  assert.equal(isResumableDraft({ status: 'DRAFT', item_count: 0 }), false);
  assert.equal(isResumableDraft({ status: 'COMPLETE', item_count: 2 }), false);
  assert.equal(isResumableDraft(null), false);

  const lines = draftItemsToLines({
    items: [
      { id: 'i1', draft_id: 'd', product_id: P1, batch_no: null, qty: '2.000', price_per_unit: '100.00', discount_percent: '5.00', discount_amount: '10.00', tax_percentage: '18.00', tax_amount: '0', sub_total: '200.00', grand_total: '212.40', created_at: '', updated_at: '', deleted_at: null },
      { id: 'i2', draft_id: 'd', product_id: P2, batch_no: 'B', qty: '1.000', price_per_unit: '1.00', discount_percent: '0.00', discount_amount: '0', tax_percentage: '0.00', tax_amount: '0', sub_total: '1.00', grand_total: '1.00', created_at: '', updated_at: '', deleted_at: '2026-01-01' },
    ],
  });
  assert.equal(lines.length, 1);
  assert.deepEqual(lines[0], { draftItemId: 'i1', productId: P1, batch: '', quantity: 2, unitPrice: 100, discountPercent: 5, taxPercent: 18 });
});

test('module map matches the backend type table', () => {
  assert.equal(DRAFT_MODULES.quotation.type, 'ESTIMATION_QUOTATION');
  assert.equal(DRAFT_MODULES.salesReturn.type, 'SALE_RETURN');
  assert.equal(DRAFT_MODULES.purchaseOrder.party, 'supplier');
  assert.equal(DRAFT_MODULES.saleOrder.party, 'customer');
});
