import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLineItem,
  calculateDocumentTotals,
  determineGstType,
  round2,
} from '../src/utils/financialCalculations';
import { calculateCustomerOutstanding } from '../src/utils/outstandingBalance';

describe('Financial Calculation Engine & GST Statutory Audit Tests', () => {
  it('Test A — GST-exclusive invoice (Standard Sequence: Quantity 10, Price 100, Discount 10%, GST 18%)', () => {
    // Requirements:
    // Quantity: 10
    // Unit price: ₹100.00
    // Discount: 10%
    // GST: 18%
    // Gross amount: ₹1,000.00
    // Discount: ₹100.00
    // Taxable value: ₹900.00
    // GST: ₹162.00
    // Final total: ₹1,062.00
    const line = calculateLineItem({
      quantity: 10,
      unitPrice: 100,
      discountPercent: 10,
      taxPercent: 18,
    });

    assert.equal(line.grossAmount, 1000);
    assert.equal(line.discountAmount, 100);
    assert.equal(line.taxableAmount, 900);
    assert.equal(line.taxAmount, 162);
    assert.equal(line.lineTotal, 1062);

    const doc = calculateDocumentTotals({
      items: [
        {
          quantity: 10,
          unitPrice: 100,
          discountPercent: 10,
          taxPercent: 18,
        },
      ],
      withGst: true,
      gstType: 'intra_state',
    });

    assert.equal(doc.subtotal, 1000);
    assert.equal(doc.lineDiscountTotal, 100);
    assert.equal(doc.taxableAmount, 900);
    assert.equal(doc.totalTax, 162);
    assert.equal(doc.grandTotal, 1062);
  });

  it('Test B — Intra-state GST (CGST + SGST split without penny-drift)', () => {
    // Requirements:
    // Taxable value: ₹900.00
    // Total GST: 18% (₹162.00)
    // CGST: ₹81.00
    // SGST: ₹81.00
    // Final total: ₹1,062.00
    const doc = calculateDocumentTotals({
      items: [
        {
          quantity: 10,
          unitPrice: 100,
          discountPercent: 10,
          taxPercent: 18,
        },
      ],
      withGst: true,
      gstType: 'intra_state',
    });

    assert.equal(doc.taxableAmount, 900);
    assert.equal(doc.totalTax, 162);
    assert.equal(doc.cgst, 81);
    assert.equal(doc.sgst, 81);
    assert.equal(doc.igst, 0);
    assert.equal(round2(doc.cgst + doc.sgst), doc.totalTax);
    assert.equal(doc.grandTotal, 1062);
  });

  it('Test C — Inter-state GST (IGST 18% = ₹162.00)', () => {
    // Requirements:
    // Taxable value: ₹900.00
    // IGST: 18% = ₹162.00
    // Final total: ₹1,062.00
    const doc = calculateDocumentTotals({
      items: [
        {
          quantity: 10,
          unitPrice: 100,
          discountPercent: 10,
          taxPercent: 18,
        },
      ],
      withGst: true,
      gstType: 'inter_state',
    });

    assert.equal(doc.taxableAmount, 900);
    assert.equal(doc.cgst, 0);
    assert.equal(doc.sgst, 0);
    assert.equal(doc.igst, 162);
    assert.equal(doc.totalTax, 162);
    assert.equal(doc.grandTotal, 1062);
  });

  it('Test D — GST-inclusive pricing (Price including GST: ₹1,180.00, GST rate: 18%)', () => {
    // Requirements:
    // Price including GST: ₹1,180.00
    // GST rate: 18%
    // Taxable value: ₹1,000.00
    // GST component: ₹180.00
    // Final total remains ₹1,180.00
    const line = calculateLineItem({
      quantity: 1,
      unitPrice: 1180,
      taxPercent: 18,
      isTaxInclusive: true,
    });

    assert.equal(line.grossAmount, 1180);
    assert.equal(line.taxableAmount, 1000);
    assert.equal(line.taxAmount, 180);
    assert.equal(line.lineTotal, 1180);

    const doc = calculateDocumentTotals({
      items: [
        {
          quantity: 1,
          unitPrice: 1180,
          taxPercent: 18,
          isTaxInclusive: true,
        },
      ],
      withGst: true,
      gstType: 'intra_state',
    });

    assert.equal(doc.taxableAmount, 1000);
    assert.equal(doc.totalTax, 180);
    assert.equal(doc.cgst, 90);
    assert.equal(doc.sgst, 90);
    assert.equal(doc.grandTotal, 1180);
  });

  it('Test E — Partial payment & balance lifecycle', () => {
    // Requirements:
    // Invoice total: ₹1,062.00
    // Payment 1: ₹500.00 -> Outstanding: ₹562.00, Status: Partial
    // Payment 2: ₹562.00 -> Outstanding: ₹0.00, Status: Paid
    const docStep1 = calculateDocumentTotals({
      items: [{ quantity: 10, unitPrice: 100, discountPercent: 10, taxPercent: 18 }],
      paidAmount: 500,
    });

    assert.equal(docStep1.grandTotal, 1062);
    assert.equal(docStep1.paidAmount, 500);
    assert.equal(docStep1.balance, 562);
    assert.equal(docStep1.paymentStatus, 'Partial');

    const docStep2 = calculateDocumentTotals({
      items: [{ quantity: 10, unitPrice: 100, discountPercent: 10, taxPercent: 18 }],
      paidAmount: 1062,
    });

    assert.equal(docStep2.grandTotal, 1062);
    assert.equal(docStep2.paidAmount, 1062);
    assert.equal(docStep2.balance, 0);
    assert.equal(docStep2.paymentStatus, 'Paid');
  });

  it('Test F — Mixed tax rates across multiple line items', () => {
    // Line 1: 5 units @ ₹200, 5% GST -> Gross 1000, Tax 50, Total 1050
    // Line 2: 2 units @ ₹500, 10% disc, 12% GST -> Gross 1000, Disc 100, Taxable 900, Tax 108, Total 1008
    // Line 3: 1 unit @ ₹1000, 28% GST -> Gross 1000, Tax 280, Total 1280
    // Combined: Subtotal 3000, Discount 100, Taxable 2900, Total Tax 438, Grand Total 3338
    const doc = calculateDocumentTotals({
      items: [
        { quantity: 5, unitPrice: 200, taxPercent: 5 },
        { quantity: 2, unitPrice: 500, discountPercent: 10, taxPercent: 12 },
        { quantity: 1, unitPrice: 1000, taxPercent: 28 },
      ],
      withGst: true,
      gstType: 'intra_state',
    });

    assert.equal(doc.subtotal, 3000);
    assert.equal(doc.totalDiscount, 100);
    assert.equal(doc.taxableAmount, 2900);
    assert.equal(doc.totalTax, 438);
    assert.equal(doc.cgst, 219);
    assert.equal(doc.sgst, 219);
    assert.equal(doc.grandTotal, 3338);
  });

  it('Test G — Discount validation & edge cases', () => {
    // 1. Zero discount
    const zeroDisc = calculateLineItem({ quantity: 1, unitPrice: 100, discountPercent: 0 });
    assert.equal(zeroDisc.discountAmount, 0);
    assert.equal(zeroDisc.taxableAmount, 100);

    // 2. Maximum permitted discount (100%)
    const maxDisc = calculateLineItem({ quantity: 1, unitPrice: 100, discountPercent: 100 });
    assert.equal(maxDisc.discountAmount, 100);
    assert.equal(maxDisc.taxableAmount, 0);
    assert.equal(maxDisc.lineTotal, 0);

    // 3. Excessive discount (> 100% or amount > gross) clamped safely
    const overDisc = calculateLineItem({ quantity: 1, unitPrice: 100, discountAmount: 150 });
    assert.equal(overDisc.discountAmount, 100); // clamped to gross
    assert.equal(overDisc.taxableAmount, 0);

    // 4. Negative discount clamped to 0
    const negDisc = calculateLineItem({ quantity: 1, unitPrice: 100, discountPercent: -15 });
    assert.equal(negDisc.discountAmount, 0);
    assert.equal(negDisc.taxableAmount, 100);
  });

  it('Test H — Rounding policies & fractional paise handling', () => {
    // Line: Qty 3 @ ₹33.33 with 18% GST
    // Gross: 99.99
    // GST (18%): 17.9982 -> rounded to ₹18.00
    // Unrounded total: 117.99
    const docNone = calculateDocumentTotals({
      items: [{ quantity: 3, unitPrice: 33.33, taxPercent: 18 }],
      roundMode: 'none',
    });
    assert.equal(docNone.subtotal, 99.99);
    assert.equal(docNone.totalTax, 18);
    assert.equal(docNone.grandTotal, 117.99);

    const docAuto = calculateDocumentTotals({
      items: [{ quantity: 3, unitPrice: 33.33, taxPercent: 18 }],
      roundMode: 'auto',
    });
    assert.equal(docAuto.roundOff, 0.01);
    assert.equal(docAuto.grandTotal, 118);

    const docUp = calculateDocumentTotals({
      items: [{ quantity: 3, unitPrice: 33.33, taxPercent: 18 }],
      roundMode: 'up',
    });
    assert.equal(docUp.roundOff, 0.01);
    assert.equal(docUp.grandTotal, 118);

    const docDown = calculateDocumentTotals({
      items: [{ quantity: 3, unitPrice: 33.33, taxPercent: 18 }],
      roundMode: 'down',
    });
    assert.equal(docDown.roundOff, -0.99);
    assert.equal(docDown.grandTotal, 117);
  });

  it('Test I — Fractional paise split and odd tax amounts', () => {
    // If tax amount is odd, e.g. ₹100.05
    // CGST + SGST must exactly equal 100.05 without losing or gaining a paise
    const doc = calculateDocumentTotals({
      items: [{ quantity: 1, unitPrice: 555.833, taxPercent: 18 }],
      withGst: true,
      gstType: 'intra_state',
    });

    assert.equal(round2(doc.cgst + doc.sgst), doc.totalTax);
  });

  it('Test J — Place of supply auto-detection', () => {
    assert.equal(determineGstType('33-Tamil Nadu'), 'intra_state');
    assert.equal(determineGstType('Tamil Nadu'), 'intra_state');
    assert.equal(determineGstType('29-Karnataka'), 'inter_state');
    assert.equal(determineGstType('32-Kerala'), 'inter_state');
    assert.equal(determineGstType(null), 'intra_state');
  });
});

