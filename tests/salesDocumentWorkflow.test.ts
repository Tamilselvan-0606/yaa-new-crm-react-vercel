import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  recordDocumentConversion,
  findDocumentLineage,
  initializeWorkflowIntegrity,
  syncConvertedProformaToStorage,
  syncConvertedOrderToStorage,
  syncConvertedInvoiceToStorage,
  syncQuotationStatusInStorage,
  syncProformaStatusInStorage,
  syncOrderStatusInStorage,
} from '../src/utils/salesDocumentWorkflow';

// Polyfill localStorage and window for Node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0,
  } as any;
}

if (typeof globalThis.window === 'undefined') {
  const listeners = new Map<string, Set<Function>>();
  globalThis.window = {
    dispatchEvent: (event: any) => {
      const set = listeners.get(event.type);
      if (set) set.forEach((fn) => fn(event));
      return true;
    },
    addEventListener: (type: string, fn: Function) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: Function) => {
      listeners.get(type)?.delete(fn);
    },
  } as any;
}

describe('Sales Hub Document Workflow & Lineage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Direct Estimate to Sales Invoice conversion preserves lineage and upstream references', () => {
    const estimateNo = 'EST-2026-0010';
    const invoiceNo = 'INV-2026-0088';

    recordDocumentConversion({
      fromType: 'Estimate',
      fromNo: estimateNo,
      toType: 'Invoice',
      toNo: invoiceNo,
    });

    const lineage = findDocumentLineage(estimateNo);
    assert.ok(lineage, 'Lineage must be recorded');
    assert.equal(lineage?.estimateNo, estimateNo);
    assert.equal(lineage?.invoiceNo, invoiceNo);

    // Bidirectional query: find by Invoice No
    const invoiceLineage = findDocumentLineage(invoiceNo);
    assert.ok(invoiceLineage, 'Lineage must be found by invoice number');
    assert.equal(invoiceLineage?.estimateNo, estimateNo);
  });

  it('2. Multi-step conversion chain preserves full lineage: Estimate -> Proforma -> Sale Order -> Invoice', () => {
    const estNo = 'EST-2026-0007';
    const proformaNo = 'PRO-2026-0007';
    const orderNo = 'SO-2026-0007';
    const invoiceNo = 'INV-2026-0007';

    // Step 1: Estimate -> Proforma
    recordDocumentConversion({
      fromType: 'Estimate',
      fromNo: estNo,
      toType: 'Proforma',
      toNo: proformaNo,
    });

    // Step 2: Proforma -> Order
    recordDocumentConversion({
      fromType: 'Proforma',
      fromNo: proformaNo,
      toType: 'Order',
      toNo: orderNo,
    });

    // Step 3: Order -> Invoice
    recordDocumentConversion({
      fromType: 'Order',
      fromNo: orderNo,
      toType: 'Invoice',
      toNo: invoiceNo,
    });

    // Check full chain query from Order
    const orderLineage = findDocumentLineage(orderNo);
    assert.ok(orderLineage);
    assert.equal(orderLineage?.estimateNo, estNo);
    assert.equal(orderLineage?.proformaNo, proformaNo);
    assert.equal(orderLineage?.orderNo, orderNo);
    assert.equal(orderLineage?.invoiceNo, invoiceNo);

    // Query from invoice resolves all upstream documents
    const invLineage = findDocumentLineage(invoiceNo);
    assert.equal(invLineage?.estimateNo, estNo);
    assert.equal(invLineage?.proformaNo, proformaNo);
    assert.equal(invLineage?.orderNo, orderNo);
  });

  it('3. initializeWorkflowIntegrity is a safe no-op preserving API as single source of truth', () => {
    // initializeWorkflowIntegrity should execute safely without throwing
    assert.doesNotThrow(() => {
      initializeWorkflowIntegrity();
    });
  });

  it('4. Status synchronizers dispatch custom events for real-time reactivity', () => {
    let receivedEvent: any = null;
    const listener = (e: any) => {
      receivedEvent = e.detail;
    };
    window.addEventListener('yaa_crm_proformas_updated', listener);

    syncProformaStatusInStorage('PRO-2026-0099', 'Converted', 'SO-2026-0099');

    window.removeEventListener('yaa_crm_proformas_updated', listener);
    assert.ok(receivedEvent, 'Event must be dispatched');
    assert.equal(receivedEvent.idOrNo, 'PRO-2026-0099');
    assert.equal(receivedEvent.status, 'Converted');
    assert.equal(receivedEvent.convertedTo, 'SO-2026-0099');
  });

  it('5. inferDocType identifies sales document types from prefixes correctly', async () => {
    const { inferDocType } = await import('../src/utils/salesDocumentWorkflow');
    assert.equal(inferDocType('EST-2026-0004'), 'Estimate');
    assert.equal(inferDocType('QT-2026-0001'), 'Estimate');
    assert.equal(inferDocType('PI-2026-0002'), 'Proforma');
    assert.equal(inferDocType('PRO-2026-0005'), 'Proforma');
    assert.equal(inferDocType('SO-2026-0001'), 'Order');
    assert.equal(inferDocType('DC-2026-0002'), 'Challan');
    assert.equal(inferDocType('INV-2026-0005'), 'Invoice');
    assert.equal(inferDocType('4'), undefined);
  });

  it('6. Numeric references "4" and "3" resolve to their corresponding Delivery Challan lineages', () => {
    // Record lineage for DC-2026-0002
    recordDocumentConversion({
      fromType: 'Order',
      fromNo: 'SO-2026-0002',
      toType: 'Challan',
      toNo: 'DC-2026-0002',
      toId: '4',
    });

    // Record lineage for DC-2026-0001
    recordDocumentConversion({
      fromType: 'Order',
      fromNo: 'SO-2026-0001',
      toType: 'Challan',
      toNo: 'DC-2026-0001',
      toId: '3',
    });

    const lineage4 = findDocumentLineage('4');
    assert.ok(lineage4, 'Reference 4 must resolve');
    assert.equal(lineage4?.challanNo, 'DC-2026-0002');

    const lineage3 = findDocumentLineage('3');
    assert.ok(lineage3, 'Reference 3 must resolve');
    assert.equal(lineage3?.challanNo, 'DC-2026-0001');
  });

  it('7. recordDocumentConversion stitches disparate segments into a unified end-to-end chain', () => {
    // Segment A: Estimate -> Order
    recordDocumentConversion({
      fromType: 'Estimate',
      fromNo: 'EST-2026-0004',
      toType: 'Order',
      toNo: 'SO-2026-0004',
    });

    // Segment B: Challan -> Invoice
    recordDocumentConversion({
      fromType: 'Challan',
      fromNo: 'DC-2026-0004',
      toType: 'Invoice',
      toNo: 'INV-2026-0005',
    });

    // Bridge: Order -> Challan
    recordDocumentConversion({
      fromType: 'Order',
      fromNo: 'SO-2026-0004',
      toType: 'Challan',
      toNo: 'DC-2026-0004',
    });

    // Verify unified chain queried from Invoice
    const chain = findDocumentLineage('INV-2026-0005');
    assert.ok(chain, 'Chain must be stitched into a unified lineage');
    assert.equal(chain?.estimateNo, 'EST-2026-0004');
    assert.equal(chain?.orderNo, 'SO-2026-0004');
    assert.equal(chain?.challanNo, 'DC-2026-0004');
    assert.equal(chain?.invoiceNo, 'INV-2026-0005');
  });
});
