import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PAYMENT_REFERENCE_ERROR_MESSAGE,
  isValidIfscOrSwift,
  isValidPaymentReference,
  isValidUpiId,
  sanitizeAlphaSpaceInput,
  sanitizeAlphanumericUpperInput,
  sanitizeDigitsOnlyInput,
  sanitizePaymentReferenceInput,
  sanitizeUpiIdInput,
} from '../src/utils/validation';
import {
  BankAccountSchema,
  ExpenseSchema,
  PaymentInSchema,
  PaymentOutSchema,
  PaymentSchema,
  RecordPaymentSchema,
  SupplierSchema,
} from '../src/validations';
import { newSplitRow, validateSplit } from '../src/utils/splitPayments';

describe('Payment Reference Number sanitization and validation', () => {
  it('allows letters, digits, and hyphens (-) for Sale Management references, and strips special characters', () => {
    assert.equal(sanitizePaymentReferenceInput('UTR-9821892812'), 'UTR-9821892812');
    assert.equal(sanitizePaymentReferenceInput('TXN@123#45!'), 'TXN12345');
    assert.equal(sanitizePaymentReferenceInput('CHQ/2026_01$ '), 'CHQ202601');
    assert.equal(sanitizePaymentReferenceInput('PAY-2026+01*'), 'PAY-202601');

    assert.equal(isValidPaymentReference(''), true);
    assert.equal(isValidPaymentReference('UTR-123456'), true);
    assert.equal(isValidPaymentReference('CHQ009812'), true);
    assert.equal(isValidPaymentReference('UTR@123'), false);
    assert.equal(isValidPaymentReference('TXN 123'), false);
    assert.equal(isValidPaymentReference('REF#01'), false);
    assert.ok(PAYMENT_REFERENCE_ERROR_MESSAGE.includes('-'));
  });

  it('requires digits-only referenceId in RecordPaymentSchema (Client Invoice module)', () => {
    const valid = RecordPaymentSchema.safeParse({
      amountPaid: 1000,
      paymentDate: '2026-11-19',
      paymentMode: 'UPI / QR Code',
      referenceId: '123456789012',
    });
    assert.equal(valid.success, true);

    const empty = RecordPaymentSchema.safeParse({
      amountPaid: 1000,
      paymentDate: '2026-11-19',
      paymentMode: 'Cash',
      referenceId: '',
    });
    assert.equal(empty.success, true);

    for (const badRef of ['UTR-12345', 'ABC123', '123@456', '123 456']) {
      const invalid = RecordPaymentSchema.safeParse({
        amountPaid: 1000,
        paymentDate: '2026-11-19',
        paymentMode: 'UPI / QR Code',
        referenceId: badRef,
      });
      assert.equal(invalid.success, false, `Expected "${badRef}" to be rejected`);
      if (!invalid.success) {
        assert.equal(invalid.error.issues[0].message, 'Reference number must contain numbers only.');
      }
    }
  });

  it('rejects special characters in PaymentIn, PaymentOut, Expense, and Payment schemas', () => {
    assert.equal(
      PaymentInSchema.safeParse({
        partyName: 'Acme Corp',
        receiptNo: 'REC-001',
        date: '2026-11-19',
        paymentType: 'UPI',
        receivedAmount: 500,
        referenceNo: 'UTR$123',
      }).success,
      false,
    );

    assert.equal(
      PaymentOutSchema.safeParse({
        supplierId: 'sup-1',
        amount: 500,
        paymentDate: '2026-11-19',
        paymentMode: 'Bank Transfer',
        referenceNo: 'UTR*999',
      }).success,
      false,
    );

    assert.equal(
      ExpenseSchema.safeParse({
        expenseDate: '2026-11-19',
        category: 'Office',
        title: 'Internet Bill',
        amount: 500,
        paymentMode: 'UPI',
        referenceNo: 'TXN/001',
      }).success,
      false,
    );

    assert.equal(
      PaymentSchema.safeParse({
        customerId: 'cust-1',
        customerName: 'Acme',
        productOrService: 'CRM',
        plan: 'Pro',
        amount: 1000,
        dueDate: '2026-11-19',
        transactionId: 'PAY@99',
      }).success,
      false,
    );
  });

  it('rejects special characters in split payment references', () => {
    const row = { ...newSplitRow('r1', 'UPI'), amount: '500', reference: 'UTR@123' };
    const result = validateSplit(1000, 0, [row]);
    assert.equal(result.ok, false);
    assert.equal(result.rowErrors['r1'], PAYMENT_REFERENCE_ERROR_MESSAGE);
  });
});

