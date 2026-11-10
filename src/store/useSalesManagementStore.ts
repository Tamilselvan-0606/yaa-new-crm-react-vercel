import { useState, useEffect, useCallback } from 'react';
import { calculateCustomerOutstanding } from '../utils/outstandingBalance';

// ==========================================
// 1. DATA MODELS & INTERFACES
// ==========================================

export type SaleStatus = 'Draft' | 'Confirmed' | 'Completed' | 'Cancelled';
export type SalePaymentStatus = 'Paid' | 'Partial' | 'Unpaid' | 'Pending';

export interface SaleProductItem {
  id: string;
  productId: string;
  productName: string;
  name?: string;
  sku?: string;
  batch?: string;
  quantity: number;
  purchasePrice?: number;
  salesPrice?: number;
  unitPrice: number;
  rate?: number;
  discountPercent?: number;
  discountAmount?: number;
  discountType?: 'percent' | 'amount';
  taxPercent: number;
  total: number;
}

export interface PaymentSplitItem {
  id: string;
  method: 'Bank Transfer' | 'Cash' | 'UPI' | 'Card' | 'Cheque' | 'Credit' | 'Online Payment' | 'Other';
  amount: number;
  referenceNo?: string;
}

export interface SalePaymentRecord {
  id: string; // e.g. "PAY-000124"
  invoiceNo: string;
  paymentDate: string;
  paymentTime?: string;
  method: 'Bank Transfer' | 'Cash' | 'UPI' | 'Card' | 'Cheque' | 'Online Payment' | 'Other' | string;
  referenceNo?: string;
  amount: number;
  status: 'Paid' | 'Settled' | 'Partial' | 'Void';
  recordedBy: string;
  notes?: string;
  createdAt: string;
}

