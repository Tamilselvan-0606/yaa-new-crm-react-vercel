import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLineItem,
  calculateDocumentTotals,
  determineGstType,
  parseTaxRate,
  round2,
} from '../src/utils/financialCalculations';

describe('Financial Workflow & Multi-Document Reconciliation Integration Tests', () => {
  it('Test K — Purchase Bill calculations, supplier payable, and tax breakdown', () => {
    // Supplier bill with 2 items, 18% and 12% GST, shipping charge, and round-up
    const purchaseParams = {
      items: [
        {
          quantity: 5,
          unitPrice: 200, // Gross 1000
          discountPercent: 5, // Disc 50 -> Taxable 950
          taxPercent: 18, // 18% of 950 = 171
        },
        {
          quantity: 2,
          unitPrice: 500, // Gross 1000
          discountAmount: 100, // Fixed disc 100 -> Taxable 900
          taxPercent: 12, // 12% of 900 = 108
        },
      ],
      withGst: true,
      gstType: 'intra_state' as const,
      shippingCharges: 50,
      roundMode: 'up' as const,
      paidAmount: 1000,
    };

    const res = calculateDocumentTotals(purchaseParams);

    assert.equal(res.subtotal, 2000.0);
    assert.equal(res.totalDiscount, 150.0); // 50 + 100
    assert.equal(res.taxableAmount, 1850.0); // 950 + 900
    assert.equal(res.totalTax, 279.0); // 171 + 108
    assert.equal(res.cgst, 139.5);
    assert.equal(res.sgst, 139.5);
    assert.equal(res.cgst + res.sgst, res.totalTax);
    assert.equal(res.shippingCharges, 50.0);

    // Unrounded = 1850 + 279 + 50 = 2179.00
    assert.equal(res.unroundedTotal, 2179.0);
    assert.equal(res.roundOff, 0); // Already an exact integer
    assert.equal(res.grandTotal, 2179.0);
    assert.equal(res.paidAmount, 1000.0);
    assert.equal(res.balance, 1179.0);
    assert.equal(res.paymentStatus, 'Partial');
  });

  it('Test L — Document Conversion Chain (Estimate -> Proforma -> Sale Order -> Sales Invoice) Preserves Monetary Values', () => {
    // Product line: Qty 10, Unit Price ₹250.00, Discount 10%, Tax 18%
    const initialItem = {
      quantity: 10,
      unitPrice: 250, // Gross: 2,500.00
      discountPercent: 10, // 250.00 -> Taxable: 2,250.00
      taxPercent: 18, // 405.00 -> Total: 2,655.00
    };

    // Step 1: Estimate Calculation
    const estimateTotals = calculateDocumentTotals({
      items: [initialItem],
      withGst: true,
      gstType: 'intra_state',
    });
    assert.equal(estimateTotals.subtotal, 2500.0);
    assert.equal(estimateTotals.totalDiscount, 250.0);
    assert.equal(estimateTotals.taxableAmount, 2250.0);
    assert.equal(estimateTotals.totalTax, 405.0);
    assert.equal(estimateTotals.cgst, 202.5);
    assert.equal(estimateTotals.sgst, 202.5);
    assert.equal(estimateTotals.grandTotal, 2655.0);

    // Step 2: Proforma Conversion (Preserves all fields without changes)
    const proformaTotals = calculateDocumentTotals({
      items: [
        {
          quantity: estimateTotals.items[0].quantity,
          unitPrice: estimateTotals.items[0].unitPrice,
          discountPercent: estimateTotals.items[0].discountPercent,
          taxPercent: estimateTotals.items[0].taxPercent,
        },
      ],
      withGst: true,
      gstType: 'intra_state',
    });
    assert.equal(proformaTotals.grandTotal, estimateTotals.grandTotal);
    assert.equal(proformaTotals.taxableAmount, estimateTotals.taxableAmount);

    // Step 3: Sale Order Conversion
    const saleOrderTotals = calculateDocumentTotals({
      items: [
        {
          quantity: proformaTotals.items[0].quantity,
          unitPrice: proformaTotals.items[0].unitPrice,
          discountPercent: proformaTotals.items[0].discountPercent,
          taxPercent: proformaTotals.items[0].taxPercent,
        },
      ],
      withGst: true,
      gstType: 'intra_state',
    });
    assert.equal(saleOrderTotals.grandTotal, estimateTotals.grandTotal);

    // Step 4: Sales Invoice Conversion
    const invoiceTotals = calculateDocumentTotals({
      items: [
        {
          quantity: saleOrderTotals.items[0].quantity,
          unitPrice: saleOrderTotals.items[0].unitPrice,
          discountPercent: saleOrderTotals.items[0].discountPercent,
          taxPercent: saleOrderTotals.items[0].taxPercent,
        },
      ],
      withGst: true,
      gstType: 'intra_state',
      paidAmount: 0,
    });
    assert.equal(invoiceTotals.grandTotal, 2655.0);
    assert.equal(invoiceTotals.balance, 2655.0);
    assert.equal(invoiceTotals.paymentStatus, 'Unpaid');
  });

  it('Test M — Return and Credit Note Tax Adjustment & Balance Reconciliation', () => {
    // Original Sale: Qty 10 @ ₹100, 18% GST -> Grand Total ₹1,180.00
    // Customer returned 3 units
    const returnQty = 3;
    const unitPrice = 100;
    const taxRate = 18;

    const returnLine = calculateLineItem(
      {
        quantity: returnQty,
        unitPrice: unitPrice,
        taxPercent: taxRate,
      },
      { withGst: true, gstType: 'intra_state' }
    );

    assert.equal(returnLine.grossAmount, 300.0);
    assert.equal(returnLine.taxableAmount, 300.0);
    assert.equal(returnLine.taxAmount, 54.0);
    assert.equal(returnLine.cgst, 27.0);
    assert.equal(returnLine.sgst, 27.0);
    assert.equal(returnLine.lineTotal, 354.0);

    // Customer originally owed ₹1,180.00, had paid ₹500.00, remaining balance ₹680.00
    // After credit note of ₹354.00, adjusted balance = ₹680.00 - ₹354.00 = ₹326.00
    const originalBalance = 680.0;
    const adjustedBalance = round2(originalBalance - returnLine.lineTotal);
    assert.equal(adjustedBalance, 326.0);
  });

  it('Test N — Multi-rate Pro-Rata Pre-Tax Document Discount Allocation', () => {
    // 2 Items with different tax rates:
    // Item 1: ₹1,000.00 @ 18% GST (Taxable 1000)
    // Item 2: ₹1,000.00 @ 12% GST (Taxable 1000)
    // Unadjusted Taxable Total = ₹2,000.00
    // Document-level discount = ₹200.00 (10% overall discount)
    // Under Section 15 of CGST Act:
    // Item 1 gets ₹100 discount -> Taxable ₹900 -> 18% GST = ₹162.00
    // Item 2 gets ₹100 discount -> Taxable ₹900 -> 12% GST = ₹108.00
    // Total Taxable = ₹1,800.00, Total Tax = ₹270.00, Grand Total = ₹2,070.00
    const res = calculateDocumentTotals({
      items: [
        { quantity: 1, unitPrice: 1000, taxPercent: 18 },
        { quantity: 1, unitPrice: 1000, taxPercent: 12 },
      ],
      withGst: true,
      gstType: 'intra_state',
      overallDiscount: 200,
    });

    assert.equal(res.subtotal, 2000.0);
    assert.equal(res.overallDiscount, 200.0);
    assert.equal(res.totalDiscount, 200.0);
    assert.equal(res.taxableAmount, 1800.0);
    assert.equal(res.totalTax, 270.0);
    assert.equal(res.cgst, 135.0);
    assert.equal(res.sgst, 135.0);
    assert.equal(res.grandTotal, 2070.0);
  });

  it('Test O — Monetary Boundary Values (₹0.01, ₹0.05, ₹99.99, fractional paise)', () => {
    // Boundary 1: ₹0.01 item
    const tiny = calculateLineItem({ quantity: 1, unitPrice: 0.01, taxPercent: 18 });
    assert.equal(tiny.grossAmount, 0.01);
    assert.equal(tiny.taxableAmount, 0.01);
    // 18% of 0.01 = 0.0018 -> rounded to 0.00
    assert.equal(tiny.taxAmount, 0.0);
    assert.equal(tiny.lineTotal, 0.01);

    // Boundary 2: ₹99.99 item with 5% GST
    const boundary = calculateLineItem({ quantity: 1, unitPrice: 99.99, taxPercent: 5 });
    assert.equal(boundary.grossAmount, 99.99);
    // 5% of 99.99 = 4.9995 -> rounded to 5.00
    assert.equal(boundary.taxAmount, 5.0);
    assert.equal(boundary.lineTotal, 104.99);

    // Boundary 3: parseTaxRate helper
    assert.equal(parseTaxRate('GST@18%'), 18);
    assert.equal(parseTaxRate('GST @ 12.5%'), 12.5);
    assert.equal(parseTaxRate('Exempted'), 0);
    assert.equal(parseTaxRate('Nil Rated'), 0);
    assert.equal(parseTaxRate(5), 5);
  });
});
