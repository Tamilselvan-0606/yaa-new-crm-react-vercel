import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCustomerOutstanding,
  calculateRepMetrics,
  isCustomerAssignedToRep,
  CalculationCustomer,
  CalculationInvoice,
  CalculationReturn,
  CalculationPayment,
} from '../src/utils/outstandingBalance.ts';

test('1. Customer with opening balance only has outstanding equal to opening balance', () => {
  const customer: CalculationCustomer = {
    id: 'cust_ramya',
    name: 'Ramya',
    openingBalance: 20000,
    creditLimit: 25000,
  };

  const metrics = calculateCustomerOutstanding(customer, [], [], []);
  assert.equal(metrics.openingBalance, 20000);
  assert.equal(metrics.outstandingAmount, 20000);
  assert.equal(metrics.totalSalesAmount, 0);
  assert.equal(metrics.totalPaidAmount, 0);
  assert.equal(metrics.availableCredit, 5000);
});

test('2. Current sample data calculates exact ₹42,000 total and individual balances', () => {
  const ramya: CalculationCustomer = {
    id: 'cust_ramya',
    customerCode: 'CUST-0004',
    name: 'Ramya',
    openingBalance: 20000,
    creditLimit: 25000,
    salesRepresentativeId: 'rep_rajesh',
    salesRepresentativeName: 'Rajesh',
  };

  const ram: CalculationCustomer = {
    id: 'cust_ram',
    customerCode: 'CUST-0002',
    name: 'Ram',
    openingBalance: 2000,
    creditLimit: 20000,
    salesRepresentativeId: 'rep_rajesh',
    salesRepresentativeName: 'Rajesh',
  };

  const kavin: CalculationCustomer = {
    id: 'cust_kavin',
    customerCode: 'CUST-0001',
    name: 'Kavin',
    openingBalance: 20000,
    creditLimit: 60000,
    salesRepresentativeId: 'rep_arun',
    salesRepresentativeName: 'Arun',
  };

  const customers = [ramya, ram, kavin];

  const mRamya = calculateCustomerOutstanding(ramya);
  const mRam = calculateCustomerOutstanding(ram);
  const mKavin = calculateCustomerOutstanding(kavin);

  assert.equal(mRamya.outstandingAmount, 20000);
  assert.equal(mRam.outstandingAmount, 2000);
  assert.equal(mKavin.outstandingAmount, 20000);

  const customerTotal = mRamya.outstandingAmount + mRam.outstandingAmount + mKavin.outstandingAmount;
  assert.equal(customerTotal, 42000);

  // Representative metrics
  const rajesh = { id: 'rep_rajesh', name: 'Rajesh' };
  const arun = { id: 'rep_arun', name: 'Arun' };
  const ravikumar = { id: 'rep_ravikumar', name: 'Ravikumar' };

  const repRajeshMetrics = calculateRepMetrics(rajesh, customers, [], [], []);
  const repArunMetrics = calculateRepMetrics(arun, customers, [], [], []);
  const repRavikumarMetrics = calculateRepMetrics(ravikumar, customers, [], [], []);

  // Acceptance criteria:
  // Rajesh = ₹22,000, Arun = ₹20,000, Ravikumar = ₹0
  assert.equal(repRajeshMetrics.totalOutstanding, 22000);
  assert.equal(repRajeshMetrics.customersCount, 2);

  assert.equal(repArunMetrics.totalOutstanding, 20000);
  assert.equal(repArunMetrics.customersCount, 1);

  assert.equal(repRavikumarMetrics.totalOutstanding, 0);
  assert.equal(repRavikumarMetrics.customersCount, 0);

  const repTotal =
    repRajeshMetrics.totalOutstanding +
    repArunMetrics.totalOutstanding +
    repRavikumarMetrics.totalOutstanding;

  assert.equal(repTotal, 42000);
  assert.equal(repTotal, customerTotal);
});

