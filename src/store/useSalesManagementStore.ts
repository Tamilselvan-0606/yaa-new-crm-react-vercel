import { useState, useEffect } from 'react';

// ==========================================
// 1. DATA MODELS & INTERFACES
// ==========================================

export type SaleStatus = 'Draft' | 'Confirmed' | 'Completed' | 'Cancelled';
export type SalePaymentStatus = 'Paid' | 'Partial' | 'Unpaid' | 'Pending';

export interface SaleProductItem {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  batch?: string;
  quantity: number;
  purchasePrice?: number;
  salesPrice?: number;
  unitPrice: number;
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
  customerId?: string;
  partyName: string;
  customerPhone?: string;
  customerCompany?: string;
  paymentType: PaymentInType;
  receivedAmount: number;
  referenceNo?: string;
  description?: string;
  imageAttachment?: string;
  firmName?: string;
  invoiceNo?: string;
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
  activities?: CustomerActivity[];
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
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdPurchaseId?: string;
  createdAt: string;
  updatedAt: string;
}

// Purchase Order / Purchase Transaction
export type PurchaseStatus = 'Draft' | 'Ordered' | 'Received' | 'Completed' | 'Cancelled';
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
  purchaseInvoiceNo?: string;
  supplierId: string;
  supplierName: string;
  supplierCode?: string;
  purchaseDate: string;
  dueDate: string;
  items: PurchaseProductItem[];
  subtotal: number;
  discount: number;
  tax: number;
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
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Purchase Return
export type PurchaseReturnStatus = 'Requested' | 'Approved' | 'Returned' | 'Completed' | 'Cancelled';

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
  status: 'Completed' | 'Pending' | 'Failed';
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

