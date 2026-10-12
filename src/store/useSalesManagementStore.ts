import { useState, useEffect, useCallback } from 'react';

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
  invoiceStatus?: 'Draft' | 'Generated' | 'Invoiced';
  referenceNo?: string;
  saleDate: string;
  dueDate: string;
  customerId: string;
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
  referenceNo?: string;
  date: string; // ISO format e.g. "2026-10-01"
  validUntil: string;
  customerId: string;
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
}

export interface SalesReturn {
  id: string;
  returnNo: string;
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
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
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
  unit?: string;
  purchasePrice: number;
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
  purchaseStatus: PurchaseStatus;
  status?: string;
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
  batches?: StockBatch[];
}

// ==========================================
// 2. INITIAL SEED DATA
// ==========================================

export const INITIAL_INVENTORY_STOCKS: InventoryStockItem[] = [];

export const INITIAL_SALES_REPRESENTATIVES: SalesRepresentative[] = [];

export const INITIAL_COLLECTION_FOLLOW_UPS: CollectionFollowUp[] = [
  {
    id: 'fup_1',
    customerId: 'cust_2',
    customerName: 'Priya Sundaram',
    invoiceId: 'sale_2',
    invoiceNo: 'INV-2026-1002',
    salesRepresentativeId: 'rep_2',
    salesRepresentativeName: 'Kumar',
    contactMethod: 'Phone',
    followUpDate: '2026-10-06',
    followUpTime: '11:30 AM',
    notes: 'Contacted customer regarding overdue balance of ₹7,097.63. Promised payment by 12th Oct.',
    outcome: 'Promise to Pay',
    hasPromiseToPay: true,
    promisedAmount: 7097.63,
    promiseDate: '2026-10-12',
    nextFollowUpDate: '2026-10-12',
    createdBy: 'Kumar',
    createdAt: '2026-10-06T11:30:00Z',
  },
  {
    id: 'fup_2',
    customerId: 'cust_3',
    customerName: 'Anand Verma',
    invoiceId: 'sale_3',
    invoiceNo: 'INV-2026-1003',
    salesRepresentativeId: 'rep_1',
    salesRepresentativeName: 'Arun Kumar',
    contactMethod: 'WhatsApp',
    followUpDate: '2026-10-07',
    followUpTime: '03:15 PM',
    notes: 'WhatsApp reminder sent regarding upcoming invoice. Customer will clear balance within payment terms.',
    outcome: 'Customer Contacted',
    hasPromiseToPay: false,
    nextFollowUpDate: '2026-10-20',
    createdBy: 'Arun Kumar',
    createdAt: '2026-10-07T15:15:00Z',
  },
  {
    id: 'fup_3',
    customerId: 'cust_1',
    customerName: 'Ramesh Kumar',
    invoiceId: 'sale_5',
    invoiceNo: 'INV-2026-1005',
    salesRepresentativeId: 'rep_2',
    salesRepresentativeName: 'Kumar',
    contactMethod: 'Phone',
    followUpDate: '2026-10-08',
    followUpTime: '10:00 AM',
    notes: 'Called customer. Customer confirmed payment will be released today via NEFT.',
    outcome: 'Customer Contacted',
    hasPromiseToPay: true,
    promisedAmount: 12000,
    promiseDate: '2026-10-08',
    nextFollowUpDate: '2026-10-08',
    createdBy: 'Kumar',
    createdAt: '2026-10-08T10:00:00Z',
  },
];

export const INITIAL_PROMISES_TO_PAY: PromiseToPay[] = [
  {
    id: 'ptp_1',
    customerId: 'cust_2',
    customerName: 'Priya Sundaram',
    invoiceId: 'sale_2',
    invoiceNo: 'INV-2026-1002',
    salesRepresentativeId: 'rep_2',
    salesRepresentativeName: 'Kumar',
    promisedAmount: 7097.63,
    promiseDate: '2026-10-12',
    notes: 'Customer confirmed payment by bank transfer before noon on 12th Oct.',
    status: 'Pending',
    createdAt: '2026-10-06T11:35:00Z',
    updatedAt: '2026-10-06T11:35:00Z',
  },
  {
    id: 'ptp_2',
    customerId: 'cust_1',
    customerName: 'Ramesh Kumar',
    invoiceId: 'sale_5',
    invoiceNo: 'INV-2026-1005',
    salesRepresentativeId: 'rep_2',
    salesRepresentativeName: 'Kumar',
    promisedAmount: 12000,
    promiseDate: '2026-10-08',
    notes: 'Full balance payment promised for invoice maturing today.',
    status: 'Pending',
    createdAt: '2026-10-08T10:05:00Z',
    updatedAt: '2026-10-08T10:05:00Z',
  },
];

