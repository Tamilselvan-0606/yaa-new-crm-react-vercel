import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { attachStockQty, formatStockQty } from '../src/utils/stockDisplay';

describe('Stock quantity shown in the product dropdown', () => {
  it('formats whole numbers, decimals and thousands', () => {
    assert.equal(formatStockQty(100), '100');
    assert.equal(formatStockQty(50), '50');
    assert.equal(formatStockQty(12.5), '12.5');
    assert.equal(formatStockQty(1250), '1,250');
    assert.equal(formatStockQty(0), '0');
  });

  it('adds the quantity on hand to each product that has a stock row', () => {
    const items = [{ productId: 'p1', name: 'Pedestal' }, { productId: 'p2', name: 'Rice' }];
    const out = attachStockQty(items, [
      { productId: 'p1', inStock: 100 },
      { productId: 'p2', inStock: 0 },
    ]);
    assert.equal(out[0].stockQty, 100);
    assert.equal(out[1].stockQty, 0);
  });

  it('matches a stock row by its own id when it has no productId', () => {
    const out = attachStockQty([{ id: 'p9' }], [{ id: 'p9', inStock: 7 }]);
    assert.equal(out[0].stockQty, 7);
  });

  it('never invents a quantity for a product without a stock row', () => {
    const out = attachStockQty([{ productId: 'p3' }], [{ productId: 'other', inStock: 5 }]);
    assert.equal(out[0].stockQty, undefined);
    assert.equal(attachStockQty([{ productId: 'p3' }], undefined)[0].stockQty, undefined);
  });

  it('does not change the products it was given', () => {
    const items = [{ productId: 'p1' }];
    attachStockQty(items, [{ productId: 'p1', inStock: 3 }]);
    assert.equal((items[0] as any).stockQty, undefined);
  });
});
