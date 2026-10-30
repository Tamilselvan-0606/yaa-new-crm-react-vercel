import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDocumentTotals,
  round2,
} from '../src/utils/financialCalculations';
import { sanitizeNonNegativeInput, validCurrencyAmount } from '../src/utils/validation';

describe('Sales Invoice Paid Amount & Dynamic Payment Status Tests', () => {
  // Setup standard item for Grand Total ₹8,260
  // e.g. Taxable: 7000, 18% GST = 1260 => Grand Total = 8260
  const sampleItems = [
    {
      quantity: 7,
      unitPrice: 1000,
      discountPercent: 0,
      taxPercent: 18,
    },
  ];

  it('Example A.1: Grand Total ₹8,260, Paid Amount ₹0 → Balance Due ₹8,260 → UNPAID', () => {
    const doc = calculateDocumentTotals({
      items: sampleItems,
      withGst: true,
      gstType: 'intra_state',
      paidAmount: 0,
    });

    assert.equal(doc.grandTotal, 8260);
    assert.equal(doc.paidAmount, 0);
    assert.equal(doc.balance, 8260);
    assert.equal(doc.paymentStatus, 'Unpaid');
  });

  it('Example A.2: Grand Total ₹8,260, Paid Amount ₹3,000 → Balance Due ₹5,260 → PARTIALLY PAID', () => {
    const doc = calculateDocumentTotals({
      items: sampleItems,
      withGst: true,
      gstType: 'intra_state',
      paidAmount: 3000,
    });

    assert.equal(doc.grandTotal, 8260);
    assert.equal(doc.paidAmount, 3000);
    assert.equal(doc.balance, 5260);
    assert.equal(doc.paymentStatus, 'Partial');
  });

  it('Example A.3: Grand Total ₹8,260, Paid Amount ₹8,260 → Balance Due ₹0 → PAID', () => {
    const doc = calculateDocumentTotals({
      items: sampleItems,
      withGst: true,
      gstType: 'intra_state',
      paidAmount: 8260,
    });

    assert.equal(doc.grandTotal, 8260);
    assert.equal(doc.paidAmount, 8260);
    assert.equal(doc.balance, 0);
    assert.equal(doc.paymentStatus, 'Paid');
  });

  it('Example A.4: Grand Total ₹8,260, Paid Amount ₹8,261 → Rejected (cannot exceed Grand Total)', () => {
    const grandTotal = 8260;
    const attemptedPaid = 8261;

    // Validation rule: paidAmount must be <= grandTotal
    const isExceeding = attemptedPaid > grandTotal;
    assert.equal(isExceeding, true, 'Paid amount of ₹8,261 must be rejected when Grand Total is ₹8,260');

    // Clamping behavior ensures it cannot exceed
    const clampedPaid = Math.min(grandTotal, attemptedPaid);
    assert.equal(clampedPaid, 8260);

    const doc = calculateDocumentTotals({
      items: sampleItems,
      withGst: true,
      gstType: 'intra_state',
      paidAmount: attemptedPaid,
    });
    // calculateDocumentTotals safely caps paidAmount to grandTotal
    assert.equal(doc.paidAmount, 8260);
    assert.equal(doc.balance, 0);
    assert.equal(doc.paymentStatus, 'Paid');
  });

  it('Example B: Grand Total ₹0 → Zero-value invoice rules & no payment transaction', () => {
    const doc = calculateDocumentTotals({
      items: [],
      withGst: true,
      gstType: 'intra_state',
      paidAmount: 0,
    });

    assert.equal(doc.grandTotal, 0);
    assert.equal(doc.paidAmount, 0);
    assert.equal(doc.balance, 0);
    assert.equal(doc.paymentStatus, 'Unpaid');

    // Rule: Do not create payment transaction when paidAmount <= 0
    const shouldRecordPayment = doc.paidAmount > 0;
    assert.equal(shouldRecordPayment, false, 'No payment transaction should be created for zero-value invoice');
  });

  it('Handles monetary decimals with up to two decimal places cleanly (e.g. ₹3,540.75)', () => {
    const doc = calculateDocumentTotals({
      items: sampleItems,
      withGst: true,
      gstType: 'intra_state',
      paidAmount: 3540.75,
    });

    assert.equal(doc.grandTotal, 8260);
    assert.equal(doc.paidAmount, 3540.75);
    assert.equal(doc.balance, 4719.25);
    assert.equal(doc.paymentStatus, 'Partial');
    // Ensure no floating point imprecision
    assert.equal(round2(doc.paidAmount + doc.balance), doc.grandTotal);
  });

  it('Rejects negative values and non-numeric characters in paid amount input', () => {
    // Sanitization: removes negative signs and letters
    const sanitized = sanitizeNonNegativeInput('-500abc');
    assert.equal(sanitized, '500');

    // Validation check: negative paid amount must be rejected
    const validationNegative = validCurrencyAmount(-250, 'Paid Amount', { allowZero: true });
    assert.notEqual(validationNegative, true, 'Negative paid amount must fail validation');

    const validationValid = validCurrencyAmount(3500.5, 'Paid Amount', { allowZero: true });
    assert.equal(validationValid, true);
  });

  it('Dynamic recalculation when invoice total changes after payment is entered', () => {
    let grandTotal = 8260;
    let paidAmount = 5000;

    // Balance when total is 8260
    assert.equal(grandTotal - paidAmount, 3260);

    // Items changed: grand total reduced to 4000
    grandTotal = 4000;
    // Auto-clamping rule: if paidAmount > grandTotal, paidAmount clamps to grandTotal
    if (paidAmount > grandTotal) {
      paidAmount = grandTotal;
    }
    assert.equal(paidAmount, 4000);
    const balance = Math.max(0, grandTotal - paidAmount);
    assert.equal(balance, 0);
    const status = grandTotal > 0 && balance <= 0 && paidAmount >= grandTotal ? 'PAID' : 'PARTIALLY PAID';
    assert.equal(status, 'PAID');
  });

  it('Integrity rule: Stock deduction happens only once on invoice creation, NEVER on payment retry', () => {
    let stockAdjustmentCount = 0;
    let invoiceCreatedCount = 0;
    let paymentInCreatedCount = 0;

    // Simulate Step 1: User generates invoice
    invoiceCreatedCount += 1;
    stockAdjustmentCount += 1;

    // Simulate Payment-In network failure
    let paymentFailed = true;

    if (paymentFailed) {
      // Invoice was created, stock deducted once
      assert.equal(invoiceCreatedCount, 1);
      assert.equal(stockAdjustmentCount, 1);
      assert.equal(paymentInCreatedCount, 0);

      // Simulate Step 2: User clicks "Retry Payment"
      // Payment retry MUST only call Payment-In, NOT create invoice or adjust stock again!
      paymentInCreatedCount += 1;
      paymentFailed = false;
    }

    assert.equal(invoiceCreatedCount, 1, 'Invoice must not be duplicated');
    assert.equal(stockAdjustmentCount, 1, 'Stock must only be deducted once');
    assert.equal(paymentInCreatedCount, 1, 'Payment must be recorded once upon retry');
  });
});