export const INITIAL_CUSTOMERS: SalesCustomer[] = [
  {
    id: 'cust_1',
    customerCode: 'CUS-1001',
    name: 'Ramesh Kumar',
    company: 'Kumar Daily Supermarket',
    customerType: 'Business',
    phone: '+91 98410 23456',
    alternatePhone: '+91 98410 23457',
    email: 'ramesh@kumarsupermarket.in',
    gender: 'Male',
    dateOfBirth: '1985-06-12',
    address: '18 Gandhi Road, T. Nagar',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    pincode: '600017',
    gstNumber: '33AAACK1234D1Z5',
    panNumber: 'AAACK1234D',
    billingAddress: '18 Gandhi Road, T. Nagar, Chennai, Tamil Nadu 600017',
    shippingAddress: '18 Gandhi Road, T. Nagar, Chennai, Tamil Nadu 600017',
    sameAsBilling: true,
    creditLimit: 100000,
    paymentTerms: 'Net 15 Days',
    openingBalance: 0,
    preferredPaymentMethod: 'Bank Transfer',
    status: 'Active',
    salesRepresentativeId: 'rep_2',
    salesRepresentativeName: 'Kumar',
    salesRepresentativeType: 'Primary',
    assignedDate: '2026-08-10',
    assignmentNotes: 'High priority customer assigned to Kumar',
    notes: 'High-volume wholesale & retail neighborhood grocery mart.',
    tags: ['Supermarket', 'Wholesale', 'Retail'],
    activities: [
      { id: 'act_1', action: 'Customer Created', details: 'Customer profile registered in CRM', date: '2026-01-10T09:00:00Z', user: 'James Wilson' },
    ],
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-09-28T11:30:00Z',
  },
  {
    id: 'cust_2',
    customerCode: 'CUS-1002',
    name: 'Priya Sundaram',
    company: 'Annapoorna Caterers & Kitchen',
    customerType: 'Business',
    phone: '+91 98840 55678',
    email: 'orders@annapoornacaterers.in',
    gender: 'Female',
    dateOfBirth: '1989-11-20',
    address: '42 100ft Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    pincode: '560038',
    gstNumber: '29AABCA7788P1Z3',
    panNumber: 'AABCA7788P',
    billingAddress: '42 100ft Road, Indiranagar, Bengaluru, Karnataka 560038',
    shippingAddress: '42 100ft Road, Indiranagar, Bengaluru, Karnataka 560038',
    sameAsBilling: true,
    creditLimit: 75000,
    paymentTerms: '50% Advance, 50% on Delivery',
    openingBalance: 0,
    preferredPaymentMethod: 'UPI',
    status: 'Active',
    salesRepresentativeId: 'rep_4',
    salesRepresentativeName: 'Ravi',
    salesRepresentativeType: 'Primary',
    assignedDate: '2026-09-01',
    assignmentNotes: 'Assigned to Ravi for catering order collections',
    notes: 'Bulk consumer for rice, dals, ghee, and edible oil requirements.',
    tags: ['Catering', 'Commercial', 'Bulk Buyer'],
    activities: [
      { id: 'act_6', action: 'Customer Created', details: 'Customer profile registered in CRM', date: '2026-02-14T10:30:00Z', user: 'Alex Rivera' },
    ],
    createdAt: '2026-02-14T10:30:00Z',
    updatedAt: '2026-09-28T09:30:00Z',
  },
  {
    id: 'cust_3',
    customerCode: 'CUS-1003',
    name: 'Anand Verma',
    company: 'Verma Provision Store',
    customerType: 'Business',
    phone: '+91 99401 88992',
    email: 'anand.verma@vermastores.com',
    gender: 'Male',
    dateOfBirth: '1982-04-15',
    address: '104 Begumpet Main Road',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    pincode: '500016',
    gstNumber: '36AACCV9911K1Z8',
    panNumber: 'AACCV9911K',
    billingAddress: '104 Begumpet Main Road, Hyderabad, Telangana 500016',
    shippingAddress: '104 Begumpet Main Road, Hyderabad, Telangana 500016',
    sameAsBilling: true,
    creditLimit: 50000,
    paymentTerms: 'Net 30 Days',
    openingBalance: 0,
    preferredPaymentMethod: 'Credit',
    status: 'Active',
    salesRepresentativeId: 'rep_1',
    salesRepresentativeName: 'Arun Kumar',
    salesRepresentativeType: 'Primary',
    assignedDate: '2026-07-15',
    assignmentNotes: 'Wholesale provision account assigned to Arun',
    notes: 'Community provision & FMCG retail grocery branch.',
    tags: ['Provision', 'FMCG', 'Growth'],
    activities: [
      { id: 'act_9', action: 'Customer Created', details: 'Customer profile registered in CRM', date: '2026-03-05T14:15:00Z', user: 'Sarah Jenkins' },
    ],
    createdAt: '2026-03-05T14:15:00Z',
    updatedAt: '2026-09-28T11:45:00Z',
  },
  {
    id: 'cust_4',
    customerCode: 'CUS-1004',
    name: 'Meenakshi Iyer',
    company: 'Household Account',
    customerType: 'Individual',
    phone: '+91 97908 11223',
    alternatePhone: '+91 97908 11224',
    email: 'meenakshi.iyer@gmail.com',
    gender: 'Female',
    dateOfBirth: '1978-08-25',
    address: 'Flat 4B, Shanthi Apartments, Mylapore',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    pincode: '600004',
    gstNumber: 'N/A',
    panNumber: 'N/A',
    billingAddress: 'Flat 4B, Shanthi Apartments, Mylapore, Chennai, Tamil Nadu 600004',
    shippingAddress: 'Flat 4B, Shanthi Apartments, Mylapore, Chennai, Tamil Nadu 600004',
    sameAsBilling: true,
    creditLimit: 10000,
    paymentTerms: 'Immediate / Cash',
    openingBalance: 0,
    preferredPaymentMethod: 'Cash',
    status: 'Active',
    salesRepresentativeId: 'rep_2',
    salesRepresentativeName: 'Kumar',
    salesRepresentativeType: 'Temporary',
    assignedDate: '2026-10-01',
    assignmentNotes: 'Temporary cover for retail walk-in accounts',
    notes: 'Regular household walk-in customer for monthly groceries.',
    tags: ['Walk-in', 'Retail', 'Regular'],
    activities: [
      { id: 'act_11', action: 'Customer Created', details: 'Customer profile registered', date: '2026-04-10T11:00:00Z', user: 'Yaa Admin' },
    ],
    createdAt: '2026-04-10T11:00:00Z',
    updatedAt: '2026-09-20T15:00:00Z',
  },
  {
    id: 'cust_5',
    customerCode: 'CUS-1005',
    name: 'Rajesh Gupta',
    company: 'Gupta Bakers & Confectioners',
    customerType: 'Business',
    phone: '+91 98112 33445',
    email: 'guptabakers@gmail.com',
    gender: 'Male',
    dateOfBirth: '1992-03-08',
    address: '55 Linking Road, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    pincode: '400050',
    gstNumber: '27AABCG4433E1Z0',
    panNumber: 'AABCG4433E',
    billingAddress: '55 Linking Road, Bandra West, Mumbai, Maharashtra 400050',
    shippingAddress: '55 Linking Road, Bandra West, Mumbai, Maharashtra 400050',
    sameAsBilling: true,
    creditLimit: 60000,
    paymentTerms: 'Net 15 Days',
    openingBalance: 0,
    preferredPaymentMethod: 'UPI',
    status: 'Active',
    salesRepresentativeId: 'rep_1',
    salesRepresentativeName: 'Arun Kumar',
    salesRepresentativeType: 'Primary',
    assignedDate: '2026-05-18',
    assignmentNotes: 'Bakery chain commercial account',
    notes: 'Bakery chain procuring flours, sugar, butter, and chocolates.',
    tags: ['Bakery', 'Commercial'],
    activities: [
      { id: 'act_12', action: 'Customer Created', details: 'Customer profile onboarded', date: '2026-05-18T10:00:00Z', user: 'Sarah Jenkins' },
    ],
    createdAt: '2026-05-18T10:00:00Z',
    updatedAt: '2026-09-22T14:30:00Z',
  },
];

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

