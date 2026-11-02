import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkRequiredText,
  checkRequiredSelection,
  checkRecordId,
  checkEmail,
  checkNumber,
  checkQuantity,
  checkMoney,
  checkPercent,
  checkRequiredDate,
  checkDateNotBefore,
  checkPaymentWithinBalance,
  checkStockAvailable,
  checkDiscountWithinBase,
  checkNotGreaterThan,
  validateBatchStock,
  checkTotalConsistency,
  checkGstSplit,
  checkGstin,
  checkPan,
  checkPincode,
  validateLineItems,
  checkHasLineItems,
  extractApiFieldErrors,
  getApiErrorMessage,
} from '../src/utils/formValidation';

const UUID = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b';

describe('text / selection checks', () => {
  it('asks for a required text field in plain language', () => {
    assert.equal(checkRequiredText('  ', 'supplier name'), 'Please enter the supplier name.');
    assert.equal(checkRequiredText('Acme', 'supplier name'), null);
  });
  it('asks for a dropdown selection', () => {
    assert.equal(checkRequiredSelection('', 'product'), 'Please select a product before continuing.');
    assert.equal(checkRequiredSelection(UUID, 'product'), null);
  });
  it('requires a real record id', () => {
    assert.equal(checkRecordId('free text', 'product'), 'Please choose the product from the list.');
    assert.equal(checkRecordId(UUID, 'product'), null);
  });
  it('validates email and optional email', () => {
    assert.equal(checkEmail('a@b'), 'Please enter a valid email address.');
    assert.equal(checkEmail(''), null);
    assert.equal(checkEmail('', true), 'Please enter the email address.');
    assert.equal(checkEmail('a@b.co'), null);
  });
  it('validates GSTIN, PAN and pincode only when provided', () => {
    assert.equal(checkGstin(''), null);
    assert.equal(checkGstin('27AAPFU0939F1ZV'), null);
    assert.ok(checkGstin('BADGSTIN'));
    assert.equal(checkPan('ABCDE1234F'), null);
    assert.ok(checkPan('1234'));
    assert.equal(checkPincode('600001'), null);
    assert.ok(checkPincode('60001'));
  });
});

describe('numeric checks: empty is never zero', () => {
  it('distinguishes missing from invalid', () => {
    assert.equal(checkNumber('', 'unit price'), 'Please enter the unit price.');
    assert.equal(checkNumber('abc', 'unit price', { allowZero: true }), 'Unit price must be a valid number.');
  });
  it('rejects zero and negatives unless allowed', () => {
    assert.equal(checkQuantity(0), 'Please enter a quantity greater than zero.');
    assert.equal(checkQuantity(''), 'Please enter a quantity greater than zero.');
    assert.equal(checkQuantity(-2), 'Quantity cannot be negative.');
    assert.equal(checkQuantity('2.5'), null);
    assert.equal(checkQuantity(0, { allowZero: true }), null);
  });
  it('supports whole-number quantities', () => {
    assert.equal(checkQuantity('2.5', { integerOnly: true }), 'Quantity must be a whole number.');
  });
  it('allows legitimate signed values when asked', () => {
    assert.equal(checkNumber(-0.4, 'round-off', { allowNegative: true }), null);
  });
  it('limits money to 2 decimals and keeps legitimate zero', () => {
    assert.equal(checkMoney('10.999', 'unit price'), 'Unit price can have at most 2 decimal places.');
    assert.equal(checkMoney(0, 'unit price', { allowZero: true }), null);
    assert.equal(checkMoney('', 'unit price', { optional: true }), null);
  });
  it('validates percentages 0-100', () => {
    assert.equal(checkPercent(18, 'GST percentage'), null);
    assert.equal(checkPercent(0, 'GST percentage'), null);
    assert.equal(checkPercent(101, 'GST percentage'), 'Please enter a valid GST percentage between 0 and 100.');
    assert.equal(checkPercent(-1, 'GST percentage'), 'Please enter a valid GST percentage between 0 and 100.');
    assert.equal(checkPercent('', 'GST percentage'), 'Please enter the GST percentage.');
  });
});