export const INITIAL_INVENTORY_STOCKS: InventoryStockItem[] = [
  {
    id: 'stk_1',
    productId: 'PROD_1001',
    productName: 'Aashirvaad Superior MP Sharbati Atta (10 Kg)',
    sku: 'SKU-ATT-10K',
    category: 'Grains & Flours',
    subcategory: 'Flours',
    unit: 'BAG',
    inStock: 85,
    reorderLevel: 15,
    unitCost: 420,
    unitPrice: 495,
    lastUpdated: '2026-09-25T10:00:00Z',
    batches: [
      {
        id: 'bat_att_1',
        batchNo: 'BAT-ATT-2401',
        productId: 'PROD_1001',
        quantity: 85,
        costPrice: 420,
        sellingPrice: 495,
        mfgDate: '2026-08-15',
        expDate: '2027-02-15',
        supplierName: 'ITC FMCG Wholesale Distribution Hub',
        status: 'Active',
        receivedDate: '2026-08-20',
      },
    ],
  },
  {
    id: 'stk_2',
    productId: 'PROD_1002',
    productName: 'India Gate Super Premium Basmati Rice (5 Kg)',
    sku: 'SKU-RIC-05K',
    category: 'Grains & Flours',
    subcategory: 'Rice',
    unit: 'BAG',
    inStock: 120,
    reorderLevel: 20,
    unitCost: 580,
    unitPrice: 699,
    lastUpdated: '2026-09-26T14:30:00Z',
    batches: [
      {
        id: 'bat_ric_1',
        batchNo: 'BAT-RIC-2402',
        productId: 'PROD_1002',
        quantity: 120,
        costPrice: 580,
        sellingPrice: 699,
        mfgDate: '2026-07-10',
        expDate: '2028-07-10',
        supplierName: 'Tata Consumer Products Central Supply',
        status: 'Active',
        receivedDate: '2026-07-15',
      },
    ],
  },
  {
    id: 'stk_3',
    productId: 'PROD_1003',
    productName: 'Fortune Sunlite Refined Sunflower Oil (1 Ltr Pouch)',
    sku: 'SKU-OIL-01L',
    category: 'Edible Oils & Ghee',
    subcategory: 'Cooking Oils',
    unit: 'PAC',
    inStock: 240,
    reorderLevel: 40,
    unitCost: 138,
    unitPrice: 165,
    lastUpdated: '2026-09-27T09:15:00Z',
    batches: [
      {
        id: 'bat_oil_1',
        batchNo: 'BAT-OIL-2403',
        productId: 'PROD_1003',
        quantity: 240,
        costPrice: 138,
        sellingPrice: 165,
        mfgDate: '2026-08-01',
        expDate: '2027-04-01',
        supplierName: 'Adani Wilmar & Fortune Oils Depot',
        status: 'Active',
        receivedDate: '2026-08-05',
      },
    ],
  },
  {
    id: 'stk_4',
    productId: 'PROD_1004',
    productName: 'Tata Salt Vacuum Evaporated Iodized (1 Kg)',
    sku: 'SKU-SLT-01K',
    category: 'Spices, Salt & Sugar',
    subcategory: 'Salt',
    unit: 'PAC',
    inStock: 350,
    reorderLevel: 50,
    unitCost: 22,
    unitPrice: 28,
    lastUpdated: '2026-09-28T08:00:00Z',
    batches: [
      {
        id: 'bat_slt_1',
        batchNo: 'BAT-SLT-2404',
        productId: 'PROD_1004',
        quantity: 350,
        costPrice: 22,
        sellingPrice: 28,
        mfgDate: '2026-06-01',
        expDate: '2028-06-01',
        supplierName: 'Tata Consumer Products Central Supply',
        status: 'Active',
        receivedDate: '2026-06-10',
      },
    ],
  },
  {
    id: 'stk_5',
    productId: 'PROD_1005',
    productName: 'Premium Unpolished Toor Dal / Arhar Dal (1 Kg)',
    sku: 'SKU-DAL-01K',
    category: 'Pulses & Dals',
    subcategory: 'Dals',
    unit: 'PAC',
    inStock: 90,
    reorderLevel: 20,
    unitCost: 145,
    unitPrice: 178,
    lastUpdated: '2026-09-28T11:00:00Z',
    batches: [
      {
        id: 'bat_dal_1',
        batchNo: 'BAT-DAL-2405',
        productId: 'PROD_1005',
        quantity: 90,
        costPrice: 145,
        sellingPrice: 178,
        mfgDate: '2026-07-20',
        expDate: '2027-07-20',
        supplierName: 'ITC FMCG Wholesale Distribution Hub',
        status: 'Active',
        receivedDate: '2026-07-25',
      },
    ],
  },
  {
    id: 'stk_6',
    productId: 'PROD_1006',
    productName: 'Amul Pure Cow Ghee Tin (1 Ltr)',
    sku: 'SKU-GHE-01L',
    category: 'Edible Oils & Ghee',
    subcategory: 'Ghee',
    unit: 'CAN',
    inStock: 45,
    reorderLevel: 10,
    unitCost: 560,
    unitPrice: 645,
    lastUpdated: '2026-09-28T15:00:00Z',
    batches: [
      {
        id: 'bat_ghe_1',
        batchNo: 'BAT-GHE-2406',
        productId: 'PROD_1006',
        quantity: 45,
        costPrice: 560,
        sellingPrice: 645,
        mfgDate: '2026-08-10',
        expDate: '2027-05-10',
        supplierName: 'Amul GCMMF Dairy Distributors',
        status: 'Active',
        receivedDate: '2026-08-15',
      },
    ],
  },
  {
    id: 'stk_7',
    productId: 'PROD_1007',
    productName: 'Brooke Bond Red Label Strong Tea (500g)',
    sku: 'SKU-TEA-500',
    category: 'Beverages & Tea',
    subcategory: 'Tea',
    unit: 'PAC',
    inStock: 75,
    reorderLevel: 15,
    unitCost: 230,
    unitPrice: 275,
    lastUpdated: '2026-09-29T08:00:00Z',
    batches: [
      {
        id: 'bat_tea_1',
        batchNo: 'BAT-TEA-2407',
        productId: 'PROD_1007',
        quantity: 75,
        costPrice: 230,
        sellingPrice: 275,
        mfgDate: '2026-08-01',
        expDate: '2027-08-01',
        supplierName: 'Hindustan Unilever Regional Agency',
        status: 'Active',
        receivedDate: '2026-08-08',
      },
    ],
  },
  {
    id: 'stk_8',
    productId: 'PROD_1008',
    productName: 'Maggi 2-Minute Masala Noodles (Pack of 12)',
    sku: 'SKU-MAG-12P',
    category: 'Packaged Food & Snacks',
    subcategory: 'Instant Foods',
    unit: 'PAC',
    inStock: 110,
    reorderLevel: 25,
    unitCost: 142,
    unitPrice: 168,
    lastUpdated: '2026-09-29T09:00:00Z',
    batches: [
      {
        id: 'bat_mag_1',
        batchNo: 'BAT-MAG-2408',
        productId: 'PROD_1008',
        quantity: 110,
        costPrice: 142,
        sellingPrice: 168,
        mfgDate: '2026-09-01',
        expDate: '2027-05-01',
        supplierName: 'ITC FMCG Wholesale Distribution Hub',
        status: 'Active',
        receivedDate: '2026-09-05',
      },
    ],
  },
  {
    id: 'stk_9',
    productId: 'PROD_1009',
    productName: 'Surf Excel Easy Wash Detergent Powder (1 Kg)',
    sku: 'SKU-DET-01K',
    category: 'Cleaning & Household',
    subcategory: 'Detergents',
    unit: 'PAC',
    inStock: 65,
    reorderLevel: 15,
    unitCost: 125,
    unitPrice: 148,
    lastUpdated: '2026-09-29T10:00:00Z',
    batches: [
      {
        id: 'bat_det_1',
        batchNo: 'BAT-DET-2409',
        productId: 'PROD_1009',
        quantity: 65,
        costPrice: 125,
        sellingPrice: 148,
        mfgDate: '2026-07-15',
        expDate: '2028-07-15',
        supplierName: 'Hindustan Unilever Regional Agency',
        status: 'Active',
        receivedDate: '2026-07-22',
      },
    ],
  },
  {
    id: 'stk_10',
    productId: 'PROD_1010',
    productName: 'Cadbury Dairy Milk Silk Chocolate (150g)',
    sku: 'SKU-CAD-150',
    category: 'Packaged Food & Snacks',
    subcategory: 'Chocolates',
    unit: 'PCS',
    inStock: 15,
    reorderLevel: 10,
    unitCost: 135,
    unitPrice: 175,
    lastUpdated: '2026-09-29T11:00:00Z',
    batches: [
      {
        id: 'bat_cad_1',
        batchNo: 'BAT-CAD-2410',
        productId: 'PROD_1010',
        quantity: 15,
        costPrice: 135,
        sellingPrice: 175,
        mfgDate: '2026-08-20',
        expDate: '2027-08-20',
        supplierName: 'ITC FMCG Wholesale Distribution Hub',
        status: 'Active',
        receivedDate: '2026-08-25',
      },
    ],
  },
  {
    id: 'stk_11',
    productId: 'PROD_1011',
    productName: 'Dettol Original Liquid Handwash Refill (200ml)',
    sku: 'SKU-DET-200',
    category: 'Personal Care',
    subcategory: 'Handwash',
    unit: 'PAC',
    inStock: 8,
    reorderLevel: 15,
    unitCost: 38,
    unitPrice: 49,
    lastUpdated: '2026-09-29T12:00:00Z',
    batches: [
      {
        id: 'bat_det_2',
        batchNo: 'BAT-DET-2411',
        productId: 'PROD_1011',
        quantity: 8,
        costPrice: 38,
        sellingPrice: 49,
        mfgDate: '2026-06-10',
        expDate: '2028-06-10',
        supplierName: 'Hindustan Unilever Regional Agency',
        status: 'Active',
        receivedDate: '2026-06-18',
      },
    ],
  },
  {
    id: 'stk_12',
    productId: 'PROD_1012',
    productName: 'Madhur Pure & Hygienic Refined Sugar (5 Kg)',
    sku: 'SKU-SGR-05K',
    category: 'Spices, Salt & Sugar',
    subcategory: 'Sugar',
    unit: 'BAG',
    inStock: 60,
    reorderLevel: 15,
    unitCost: 210,
    unitPrice: 250,
    lastUpdated: '2026-09-29T13:00:00Z',
    batches: [
      {
        id: 'bat_sgr_1',
        batchNo: 'BAT-SGR-2412',
        productId: 'PROD_1012',
        quantity: 60,
        costPrice: 210,
        sellingPrice: 250,
        mfgDate: '2026-08-10',
        expDate: '2028-08-10',
        supplierName: 'Tata Consumer Products Central Supply',
        status: 'Active',
        receivedDate: '2026-08-15',
      },
    ],
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
    notes: 'Bakery chain procuring flours, sugar, butter, and chocolates.',
    tags: ['Bakery', 'Commercial'],
    activities: [
      { id: 'act_12', action: 'Customer Created', details: 'Customer profile onboarded', date: '2026-05-18T10:00:00Z', user: 'Sarah Jenkins' },
    ],
    createdAt: '2026-05-18T10:00:00Z',
    updatedAt: '2026-09-22T14:30:00Z',
  },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup_1',
    supplierCode: 'SUP-1001',
    name: 'ITC FMCG Wholesale Distribution Hub',
    contactPerson: 'Suresh Babu',
    phone: '+91 98450 11223',
    email: 'orders@itcwholesalesupply.in',
    address: 'Plot 45, Peenya Industrial Area Phase 1',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    pincode: '560058',
    gstNumber: '29AABCI1234F1Z1',
    panNumber: 'AABCI1234F',
    paymentTerms: 'Net 30 Days',
    creditLimit: 500000,
    bankName: 'HDFC Bank',
    accountNumber: '50200012345678',
    ifscCode: 'HDFC0000123',
    branchName: 'Peenya, Bengaluru',
    totalPurchase: 46630,
    paid: 15000,
    payable: 31630,
    status: 'Active',
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'sup_2',
    supplierCode: 'SUP-1002',
    name: 'Hindustan Unilever Regional Agency',
    contactPerson: 'Rajesh Kannan',
    phone: '+91 97412 33445',
    email: 'chennaidist@hul-agency.in',
    address: '128 SIDCO Industrial Estate, Ambattur',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    pincode: '600058',
    gstNumber: '33AAACH9876K1Z9',
    panNumber: 'AAACH9876K',
    paymentTerms: 'Net 15 Days',
    creditLimit: 400000,
    bankName: 'ICICI Bank',
    accountNumber: '001105009988',
    ifscCode: 'ICIC0000011',
    branchName: 'Ambattur, Chennai',
    totalPurchase: 4484,
    paid: 0,
    payable: 4484,
    status: 'Active',
    createdAt: '2026-02-10T11:00:00Z',
    updatedAt: '2026-09-18T16:00:00Z',
  },
  {
    id: 'sup_3',
    supplierCode: 'SUP-1003',
    name: 'Adani Wilmar & Fortune Oils Depot',
    contactPerson: 'Manish Shah',
    phone: '+91 99250 88776',
    email: 'sales@fortunefoodsdepot.com',
    address: 'Sector 18, GIDC Naroda Estate',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    pincode: '382330',
    gstNumber: '24AAACA5432M1Z4',
    panNumber: 'AAACA5432M',
    paymentTerms: 'Immediate / Cash',
    creditLimit: 300000,
    bankName: 'State Bank of India',
    accountNumber: '30495867201',
    ifscCode: 'SBIN0001234',
    branchName: 'Naroda, Ahmedabad',
    totalPurchase: 21735,
    paid: 10000,
    payable: 11735,
    status: 'Active',
    createdAt: '2026-03-01T08:30:00Z',
    updatedAt: '2026-09-24T12:00:00Z',
  },
  {
    id: 'sup_4',
    supplierCode: 'SUP-1004',
    name: 'Tata Consumer Products Central Supply',
    contactPerson: 'Venkat Raman',
    phone: '+91 98401 44556',
    email: 'supply@tataconsumerhub.in',
    address: '88 Whitefield Industrial Area',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    pincode: '560066',
    gstNumber: '29AABCT6677N1Z2',
    panNumber: 'AABCT6677N',
    paymentTerms: 'Net 30 Days',
    creditLimit: 600000,
    bankName: 'Axis Bank',
    accountNumber: '9120100456789',
    ifscCode: 'UTIB0000128',
    branchName: 'Whitefield, Bengaluru',
    totalPurchase: 16475,
    paid: 8000,
    payable: 8475,
    status: 'Active',
    createdAt: '2026-01-05T14:00:00Z',
    updatedAt: '2026-09-26T09:00:00Z',
  },
  {
    id: 'sup_5',
    supplierCode: 'SUP-1005',
    name: 'Amul GCMMF Dairy Distributors',
    contactPerson: 'Nilesh Patel',
    phone: '+91 98240 55667',
    email: 'dispatch@amuldairydist.com',
    address: 'Amul Dairy Road, Anand',
    city: 'Anand',
    state: 'Gujarat',
    country: 'India',
    pincode: '388001',
    gstNumber: '24AABCG1122D1Z6',
    panNumber: 'AABCG1122D',
    paymentTerms: 'Net 7 Days',
    creditLimit: 350000,
    bankName: 'Bank of Baroda',
    accountNumber: '01890200001234',
    ifscCode: 'BARB0ANANDX',
    branchName: 'Anand Main',
    totalPurchase: 0,
    paid: 0,
    payable: 0,
    status: 'Active',
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-09-25T11:00:00Z',
  },
];

