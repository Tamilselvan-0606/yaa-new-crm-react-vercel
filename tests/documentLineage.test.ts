import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { docTypeFromApiType, getConversionState, inferDocType, resolveConvertedTarget } from '../src/utils/salesDocumentWorkflow';
import { DocumentLineageBadges } from '../src/components/common/DocumentLineageBadges';

type Props = Parameters<typeof DocumentLineageBadges>[0];
const render = (props: Props) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(DocumentLineageBadges, props)));

describe('Document numbers and API document kinds', () => {
  it('recognises real document numbers', () => {
    assert.equal(inferDocType('EST-2026-0001'), 'Estimate');
    assert.equal(inferDocType('QT-2026-0001'), 'Estimate');
    assert.equal(inferDocType('PI-2026-0001'), 'Proforma');
    assert.equal(inferDocType('PRO-2026-0001'), 'Proforma');
    assert.equal(inferDocType('SO-2026-0001'), 'Order');
    assert.equal(inferDocType('DC-2026-0001'), 'Challan');
    assert.equal(inferDocType('INV-2026-0001'), 'Invoice');
    assert.equal(inferDocType('inv-2026-0001'), 'Invoice');
  });

  it('does not mistake an ordinary reference for a document number', () => {
    assert.equal(inferDocType('SOFA-12'), undefined);
    assert.equal(inferDocType('DCR/44'), undefined);
    assert.equal(inferDocType('PO-8841'), undefined);
    assert.equal(inferDocType('Customer PO 12'), undefined);
    assert.equal(inferDocType(''), undefined);
    assert.equal(inferDocType(null), undefined);
  });

  it('reads the API names for a document kind', () => {
    assert.equal(docTypeFromApiType('Invoice'), 'Invoice');
    assert.equal(docTypeFromApiType('Order'), 'Order');
    assert.equal(docTypeFromApiType('SaleOrder'), 'Order');
    assert.equal(docTypeFromApiType('Proforma'), 'Proforma');
    assert.equal(docTypeFromApiType('DeliveryChallan'), 'Challan');
    assert.equal(docTypeFromApiType('delivery_challan'), 'Challan');
    assert.equal(docTypeFromApiType('Challan'), 'Challan');
    assert.equal(docTypeFromApiType('Quotation'), 'Estimate');
    assert.equal(docTypeFromApiType('something else'), undefined);
    assert.equal(docTypeFromApiType(undefined), undefined);
  });
});

describe('The destination a document was converted into (from the server record only)', () => {
  it('uses convertedToType and convertedToInvoiceNo', () => {
    assert.deepEqual(resolveConvertedTarget({ status: 'Converted', convertedToType: 'Proforma', convertedToInvoiceNo: 'PI-2026-0001' }), { type: 'Proforma', no: 'PI-2026-0001' });
    assert.deepEqual(resolveConvertedTarget({ status: 'Converted', convertedToType: 'DeliveryChallan', convertedToInvoiceNo: 'DC-2026-0001' }), { type: 'Challan', no: 'DC-2026-0001' });
  });

  it('falls back to the number prefix when the server gives no type', () => {
    assert.deepEqual(resolveConvertedTarget({ status: 'Converted', convertedToInvoiceNo: 'INV-2026-0007' }), { type: 'Invoice', no: 'INV-2026-0007' });
  });

  it('reports nothing when the server reports no conversion', () => {
    assert.equal(resolveConvertedTarget({ status: 'Open' }), undefined);
    assert.equal(resolveConvertedTarget({ status: 'Converted', convertedToInvoiceNo: '  ' }), undefined);
    assert.equal(resolveConvertedTarget(null), undefined);
    assert.equal(resolveConvertedTarget(undefined), undefined);
  });

  it('ignores a stale destination on a document the server says is open, cancelled or expired', () => {
    for (const status of ['Open', 'Cancelled', 'Expired']) {
      assert.equal(resolveConvertedTarget({ status, convertedToType: 'Invoice', convertedToInvoiceNo: 'INV-2026-0001' }), undefined, status);
    }
  });

  it('ignores a destination it cannot identify', () => {
    assert.equal(resolveConvertedTarget({ status: 'Converted', convertedToType: 'Mystery', convertedToInvoiceNo: 'XYZ-1' }), undefined);
  });
});

