import { useState, useEffect } from 'react';
import { SavedInvoice, SavedInvoiceItem, InvoicePaymentDetails } from './useInvoiceStore';

export type { SavedInvoice, SavedInvoiceItem, InvoicePaymentDetails };

const PROFORMA_STORAGE_KEY = 'company_mgmt_saved_proforma_invoices';

const defaultProformaInvoices: SavedInvoice[] = [];

export const getSavedProformaInvoices = (): SavedInvoice[] => {
  try {
    const raw = localStorage.getItem(PROFORMA_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load proforma invoices from localStorage', err);
    return [];
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