export const INITIAL_SALES: SaleTransaction[] = [
  {
    id: 'sale_1',
    invoiceNo: 'INV-2026-1001',
    invoiceStatus: 'Generated',
    saleDate: '2026-09-27',
    dueDate: '2026-10-12',
    customerId: 'cust_1',
    customerName: 'Ramesh Kumar',
    customerCompany: 'Kumar Daily Supermarket',
    customerPhone: '+91 98410 23456',
    customerEmail: 'ramesh@kumarsupermarket.in',
    billingAddress: '18 Gandhi Road, T. Nagar, Chennai, Tamil Nadu 600017',
    shippingAddress: '18 Gandhi Road, T. Nagar, Chennai, Tamil Nadu 600017',
    items: [
      {
        id: 's_item_1',
        productId: 'PROD_1001',
        productName: 'Aashirvaad Superior MP Sharbati Atta (10 Kg)',
        sku: 'SKU-ATT-10K',
        quantity: 4,
        purchasePrice: 420,
        unitPrice: 495,
        discountPercent: 0,
        taxPercent: 5,
        total: 2079,
      },
      {
        id: 's_item_2',
        productId: 'PROD_1002',
        productName: 'India Gate Super Premium Basmati Rice (5 Kg)',
        sku: 'SKU-RIC-05K',
        quantity: 3,
        purchasePrice: 580,
        unitPrice: 699,
        discountPercent: 0,
        taxPercent: 5,
        total: 2201.85,
      },
      {
        id: 's_item_3',
        productId: 'PROD_1003',
        productName: 'Fortune Sunlite Refined Sunflower Oil (1 Ltr Pouch)',
        sku: 'SKU-OIL-01L',
        quantity: 10,
        purchasePrice: 138,
        unitPrice: 165,
        discountPercent: 0,
        taxPercent: 5,
        total: 1732.50,
      },
      {
        id: 's_item_4',
        productId: 'PROD_1004',
        productName: 'Tata Salt Vacuum Evaporated Iodized (1 Kg)',
        sku: 'SKU-SLT-01K',
        quantity: 20,
        purchasePrice: 22,
        unitPrice: 28,
        discountPercent: 0,
        taxPercent: 0,
        total: 560,
      },
      {
        id: 's_item_5',
        productId: 'PROD_1007',
        productName: 'Brooke Bond Red Label Strong Tea (500g)',
        sku: 'SKU-TEA-500',
        quantity: 6,
        purchasePrice: 230,
        unitPrice: 275,
        discountPercent: 0,
        taxPercent: 5,
        total: 1732.50,
      },
    ],
    subtotal: 7937,
    totalDiscount: 200,
    totalTax: 386.85,
    shippingCharges: 100,
    otherCharges: 0,
    grandTotal: 8223.85,
    paidAmount: 8223.85,
    balance: 0,
    paymentMethod: 'Bank Transfer',
    paymentSplits: [
      { id: 'ps_101', method: 'Bank Transfer', amount: 8223.85, referenceNo: 'TXN-HDFC-99124' },
    ],
    paymentRecords: [
      {
        id: 'PAY-000101',
        invoiceNo: 'INV-2026-1001',
        paymentDate: '2026-09-27',
        paymentTime: '10:30 AM',
        method: 'Bank Transfer',
        referenceNo: 'TXN-HDFC-99124',
        amount: 8223.85,
        status: 'Paid',
        recordedBy: 'Cashier System',
        notes: 'Full payment received via NEFT/Bank Transfer.',
        createdAt: '2026-09-27T10:30:00Z',
      },
    ],
    paymentTerms: 'Net 15 Days',
    paymentStatus: 'Paid',
    saleStatus: 'Completed',
    createdBy: 'Suresh Kumar',
    salesperson: 'Karthik Raja',
    notes: 'Monthly bulk replenishment order for T. Nagar Supermarket.',
    createdAt: '2026-09-27T10:30:00Z',
    updatedAt: '2026-09-27T11:00:00Z',
  },
  {
    id: 'sale_2',
    invoiceNo: 'INV-2026-1002',
    invoiceStatus: 'Generated',
    saleDate: '2026-09-28',
    dueDate: '2026-10-05',
    customerId: 'cust_2',
    customerName: 'Priya Sundaram',
    customerCompany: 'Annapoorna Caterers & Kitchen',
    customerPhone: '+91 98840 55678',
    customerEmail: 'orders@annapoornacaterers.in',
    billingAddress: '42 100ft Road, Indiranagar, Bengaluru, Karnataka 560038',
    shippingAddress: '42 100ft Road, Indiranagar, Bengaluru, Karnataka 560038',
    items: [
      {
        id: 's_item_6',
        productId: 'PROD_1002',
        productName: 'India Gate Super Premium Basmati Rice (5 Kg)',
        sku: 'SKU-RIC-05K',
        quantity: 10,
        purchasePrice: 580,
        unitPrice: 699,
        discountPercent: 5,
        taxPercent: 5,
        total: 6972.53,
      },
      {
        id: 's_item_7',
        productId: 'PROD_1005',
        productName: 'Premium Unpolished Toor Dal / Arhar Dal (1 Kg)',
        sku: 'SKU-DAL-01K',
        quantity: 15,
        purchasePrice: 145,
        unitPrice: 178,
        discountPercent: 0,
        taxPercent: 0,
        total: 2670,
      },
      {
        id: 's_item_8',
        productId: 'PROD_1006',
        productName: 'Amul Pure Cow Ghee Tin (1 Ltr)',
        sku: 'SKU-GHE-01L',
        quantity: 4,
        purchasePrice: 560,
        unitPrice: 645,
        discountPercent: 0,
        taxPercent: 12,
        total: 2889.60,
      },
      {
        id: 's_item_9',
        productId: 'PROD_1012',
        productName: 'Madhur Pure & Hygienic Refined Sugar (5 Kg)',
        sku: 'SKU-SGR-05K',
        quantity: 6,
        purchasePrice: 210,
        unitPrice: 250,
        discountPercent: 0,
        taxPercent: 5,
        total: 1575,
      },
    ],
    subtotal: 13740,
    totalDiscount: 349.50,
    totalTax: 707.13,
    shippingCharges: 0,
    otherCharges: 0,
    grandTotal: 14097.63,
    paidAmount: 7000,
    balance: 7097.63,
    paymentMethod: 'UPI',
    paymentSplits: [
      { id: 'ps_102', method: 'UPI', amount: 7000, referenceNo: 'UPI-ICICI-8821' },
    ],
    paymentRecords: [
      {
        id: 'PAY-000102',
        invoiceNo: 'INV-2026-1002',
        paymentDate: '2026-09-28',
        paymentTime: '09:25 AM',
        method: 'UPI',
        referenceNo: 'UPI-ICICI-8821',
        amount: 7000,
        status: 'Paid',
        recordedBy: 'Billing Desk',
        notes: 'Advance 50% deposit received via GooglePay UPI.',
        createdAt: '2026-09-28T09:25:00Z',
      },
    ],
    paymentTerms: '50% Advance, 50% on Delivery',
    paymentStatus: 'Partial',
    saleStatus: 'Confirmed',
    createdBy: 'Anita Sharma',
    salesperson: 'Karthik Raja',
    notes: 'Bulk catering banquet supplies for weekend order.',
    createdAt: '2026-09-28T09:15:00Z',
    updatedAt: '2026-09-28T09:30:00Z',
  },
  {
    id: 'sale_3',
    invoiceNo: 'INV-2026-1003',
    invoiceStatus: 'Draft',
    saleDate: '2026-09-28',
    dueDate: '2026-10-28',
    customerId: 'cust_3',
    customerName: 'Anand Verma',
    customerCompany: 'Verma Provision Store',
    customerPhone: '+91 99401 88992',
    customerEmail: 'anand.verma@vermastores.com',
    billingAddress: '104 Begumpet Main Road, Hyderabad, Telangana 500016',
    shippingAddress: '104 Begumpet Main Road, Hyderabad, Telangana 500016',
    items: [
      {
        id: 's_item_10',
        productId: 'PROD_1009',
        productName: 'Surf Excel Easy Wash Detergent Powder (1 Kg)',
        sku: 'SKU-DET-01K',
        quantity: 12,
        purchasePrice: 125,
        unitPrice: 148,
        discountPercent: 0,
        taxPercent: 18,
        total: 2095.68,
      },
      {
        id: 's_item_11',
        productId: 'PROD_1008',
        productName: 'Maggi 2-Minute Masala Noodles (Pack of 12)',
        sku: 'SKU-MAG-12P',
        quantity: 10,
        purchasePrice: 142,
        unitPrice: 168,
        discountPercent: 0,
        taxPercent: 12,
        total: 1881.60,
      },
      {
        id: 's_item_12',
        productId: 'PROD_1010',
        productName: 'Cadbury Dairy Milk Silk Chocolate (150g)',
        sku: 'SKU-CAD-150',
        quantity: 10,
        purchasePrice: 135,
        unitPrice: 175,
        discountPercent: 0,
        taxPercent: 18,
        total: 2065,
      },
      {
        id: 's_item_13',
        productId: 'PROD_1011',
        productName: 'Dettol Original Liquid Handwash Refill (200ml)',
        sku: 'SKU-DET-200',
        quantity: 15,
        purchasePrice: 38,
        unitPrice: 49,
        discountPercent: 0,
        taxPercent: 18,
        total: 867.30,
      },
    ],
    subtotal: 5941,
    totalDiscount: 0,
    totalTax: 968.58,
    shippingCharges: 0,
    otherCharges: 0,
    grandTotal: 6909.58,
    paidAmount: 0,
    balance: 6909.58,
    paymentMethod: 'Credit',
    paymentSplits: [],
    paymentRecords: [],
    paymentTerms: 'Net 30 Days',
    paymentStatus: 'Unpaid',
    saleStatus: 'Draft',
    createdBy: 'Yaa Admin',
    salesperson: 'Anita Sharma',
    notes: 'FMCG and hygiene items dispatch on credit.',
    createdAt: '2026-09-28T11:45:00Z',
    updatedAt: '2026-09-28T11:45:00Z',
  },
  {
    id: 'sale_4',
    invoiceNo: 'INV-2026-1004',
    invoiceStatus: 'Generated',
    saleDate: '2026-09-29',
    dueDate: '2026-09-29',
    customerId: 'cust_4',
    customerName: 'Meenakshi Iyer',
    customerCompany: 'Household Account',
    customerPhone: '+91 97908 11223',
    customerEmail: 'meenakshi.iyer@gmail.com',
    billingAddress: 'Flat 4B, Shanthi Apartments, Mylapore, Chennai, Tamil Nadu 600004',
    shippingAddress: 'Flat 4B, Shanthi Apartments, Mylapore, Chennai, Tamil Nadu 600004',
    items: [
      {
        id: 's_item_14',
        productId: 'PROD_1001',
        productName: 'Aashirvaad Superior MP Sharbati Atta (10 Kg)',
        sku: 'SKU-ATT-10K',
        quantity: 1,
        purchasePrice: 420,
        unitPrice: 495,
        discountPercent: 0,
        taxPercent: 5,
        total: 519.75,
      },
      {
        id: 's_item_15',
        productId: 'PROD_1003',
        productName: 'Fortune Sunlite Refined Sunflower Oil (1 Ltr Pouch)',
        sku: 'SKU-OIL-01L',
        quantity: 2,
        purchasePrice: 138,
        unitPrice: 165,
        discountPercent: 0,
        taxPercent: 5,
        total: 346.50,
      },
      {
        id: 's_item_16',
        productId: 'PROD_1004',
        productName: 'Tata Salt Vacuum Evaporated Iodized (1 Kg)',
        sku: 'SKU-SLT-01K',
        quantity: 1,
        purchasePrice: 22,
        unitPrice: 28,
        discountPercent: 0,
        taxPercent: 0,
        total: 28,
      },
      {
        id: 's_item_17',
        productId: 'PROD_1007',
        productName: 'Brooke Bond Red Label Strong Tea (500g)',
        sku: 'SKU-TEA-500',
        quantity: 1,
        purchasePrice: 230,
        unitPrice: 275,
        discountPercent: 0,
        taxPercent: 5,
        total: 288.75,
      },
    ],
    subtotal: 1128,
    totalDiscount: 28,
    totalTax: 55,
    shippingCharges: 0,
    otherCharges: 0,
    grandTotal: 1155,
    paidAmount: 1155,
    balance: 0,
    paymentMethod: 'Cash',
    paymentSplits: [
      { id: 'ps_104', method: 'Cash', amount: 1155, referenceNo: 'CASH-POS-99' },
    ],
    paymentRecords: [
      {
        id: 'PAY-000104',
        invoiceNo: 'INV-2026-1004',
        paymentDate: '2026-09-29',
        paymentTime: '11:15 AM',
        method: 'Cash',
        referenceNo: 'CASH-POS-99',
        amount: 1155,
        status: 'Paid',
        recordedBy: 'Counter Cashier',
        notes: 'Cash received at POS Counter 1.',
        createdAt: '2026-09-29T11:15:00Z',
      },
    ],
    paymentTerms: 'Immediate / Cash',
    paymentStatus: 'Paid',
    saleStatus: 'Completed',
    createdBy: 'Counter Cashier',
    salesperson: 'Anita Sharma',
    notes: 'Walk-in customer retail bill.',
    createdAt: '2026-09-29T11:15:00Z',
    updatedAt: '2026-09-29T11:15:00Z',
  },
];