const SEED_VERSION_KEY = 'yaa_crm_grocery_mock_v7';
const INITIAL_PAYMENT_INS: SalePaymentIn[] = [];

function getStorage<T>(key: string, initial: T): T {
  try {
    const isGrocerySeeded = localStorage.getItem(SEED_VERSION_KEY);
    if (!isGrocerySeeded) {
      localStorage.setItem(KEYS.SALES, JSON.stringify(INITIAL_SALES));
      localStorage.setItem(KEYS.SALES_RETURNS, JSON.stringify(INITIAL_SALES_RETURNS));
      localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
      localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(INITIAL_SUPPLIERS));
      localStorage.setItem(KEYS.PURCHASE_REQUESTS, JSON.stringify(INITIAL_PURCHASE_REQUESTS));
      localStorage.setItem(KEYS.PURCHASES, JSON.stringify(INITIAL_PURCHASES));
      localStorage.setItem(KEYS.PURCHASE_RETURNS, JSON.stringify(INITIAL_PURCHASE_RETURNS));
      localStorage.setItem(KEYS.PAYMENTS_OUT, JSON.stringify(INITIAL_PAYMENTS_OUT));
      localStorage.setItem(KEYS.STOCKS, JSON.stringify(INITIAL_INVENTORY_STOCKS));
      localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(INITIAL_QUOTATIONS));
      localStorage.setItem(KEYS.PAYMENT_INS, JSON.stringify(INITIAL_PAYMENT_INS));
      localStorage.setItem(KEYS.SALES_REPRESENTATIVES, JSON.stringify(INITIAL_SALES_REPRESENTATIVES));
      localStorage.setItem(KEYS.COLLECTION_FOLLOW_UPS, JSON.stringify(INITIAL_COLLECTION_FOLLOW_UPS));
      localStorage.setItem(KEYS.PROMISES_TO_PAY, JSON.stringify(INITIAL_PROMISES_TO_PAY));
      localStorage.setItem(SEED_VERSION_KEY, 'true');
      return initial;
    }

    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }

    const parsed = JSON.parse(raw);

    // Auto-purge mock stocks (Aashirvaad Atta, etc.)
    if (key === KEYS.STOCKS && Array.isArray(parsed)) {
      const cleaned = parsed.filter(
        (s) =>
          !String(s.productId || s.id).startsWith('PROD_10') &&
          !String(s.id).startsWith('stk_') &&
          !String(s.productName || '').includes('Aashirvaad') &&
          !String(s.productName || '').includes('India Gate')
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(KEYS.STOCKS, JSON.stringify(cleaned));
        return cleaned as unknown as T;
      }
    }

    // Auto-purge mock quotations
    if (key === KEYS.QUOTATIONS && Array.isArray(parsed)) {
      const cleaned = parsed.filter(
        (q) =>
          q.id !== 'quot-1' &&
          q.quotationNo !== 'EST-001' &&
          q.partyName !== 'Keerthivasan'
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(cleaned));
        return cleaned as unknown as T;
      }
    }

    // Auto-purge mock sales returns
    if (key === KEYS.SALES_RETURNS && Array.isArray(parsed)) {
      const cleaned = parsed.filter(
        (r) =>
          r.id !== 'ret_1' &&
          r.returnNo !== 'SR-2026-0001' &&
          r.customerName !== 'Ramesh Kumar'
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(KEYS.SALES_RETURNS, JSON.stringify(cleaned));
        return cleaned as unknown as T;
      }
    }

    // Auto-purge mock payments-in
    if (key === KEYS.PAYMENT_INS && Array.isArray(parsed)) {
      const cleaned = parsed.filter(
        (p) =>
          p.id !== 'pay_in_1' &&
          p.id !== 'pay_in_2' &&
          p.receiptNo !== 'REC-2026-0001' &&
          p.receiptNo !== 'REC-2026-0002'
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(KEYS.PAYMENT_INS, JSON.stringify(cleaned));
        return cleaned as unknown as T;
      }
    }

    // Auto-purge mock purchase requests
    if (key === KEYS.PURCHASE_REQUESTS && Array.isArray(parsed)) {
      const cleaned = parsed.filter(
        (pr) =>
          pr.id !== 'pr_1' &&
          pr.id !== 'pr_2' &&
          pr.requestNo !== 'PR-2026-0041' &&
          pr.requestNo !== 'PR-2026-0042'
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(KEYS.PURCHASE_REQUESTS, JSON.stringify(cleaned));
        return cleaned as unknown as T;
      }
    }

    // Auto-purge mock purchase orders
    if (key === KEYS.PURCHASES && Array.isArray(parsed)) {
      const cleaned = parsed.filter(
        (po) =>
          po.id !== 'po_1' &&
          po.id !== 'po_1_2' &&
          po.id !== 'po_2' &&
          po.id !== 'po_3' &&
          po.id !== 'po_4' &&
          po.id !== 'po-uuid-0001' &&
          !String(po.purchaseNo || '').startsWith('PO-2026-020')
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(KEYS.PURCHASES, JSON.stringify(cleaned));
        return cleaned as unknown as T;
      }
    }

    // Auto-purge mock purchase returns
    if (key === KEYS.PURCHASE_RETURNS && Array.isArray(parsed)) {
      const cleaned = parsed.filter(
        (pret) =>
          pret.id !== 'pret_1' &&
          pret.id !== 'pret_5501' &&
          pret.returnNo !== 'PR-RET-2026-001'
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(KEYS.PURCHASE_RETURNS, JSON.stringify(cleaned));
        return cleaned as unknown as T;
      }
    }

    // Auto-purge mock payment outs
    if (key === KEYS.PAYMENTS_OUT && Array.isArray(parsed)) {
      const cleaned = parsed.filter(
        (pout) =>
          pout.id !== 'pay_out_1' &&
          pout.id !== 'pay_out_2' &&
          pout.id !== 'pay_out_3' &&
          pout.id !== 'pout-uuid-0001' &&
          !String(pout.paymentNo || '').startsWith('VPA-2026-00')
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(KEYS.PAYMENTS_OUT, JSON.stringify(cleaned));
        return cleaned as unknown as T;
      }
    }

    return parsed;
  } catch (err) {
    console.error(`Failed to read from localStorage for ${key}`, err);
    return initial;
  }
}

