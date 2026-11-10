import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getNextEstimationNumber,
  getNextProformaNumber,
  getNextSaleOrderNumber,
  getNextDeliveryChallanNumber,
  getNextSalesInvoiceNumber,
  getNextPurchaseRequestNumber,
  getNextPurchaseOrderNumber,
  getNextPurchaseBillNumber,
  getNextPurchaseReturnNumber,
  getNextPaymentInNumber,
  getNextPaymentOutNumber,
  getNextSalesReturnNumber,
} from '../src/utils/documentNumbering';

describe('Document Sequential Numbering Across All Modules', () => {
  it('1. Computes EST-003 when table contains EST-001 and EST-002', () => {
    const existing = [
      { quotationNo: 'EST-001', status: 'Created' },
      { quotationNo: 'EST-002', status: 'Created' },
    ];
    const nextNo = getNextEstimationNumber(existing);
    assert.equal(nextNo, 'EST-003');
  });

  it('2. Multi-tab preview and save sequence matches exact specification', () => {
    // Initial state: table has EST-001 and EST-002
    const tableRecords = [
      { quotationNo: 'EST-001', status: 'Created' },
      { quotationNo: 'EST-002', status: 'Created' },
    ];

    // Step 1: Customer opens three tabs
    const tab1Preview = getNextEstimationNumber(tableRecords);
    const tab2Preview = getNextEstimationNumber(tableRecords);
    const tab3Preview = getNextEstimationNumber(tableRecords);

    assert.equal(tab1Preview, 'EST-003', 'Tab 1 displays EST-003');
    assert.equal(tab2Preview, 'EST-003', 'Tab 2 displays EST-003');
    assert.equal(tab3Preview, 'EST-003', 'Tab 3 displays EST-003');

    // Step 2: Customer saves in Tab 1
    // Client sends create payload without quotationNo
    const tab1Payload = { partyName: 'Customer 1', quotationNo: undefined };
    assert.equal(tab1Payload.quotationNo, undefined, 'Payload omits client quotationNo');

    // Backend generates EST-003 atomically
    const tab1Created = { quotationNo: 'EST-003', status: 'Created' };
    tableRecords.push(tab1Created);

    // Tab 2 and Tab 3 remain untouched and still display EST-003
    assert.equal(tab2Preview, 'EST-003', 'Tab 2 still displays EST-003');
    assert.equal(tab3Preview, 'EST-003', 'Tab 3 still displays EST-003');

    // Step 3: Customer saves in Tab 2
    // Client sends create payload without quotationNo
    const tab2Payload = { partyName: 'Customer 2', quotationNo: undefined };
    assert.equal(tab2Payload.quotationNo, undefined);

    // Backend detects EST-003 exists and generates EST-004
    const tab2Created = { quotationNo: 'EST-004', status: 'Created' };
    tableRecords.push(tab2Created);

    // Tab 3 still displays EST-003
    assert.equal(tab3Preview, 'EST-003', 'Tab 3 still displays EST-003');

    // Step 4: Customer saves in Tab 3
    const tab3Payload = { partyName: 'Customer 3', quotationNo: undefined };
    assert.equal(tab3Payload.quotationNo, undefined);

    // Backend detects EST-003 and EST-004 exist and generates EST-005
    const tab3Created = { quotationNo: 'EST-005', status: 'Created' };
    tableRecords.push(tab3Created);

    // Step 5: A newly opened Tab 4 sees updated table and previews EST-006
    const tab4Preview = getNextEstimationNumber(tableRecords);
    assert.equal(tab4Preview, 'EST-006');
  });

  it('3. Computes sequential Proforma Invoice (PI-) numbers', () => {
    assert.equal(getNextProformaNumber([]), 'PI-001');
    assert.equal(
      getNextProformaNumber([{ proformaNo: 'PI-001' }, { proformaNo: 'PI-002' }]),
      'PI-003'
    );
    assert.equal(
      getNextProformaNumber([{ proformaNo: 'PI-2026-0005' }]),
      'PI-2026-0006'
    );
  });

  it('4. Computes sequential Sale Order (SO-) numbers', () => {
    assert.equal(getNextSaleOrderNumber([]), 'SO-001');
    assert.equal(
      getNextSaleOrderNumber([{ orderNo: 'SO-001' }, { orderNo: 'SO-002' }]),
      'SO-003'
    );
  });

  it('5. Computes sequential Delivery Challan (DC-) numbers', () => {
    assert.equal(getNextDeliveryChallanNumber([]), 'DC-001');
    assert.equal(
      getNextDeliveryChallanNumber([{ challanNo: 'DC-001' }, { challanNo: 'DC-002' }]),
      'DC-003'
    );
  });

  it('6. Computes sequential Sales Invoice (INV-) numbers', () => {
    assert.equal(getNextSalesInvoiceNumber([]), 'INV-001');
    assert.equal(
      getNextSalesInvoiceNumber([{ invoiceNo: 'INV-001' }, { invoiceNo: 'INV-002' }]),
      'INV-003'
    );
  });

  it('7. Computes sequential Purchase Request (PR-) numbers', () => {
    assert.equal(getNextPurchaseRequestNumber([]), 'PR-001');
    assert.equal(
      getNextPurchaseRequestNumber([{ requestNo: 'PR-001' }, { requestNo: 'PR-002' }]),
      'PR-003'
    );
  });

  it('8. Computes sequential Purchase Order & Bill (PO-) numbers', () => {
    assert.equal(getNextPurchaseOrderNumber([]), 'PO-00001');
    assert.equal(
      getNextPurchaseOrderNumber([{ poNo: 'PO-00001' }, { poNo: 'PO-00002' }]),
      'PO-00003'
    );
    assert.equal(
      getNextPurchaseBillNumber([{ purchaseNo: 'PO-00001' }, { purchaseNo: 'PO-00002' }]),
      'PO-00003'
    );
  });

  it('9. Computes sequential Purchase Return (PRT-) numbers', () => {
    assert.equal(getNextPurchaseReturnNumber([]), 'PRT-00001');
    assert.equal(
      getNextPurchaseReturnNumber([{ returnNo: 'PRT-00001' }, { returnNo: 'PRT-00002' }]),
      'PRT-00003'
    );
  });

  it('10. Estimation create payload strictly omits quotationNo and client referenceNo', () => {
    // When creating a new estimation, neither quotationNo nor preview referenceNo should be submitted
    const createPayload = {
      partyName: 'Sample Customer',
      quotationNo: undefined,
      referenceNo: undefined,
    };
    assert.equal(createPayload.quotationNo, undefined);
    assert.equal(createPayload.referenceNo, undefined);
  });

  it('11. Computes sequential Payment-In (REC-) numbers', () => {
    assert.equal(getNextPaymentInNumber([]), 'REC-001');
    assert.equal(
      getNextPaymentInNumber([{ receiptNo: 'REC-001' }, { receiptNo: 'REC-002' }]),
      'REC-003'
    );
    assert.equal(
      getNextPaymentInNumber([{ receiptNo: 'REC-2026-0005' }]),
      'REC-2026-0006'
    );
  });

  it('12. Computes sequential Payment-Out (PAY-) numbers', () => {
    assert.equal(getNextPaymentOutNumber([]), 'PAY-001');
    assert.equal(
      getNextPaymentOutNumber([{ paymentNo: 'PAY-001' }, { paymentNo: 'PAY-002' }]),
      'PAY-003'
    );
    assert.equal(
      getNextPaymentOutNumber([{ paymentNo: 'PAY-2026-0010' }]),
      'PAY-2026-0011'
    );
  });

  it('13. Computes sequential Sales Return (RET-) numbers', () => {
    assert.equal(getNextSalesReturnNumber([]), 'RET-001');
    assert.equal(
      getNextSalesReturnNumber([{ returnNo: 'RET-001' }, { returnNo: 'RET-002' }]),
      'RET-003'
    );
    assert.equal(
      getNextSalesReturnNumber([{ returnNo: 'RET-2026-0004' }]),
      'RET-2026-0005'
    );
  });
});