export const INITIAL_SALES_RETURNS: SalesReturn[] = [
  {
    id: 'ret_1',
    returnNo: 'SR-2026-0001',
    invoiceNo: 'INV-2026-1001',
    saleId: 'sale_1',
    customerId: 'cust_1',
    customerName: 'Ramesh Kumar',
    customerCompany: 'Kumar Daily Supermarket',
    returnDate: '2026-09-28',
    items: [
      {
        id: 'ret_item_1',
        productId: 'PROD_1003',
        productName: 'Fortune Sunlite Refined Sunflower Oil (1 Ltr Pouch)',
        soldQuantity: 10,
        returnQuantity: 1,
        unitPrice: 165,
        returnAmount: 173.25,
        reason: 'Damaged',
        notes: 'Oil pouch found leaking at bottom seal, returned unopened.',
      },
    ],
    returnAmount: 173.25,
    refundMethod: 'Bank Transfer',
    refundAmount: 173.25,
    refundStatus: 'Refunded',
    returnStatus: 'Refunded',
    notes: 'Refund transferred to customer bank account.',
    createdAt: '2026-09-28T10:00:00Z',
    updatedAt: '2026-09-28T11:30:00Z',
  },
];

export const INITIAL_PURCHASE_REQUESTS: PurchaseRequest[] = [
  {
    id: 'pr_1',
    requestNo: 'PR-2026-0041',
    requestDate: '2026-09-27',
    requestedBy: 'Suresh Storekeeper',
    department: 'Grocery Inventory',
    requiredDate: '2026-10-05',
    priority: 'High',
    status: 'Approved',
    items: [
      {
        id: 'pr_item_1',
        productId: 'PROD_1002',
        productName: 'India Gate Super Premium Basmati Rice (5 Kg)',
        currentStock: 25,
        requestedQuantity: 80,
        estimatedUnitPrice: 580,
        requiredDate: '2026-10-05',
        remarks: 'Festival bulk demand anticipated.',
      },
    ],
    notes: 'Procure high grade 5kg basmati bags.',
    approvedBy: 'James Wilson',
    approvedAt: '2026-09-27T12:00:00Z',
    createdAt: '2026-09-27T10:00:00Z',
    updatedAt: '2026-09-27T12:00:00Z',
  },
  {
    id: 'pr_2',
    requestNo: 'PR-2026-0042',
    requestDate: '2026-09-28',
    requestedBy: 'Anita Cashier',
    department: 'FMCG Counter',
    requiredDate: '2026-10-02',
    priority: 'Urgent',
    status: 'Pending Approval',
    items: [
      {
        id: 'pr_item_2',
        productId: 'PROD_1011',
        productName: 'Dettol Original Liquid Handwash Refill (200ml)',
        currentStock: 8,
        requestedQuantity: 50,
        estimatedUnitPrice: 38,
        requiredDate: '2026-10-02',
        remarks: 'Current stock below safety threshold (8 units left).',
      },
    ],
    notes: 'Urgent refill order from HUL Agency.',
    createdAt: '2026-09-28T14:00:00Z',
    updatedAt: '2026-09-28T14:00:00Z',
  },
];

