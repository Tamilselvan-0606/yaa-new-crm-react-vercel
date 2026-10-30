import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNumericValue,
  requiredPositiveNumber,
  nonNegativeNumber,
  optionalNonNegativeNumber,
  validPercentage,
  validCurrencyAmount,
  validQuantity,
  validRange,
  validSignedAdjustment,
  handleNonNegativeKeyDown,
  sanitizeNonNegativeInput,
} from '../src/utils/validation';
import {
  CustomerSchema,
  ProductSchema,
  SupplierSchema,
  ExpenseSchema,
  PaymentOutSchema,
  RecordPaymentSchema,
  CollectionFollowUpSchema,
} from '../src/validations/index';

describe('Numeric Validation Architecture Suite', () => {
  describe('parseNumericValue', () => {
    it('parses valid positive numbers and decimal strings correctly', () => {
      assert.equal(parseNumericValue(100), 100);
      assert.equal(parseNumericValue('42.5'), 42.5);
      assert.equal(parseNumericValue('0'), 0);
      assert.equal(parseNumericValue(0), 0);
    });

    it('returns signed negative number when parsed', () => {
      assert.equal(parseNumericValue('-15.25'), -15.25);
      assert.equal(parseNumericValue(-50), -50);
    });

    it('returns fallback value or null on empty/whitespace strings', () => {
      assert.equal(parseNumericValue(''), null);
      assert.equal(parseNumericValue('   '), null);
      assert.equal(parseNumericValue('', 0), 0);
      assert.equal(parseNumericValue(undefined, 10), 10);
      assert.equal(parseNumericValue(null, 0), 0);
    });

    it('returns fallback or null on NaN, Infinity, and invalid text', () => {
      assert.equal(parseNumericValue('abc'), null);
      assert.equal(parseNumericValue('NaN'), null);
      assert.equal(parseNumericValue('Infinity'), null);
      assert.equal(parseNumericValue(NaN, 0), 0);
      assert.equal(parseNumericValue(Infinity, 0), 0);
      assert.equal(parseNumericValue(-Infinity, 0), 0);
      assert.equal(parseNumericValue('12.34.56', 0), 0);
    });
  });

  describe('requiredPositiveNumber', () => {
    it('accepts strictly positive numbers', () => {
      assert.equal(requiredPositiveNumber(1, 'Quantity'), true);
      assert.equal(requiredPositiveNumber('10.5', 'Price'), true);
      assert.equal(requiredPositiveNumber(100), true);
    });

    it('rejects zero and negative numbers with clear error message', () => {
      const resZero = requiredPositiveNumber(0, 'Quantity');
      assert.match(String(resZero), /greater than zero/i);

      const resNegative = requiredPositiveNumber(-5, 'Amount');
      assert.match(String(resNegative), /greater than zero/i);

      const resNegativeStr = requiredPositiveNumber('-12.5', 'Quantity');
      assert.match(String(resNegativeStr), /greater than zero/i);
    });

    it('rejects empty, NaN, and invalid values', () => {
      assert.match(String(requiredPositiveNumber('', 'Rate')), /is required/i);
      assert.match(String(requiredPositiveNumber('invalid', 'Rate')), /valid number/i);
      assert.match(String(requiredPositiveNumber(NaN, 'Rate')), /valid number/i);
      assert.match(String(requiredPositiveNumber(Infinity, 'Rate')), /valid number/i);
    });

    it('enforces custom minimum when specified', () => {
      assert.equal(requiredPositiveNumber(5, 'Minimum order', { min: 5 }), true);
      assert.match(String(requiredPositiveNumber(4.9, 'Minimum order', { min: 5 })), /at least 5/i);
    });
  });

  describe('nonNegativeNumber & optionalNonNegativeNumber', () => {
    it('accepts zero and positive numbers for nonNegativeNumber', () => {
      assert.equal(nonNegativeNumber(0, 'Tax'), true);
      assert.equal(nonNegativeNumber(0.0, 'Discount'), true);
      assert.equal(nonNegativeNumber('0', 'Stock'), true);
      assert.equal(nonNegativeNumber(150, 'Price'), true);
    });

    it('rejects negative numbers for nonNegativeNumber', () => {
      const res = nonNegativeNumber(-0.01, 'Discount');
      assert.match(String(res), /cannot be negative/i);

      const resStr = nonNegativeNumber('-10', 'Stock');
      assert.match(String(resStr), /cannot be negative/i);
    });

    it('optionalNonNegativeNumber allows empty string, null, and undefined', () => {
      assert.equal(optionalNonNegativeNumber('', 'Credit Limit'), true);
      assert.equal(optionalNonNegativeNumber(null, 'Credit Limit'), true);
      assert.equal(optionalNonNegativeNumber(undefined, 'Credit Limit'), true);
      assert.equal(optionalNonNegativeNumber(0, 'Credit Limit'), true);
      assert.equal(optionalNonNegativeNumber(5000, 'Credit Limit'), true);
    });

    it('optionalNonNegativeNumber rejects negative numbers when provided', () => {
      const res = optionalNonNegativeNumber(-100, 'Credit Limit');
      assert.match(String(res), /cannot be negative/i);
    });
  });

  describe('validPercentage', () => {
    it('accepts percentages between 0 and 100 inclusive', () => {
      assert.equal(validPercentage(0), true);
      assert.equal(validPercentage(18), true);
      assert.equal(validPercentage(28.5), true);
      assert.equal(validPercentage(100), true);
    });

    it('rejects negative percentages', () => {
      const res = validPercentage(-5, 'GST Rate');
      assert.match(String(res), /cannot be negative/i);
    });

    it('rejects percentages greater than 100', () => {
      const res = validPercentage(100.1, 'Discount %');
      assert.match(String(res), /cannot exceed 100%/i);
    });
  });

  describe('validCurrencyAmount', () => {
    it('validates currency amounts with 2 decimal places and non-negative by default', () => {
      assert.equal(validCurrencyAmount(0, 'Amount', { allowZero: true }), true);
      assert.equal(validCurrencyAmount('1500.50'), true);
      assert.match(String(validCurrencyAmount(-10)), /greater than zero/i);
      assert.match(String(validCurrencyAmount(-10, 'Amount', { allowZero: true })), /cannot be negative/i);
    });

    it('allows negative amounts when allowNegative flag is true', () => {
      assert.equal(validCurrencyAmount(-10.5, 'Adjustment', { allowNegative: true }), true);
      assert.equal(validCurrencyAmount(25, 'Adjustment', { allowNegative: true }), true);
    });
  });

  describe('validQuantity', () => {
    it('accepts valid quantities', () => {
      assert.equal(validQuantity(5), true);
      assert.equal(validQuantity(2.5, 'Weight', { allowZero: false, integerOnly: false }), true);
    });

    it('rejects zero and negative quantities', () => {
      assert.match(String(validQuantity(0)), /greater than zero/i);
      assert.match(String(validQuantity(-3)), /greater than zero/i);
    });

    it('enforces whole integer quantities when integerOnly is true', () => {
      assert.equal(validQuantity(10, 'Packets', { integerOnly: true }), true);
      assert.match(String(validQuantity(10.5, 'Packets', { integerOnly: true })), /whole number/i);
    });
  });

  describe('validRange (min <= max)', () => {
    it('accepts when min is less than or equal to max', () => {
      assert.equal(validRange(10, 20), true);
      assert.equal(validRange(50, 50), true);
    });

    it('rejects when min exceeds max', () => {
      const res = validRange(100, 50, 'Minimum Price', 'Maximum Price');
      assert.match(String(res), /cannot exceed Maximum Price/i);
    });
  });

  describe('validSignedAdjustment (Round-off)', () => {
    it('accepts legitimate negative round-off when grandTotal remains non-negative', () => {
      // Example: subtotal 100.45, round off -0.45 -> grand total 100.00
      assert.equal(validSignedAdjustment(-0.45, 'Round Off', { baseTotal: 100.45, maxOffset: 5 }), true);
      assert.equal(validSignedAdjustment(0.55, 'Round Off', { baseTotal: 99.45, maxOffset: 5 }), true);
    });

    it('rejects round-off adjustment if it drives total below zero', () => {
      // Subtotal is 10, adjustment is -15 -> total -5 (rejected)
      const res = validSignedAdjustment(-15, 'Round Off', { baseTotal: 10, maxOffset: 50 });
      assert.match(String(res), /cannot result in a negative total/i);
    });

    it('rejects round-off adjustment exceeding maximum allowable offset', () => {
      const res = validSignedAdjustment(-25, 'Round Off', { baseTotal: 500, maxOffset: 10 });
      assert.match(String(res), /cannot exceed ±10/i);
    });
  });

  describe('sanitizeNonNegativeInput', () => {
    it('strips negative signs and invalid characters', () => {
      assert.equal(sanitizeNonNegativeInput('-150'), '150');
      assert.equal(sanitizeNonNegativeInput('--50.25'), '50.25');
      assert.equal(sanitizeNonNegativeInput('e100E+'), '100');
      assert.equal(sanitizeNonNegativeInput('12.34.56'), '12.3456');
    });
  });

  describe('handleNonNegativeKeyDown', () => {
    it('blocks -, +, e, E keystrokes by calling preventDefault()', () => {
      ['-', '+', 'e', 'E'].forEach((key) => {
        let prevented = false;
        handleNonNegativeKeyDown({
          key,
          preventDefault: () => {
            prevented = true;
          },
          currentTarget: { value: '10' },
        } as any);
        assert.equal(prevented, true, `Key ${key} must be blocked`);
      });
    });

    it('allows numeric digits and standard editing keys', () => {
      ['0', '5', '9', 'Backspace', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].forEach((key) => {
        let prevented = false;
        handleNonNegativeKeyDown({
          key,
          preventDefault: () => {
            prevented = true;
          },
          currentTarget: { value: '10' },
        } as any);
        assert.equal(prevented, false, `Key ${key} should be allowed`);
      });
    });

    it('blocks extra decimal point if one already exists in value', () => {
      let prevented = false;
      handleNonNegativeKeyDown(
        {
          key: '.',
          preventDefault: () => {
            prevented = true;
          },
          currentTarget: { value: '10.5' },
        } as any,
        true
      );
      assert.equal(prevented, true, 'Second decimal point must be prevented');
    });
  });
});

