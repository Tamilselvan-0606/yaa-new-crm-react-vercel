import { useState, useEffect } from 'react';
import { SavedInvoice, SavedInvoiceItem, InvoicePaymentDetails } from './useInvoiceStore';

export type { SavedInvoice, SavedInvoiceItem, InvoicePaymentDetails };

const PROFORMA_STORAGE_KEY = 'company_mgmt_saved_proforma_invoices';

const defaultProformaInvoices: SavedInvoice[] = [
  {
    id: 'prof_1',
    invoiceNumber: 'PI-2026-1045',
    invoiceDate: '2026-09-02',
    dueDate: '2026-10-02',
    referenceNumbers: ['REF-PI-891'],
    description: 'Proforma Invoice for enterprise software deployment, custom webhooks, and cloud infrastructure SLA.',
    status: 'Pending',
    client: {
      id: 'cust_101',
      company: 'YaaCreations',
      name: 'Alex Rivera',
      email: 'yaaadmin@gmail.com',
      phone: '+91 98765 43210',
      gstin: '27AABCT8892K1Z5',
      location: 'Hyderabad, TG',
      industry: 'Media, Branding & Digital Creative Tech',
    },
    company: {
      name: 'Yaa Creations',
      taxId: '27AABCA1234F1Z8',
      pan: 'ABCDE1234F',
      address: 'Plot No 42, Silicon Valley High-Tech Zone, Madhapur, Hyderabad, TG 500081',
      email: 'billing@yaacreations.com',
      phone: '+91 98765 43210',
    },
    bank: {
      bankName: 'HDFC Bank Ltd',
      accountName: 'Yaa Creations',
      accountNumber: '50200098412356',
      ifscCode: 'HDFC0001234',
      branchName: 'Madhapur Branch',
      upiId: 'yaacreations@hdfcbank',
    },
    items: [
      {
        id: 'pitem_1',
        name: 'Yaa Connect - Enterprise Scale License',
        description: 'Omnichannel routing setup with high-speed automated call routing SLA.',
        hsnCode: '998313',
        qty: 1,
        unitPrice: 35000,
        taxPercent: 18,
        discount: 0,
        subtotal: 35000,
        total: 41300,
      },
      {
        id: 'pitem_2',
        name: 'Dedicated Telecom Carrier Provisioning',
        description: 'Telecom trunk configuration, carrier redundancy, and webhook endpoints.',
        hsnCode: '998314',
        qty: 1,
        unitPrice: 10000,
        taxPercent: 18,
        discount: 0,
        subtotal: 10000,
        total: 11800,
      },
    ],
    subtotal: 45000,
    totalDiscount: 0,
    taxableAmount: 45000,
    taxTotal: 8100,
    roundMode: 'none',
    roundOffAmount: 0,
    grandTotal: 53100,
    createdAt: '2026-09-02T10:30:00Z',
  },
  {
    id: 'prof_2',
    invoiceNumber: 'PI-2026-1046',
    invoiceDate: '2026-08-28',
    dueDate: '2026-09-28',
    referenceNumbers: ['REF-PI-314'],
    description: 'Proforma Invoice for Q3 omnichannel digital marketing campaign and creative production.',
    status: 'Partially Paid',
    client: {
      id: 'cust_102',
      company: 'Polihills',
      name: 'Sarah Jenkins',
      email: 'info@polihills.com',
      phone: '+91 98765 43211',
      gstin: '27AABCN4412M1Z3',
      location: 'Hyderabad, TG',
      industry: 'Real Estate, Commercial Infra & Development',
    },
    company: {
      name: 'Yaa Creations',
      taxId: '27AABCA1234F1Z8',
      pan: 'ABCDE1234F',
      address: 'Plot No 42, Silicon Valley High-Tech Zone, Madhapur, Hyderabad, TG 500081',
      email: 'billing@yaacreations.com',
      phone: '+91 98765 43210',
    },
    bank: {
      bankName: 'HDFC Bank Ltd',
      accountName: 'Yaa Creations',
      accountNumber: '50200098412356',
      ifscCode: 'HDFC0001234',
      branchName: 'Madhapur Branch',
      upiId: 'yaacreations@hdfcbank',
    },
    items: [
      {
        id: 'pitem_3',
        name: 'Enterprise Authority & Omnichannel Marketing (Q3)',
        description: 'Omnichannel social campaign with studio-grade reels and paid media.',
        hsnCode: '998319',
        qty: 1,
        unitPrice: 24000,
        taxPercent: 18,
        discount: 0,
        subtotal: 24000,
        total: 28320,
      },
    ],
    subtotal: 24000,
    totalDiscount: 0,
    taxableAmount: 24000,
    taxTotal: 4320,
    roundMode: 'none',
    roundOffAmount: 0,
    grandTotal: 28320,
    paymentDetails: {
      amountPaid: 15000,
      taxDeductedType: 'none',
      tdsDeduction: 0,
      bankDeductions: 0,
      netReceived: 15000,
      paymentMode: 'Net Banking (NEFT/RTGS)',
      paymentDate: '2026-08-30',
      recordedAt: '2026-08-30T14:20:00Z',
    },
    createdAt: '2026-08-28T14:15:00Z',
  },
];