function setStorage<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event('sales_management_storage_updated'));
  } catch (err) {
    console.error(`Failed to write to localStorage for ${key}`, err);
  }
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
    const customerSales = sales.filter((s) => s.customerId === customerId && s.saleStatus !== 'Cancelled');
    const customerReturns = salesReturns.filter((r) => r.customerId === customerId && r.returnStatus !== 'Rejected');

    const totalSalesAmount = customerSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const totalPaidAmount = customerSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const openingBal = customer?.openingBalance || 0;
    const salesBalance = customerSales.reduce((sum, s) => sum + (s.balance || 0), 0);
    const totalReturnAmount = customerReturns.reduce((sum, r) => sum + (r.returnAmount || 0), 0);
    const totalRefunded = customerReturns
      .filter((r) => r.refundStatus === 'Refunded' || r.refundStatus === 'Store Credit')
      .reduce((sum, r) => sum + (r.refundAmount || 0), 0);

    const outstandingAmount = Math.max(0, openingBal + salesBalance - (totalReturnAmount - totalRefunded));
    const creditLimit = customer?.creditLimit || 0;
    const availableCredit = Math.max(0, creditLimit - outstandingAmount);
    const creditUtilizationPercent = creditLimit > 0 ? Math.min(100, (outstandingAmount / creditLimit) * 100) : 0;

    return {
      totalSalesAmount,
      totalPaidAmount,
      outstandingAmount,
      totalSalesCount: customerSales.length,
      totalReturnsCount: customerReturns.length,
      totalReturnAmount,
      creditLimit,
      availableCredit,
      creditUtilizationPercent,
      openingBalance: openingBal,
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
    setStorage(KEYS.CUSTOMERS, newCustomers);
    setCustomers(newCustomers);
    return newCustomers;
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
    }
  ) => {
    const currentStocks = getStorage<InventoryStockItem[]>(KEYS.STOCKS, INITIAL_INVENTORY_STOCKS);
    const updated = currentStocks.map((item) => {
      if (item.productId === productId || item.id === productId) {
        let batches = [...(item.batches || [])];

        if (batchNo && batchNo.trim()) {
          const cleanBatch = batchNo.trim();
          const bIdx = batches.findIndex((b) => b.batchNo.toLowerCase() === cleanBatch.toLowerCase());
          if (bIdx >= 0) {
            const currentQty = batches[bIdx].quantity;
            const newQty = Math.max(0, currentQty + quantityDelta);
            batches[bIdx] = {
              ...batches[bIdx],
              quantity: newQty,
              status: newQty === 0 ? 'Depleted' : batches[bIdx].status,
              costPrice: batchMeta?.costPrice ?? batches[bIdx].costPrice,
              sellingPrice: batchMeta?.sellingPrice ?? batches[bIdx].sellingPrice,
              expDate: batchMeta?.expDate ?? batches[bIdx].expDate,
              mfgDate: batchMeta?.mfgDate ?? batches[bIdx].mfgDate,
            };
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

        const totalBatchQty = batches.reduce((sum, b) => sum + b.quantity, 0);
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
    if (exists) {
      if (
        (exists.purchaseStatus !== 'Completed' && exists.purchaseStatus !== 'Received') &&
        (po.purchaseStatus === 'Completed' || po.purchaseStatus === 'Received')
      ) {
        po.items.forEach((item) =>
          adjustStock(item.productId, item.quantity, item.batch, {
            costPrice: item.purchasePrice,
            mfgDate: item.mfgDate,
            expDate: item.expDate,
            supplierName: po.supplierName,
          })
        );
      }
      updated = current.map((p) => (p.id === po.id ? po : p));
    } else {
      if (po.purchaseStatus === 'Completed' || po.purchaseStatus === 'Received') {
        po.items.forEach((item) =>
          adjustStock(item.productId, item.quantity, item.batch, {
            costPrice: item.purchasePrice,
            mfgDate: item.mfgDate,
            expDate: item.expDate,
            supplierName: po.supplierName,
          })
        );
      }
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
    if (exists) {
      if (exists.returnStatus !== 'Completed' && pret.returnStatus === 'Completed') {
        pret.items.forEach((item) => adjustStock(item.productId, -item.returnQuantity, item.batch));
      }
      updated = current.map((r) => (r.id === pret.id ? pret : r));
    } else {
      if (pret.returnStatus === 'Completed' || pret.returnStatus === 'Returned') {
        pret.items.forEach((item) => adjustStock(item.productId, -item.returnQuantity, item.batch));
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
    const newInvoiceNo = `INV-${new Date().getFullYear()}-${String(nextInvoiceNum).padStart(4, '0')}`;

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
    setStorage(KEYS.PAYMENTS_OUT, list);
    setPaymentOuts(list);
    return list;
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

  const setSalesRepresentativesList = (reps: SalesRepresentative[]) => {
    setStorage(KEYS.SALES_REPRESENTATIVES, reps);
    setSalesRepresentatives(reps);
  };

  const assignCustomerSalesRep = (
    customerId: string,
    repId: string,
    assignmentType: 'Primary' | 'Temporary' = 'Primary',
    effectiveFrom?: string,
    notes?: string
  ) => {
    const rep = salesRepresentatives.find((r) => r.id === repId);
    const repName = rep?.name || 'Unassigned';
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
    const newReceiptNo = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

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
          id: `PAY-${Date.now().toString().slice(-6)}`,
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
