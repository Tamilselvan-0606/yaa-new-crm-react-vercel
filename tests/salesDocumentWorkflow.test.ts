import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  recordDocumentConversion,
  findDocumentLineage,
  getStoredLineages,
  resolveDocumentConvertedAt,
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

  it('1. Document conversion history is not kept on the client: lineage lookups return only API-backed data', () => {
    recordDocumentConversion({ fromType: 'Estimate', fromNo: 'EST-2026-0010', toType: 'Invoice', toNo: 'INV-2026-0088' });
    recordDocumentConversion({ fromType: 'Proforma', fromNo: 'PRO-2026-0004', toType: 'Order', toNo: 'SO-2026-0007' });

    assert.deepEqual(getStoredLineages(), [], 'nothing may be held on the client');
    assert.equal(findDocumentLineage('EST-2026-0010'), undefined);
    assert.equal(findDocumentLineage('INV-2026-0088'), undefined);
    assert.equal(findDocumentLineage('SO-2026-0007'), undefined);
    assert.equal(localStorage.length, 0, 'nothing may be written to the browser either');
  });

  it('2. A converted date comes from the record the API returned', () => {
    const iso = '2026-11-01T10:30:00.000Z';
    assert.equal(resolveDocumentConvertedAt('Invoice', { id: 'x', invoiceNo: 'INV-1', convertedAt: iso }), iso);
    assert.equal(resolveDocumentConvertedAt('Order', { id: 'y', orderNo: 'SO-1', convertedDate: iso }), iso);
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

});