export const INITIAL_PURCHASES: PurchaseOrder[] = [
  {
    id: 'po_1',
    purchaseNo: 'PO-2026-0201',
    purchaseInvoiceNo: 'ITC-BILL-9941',
    supplierId: 'sup_1',
    supplierName: 'ITC FMCG Wholesale Distribution Hub',
    supplierCode: 'SUP-1001',
    purchaseDate: '2026-09-24',
    dueDate: '2026-10-09',
    items: [
      {
        id: 'po_item_1',
        productId: 'PROD_1001',
        productName: 'Aashirvaad Superior MP Sharbati Atta (10 Kg)',
        quantity: 50,
        purchasePrice: 420,
        discountPercent: 0,
        taxPercent: 5,
        total: 22050,
      },
      {
        id: 'po_item_2',
        productId: 'PROD_1005',
        productName: 'Premium Unpolished Toor Dal / Arhar Dal (1 Kg)',
        quantity: 100,
        purchasePrice: 145,
        discountPercent: 0,
        taxPercent: 0,
        total: 14500,
      },
    ],
    subtotal: 35500,
    discount: 0,
    tax: 1050,
    shipping: 840,
    otherCharges: 0,
    grandTotal: 37390,
    paidAmount: 15000,
    balance: 22390,
    paymentMethod: 'Bank Transfer',
    paymentTerms: 'Net 15 Days',
    paymentStatus: 'Partial',
    purchaseStatus: 'Received',
    notes: 'Monthly staples consignment received and verified in good condition.',
    createdAt: '2026-09-24T11:00:00Z',
    updatedAt: '2026-09-25T15:00:00Z',
  },
  {
    id: 'po_1_2',
    purchaseNo: 'PO-2026-0204',
    purchaseInvoiceNo: 'ITC-BILL-9988',
    supplierId: 'sup_1',
    supplierName: 'ITC FMCG Wholesale Distribution Hub',
    supplierCode: 'SUP-1001',
    purchaseDate: '2026-10-01',
    dueDate: '2026-10-16',
    items: [
      {
        id: 'po_item_1_3',
        productId: 'PROD_1001',
        productName: 'Sunfeast Dark Fantasy Choco Fills (300g)',
        quantity: 80,
        purchasePrice: 110,
        discountPercent: 0,
        taxPercent: 5,
        total: 9240,
      },
    ],
    subtotal: 8800,
    discount: 0,
    tax: 440,
    shipping: 0,
    otherCharges: 0,
    grandTotal: 9240,
    paidAmount: 0,
    balance: 9240,
    paymentMethod: 'Bank Transfer',
    paymentTerms: 'Net 30 Days',
    paymentStatus: 'Unpaid',
    purchaseStatus: 'Ordered',
    notes: 'Festival special biscuit stock dispatch.',
    createdAt: '2026-10-01T09:30:00Z',
    updatedAt: '2026-10-01T09:30:00Z',
  },
  {
    id: 'po_2',
    purchaseNo: 'PO-2026-0202',
    purchaseInvoiceNo: 'AW-DEPOT-4401',
    supplierId: 'sup_3',
    supplierName: 'Adani Wilmar & Fortune Oils Depot',
    supplierCode: 'SUP-1003',
    purchaseDate: '2026-09-26',
    dueDate: '2026-10-26',
    items: [
      {
        id: 'po_item_3',
        productId: 'PROD_1003',
        productName: 'Fortune Sunlite Refined Sunflower Oil (1 Ltr Pouch)',
        quantity: 150,
        purchasePrice: 138,
        discountPercent: 0,
        taxPercent: 5,
        total: 21735,
      },
    ],
    subtotal: 20700,
    discount: 0,
    tax: 1035,
    shipping: 0,
    otherCharges: 0,
    grandTotal: 21735,
    paidAmount: 10000,
    balance: 11735,
    paymentMethod: 'Bank Transfer',
    paymentTerms: 'Net 30 Days',
    paymentStatus: 'Partial',
    purchaseStatus: 'Ordered',
    notes: 'Edible cooking oil bulk consignment delivery.',
    createdAt: '2026-09-26T10:00:00Z',
    updatedAt: '2026-09-26T14:30:00Z',
  },
  {
    id: 'po_3',
    purchaseNo: 'PO-2026-0203',
    purchaseInvoiceNo: 'TCP-HUB-1088',
    supplierId: 'sup_4',
    supplierName: 'Tata Consumer Products Central Supply',
    supplierCode: 'SUP-1004',
    purchaseDate: '2026-09-27',
    dueDate: '2026-10-12',
    items: [
      {
        id: 'po_item_4',
        productId: 'PROD_1004',
        productName: 'Tata Salt Vacuum Evaporated Iodized (1 Kg)',
        quantity: 200,
        purchasePrice: 22,
        discountPercent: 0,
        taxPercent: 0,
        total: 4400,
      },
      {
        id: 'po_item_5',
        productId: 'PROD_1007',
        productName: 'Brooke Bond Red Label Strong Tea (500g)',
        quantity: 50,
        purchasePrice: 230,
        discountPercent: 0,
        taxPercent: 5,
        total: 12075,
      },
    ],
    subtotal: 15900,
    discount: 0,
    tax: 575,
    shipping: 0,
    otherCharges: 0,
    grandTotal: 16475,
    paidAmount: 8000,
    balance: 8475,
    paymentMethod: 'UPI',
    paymentTerms: 'Immediate / Cash',
    paymentStatus: 'Partial',
    purchaseStatus: 'Received',
    notes: 'Tea cartons and salt bulk sack delivery.',
    createdAt: '2026-09-27T11:00:00Z',
    updatedAt: '2026-09-27T16:00:00Z',
  },
  {
    id: 'po_4',
    purchaseNo: 'PO-2026-0205',
    purchaseInvoiceNo: 'HUL-INV-8821',
    supplierId: 'sup_2',
    supplierName: 'Hindustan Unilever Regional Agency',
    supplierCode: 'SUP-1002',
    purchaseDate: '2026-09-29',
    dueDate: '2026-10-14',
    items: [
      {
        id: 'po_item_6',
        productId: 'PROD_1011',
        productName: 'Dettol Original Liquid Handwash Refill (200ml)',
        quantity: 100,
        purchasePrice: 38,
        discountPercent: 0,
        taxPercent: 18,
        total: 4484,
      },
    ],
    subtotal: 3800,
    discount: 0,
    tax: 684,
    shipping: 0,
    otherCharges: 0,
    grandTotal: 4484,
    paidAmount: 0,
    balance: 4484,
    paymentMethod: 'Bank Transfer',
    paymentTerms: 'Net 15 Days',
    paymentStatus: 'Unpaid',
    purchaseStatus: 'Ordered',
    notes: 'Personal care consignment.',
    createdAt: '2026-09-29T10:00:00Z',
    updatedAt: '2026-09-29T10:00:00Z',
  },
];