describe('Conversion badges, as each of the four pages draws them', () => {
  it('Estimation: shows the Proforma it was converted into', () => {
    const html = render({ docRef: 'EST-2026-0001', currentType: 'Estimate', targetDocNo: 'PI-2026-0001', targetDocType: 'Proforma' });
    assert.match(html, /To/);
    assert.match(html, /PI: PI-2026-0001/);
    assert.match(html, /Converted to Proforma: PI-2026-0001/);
    assert.doesNotMatch(html, /From/);
  });

  it('Proforma: shows both the estimate it came from and the order it became', () => {
    const html = render({ docRef: 'PI-2026-0001', currentType: 'Proforma', sourceDocNo: 'EST-2026-0001', targetDocNo: 'SO-2026-0001', targetDocType: 'Order' });
    assert.match(html, /EST: EST-2026-0001/);
    assert.match(html, /Created from Estimate: EST-2026-0001/);
    assert.match(html, /SO: SO-2026-0001/);
    assert.match(html, /Converted to Order: SO-2026-0001/);
  });

  it('Sale order: from the proforma, to the delivery challan', () => {
    const html = render({ docRef: 'SO-2026-0001', currentType: 'Order', sourceDocNo: 'PI-2026-0001', targetDocNo: 'DC-2026-0001', targetDocType: 'Challan' });
    assert.match(html, /PI: PI-2026-0001/);
    assert.match(html, /DC: DC-2026-0001/);
  });

  it('Delivery challan: from the order, to the sales invoice', () => {
    const html = render({ docRef: 'DC-2026-0001', currentType: 'Challan', sourceDocNo: 'SO-2026-0001', targetDocNo: 'INV-2026-0001', targetDocType: 'Invoice' });
    assert.match(html, /SO: SO-2026-0001/);
    assert.match(html, /INV: INV-2026-0001/);
  });

  it('shows nothing for an unconverted document with an ordinary reference', () => {
    assert.equal(render({ docRef: 'SO-2026-0002', currentType: 'Order', sourceDocNo: 'REF-9' }), '');
    assert.equal(render({ docRef: 'EST-2026-0002', currentType: 'Estimate' }), '');
  });

  it('never shows a later document as the source, or an earlier one as the destination', () => {
    // a challan whose reference names an invoice is not "created from" that invoice
    assert.equal(render({ docRef: 'DC-2026-0003', currentType: 'Challan', sourceDocNo: 'INV-2026-0003' }), '');
    // an order whose "destination" is an estimate is not a conversion
    assert.equal(render({ docRef: 'SO-2026-0003', currentType: 'Order', targetDocNo: 'EST-2026-0003', targetDocType: 'Estimate' }), '');
  });

  it('keeps long numbers inside the table cell and gives the full number as a tooltip', () => {
    const long = 'INV-2026-0000000000000012345';
    const html = render({ docRef: 'DC-2026-0004', currentType: 'Challan', targetDocNo: long, targetDocType: 'Invoice' });
    assert.match(html, /truncate/);
    assert.match(html, new RegExp(`title="[^"]*${long}[^"]*"`));
  });
});

describe('Is a document already converted? (the one rule behind every Convert button)', () => {
  // imported lazily above would shadow the file's imports, so use the module namespace
  const rule = (doc: Parameters<typeof getConversionState>[0]) => getConversionState(doc).isFullyConverted;

  it('is converted when the server says so', () => {
    assert.equal(rule({ status: 'Converted' }), true);
    assert.equal(rule({ status: 'converted' }), true);
  });

  it('is converted when the server recorded a destination', () => {
    assert.equal(rule({ status: 'Converted', convertedToType: 'Proforma', convertedToInvoiceNo: 'PI-2026-0001' }), true);
    assert.equal(rule({ status: 'Completed', convertedToType: 'Invoice', convertedToInvoiceNo: 'INV-2026-0001' }), true);
    assert.equal(rule({ status: 'Delivered', convertedToId: '3f2b0c1a-0000-4000-8000-000000000001' }), true);
  });

  it('is NOT converted just because the document is open, completed or delivered', () => {
    assert.equal(rule({ status: 'Open' }), false);
    assert.equal(rule({ status: 'Completed' }), false);
    assert.equal(rule({ status: 'Delivered' }), false);
    assert.equal(rule({}), false);
    assert.equal(rule(null), false);
  });

  it('is NOT converted when the server says open, cancelled or expired, even with a stale destination', () => {
    for (const status of ['Open', 'Cancelled', 'Expired']) {
      assert.equal(rule({ status, convertedToType: 'Order', convertedToInvoiceNo: 'SO-2026-0001', convertedToId: 'x' }), false, status);
    }
  });

  it('keeps the destination for the badge when there is one', () => {
    const s = getConversionState({ status: 'Converted', convertedToType: 'DeliveryChallan', convertedToInvoiceNo: 'DC-2026-0001' });
    assert.deepEqual(s.target, { type: 'Challan', no: 'DC-2026-0001' });
    assert.equal(getConversionState({ status: 'Converted' }).target, undefined);
  });
});
