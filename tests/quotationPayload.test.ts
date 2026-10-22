import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapSaleQuotationToPayload,
  sanitizeCommerceQuotationPayload,
} from '../src/api/commerce/quotationApi';

describe('Quotation Payload Sanitization', () => {
  it('mapSaleQuotationToPayload should not include "unit" key in line items', () => {
    const quotation = {
      partyName: 'Acme Corp',
      items: [
        {
          productId: 'prod-123',
          productName: 'Widget A',
          unit: 'PCS',
          quantity: 5,
          unitPrice: 100,
          discountPercent: 10,
          taxPercent: 18,
          total: 450,
          discountAmount: 50,
          taxAmount: 81,
        },
      ],
    };

    const payload = mapSaleQuotationToPayload(quotation as any);

    assert.equal(payload.partyName, 'Acme Corp');
    assert.equal(payload.items.length, 1);
    const item = payload.items[0];
    assert.equal(item.productId, 'prod-123');
    assert.equal(item.productName, 'Widget A');
    assert.equal(item.quantity, 5);
    assert.equal(item.unitPrice, 100);
    assert.equal(item.discountPercent, 10);
    assert.equal(item.taxPercent, 18);

    // Verify 'unit' is NOT a key on the item object
    assert.equal('unit' in item, false);
    assert.equal((item as any).unit, undefined);
    assert.equal(JSON.stringify(payload).includes('"unit"'), false);
  });

  it('sanitizeCommerceQuotationPayload strips "unit" and non-schema properties from line items', () => {
    const rawPayload: any = {
      partyName: 'Test Customer',
      customerId: 'not-a-valid-uuid',
      items: [
        {
          productId: 'prod-999',
          productName: 'Sample Box',
          unit: 'BOX',
          quantity: 2,
          unitPrice: 500,
          discountAmount: 20,
          taxAmount: 90,
          randomKey: 'unexpected',
        },
      ],
    };

    const sanitized = sanitizeCommerceQuotationPayload(rawPayload);

    assert.equal(sanitized.partyName, 'Test Customer');
    // Non-UUID customerId should be removed
    assert.equal('customerId' in sanitized, false);
    assert.equal(sanitized.items.length, 1);
    const item = sanitized.items[0];

    // Verify unrecognized keys are stripped
    assert.equal('unit' in item, false);
    assert.equal('randomKey' in item, false);
    assert.equal('discountAmount' in item, false);
    assert.equal('taxAmount' in item, false);

    // Verify valid keys remain
    assert.equal(item.productId, 'prod-999');
    assert.equal(item.productName, 'Sample Box');
    assert.equal(item.quantity, 2);
    assert.equal(item.unitPrice, 500);

    // Serialized JSON check
    const jsonStr = JSON.stringify(sanitized);
    assert.equal(jsonStr.includes('"unit"'), false);
    assert.equal(jsonStr.includes('"randomKey"'), false);
  });

  it('mapSaleQuotationToPayload omits quotationNo when isCreate=true to prevent 409 DUPLICATE_DOCUMENT_NO', () => {
    const quotation = {
      partyName: 'New Client Ltd',
      quotationNo: 'EST-2026-0001',
      referenceNo: 'REF-001',
      items: [
        {
          productId: 'prod-1',
          productName: 'Item 1',
          quantity: 1,
          unitPrice: 200,
        },
      ],
    };

    // Creation mode: isCreate = true
    const createPayload = mapSaleQuotationToPayload(quotation as any, true);
    assert.equal(createPayload.quotationNo, undefined);
    assert.equal('quotationNo' in createPayload, false);

    // Edit mode: isCreate = false
    const editPayload = mapSaleQuotationToPayload(quotation as any, false);
    assert.equal(editPayload.quotationNo, 'EST-2026-0001');
  });
});

import { mapSaleProformaToPayload } from '../src/api/commerce/proformaApi';

describe('Proforma Payload Sanitization', () => {
  it('mapSaleProformaToPayload omits proformaNo when isCreate=true to prevent 409 DUPLICATE_DOCUMENT_NO', () => {
    const proforma = {
      partyName: 'Test Client',
      proformaNo: 'PRO-2026-0001',
      referenceNo: 'REF-001',
      items: [
        {
          productId: 'prod-1',
          productName: 'Item 1',
          quantity: 2,
          unitPrice: 150,
        },
      ],
    };

    // Creation mode: isCreate = true
    const createPayload = mapSaleProformaToPayload(proforma as any, true);
    assert.equal(createPayload.proformaNo, undefined);
    assert.equal('proformaNo' in createPayload, false);

    // Edit mode: isCreate = false
    const editPayload = mapSaleProformaToPayload(proforma as any, false);
    assert.equal(editPayload.proformaNo, 'PRO-2026-0001');
  });
});

