import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

// The API layer reads the browser's localStorage when it builds requests; give Node a stand-in before loading it.
let api: typeof import('../src/api/commerce/supplierApi');

before(async () => {
  (globalThis as any).localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 };
  api = await import('../src/api/commerce/supplierApi');
});

// A supplier row exactly as GET /work/suppliers returns it.
const apiRow: any = {
  id: 'b62bb8d7-2b70-45b2-ac6c-06c73f293e3c',
  supplierCode: 'SUP-0001',
  name: 'Khan Traders',
  company: 'Khan Traders',
  email: 'suja@test.com',
  phone: '8484848444',
  whatsapp: '8488499966',
  gstNumber: '33AAACI1607G2Z0',
  panNumber: 'SAQQQ2552Q',
  bankAccountNumber: '123456789012',
  ifsc: 'HDFC0001234',
  bankName: 'HDFC Bank',
  address: 'TEST',
  city: 'Alapakam',
  state: 'Tamil Nadu',
  country: 'India',
  pincode: '958841',
  countryId: '0da30161-bfa5-5a5e-a47a-4d543afdf341',
  stateId: 'c2a781a9-99ec-5c2e-abfa-f8c95c9491a0',
  districtId: '39425f8b-eb26-511c-bdc4-458736ae3b04',
  cityId: 'b75f0ea3-349d-5dd8-ad1e-5848a0feb3cf',
  paymentTerms: '15 Days',
  status: 'Active',
  countryName: 'India',
  stateName: 'Tamil Nadu',
  districtName: 'Chengalpattu district',
  cityName: 'Alapakam',
};

describe('Supplier bank details and saved location', () => {
  it('reads the API names (bankAccountNumber, ifsc) into the form fields', () => {
    const s = api.mapApiSupplierToSupplier(apiRow);
    assert.equal(s.accountNumber, '123456789012');
    assert.equal(s.ifscCode, 'HDFC0001234');
    assert.equal(s.bankName, 'HDFC Bank');
  });

  it('still reads the older names when a record only has those', () => {
    const s = api.mapApiSupplierToSupplier({ ...apiRow, bankAccountNumber: undefined, ifsc: undefined, accountNumber: '99', ifscCode: 'ICIC0000001' });
    assert.equal(s.accountNumber, '99');
    assert.equal(s.ifscCode, 'ICIC0000001');
  });

  it('keeps the saved district, so the edit form can show it', () => {
    const s = api.mapApiSupplierToSupplier(apiRow);
    assert.equal(s.country, 'India');
    assert.equal(s.state, 'Tamil Nadu');
    assert.equal(s.district, 'Chengalpattu district');
    assert.equal(s.city, 'Alapakam');
    assert.equal(s.districtId, '39425f8b-eb26-511c-bdc4-458736ae3b04');
  });

  it('sends the bank details with the names the API uses', () => {
    const fields = api.bankFieldsForPayload({ bankName: ' HDFC Bank ', accountNumber: ' 123456789012 ', ifscCode: 'hdfc0001234' });
    assert.deepEqual(fields, { bankName: 'HDFC Bank', bankAccountNumber: '123456789012', ifsc: 'HDFC0001234' });
    // never the form's own names
    assert.equal('accountNumber' in fields, false);
    assert.equal('ifscCode' in fields, false);
  });

  it('leaves out bank details that are empty', () => {
    assert.deepEqual(api.bankFieldsForPayload({ bankName: '', accountNumber: '  ', ifscCode: undefined }), {});
  });

  it('puts the bank details in the full supplier payload', () => {
    const payload = api.mapSupplierToPayload(api.mapApiSupplierToSupplier(apiRow));
    assert.equal(payload.bankAccountNumber, '123456789012');
    assert.equal(payload.ifsc, 'HDFC0001234');
    assert.equal(payload.bankName, 'HDFC Bank');
  });
});
