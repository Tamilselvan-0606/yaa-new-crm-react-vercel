import { useState, useEffect } from 'react';

export interface SavedInvoiceItem {
  id: string;
  name: string;
  description?: string;
  hsnCode?: string;
  qty: number;
  unitPrice: number;
  taxPercent: number;
  discount: number;
  subtotal: number;
  total: number;
}

export interface InvoicePaymentDetails {
  amountPaid: number;
  taxDeductedType?: 'none' | 'gst' | 'income_tax' | 'both';
  tdsSection?: string;
  tdsPercentage?: number;
  gstTdsPercentage?: number;
  incomeTaxTdsPercentage?: number;
  tdsDeduction: number;
  bankDeductions: number;
  netReceived: number;
  paymentMode: string;
  paymentDate: string;
  referenceId?: string;
  notes?: string;
  attachments?: Array<{
    id: string;
    name: string;
    size: string;
    type?: string;
    dataUrl?: string;
  }>;
  recordedAt: string;
}

export interface SavedInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  referenceNumbers: string[];
  description: string;
  customFields?: Array<{ id: string; label: string; value: string; type?: string }>;
  status: 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled' | 'Pending' | 'Approved' | 'Converted';
  client: {
    id: string;
    company: string;
    name: string;
    email: string;
    phone: string;
    gstin?: string;
    taxId?: string;
    pan?: string;
    location?: string;
    industry?: string;
  };
  company: {
    name: string;
    taxId: string;
    pan?: string;
    address: string;
    email: string;
    phone: string;
  };
  bank: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
    upiId?: string;
  };
  items: SavedInvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  taxTotal: number;
  roundMode?: 'none' | 'up' | 'down';
  roundOffAmount?: number;
  grandTotal: number;
  amountPaid?: number;
  balanceDue?: number;
  payments?: Array<{
    id: string;
    invoiceId: string;
    amount: number;
    paymentDate: string;
    paymentMode: string;
    referenceNumber?: string | null;
    notes?: string | null;
    createdAt: string;
  }>;
  paymentDetails?: InvoicePaymentDetails;
  createdAt: string;
}

const STORAGE_KEY = 'company_mgmt_saved_sales_invoices';

const sanitizeCustomFields = (fields?: Array<{ id: string; label: string; value: string }>) => {
  if (!fields) return [];
  const duplicateKeys = new Set([
    'invoice-number',
    'invoice-date',
    'reference-number',
    'due-date',
    'invoice number',
    'invoice no',
    'invoice #',
    'invoice date',
    'reference number',
    'reference no',
    'reference',
    'due date',
  ]);
  return fields.filter((f) => {
    const idNorm = (f.id || '').toLowerCase().trim();
    const labelNorm = (f.label || '').toLowerCase().trim().replace(/[:#]/g, '').trim();
    return !duplicateKeys.has(idNorm) && !duplicateKeys.has(labelNorm);
  });
};

export const getSavedInvoices = (): SavedInvoice[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: SavedInvoice[] = JSON.parse(raw);
    return list.map((inv) => ({
      ...inv,
      company: {
        ...inv.company,
        name: (inv.company?.name || '').includes('Apex') ? 'Yaa Creations' : (inv.company?.name || 'Yaa Creations'),
      },
      bank: {
        ...inv.bank,
        accountName: (inv.bank?.accountName || '').includes('Apex') ? 'Yaa Creations' : (inv.bank?.accountName || 'Yaa Creations'),
      },
      customFields: sanitizeCustomFields(inv.customFields),
    }));
  } catch (err) {
    console.error('Failed to load saved invoices from localStorage', err);
    return [];
  }
};

export const saveInvoiceToStorage = (invoice: SavedInvoice): SavedInvoice[] => {
  try {
    const current = getSavedInvoices();
    const cleanInvoice: SavedInvoice = {
      ...invoice,
      company: {
        ...invoice.company,
        name: (invoice.company?.name || '').includes('Apex') ? 'Yaa Creations' : (invoice.company?.name || 'Yaa Creations'),
      },
      bank: {
        ...invoice.bank,
        accountName: (invoice.bank?.accountName || '').includes('Apex') ? 'Yaa Creations' : (invoice.bank?.accountName || 'Yaa Creations'),
      },
      customFields: sanitizeCustomFields(invoice.customFields),
    };
    const updated = [cleanInvoice, ...current.filter((inv) => inv.id !== cleanInvoice.id && inv.invoiceNumber !== cleanInvoice.invoiceNumber)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('sales_invoices_updated'));
    return updated;
  } catch (err) {
    console.error('Failed to save invoice to localStorage', err);
    return getSavedInvoices();
  }
};

export const deleteInvoiceFromStorage = (id: string): SavedInvoice[] => {
  try {
    const current = getSavedInvoices();
    const updated = current.filter((inv) => inv.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('sales_invoices_updated'));
    return updated;
  } catch (err) {
    console.error('Failed to delete invoice from localStorage', err);
    return getSavedInvoices();
  }
};

export const useInvoiceStore = () => {
  const [invoices, setInvoices] = useState<SavedInvoice[]>(getSavedInvoices());

  useEffect(() => {
    const handleUpdate = () => {
      setInvoices(getSavedInvoices());
    };
    window.addEventListener('sales_invoices_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('sales_invoices_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const addInvoice = (invoice: SavedInvoice) => {
    const updated = saveInvoiceToStorage(invoice);
    setInvoices(updated);
  };

  const deleteInvoice = (id: string) => {
    const updated = deleteInvoiceFromStorage(id);
    setInvoices(updated);
  };

  return {
    invoices,
    addInvoice,
    deleteInvoice,
  };
};
