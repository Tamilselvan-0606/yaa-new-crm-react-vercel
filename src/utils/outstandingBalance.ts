/**
 * Authoritative financial calculation utility for CRM.
 * Provides unified, mathematically consistent calculation of:
 * - Customer outstanding balances (opening balance + unpaid invoices - credit notes - unallocated payments)
 * - Actual collected money (invoice payments + payment receipts; never creditLimit or openingBalance)
 * - Sales Representative portfolio aggregation (strictly by customer assignment, not invoice)
 * - Scope filtering (organization, sub-organization, branch, status, date-range)
 */

export interface CalculationCustomer {
  id: string;
  customerCode?: string;
  name?: string;
  company?: string | null;
  phone?: string;
  email?: string | null;
  openingBalance?: number;
  outstandingAmount?: number;
  outstandingBalance?: number;
  creditLimit?: number;
  status?: string;
  branchId?: string | null;
  subOrganizationId?: string | null;
  organizationId?: string | null;
  salesRepresentativeId?: string | null;
  salesRepresentativeName?: string | null;
  salesRepresentativeType?: string | null;
  assignedDate?: string;
  assignmentNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalculationInvoice {
  id: string;
  customerId?: string;
  customerName?: string;
  grandTotal?: number;
  paidAmount?: number;
  balance?: number;
  saleStatus?: string;
  status?: string;
  paymentStatus?: string;
  branchId?: string | null;
  subOrganizationId?: string | null;
  organizationId?: string | null;
  saleDate?: string;
  invoiceDate?: string;
  dueDate?: string;
  salesRepresentativeId?: string | null;
  salesRepresentativeName?: string | null;
}

export interface CalculationReturn {
  id: string;
  customerId?: string;
  customerName?: string;
  returnAmount?: number;
  refundAmount?: number;
  refundStatus?: 'Pending' | 'Refunded' | 'Store Credit' | 'Cancelled' | string;
  returnStatus?: 'Requested' | 'Approved' | 'Received' | 'Refunded' | 'Rejected' | 'Cancelled' | string;
  branchId?: string | null;
  subOrganizationId?: string | null;
  organizationId?: string | null;
  returnDate?: string;
}

export interface CalculationPayment {
  id: string;
  customerId?: string;
  invoiceId?: string;
  receivedAmount?: number;
  amount?: number;
  status?: 'Completed' | 'Pending' | 'Cancelled' | 'Received' | 'Cleared' | 'In Process' | string;
  paymentDate?: string;
  date?: string;
  branchId?: string | null;
  subOrganizationId?: string | null;
  organizationId?: string | null;
}

export interface FinancialFilterOptions {
  organizationId?: string;
  subOrganizationId?: string;
  branchId?: string;
  status?: string;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

export interface CustomerFinancialMetrics {
  totalSalesAmount: number;
  totalPaidAmount: number;
  invoiceBalanceSum: number;
  openingBalance: number;
  totalReturnAmount: number;
  netCreditReturns: number;
  unallocatedPayments: number;
  outstandingAmount: number;
  totalSalesCount: number;
  totalReturnsCount: number;
  creditLimit: number;
  availableCredit: number;
  creditUtilizationPercent: number;
}

export interface RepFinancialMetrics {
  repId: string;
  repName: string;
  assignedCustomers: any[];
  assignedInvoices: any[];
  customersCount: number;
  invoicesCount: number;
  totalOutstanding: number;
  totalCollected: number;
  collectionRatePercent: number;
}

/**
 * Authoritatively calculates a single customer's outstanding balance and financial metrics.
 * Follows the standard ledger equation:
 *   Current Outstanding = max(0, Opening Balance + Unpaid Invoice Balances - Net Credit Notes - Unallocated Payments)
 * 
 * Rules:
 * 1. Includes customer opening balance as part of current receivables.
 * 2. Unpaid invoice balance = invoice.balance ?? (invoice.grandTotal - invoice.paidAmount).
 * 3. Prevents duplicate payment counting: invoice.paidAmount is already reflected in invoice.balance.
 *    Only payments without invoiceId (unallocated payments on account) are subtracted from remaining dues.
 * 4. Credit notes / returns decrease receivable unless already refunded in cash to the customer.
 * 5. Collected money is derived strictly from actual payments (never credit limit or opening balance).
 */
export function calculateCustomerOutstanding(
  customer: CalculationCustomer,
  sales: CalculationInvoice[] = [],
  salesReturns: CalculationReturn[] = [],
  payments: CalculationPayment[] = [],
  options?: FinancialFilterOptions
): CustomerFinancialMetrics {
  const custId = customer.id;
  const custNameLower = (customer.name || '').trim().toLowerCase();
  const custCodeLower = (customer.customerCode || '').trim().toLowerCase();

  const matchesCustomer = (targetId?: string, targetName?: string, targetCode?: string) => {
    if (targetId && targetId === custId) return true;
    if (custId && targetId && String(targetId).toLowerCase() === String(custId).toLowerCase()) return true;
    if (custNameLower && targetName && targetName.trim().toLowerCase() === custNameLower) return true;
    if (custCodeLower && targetCode && targetCode.trim().toLowerCase() === custCodeLower) return true;
    return false;
  };

  const matchesScope = (item: { branchId?: string | null; subOrganizationId?: string | null; organizationId?: string | null }) => {
    if (options?.branchId && options.branchId !== 'ALL' && item.branchId && item.branchId !== options.branchId) return false;
    if (options?.subOrganizationId && options.subOrganizationId !== 'ALL' && item.subOrganizationId && item.subOrganizationId !== options.subOrganizationId) return false;
    if (options?.organizationId && item.organizationId && item.organizationId !== options.organizationId) return false;
    return true;
  };

  // Filter valid invoices for this customer
  const customerSales = (sales || []).filter((s) => {
    if (!matchesCustomer(s.customerId, s.customerName)) return false;
    if (s.saleStatus === 'Cancelled' || s.status === 'Cancelled' || s.status === 'Void') return false;
    if (!matchesScope(s)) return false;
    if (options?.dateRange?.startDate) {
      const d = s.saleDate || s.invoiceDate;
      if (d && d < options.dateRange.startDate) return false;
    }
    if (options?.dateRange?.endDate) {
      const d = s.saleDate || s.invoiceDate;
      if (d && d > options.dateRange.endDate) return false;
    }
    return true;
  });

  // Filter valid returns / credit notes for this customer
  const customerReturns = (salesReturns || []).filter((r) => {
    if (!matchesCustomer(r.customerId, r.customerName)) return false;
    if (r.returnStatus === 'Rejected' || r.returnStatus === 'Cancelled') return false;
    if (!matchesScope(r)) return false;
    if (options?.dateRange?.startDate) {
      const d = r.returnDate;
      if (d && d < options.dateRange.startDate) return false;
    }
    if (options?.dateRange?.endDate) {
      const d = r.returnDate;
      if (d && d > options.dateRange.endDate) return false;
    }
    return true;
  });

  // Filter valid payments for this customer
  const customerPayments = (payments || []).filter((p) => {
    if (!matchesCustomer(p.customerId)) return false;
    if (p.status === 'Cancelled' || p.status === 'Rejected') return false;
    if (!matchesScope(p)) return false;
    if (options?.dateRange?.startDate) {
      const d = p.paymentDate || p.date;
      if (d && d < options.dateRange.startDate) return false;
    }
    if (options?.dateRange?.endDate) {
      const d = p.paymentDate || p.date;
      if (d && d > options.dateRange.endDate) return false;
    }
    return true;
  });

  const openingBal = Math.max(0, Number(customer.openingBalance) || 0);

  const totalSalesAmount = customerSales.reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);
  const invoicePaidAmount = customerSales.reduce((sum, s) => sum + (Number(s.paidAmount) || 0), 0);
  const invoiceBalanceSum = customerSales.reduce((sum, s) => {
    const bal = s.balance !== undefined ? Number(s.balance) : Math.max(0, (Number(s.grandTotal) || 0) - (Number(s.paidAmount) || 0));
    return sum + bal;
  }, 0);