export const INITIAL_PURCHASE_RETURNS: PurchaseReturn[] = [
  {
    id: 'pret_1',
    returnNo: 'PR-RET-2026-001',
    purchaseNo: 'PO-2026-0202',
    purchaseId: 'po_2',
    supplierId: 'sup_3',
    supplierName: 'Adani Wilmar & Fortune Oils Depot',
    returnDate: '2026-09-26',
    items: [
      {
        id: 'pr_ret_item_1',
        productId: 'PROD_1003',
        productName: 'Fortune Sunlite Refined Sunflower Oil (1 Ltr Pouch)',
        purchasedQuantity: 150,
        returnQuantity: 2,
        unitPrice: 138,
        returnAmount: 289.80,
        reason: 'Damaged',
        remarks: 'Carton corner punctured, 2 pouches ruptured.',
      },
    ],
    returnAmount: 289.80,
    refundStatus: 'Supplier Credit',
    returnStatus: 'Completed',
    notes: 'Supplier credit note CN-FORTUNE-889 issued.',
    createdAt: '2026-09-26T15:00:00Z',
    updatedAt: '2026-09-27T11:00:00Z',
  },
];

export const INITIAL_QUOTATIONS: SaleQuotation[] = [
  {
    id: 'quot-1',
    quotationNo: 'EST-001',
    referenceNo: '1',
    date: '2026-10-01',
    validUntil: '2026-10-31',
    customerId: 'cust_1',
    partyName: 'Keerthivasan',
    customerCompany: 'Keerthi Retails & Mart',
    customerPhone: '+91 98765 43210',
    customerEmail: 'keerthi@gmail.com',
    billingAddress: '42, North Car Street, Gandhi Nagar, Madurai, TN - 625020',
    shippingAddress: '42, North Car Street, Gandhi Nagar, Madurai, TN - 625020',
    items: [
      {
        id: 'item_q1',
        productId: 'PROD_1001',
        productName: 'Aashirvaad Superior MP Sharbati Atta (10 Kg)',
        sku: 'SKU-ATT-10K',
        quantity: 10,
        unitPrice: 476.19,
        discountPercent: 0,
        taxPercent: 5,
        total: 5000,
      },
    ],
    subtotal: 4761.90,
    withGst: true,
    gstType: 'intra_state',
    cgst: 119.05,
    sgst: 119.05,
    discount: 0,
    taxAmount: 238.10,
    amount: 5000,
    balance: 5000,
    status: 'Open',
    notes: 'Quotation valid for 30 days from date of issue. Special wholesale pricing applicable.',
    terms: '1. Prices are inclusive of GST.\n2. Payment terms: 100% on delivery or 15 days credit upon approval.\n3. Goods will be dispatched within 24-48 hours after confirmation.',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
];

export const INITIAL_PAYMENTS_OUT: PaymentOut[] = [
  {
    id: 'pay_out_1',
    paymentNo: 'VPA-2026-001',
    paymentDate: '2026-09-25',
    supplierId: 'sup_1',
    supplierName: 'ITC FMCG Wholesale Distribution Hub',
    supplierCode: 'SUP-1001',
    purchaseId: 'po_1',
    purchaseNo: 'PO-2026-0201',
    amount: 37390,
    paymentMode: 'Bank Transfer',
    referenceNo: 'HDFC-NEFT-99281',
    notes: 'Paid in full for staples consignment PO-2026-0201',
    status: 'Completed',
    createdAt: '2026-09-25T15:00:00Z',
    updatedAt: '2026-09-25T15:00:00Z',
  },
  {
    id: 'pay_out_2',
    paymentNo: 'VPA-2026-002',
    paymentDate: '2026-09-26',
    supplierId: 'sup_3',
    supplierName: 'Adani Wilmar & Fortune Oils Depot',
    supplierCode: 'SUP-1003',
    purchaseId: 'po_2',
    purchaseNo: 'PO-2026-0202',
    amount: 10000,
    paymentMode: 'Bank Transfer',
    referenceNo: 'ICICI-IMPS-44912',
    notes: 'Advance part-payment for edible oils bulk shipment',
    status: 'Completed',
    createdAt: '2026-09-26T14:30:00Z',
    updatedAt: '2026-09-26T14:30:00Z',
  },
  {
    id: 'pay_out_3',
    paymentNo: 'VPA-2026-003',
    paymentDate: '2026-09-27',
    supplierId: 'sup_4',
    supplierName: 'Tata Consumer Products Central Supply',
    supplierCode: 'SUP-1004',
    purchaseId: 'po_3',
    purchaseNo: 'PO-2026-0203',
    amount: 16475,
    paymentMode: 'UPI',
    referenceNo: 'UPI/tataproducts@icici/3392',
    notes: 'Direct settlement on delivery of tea & salt stocks',
    status: 'Completed',
    createdAt: '2026-09-27T16:00:00Z',
    updatedAt: '2026-09-27T16:00:00Z',
  },
];

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
};

const SEED_VERSION_KEY = 'yaa_crm_grocery_mock_v3';
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
      localStorage.setItem(SEED_VERSION_KEY, 'true');
      return initial;
    }

    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
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
  const saveSale = (sale: SaleTransaction) => {
    const current = getStorage<SaleTransaction[]>(KEYS.SALES, INITIAL_SALES);
    const exists = current.find((s) => s.id === sale.id);
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

  // ----------------------------------------
  // Purchase Request Actions
  // ----------------------------------------
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
    saveCustomer,
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
    deleteSupplier,
    savePurchaseRequest,
    deletePurchaseRequest,
    updatePurchaseRequestStatus,
    savePurchase,
    deletePurchase,
    updatePurchasePayment,
    savePurchaseReturn,
    deletePurchaseReturn,
    savePaymentOut,
    deletePaymentOut,
    saveQuotation,
    deleteQuotation,
    updateQuotationStatus,
    convertQuotationToSale,
    savePaymentIn,
    deletePaymentIn,
    updatePaymentIn,
    adjustStock,
    addStockBatch,
    updateStockItem,
    reloadAll,
  };
};