describe('dates', () => {
  it('requires a valid date', () => {
    assert.equal(checkRequiredDate('', 'order date'), 'Please select the order date.');
    assert.equal(checkRequiredDate('not-a-date', 'order date'), 'Please enter a valid order date.');
    assert.equal(checkRequiredDate('2026-11-02', 'order date'), null);
  });
  it('rejects a later date that falls before the earlier one', () => {
    assert.equal(
      checkDateNotBefore('2026-11-01', '2026-11-05', 'expected delivery date', 'order date'),
      'The expected delivery date cannot be earlier than the order date.',
    );
    assert.equal(checkDateNotBefore('2026-11-05', '2026-11-05', 'due date', 'order date'), null);
    assert.equal(checkDateNotBefore('', '2026-11-05', 'due date', 'order date'), null);
  });
});

describe('financial checks', () => {
  it('blocks payments above the outstanding balance', () => {
    assert.equal(
      checkPaymentWithinBalance(1500, 1200),
      'Payment amount cannot exceed the outstanding balance of ₹1200.00.',
    );
    assert.equal(checkPaymentWithinBalance(1200, 1200), null);
    assert.equal(checkPaymentWithinBalance(500, undefined), null);
  });
  it('blocks quantities above available stock', () => {
    assert.equal(checkStockAvailable(15, 12, 'Widget'), 'Only 12 units are available in this batch. Please reduce the quantity.');
    assert.equal(checkStockAvailable(12, 12), null);
  });
  it('blocks a price that is above the sale price', () => {
    assert.equal(
      checkNotGreaterThan(20000, 2500, 'wholesale price', 'sale price'),
      'Wholesale price cannot be greater than the sale price (₹2500).',
    );
    assert.equal(checkNotGreaterThan(2500, 2500, 'wholesale price', 'sale price'), null);
    assert.equal(checkNotGreaterThan('', 2500, 'wholesale price', 'sale price'), null);
    assert.equal(checkNotGreaterThan(100, '', 'wholesale price', 'sale price'), null);
  });
  it('blocks discounts above the line amount', () => {
    assert.equal(checkDiscountWithinBase(150, 100), 'Discount cannot exceed the permitted amount.');
    assert.equal(checkDiscountWithinBase(100, 100), null);
  });
  it('detects totals that do not match the items', () => {
    assert.ok(checkTotalConsistency(118, 120, 'grand total'));
    assert.equal(checkTotalConsistency(118, 118.02, 'grand total'), null);
  });
  it('enforces the GST split by transaction type', () => {
    assert.equal(checkGstSplit({ cgst: 9, sgst: 9, total: 18 }, 'intra'), null);
    assert.ok(checkGstSplit({ igst: 18, total: 18 }, 'intra'));
    assert.equal(checkGstSplit({ igst: 18, total: 18 }, 'inter'), null);
    assert.ok(checkGstSplit({ cgst: 9, sgst: 9, total: 18 }, 'inter'));
    assert.ok(checkGstSplit({ total: 5 }, 'exempt'));
    assert.equal(checkGstSplit({ total: 0 }, 'exempt'), null);
  });
});

describe('validateLineItems', () => {
  it('skips untouched rows and flags bad ones with indexed keys', () => {
    const errors = validateLineItems([
      { productId: UUID, productName: 'A', quantity: 2, unitPrice: 10 },
      { productId: '', productName: '', quantity: '' },
      { productId: UUID, productName: 'B', quantity: 0, unitPrice: '' },
    ]);
    assert.equal(errors['items.0.quantity'], undefined);
    assert.equal(Object.keys(errors).some((k) => k.startsWith('items.1.')), false);
    assert.equal(errors['items.2.quantity'], 'Please enter a quantity greater than zero.');
    assert.equal(errors['items.2.price'], 'Please enter the unit price.');
  });
  it('requires a real product id when a name was typed', () => {
    const errors = validateLineItems([{ productId: 'abc', productName: 'X', quantity: 1, unitPrice: 5 }]);
    assert.equal(errors['items.0.product'], 'Please choose the product from the list.');
  });
  it('applies the stock hook and a zero-price allowance', () => {
    const errors = validateLineItems(
      [{ productId: UUID, productName: 'Widget', quantity: 20, unitPrice: 0 }],
      { allowZeroPrice: true, availableStock: () => 12 },
    );
    assert.equal(errors['items.0.price'], undefined);
    assert.equal(errors['items.0.quantity'], 'Only 12 units are available in this batch. Please reduce the quantity.');
  });
  it('reports a missing list of lines', () => {
    assert.equal(checkHasLineItems([{ productId: '', productName: '', quantity: '' }]), 'Please add at least one item before saving.');
    assert.equal(checkHasLineItems([{ productId: UUID, quantity: 1 }]), null);
  });
});