describe('Customer totals are linked by id, not by name or code', () => {
  const OLD_ID = '11111111-1111-4111-8111-111111111111';
  const NEW_ID = '22222222-2222-4222-8222-222222222222';
  const oldInvoice = { id: 'inv-1', customerId: OLD_ID, customerName: 'Sujay', saleStatus: 'Confirmed', grandTotal: 123894.1, paidAmount: 0 };

  it('a brand-new customer with the same name and code as a deleted one gets none of its sales', () => {
    const fresh = { id: NEW_ID, name: 'Sujay', customerCode: 'CUST-0001', openingBalance: 0 };
    const m = calculateCustomerOutstanding(fresh as any, [oldInvoice] as any, [], []);
    assert.equal(m.totalSalesAmount, 0);
    assert.equal(m.totalPaidAmount, 0);
  });

  it('the customer who owns the invoice (same id) still gets it', () => {
    const owner = { id: OLD_ID, name: 'Sujay', customerCode: 'CUST-0001', openingBalance: 0 };
    const m = calculateCustomerOutstanding(owner as any, [oldInvoice] as any, [], []);
    assert.equal(m.totalSalesAmount, 123894.1);
  });

  it('an old record saved without any id can still be matched by name', () => {
    const legacy = { id: 'local-1', name: 'Sujay', customerCode: 'CUST-0001', openingBalance: 0 };
    const noId = { id: 'inv-2', customerId: '', customerName: 'Sujay', saleStatus: 'Confirmed', grandTotal: 500, paidAmount: 0 };
    const m = calculateCustomerOutstanding(legacy as any, [noId] as any, [], []);
    assert.equal(m.totalSalesAmount, 500);
  });
});
