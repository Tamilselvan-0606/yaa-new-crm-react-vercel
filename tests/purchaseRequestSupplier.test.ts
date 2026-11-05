import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

// The API layer reads the browser's localStorage when it builds requests; give Node a stand-in before loading it.
let api: typeof import('../src/api/commerce/purchaseRequestApi');

before(async () => {
  (globalThis as any).localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 };
  api = await import('../src/api/commerce/purchaseRequestApi');
});

// A purchase request exactly as GET /commerce/purchase-requests returns it.
const apiRow: any = {
  id: '8588a1a9-830e-42f8-b085-c9149f424945',
  organizationId: 'ec0965b0-5dd7-4c65-8ae5-12582171af9d',
  supplierId: 'b62bb8d7-2b70-45b2-ac6c-06c73f293e3c',
  requestNo: 'PR-2026-0001',
  requestDate: '2026-11-04',
  requestedBy: 'Keerthivasan',
  department: 'Warehouse / Production',
  requiredDate: '2026-11-11',
  priority: 'Urgent',
  status: 'Purchase Created',
  totalEstimatedAmount: 180000,
  notes: null,
  createdAt: '2026-11-04T09:59:11.750Z',
  updatedAt: '2026-11-04T10:02:38.798Z',
  items: [
    { id: 'e30533b1', productId: '8e31ddf2-ebe4-4d73-8197-94857b724f34', productName: 'Pedestal', currentStock: 0, requestedQuantity: 100, estimatedUnitPrice: 1800 },
  ],
  supplier: {
    id: 'b62bb8d7-2b70-45b2-ac6c-06c73f293e3c',
    supplierCode: 'SUP-0001',
    supplierName: 'Khan Traders',
    phone: '8484848444',
    email: 'suja@test.com',
    address: 'TEST',
  },
};

const SUPPLIER_ID = 'b62bb8d7-2b70-45b2-ac6c-06c73f293e3c';

describe('Purchase request supplier', () => {
  it('maps the supplier from the API into the View and Edit pages', () => {
    const r = api.mapApiPurchaseRequestToUi(apiRow);
    assert.equal(r.supplierId, SUPPLIER_ID);
    assert.equal(r.supplierName, 'Khan Traders');
    assert.equal(r.supplierCode, 'SUP-0001');
    assert.equal(r.supplierPhone, '8484848444');
    assert.equal(r.supplierEmail, 'suja@test.com');
    assert.equal(r.supplierAddress, 'TEST');
  });

  it('falls back to supplierId when the supplier object is missing', () => {
    const r = api.mapApiPurchaseRequestToUi({ ...apiRow, supplier: null });
    assert.equal(r.supplierId, SUPPLIER_ID);
    assert.equal(r.supplierName, undefined);
  });

  it('leaves the supplier empty when the request has none', () => {
    const r = api.mapApiPurchaseRequestToUi({ ...apiRow, supplierId: null, supplier: null });
    assert.equal(r.supplierId, undefined);
    assert.equal(r.supplierName, undefined);
  });

  it('sends the chosen supplier when creating a request', () => {
    const p = api.mapUiToCreatePayload(
      { supplierId: SUPPLIER_ID, requestedBy: 'Keerthivasan', department: 'Warehouse / Production', priority: 'Urgent' },
      [],
    );
    assert.equal(p.supplierId, SUPPLIER_ID);
  });

  it('never sends a supplier id that is not a real id', () => {
    const p = api.mapUiToCreatePayload({ supplierId: 'Khan Traders', requestedBy: 'x', department: 'y', priority: 'High' }, []);
    assert.equal(p.supplierId, undefined);
  });

  it('does not add the supplier to an edit unless the screen asks for it', () => {
    const p = api.mapUiToUpdatePayload(api.mapApiPurchaseRequestToUi(apiRow));
    assert.equal('supplierId' in p, false);
  });
});