describe('Zod Module-Wide Schema Numeric Negative Validation', () => {
  describe('CustomerSchema', () => {
    it('accepts valid customer with positive credit limit and opening balance', () => {
      const res = CustomerSchema.safeParse({
        clientName: 'Alpha Traders',
        businessName: 'Alpha Enterprises',
        contactPerson: 'Rajesh',
        phone: '9876543210',
        address: '123 Cross Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        creditLimit: 50000,
        openingBalance: 1000,
      });
      assert.equal(res.success, true);
    });

    it('rejects customer with negative credit limit', () => {
      const res = CustomerSchema.safeParse({
        clientName: 'Alpha Traders',
        businessName: 'Alpha Enterprises',
        contactPerson: 'Rajesh',
        phone: '9876543210',
        address: '123 Cross Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        creditLimit: -500,
      });
      assert.equal(res.success, false);
      if (!res.success) {
        const creditErr = res.error.issues.find((i) => i.path.includes('creditLimit'));
        assert.ok(creditErr);
        assert.match(creditErr.message, /cannot be negative/i);
      }
    });

    it('rejects customer with negative opening balance', () => {
      const res = CustomerSchema.safeParse({
        clientName: 'Alpha Traders',
        businessName: 'Alpha Enterprises',
        contactPerson: 'Rajesh',
        phone: '9876543210',
        address: '123 Cross Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        openingBalance: -250,
      });
      assert.equal(res.success, false);
      if (!res.success) {
        const balErr = res.error.issues.find((i) => i.path.includes('openingBalance'));
        assert.ok(balErr);
        assert.match(balErr.message, /cannot be negative/i);
      }
    });
  });

  describe('ProductSchema', () => {
    it('accepts valid product with non-negative prices and stocks', () => {
      const res = ProductSchema.safeParse({
        name: 'Organic Cotton Fabric',
        sku: 'FAB-001',
        category: 'Textiles',
        salesPrice: 250,
        purchasePrice: 180,
        openingStock: 100,
        minStockLevel: 20,
      });
      assert.equal(res.success, true);
    });

    it('rejects product with negative sales price or purchase price', () => {
      const resSale = ProductSchema.safeParse({
        name: 'Organic Cotton Fabric',
        sku: 'FAB-001',
        category: 'Textiles',
        purchasePrice: 180,
        salesPrice: -50,
      });
      assert.equal(resSale.success, false);
      if (!resSale.success) {
        const err = resSale.error.issues.find((i) => i.path.includes('salesPrice'));
        assert.ok(err);
        assert.match(err.message, /cannot be negative/i);
      }

      const resPurchase = ProductSchema.safeParse({
        name: 'Organic Cotton Fabric',
        sku: 'FAB-001',
        category: 'Textiles',
        purchasePrice: -100,
        salesPrice: 200,
      });
      assert.equal(resPurchase.success, false);
    });

    it('rejects product with negative opening stock or min stock alert', () => {
      const resStock = ProductSchema.safeParse({
        name: 'Organic Cotton Fabric',
        sku: 'FAB-001',
        category: 'Textiles',
        purchasePrice: 100,
        salesPrice: 150,
        openingStock: -10,
      });
      assert.equal(resStock.success, false);

      const resMin = ProductSchema.safeParse({
        name: 'Organic Cotton Fabric',
        sku: 'FAB-001',
        category: 'Textiles',
        purchasePrice: 100,
        salesPrice: 150,
        minStockLevel: -5,
      });
      assert.equal(resMin.success, false);
    });
  });

  describe('SupplierSchema', () => {
    it('accepts valid supplier and rejects negative credit limit', () => {
      const valid = SupplierSchema.safeParse({
        name: 'Apex Yarn Mills',
        phone: '9876543210',
        email: 'apex@yarnmills.com',
        address: '45 Industrial Estate',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641001',
        creditLimit: 100000,
      });
      assert.equal(valid.success, true);

      const invalid = SupplierSchema.safeParse({
        name: 'Apex Yarn Mills',
        phone: '9876543210',
        email: 'apex@yarnmills.com',
        address: '45 Industrial Estate',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641001',
        creditLimit: -1,
      });
      assert.equal(invalid.success, false);

      const invalidEmail = SupplierSchema.safeParse({
        name: 'Apex Yarn Mills',
        phone: '9876543210',
        email: '',
        address: '45 Industrial Estate',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641001',
      });
      assert.equal(invalidEmail.success, false, 'Email must be mandatory');

      const invalidPincode = SupplierSchema.safeParse({
        name: 'Apex Yarn Mills',
        phone: '9876543210',
        email: 'apex@yarnmills.com',
        address: '45 Industrial Estate',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '123',
      });
      assert.equal(invalidPincode.success, false, 'Pincode must be exactly 6 digits');
    });
  });

  describe('ExpenseSchema & PaymentOutSchema', () => {
    it('requires positive amount for expenses (> 0)', () => {
      const zeroExpense = ExpenseSchema.safeParse({
        category: 'Office Supplies',
        title: 'Printer Paper',
        amount: 0,
        expenseDate: '2026-10-26',
        paymentMode: 'Cash',
      });
      assert.equal(zeroExpense.success, false);

      const negExpense = ExpenseSchema.safeParse({
        category: 'Office Supplies',
        title: 'Printer Paper',
        amount: -500,
        expenseDate: '2026-10-26',
        paymentMode: 'Cash',
      });
      assert.equal(negExpense.success, false);

      const validExpense = ExpenseSchema.safeParse({
        category: 'Office Supplies',
        title: 'Printer Paper',
        amount: 1500,
        expenseDate: '2026-10-26',
        paymentMode: 'Cash',
      });
      assert.equal(validExpense.success, true);
    });

    it('requires positive amount for payment out (> 0)', () => {
      const zeroPayment = PaymentOutSchema.safeParse({
        supplierId: 'sup-001',
        amount: 0,
        paymentDate: '2026-10-26',
        paymentMode: 'Bank Transfer',
      });
      assert.equal(zeroPayment.success, false);

      const negPayment = PaymentOutSchema.safeParse({
        supplierId: 'sup-001',
        amount: -1200,
        paymentDate: '2026-10-26',
        paymentMode: 'Bank Transfer',
      });
      assert.equal(negPayment.success, false);
    });
  });

  describe('RecordPaymentSchema & CollectionFollowUpSchema', () => {
    it('requires positive received amount in RecordPaymentSchema', () => {
      const negPayment = RecordPaymentSchema.safeParse({
        amountPaid: -50,
        paymentDate: '2026-10-26',
        paymentMode: 'Cash',
      });
      assert.equal(negPayment.success, false);

      const zeroPayment = RecordPaymentSchema.safeParse({
        amountPaid: 0,
        paymentDate: '2026-10-26',
        paymentMode: 'Cash',
      });
      assert.equal(zeroPayment.success, false);

      const validPayment = RecordPaymentSchema.safeParse({
        amountPaid: 500,
        paymentDate: '2026-10-26',
        paymentMode: 'Cash',
        bankDeductions: 0,
      });
      assert.equal(validPayment.success, true);
    });

    it('rejects negative promised amount in CollectionFollowUpSchema', () => {
      const negPromise = CollectionFollowUpSchema.safeParse({
        customerId: 'cust-1',
        contactMethod: 'Phone',
        followUpDate: '2026-10-26',
        outcome: 'Promised to pay next week',
        promisedAmount: -2000,
        nextFollowUpDate: '2026-11-01',
      });
      assert.equal(negPromise.success, false);

      const validPromise = CollectionFollowUpSchema.safeParse({
        customerId: 'cust-1',
        contactMethod: 'Phone',
        followUpDate: '2026-10-26',
        outcome: 'Promised to pay next week',
        promisedAmount: 25000,
        nextFollowUpDate: '2026-11-01',
      });
      assert.equal(validPromise.success, true);
    });
  });
});
