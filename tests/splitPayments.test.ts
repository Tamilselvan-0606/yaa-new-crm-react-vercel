import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SALES_SPLIT_PAYMENT_METHODS, activeSplitRows, newSplitRow, rowAmount, splitRowToPaymentFields, summarizeSplit, validateSplit, SplitPaymentRow,
} from '../src/utils/splitPayments';

const row = (id: string, method: SplitPaymentRow['method'], amount: string, extra: Partial<SplitPaymentRow> = {}): SplitPaymentRow => ({
  ...newSplitRow(id, method), amount, ...extra,
});

describe('Split payment amounts and status', () => {
  it('A: full payment with one method', () => {
    const s = summarizeSplit(10000, 0, [row('1', 'Cash', '10000')]);
    assert.deepEqual([s.totalPaid, s.balance, s.status, s.overpaid], [10000, 0, 'Paid', false]);
  });

  it('B: full payment with several methods', () => {
    const s = summarizeSplit(10000, 0, [row('1', 'Cash', '3000'), row('2', 'Bank Transfer', '5000'), row('3', 'UPI', '2000')]);
    assert.deepEqual([s.totalPaid, s.balance, s.status], [10000, 0, 'Paid']);
  });

  it('C: partial payment with several methods', () => {
    const s = summarizeSplit(10000, 0, [row('1', 'Cash', '2000'), row('2', 'UPI', '3000')]);
    assert.deepEqual([s.totalPaid, s.balance, s.status], [5000, 5000, 'Partial']);
  });

  it('D: the remaining balance paid later', () => {
    const s = summarizeSplit(10000, 5000, [row('1', 'Bank Transfer', '5000')]);
    assert.deepEqual([s.totalPaid, s.balance, s.status], [10000, 0, 'Paid']);
  });

  it('no payments is Unpaid', () => {
    const s = summarizeSplit(10000, 0, [row('1', 'Cash', '')]);
    assert.deepEqual([s.totalPaid, s.balance, s.status], [0, 10000, 'Unpaid']);
  });

  it('handles currency rounding', () => {
    const s = summarizeSplit(100.3, 0, [row('1', 'Cash', '33.1'), row('2', 'UPI', '67.2')]);
    assert.deepEqual([s.totalPaid, s.balance, s.status, s.overpaid], [100.3, 0, 'Paid', false]);
  });
});

describe('Split payment validation', () => {
  it('E: rejects payments above the bill total with a clear message', () => {
    const v = validateSplit(10000, 0, [row('1', 'Cash', '7000'), row('2', 'UPI', '5000')]);
    assert.equal(v.ok, false);
    assert.match(v.totalError || '', /more than the bill total/);
    assert.match(v.totalError || '', /2,000\.00/);
  });

  it('accepts a valid split and ignores empty rows', () => {
    const v = validateSplit(10000, 0, [row('1', 'Cash', '4000'), row('2', 'UPI', '')]);
    assert.equal(v.ok, true);
    assert.equal(activeSplitRows([row('1', 'Cash', '4000'), row('2', 'UPI', '')]).length, 1);
  });

  it('rejects negative and zero amounts', () => {
    assert.equal(validateSplit(100, 0, [row('1', 'Cash', '-5')]).rowErrors['1'], 'The amount cannot be negative.');
    assert.match(validateSplit(100, 0, [row('1', 'Cash', '0')]).rowErrors['1'], /above zero/);
    assert.equal(rowAmount(row('1', 'Cash', '-5')), 0);
  });

  it('counts what was already paid against the bill total', () => {
    assert.equal(validateSplit(10000, 5000, [row('1', 'Cash', '5001')]).ok, false);
    assert.equal(validateSplit(10000, 5000, [row('1', 'Cash', '5000')]).ok, true);
  });
});

describe('What is sent to Payments Out', () => {
  it('uses only the fields the contract has', () => {
    const f = splitRowToPaymentFields(row('1', 'UPI', '2000', { reference: ' UTR123 ' }), 'PO-2026-0001');
    assert.deepEqual(Object.keys(f).sort(), ['amount', 'notes', 'paymentType', 'referenceNo']);
    assert.equal(f.paymentType, 'UPI');
    assert.equal(f.amount, 2000);
    assert.equal(f.referenceNo, 'UTR123');
  });

  it('cash has no reference; bank details go in the notes', () => {
    assert.equal(splitRowToPaymentFields(row('1', 'Cash', '10', { reference: 'ignored' }), 'PO-1').referenceNo, undefined);
    const f = splitRowToPaymentFields(row('2', 'Cheque', '10', { reference: '000123', bankDetails: 'HDFC Anna Nagar' }), 'PO-1');
    assert.equal(f.referenceNo, '000123');
    assert.match(f.notes, /Bank details: HDFC Anna Nagar/);
  });
});

describe('Sales invoices accept their own method list', () => {
  it('rejects a method Payments In does not accept', () => {
    const allowed = SALES_SPLIT_PAYMENT_METHODS;
    assert.equal(validateSplit(1000, 0, [row('1', 'Other', '100')], allowed).rowErrors['1'], 'Choose a payment method.');
    assert.equal(validateSplit(1000, 0, [row('1', 'Online Payment', '100')], allowed).ok, true);
  });
});