  const totalReturnAmount = customerReturns.reduce((sum, r) => sum + (Number(r.returnAmount) || 0), 0);
  const totalRefunded = customerReturns
    .filter((r) => r.refundStatus === 'Refunded' || r.refundStatus === 'Store Credit')
    .reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);
  const netCreditReturns = Math.max(0, totalReturnAmount - totalRefunded);

  // Unallocated payments are payments not linked to any invoice
  const unallocatedPayments = customerPayments
    .filter((p) => !p.invoiceId)
    .reduce((sum, p) => sum + (Number(p.receivedAmount ?? p.amount) || 0), 0);

  // Total collected money derived strictly from actual payments (never creditLimit or openingBalance)
  const totalPaidAmount = invoicePaidAmount + unallocatedPayments;

  // Authoritative outstanding balance
  const calculatedOutstanding = Math.max(
    0,
    openingBal + invoiceBalanceSum - netCreditReturns - unallocatedPayments
  );

  // If no transactions exist, retain explicit backend outstanding or opening balance
  const rawExplicitOutstanding = Number(customer.outstandingAmount ?? customer.outstandingBalance);
  let finalOutstanding = calculatedOutstanding;
  if (customerSales.length === 0 && customerReturns.length === 0 && customerPayments.length === 0) {
    if (!isNaN(rawExplicitOutstanding) && rawExplicitOutstanding > 0) {
      finalOutstanding = rawExplicitOutstanding;
    } else {
      finalOutstanding = openingBal;
    }
  }