test('3. Reassigning a customer updates representative aggregation immediately', () => {
  const ramya: CalculationCustomer = {
    id: 'cust_ramya',
    name: 'Ramya',
    openingBalance: 20000,
    salesRepresentativeId: 'rep_rajesh',
    salesRepresentativeName: 'Rajesh',
  };

  // Ram is reassigned from Rajesh to Arun
  const ramReassigned: CalculationCustomer = {
    id: 'cust_ram',
    name: 'Ram',
    openingBalance: 2000,
    salesRepresentativeId: 'rep_arun',
    salesRepresentativeName: 'Arun',
  };

  const kavin: CalculationCustomer = {
    id: 'cust_kavin',
    name: 'Kavin',
    openingBalance: 20000,
    salesRepresentativeId: 'rep_arun',
    salesRepresentativeName: 'Arun',
  };

  const customers = [ramya, ramReassigned, kavin];

  const rajesh = { id: 'rep_rajesh', name: 'Rajesh' };
  const arun = { id: 'rep_arun', name: 'Arun' };

  const repRajeshMetrics = calculateRepMetrics(rajesh, customers, [], [], []);
  const repArunMetrics = calculateRepMetrics(arun, customers, [], [], []);

  // Rajesh now has only Ramya (₹20,000)
  assert.equal(repRajeshMetrics.totalOutstanding, 20000);
  assert.equal(repRajeshMetrics.customersCount, 1);

  // Arun now has Kavin (₹20,000) + Ram (₹2,000) = ₹22,000
  assert.equal(repArunMetrics.totalOutstanding, 22000);
  assert.equal(repArunMetrics.customersCount, 2);

  assert.equal(repRajeshMetrics.totalOutstanding + repArunMetrics.totalOutstanding, 42000);
});

test('4. Invoices and partial payments calculation without duplicate counting', () => {
  const customer: CalculationCustomer = {
    id: 'cust_101',
    name: 'Acme Traders',
    openingBalance: 10000,
    creditLimit: 50000,
  };

  const invoices: CalculationInvoice[] = [
    {
      id: 'inv_1',
      customerId: 'cust_101',
      grandTotal: 15000,
      paidAmount: 5000,
      balance: 10000, // unpaid balance
    },
    {
      id: 'inv_2',
      customerId: 'cust_101',
      grandTotal: 8000,
      paidAmount: 8000,
      balance: 0, // fully paid
    },
  ];

  // Payment allocated to inv_1 (already in inv_1.paidAmount)
  const payments: CalculationPayment[] = [
    {
      id: 'pay_1',
      customerId: 'cust_101',
      invoiceId: 'inv_1',
      receivedAmount: 5000,
      status: 'Completed',
    },
  ];

  const metrics = calculateCustomerOutstanding(customer, invoices, [], payments);

  // Opening balance (10,000) + unpaid invoice balance (10,000) = 20,000
  assert.equal(metrics.openingBalance, 10000);
  assert.equal(metrics.totalSalesAmount, 23000);
  assert.equal(metrics.invoiceBalanceSum, 10000);
  assert.equal(metrics.outstandingAmount, 20000);
  // Total collected = 13,000 (5,000 + 8,000)
  assert.equal(metrics.totalPaidAmount, 13000);
  // Credit limit (50,000) is NOT counted as collected money
  assert.notEqual(metrics.totalPaidAmount, 50000);
});

test('5. Credit notes decrease receivable unless cash refunded', () => {
  const customer: CalculationCustomer = {
    id: 'cust_returns',
    name: 'Retail Mart',
    openingBalance: 20000,
  };

  const returns: CalculationReturn[] = [
    {
      id: 'ret_1',
      customerId: 'cust_returns',
      returnAmount: 4000,
      refundAmount: 0,
      refundStatus: 'Store Credit', // adjusts receivable
      returnStatus: 'Approved',
    },
    {
      id: 'ret_2',
      customerId: 'cust_returns',
      returnAmount: 3000,
      refundAmount: 3000,
      refundStatus: 'Refunded', // refunded in cash, does not decrease receivable
      returnStatus: 'Approved',
    },
  ];

  const metrics = calculateCustomerOutstanding(customer, [], returns, []);
  // Outstanding = 20,000 - 4,000 = 16,000 (ret_2 was refunded in cash, so no receivable credit)
  assert.equal(metrics.outstandingAmount, 16000);
  assert.equal(metrics.netCreditReturns, 4000);
});