export interface SaleTransaction {
  id: string;
  invoiceNo: string;
  saleInvoiceManualNo?: string;
  invoiceStatus?: 'Draft' | 'Generated' | 'Invoiced';
  referenceNo?: string;
  saleDate: string;
  dueDate: string;
  customerId: string;
  customerCode?: string;
  customerName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  billingAddress: string;
  shippingAddress: string;
  items: SaleProductItem[];
  subtotal: number;
  withGst?: boolean;
  gstType?: 'intra_state' | 'inter_state';
  cgst?: number;
  sgst?: number;
  igst?: number;
  overallDiscount?: number;
  totalDiscount: number;
  totalTax: number;
  shippingCharges: number;
  otherCharges: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Cheque' | 'Credit' | 'Online Payment' | 'Other';
  paymentSplits?: PaymentSplitItem[];
  paymentRecords?: SalePaymentRecord[];
  paymentTerms: string;
  paymentStatus: SalePaymentStatus;
  saleStatus: SaleStatus;
  createdBy: string;
  salesperson: string;
  salesRepresentativeId?: string;
  salesRepresentativeName?: string;
  assignmentSource?: 'Customer Default' | 'Invoice-specific assignment';
  collectionStatus?: 'Pending Follow-up' | 'Contacted' | 'Promise to Pay' | 'Overdue' | 'Due Today' | 'Settled' | string;
  nextFollowUpDate?: string;
  notes?: string;
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 1.1 ESTIMATE / QUOTATION DATA MODEL
// ==========================================
export type QuotationStatus = 'Open' | 'Converted' | 'Expired' | 'Cancelled';

export interface SaleQuotation {
  id: string;
  quotationNo: string;
  estimationManualNo?: string;
  referenceNo?: string;
  date: string; // ISO format e.g. "2026-10-01"
  validUntil: string;
  customerId: string;
  customerCode?: string;
  partyName: string;
  customerCompany?: string;
  customerPhone?: string;
  customerEmail?: string;
  billingAddress: string;
  shippingAddress?: string;
  items: SaleProductItem[];
  subtotal: number;
  withGst?: boolean;
  gstType?: 'intra_state' | 'inter_state';
  cgst?: number;
  sgst?: number;
  igst?: number;
  discount?: number;
  taxAmount?: number;
  amount: number;
  balance: number;
  status: QuotationStatus;
  convertedToInvoiceNo?: string;
  convertedToType?: 'Invoice' | 'Order' | 'Proforma' | string | null;
  convertedToId?: string | null;
  convertedAt?: string | null;
  stateOfSupply?: string;
  roundOff?: number;
  attachedImageName?: string | null;
  attachedDocName?: string | null;
  notes?: string;
  terms?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 1.2 PAYMENT-IN DATA MODEL
// ==========================================
export type PaymentInType =
  | 'Cash'
  | 'Cheque'
  | 'Bank Transfer'
  | 'UPI'
  | 'Card'
  | 'Online Payment'
  | string;

export interface SalePaymentIn {
  id: string;
  receiptNo: string;
  paymentInManualNo?: string;
  date: string; // ISO date e.g. "2026-10-05"
  paymentDate?: string; // alias for date
  customerId?: string;
  partyName: string;
  customerPhone?: string;
  customerCompany?: string;
  paymentType: PaymentInType;
  paymentMethod?: string; // alias for paymentType
  receivedAmount: number;
  amount?: number; // alias for receivedAmount
  referenceNo?: string;
  description?: string;
  notes?: string; // alias for description
  imageAttachment?: string;
  firmName?: string;
  invoiceId?: string;
  invoiceNo?: string;
  salesRepresentativeId?: string;
  salesRepresentativeName?: string;
  status: 'Completed' | 'Pending' | 'Cancelled' | 'Received' | 'Cleared' | 'In Process' | string;
  createdAt: string;
  updatedAt: string;
}

export type SalesReturnStatus = 'Requested' | 'Approved' | 'Received' | 'Refunded' | 'Rejected';
export type RefundStatus = 'Pending' | 'Refunded' | 'Store Credit' | 'Cancelled';
export type ReturnReason =
  | 'Damaged'
  | 'Defective'
  | 'Wrong Product'
  | 'Wrong Quantity'
  | 'Customer Changed Mind'
  | 'Other';

export interface SalesReturnItem {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  batch?: string;
  soldQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  returnAmount: number;
  reason: ReturnReason;
  notes?: string;
  remarks?: string;
}

export interface SalesReturn {
  id: string;
  returnNo: string;
  salesReturnManualNo?: string;
  invoiceNo: string;
  saleId: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  returnDate: string;
  items: SalesReturnItem[];
  returnAmount: number;
  refundMethod: 'Bank Transfer' | 'UPI' | 'Cash' | 'Store Credit' | 'Original Payment Method';
  refundAmount: number;
  refundStatus: RefundStatus;
  returnStatus: SalesReturnStatus;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Customer
export type CustomerStatus = 'Active' | 'Inactive' | 'Blocked';
export type CustomerType = 'Individual' | 'Business';

export interface CustomerActivity {
  id: string;
  action: string;
  details: string;
  date: string;
  user?: string;
}

export interface SalesCustomer {
  id: string;
  customerCode: string;
  name: string;
  company?: string;
  customerType: CustomerType;
  phone: string;
  alternatePhone?: string;
  email: string;
  gender?: string;
  dateOfBirth?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  countryId?: string;
  stateId?: string;
  districtId?: string;
  cityId?: string;
  pincode: string;
  gstNumber?: string;
  panNumber?: string;
  billingAddress: string;
  shippingAddress: string;
  sameAsBilling?: boolean;
  creditLimit: number;
  paymentTerms: string;
  openingBalance: number;
  preferredPaymentMethod?: string;
  notes?: string;
  tags?: string[];
  status: CustomerStatus;
  totalSales?: number;
  paidAmount?: number;
  paidAmountDate?: string | null;
  paymentDuePeriod?: string | null;
  lastPaymentDate?: string | null;
  outstandingAmount?: number;
  salesRepresentativeId?: string;
  salesRepresentativeName?: string;
  salesRepresentativeType?: 'Primary' | 'Temporary';
  assignedDate?: string;
  assignmentNotes?: string;
  activities?: CustomerActivity[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 1.3 SALES REPRESENTATIVE DATA MODEL
// ==========================================
export type SalesRepresentativeStatus = 'Active' | 'Inactive';

export interface SalesRepresentative {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  designation?: string;
  status: SalesRepresentativeStatus;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 1.4 COLLECTION MANAGEMENT & FOLLOW-UP DATA MODELS
// ==========================================
export type FollowUpOutcome =
  | 'Customer Contacted'
  | 'No Response'
  | 'Promise to Pay'
  | 'Payment Received'
  | 'Dispute Raised'
  | 'Follow-up Required';

export type ContactMethod = 'Phone' | 'WhatsApp' | 'Email' | 'In-Person Visit';

export interface CollectionFollowUp {
  id: string;
  customerId: string;
  customerName?: string;
  invoiceId?: string;
  invoiceNo?: string;
  invoiceNumber?: string; // alias for invoiceNo
  salesRepresentativeId?: string;
  salesRepresentativeName?: string;
  contactMethod?: ContactMethod;
  followUpDate: string;
  followUpTime?: string;
  notes: string;
  outcome: FollowUpOutcome;
  hasPromiseToPay?: boolean;
  promisedAmount?: number;
  promiseDate?: string;
  nextFollowUpDate?: string;
  createdBy: string;
  createdAt: string;
}

export type PromiseToPayStatus = 'Pending' | 'Honoured' | 'Broken';

export interface PromiseToPay {
  id: string;
  customerId: string;
  customerName?: string;
  invoiceId: string;
  invoiceNo: string;
  invoiceNumber?: string; // alias for invoiceNo
  salesRepresentativeId?: string;
  salesRepresentativeName?: string;
  promisedAmount: number;
  promiseDate: string;
  notes?: string;
  status: PromiseToPayStatus;
  createdAt: string;
  updatedAt: string;
}

// Supplier
export type SupplierStatus = 'Active' | 'Inactive' | 'Blocked';

export interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  whatsappNumber?: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  countryId?: string;
  stateId?: string;
  districtId?: string;
  cityId?: string;
  /** Display name of the saved district (the location pickers work by name). */
  district?: string;
  pincode: string;
  gstNumber?: string;
  panNumber?: string;
  paymentTerms: string;
  creditLimit: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  totalPurchase: number;
  paid: number;
  payable: number;
  status: SupplierStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Purchase Request
export type PurchaseRequestPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type PurchaseRequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'
  | 'Purchase Created'
  | 'Completed';

export interface PurchaseRequestItem {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  requestedQuantity: number;
  estimatedUnitPrice?: number;
  requiredDate: string;
  remarks?: string;
}

export interface PurchaseRequest {
  id: string;
  requestNo: string;
  requestDate: string;
  requestedBy: string;
  department: string;
  requiredDate: string;
  priority: PurchaseRequestPriority;
  status: PurchaseRequestStatus;
  items: PurchaseRequestItem[];
  supplierId?: string;
  supplierName?: string;
  supplierCode?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  notes?: string;
  organizationId?: string;
  totalEstimatedAmount?: number;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdPurchaseId?: string;
  createdAt: string;
  updatedAt: string;
}

// Purchase Order / Purchase Transaction
export type PurchaseStatus =
  | 'Pending'
  | 'Approved'
  | 'Draft'
  | 'Ordered'
  | 'Received'
  | 'Completed'
  | 'Cancelled';
export type PurchasePaymentStatus = 'Paid' | 'Partial' | 'Unpaid' | 'Pending';

export interface StockBatch {
  id: string;
  batchNo: string;
  productId: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  mfgDate?: string;
  expDate?: string;
  supplierName?: string;
  status: 'Active' | 'Near Expiry' | 'Expired' | 'Depleted';
  receivedDate?: string;
}

export interface PurchaseProductItem {
  id: string;
  productId: string;
  productName: string;
  batch?: string;
  mfgDate?: string;
  expDate?: string;
  quantity: number;
  freeQuantity?: number;
  unit?: string;
  packingUnit?: number | string;
  purchasePrice: number;
  salePrice?: number;
  discountPercent: number;
  discountAmount?: number;
  taxPercent: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  purchaseNo: string;
  poNo?: string;
  purchaseInvoiceNo?: string;
  supplierId: string;
  supplierName: string;
  supplierCode?: string;
  purchaseDate: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  dueDate: string;
  items: PurchaseProductItem[];
  subtotal: number;
  subTotal?: number;
  discount: number;
  discountAmount?: number;
  tax: number;
  taxAmount?: number;
  withGst?: boolean;
  gstType?: 'intra_state' | 'inter_state';
  cgst?: number;
  sgst?: number;
  igst?: number;
  shipping: number;
  otherCharges: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Credit' | 'Other';
  paymentTerms: string;
  paymentStatus: PurchasePaymentStatus;
  hasManualPayment?: boolean;
  purchaseStatus: PurchaseStatus;
  status?: string;
  stockReceived?: boolean;
  originalBillAmount?: number;
  totalPurchaseReturnAmount?: number;
  totalReturned?: number;
  netPayableAmount?: number;
  netPayable?: number;
  totalPaidAmount?: number;
  totalPaid?: number;
  creditAdjustedAmount?: number;
  outstandingBalance?: number;
  outstandingAmount?: number;
  supplierCreditAmount?: number;
  supplierCredit?: number;
  supplierCreditGeneratedAmount?: number;
  creditRefundedAmount?: number;
  refundedAmount?: number;
  creditSettledAmount?: number;
  remainingSupplierCredit?: number;
  refundStatus?: string;
  notes?: string;
  createdBy?: string;
  organizationId?: string;
  supplier?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// Purchase Return
export type PurchaseReturnStatus =
  | 'Requested'
  | 'Approved'
  | 'Dispatched'
  | 'Completed'
  | 'Returned'
  | 'Rejected'
  | 'Cancelled';

export interface PurchaseReturnItem {
  id: string;
  productId: string;
  productName: string;
  batch?: string;
  purchasedQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  returnAmount: number;
  reason: 'Damaged' | 'Defective' | 'Wrong Product' | 'Excess Quantity' | 'Quality Issue' | 'Other';
  remarks?: string;
}

export interface PurchaseReturn {
  id: string;
  returnNo: string;
  purchaseNo: string;
  purchaseId: string;
  supplierId: string;
  supplierName: string;
  returnDate: string;
  items: PurchaseReturnItem[];
  returnAmount: number;
  refundStatus: 'Pending' | 'Refunded' | 'Supplier Credit' | 'Adjusted';
  returnStatus: PurchaseReturnStatus;
  notes?: string;
  organizationId?: string;
  stockDeducted?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Payment Out (Payments made to Suppliers / Vendors)
export type PaymentOutMode = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Cheque' | 'Net Banking' | 'Other';

export interface PaymentOut {
  id: string;
  paymentNo: string;
  paymentDate: string;
  supplierId: string;
  supplierName: string;
  supplierCode?: string;
  purchaseId?: string;
  purchaseNo?: string;
  amount: number;
  paymentMode: PaymentOutMode;
  referenceNo?: string;
  receiptImage?: string;
  notes?: string;
  status: 'Completed' | 'Pending' | 'Failed' | 'Cancelled' | string;
  organizationId?: string;
  paymentType?: string;
  createdBy?: string;
  supplier?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// Inventory Stock Model
export interface InventoryStockItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  subcategory?: string;
  unit: string;
  inStock: number;
  reorderLevel: number;
  unitCost: number;
  unitPrice: number;
  lastUpdated: string;
  createdAt?: string;
  batches?: StockBatch[];
  isBatchTracking?: boolean;
  batchNo?: string;
  initialBatchNo?: string;
  mfgDate?: string;
  expDate?: string;
  itemImage?: string;
}

// ==========================================
// 2. INITIAL SEED DATA
// ==========================================

export const INITIAL_INVENTORY_STOCKS: InventoryStockItem[] = [];

export const INITIAL_SALES_REPRESENTATIVES: SalesRepresentative[] = [];

export const INITIAL_COLLECTION_FOLLOW_UPS: CollectionFollowUp[] = [];

export const INITIAL_PROMISES_TO_PAY: PromiseToPay[] = [];


export const INITIAL_CUSTOMERS: SalesCustomer[] = [];

export const INITIAL_SUPPLIERS: Supplier[] = [];

export const INITIAL_SALES: SaleTransaction[] = [];

export const INITIAL_SALES_RETURNS: SalesReturn[] = [];

export const INITIAL_PURCHASE_REQUESTS: PurchaseRequest[] = [];

export const INITIAL_PURCHASES: PurchaseOrder[] = [];

export const INITIAL_PURCHASE_RETURNS: PurchaseReturn[] = [];

export const INITIAL_QUOTATIONS: SaleQuotation[] = [];

export const INITIAL_PAYMENTS_OUT: PaymentOut[] = [];

// ==========================================
// 3. STORAGE KEYS & REACTIVE STORE
// ==========================================

const KEYS = {
  SALES: 'yaa_crm_sales_transactions',
  SALES_RETURNS: 'yaa_crm_sales_returns',
  CUSTOMERS: 'yaa_crm_sales_customers',
  SUPPLIERS: 'yaa_crm_suppliers',
  PURCHASE_REQUESTS: 'yaa_crm_purchase_requests',
  PURCHASES: 'yaa_crm_purchase_orders',
  PURCHASE_RETURNS: 'yaa_crm_purchase_returns',
  PAYMENTS_OUT: 'yaa_crm_payments_out',
  STOCKS: 'yaa_crm_inventory_stocks',
  QUOTATIONS: 'yaa_crm_sale_quotations',
  PAYMENT_INS: 'yaa_crm_sale_payment_ins',
  SALES_REPRESENTATIVES: 'yaa_crm_sales_representatives',
  COLLECTION_FOLLOW_UPS: 'yaa_crm_collection_follow_ups',
  PROMISES_TO_PAY: 'yaa_crm_promises_to_pay',
};

const INITIAL_PAYMENT_INS: SalePaymentIn[] = [];

/**
 * Shared session memory for every component that calls useSalesManagementStore().
 * Nothing in it is read from or written to the browser's storage: after a reload every list starts empty and is
 * filled again only by API responses. (It used to live in localStorage, which is how old or deleted records kept
 * reappearing on screen.) The "storage updated" event is kept so components still refresh each other.
 */
const memory = new Map<string, unknown>();
const clone = <T,>(value: T): T => {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
};

function getStorage<T>(key: string, initial: T): T {
  return memory.has(key) ? clone(memory.get(key) as T) : initial;
}

function setStorage<T>(key: string, data: T) {
  memory.set(key, clone(data));
  window.dispatchEvent(new Event('sales_management_storage_updated'));
}

export const useSalesManagementStore = () => {
  const [sales, setSales] = useState<SaleTransaction[]>(() =>
    getStorage(KEYS.SALES, INITIAL_SALES)
  );
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>(() =>
    getStorage(KEYS.SALES_RETURNS, INITIAL_SALES_RETURNS)
  );
  const [customers, setCustomers] = useState<SalesCustomer[]>(() =>
    getStorage(KEYS.CUSTOMERS, INITIAL_CUSTOMERS)
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    getStorage(KEYS.SUPPLIERS, INITIAL_SUPPLIERS)
  );
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>(() =>
    getStorage(KEYS.PURCHASE_REQUESTS, INITIAL_PURCHASE_REQUESTS)
  );
  const [purchases, setPurchases] = useState<PurchaseOrder[]>(() =>
    getStorage(KEYS.PURCHASES, INITIAL_PURCHASES)
  );
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>(() =>
    getStorage(KEYS.PURCHASE_RETURNS, INITIAL_PURCHASE_RETURNS)
  );
  const [paymentOuts, setPaymentOuts] = useState<PaymentOut[]>(() =>
    getStorage(KEYS.PAYMENTS_OUT, INITIAL_PAYMENTS_OUT)
  );
  const [stocks, setStocks] = useState<InventoryStockItem[]>(() =>
    getStorage(KEYS.STOCKS, INITIAL_INVENTORY_STOCKS)
  );
  const [quotations, setQuotations] = useState<SaleQuotation[]>(() =>
    getStorage(KEYS.QUOTATIONS, INITIAL_QUOTATIONS)
  );
  const [paymentIns, setPaymentIns] = useState<SalePaymentIn[]>(() =>
    getStorage(KEYS.PAYMENT_INS, INITIAL_PAYMENT_INS)
  );
  const [salesRepresentatives, setSalesRepresentatives] = useState<SalesRepresentative[]>(() =>
    getStorage(KEYS.SALES_REPRESENTATIVES, INITIAL_SALES_REPRESENTATIVES)
  );
  const [collectionFollowUps, setCollectionFollowUps] = useState<CollectionFollowUp[]>(() =>
    getStorage(KEYS.COLLECTION_FOLLOW_UPS, INITIAL_COLLECTION_FOLLOW_UPS)
  );
  const [promisesToPay, setPromisesToPay] = useState<PromiseToPay[]>(() =>
    getStorage(KEYS.PROMISES_TO_PAY, INITIAL_PROMISES_TO_PAY)
  );

  const reloadAll = () => {
    setSales(getStorage(KEYS.SALES, INITIAL_SALES));
    setSalesReturns(getStorage(KEYS.SALES_RETURNS, INITIAL_SALES_RETURNS));
    setCustomers(getStorage(KEYS.CUSTOMERS, INITIAL_CUSTOMERS));
    setSuppliers(getStorage(KEYS.SUPPLIERS, INITIAL_SUPPLIERS));
    setPurchaseRequests(getStorage(KEYS.PURCHASE_REQUESTS, INITIAL_PURCHASE_REQUESTS));
    setPurchases(getStorage(KEYS.PURCHASES, INITIAL_PURCHASES));
    setPurchaseReturns(getStorage(KEYS.PURCHASE_RETURNS, INITIAL_PURCHASE_RETURNS));
    setPaymentOuts(getStorage(KEYS.PAYMENTS_OUT, INITIAL_PAYMENTS_OUT));
    setStocks(getStorage(KEYS.STOCKS, INITIAL_INVENTORY_STOCKS));
    setQuotations(getStorage(KEYS.QUOTATIONS, INITIAL_QUOTATIONS));
    setPaymentIns(getStorage(KEYS.PAYMENT_INS, INITIAL_PAYMENT_INS));
    setSalesRepresentatives(getStorage(KEYS.SALES_REPRESENTATIVES, INITIAL_SALES_REPRESENTATIVES));
    setCollectionFollowUps(getStorage(KEYS.COLLECTION_FOLLOW_UPS, INITIAL_COLLECTION_FOLLOW_UPS));
    setPromisesToPay(getStorage(KEYS.PROMISES_TO_PAY, INITIAL_PROMISES_TO_PAY));
  };

  useEffect(() => {
    const handleUpdate = () => {
      reloadAll();
    };
    window.addEventListener('sales_management_storage_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('sales_management_storage_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // ----------------------------------------
  // Customer Actions & Real-time Metrics
  // ----------------------------------------
  const getCustomerMetrics = (customerId: string) => {
    const currentCustomers = getStorage<SalesCustomer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    const customer = currentCustomers.find((c) => c.id === customerId);
    if (!customer) {
      return {
        totalSalesAmount: 0,
        totalPaidAmount: 0,
        outstandingAmount: 0,
        totalSalesCount: 0,
        totalReturnsCount: 0,
        totalReturnAmount: 0,
        creditLimit: 0,
        availableCredit: 0,
        creditUtilizationPercent: 0,
        openingBalance: 0,
      };
    }
    const metrics = calculateCustomerOutstanding(customer, sales as any, salesReturns as any, paymentIns as any);
    return {
      totalSalesAmount: metrics.totalSalesAmount,
      totalPaidAmount: metrics.totalPaidAmount,
      outstandingAmount: metrics.outstandingAmount,
      totalSalesCount: metrics.totalSalesCount,
      totalReturnsCount: metrics.totalReturnsCount,
      totalReturnAmount: metrics.totalReturnAmount,
      creditLimit: metrics.creditLimit,
      availableCredit: metrics.availableCredit,
      creditUtilizationPercent: metrics.creditUtilizationPercent,
      openingBalance: metrics.openingBalance,
    };
  };

  const saveCustomer = (customer: SalesCustomer) => {
    const current = getStorage<SalesCustomer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    const exists = current.find((c) => c.id === customer.id);
    let updated: SalesCustomer[];

    if (exists) {
      const updatedCust = {
        ...customer,
        updatedAt: new Date().toISOString(),
      };
      updated = current.map((c) => (c.id === customer.id ? updatedCust : c));
    } else {
      const newCust: SalesCustomer = {
        ...customer,
        activities: [
          ...(customer.activities || []),
          {
            id: `act_${Date.now()}`,
            action: 'Customer Created',
            details: `Customer registered in CRM with opening balance ₹${(customer.openingBalance || 0).toLocaleString()}`,
            date: new Date().toISOString(),
            user: 'Current User',
          },
        ],
        createdAt: customer.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updated = [newCust, ...current];
    }
    setStorage(KEYS.CUSTOMERS, updated);
    setCustomers(updated);
    return updated;
  };

  const deleteCustomer = (id: string) => {
    const current = getStorage<SalesCustomer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    const updated = current.filter((c) => c.id !== id);
    setStorage(KEYS.CUSTOMERS, updated);
    setCustomers(updated);
    return updated;
  };

  const updateCustomerStatus = (id: string, status: CustomerStatus) => {
    const current = getStorage<SalesCustomer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    const updated = current.map((c) => {
      if (c.id === id) {
        const activities = [
          ...(c.activities || []),
          {
            id: `act_${Date.now()}`,
            action: 'Status Updated',
            details: `Customer status changed from ${c.status} to ${status}`,
            date: new Date().toISOString(),
            user: 'Current User',
          },
        ];
        return { ...c, status, activities, updatedAt: new Date().toISOString() };
      }
      return c;
    });
    setStorage(KEYS.CUSTOMERS, updated);
    setCustomers(updated);
    return updated;
  };

  const setCustomersList = useCallback((newCustomers: SalesCustomer[]) => {
    // Preserve existing salesRepresentative fields if newCustomers from API didn't include them
    const currentCustomers = getStorage<SalesCustomer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    const customerMap = new Map<string, SalesCustomer>();
    currentCustomers.forEach((c) => customerMap.set(c.id, c));

    const merged = newCustomers.map((newC) => {
      const existing = customerMap.get(newC.id);
      if (!existing) return newC;
      return {
        ...newC,
        salesRepresentativeId: newC.salesRepresentativeId || existing.salesRepresentativeId,
        salesRepresentativeName: newC.salesRepresentativeName || existing.salesRepresentativeName,
        salesRepresentativeType: newC.salesRepresentativeType || existing.salesRepresentativeType,
        assignedDate: newC.assignedDate || existing.assignedDate,
        assignmentNotes: newC.assignmentNotes || existing.assignmentNotes,
      };
    });

    setStorage(KEYS.CUSTOMERS, merged);
    setCustomers(merged);
    return merged;
  }, []);

  const addCustomerActivity = (customerId: string, action: string, details: string, user: string = 'Current User') => {
    const current = getStorage<SalesCustomer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    const updated = current.map((c) => {
      if (c.id === customerId) {
        const activities = [
          ...(c.activities || []),
          {
            id: `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            action,
            details,
            date: new Date().toISOString(),
            user,
          },
        ];
        return { ...c, activities, updatedAt: new Date().toISOString() };
      }
      return c;
    });
    setStorage(KEYS.CUSTOMERS, updated);
    setCustomers(updated);
  };

  // ----------------------------------------
  // Stock Adjustment Utility with Batch Support
  // ----------------------------------------
  const adjustStock = (
    productId: string,
    quantityDelta: number,
    batchNo?: string,
    batchMeta?: {
      costPrice?: number;
      sellingPrice?: number;
      mfgDate?: string;
      expDate?: string;
      supplierName?: string;
      productName?: string;
      sku?: string;
      category?: string;
      subcategory?: string;
      unit?: string;
    }
  ) => {
    const currentStocks = getStorage<InventoryStockItem[]>(KEYS.STOCKS, INITIAL_INVENTORY_STOCKS);
    let found = false;

    // Determine clean batch identifier - ensure active batch is never blank when inwarding
    const cleanBatch = (batchNo && batchNo.trim() && batchNo.trim() !== 'SELECT BATCH')
      ? batchNo.trim()
      : (quantityDelta > 0 ? `BAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}` : '');

    let updated = currentStocks.map((item) => {
      if (item.productId === productId || item.id === productId || (batchMeta?.sku && item.sku === batchMeta.sku)) {
        found = true;
        let batches = [...(item.batches || [])];

        if (cleanBatch) {
          const bIdx = batches.findIndex((b) => b.batchNo.toLowerCase() === cleanBatch.toLowerCase());
          if (bIdx >= 0) {
            const currentQty = batches[bIdx].quantity;
            const newQty = Math.max(0, currentQty + quantityDelta);
            batches[bIdx] = {
              ...batches[bIdx],
              quantity: newQty,
              status: newQty === 0 ? 'Depleted' : 'Active',
              costPrice: batchMeta?.costPrice ?? batches[bIdx].costPrice,
              sellingPrice: batchMeta?.sellingPrice ?? batches[bIdx].sellingPrice,
              expDate: batchMeta?.expDate ?? batches[bIdx].expDate,
              mfgDate: batchMeta?.mfgDate ?? batches[bIdx].mfgDate,
            };
          } else if (quantityDelta < 0 && batches.length > 0) {
            // Target batch not found, fallback to FIFO deduction across available batches
            let rem = Math.abs(quantityDelta);
            batches = batches.map((b) => {
              if (rem <= 0 || b.quantity <= 0) return b;
              const deduct = Math.min(b.quantity, rem);
              rem -= deduct;
              const newQty = b.quantity - deduct;
              return {
                ...b,
                quantity: newQty,
                status: newQty === 0 ? 'Depleted' : b.status,
              };
            });
          } else if (quantityDelta > 0) {
            batches.push({
              id: `bat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              batchNo: cleanBatch,
              productId: item.productId,
              quantity: quantityDelta,
              costPrice: batchMeta?.costPrice ?? item.unitCost,
              sellingPrice: batchMeta?.sellingPrice ?? item.unitPrice,
              mfgDate: batchMeta?.mfgDate,
              expDate: batchMeta?.expDate,
              supplierName: batchMeta?.supplierName,
              status: 'Active',
              receivedDate: new Date().toISOString().split('T')[0],
            });
          }
        } else {
          // FIFO-like deduction if no specific batch provided
          if (quantityDelta < 0 && batches.length > 0) {
            let rem = Math.abs(quantityDelta);
            batches = batches.map((b) => {
              if (rem <= 0 || b.quantity <= 0) return b;
              const deduct = Math.min(b.quantity, rem);
              rem -= deduct;
              const newQty = b.quantity - deduct;
              return {
                ...b,
                quantity: newQty,
                status: newQty === 0 ? 'Depleted' : b.status,
              };
            });
          } else if (quantityDelta > 0 && batches.length > 0) {
            batches[batches.length - 1] = {
              ...batches[batches.length - 1],
              quantity: batches[batches.length - 1].quantity + quantityDelta,
            };
          }
        }

        const totalBatchQty = batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
        const newInStock = batches.length > 0 ? totalBatchQty : Math.max(0, item.inStock + quantityDelta);

        return {
          ...item,
          inStock: newInStock,
          batches,
          lastUpdated: new Date().toISOString(),
        };
      }
      return item;
    });

    // If item was not yet in currentStocks (e.g. newly created catalog item) and inwarding stock, register it
    if (!found && quantityDelta > 0) {
      const fallbackBatch: StockBatch = {
        id: `bat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        batchNo: cleanBatch || `BAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`,
        productId,
        quantity: quantityDelta,
        costPrice: batchMeta?.costPrice ?? 0,
        sellingPrice: batchMeta?.sellingPrice ?? 0,
        mfgDate: batchMeta?.mfgDate,
        expDate: batchMeta?.expDate,
        supplierName: batchMeta?.supplierName,
        status: 'Active',
        receivedDate: new Date().toISOString().split('T')[0],
      };

      const newItem: InventoryStockItem = {
        id: productId,
        productId,
        productName: batchMeta?.productName || 'Product',
        sku: batchMeta?.sku || '',
        category: batchMeta?.category || 'General',
        subcategory: batchMeta?.subcategory || 'General',
        unit: batchMeta?.unit || 'KG',
        inStock: quantityDelta,
        reorderLevel: 10,
        unitCost: batchMeta?.costPrice ?? 0,
        unitPrice: batchMeta?.sellingPrice ?? 0,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        batches: [fallbackBatch],
      };
      updated = [newItem, ...updated];
    }

    setStorage(KEYS.STOCKS, updated);
    setStocks(updated);
  };

  const addStockBatch = (productId: string, newBatch: Omit<StockBatch, 'id'>) => {
    const currentStocks = getStorage<InventoryStockItem[]>(KEYS.STOCKS, INITIAL_INVENTORY_STOCKS);
    const updated = currentStocks.map((item) => {
      if (item.productId === productId || item.id === productId) {
        const batches = [...(item.batches || [])];
        const existingIdx = batches.findIndex(
          (b) => b.batchNo.toLowerCase() === newBatch.batchNo.trim().toLowerCase()
        );
        if (existingIdx >= 0) {
          batches[existingIdx] = {
            ...batches[existingIdx],
            quantity: batches[existingIdx].quantity + newBatch.quantity,
            costPrice: newBatch.costPrice || batches[existingIdx].costPrice,
            sellingPrice: newBatch.sellingPrice || batches[existingIdx].sellingPrice,
            expDate: newBatch.expDate || batches[existingIdx].expDate,
            mfgDate: newBatch.mfgDate || batches[existingIdx].mfgDate,
            status: 'Active',
          };
        } else {
          batches.push({
            ...newBatch,
            id: `bat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            batchNo: newBatch.batchNo.trim(),
            productId: item.productId,
            status: newBatch.status || 'Active',
            receivedDate: newBatch.receivedDate || new Date().toISOString().split('T')[0],
          });
        }
        const totalBatchQty = batches.reduce((sum, b) => sum + b.quantity, 0);
        return {
          ...item,
          inStock: totalBatchQty,
          batches,
          lastUpdated: new Date().toISOString(),
        };
      }
      return item;
    });
    setStorage(KEYS.STOCKS, updated);
    setStocks(updated);
  };

  const updateStockItem = (item: InventoryStockItem) => {
    const currentStocks = getStorage<InventoryStockItem[]>(KEYS.STOCKS, INITIAL_INVENTORY_STOCKS);
    const updated = currentStocks.map((s) =>
      s.id === item.id || s.productId === item.productId
        ? { ...item, lastUpdated: new Date().toISOString() }
        : s
    );
    setStorage(KEYS.STOCKS, updated);
    setStocks(updated);
    return updated;
  };

  // ----------------------------------------
  // Sales Actions
  // ----------------------------------------
  const saveSale = (saleInput: SaleTransaction) => {
    const current = getStorage<SaleTransaction[]>(KEYS.SALES, INITIAL_SALES);
    const exists = current.find((s) => s.id === saleInput.id);

    // Invoices always reflect the sales representative assigned to the customer
    let sale = { ...saleInput };
    const cust = customers.find(
      (c) => c.id === sale.customerId || c.name.toLowerCase() === sale.customerName?.toLowerCase()
    );

    if (cust?.salesRepresentativeId) {
      sale.salesRepresentativeId = cust.salesRepresentativeId;
      sale.salesRepresentativeName = cust.salesRepresentativeName;
      sale.assignmentSource = 'Customer Default';
    }

    let updated: SaleTransaction[];
    if (exists) {
      if (exists.saleStatus !== 'Completed' && sale.saleStatus === 'Completed') {
        sale.items.forEach((item) => adjustStock(item.productId, -item.quantity, item.batch));
      }
      updated = current.map((s) => (s.id === sale.id ? sale : s));
    } else {
      if (sale.saleStatus === 'Completed') {
        sale.items.forEach((item) => adjustStock(item.productId, -item.quantity, item.batch));
      }
      updated = [sale, ...current];
      if (sale.customerId) {
        addCustomerActivity(
          sale.customerId,
          'Sale Created',
          `Invoice ${sale.invoiceNo} issued for ₹${sale.grandTotal.toLocaleString()}`,
          sale.salesperson || 'Sales Rep'
        );
      }
    }
    setStorage(KEYS.SALES, updated);
    setSales(updated);
    return updated;
  };

  const deleteSale = (id: string) => {
    const current = getStorage<SaleTransaction[]>(KEYS.SALES, INITIAL_SALES);
    const updated = current.filter((s) => s.id !== id);
    setStorage(KEYS.SALES, updated);
    setSales(updated);
    return updated;
  };

  const updateSalePayment = (
    saleId: string,
    paidAmount: number,
    paymentMethod: any,
    notes?: string,
    splits?: PaymentSplitItem[],
    records?: SalePaymentRecord[]
  ) => {
    const current = getStorage<SaleTransaction[]>(KEYS.SALES, INITIAL_SALES);
    let affectedCustomerId = '';
    let invNo = '';
    const updated = current.map((s) => {
      if (s.id === saleId) {
        affectedCustomerId = s.customerId;
        invNo = s.invoiceNo;
        const newPaid = Math.min(s.grandTotal, (s.paidAmount || 0) + paidAmount);
        const newBalance = Math.max(0, s.grandTotal - newPaid);
        const newPaymentStatus: SalePaymentStatus =
          newBalance <= 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';
        const existingSplits = s.paymentSplits || [];
        const updatedSplits = splits && splits.length > 0 ? [...existingSplits, ...splits] : existingSplits;
        const existingRecords = s.paymentRecords || [];
        const updatedRecords = records && records.length > 0 ? [...existingRecords, ...records] : existingRecords;
        return {
          ...s,
          paidAmount: newPaid,
          balance: newBalance,
          paymentStatus: newPaymentStatus,
          paymentMethod: paymentMethod || s.paymentMethod,
          paymentSplits: updatedSplits.length > 0 ? updatedSplits : s.paymentSplits,
          paymentRecords: updatedRecords.length > 0 ? updatedRecords : s.paymentRecords,
          notes: notes ? `${s.notes ? s.notes + '\n' : ''}${notes}` : s.notes,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    setStorage(KEYS.SALES, updated);
    setSales(updated);

    if (affectedCustomerId) {
      addCustomerActivity(
        affectedCustomerId,
        'Payment Received',
        `Payment of ₹${paidAmount.toLocaleString()} received for invoice ${invNo} via ${paymentMethod || 'Payment'}`,
        'Accounts'
      );
    }

    return updated;
  };

  // ----------------------------------------
  // Sales Return Actions
  // ----------------------------------------
  const saveSalesReturn = (salesReturn: SalesReturn) => {
    const current = getStorage<SalesReturn[]>(KEYS.SALES_RETURNS, INITIAL_SALES_RETURNS);
    const exists = current.find((r) => r.id === salesReturn.id);
    let updated: SalesReturn[];
    if (exists) {
      if (exists.returnStatus !== 'Refunded' && salesReturn.returnStatus === 'Refunded') {
        salesReturn.items.forEach((item) => adjustStock(item.productId, item.returnQuantity, item.batch));
      }
      updated = current.map((r) => (r.id === salesReturn.id ? salesReturn : r));
    } else {
      if (salesReturn.returnStatus === 'Refunded' || salesReturn.returnStatus === 'Received') {
        salesReturn.items.forEach((item) => adjustStock(item.productId, item.returnQuantity, item.batch));
      }
      updated = [salesReturn, ...current];
      if (salesReturn.customerId) {
        addCustomerActivity(
          salesReturn.customerId,
          'Sales Return Created',
          `Return ${salesReturn.returnNo} created for invoice ${salesReturn.invoiceNo} (Amount: ₹${salesReturn.returnAmount.toLocaleString()})`,
          'Support'
        );
      }
    }
    setStorage(KEYS.SALES_RETURNS, updated);
    setSalesReturns(updated);
    return updated;
  };

  const updateSalesReturnStatus = (id: string, status: SalesReturnStatus, rejectionReason?: string) => {
    const current = getStorage<SalesReturn[]>(KEYS.SALES_RETURNS, INITIAL_SALES_RETURNS);
    const target = current.find((r) => r.id === id);
    if (!target) return current;

    if (target.returnStatus !== 'Refunded' && status === 'Refunded') {
      target.items.forEach((item) => adjustStock(item.productId, item.returnQuantity, item.batch));
    }

    const updated = current.map((r) =>
      r.id === id
        ? {
            ...r,
            returnStatus: status,
            refundStatus: status === 'Refunded' ? ('Refunded' as const) : r.refundStatus,
            rejectionReason: rejectionReason || r.rejectionReason,
            updatedAt: new Date().toISOString(),
          }
        : r
    );
    setStorage(KEYS.SALES_RETURNS, updated);
    setSalesReturns(updated);

    if (target.customerId) {
      addCustomerActivity(
        target.customerId,
        'Return Status Updated',
        `Sales Return ${target.returnNo} updated to status ${status}`,
        'Support'
      );
    }

    return updated;
  };

  const setSalesReturnsList = (list: SalesReturn[]) => {
    setStorage(KEYS.SALES_RETURNS, list);
    setSalesReturns(list);
  };

  const deleteSalesReturn = (id: string) => {
    const current = getStorage<SalesReturn[]>(KEYS.SALES_RETURNS, INITIAL_SALES_RETURNS);
    const updated = current.filter((r) => r.id !== id);
    setStorage(KEYS.SALES_RETURNS, updated);
    setSalesReturns(updated);
    return updated;
  };

  // ----------------------------------------
  // Supplier Actions
  // ----------------------------------------
  const saveSupplier = (supplier: Supplier) => {
    const current = getStorage<Supplier[]>(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    const exists = current.find((s) => s.id === supplier.id);
    let updated: Supplier[];
    if (exists) {
      updated = current.map((s) => (s.id === supplier.id ? supplier : s));
    } else {
      updated = [supplier, ...current];
    }
    setStorage(KEYS.SUPPLIERS, updated);
    setSuppliers(updated);
    return updated;
  };

  const deleteSupplier = (id: string) => {
    const current = getStorage<Supplier[]>(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    const updated = current.filter((s) => s.id !== id);
    setStorage(KEYS.SUPPLIERS, updated);
    setSuppliers(updated);
    return updated;
  };

  const setSuppliersList = useCallback((list: Supplier[]) => {
    setStorage(KEYS.SUPPLIERS, list);
    setSuppliers(list);
    return list;
  }, []);

  // ----------------------------------------
  // Purchase Request Actions
  // ----------------------------------------
  const setPurchaseRequestsList = useCallback((list: PurchaseRequest[]) => {
    setStorage(KEYS.PURCHASE_REQUESTS, list);
    setPurchaseRequests(list);
    return list;
  }, []);

  const savePurchaseRequest = (pr: PurchaseRequest) => {
    const current = getStorage<PurchaseRequest[]>(KEYS.PURCHASE_REQUESTS, INITIAL_PURCHASE_REQUESTS);
    const exists = current.find((p) => p.id === pr.id);
    let updated: PurchaseRequest[];
    if (exists) {
      updated = current.map((p) => (p.id === pr.id ? pr : p));
    } else {
      updated = [pr, ...current];
    }
    setStorage(KEYS.PURCHASE_REQUESTS, updated);
    setPurchaseRequests(updated);
    return updated;
  };

  const updatePurchaseRequestStatus = (
    id: string,
    status: PurchaseRequestStatus,
    rejectionReason?: string,
    approvedBy?: string
  ) => {
    const current = getStorage<PurchaseRequest[]>(KEYS.PURCHASE_REQUESTS, INITIAL_PURCHASE_REQUESTS);
    const updated = current.map((pr) =>
      pr.id === id
        ? {
            ...pr,
            status,
            rejectionReason: rejectionReason || pr.rejectionReason,
            approvedBy: status === 'Approved' ? approvedBy || 'Admin' : pr.approvedBy,
            approvedAt: status === 'Approved' ? new Date().toISOString() : pr.approvedAt,
            updatedAt: new Date().toISOString(),
          }
        : pr
    );
    setStorage(KEYS.PURCHASE_REQUESTS, updated);
    setPurchaseRequests(updated);
    return updated;
  };

  const deletePurchaseRequest = (id: string) => {
    const current = getStorage<PurchaseRequest[]>(KEYS.PURCHASE_REQUESTS, INITIAL_PURCHASE_REQUESTS);
    const updated = current.filter((pr) => pr.id !== id);
    setStorage(KEYS.PURCHASE_REQUESTS, updated);
    setPurchaseRequests(updated);
    return updated;
  };

  // ----------------------------------------
  // Purchase Actions
  // ----------------------------------------
  const setPurchasesList = useCallback((list: PurchaseOrder[]) => {
    setStorage(KEYS.PURCHASES, list);
    setPurchases(list);
    return list;
  }, []);

  const savePurchase = (po: PurchaseOrder) => {
    const current = getStorage<PurchaseOrder[]>(KEYS.PURCHASES, INITIAL_PURCHASES);
    const exists = current.find((p) => p.id === po.id);
    let updated: PurchaseOrder[];

    const isInwardStatus = (status?: string) =>
      status === 'Completed' || status === 'Received';

    const wasAlreadyInwarded = exists && ((exists as any).stockInwarded || isInwardStatus(exists.purchaseStatus));
    const shouldInward = isInwardStatus(po.purchaseStatus) && !wasAlreadyInwarded;

    if (shouldInward) {
      po.items.forEach((item) => {
        const cleanBatch = (item.batch && item.batch.trim() && item.batch !== 'SELECT BATCH')
          ? item.batch.trim()
          : ((item as any).batchNo || `BAT-${po.purchaseNo || 'PO'}`);

        adjustStock(item.productId, item.quantity, cleanBatch, {
          costPrice: item.purchasePrice,
          sellingPrice: (item as any).sellingPrice,
          mfgDate: item.mfgDate,
          expDate: item.expDate,
          supplierName: po.supplierName,
          productName: item.productName,
          sku: (item as any).sku,
          unit: item.unit,
        });
      });
      (po as any).stockInwarded = true;
    }

    if (exists) {
      updated = current.map((p) => (p.id === po.id ? { ...po, stockInwarded: (po as any).stockInwarded ?? wasAlreadyInwarded } : p));
    } else {
      updated = [po, ...current];
    }

    // Update supplier total purchase & payables
    const currentSuppliers = getStorage<Supplier[]>(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    const updatedSuppliers = currentSuppliers.map((s) => {
      if (s.id === po.supplierId) {
        return {
          ...s,
          totalPurchase: (s.totalPurchase || 0) + (exists ? 0 : po.grandTotal),
          payable: Math.max(0, (s.payable || 0) + (exists ? 0 : po.balance)),
          paid: (s.paid || 0) + (exists ? 0 : po.paidAmount),
        };
      }
      return s;
    });
    setStorage(KEYS.SUPPLIERS, updatedSuppliers);
    setSuppliers(updatedSuppliers);

    setStorage(KEYS.PURCHASES, updated);
    setPurchases(updated);
    return updated;
  };

  const updatePurchasePayment = (
    purchaseId: string,
    paidAmount: number,
    paymentMethod: any,
    notes?: string
  ) => {
    const current = getStorage<PurchaseOrder[]>(KEYS.PURCHASES, INITIAL_PURCHASES);
    let targetSupplierId = '';
    const updated = current.map((p) => {
      if (p.id === purchaseId) {
        targetSupplierId = p.supplierId;
        const newPaid = Math.min(p.grandTotal, (p.paidAmount || 0) + paidAmount);
        const newBalance = Math.max(0, p.grandTotal - newPaid);
        const newPaymentStatus: PurchasePaymentStatus =
          newBalance <= 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';
        return {
          ...p,
          paidAmount: newPaid,
          balance: newBalance,
          paymentStatus: newPaymentStatus,
          paymentMethod: paymentMethod || p.paymentMethod,
          notes: notes ? `${p.notes ? p.notes + '\n' : ''}${notes}` : p.notes,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    if (targetSupplierId) {
      const currentSuppliers = getStorage<Supplier[]>(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
      const updatedSuppliers = currentSuppliers.map((s) => {
        if (s.id === targetSupplierId) {
          return {
            ...s,
            paid: (s.paid || 0) + paidAmount,
            payable: Math.max(0, (s.payable || 0) - paidAmount),
          };
        }
        return s;
      });
      setStorage(KEYS.SUPPLIERS, updatedSuppliers);
      setSuppliers(updatedSuppliers);
    }

    setStorage(KEYS.PURCHASES, updated);
    setPurchases(updated);
    return updated;
  };

  const deletePurchase = (id: string) => {
    const current = getStorage<PurchaseOrder[]>(KEYS.PURCHASES, INITIAL_PURCHASES);
    const updated = current.filter((p) => p.id !== id);
    setStorage(KEYS.PURCHASES, updated);
    setPurchases(updated);
    return updated;
  };

  const updatePurchaseOrderStatus = (id: string, purchaseStatus: PurchaseStatus) => {
    const current = getStorage<PurchaseOrder[]>(KEYS.PURCHASES, INITIAL_PURCHASES);
    const updated = current.map((p) =>
      p.id === id || p.purchaseNo === id
        ? { ...p, purchaseStatus, updatedAt: new Date().toISOString() }
        : p
    );
    setStorage(KEYS.PURCHASES, updated);
    setPurchases(updated);
    return updated;
  };

  // ----------------------------------------
  // Purchase Return Actions
  // ----------------------------------------
  const setPurchaseReturnsList = useCallback((list: PurchaseReturn[]) => {
    setStorage(KEYS.PURCHASE_RETURNS, list);
    setPurchaseReturns(list);
    return list;
  }, []);

  const savePurchaseReturn = (pret: PurchaseReturn) => {
    const current = getStorage<PurchaseReturn[]>(KEYS.PURCHASE_RETURNS, INITIAL_PURCHASE_RETURNS);
    const exists = current.find((r) => r.id === pret.id);
    let updated: PurchaseReturn[];
    const isEnacted = (status?: string) =>
      status === 'Completed' || status === 'Returned' || status === 'Dispatched';

    if (exists) {
      if (!isEnacted(exists.returnStatus) && isEnacted(pret.returnStatus)) {
        pret.items.forEach((item) =>
          adjustStock(item.productId, -Math.abs(item.returnQuantity), item.batch || (item as any).batchNo)
        );
      }
      updated = current.map((r) => (r.id === pret.id ? pret : r));
    } else {
      if (isEnacted(pret.returnStatus)) {
        pret.items.forEach((item) =>
          adjustStock(item.productId, -Math.abs(item.returnQuantity), item.batch || (item as any).batchNo)
        );
      }
      updated = [pret, ...current];
    }
    setStorage(KEYS.PURCHASE_RETURNS, updated);
    setPurchaseReturns(updated);
    return updated;
  };

  const deletePurchaseReturn = (id: string) => {
    const current = getStorage<PurchaseReturn[]>(KEYS.PURCHASE_RETURNS, INITIAL_PURCHASE_RETURNS);
    const updated = current.filter((r) => r.id !== id);
    setStorage(KEYS.PURCHASE_RETURNS, updated);
    setPurchaseReturns(updated);
    return updated;
  };

  // ----------------------------------------
  // Quotation / Estimate Actions
  // ----------------------------------------
  const setSalesList = useCallback((newSales: SaleTransaction[]) => {
    setStorage(KEYS.SALES, newSales);
    setSales(newSales);
    return newSales;
  }, []);

  const setQuotationsList = useCallback((newQuotations: SaleQuotation[]) => {
    setStorage(KEYS.QUOTATIONS, newQuotations);
    setQuotations(newQuotations);
    return newQuotations;
  }, []);

  const setStocksList = useCallback((newStocks: InventoryStockItem[]) => {
    setStorage(KEYS.STOCKS, newStocks);
    setStocks(newStocks);
    return newStocks;
  }, []);

  const saveQuotation = (quotation: SaleQuotation) => {
    const current = getStorage<SaleQuotation[]>(KEYS.QUOTATIONS, INITIAL_QUOTATIONS);
    const exists = current.find((q) => q.id === quotation.id);
    let updated: SaleQuotation[];
    if (exists) {
      const updatedQuot: SaleQuotation = {
        ...quotation,
        updatedAt: new Date().toISOString(),
      };
      updated = current.map((q) => (q.id === quotation.id ? updatedQuot : q));
    } else {
      const newQuot: SaleQuotation = {
        ...quotation,
        createdAt: quotation.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updated = [newQuot, ...current];
    }
    setStorage(KEYS.QUOTATIONS, updated);
    setQuotations(updated);
    return updated;
  };

  const deleteQuotation = (id: string) => {
    const current = getStorage<SaleQuotation[]>(KEYS.QUOTATIONS, INITIAL_QUOTATIONS);
    const updated = current.filter((q) => q.id !== id);
    setStorage(KEYS.QUOTATIONS, updated);
    setQuotations(updated);
    return updated;
  };

  const updateQuotationStatus = (id: string, status: QuotationStatus) => {
    const current = getStorage<SaleQuotation[]>(KEYS.QUOTATIONS, INITIAL_QUOTATIONS);
    const updated = current.map((q) =>
      q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q
    );
    setStorage(KEYS.QUOTATIONS, updated);
    setQuotations(updated);
    return updated;
  };

  const convertQuotationToSale = (id: string): SaleTransaction | null => {
    const currentQuotations = getStorage<SaleQuotation[]>(KEYS.QUOTATIONS, INITIAL_QUOTATIONS);
    const target = currentQuotations.find((q) => q.id === id);
    if (!target) return null;

    const currentSales = getStorage<SaleTransaction[]>(KEYS.SALES, INITIAL_SALES);
    const nextInvoiceNum = currentSales.length + 101;
    const newInvoiceNo = ''; // the server assigns the invoice number

    const newSale: SaleTransaction = {
      id: `sale_${Date.now()}`,
      invoiceNo: newInvoiceNo,
      referenceNo: target.referenceNo || target.quotationNo,
      saleDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      customerId: target.customerId,
      customerName: target.partyName,
      customerCompany: target.customerCompany,
      customerPhone: target.customerPhone,
      customerEmail: target.customerEmail,
      billingAddress: target.billingAddress,
      shippingAddress: target.shippingAddress || target.billingAddress,
      items: target.items,
      subtotal: target.subtotal,
      withGst: target.withGst,
      gstType: target.gstType,
      cgst: target.cgst,
      sgst: target.sgst,
      igst: target.igst,
      totalDiscount: target.discount || 0,
      totalTax: target.taxAmount || 0,
      shippingCharges: 0,
      otherCharges: 0,
      grandTotal: target.amount,
      paidAmount: 0,
      balance: target.amount,
      paymentMethod: 'Cash',
      paymentTerms: '15 Days',
      paymentStatus: 'Unpaid',
      saleStatus: 'Confirmed',
      createdBy: 'Current User',
      salesperson: 'Sales Rep',
      notes: `Converted from Quotation ${target.quotationNo}. ${target.notes || ''}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Deduct stock
    target.items.forEach((item) => adjustStock(item.productId, -item.quantity));

    // Save Sale
    const updatedSales = [newSale, ...currentSales];
    setStorage(KEYS.SALES, updatedSales);
    setSales(updatedSales);

    // Mark Quotation as Converted
    const updatedQuotations = currentQuotations.map((q) =>
      q.id === id
        ? {
            ...q,
            status: 'Converted' as QuotationStatus,
            convertedToInvoiceNo: newInvoiceNo,
            updatedAt: new Date().toISOString(),
          }
        : q
    );
    setStorage(KEYS.QUOTATIONS, updatedQuotations);
    setQuotations(updatedQuotations);

    return newSale;
  };

  // ----------------------------------------
  // Payment Out Actions
  // ----------------------------------------
  const setPaymentOutsList = useCallback((list: PaymentOut[]) => {
    const current = getStorage<PaymentOut[]>(KEYS.PAYMENTS_OUT, INITIAL_PAYMENTS_OUT);
    const apiIds = new Set(list.map((p) => p.id));

    // Enrich API records with any local purchaseId / purchaseNo / receiptImage metadata
    const enrichedApiList = list.map((apiItem) => {
      const localMatch = current.find(
        (c) =>
          c.id === apiItem.id ||
          (c.purchaseNo &&
            (apiItem.referenceNo === c.purchaseNo ||
              apiItem.notes?.includes(c.purchaseNo)) &&
            Math.abs(Number(c.amount || 0) - Number(apiItem.amount || 0)) < 0.01)
      );
      if (!localMatch) return apiItem;
      return {
        ...apiItem,
        purchaseId: apiItem.purchaseId || localMatch.purchaseId,
        purchaseNo: apiItem.purchaseNo || localMatch.purchaseNo,
        receiptImage: apiItem.receiptImage || localMatch.receiptImage,
        supplierName:
          apiItem.supplierName && apiItem.supplierName !== 'Unknown Supplier'
            ? apiItem.supplierName
            : localMatch.supplierName,
      };
    });

    // Retain local purchase-bill vouchers (e.g. po_pm_*) that haven't been synced to an API voucher yet
    const unsyncedLocal = current.filter((c) => {
      if (apiIds.has(c.id)) return false;
      if (!String(c.id).startsWith('po_pm_')) return false;
      const alreadyInApi = enrichedApiList.some(
        (apiItem) =>
          (c.purchaseNo &&
            (apiItem.purchaseNo === c.purchaseNo ||
              apiItem.referenceNo === c.purchaseNo ||
              apiItem.notes?.includes(c.purchaseNo))) &&
          Math.abs(Number(apiItem.amount || 0) - Number(c.amount || 0)) < 0.01
      );
      return !alreadyInApi;
    });

    const merged = [...enrichedApiList, ...unsyncedLocal];
    setStorage(KEYS.PAYMENTS_OUT, merged);
    setPaymentOuts(merged);
    return merged;
  }, []);

  const savePaymentOut = (po: PaymentOut) => {
    const current = getStorage<PaymentOut[]>(KEYS.PAYMENTS_OUT, INITIAL_PAYMENTS_OUT);
    const exists = current.find((p) => p.id === po.id);
    let updated: PaymentOut[];
    if (exists) {
      updated = current.map((p) => (p.id === po.id ? { ...po, updatedAt: new Date().toISOString() } : p));
    } else {
      updated = [{ ...po, createdAt: po.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }, ...current];
    }
    setStorage(KEYS.PAYMENTS_OUT, updated);
    setPaymentOuts(updated);

    // If linked to a purchase bill, update its paid balance
    if (po.purchaseId && po.amount > 0) {
      updatePurchasePayment(po.purchaseId, po.amount, po.paymentMode, po.notes);
    } else if (po.supplierId && po.amount > 0) {
      // Direct supplier ledger balance adjustment
      const currentSuppliers = getStorage<Supplier[]>(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
      const updatedSuppliers = currentSuppliers.map((s) => {
        if (s.id === po.supplierId) {
          return {
            ...s,
            paid: (s.paid || 0) + po.amount,
            payable: Math.max(0, (s.payable || 0) - po.amount),
          };
        }
        return s;
      });
      setStorage(KEYS.SUPPLIERS, updatedSuppliers);
      setSuppliers(updatedSuppliers);
    }

    return updated;
  };

  const deletePaymentOut = (id: string) => {
    const current = getStorage<PaymentOut[]>(KEYS.PAYMENTS_OUT, INITIAL_PAYMENTS_OUT);
    const updated = current.filter((p) => p.id !== id);
    setStorage(KEYS.PAYMENTS_OUT, updated);
    setPaymentOuts(updated);
    return updated;
  };

  // ----------------------------------------
  // Payment-In Actions
  // ----------------------------------------
  const savePaymentIn = (paymentIn: SalePaymentIn) => {
    const current = getStorage<SalePaymentIn[]>(KEYS.PAYMENT_INS, INITIAL_PAYMENT_INS);
    const existsIndex = current.findIndex((p) => p.id === paymentIn.id);
    let updated: SalePaymentIn[];

    if (existsIndex >= 0) {
      const oldItem = current[existsIndex];
      const diffAmount = paymentIn.receivedAmount - oldItem.receivedAmount;

      const updatedRecord: SalePaymentIn = {
        ...paymentIn,
        updatedAt: new Date().toISOString(),
      };
      updated = [...current];
      updated[existsIndex] = updatedRecord;

      // Adjust customer balance if amount changed
      if (diffAmount !== 0 && paymentIn.customerId) {
        const currentCustomers = getStorage<SalesCustomer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
        const updatedCustomers = currentCustomers.map((c) => {
          if (c.id === paymentIn.customerId) {
            const newPaid = (c.paidAmount || 0) + diffAmount;
            const newOutstanding = Math.max(0, (c.outstandingAmount || 0) - diffAmount);
            return {
              ...c,
              paidAmount: newPaid,
              outstandingAmount: newOutstanding,
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        });
        setStorage(KEYS.CUSTOMERS, updatedCustomers);
        setCustomers(updatedCustomers);
      }
    } else {
      const newRecord: SalePaymentIn = {
        ...paymentIn,
        createdAt: paymentIn.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updated = [newRecord, ...current];

      // Update customer balance & add activity
      if (paymentIn.customerId) {
        const currentCustomers = getStorage<SalesCustomer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
        const updatedCustomers = currentCustomers.map((c) => {
          if (c.id === paymentIn.customerId) {
            const newPaid = (c.paidAmount || 0) + paymentIn.receivedAmount;
            const newOutstanding = Math.max(0, (c.outstandingAmount || 0) - paymentIn.receivedAmount);
            const activities = [
              ...(c.activities || []),
              {
                id: `act_${Date.now()}`,
                action: 'Payment-In Received',
                details: `Payment of ₹${paymentIn.receivedAmount.toLocaleString()} received via ${paymentIn.paymentType} (Receipt #${paymentIn.receiptNo})`,
                date: new Date().toISOString(),
                user: 'Current User',
              },
            ];
            return {
              ...c,
              paidAmount: newPaid,
              outstandingAmount: newOutstanding,
              activities,
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        });
        setStorage(KEYS.CUSTOMERS, updatedCustomers);
        setCustomers(updatedCustomers);
      }
    }

    setStorage(KEYS.PAYMENT_INS, updated);
    setPaymentIns(updated);
    return updated;
  };

  const deletePaymentIn = (id: string) => {
    const current = getStorage<SalePaymentIn[]>(KEYS.PAYMENT_INS, INITIAL_PAYMENT_INS);
    const target = current.find((p) => p.id === id);
    if (target && target.customerId) {
      // Revert customer balance
      const currentCustomers = getStorage<SalesCustomer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
      const updatedCustomers = currentCustomers.map((c) => {
        if (c.id === target.customerId) {
          return {
            ...c,
            paidAmount: Math.max(0, (c.paidAmount || 0) - target.receivedAmount),
            outstandingAmount: (c.outstandingAmount || 0) + target.receivedAmount,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });
      setStorage(KEYS.CUSTOMERS, updatedCustomers);
      setCustomers(updatedCustomers);
    }

    const updated = current.filter((p) => p.id !== id);
    setStorage(KEYS.PAYMENT_INS, updated);
    setPaymentIns(updated);
    return updated;
  };

  const updatePaymentIn = (id: string, updates: Partial<SalePaymentIn>) => {
    const current = getStorage<SalePaymentIn[]>(KEYS.PAYMENT_INS, INITIAL_PAYMENT_INS);
    const updated = current.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    );
    setStorage(KEYS.PAYMENT_INS, updated);
    setPaymentIns(updated);
    return updated;
  };

  const setPaymentInsList = (list: SalePaymentIn[]) => {
    setStorage(KEYS.PAYMENT_INS, list);
    setPaymentIns(list);
  };

  // ----------------------------------------
  // Sales Representative Actions
  // ----------------------------------------
  const saveSalesRepresentative = (rep: Partial<SalesRepresentative> & { name: string; mobile: string; status: SalesRepresentativeStatus }) => {
    const current = getStorage<SalesRepresentative[]>(KEYS.SALES_REPRESENTATIVES, INITIAL_SALES_REPRESENTATIVES);
    const exists = rep.id ? current.find((r) => r.id === rep.id) : null;
    let updated: SalesRepresentative[];
    let savedRecord: SalesRepresentative;

    if (exists) {
      savedRecord = {
        ...exists,
        ...rep,
        updatedAt: new Date().toISOString(),
      };
      updated = current.map((r) => (r.id === rep.id ? savedRecord : r));

      // If rep name updated, synchronize assigned customers
      if (rep.name && rep.name !== exists.name) {
        const currentCustomers = getStorage<SalesCustomer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
        const updatedCustomers = currentCustomers.map((c) =>
          c.salesRepresentativeId === rep.id ? { ...c, salesRepresentativeName: rep.name, updatedAt: new Date().toISOString() } : c
        );
        setStorage(KEYS.CUSTOMERS, updatedCustomers);
        setCustomers(updatedCustomers);
      }
    } else {
      savedRecord = {
        id: rep.id || `rep_${Date.now()}`,
        name: rep.name,
        mobile: rep.mobile,
        email: rep.email || '',
        status: rep.status,
        createdAt: rep.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updated = [savedRecord, ...current];
    }
    setStorage(KEYS.SALES_REPRESENTATIVES, updated);
    setSalesRepresentatives(updated);
    return savedRecord;
  };

  const deleteSalesRepresentative = (id: string) => {
    const current = getStorage<SalesRepresentative[]>(KEYS.SALES_REPRESENTATIVES, INITIAL_SALES_REPRESENTATIVES);
    const updated = current.filter((r) => r.id !== id);
    setStorage(KEYS.SALES_REPRESENTATIVES, updated);
    setSalesRepresentatives(updated);

    // Unassign customers from this rep
    const currentCustomers = getStorage<SalesCustomer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    const updatedCustomers = currentCustomers.map((c) =>
      c.salesRepresentativeId === id
        ? { ...c, salesRepresentativeId: undefined, salesRepresentativeName: undefined, updatedAt: new Date().toISOString() }
        : c
    );
    setStorage(KEYS.CUSTOMERS, updatedCustomers);
    setCustomers(updatedCustomers);

    // Unassign invoices from this rep
    const currentSales = getStorage<SaleTransaction[]>(KEYS.SALES, INITIAL_SALES);
    const updatedSales = currentSales.map((s) =>
      s.salesRepresentativeId === id
        ? { ...s, salesRepresentativeId: undefined, salesRepresentativeName: undefined, updatedAt: new Date().toISOString() }
        : s
    );
    setStorage(KEYS.SALES, updatedSales);
    setSales(updatedSales);

    return updated;
  };

  const setSalesRepresentativesList = useCallback((reps: SalesRepresentative[]) => {
    setStorage(KEYS.SALES_REPRESENTATIVES, reps);
    setSalesRepresentatives(reps);
  }, []);

  const assignCustomerSalesRep = (
    customerId: string,
    repId: string,
    assignmentType: 'Primary' | 'Temporary' = 'Primary',
    effectiveFrom?: string,
    notes?: string,
    repNameInput?: string
  ) => {
    const storedReps = getStorage<SalesRepresentative[]>(KEYS.SALES_REPRESENTATIVES, []);
    const rep = salesRepresentatives.find((r) => r.id === repId) || storedReps.find((r) => r.id === repId);
    const repName = repNameInput || rep?.name || 'Unassigned';
    const effectiveDate = effectiveFrom || new Date().toISOString().split('T')[0];

    // 1. Update Customer
    const currentCustomers = getStorage<SalesCustomer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    const updatedCustomers = currentCustomers.map((c) => {
      if (c.id === customerId) {
        const activities = [
          ...(c.activities || []),
          {
            id: `act_${Date.now()}`,
            action: 'Sales Rep Assigned',
            details: `Assigned to ${repName} (${assignmentType} Rep, Effective from ${effectiveDate}). ${notes || ''}`.trim(),
            date: new Date().toISOString(),
            user: 'Admin',
          },
        ];
        return {
          ...c,
          salesRepresentativeId: repId,
          salesRepresentativeName: repName,
          salesRepresentativeType: assignmentType,
          assignedDate: effectiveDate,
          assignmentNotes: notes,
          activities,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });
    setStorage(KEYS.CUSTOMERS, updatedCustomers);
    setCustomers(updatedCustomers);

    // 2. Cascade assignment to all invoices for this customer
    const currentSales = getStorage<SaleTransaction[]>(KEYS.SALES, INITIAL_SALES);
    const updatedSales = currentSales.map((s) => {
      if (s.customerId === customerId) {
        return {
          ...s,
          salesRepresentativeId: repId,
          salesRepresentativeName: repName,
          assignmentSource: 'Customer Default' as const,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    setStorage(KEYS.SALES, updatedSales);
    setSales(updatedSales);
  };

  const assignInvoiceSalesRep = (
    invoiceId: string,
    repId: string,
    collectionStatus?: string,
    nextFollowUpDate?: string
  ) => {
    // Sales rep is assigned against the customer, not against the invoice.
    // Locate the customer for this invoice and assign the sales rep to the customer.
    const currentSales = getStorage<SaleTransaction[]>(KEYS.SALES, INITIAL_SALES);
    const targetSale = currentSales.find((s) => s.id === invoiceId);
    if (targetSale?.customerId) {
      assignCustomerSalesRep(targetSale.customerId, repId);
    }

    if (collectionStatus || nextFollowUpDate !== undefined) {
      const refreshedSales = getStorage<SaleTransaction[]>(KEYS.SALES, INITIAL_SALES);
      const updatedSales = refreshedSales.map((s) => {
        if (s.id === invoiceId) {
          return {
            ...s,
            collectionStatus: collectionStatus || s.collectionStatus,
            nextFollowUpDate: nextFollowUpDate !== undefined ? nextFollowUpDate : s.nextFollowUpDate,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });
      setStorage(KEYS.SALES, updatedSales);
      setSales(updatedSales);
    }
  };

  // ----------------------------------------
  // Collection Follow-Up & Timeline Actions
  // ----------------------------------------
  const addCollectionFollowUp = (
    followUp: Omit<CollectionFollowUp, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ) => {
    const current = getStorage<CollectionFollowUp[]>(KEYS.COLLECTION_FOLLOW_UPS, INITIAL_COLLECTION_FOLLOW_UPS);
    const newFollowUp: CollectionFollowUp = {
      ...followUp,
      id: followUp.id || `fup_${Date.now()}`,
      createdAt: followUp.createdAt || new Date().toISOString(),
    };
    const updated = [newFollowUp, ...current];
    setStorage(KEYS.COLLECTION_FOLLOW_UPS, updated);
    setCollectionFollowUps(updated);

    // Add customer activity
    if (followUp.customerId) {
      addCustomerActivity(
        followUp.customerId,
        `Follow-up: ${followUp.outcome}`,
        followUp.notes || `Collection follow-up recorded by ${followUp.createdBy}`,
        followUp.createdBy || 'Collections'
      );
    }

    return newFollowUp;
  };

  const deleteCollectionFollowUp = (id: string) => {
    const current = getStorage<CollectionFollowUp[]>(KEYS.COLLECTION_FOLLOW_UPS, INITIAL_COLLECTION_FOLLOW_UPS);
    const updated = current.filter((f) => f.id !== id);
    setStorage(KEYS.COLLECTION_FOLLOW_UPS, updated);
    setCollectionFollowUps(updated);
    return updated;
  };

  // ----------------------------------------
  // Promise to Pay Actions
  // ----------------------------------------
  const savePromiseToPay = (
    ptp: Omit<PromiseToPay, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string }
  ) => {
    const current = getStorage<PromiseToPay[]>(KEYS.PROMISES_TO_PAY, INITIAL_PROMISES_TO_PAY);
    const exists = ptp.id ? current.find((p) => p.id === ptp.id) : null;
    let updated: PromiseToPay[];
    let savedRecord: PromiseToPay;

    if (exists) {
      savedRecord = {
        ...exists,
        ...ptp,
        updatedAt: new Date().toISOString(),
      };
      updated = current.map((p) => (p.id === ptp.id ? savedRecord : p));
    } else {
      savedRecord = {
        ...ptp,
        id: ptp.id || `ptp_${Date.now()}`,
        status: ptp.status || 'Pending',
        createdAt: ptp.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updated = [savedRecord, ...current];
    }

    setStorage(KEYS.PROMISES_TO_PAY, updated);
    setPromisesToPay(updated);

    // Also record a follow-up timeline entry
    addCollectionFollowUp({
      customerId: ptp.customerId,
      customerName: ptp.customerName,
      invoiceId: ptp.invoiceId,
      invoiceNo: ptp.invoiceNo,
      salesRepresentativeId: ptp.salesRepresentativeId,
      salesRepresentativeName: ptp.salesRepresentativeName,
      followUpDate: new Date().toISOString().split('T')[0],
      followUpTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: `Promise to Pay recorded: ₹${ptp.promisedAmount.toLocaleString()} on ${ptp.promiseDate}. ${ptp.notes || ''}`.trim(),
      outcome: 'Promise to Pay',
      nextFollowUpDate: ptp.promiseDate,
      createdBy: ptp.salesRepresentativeName || 'Sales Representative',
    });

    return savedRecord;
  };

  const updatePromiseToPayStatus = (id: string, status: PromiseToPayStatus) => {
    const current = getStorage<PromiseToPay[]>(KEYS.PROMISES_TO_PAY, INITIAL_PROMISES_TO_PAY);
    const updated = current.map((p) =>
      p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p
    );
    setStorage(KEYS.PROMISES_TO_PAY, updated);
    setPromisesToPay(updated);
    return updated;
  };

  // ----------------------------------------
  // Seamless Record Payment Against Collection Invoice
  // ----------------------------------------
  const recordCollectionPayment = (params: {
    invoiceId: string;
    invoiceNo?: string;
    customerId?: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNo?: string;
    notes?: string;
    recordedBy?: string;
    salesRepresentativeId?: string;
    salesRepresentativeName?: string;
  }) => {
    const sale = sales.find((s) => s.id === params.invoiceId || s.invoiceNo === params.invoiceNo);
    const invoiceId = params.invoiceId || sale?.id || '';
    const invoiceNo = params.invoiceNo || sale?.invoiceNo || '';
    const customerId = params.customerId || sale?.customerId || '';
    const {
      amount,
      paymentDate,
      paymentMethod,
      referenceNo,
      notes,
      recordedBy = 'Accounts Desk',
      salesRepresentativeId = sale?.salesRepresentativeId,
      salesRepresentativeName = sale?.salesRepresentativeName,
    } = params;

    const customer = customers.find((c) => c.id === customerId);
    const newReceiptNo = ''; // the server assigns the receipt number

    // 1. Create Payment-In
    const newPaymentIn: SalePaymentIn = {
      id: `payin_${Date.now()}`,
      receiptNo: newReceiptNo,
      date: paymentDate || new Date().toISOString().split('T')[0],
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      customerId,
      partyName: customer?.name || 'Customer',
      customerPhone: customer?.phone,
      customerCompany: customer?.company,
      paymentType: paymentMethod,
      paymentMethod,
      receivedAmount: amount,
      amount,
      referenceNo,
      description: notes || `Collection payment received for invoice ${invoiceNo}`,
      notes: notes || `Collection payment received for invoice ${invoiceNo}`,
      invoiceId,
      invoiceNo,
      salesRepresentativeId,
      salesRepresentativeName,
      status: 'Completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const currentPaymentIns = getStorage<SalePaymentIn[]>(KEYS.PAYMENT_INS, INITIAL_PAYMENT_INS);
    const updatedPaymentIns = [newPaymentIn, ...currentPaymentIns];
    setStorage(KEYS.PAYMENT_INS, updatedPaymentIns);
    setPaymentIns(updatedPaymentIns);

    // 2. Update Sale invoice
    const currentSales = getStorage<SaleTransaction[]>(KEYS.SALES, INITIAL_SALES);
    const updatedSales = currentSales.map((s) => {
      if (s.id === invoiceId || s.invoiceNo === invoiceNo) {
        const newPaid = (s.paidAmount || 0) + amount;
        const newBalance = Math.max(0, (s.grandTotal || 0) - newPaid);
        const newStatus: SalePaymentStatus =
          newBalance <= 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';

        const paymentRecord: SalePaymentRecord = {
          id: `local_pay_${Date.now()}`,
          invoiceNo: s.invoiceNo,
          paymentDate: paymentDate || new Date().toISOString().split('T')[0],
          method: paymentMethod,
          referenceNo,
          amount,
          status: 'Paid',
          recordedBy,
          notes,
          createdAt: new Date().toISOString(),
        };

        return {
          ...s,
          paidAmount: newPaid,
          balance: newBalance,
          paymentStatus: newStatus,
          paymentRecords: [paymentRecord, ...(s.paymentRecords || [])],
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    setStorage(KEYS.SALES, updatedSales);
    setSales(updatedSales);

    // 3. Update Customer balances
    const currentCustomers = getStorage<SalesCustomer[]>(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    const updatedCustomers = currentCustomers.map((c) => {
      if (c.id === customerId) {
        const newPaid = (c.paidAmount || 0) + amount;
        const newOutstanding = Math.max(0, (c.outstandingAmount || 0) - amount);
        const activities = [
          ...(c.activities || []),
          {
            id: `act_${Date.now()}`,
            action: 'Payment-In Received',
            details: `Payment of ₹${amount.toLocaleString()} received for invoice ${invoiceNo} via ${paymentMethod} (Receipt #${newReceiptNo})`,
            date: new Date().toISOString(),
            user: recordedBy,
          },
        ];
        return {
          ...c,
          paidAmount: newPaid,
          outstandingAmount: newOutstanding,
          activities,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });
    setStorage(KEYS.CUSTOMERS, updatedCustomers);
    setCustomers(updatedCustomers);

    // 4. Update any pending Promise-to-Pay for this invoice
    const currentPromises = getStorage<PromiseToPay[]>(KEYS.PROMISES_TO_PAY, INITIAL_PROMISES_TO_PAY);
    const updatedPromises = currentPromises.map((p) => {
      if ((p.invoiceId === invoiceId || p.invoiceNo === invoiceNo) && p.status === 'Pending') {
        return {
          ...p,
          status: 'Honoured' as PromiseToPayStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setStorage(KEYS.PROMISES_TO_PAY, updatedPromises);
    setPromisesToPay(updatedPromises);

    // 5. Add collection timeline record
    const newFollowUp: CollectionFollowUp = {
      id: `fup_${Date.now()}`,
      customerId,
      customerName: customer?.name,
      invoiceId,
      invoiceNo,
      salesRepresentativeId: customer?.salesRepresentativeId,
      salesRepresentativeName: customer?.salesRepresentativeName,
      followUpDate: paymentDate || new Date().toISOString().split('T')[0],
      followUpTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: `Payment of ₹${amount.toLocaleString()} received via ${paymentMethod} (Receipt #${newReceiptNo}). Balance updated.`,
      outcome: 'Payment Received',
      createdBy: recordedBy,
      createdAt: new Date().toISOString(),
    };
    const currentFollowUps = getStorage<CollectionFollowUp[]>(KEYS.COLLECTION_FOLLOW_UPS, INITIAL_COLLECTION_FOLLOW_UPS);
    const updatedFollowUps = [newFollowUp, ...currentFollowUps];
    setStorage(KEYS.COLLECTION_FOLLOW_UPS, updatedFollowUps);
    setCollectionFollowUps(updatedFollowUps);

    return { receiptNo: newReceiptNo, paymentIn: newPaymentIn };
  };

  // ----------------------------------------
  // Performance & Collection Real-time Metrics
  // ----------------------------------------
  const getRepresentativeMetrics = (repId: string) => {
    const assignedCustomers = customers.filter((c) => c.salesRepresentativeId === repId);
    const assignedCustomerIds = new Set(assignedCustomers.map((c) => c.id));

    const repSales = sales.filter(
      (s) =>
        s.saleStatus !== 'Cancelled' &&
        (assignedCustomerIds.has(s.customerId) || s.salesRepresentativeId === repId)
    );

    const todayStr = '2026-10-08';
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const totalOutstanding = repSales.reduce((sum, s) => {
      const bal = s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0));
      return sum + bal;
    }, 0);

    const overdueAmount = repSales.reduce((sum, s) => {
      const bal = s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0));
      const isOverdue = bal > 0 && s.dueDate && s.dueDate < todayStr;
      return isOverdue ? sum + bal : sum;
    }, 0);

    const repPayments = paymentIns.filter((p) => {
      const isCust = p.customerId ? assignedCustomerIds.has(p.customerId) : false;
      const isThisMonth = p.date ? p.date.startsWith(currentMonthPrefix) : false;
      return isCust && isThisMonth && p.status !== 'Cancelled';
    });
    const collectedThisMonth = repPayments.reduce((sum, p) => sum + (p.receivedAmount || 0), 0);

    const totalInvoiced = repSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const totalPaid = repSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    return {
      assignedCustomersCount: assignedCustomers.length,
      assignedCustomers,
      invoicesCount: repSales.length,
      totalOutstanding,
      overdueAmount,
      collectedThisMonth,
      totalInvoiced,
      totalPaid,
      collectionRate,
    };
  };

  const getCollectionDashboardMetrics = (refDate?: string) => {
    const todayStr = refDate || '2026-10-08';
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const activeInvoices = sales.filter((s) => s.saleStatus !== 'Cancelled');

    let totalOutstanding = 0;
    let overdueAmount = 0;
    let dueToday = 0;

    activeInvoices.forEach((s) => {
      const bal = s.balance !== undefined ? s.balance : Math.max(0, (s.grandTotal || 0) - (s.paidAmount || 0));
      if (bal > 0) {
        totalOutstanding += bal;
        if (s.dueDate < todayStr) {
          overdueAmount += bal;
        } else if (s.dueDate === todayStr) {
          dueToday += bal;
        }
      }
    });

    const collectedThisMonth = paymentIns
      .filter((p) => (p.date ? p.date.startsWith(currentMonthPrefix) : false) && p.status !== 'Cancelled')
      .reduce((sum, p) => sum + (p.receivedAmount || 0), 0);

    const followUpsTodayCount = collectionFollowUps.filter(
      (f) => f.followUpDate === todayStr || f.nextFollowUpDate === todayStr
    ).length;

    return {
      totalOutstanding,
      overdueAmount,
      dueToday,
      dueTodayAmount: dueToday,
      followUpsTodayCount,
      collectedThisMonth,
    };
  };

  return {
    sales,
    salesReturns,
    customers,
    suppliers,
    purchaseRequests,
    purchases,
    purchaseReturns,
    paymentOuts,
    stocks,
    quotations,
    paymentIns,
    salesRepresentatives,
    collectionFollowUps,
    promisesToPay,
    saveCustomer,
    setCustomersList,
    setSalesList,
    deleteCustomer,
    updateCustomerStatus,
    getCustomerMetrics,
    addCustomerActivity,
    saveSale,
    deleteSale,
    updateSalePayment,
    saveSalesReturn,
    updateSalesReturnStatus,
    saveSupplier,
    setSuppliersList,
    deleteSupplier,
    savePurchaseRequest,
    setPurchaseRequestsList,
    deletePurchaseRequest,
    updatePurchaseRequestStatus,
    savePurchase,
    setPurchasesList,
    deletePurchase,
    updatePurchaseOrderStatus,
    updatePurchasePayment,
    savePurchaseReturn,
    setPurchaseReturnsList,
    deletePurchaseReturn,
    savePaymentOut,
    setPaymentOutsList,
    deletePaymentOut,
    saveQuotation,
    setQuotationsList,
    deleteQuotation,
    updateQuotationStatus,
    convertQuotationToSale,
    savePaymentIn,
    setPaymentInsList,
    deletePaymentIn,
    updatePaymentIn,
    setSalesReturnsList,
    deleteSalesReturn,
    saveSalesRepresentative,
    setSalesRepresentativesList,
    deleteSalesRepresentative,
    assignCustomerSalesRep,
    assignInvoiceSalesRep,
    addCollectionFollowUp,
    deleteCollectionFollowUp,
    savePromiseToPay,
    updatePromiseToPayStatus,
    recordCollectionPayment,
    getRepresentativeMetrics,
    getCollectionDashboardMetrics,
    adjustStock,
    setStocksList,
    addStockBatch,
    updateStockItem,
    reloadAll,
  };
};