  const creditLimit = Math.max(0, Number(customer.creditLimit) || 0);
  const availableCredit = Math.max(0, creditLimit - finalOutstanding);
  const creditUtilizationPercent = creditLimit > 0 ? Math.min(100, (finalOutstanding / creditLimit) * 100) : 0;

  return {
    totalSalesAmount,
    totalPaidAmount,
    invoiceBalanceSum,
    openingBalance: openingBal,
    totalReturnAmount,
    netCreditReturns,
    unallocatedPayments,
    outstandingAmount: finalOutstanding,
    totalSalesCount: customerSales.length,
    totalReturnsCount: customerReturns.length,
    creditLimit,
    availableCredit,
    creditUtilizationPercent,
  };
}

/**
 * Checks whether a customer record is assigned to a specific representative.
 * Assignment is TAKEN FROM THE CUSTOMER RECORD (Requirement 4).
 */
export function isCustomerAssignedToRep(
  customer: CalculationCustomer,
  repId: string,
  repName?: string,
  fallbackCustomerIds?: Set<string>
): boolean {
  const targetRepId = String(repId).trim().toLowerCase();
  const targetRepName = (repName || '').trim().toLowerCase();

  const cRepId = customer.salesRepresentativeId ? String(customer.salesRepresentativeId).trim().toLowerCase() : '';
  const cRepName = customer.salesRepresentativeName ? customer.salesRepresentativeName.trim().toLowerCase() : '';

  // 1. Primary: Customer record has explicit salesRepresentativeId
  if (cRepId) {
    return cRepId === targetRepId;
  }

  // 2. Secondary: Customer record has salesRepresentativeName
  if (cRepName && cRepName !== 'unassigned') {
    return targetRepName ? cRepName === targetRepName : false;
  }

  // 3. Fallback: Only if customer record has neither ID nor name, check assignment fallback
  if (fallbackCustomerIds && fallbackCustomerIds.has(customer.id)) {
    return true;
  }

  return false;
}

/**
 * Authoritatively calculates a sales representative's performance metrics by
 * aggregating the metrics of all customers assigned to that representative.
 */