describe('Bank Account Form sanitization and validation', () => {
  it('sanitizes each bank field according to text-only vs numbers-only vs code rules', () => {
    assert.equal(sanitizeAlphaSpaceInput('Axis Bank123@ Ltd!'), 'Axis Bank Ltd');
    assert.equal(sanitizeAlphaSpaceInput('Yaa# Creations 24*'), 'Yaa Creations ');
    assert.equal(sanitizeDigitsOnlyInput('9180-2001A2345@678'), '918020012345678');
    assert.equal(sanitizeAlphanumericUpperInput('utib-0000@123'), 'UTIB0000123');
    assert.equal(sanitizeAlphaSpaceInput('Current123@# Savings!'), 'Current Savings');
    assert.equal(sanitizeUpiIdInput('company$@axis! '), 'company@axis');
    assert.equal(isValidUpiId('company@axis'), true);
    assert.equal(isValidUpiId('user.name_1@okicici'), true);
    assert.equal(isValidUpiId('invalid-upi'), false);
    assert.equal(isValidUpiId('company@'), false);
    assert.equal(isValidIfscOrSwift('UTIB0000123'), true);
    assert.equal(isValidIfscOrSwift('AXISINBB001'), true);
    assert.equal(isValidIfscOrSwift('AXISINBB'), true);
    assert.equal(isValidIfscOrSwift('12345678'), false);
  });

  it('accepts valid bank account details', () => {
    const res = BankAccountSchema.safeParse({
      bankName: 'Axis Bank Ltd',
      accountName: 'A'.repeat(150),
      accountNumber: '9'.repeat(50),
      ifscCode: 'utib0000123',
      accountType: 'Current',
      branchName: 'Indiranagar Bangalore',
      upiId: 'company@axis',
    });
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.ifscCode, 'UTIB0000123');
    }
  });

  it('enforces max 150 chars on Account Holder Name and max 50 chars on all other bank fields', () => {
    const overLimit = BankAccountSchema.safeParse({
      bankName: 'A'.repeat(51),
      accountName: 'B'.repeat(151),
      accountNumber: '9'.repeat(51),
      ifscCode: 'UTIB0000123',
      accountType: 'C'.repeat(51),
      branchName: 'D'.repeat(51),
      upiId: `${'u'.repeat(45)}@axis12`,
    });
    assert.equal(overLimit.success, false);
    if (!overLimit.success) {
      const fields = new Set(overLimit.error.issues.map((i) => String(i.path[0])));
      assert.ok(fields.has('bankName'));
      assert.ok(fields.has('accountName'));
      assert.ok(fields.has('accountNumber'));
      assert.ok(fields.has('accountType'));
      assert.ok(fields.has('branchName'));
      assert.ok(fields.has('upiId'));
    }

    assert.equal(
      RecordPaymentSchema.safeParse({
        amountPaid: 1000,
        paymentDate: '2026-11-19',
        paymentMode: 'Cash',
        referenceId: '1'.repeat(51),
      }).success,
      false,
    );
  });

  it('rejects numbers/special characters in text fields, letters in Account Number, and pure digits in IFSC/SWIFT', () => {
    const res = BankAccountSchema.safeParse({
      bankName: 'Axis Bank 123',
      accountName: 'Yaa Creations 99',
      accountNumber: '9180ABCD!@#',
      ifscCode: '12345678',
      accountType: 'Current123',
      branchName: 'Sector 18',
      upiId: 'invalid_upi',
    });
    assert.equal(res.success, false);
    if (!res.success) {
      const fields = new Set(res.error.issues.map((i) => String(i.path[0])));
      assert.ok(fields.has('bankName'));
      assert.ok(fields.has('accountName'));
      assert.ok(fields.has('accountNumber'));
      assert.ok(fields.has('ifscCode'));
      assert.ok(fields.has('accountType'));
      assert.ok(fields.has('branchName'));
      assert.ok(fields.has('upiId'));
    }

    const empty = BankAccountSchema.safeParse({
      bankName: '',
      accountName: '',
      accountNumber: '',
      ifscCode: '',
    });
    assert.equal(empty.success, false);
    if (!empty.success) {
      const fields = new Set(empty.error.issues.map((i) => String(i.path[0])));
      assert.ok(fields.has('bankName'));
      assert.ok(fields.has('accountName'));
      assert.ok(fields.has('accountNumber'));
      assert.ok(fields.has('ifscCode'));
    }
  });

  it('validates optional supplier bank fields when provided', () => {
    const valid = SupplierSchema.safeParse({
      name: 'Acme Suppliers',
      phone: '9876543210',
      email: 'acme@example.com',
      address: '12 Main St',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      whatsappNumber: '9876543210',
      gstNumber: '33AAAAA0000A1Z5',
      panNumber: 'AAAAA0000A',
      bankName: 'HDFC Bank',
      accountNumber: '50200012345678',
      ifscCode: 'HDFC0000123',
    });
    assert.equal(valid.success, true);

    const invalid = SupplierSchema.safeParse({
      name: 'Acme Suppliers',
      phone: '9876543210',
      email: 'acme@example.com',
      address: '12 Main St',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      whatsappNumber: '9876543210',
      gstNumber: '33AAAAA0000A1Z5',
      panNumber: 'AAAAA0000A',
      bankName: 'HDFC123!',
      accountNumber: '12345',
      ifscCode: '12345678',
    });
    assert.equal(invalid.success, false);
  });
});