describe('backend errors', () => {
  it('maps backend field errors by dotted path', () => {
    const err = {
      response: {
        data: { error: { message: 'Validation failed', fields: [{ path: ['items', 0, 'quantity'], message: 'Too small' }] } },
      },
    };
    assert.deepEqual(extractApiFieldErrors(err), { 'items.0.quantity': 'Too small' });
    assert.deepEqual(extractApiFieldErrors(new Error('boom')), {});
  });
  it('hides technical messages from users', () => {
    assert.equal(getApiErrorMessage({ message: 'Request failed with status code 400' }, 'Could not save.'), 'Could not save.');
    assert.equal(getApiErrorMessage({ status: 500, message: 'x' }, 'Could not save.'), 'Could not save.');
    assert.equal(
      getApiErrorMessage({ message: 'Network Error' }),
      'Unable to reach the server. Please check your connection and try again.',
    );
    assert.equal(getApiErrorMessage({ status: 403, message: 'Forbidden' }), 'You do not have permission to perform this action.');
  });
  it('keeps readable backend sentences and strips the interceptor suffix', () => {
    const err = { status: 400, message: 'Customer is required (customerId: Required)', response: { data: { error: { message: 'Customer is required (customerId: Required)' } } } };
    assert.equal(getApiErrorMessage(err), 'Customer is required');
  });
});

describe('validateBatchStock (combined across rows)', () => {
  const P = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b';
  const stock = (n: number | null) => ({ getAvailable: () => n });

  it('accepts a quantity within and equal to the batch stock', () => {
    assert.deepEqual(validateBatchStock([{ productId: P, batch: 'B1', quantity: 99 }], stock(100)), {});
    assert.deepEqual(validateBatchStock([{ productId: P, batch: 'B1', quantity: 100 }], stock(100)), {});
  });
  it('flags a quantity above the batch stock with the batch message', () => {
    const e = validateBatchStock([{ productId: P, batch: 'BAT-OCT', quantity: 600 }], stock(565));
    assert.equal(e['items.0.quantity'], 'Only 565 units are available in this batch. Please reduce the quantity.');
  });
  it('flags one unit over the stock', () => {
    const e = validateBatchStock([{ productId: P, batch: 'B1', quantity: 101 }], stock(100));
    assert.ok(e['items.0.quantity']);
  });
  it('adds up rows that use the same product and batch', () => {
    const e = validateBatchStock(
      [
        { productId: P, batch: 'B1', quantity: 60 },
        { productId: P, batch: 'B1', quantity: 50 },
      ],
      stock(100),
    );
    assert.equal(e['items.0.quantity'], undefined);
    assert.equal(e['items.1.quantity'], 'Total quantity for this batch exceeds the available stock of 100 units.');
  });
  it('does not mix different batches or products', () => {
    const e = validateBatchStock(
      [
        { productId: P, batch: 'B1', quantity: 80 },
        { productId: P, batch: 'B2', quantity: 80 },
        { productId: 'other', batch: 'B1', quantity: 80 },
      ],
      stock(100),
    );
    assert.deepEqual(e, {});
  });
  it('ignores unknown stock and invalid quantities (other checks report those)', () => {
    assert.deepEqual(validateBatchStock([{ productId: P, batch: 'B1', quantity: 5 }], stock(null)), {});
    assert.deepEqual(validateBatchStock([{ productId: P, batch: 'B1', quantity: '' }], stock(1)), {});
    assert.deepEqual(validateBatchStock([{ productId: P, batch: 'B1', quantity: 0 }], stock(1)), {});
    assert.deepEqual(validateBatchStock([{ productId: P, batch: '', quantity: 500 }], stock(1)), {});
  });
  it('credits stock the saved document already holds, once per batch (edit mode)', () => {
    const lines = [
      { productId: P, batch: 'B1', quantity: 30 },
      { productId: P, batch: 'B1', quantity: 30 },
    ];
    assert.deepEqual(validateBatchStock(lines, { getAvailable: () => 20, credit: () => 40 }), {});
    const over = validateBatchStock(
      [{ productId: P, batch: 'B1', quantity: 70 }],
      { getAvailable: () => 20, credit: () => 40 },
    );
    assert.equal(over['items.0.quantity'], 'Only 60 units are available in this batch. Please reduce the quantity.');
  });
});