test('6. Unallocated payments against opening balance reduce outstanding', () => {
  const customer: CalculationCustomer = {
    id: 'cust_unallocated',
    name: 'Southern Supplies',
    openingBalance: 20000,
  };

  // Customer makes a ₹5,000 payment on account (no specific invoice)
  const payments: CalculationPayment[] = [
    {
      id: 'pay_unalloc',
      customerId: 'cust_unallocated',
      receivedAmount: 5000,
      status: 'Completed',
    },
  ];

  const metrics = calculateCustomerOutstanding(customer, [], [], payments);
  assert.equal(metrics.unallocatedPayments, 5000);
  assert.equal(metrics.outstandingAmount, 15000);
  assert.equal(metrics.totalPaidAmount, 5000);
});

test('7. Multiple branches filter scope correctly', () => {
  const custBranchA: CalculationCustomer = {
    id: 'cust_a',
    name: 'Branch A Customer',
    branchId: 'branch_a',
    openingBalance: 15000,
    salesRepresentativeId: 'rep_1',
  };

  const custBranchB: CalculationCustomer = {
    id: 'cust_b',
    name: 'Branch B Customer',
    branchId: 'branch_b',
    openingBalance: 25000,
    salesRepresentativeId: 'rep_1',
  };

  const rep = { id: 'rep_1', name: 'Representative One' };
  const allCustomers = [custBranchA, custBranchB];

  // Without branch filter
  const allMetrics = calculateRepMetrics(rep, allCustomers, [], [], []);
  assert.equal(allMetrics.totalOutstanding, 40000);
  assert.equal(allMetrics.customersCount, 2);

  // Filtered to Branch A only
  const branchAMetrics = calculateRepMetrics(rep, allCustomers, [], [], [], { branchId: 'branch_a' });
  assert.equal(branchAMetrics.totalOutstanding, 15000);
  assert.equal(branchAMetrics.customersCount, 1);

  // Filtered to Branch B only
  const branchBMetrics = calculateRepMetrics(rep, allCustomers, [], [], [], { branchId: 'branch_b' });
  assert.equal(branchBMetrics.totalOutstanding, 25000);
  assert.equal(branchBMetrics.customersCount, 1);
});

test('8. Representative assignment is strictly taken from customer record, not invoice', () => {
  const customer: CalculationCustomer = {
    id: 'cust_rep_test',
    name: 'Customer X',
    openingBalance: 10000,
    salesRepresentativeId: 'rep_new', // Customer was reassigned to rep_new
    salesRepresentativeName: 'New Rep',
  };

  // Invoice was originally created under rep_old
  const invoice: CalculationInvoice[] = [
    {
      id: 'inv_old_rep',
      customerId: 'cust_rep_test',
      grandTotal: 10000,
      paidAmount: 0,
      balance: 10000,
      salesRepresentativeId: 'rep_old', // Old rep stamped on invoice
    },
  ];

  const repOld = { id: 'rep_old', name: 'Old Rep' };
  const repNew = { id: 'rep_new', name: 'New Rep' };

  const metricsOld = calculateRepMetrics(repOld, [customer], invoice, [], []);
  const metricsNew = calculateRepMetrics(repNew, [customer], invoice, [], []);

  // rep_old should have 0 customers and 0 outstanding
  assert.equal(metricsOld.customersCount, 0);
  assert.equal(metricsOld.totalOutstanding, 0);

  // rep_new should aggregate this customer: 10,000 opening + 10,000 invoice = 20,000
  assert.equal(metricsNew.customersCount, 1);
  assert.equal(metricsNew.totalOutstanding, 20000);
  assert.equal(metricsNew.invoicesCount, 1);
});