export const getSavedProformaInvoices = (): SavedInvoice[] => {
  try {
    const raw = localStorage.getItem(PROFORMA_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PROFORMA_STORAGE_KEY, JSON.stringify(defaultProformaInvoices));
      return defaultProformaInvoices;
    }
    const list: SavedInvoice[] = JSON.parse(raw);
    // Check if saved data still has old/stale client companies; reset if so
    const ALLOWED_ORGS = ['YaaCreations', 'Polihills', 'Enmin Labs'];
    const isStale = list.some(
      (inv) => !ALLOWED_ORGS.some((org) => (inv.client?.company || '').trim() === org.trim())
    );
    if (isStale) {
      localStorage.setItem(PROFORMA_STORAGE_KEY, JSON.stringify(defaultProformaInvoices));
      return defaultProformaInvoices;
    }
    return list.map((inv) => {
      if (inv.id === 'prof_1' && Array.isArray(inv.referenceNumbers) && inv.referenceNumbers.length > 1) {
        return {
          ...inv,
          referenceNumbers: ['REF-PI-891'],
        };
      }
      return inv;
    });
  } catch (err) {
    console.error('Failed to load proforma invoices from localStorage', err);
    return defaultProformaInvoices;
  }
};

export const saveProformaInvoiceToStorage = (invoice: SavedInvoice): SavedInvoice[] => {
  try {
    const current = getSavedProformaInvoices();
    const updated = [invoice, ...current.filter((inv) => inv.id !== invoice.id && inv.invoiceNumber !== invoice.invoiceNumber)];
    localStorage.setItem(PROFORMA_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('proforma_invoices_updated'));
    return updated;
  } catch (err) {
    console.error('Failed to save proforma invoice to localStorage', err);
    return getSavedProformaInvoices();
  }
};

export const deleteProformaInvoiceFromStorage = (id: string): SavedInvoice[] => {
  try {
    const current = getSavedProformaInvoices();
    const updated = current.filter((inv) => inv.id !== id);
    localStorage.setItem(PROFORMA_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('proforma_invoices_updated'));
    return updated;
  } catch (err) {
    console.error('Failed to delete proforma invoice from localStorage', err);
    return getSavedProformaInvoices();
  }
};

export const useProformaInvoiceStore = () => {
  const [proformaInvoices, setProformaInvoices] = useState<SavedInvoice[]>(getSavedProformaInvoices());

  useEffect(() => {
    const handleUpdate = () => {
      setProformaInvoices(getSavedProformaInvoices());
    };
    window.addEventListener('proforma_invoices_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('proforma_invoices_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const addProformaInvoice = (invoice: SavedInvoice) => {
    const updated = saveProformaInvoiceToStorage(invoice);
    setProformaInvoices(updated);
  };

  const deleteProformaInvoice = (id: string) => {
    const updated = deleteProformaInvoiceFromStorage(id);
    setProformaInvoices(updated);
  };

  return {
    proformaInvoices,
    addProformaInvoice,
    deleteProformaInvoice,
  };
};