export function calculateRepMetrics(
  rep: {
    id: string;
    name: string;
    mobile?: string;
    designation?: string;
    status?: string;
    totalOutstandingAmount?: number;
    totalCollectedAmount?: number;
    assignedCustomersCount?: number;
    assignedInvoicesCount?: number;
    collectionRatePercent?: number;
  },
  customers: CalculationCustomer[] = [],
  sales: CalculationInvoice[] = [],
  salesReturns: CalculationReturn[] = [],
  payments: CalculationPayment[] = [],
  options?: FinancialFilterOptions,
  apiAssignments?: any[]
): RepFinancialMetrics {
  const repId = rep.id;
  const repIdLower = String(rep.id).trim().toLowerCase();
  const repNameLower = (rep.name || '').trim().toLowerCase();
  const repMobile = (rep.mobile || '').trim();

  // Matched API assignments for fallback (only if customer record doesn't specify rep)
  const matchedApiAssignments = (apiAssignments || []).filter((a: any) => {
    const aRepId = a.salesRepresentative?.id || a.salesRepresentativeId || a.representativeId || a.salesRepId;
    const aRepName = (a.salesRepresentative?.name || a.salesRepresentativeName || a.representativeName || '').trim().toLowerCase();
    const aRepMobile = (a.salesRepresentative?.mobile || a.salesRepMobile || '').trim();
    return (
      (aRepId && String(aRepId).toLowerCase() === repIdLower) ||
      (repNameLower && aRepName === repNameLower) ||
      (repMobile && aRepMobile && aRepMobile === repMobile)
    );
  });
  const fallbackCustIds = new Set(matchedApiAssignments.map((a: any) => a.id || a.customerId).filter(Boolean));

  // Determine assigned customers: Taken from customer record (Requirement 4)
  const assignedCustomers = (customers || []).filter((c) => {
    // Respect scope filters (branch, sub-org, status)
    if (options?.branchId && options.branchId !== 'ALL' && c.branchId && c.branchId !== options.branchId) return false;
    if (options?.subOrganizationId && options.subOrganizationId !== 'ALL' && c.subOrganizationId && c.subOrganizationId !== options.subOrganizationId) return false;
    if (options?.organizationId && c.organizationId && c.organizationId !== options.organizationId) return false;
    if (options?.status && options.status !== 'ALL' && c.status && c.status.toLowerCase() !== options.status.toLowerCase()) return false;

    return isCustomerAssignedToRep(c, repId, rep.name, fallbackCustIds);
  });

  const assignedCustIds = new Set(assignedCustomers.map((c) => c.id));

  // Calculate each customer's metrics
  const assignedCustomerDetails = assignedCustomers.map((c) => {
    const metrics = calculateCustomerOutstanding(c, sales, salesReturns, payments, options);
    const custInvoices = (sales || []).filter((s) => s.customerId === c.id && s.saleStatus !== 'Cancelled');
    return {
      id: c.id,
      customerCode: c.customerCode,
      name: c.name,
      company: c.company,
      phone: c.phone,
      email: c.email,
      salesRepresentativeType: c.salesRepresentativeType || 'Primary',
      assignedDate: c.assignedDate,
      assignmentNotes: c.assignmentNotes,
      outstandingBalance: metrics.outstandingAmount,
      totalPaidAmount: metrics.totalPaidAmount,
      totalInvoicesCount: custInvoices.length,
      metrics,
    };
  });

  // Representative's invoices are invoices belonging to their ASSIGNED CUSTOMERS (Requirement 4)
  const repSales = (sales || []).filter((s) => s.customerId && assignedCustIds.has(s.customerId) && s.saleStatus !== 'Cancelled');

  const mappedInvoices = repSales.map((s) => {
    const bal = s.balance !== undefined ? Number(s.balance) : Math.max(0, (Number(s.grandTotal) || 0) - (Number(s.paidAmount) || 0));
    const paid = Number(s.paidAmount) || 0;
    const pStatus = (s as any).paymentStatus || (bal <= 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending');
    return {
      id: s.id,
      invoiceNo: (s as any).invoiceNo || (s as any).saleNo || s.id,
      customerName: s.customerName,
      invoiceDate: (s as any).invoiceDate || (s as any).saleDate || '',
      dueDate: (s as any).dueDate || (s as any).saleDate || '',
      grandTotal: Number(s.grandTotal) || 0,
      balance: bal,
      paymentStatus: pStatus as any,
    };
  });

  // Aggregate totals
  const totalOutstanding = assignedCustomerDetails.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const totalCollected = assignedCustomerDetails.reduce((sum, c) => sum + c.totalPaidAmount, 0);
  const customersCount = assignedCustomers.length;
  const invoicesCount = repSales.length;

  const collectionRatePercent =
    totalCollected + totalOutstanding > 0
      ? (totalCollected / (totalCollected + totalOutstanding)) * 100
      : 0;

  return {
    repId,
    repName: rep.name,
    assignedCustomers: assignedCustomerDetails,
    assignedInvoices: mappedInvoices,
    customersCount,
    invoicesCount,
    totalOutstanding,
    totalCollected,
    collectionRatePercent,
  };
}
