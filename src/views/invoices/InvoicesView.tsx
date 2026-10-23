import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusCircle,
  Pencil,
  Search,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Printer,
  Phone,
  Mail,
  X,
  Plus,
  FileText,
  Landmark,
  User,
  Calendar,
  Layers,
  Sparkles,
  Copy,
  Check,
  MoreVertical,
  Loader2,
  Send
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useInvoiceStore, SavedInvoice, SavedInvoiceItem, InvoicePaymentDetails } from '../../store/useInvoiceStore';
import { useProformaInvoiceStore } from '../../store/useProformaInvoiceStore';
import { CustomSelect } from '../../components/common/CustomSelect';
import { RecordPaymentModal } from '../../components/forms/RecordPaymentModal';
import { InvoicePDFDocument } from '../../components/invoices/InvoicePDFDocument';
import { sendWhatsAppDocument } from '../../services/whatsappGateway';
import { SearchBar } from '../../components/common/SearchBar';
import { FilterDropdown } from '../../components/common/FilterDropdown';
import { Pagination } from '../../components/common/Pagination';
import { Button } from '../../components/common/Button';
import { ConfirmationModal } from '../../utils/confirmationModal';
import {
  proformaInvoiceApi,
  ProformaInvoiceApiItem,
  ProformaInvoiceStatus,
  UpdateProformaRequest,
  invoiceApi,
  InvoiceApiItem,
  InvoiceStatus,
  UpdateInvoiceRequest,
  RecordPaymentRequest,
  getStoredOrganizationId,
  organizationApi,
  OrganizationApiItem,
} from '../../api';

interface InvoicesViewProps {
  isProforma?: boolean;
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // Check if format is YYYY-MM-DD
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2].slice(0, 2).padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
      return dateStr;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const mapApiProformaToSavedInvoice = (api: ProformaInvoiceApiItem): SavedInvoice => {
  const rawInvoiceDate = api.invoiceDate || (api as any).date || '';
  const rawDueDate = api.dueDate || '';
  return {
    id: api.id,
    invoiceNumber: api.proformaNumber || 'PI-0000',
    invoiceDate: formatDate(rawInvoiceDate),
    dueDate: rawDueDate ? formatDate(rawDueDate) : '',
    referenceNumbers: api.sourceQuoteId ? [`QUOTE-${api.sourceQuoteId.slice(0, 8)}`] : ['REF-PI'],
    description: api.notes || 'Proforma Invoice',
    status: (api.status as any) || 'Draft',
    client: {
      id: api.customerId || api.organizationId,
      company: api.customerName || 'Client Organization',
      name: api.customerName || 'Customer',
      email: api.customerEmail || '',
      phone: api.customerPhone || '',
      gstin: api.gstin || '33AAAAA0000A1Z5',
      location: api.billingAddress || 'Chennai, TN',
      industry: 'Technology',
    },
    company: {
      name: 'Yaa Creations',
      taxId: '27AABCA1234F1Z8',
      pan: 'ABCDE1234F',
      address: 'Plot No 42, Silicon Valley High-Tech Zone, Madhapur, Hyderabad, TG 500081',
      email: 'billing@yaacreations.com',
      phone: '+91 98765 43210',
    },
    bank: (api as any).bank || {
      bankName: 'HDFC Bank',
      accountName: 'Yaa Creations Tech Pvt Ltd',
      accountNumber: '50200012345678',
      ifscCode: 'HDFC0001234',
      branchName: 'Guindy Branch, Chennai',
      upiId: 'yaacreations@hdfcbank',
    },
    items: (api.items || []).map((it, idx) => {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.unitPrice) || 0;
      const taxRate = Number(it.gstPercent) || 0;
      const sub = qty * price;
      const taxAmount = Number(it.taxAmount) || (sub * taxRate) / 100;
      const total = Number(it.lineTotal) || sub + taxAmount;
      return {
        id: it.id || `pitem_${idx + 1}`,
        name: it.itemDescription || it.itemId || `Line Item ${idx + 1}`,
        description: it.itemDescription || '',
        hsnCode: it.hsnCode || '998314',
        qty,
        unitPrice: price,
        taxPercent: taxRate,
        discount: 0,
        subtotal: sub,
        total,
      };
    }),
    subtotal: Number(api.subTotal) || 0,
    totalDiscount: Number(api.discountTotal) || 0,
    taxableAmount: Math.max(0, (Number(api.subTotal) || 0) - (Number(api.discountTotal) || 0)),
    taxTotal: Number(api.taxTotal) || 0,
    roundMode: 'none',
    roundOffAmount: 0,
    grandTotal: Number(api.grandTotal) || 0,
    createdAt: api.createdAt,
    ...(api as any),
  };
};

const mapApiInvoiceToSavedInvoice = (api: InvoiceApiItem): SavedInvoice => {
  const latestPayment = api.payments && api.payments.length > 0 ? api.payments[api.payments.length - 1] : undefined;

  let paymentDetails: InvoicePaymentDetails | undefined = undefined;
  if (api.amountPaid > 0 || (api.payments && api.payments.length > 0)) {
    paymentDetails = {
      amountPaid: Number(api.amountPaid) || 0,
      taxDeductedType: 'none',
      tdsDeduction: 0,
      bankDeductions: 0,
      netReceived: Number(api.amountPaid) || 0,
      paymentMode: latestPayment?.paymentMode || 'Bank Transfer',
      paymentDate: latestPayment?.paymentDate ? latestPayment.paymentDate.split('T')[0] : (api.updatedAt ? api.updatedAt.split('T')[0] : new Date().toISOString().split('T')[0]),
      referenceId: latestPayment?.referenceNumber || undefined,
      notes: latestPayment?.notes || undefined,
      recordedAt: latestPayment?.createdAt || api.updatedAt || new Date().toISOString(),
    };
  }

  const rawInvoiceDate = api.invoiceDate || (api as any).date || '';
  const rawDueDate = api.dueDate || '';

  return {
    id: api.id,
    invoiceNumber: api.invoiceNumber || 'INV-0000',
    invoiceDate: formatDate(rawInvoiceDate),
    dueDate: rawDueDate ? formatDate(rawDueDate) : '',
    referenceNumbers: api.sourceId ? [`REF-${api.sourceId.slice(0, 8)}`] : [],
    description: api.notes || 'Sales Invoice',
    status: (api.status as any) || (api.amountPaid >= api.grandTotal - 0.001 ? 'Paid' : api.amountPaid > 0 ? 'Partially Paid' : 'Pending'),
    client: {
      id: api.customerId || api.organizationId,
      company: api.customerName || 'Client Organization',
      name: api.customerName || 'Customer',
      email: api.customerEmail || '',
      phone: api.customerPhone || '',
      gstin: api.gstin || '33AAAAA0000A1Z5',
      pan: api.pan || 'AAAAA0000A',
      location: api.billingAddress || 'Chennai, TN',
      industry: 'Technology',
    },
    company: {
      name: 'Yaa Creations',
      taxId: '27AABCA1234F1Z8',
      pan: 'ABCDE1234F',
      address: 'Plot No 42, Silicon Valley High-Tech Zone, Madhapur, Hyderabad, TG 500081',
      email: 'billing@yaacreations.com',
      phone: '+91 98765 43210',
    },
    bank: (api as any).bank || {
      bankName: 'HDFC Bank',
      accountName: 'Yaa Creations Tech Pvt Ltd',
      accountNumber: '50200012345678',
      ifscCode: 'HDFC0001234',
      branchName: 'Guindy Branch, Chennai',
      upiId: 'yaacreations@hdfcbank',
    },
    items: (api.items || []).map((it, idx) => {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.unitPrice) || 0;
      const taxRate = Number(it.gstPercent) || 0;
      const sub = qty * price;
      const taxAmount = Number(it.taxAmount) || (sub * taxRate) / 100;
      const total = Number(it.lineTotal) || sub + taxAmount;
      return {
        id: it.id || it.itemId || `item_${idx + 1}`,
        name: it.itemDescription || it.itemId || `Line Item ${idx + 1}`,
        description: it.itemDescription || '',
        hsnCode: it.hsnCode || '998314',
        qty,
        unitPrice: price,
        taxPercent: taxRate,
        discount: 0,
        subtotal: sub,
        total,
      };
    }),
    subtotal: Number(api.subTotal) || 0,
    totalDiscount: Number(api.discountTotal) || 0,
    taxableAmount: Math.max(0, (Number(api.subTotal) || 0) - (Number(api.discountTotal) || 0)),
    taxTotal: Number(api.taxTotal) || 0,
    roundMode: 'none',
    roundOffAmount: 0,
    grandTotal: Number(api.grandTotal) || 0,
    paymentDetails,
    createdAt: api.createdAt,
    ...(api as any),
  };
};

export const InvoicesView: React.FC<InvoicesViewProps> = ({ isProforma = false }) => {
  const navigate = useNavigate();
  const { showToast, isSuperAdmin, currentUser } = useAuth();
  const { addInvoice: addStandardInvoice, deleteInvoice: deleteStandardInvoice } = useInvoiceStore();
  const { addProformaInvoice, deleteProformaInvoice } = useProformaInvoiceStore();

  // Live Backend state for Proformas and Standard Invoices
  const [liveProformas, setLiveProformas] = useState<SavedInvoice[]>([]);
  const [isLoadingProformas, setIsLoadingProformas] = useState(false);
  const [proformaTotalRecords, setProformaTotalRecords] = useState(0);

  const [liveInvoices, setLiveInvoices] = useState<SavedInvoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoicesTotalRecords, setInvoicesTotalRecords] = useState(0);

  const [isConvertingId, setIsConvertingId] = useState<string | null>(null);

  const invoices = isProforma ? liveProformas : liveInvoices;
  const isLoading = isProforma ? isLoadingProformas : isLoadingInvoices;
  const totalInvoiceCount = isProforma ? proformaTotalRecords : invoicesTotalRecords;

  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState<string>('All');
  const [appliedStatus, setAppliedStatus] = useState<string>('All');
  const [pendingBilledOrgId, setPendingBilledOrgId] = useState<string>('');
  const [appliedBilledOrgId, setAppliedBilledOrgId] = useState<string>('');
  const [availableOrganizations, setAvailableOrganizations] = useState<OrganizationApiItem[]>([]);

  // Load registered organizations for Super Admin filter
  useEffect(() => {
    let isMounted = true;
    if (isSuperAdmin) {
      organizationApi
        .getOrganizations(1, 100)
        .then((res) => {
          if (isMounted && res && Array.isArray(res.data)) {
            setAvailableOrganizations(res.data);
          }
        })
        .catch((err) => {
          console.warn('Could not load organizations for Super Admin filter:', err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isSuperAdmin]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewingInvoice, setViewingInvoice] = useState<SavedInvoice | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionDropdownPos, setActionDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<SavedInvoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SavedInvoice | null>(null);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Confirmation Modal State for Delete
  const [deleteInvoiceConfirm, setDeleteInvoiceConfirm] = useState<{ id: string; number: string } | null>(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  // Fetch live invoices / proformas from backend API
  const fetchLiveInvoices = useCallback(async () => {
    if (isProforma) {
      setIsLoadingProformas(true);
      try {
        const statusParam = appliedStatus === 'All' ? 'ALL' : appliedStatus;
        const orgId = currentUser?.organizationId || getStoredOrganizationId();
        const activeSubOrgId = localStorage.getItem('active_sub_organization_id');
        const activeSubOrgName = localStorage.getItem('active_sub_organization');
        const activeBranchId = localStorage.getItem('active_branch_id_sales') || localStorage.getItem('active_branch_id');
        const activeBranchName = localStorage.getItem('active_branch_sales') || localStorage.getItem('active_branch');

        const params: any = {
          page: currentPage,
          limit: pageSize,
          search: appliedSearch.trim() || undefined,
          status: statusParam,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        };

        if (isSuperAdmin) {
          // Super Admin: sees only documents they created.
          // Passing organization_id narrows documents to those billed to that organization.
          if (appliedBilledOrgId && appliedBilledOrgId !== 'ALL') {
            params.organization_id = appliedBilledOrgId;
          }
        } else {
          // Tenant logins (Organization / Sub-Organization / Branch):
          if (orgId) {
            params.organization_id = orgId;
          }
          if (activeSubOrgId && activeSubOrgName && activeSubOrgName !== 'All') {
            params.sub_organization_id = activeSubOrgId;
          }
          if (activeBranchId && activeBranchName && activeBranchName !== 'All') {
            params.branch_id = activeBranchId;
          }
        }

        const res = await proformaInvoiceApi.getProformaInvoices(params);
        if (res.data) {
          const mapped = res.data.map(mapApiProformaToSavedInvoice);
          setLiveProformas(mapped);
          setProformaTotalRecords(res.pagination?.totalRecords ?? mapped.length);
        }
      } catch (err) {
        console.error('Failed to fetch proforma invoices:', err);
        showToast('error', 'Error Loading Data', 'Failed to load proforma invoices from backend.');
      } finally {
        setIsLoadingProformas(false);
      }
    } else {
      setIsLoadingInvoices(true);
      try {
        const statusParam = appliedStatus === 'All' ? 'ALL' : appliedStatus;
        const orgId = currentUser?.organizationId || getStoredOrganizationId();
        const activeSubOrgId = localStorage.getItem('active_sub_organization_id');
        const activeSubOrgName = localStorage.getItem('active_sub_organization');
        const activeBranchId = localStorage.getItem('active_branch_id_sales') || localStorage.getItem('active_branch_id');
        const activeBranchName = localStorage.getItem('active_branch_sales') || localStorage.getItem('active_branch');

        const params: any = {
          page: currentPage,
          limit: pageSize,
          search: appliedSearch.trim() || undefined,
          status: statusParam,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        };

        if (isSuperAdmin) {
          if (appliedBilledOrgId && appliedBilledOrgId !== 'ALL') {
            params.organization_id = appliedBilledOrgId;
          }
        } else {
          if (orgId) {
            params.organization_id = orgId;
          }
          if (activeSubOrgId && activeSubOrgName && activeSubOrgName !== 'All') {
            params.sub_organization_id = activeSubOrgId;
          }
          if (activeBranchId && activeBranchName && activeBranchName !== 'All') {
            params.branch_id = activeBranchId;
          }
        }

        const res = await invoiceApi.getInvoices(params);
        if (res.data) {
          const mapped = res.data.map(mapApiInvoiceToSavedInvoice);
          setLiveInvoices(mapped);
          setInvoicesTotalRecords(res.pagination?.totalRecords ?? mapped.length);
        }
      } catch (err) {
        console.error('Failed to fetch invoices:', err);
        showToast('error', 'Error Loading Data', 'Failed to load invoices from backend.');
      } finally {
        setIsLoadingInvoices(false);
      }
    }
  }, [
    isProforma,
    currentPage,
    pageSize,
    appliedSearch,
    appliedStatus,
    appliedBilledOrgId,
    isSuperAdmin,
    currentUser?.organizationId,
    showToast,
  ]);

  useEffect(() => {
    fetchLiveInvoices();
  }, [fetchLiveInvoices]);

  const handleConvertToInvoice = async (inv: SavedInvoice) => {
    if (inv.status === ('Converted' as any)) {
      showToast('info', 'Already Converted', `Proforma invoice #${inv.invoiceNumber} was already converted.`);
      return;
    }
    try {
      setIsConvertingId(inv.id);
      const res = await proformaInvoiceApi.convertToInvoice(inv.id, {
        dueDate: inv.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      showToast(
        'success',
        'Converted to Invoice',
        `Proforma #${inv.invoiceNumber} successfully converted to Invoice #${res.data?.invoice?.invoiceNumber || ''}!`
      );
      await fetchLiveInvoices();
    } catch (err: any) {
      console.error('Failed to convert proforma to invoice:', err);
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to convert proforma to invoice';
      showToast('error', 'Conversion Error', msg);
    } finally {
      setIsConvertingId(null);
    }
  };

  const handleProformaStatusChange = async (id: string, newStatus: ProformaInvoiceStatus) => {
    try {
      await proformaInvoiceApi.updateProformaInvoice(id, { status: newStatus });
      setLiveProformas((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus as any } : item))
      );
      showToast('success', 'Status Updated', `Proforma invoice status updated to ${newStatus}.`);
    } catch (err: any) {
      console.error('Failed to update proforma status:', err);
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to update status';
      showToast('error', 'Status Update Failed', msg);
    }
  };

  useEffect(() => {
    const handleScrollOrResize = () => {
      if (openActionMenuId) {
        setOpenActionMenuId(null);
        setActionDropdownPos(null);
      }
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [openActionMenuId]);

  const handleSearchChange = (val: string) => {
    setPendingSearch(val);
    if (!val.trim()) {
      setAppliedSearch('');
      setCurrentPage(1);
    }
  };

  const handleApply = () => {
    setAppliedSearch(pendingSearch);
    setAppliedStatus(pendingStatus);
    setAppliedBilledOrgId(pendingBilledOrgId);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setPendingSearch('');
    setAppliedSearch('');
    setPendingStatus('All');
    setAppliedStatus('All');
    setPendingBilledOrgId('');
    setAppliedBilledOrgId('');
    setCurrentPage(1);
  };

  const handleDuplicateInvoice = (inv: SavedInvoice) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const duplicatedDraft: SavedInvoice = {
      ...JSON.parse(JSON.stringify(inv)),
      id: isProforma ? `prof_${Date.now()}` : `inv_${Date.now()}`,
      invoiceNumber: isProforma ? `PI-2026-${randomSuffix}` : `INV-2026-${randomSuffix}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Pending',
      createdAt: new Date().toISOString(),
      paymentDetails: undefined,
    };
    setIsDuplicateMode(true);
    setEditingInvoice(duplicatedDraft);
    setIsEditModalOpen(true);
  };

  const [openSendMenuId, setOpenSendMenuId] = useState<string | null>(null);
  const [isPreviewSendMenuOpen, setIsPreviewSendMenuOpen] = useState(false);

  const handleSendViaGmail = (inv: SavedInvoice) => {
    const targetEmail = inv.client.email || 'customer@example.com';
    const invoicePdfLink = `${window.location.origin}/#/invoices?view=${inv.id}`;
    const subject = encodeURIComponent(`${isProforma ? 'Proforma Invoice' : 'Invoice'} #${inv.invoiceNumber} from ${inv.company.name}`);
    const body = encodeURIComponent(
      `Dear ${inv.client.name || 'Customer'},\n\n` +
      `Please find your ${isProforma ? 'proforma invoice' : 'invoice'} #${inv.invoiceNumber} for the amount of ₹${inv.grandTotal.toFixed(2)}.\n\n` +
      `📄 View / Download Invoice PDF Online:\n${invoicePdfLink}\n\n` +
      `Thank you for doing business with us!\n\n` +
      `Best regards,\n${inv.company.name}`
    );
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${targetEmail}&su=${subject}&body=${body}`, '_blank');
    showToast('success', 'Gmail Opened', `Drafted ${isProforma ? 'proforma invoice' : 'invoice'} #${inv.invoiceNumber} in Gmail with direct PDF link.`);
  };

  const handleSendViaWhatsApp = (inv: SavedInvoice) => {
    const rawPhone = (inv.client.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const recipientName = inv.client.name || 'Customer';
    const invoicePdfLink = `${window.location.origin}/#/invoices?view=${inv.id}`;

    // Clean, structured message text with direct clickable online PDF invoice link
    const messageText =
      `*${isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE'}*\n\n` +
      `Hello *${recipientName}*,\n` +
      `Here is your ${isProforma ? 'proforma invoice' : 'invoice'} *#${inv.invoiceNumber}* from *${inv.company.name}*.\n\n` +
      `• *Amount Due:* ₹${inv.grandTotal.toFixed(2)}\n` +
      `• *Invoice Date:* ${inv.invoiceDate}\n` +
      `• *Due Date:* ${inv.dueDate || 'Immediate'}\n` +
      `• *Status:* ${inv.status}\n\n` +
      `📄 *Click here to View / Download Invoice PDF:*\n${invoicePdfLink}\n\n` +
      `Thank you for your business!\n*${inv.company.name}*`;

    const encodedText = encodeURIComponent(messageText);

    // Direct WhatsApp Web Link with phone number and pre-typed message
    const targetUrl = cleanPhone
      ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://web.whatsapp.com/send?text=${encodedText}`;

    window.open(targetUrl, '_blank');

    showToast(
      'success',
      'WhatsApp Opened',
      `Direct WhatsApp chat for ${recipientName} (${cleanPhone ? `+${cleanPhone}` : 'customer'}) is open with your invoice details and PDF link pre-typed.`
    );
  };

  const handleSendInvoice = (inv: SavedInvoice) => {
    handleSendViaWhatsApp(inv);
  };

  const handleOpenMarkAsPaid = (inv: SavedInvoice) => {
    setPaymentModalInvoice(inv);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (paymentDetails: InvoicePaymentDetails) => {
    if (!paymentModalInvoice) return;
    try {
      let cleanMode = paymentDetails.paymentMode;
      if (cleanMode.toLowerCase().includes('bank transfer')) {
        cleanMode = 'Bank Transfer';
      } else if (cleanMode.toLowerCase().includes('upi')) {
        cleanMode = 'UPI';
      } else if (cleanMode.toLowerCase().includes('card')) {
        cleanMode = 'Card';
      } else if (cleanMode.toLowerCase().includes('cash')) {
        cleanMode = 'Cash';
      } else if (cleanMode.toLowerCase().includes('cheque')) {
        cleanMode = 'Cheque';
      } else if (!cleanMode) {
        cleanMode = 'Bank Transfer';
      }

      const refNo =
        paymentDetails.referenceId?.trim() ||
        (cleanMode === 'Bank Transfer' ? `UTR${Date.now().toString().slice(-8)}` : undefined);

      const payload: RecordPaymentRequest = {
        amount: Number(paymentDetails.amountPaid) || 0,
        paymentDate: paymentDetails.paymentDate || new Date().toISOString().split('T')[0],
        paymentMode: cleanMode,
        referenceNumber: refNo,
        notes: paymentDetails.notes || undefined,
      };

      await invoiceApi.recordPayment(paymentModalInvoice.id, payload);
      showToast(
        'success',
        'Payment Recorded',
        `Payment of ₹${payload.amount.toLocaleString()} recorded for #${paymentModalInvoice.invoiceNumber}.`
      );

      setIsPaymentModalOpen(false);
      setPaymentModalInvoice(null);
      await fetchLiveInvoices();

      if (viewingInvoice && viewingInvoice.id === paymentModalInvoice.id) {
        const refreshed = await invoiceApi.getInvoiceById(paymentModalInvoice.id);
        if (refreshed.data) {
          setViewingInvoice(mapApiInvoiceToSavedInvoice(refreshed.data));
        }
      }
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to record payment';
      showToast('error', 'Payment Failed', msg);
    }
  };

  // Edit Invoice Form Handlers
  const recalculateTotals = (
    items: SavedInvoiceItem[],
    roundMode: 'none' | 'up' | 'down' = editingInvoice?.roundMode || 'none'
  ) => {
    const subtotal = items.reduce((acc, it) => acc + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
    const totalDiscount = items.reduce((acc, it) => acc + (Number(it.discount) || 0), 0);
    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const taxTotal = items.reduce((acc, it) => {
      const itSub = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
      const itDisc = Number(it.discount) || 0;
      const itTaxable = Math.max(0, itSub - itDisc);
      return acc + (itTaxable * (Number(it.taxPercent) || 0)) / 100;
    }, 0);

    const rawGrand = taxableAmount + taxTotal;
    let roundOffAmount = 0;
    if (roundMode === 'up') {
      roundOffAmount = rawGrand % 1 === 0 ? 0 : Math.ceil(rawGrand) - rawGrand;
    } else if (roundMode === 'down') {
      roundOffAmount = rawGrand % 1 === 0 ? 0 : Math.floor(rawGrand) - rawGrand;
    }

    return {
      subtotal,
      totalDiscount,
      taxableAmount,
      taxTotal,
      roundMode,
      roundOffAmount,
      grandTotal: Number((rawGrand + roundOffAmount).toFixed(2)),
    };
  };

  const handleEditItemChange = (idx: number, key: string, val: any) => {
    if (!editingInvoice) return;
    const updatedItems = [...editingInvoice.items];
    const it = { ...updatedItems[idx], [key]: val };
    const qty = Number(it.qty) || 0;
    const price = Number(it.unitPrice) || 0;
    const disc = Number(it.discount) || 0;
    const sub = qty * price;
    const taxable = Math.max(0, sub - disc);
    const tax = (taxable * (Number(it.taxPercent) || 0)) / 100;
    it.subtotal = sub;
    it.total = taxable + tax;
    updatedItems[idx] = it;

    const totals = recalculateTotals(updatedItems, editingInvoice.roundMode);
    setEditingInvoice({
      ...editingInvoice,
      items: updatedItems,
      ...totals,
    });
  };

  const handleAddEditItem = () => {
    if (!editingInvoice) return;
    const newItem: SavedInvoiceItem = {
      id: `it_${Date.now()}`,
      name: 'New Service Item',
      qty: 1,
      unitPrice: 500,
      taxPercent: 18,
      discount: 0,
      subtotal: 500,
      total: 590,
    };
    const updatedItems = [...editingInvoice.items, newItem];
    const totals = recalculateTotals(updatedItems, editingInvoice.roundMode);
    setEditingInvoice({
      ...editingInvoice,
      items: updatedItems,
      ...totals,
    });
  };

  const handleRemoveEditItem = (idx: number) => {
    if (!editingInvoice || editingInvoice.items.length <= 1) return;
    const updatedItems = editingInvoice.items.filter((_, i) => i !== idx);
    const totals = recalculateTotals(updatedItems, editingInvoice.roundMode);
    setEditingInvoice({
      ...editingInvoice,
      items: updatedItems,
      ...totals,
    });
  };

  const handleRoundModeChange = (mode: 'none' | 'up' | 'down') => {
    if (!editingInvoice) return;
    const totals = recalculateTotals(editingInvoice.items, mode);
    setEditingInvoice({
      ...editingInvoice,
      ...totals,
    });
  };

  const handleSaveEditInvoice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingInvoice) return;
    const totals = recalculateTotals(editingInvoice.items, editingInvoice.roundMode || 'none');
    const updatedInvoice: SavedInvoice = {
      ...editingInvoice,
      ...totals,
    };

    if (isProforma) {
      try {
        const updatePayload: UpdateProformaRequest = {
          status: updatedInvoice.status,
          invoiceDate: updatedInvoice.invoiceDate,
          dueDate: updatedInvoice.dueDate,
          discountTotal: updatedInvoice.totalDiscount,
          notes: updatedInvoice.description,
          items: updatedInvoice.items.map((it, idx) => ({
            itemId: it.id || `SKU-${idx + 1}`,
            itemDescription: it.name,
            hsnCode: it.hsnCode || '998314',
            quantity: Number(it.qty) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            gstPercent: Number(it.taxPercent) || 18,
          })),
        };
        await proformaInvoiceApi.updateProformaInvoice(updatedInvoice.id, updatePayload);
        await fetchLiveInvoices();
        showToast('success', 'Proforma Invoice Updated', `Proforma invoice #${updatedInvoice.invoiceNumber} updated successfully!`);
      } catch (err: any) {
        console.error('Failed to update proforma invoice:', err);
        const msg = err?.response?.data?.error?.message || err?.message || 'Failed to update proforma invoice';
        showToast('error', 'Update Failed', msg);
      }
    } else {
      try {
        const updatePayload: UpdateInvoiceRequest = {
          dueDate: updatedInvoice.dueDate,
          notes: updatedInvoice.description,
          discountTotal: updatedInvoice.totalDiscount,
          billingAddress: updatedInvoice.client.location,
          items: updatedInvoice.items.map((it, idx) => ({
            itemId: it.id || `SKU-${idx + 1}`,
            itemDescription: it.name,
            hsnCode: it.hsnCode || '998314',
            quantity: Number(it.qty) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            gstPercent: Number(it.taxPercent) || 18,
          })),
        };
        await invoiceApi.updateInvoice(updatedInvoice.id, updatePayload);
        await fetchLiveInvoices();
        showToast('success', 'Invoice Updated', `Invoice #${updatedInvoice.invoiceNumber} updated successfully!`);
      } catch (err: any) {
        console.error('Failed to update invoice:', err);
        const msg = err?.response?.data?.error?.message || err?.message || 'Failed to update invoice';
        showToast('error', 'Update Failed', msg);
      }
    }

    if (viewingInvoice && viewingInvoice.id === updatedInvoice.id) {
      setViewingInvoice(updatedInvoice);
    }
    setIsEditModalOpen(false);
    setEditingInvoice(null);
    setIsDuplicateMode(false);
  };

  // =========================================================================
  // 1. FULL PAGE INVOICE DETAIL VIEW (Matching Reference Document Layout)
  // =========================================================================
  if (viewingInvoice) {
    const activeInvoice = viewingInvoice;

    const handlePrintInvoicePdf = async () => {
      try {
        setIsGeneratingPdf(true);
        // Generate real PDF blob using @react-pdf/renderer
        const blob = await pdf(
          <InvoicePDFDocument
            invoice={activeInvoice}
            documentTitle={isProforma ? 'Proforma Invoice' : 'Invoice'}
          />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        
        // Open PDF in new tab for direct real PDF printing / viewing
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          // Fallback if popup blocked: trigger download
          const link = document.createElement('a');
          link.href = url;
          link.download = `${isProforma ? 'ProformaInvoice' : 'Invoice'}-${activeInvoice.invoiceNumber}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        showToast('success', 'PDF Generated', `Real PDF for #${activeInvoice.invoiceNumber} generated successfully.`);
      } catch (err) {
        console.error('Failed to generate PDF with @react-pdf/renderer:', err);
        showToast('error', 'PDF Generation Error', 'Could not generate PDF. Please check console.');
      } finally {
        setIsGeneratingPdf(false);
      }
    };

    return (
      <div className="space-y-6 print:space-y-4">
        {/* Top Full-Page Navigation & Actions Bar (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#33077C] px-6 py-4 rounded-2xl shadow-md text-white print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewingInvoice(null)}
              className="inline-flex items-center justify-center gap-2 h-10 px-4.5 bg-white text-[#33077C] hover:bg-slate-100 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
              <span>Back</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <div className="relative inline-flex items-center">
                <div className="inline-flex items-center bg-white rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleSendInvoice(activeInvoice)}
                    className="inline-flex items-center justify-center gap-2 h-10 px-4.5 text-[#33077C] hover:bg-slate-100 text-sm font-bold transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-[#33077C]" />
                    <span>Send</span>
                  </button>

                  <div className="w-[1px] h-6 bg-slate-200" />

                  <button
                    type="button"
                    onClick={() => setIsPreviewSendMenuOpen(!isPreviewSendMenuOpen)}
                    className={`h-10 px-2.5 flex items-center justify-center transition-colors cursor-pointer ${
                      isPreviewSendMenuOpen ? 'bg-slate-100 text-[#33077C]' : 'text-[#33077C] hover:bg-slate-100'
                    }`}
                    title="Send options (Gmail & WhatsApp)"
                  >
                    <MoreVertical className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Dropdown Menu on Preview Header */}
                {isPreviewSendMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[99]"
                      onClick={() => setIsPreviewSendMenuOpen(false)}
                    />
                    <div className="absolute top-12 right-0 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[100] animate-in fade-in zoom-in-95 duration-100 text-left">
                      {/* Gmail */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsPreviewSendMenuOpen(false);
                          handleSendViaGmail(activeInvoice);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors rounded-xl cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 shadow-2xs">
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.5 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H18V9.75L12 14.25 6 9.75v9.75H3.75A2.25 2.25 0 0 1 1.5 17.25V6.75a2.25 2.25 0 0 1 3.53-1.84L12 10.05l6.97-5.14a2.25 2.25 0 0 1 3.53 1.84Z"
                            />
                            <path
                              fill="#EA4335"
                              d="M18 4.5 12 9 6 4.5h12Z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M1.5 6.75v1.5l10.5 7.5 10.5-7.5v-1.5a2.25 2.25 0 0 0-3.53-1.84L12 8.55 5.03 4.91A2.25 2.25 0 0 0 1.5 6.75Z"
                            />
                            <path
                              fill="#34A853"
                              d="M1.5 17.25c0 1.24 1.01 2.25 2.25 2.25H6V9.75l-4.5 3.38v4.12Z"
                            />
                          </svg>
                        </div>
                        <span className="font-semibold text-slate-800 text-[13px]">Send via Gmail</span>
                      </button>

                      {/* WhatsApp */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsPreviewSendMenuOpen(false);
                          handleSendViaWhatsApp(activeInvoice);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors rounded-xl cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 shadow-2xs">
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                            <path
                              fill="#25D366"
                              d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"
                            />
                            <path
                              fill="#FFF"
                              d="M17.52 14.33c-.23-.12-1.36-.67-1.57-.75-.21-.08-.36-.12-.51.12-.15.23-.6 0.75-.73.9-.13.15-.27.17-.5.06-.23-.12-.98-.36-1.87-1.15-.69-.62-1.16-1.38-1.3-1.61-.13-.23-.01-.36.1-.47.11-.11.23-.27.35-.4.12-.13.15-.23.23-.38.08-.15.04-.29-.02-.4-.06-.12-.51-1.24-.7-1.7-.19-.45-.38-.39-.51-.39-.13-.01-.29-.01-.44-.01-.15 0-.4.06-.61.29-.21.23-.8.78-.8 1.9 0 1.12.82 2.21.93 2.36.12.15 1.6 2.45 3.88 3.44.54.23.97.37 1.3.48.55.17 1.05.15 1.45.09.44-.07 1.36-.56 1.55-1.1.19-.54.19-1.01.13-1.1-.06-.1-.2-.16-.43-.27z"
                            />
                          </svg>
                        </div>
                        <span className="font-semibold text-slate-800 text-[13px]">Send via WhatsApp</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handlePrintInvoicePdf}
              className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-white text-[#33077C] hover:bg-slate-100 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#33077C]" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-[#33077C]" />
                  <span>{isProforma ? 'Print Proforma Invoice' : 'Print Invoice'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Full-Width Document Canvas (Printable Target) */}
        <div className="invoice-printable-document max-w-5xl mx-auto w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-12 space-y-8 print:p-0 print:border-none print:shadow-none print:space-y-6">
          {/* 1. Top Title */}
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {isProforma ? 'Proforma Invoice' : 'Invoice'}
            </h2>
          </div>

          {/* 2. Top Header Ribbon (Invoice Details on Left, Company Branding on Right) */}
          <div className="invoice-ribbon-header bg-white text-slate-900 flex flex-col-reverse sm:flex-row sm:items-start justify-between gap-6 break-inside-avoid print:flex-row pb-2">

            {/* Left: Invoice Number, Date & Reference Details */}
            <div className="text-left space-y-1.5 text-xs sm:text-sm shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium w-36">
                  {isProforma ? 'Proforma Invoice Number:' : 'Invoice Number:'}
                </span>
                <span className="font-bold text-slate-900">{activeInvoice.invoiceNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium w-36">
                  {isProforma ? 'Proforma Invoice Date:' : 'Invoice Date:'}
                </span>
                <span className="font-semibold text-slate-800">{formatDate(activeInvoice.invoiceDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium w-28">Due Date:</span>
                {activeInvoice.dueDate && <span className="font-semibold text-slate-800">{formatDate(activeInvoice.dueDate)}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium w-28">Reference:</span>
                {activeInvoice.referenceNumbers && activeInvoice.referenceNumbers.length > 0 && (
                  <span className="font-bold text-slate-800">{activeInvoice.referenceNumbers.join(', ')}</span>
                )}
              </div>
              {activeInvoice.customFields &&
                activeInvoice.customFields
                  .filter((cf) => {
                    const idNorm = (cf.id || '').toLowerCase().trim();
                    const labelNorm = (cf.label || '').toLowerCase().trim().replace(/[:#]/g, '').trim();
                    return (
                      idNorm !== 'invoice-number' &&
                      idNorm !== 'invoice-date' &&
                      idNorm !== 'reference-number' &&
                      idNorm !== 'due-date' &&
                      labelNorm !== 'invoice number' &&
                      labelNorm !== 'invoice no' &&
                      labelNorm !== 'invoice date' &&
                      labelNorm !== 'reference number' &&
                      labelNorm !== 'reference no' &&
                      labelNorm !== 'reference' &&
                      labelNorm !== 'due date'
                    );
                  })
                  .map((cf) => (
                    <div key={cf.id} className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium w-28">{cf.label}:</span>
                      <span className="font-semibold text-slate-900">{cf.value}</span>
                    </div>
                  ))}
            </div>

            {/* Right: Company Logo */}
            <div className="flex items-center sm:justify-end print:justify-end gap-4 min-w-0 flex-1">
              <img
                src="/yaa-creations-logo.png"
                alt={activeInvoice.company.name}
                className="h-16 sm:h-20 object-contain max-w-[280px]"
              />
            </div>

          </div>

          {/* 3. Dotted Divider */}
          <div className="border-b border-dashed border-slate-300 pt-1" />

          {/* 4. Two-Column Billing From & Bill To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-1 break-inside-avoid">
            {/* Left: Billing From (Seller) */}
            <div className="space-y-2.5 text-xs sm:text-sm">
              <h3 className="text-base font-bold text-[#33077C] pb-1.5 border-b border-slate-100">
                Billing From:
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Company Name</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeInvoice.company.name}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>GSTIN / Tax ID</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeInvoice.company.taxId || '27AABCA1234F1Z8'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>PAN Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeInvoice.company.pan || 'ABCDE1234F'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Phone Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeInvoice.company.phone}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Email</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeInvoice.company.email}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Company Address</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeInvoice.company.address}</span>
                </div>
              </div>
            </div>

            {/* Right: Bill To (Client) */}
            <div className="space-y-2.5 text-xs sm:text-sm">
              <h3 className="text-base font-bold text-[#33077C] pb-1.5 border-b border-slate-100">
                Billing To:
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Company Name</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeInvoice.client.company}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>GSTIN / Tax ID</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeInvoice.client.gstin || activeInvoice.client.taxId || '27AABCT8892K1Z5'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>PAN Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeInvoice.client.pan || 'ABCDE9876G'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Phone Number</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeInvoice.client.phone || 'N/A'}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Email</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeInvoice.client.email}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Company Address</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">
                    {activeInvoice.client.location && (activeInvoice.client.location.includes('Suite') || activeInvoice.client.location.includes('Hub') || activeInvoice.client.location.includes('Building') || activeInvoice.client.location.includes('Floor'))
                      ? activeInvoice.client.location
                      : activeInvoice.client.location
                        ? `Suite 750, Innovation Park, ${activeInvoice.client.location} 75201`
                        : 'Suite 750, Innovation Park, Dallas, TX 75201'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Service Details / Line Items Table */}
          <div className="space-y-3 pt-2 break-inside-avoid">
            <h3 className="text-base font-bold text-[#33077C]">
              Service Details:
            </h3>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-[#2B3991] text-white text-xs font-bold uppercase tracking-wider">
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-center w-10">#</th>
                    <th className="border border-white/30 px-3 py-3">Item</th>
                    <th className="border border-white/30 px-2 sm:px-2.5 py-3 text-center">GST</th>
                    <th className="border border-white/30 px-2 sm:px-2.5 py-3 text-center">Qty</th>
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-center">Rate</th>
                    <th className="border border-white/30 px-3 sm:px-4 py-3 text-right">Subtotal</th>
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-right">Discount</th>
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-right">CGST</th>
                    <th className="border border-white/30 px-2.5 sm:px-3 py-3 text-right">SGST</th>
                    <th className="border border-white/30 px-3 sm:px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInvoice.items.map((it, idx) => {
                    const itemSub = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
                    const itemDisc = Number(it.discount) || 0;
                    const itemTaxable = Math.max(0, itemSub - itemDisc);
                    const itemTax = (itemTaxable * (Number(it.taxPercent) || 0)) / 100;
                    const halfTax = itemTax / 2;
                    const itemTotal = it.total || (itemTaxable + itemTax);

                    return (
                      <tr
                        key={it.id || idx}
                        className={idx % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}
                      >
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-center font-bold text-slate-700">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-200 px-3 py-3">
                          <span className="font-bold text-slate-900 block font-sans">{it.name}</span>
                        </td>
                        <td className="border border-slate-200 px-2 sm:px-2.5 py-3 text-center text-slate-600 font-sans">
                          {it.taxPercent}%
                        </td>
                        <td className="border border-slate-200 px-2 sm:px-2.5 py-3 text-center font-bold text-slate-800 font-sans">
                          {it.qty}
                        </td>
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-center font-medium text-slate-800 font-sans">
                          ₹{it.unitPrice.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-3 sm:px-4 py-3 text-right font-medium text-slate-800 font-sans">
                          ₹{itemSub.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-right font-medium text-slate-800 font-sans">
                          ₹{itemDisc.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-right text-slate-600 font-sans">
                          ₹{halfTax.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-2.5 sm:px-3 py-3 text-right text-slate-600 font-sans">
                          ₹{halfTax.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-3 sm:px-4 py-3 text-right font-bold text-slate-900 font-sans">
                          ₹{itemTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="border-0 p-0 bg-transparent"></td>
                    <td colSpan={5} className="border-0 p-0">
                      <div
                        className="invoice-summary-ribbon w-full bg-white border border-slate-200 text-slate-800 p-4 sm:p-5 font-sans !rounded-none"
                        style={{ borderRadius: 0 }}
                      >
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr>
                              <td className="py-1.5 text-left font-medium text-xs sm:text-sm text-slate-600">Subtotal</td>
                              <td className="py-1.5 text-right font-semibold text-xs sm:text-sm text-slate-800 font-sans whitespace-nowrap">
                                ₹{(activeInvoice.subtotal || activeInvoice.taxableAmount).toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 text-left font-medium text-xs sm:text-sm text-slate-600">Discount</td>
                              <td className="py-1.5 text-right font-semibold text-xs sm:text-sm text-slate-800 font-sans whitespace-nowrap">
                                {activeInvoice.totalDiscount > 0
                                  ? `-₹${activeInvoice.totalDiscount.toFixed(2)}`
                                  : '₹0.00'}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 text-left font-medium text-xs sm:text-sm text-slate-600">GST Total</td>
                              <td className="py-1.5 text-right font-semibold text-xs sm:text-sm text-slate-800 font-sans whitespace-nowrap">
                                ₹{activeInvoice.taxTotal.toFixed(2)}
                              </td>
                            </tr>
                            {/* Rounding Adjustment (Rounded Up or Rounded Down next to GST Total) */}
                            {(() => {
                              const rawTotal = (activeInvoice.taxableAmount || 0) + (activeInvoice.taxTotal || 0);
                              const roundDiff = (activeInvoice as any).roundOffAmount !== undefined
                                ? Number((activeInvoice as any).roundOffAmount)
                                : Number((activeInvoice.grandTotal - rawTotal).toFixed(2));
                              const mode = (activeInvoice as any).roundMode || (roundDiff < -0.005 ? 'down' : roundDiff > 0.005 ? 'up' : 'none');

                              if (mode === 'none' && Math.abs(roundDiff) < 0.005) {
                                return null;
                              }

                              const isDown = mode === 'down' || roundDiff < 0;
                              const label = isDown ? 'Rounded Down' : 'Rounded Up';
                              const formattedDiff = isDown
                                ? `-₹${Math.abs(roundDiff).toFixed(2)}`
                                : `+₹${Math.abs(roundDiff).toFixed(2)}`;

                              return (
                                <tr>
                                  <td className="py-1.5 text-left font-medium text-xs sm:text-sm text-slate-600">
                                    {label}
                                  </td>
                                  <td className="py-1.5 text-right font-semibold text-xs sm:text-sm text-slate-800 font-sans whitespace-nowrap">
                                    {formattedDiff}
                                  </td>
                                </tr>
                              );
                            })()}
                            <tr className="border-t border-slate-200">
                              <td className="pt-2.5 pb-1.5 text-left font-bold text-sm sm:text-base text-slate-800">Grand Total</td>
                              <td className="pt-2.5 pb-1.5 text-right font-bold text-base sm:text-lg text-slate-800 font-sans whitespace-nowrap">
                                ₹{activeInvoice.grandTotal.toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 text-left font-medium text-xs sm:text-sm text-slate-600">Total Paid</td>
                              <td className="py-1.5 text-right font-semibold text-xs sm:text-sm text-slate-800 font-sans whitespace-nowrap">
                                ₹{(activeInvoice.status === 'Pending' ? 0 : (activeInvoice.paymentDetails?.amountPaid ?? (activeInvoice.status === 'Paid' ? activeInvoice.grandTotal : 0))).toFixed(2)}
                              </td>
                            </tr>
                            {Number(activeInvoice.paymentDetails?.tdsDeduction || 0) > 0 && (
                              <tr>
                                <td className="py-1.5 text-left font-medium text-xs sm:text-sm text-slate-600">
                                  TDS Deducted {activeInvoice.paymentDetails?.tdsSection ? `(${activeInvoice.paymentDetails.taxDeductedType === 'gst' ? 'GST' : 'IT'})` : ''}
                                </td>
                                <td className="py-1.5 text-right font-semibold text-xs sm:text-sm text-slate-800 font-sans whitespace-nowrap">
                                  -₹{Number(activeInvoice.paymentDetails?.tdsDeduction).toFixed(2)}
                                </td>
                              </tr>
                            )}
                            {(() => {
                              const paidAmount = activeInvoice.paymentDetails?.amountPaid ?? (activeInvoice.status === 'Paid' ? activeInvoice.grandTotal : 0);
                              const balanceDue = Math.max(0, activeInvoice.grandTotal - paidAmount);
                              const isPartiallyPaid = activeInvoice.status === 'Partially Paid' || (paidAmount > 0 && balanceDue > 0.005);

                              if (!isPartiallyPaid) return null;

                              return (
                                <tr>
                                  <td className="py-1.5 text-left font-bold text-sm sm:text-base text-slate-800">Balance Due</td>
                                  <td className="py-1.5 text-right font-bold text-base sm:text-lg text-slate-800 font-sans whitespace-nowrap">
                                    ₹{balanceDue.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 7. Bottom Section: Payment Information & Terms and Conditions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 pt-6 break-inside-avoid">
            {/* Left Column: Settlement Billing Information */}
            <div className="space-y-2.5 text-xs sm:text-sm">
              <h3 className="text-base font-bold text-[#33077C] pb-1 border-b border-slate-100">
                Billing Information:
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Account Name</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeInvoice.bank?.accountName || activeInvoice.company.name}</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>Bank Account</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeInvoice.bank?.accountNumber || '50200012345678'} ({activeInvoice.bank?.bankName || 'HDFC Bank'})</span>
                </div>
                <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                    <span>IFSC Code</span>
                    <span>:</span>
                  </span>
                  <span className="text-slate-700 flex-1">{activeInvoice.bank?.ifscCode || 'HDFC0001234'}</span>
                </div>
                {activeInvoice.bank?.upiId && (
                  <div className="flex items-start text-xs sm:text-sm leading-relaxed">
                    <span className="font-bold text-slate-900 w-36 shrink-0 flex justify-between pr-2">
                      <span>Instant UPI VPA</span>
                      <span>:</span>
                    </span>
                    <span className="text-slate-700 flex-1">{activeInvoice.bank.upiId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Signature Block */}
            <div className="space-y-2.5 text-xs sm:text-sm flex flex-col justify-end items-end pb-2">
              <div className="invoice-signature-section w-full max-w-sm flex flex-col items-end pt-2">
                {/* Authentic Authorized Signature & Seal Stamp */}
                <div className="text-right space-y-2 shrink-0 w-full">
                  <div className="flex items-center justify-end gap-2 text-xs text-slate-600 font-semibold">
                    <span className="text-slate-400">Date of Signing:</span>
                    <span className="font-bold text-slate-900">{activeInvoice.invoiceDate}</span>
                  </div>

                  {/* Hand-drawn Cursive Signature SVG graphic */}
                  <div className="flex justify-end py-1">
                    <div className="relative inline-block px-4 py-1">
                      <svg
                        className="w-44 h-12 text-[#33077C]"
                        viewBox="0 0 200 60"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10 40 C 30 10, 45 55, 60 25 C 75 -5, 85 45, 105 30 C 120 15, 130 50, 150 20 C 160 5, 175 35, 195 25"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M30 48 C 65 42, 110 50, 180 45"
                          stroke="#4309A2"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Stamp & Authorized Label */}
                  <div className="border-t border-slate-200 pt-2 flex flex-col items-end">
                    <span className="font-extrabold text-slate-900 text-sm tracking-tight block">
                      {activeInvoice.company.name}
                    </span>
                    <div className="flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] text-slate-600 font-extrabold uppercase tracking-wider">
                        Authorized Signatory
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Record Payment Modal in Invoice Detail View */}
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPaymentModalInvoice(null);
          }}
          invoice={paymentModalInvoice}
          onConfirmPayment={handleConfirmPayment}
        />
      </div>
    );
  }

  // =========================================================================
  // 2. INVOICES TABLE LIST VIEW
  // =========================================================================
  // =========================================================================
  // 2. INVOICES TABLE LIST VIEW
  // =========================================================================
  const pagedInvoices = invoices;

  const handleDeleteInvoice = async (id: string, number: string) => {
    if (isProforma) {
      try {
        await proformaInvoiceApi.deleteProformaInvoice(id);
        setLiveProformas((prev) => prev.filter((item) => item.id !== id));
        setProformaTotalRecords((prev) => Math.max(0, prev - 1));
        showToast('success', 'Proforma Invoice Deleted', `Proforma invoice #${number} deleted.`);
      } catch (err: any) {
        console.error('Failed to delete proforma invoice:', err);
        const msg = err?.response?.data?.error?.message || err?.message || 'Failed to delete proforma invoice';
        showToast('error', 'Delete Failed', msg);
      }
    } else {
      try {
        await invoiceApi.deleteInvoice(id);
        setLiveInvoices((prev) => prev.filter((item) => item.id !== id));
        setInvoicesTotalRecords((prev) => Math.max(0, prev - 1));
        showToast('success', 'Invoice Deleted', `Invoice #${number} deleted successfully.`);
      } catch (err: any) {
        console.error('Failed to delete invoice:', err);
        const msg = err?.response?.data?.error?.message || err?.message || 'Failed to delete invoice';
        showToast('error', 'Delete Failed', msg);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white px-5 py-4 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {isProforma ? 'Proforma Invoices' : 'Invoices'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isProforma
              ? 'Manage, view, convert, and print all saved proforma invoices'
              : 'Manage, view, and print all saved invoices'}
          </p>
        </div>
        <div>
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" strokeWidth={2.5} />}
            onClick={() => navigate(isProforma ? '/proforma/new' : '/sales/new')}
          >
            {isProforma ? 'Create Proforma Invoice' : 'Create New Sale'}
          </Button>
        </div>
      </div>

      {/* Reusable Filter / Search row */}
      <SearchBar
        value={pendingSearch}
        onChange={handleSearchChange}
        placeholder={isProforma ? 'Search proforma #, customer, GSTIN...' : 'Search by invoice #, customer, GSTIN...'}
        onSubmit={handleApply}
        onReset={handleReset}
        filterSlot={
          <div className="flex items-center gap-2 flex-wrap">
            {isSuperAdmin && (
              <FilterDropdown
                options={[
                  { label: 'Organization : All', value: '' },
                  ...availableOrganizations.map((o) => ({
                    label: o.name,
                    value: o.id,
                  })),
                ]}
                value={pendingBilledOrgId}
                onChange={(val) => setPendingBilledOrgId(val)}
              />
            )}
            <FilterDropdown
              options={
                isProforma
                  ? [
                      { label: 'Status : All', value: 'All' },
                      { label: 'Draft', value: 'Draft', dotColor: '#94a3b8' },
                      { label: 'Sent', value: 'Sent', dotColor: '#3b82f6' },
                      { label: 'Approved', value: 'Approved', dotColor: '#10b981' },
                      { label: 'Converted', value: 'Converted', dotColor: '#8b5cf6' },
                      { label: 'Cancelled', value: 'Cancelled', dotColor: '#ef4444' },
                    ]
                  : [
                      { label: 'Status : All', value: 'All' },
                      { label: 'Draft', value: 'Draft', dotColor: '#94a3b8' },
                      { label: 'Sent', value: 'Sent', dotColor: '#3b82f6' },
                      { label: 'Partially Paid', value: 'Partially Paid', dotColor: '#f59e0b' },
                      { label: 'Paid', value: 'Paid', dotColor: '#10b981' },
                      { label: 'Overdue', value: 'Overdue', dotColor: '#ef4444' },
                      { label: 'Cancelled', value: 'Cancelled', dotColor: '#64748b' },
                    ]
              }
              value={pendingStatus}
              onChange={(val) => setPendingStatus(val as any)}
            />
          </div>
        }
        rightSlot={
          <span className="text-xs font-semibold text-slate-500 pr-2">
            Total {isProforma ? 'Proforma Invoices' : 'Invoices'} :{' '}
            <span className="text-[#33077C] font-bold">{totalInvoiceCount}</span>
          </span>
        }
      />

      {/* Invoices List Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Data Table with Full Grid Borders */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-[#33077C] text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">{isProforma ? 'PROFORMA #' : 'INVOICE #'}</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CLIENT / CUSTOMER</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">{isProforma ? 'PROFORMA DATE' : 'INVOICE DATE'}</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">DUE DATE</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">GRAND TOTAL</th>
                {!isProforma && (
                  <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">PAID AMOUNT</th>
                )}
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={isProforma ? 7 : 8} className="py-16 text-center text-slate-400 border border-slate-200">
                    <Loader2 className="w-9 h-9 mx-auto mb-2 animate-spin text-[#33077C]" />
                    <p className="font-bold text-slate-700 text-sm">
                      {isProforma ? 'Loading proforma invoices...' : 'Loading invoices...'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Fetching records from server</p>
                  </td>
                </tr>
              ) : pagedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={isProforma ? 7 : 8} className="py-16 text-center text-slate-400 border border-slate-200">
                    <Sparkles className="w-9 h-9 mx-auto mb-2 opacity-30 text-orange-400" />
                    <p className="font-bold text-slate-700 text-sm">No {isProforma ? 'proforma invoices' : 'invoices'} found.</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isProforma ? 'Create a new proforma invoice to get started.' : 'Create a new sale to generate invoices.'}
                    </p>
                  </td>
                </tr>
              ) : (
                pagedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-5 border border-slate-200 align-middle text-left">
                      <span
                        onClick={() => setViewingInvoice(inv)}
                        className="font-bold text-slate-900 hover:text-[#4309A2] text-sm transition-colors cursor-pointer"
                        title="View details"
                      >
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td className="py-4 px-5 border border-slate-200 align-middle text-left">
                      <div>
                        <span className="font-bold text-slate-900 block truncate">{inv.client.company}</span>
                        <span className="text-[11px] text-slate-400 block truncate">{inv.client.name} &bull; {inv.client.email || inv.client.phone || ''}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 border border-slate-200 align-middle text-center text-slate-600 font-medium">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-4 px-4 border border-slate-200 align-middle text-center text-slate-600 font-medium">{inv.dueDate ? formatDate(inv.dueDate) : '-'}</td>
                    <td className="py-4 px-4 border border-slate-200 align-middle text-center font-bold text-slate-900 font-sans">
                      ₹{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {!isProforma && (
                      <td className="py-4 px-4 border border-slate-200 align-middle text-center font-bold font-sans">
                        {(() => {
                          const isPending = inv.status === 'Pending' || (inv.status === 'Overdue' && !inv.paymentDetails?.amountPaid);
                          const paidAmount = isPending
                            ? 0
                            : (inv.paymentDetails?.amountPaid ?? (inv.status === 'Paid' ? inv.grandTotal : 0));
                          
                          let tdsAmount = Number(inv.paymentDetails?.tdsDeduction) || 0;
                          if (tdsAmount === 0 && inv.customFields) {
                            const tdsField = inv.customFields.find(
                              (f) => f.label?.toLowerCase().includes('tds') || f.id?.toLowerCase().includes('tds')
                            );
                            if (tdsField) {
                              const parsed = parseFloat(tdsField.value.replace(/[^0-9.]/g, ''));
                              if (!isNaN(parsed)) tdsAmount = parsed;
                            }
                          }

                          const balanceDue = Math.max(0, inv.grandTotal - paidAmount);
                          const isPartiallyPaid = inv.status === 'Partially Paid' || (!isPending && paidAmount > 0 && balanceDue > 0.005);

                          return (
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <span className={paidAmount > 0 ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'}>
                                ₹{paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              {tdsAmount > 0 && (
                                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-rose-500"></span>
                                  <span>TDS Deducted: ₹{tdsAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              )}
                              {isPartiallyPaid && balanceDue > 0 && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-600 whitespace-nowrap">
                                  Due: ₹{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    )}
                    <td className="py-4 px-4 border border-slate-200 align-middle text-center">
                      {isProforma ? (
                        <span
                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            inv.status === ('Approved' as any)
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.status === ('Converted' as any)
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : inv.status === ('Sent' as any)
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : inv.status === ('Cancelled' as any)
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {inv.status === ('Approved' as any) && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {inv.status === ('Converted' as any) && <Sparkles className="w-3 h-3 text-purple-600" />}
                          {inv.status === ('Sent' as any) && <Send className="w-3 h-3 text-blue-600" />}
                          {inv.status === ('Cancelled' as any) && <AlertCircle className="w-3 h-3 text-rose-600" />}
                          {inv.status === ('Draft' as any) && <FileText className="w-3 h-3 text-slate-500" />}
                          <span>{inv.status}</span>
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.status === 'Partially Paid'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : inv.status === 'Pending'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {inv.status === 'Paid' && <CheckCircle2 className="w-3 h-3" />}
                          {inv.status === 'Partially Paid' && <Clock className="w-3 h-3 text-sky-600" />}
                          {inv.status === 'Pending' && <Clock className="w-3 h-3" />}
                          {inv.status === 'Overdue' && <AlertCircle className="w-3 h-3" />}
                          <span>{inv.status}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 border border-slate-200 align-middle text-center">
                      <div className="relative inline-block text-center">
                        {/* Three Dots Trigger Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openActionMenuId === inv.id) {
                              setOpenActionMenuId(null);
                              setActionDropdownPos(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const dropdownHeight = 280;

                              if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                // Open upwards if not enough space below
                                setActionDropdownPos({
                                  bottom: window.innerHeight - rect.top + 6,
                                  right: window.innerWidth - rect.right,
                                });
                              } else {
                                // Open downwards
                                setActionDropdownPos({
                                  top: rect.bottom + 6,
                                  right: window.innerWidth - rect.right,
                                });
                              }
                              setOpenActionMenuId(inv.id);
                            }
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
                            openActionMenuId === inv.id
                              ? 'bg-[#4309A2] text-white ring-2 ring-[#4309A2]/20'
                              : 'bg-[#33077C] hover:bg-[#4309A2] text-white'
                          }`}
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4 fill-white text-white" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        total={totalInvoiceCount}
        currentPage={currentPage}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Action Dropdown Menu Portal / Fixed Overlay outside of overflow container */}
      {openActionMenuId && actionDropdownPos && (() => {
        const inv = invoices.find((i) => i.id === openActionMenuId);
        if (!inv) return null;

        return (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => {
                setOpenActionMenuId(null);
                setActionDropdownPos(null);
              }}
            />
            <div
              style={{
                position: 'fixed',
                ...(actionDropdownPos.bottom !== undefined
                  ? { bottom: `${actionDropdownPos.bottom}px` }
                  : { top: `${actionDropdownPos.top}px` }),
                right: `${actionDropdownPos.right}px`,
              }}
              className="w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[9999] animate-in fade-in zoom-in-95 duration-100 text-left"
            >
              {/* 1. View */}
              <button
                type="button"
                onClick={() => {
                  setOpenActionMenuId(null);
                  setActionDropdownPos(null);
                  setViewingInvoice(inv);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="font-semibold text-slate-800 text-[13px]">View</span>
              </button>

              {/* 2. Convert to Invoice (Proforma only) */}
              {isProforma && (
                <button
                  type="button"
                  disabled={inv.status === ('Converted' as any) || isConvertingId === inv.id}
                  onClick={() => {
                    setOpenActionMenuId(null);
                    setActionDropdownPos(null);
                    handleConvertToInvoice(inv);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                    inv.status === ('Converted' as any)
                      ? 'text-slate-400 cursor-not-allowed opacity-60'
                      : 'text-[#33077C] hover:bg-purple-50'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-[#33077C] text-white flex items-center justify-center shrink-0 shadow-xs">
                    {isConvertingId === inv.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                  </div>
                  <span className="font-semibold text-[13px]">
                    {inv.status === ('Converted' as any) ? 'Converted' : 'Convert to Invoice'}
                  </span>
                </button>
              )}

              {/* 3. Change Status (Proforma only) */}
              {isProforma && inv.status !== ('Converted' as any) && (
                <div className="px-3 py-1.5 border-t border-slate-100 my-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Set Status:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['Draft', 'Sent', 'Approved', 'Cancelled'] as ProformaInvoiceStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setOpenActionMenuId(null);
                          setActionDropdownPos(null);
                          handleProformaStatusChange(inv.id, st);
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                          inv.status === (st as any)
                            ? 'bg-[#33077C] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Edit */}
              <button
                type="button"
                onClick={() => {
                  setOpenActionMenuId(null);
                  setActionDropdownPos(null);
                  setIsDuplicateMode(false);
                  setEditingInvoice(JSON.parse(JSON.stringify(inv)));
                  setIsEditModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="font-semibold text-slate-800 text-[13px]">Edit</span>
              </button>

              {/* 5. Duplicate */}
              <button
                type="button"
                onClick={() => {
                  setOpenActionMenuId(null);
                  setActionDropdownPos(null);
                  handleDuplicateInvoice(inv);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#3B82F6] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="font-semibold text-slate-800 text-[13px]">Duplicate</span>
              </button>

              {/* 6. Send with Channels (Super Admin only) */}
              {isSuperAdmin && (
                <div className="relative">
                  <div className="flex items-center justify-between rounded-xl hover:bg-slate-50 transition-colors group">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionMenuId(null);
                        setActionDropdownPos(null);
                        handleSendInvoice(inv);
                      }}
                      className="flex-1 flex items-center gap-3 px-3 py-2 text-slate-800 cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#0EA5E9] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <span className="font-semibold text-slate-800 text-[13px]">Send</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenSendMenuId(openSendMenuId === inv.id ? null : inv.id);
                      }}
                      className={`p-1.5 mr-1.5 rounded-lg transition-all cursor-pointer ${
                        openSendMenuId === inv.id
                          ? 'bg-[#33077C] text-white'
                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                      }`}
                      title="Send options (Gmail & WhatsApp)"
                    >
                      <MoreVertical className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Gmail & WhatsApp sub-menu */}
                  {openSendMenuId === inv.id && (
                    <div className="mt-1 mb-1.5 p-1.5 bg-slate-50 rounded-xl border border-slate-200/80 shadow-inner space-y-1 animate-in fade-in duration-100">
                      {/* Gmail Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenuId(null);
                          setActionDropdownPos(null);
                          setOpenSendMenuId(null);
                          handleSendViaGmail(inv);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.5 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H18V9.75L12 14.25 6 9.75v9.75H3.75A2.25 2.25 0 0 1 1.5 17.25V6.75a2.25 2.25 0 0 1 3.53-1.84L12 10.05l6.97-5.14a2.25 2.25 0 0 1 3.53 1.84Z"
                          />
                          <path
                            fill="#EA4335"
                            d="M18 4.5 12 9 6 4.5h12Z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M1.5 6.75v1.5l10.5 7.5 10.5-7.5v-1.5a2.25 2.25 0 0 0-3.53-1.84L12 8.55 5.03 4.91A2.25 2.25 0 0 0 1.5 6.75Z"
                          />
                          <path
                            fill="#34A853"
                            d="M1.5 17.25c0 1.24 1.01 2.25 2.25 2.25H6V9.75l-4.5 3.38v4.12Z"
                          />
                        </svg>
                        <span>Send via Gmail</span>
                      </button>

                      {/* WhatsApp Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenuId(null);
                          setActionDropdownPos(null);
                          setOpenSendMenuId(null);
                          handleSendViaWhatsApp(inv);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#25D366"
                            d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"
                          />
                          <path
                            fill="#FFF"
                            d="M17.52 14.33c-.23-.12-1.36-.67-1.57-.75-.21-.08-.36-.12-.51.12-.15.23-.6 0.75-.73.9-.13.15-.27.17-.5.06-.23-.12-.98-.36-1.87-1.15-.69-.62-1.16-1.38-1.3-1.61-.13-.23-.01-.36.1-.47.11-.11.23-.27.35-.4.12-.13.15-.23.23-.38.08-.15.04-.29-.02-.4-.06-.12-.51-1.24-.7-1.7-.19-.45-.38-.39-.51-.39-.13-.01-.29-.01-.44-.01-.15 0-.4.06-.61.29-.21.23-.8.78-.8 1.9 0 1.12.82 2.21.93 2.36.12.15 1.6 2.45 3.88 3.44.54.23.97.37 1.3.48.55.17 1.05.15 1.45.09.44-.07 1.36-.56 1.55-1.1.19-.54.19-1.01.13-1.1-.06-.1-.2-.16-.43-.27z"
                          />
                        </svg>
                        <span>Send via WhatsApp</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 7. Payment Action (Standard Invoices only) */}
              {!isProforma && (
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenuId(null);
                    setActionDropdownPos(null);
                    handleOpenMarkAsPaid(inv);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div
                    className={`w-7 h-7 rounded-full text-white flex items-center justify-center shrink-0 shadow-xs ${
                      inv.status === 'Paid'
                        ? 'bg-emerald-600/70'
                        : inv.status === 'Partially Paid'
                          ? 'bg-sky-500'
                          : 'bg-[#10B981]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="font-semibold text-slate-800 text-[13px]">
                    {inv.status === 'Paid'
                      ? 'Payment Details'
                      : inv.status === 'Partially Paid'
                        ? 'Record Payment'
                        : 'Mark as Paid'}
                  </span>
                </button>
              )}

              <div className="my-1.5 border-t border-slate-100" />

              {/* 8. Delete */}
              <button
                type="button"
                onClick={() => {
                  setOpenActionMenuId(null);
                  setActionDropdownPos(null);
                  setDeleteInvoiceConfirm({
                    id: inv.id,
                    number: inv.invoiceNumber,
                  });
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#EF4444] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="font-semibold text-rose-600 text-[13px]">Delete</span>
              </button>
            </div>
          </>
        );
      })()}
      {/* Record Payment Modal in Main Table View */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentModalInvoice(null);
        }}
        invoice={paymentModalInvoice}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* ========================================================================= */}
      {/* EDIT INVOICE FORM MODAL (Opens right on page, no navigation) */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingInvoice && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:hidden animate-in fade-in duration-200"
          onClick={() => {
            setIsEditModalOpen(false);
            setEditingInvoice(null);
            setIsDuplicateMode(false);
          }}
        >
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEditInvoice();
            }}
            className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="px-6 py-4.5 border-b-0 flex items-center justify-between text-white sticky top-0 z-10 shadow-md"
              style={{ background: '#33077C' }}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingInvoice(null);
                    setIsDuplicateMode(false);
                  }}
                  className="p-1.5 -ml-1 rounded-xl transition-all cursor-pointer flex items-center justify-center text-white hover:bg-white/20 active:scale-95"
                  title="Go back"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    {isDuplicateMode
                      ? (isProforma ? 'Duplicate Proforma Invoice' : 'Duplicate Invoice')
                      : 'Edit'}
                  </h2>
                  <p className="text-xs sm:text-[13px] text-white/90 font-medium mt-0.5">
                    {isDuplicateMode
                      ? `Review and adjust line items and dates before adding this ${isProforma ? 'proforma invoice' : 'invoice'} to your list`
                      : `Modify ${isProforma ? 'proforma invoice' : 'invoice'} line items, dates, client information, and bank details`}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body (Scrollable - Clean, Spacious UI matching Reference) */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 bg-white">
              {/* Section 1: Invoice Information */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 pb-2.5 border-b border-slate-100 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4309A2]" />
                  <span>Invoice Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Invoice Number *
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.invoiceNumber}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, invoiceNumber: e.target.value })}
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.referenceNumbers?.[0] || ''}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, referenceNumbers: [e.target.value] })}
                      placeholder="e.g. PO-NEW-SALE"
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Invoice Date *
                    </label>
                    <input
                      type="date"
                      value={editingInvoice.invoiceDate}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, invoiceDate: e.target.value })}
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={editingInvoice.dueDate || ''}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, dueDate: e.target.value })}
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Status *
                    </label>
                    <CustomSelect
                      value={editingInvoice.status}
                      onChange={(val) => setEditingInvoice({ ...editingInvoice, status: val as any })}
                      activeColor="brand"
                      size="md"
                      options={[
                        { value: 'Pending', label: 'Pending' },
                        { value: 'Partially Paid', label: 'Partially Paid' },
                        { value: 'Paid', label: 'Paid' },
                        { value: 'Overdue', label: 'Overdue' },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Bill To (Client) */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 pb-2.5 border-b border-slate-100 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#4309A2]" />
                  <span>Bill To (Client)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.client.name}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          client: { ...editingInvoice.client, name: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.client.company}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          client: { ...editingInvoice.client, company: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.client.phone || ''}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          client: { ...editingInvoice.client, phone: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={editingInvoice.client.email}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          client: { ...editingInvoice.client, email: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      GSTIN / Tax ID *
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.client.gstin || editingInvoice.client.taxId || ''}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          client: { ...editingInvoice.client, gstin: e.target.value, taxId: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.client.pan || ''}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          client: { ...editingInvoice.client, pan: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Billing Address *
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.client.location || ''}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          client: { ...editingInvoice.client, location: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2b: Billing From (Seller) */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 pb-2.5 border-b border-slate-100 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#33077C]" />
                  <span>Billing From (Seller)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.company.name}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          company: { ...editingInvoice.company, name: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Tax ID / GSTIN *
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.company.taxId}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          company: { ...editingInvoice.company, taxId: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.company.phone}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          company: { ...editingInvoice.company, phone: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={editingInvoice.company.email}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          company: { ...editingInvoice.company, email: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Company Address *
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.company.address}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          company: { ...editingInvoice.company, address: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Line Items & Services */}
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#4309A2]" />
                    <h3 className="text-sm font-bold text-slate-800">Line Items &amp; Services</h3>
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
                      {editingInvoice.items.length} {editingInvoice.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEditItem}
                    className="inline-flex items-center gap-2 h-11 px-5 bg-[#33077C] hover:bg-[#4309A2] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer select-none active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editingInvoice.items.map((it, idx) => {
                    const itemSub = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
                    const itemDisc = Number(it.discount) || 0;
                    const itemTaxable = Math.max(0, itemSub - itemDisc);
                    const itemTax = (itemTaxable * (Number(it.taxPercent) || 0)) / 100;
                    const itemTotal = it.total || itemTaxable + itemTax;

                    return (
                      <div
                        key={it.id || idx}
                        style={{ borderRadius: '4px' }}
                        className="bg-white !rounded-[4px] overflow-hidden"
                      >
                        {/* Header bar: Brand Purple Background with Item # and Delete action */}
                        <div
                          className="flex items-center justify-between px-4 py-2.5 text-white"
                          style={{ background: '#33077C' }}
                        >
                          <span className="text-xs font-bold uppercase tracking-wider text-white">
                            Item #{idx + 1}
                          </span>
                          {editingInvoice.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEditItem(idx)}
                              style={{ borderRadius: '4px' }}
                              className="w-7 h-7 !rounded-[4px] text-white hover:text-white/70 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />

                            </button>
                          )}
                        </div>

                        {/* 3 Fields Per Row Grid (6 fields = 2 rows x 3 columns) */}
                        <div className="p-4.5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          {/* 1. Item Name */}
                          <div>
                            <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                              Item Name <span className="text-rose-500 font-bold">*</span>
                            </label>
                            <input
                              type="text"
                              value={it.name}
                              onChange={(e) => handleEditItemChange(idx, 'name', e.target.value)}
                              placeholder="Product or Service Name"
                              style={{ borderRadius: '4px' }}
                              className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] !rounded-[4px] text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                            />
                          </div>

                          {/* 2. Quantity */}
                          <div>
                            <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                              Qty <span className="text-rose-500 font-bold">*</span>
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={it.qty}
                              onChange={(e) => handleEditItemChange(idx, 'qty', Math.max(1, Number(e.target.value) || 1))}
                              style={{ borderRadius: '4px' }}
                              className="w-full h-11 px-3.5 text-center bg-white border border-[#E2E8F0] !rounded-[4px] text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                            />
                          </div>

                          {/* 3. Rate */}
                          <div>
                            <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                              Rate (₹) <span className="text-rose-500 font-bold">*</span>
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={it.unitPrice}
                              onChange={(e) => handleEditItemChange(idx, 'unitPrice', Math.max(0, Number(e.target.value) || 0))}
                              style={{ borderRadius: '4px' }}
                              className="w-full h-11 px-3.5 text-right bg-white border border-[#E2E8F0] !rounded-[4px] text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                            />
                          </div>

                          {/* 4. GST % */}
                          <div>
                            <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                              GST % <span className="text-rose-500 font-bold">*</span>
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={it.taxPercent}
                              onChange={(e) => handleEditItemChange(idx, 'taxPercent', Math.max(0, Number(e.target.value) || 0))}
                              style={{ borderRadius: '4px' }}
                              className="w-full h-11 px-3.5 text-center bg-white border border-[#E2E8F0] !rounded-[4px] text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                            />
                          </div>

                          {/* 5. Discount (₹) */}
                          <div>
                            <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                              Discount (₹)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={it.discount || 0}
                              onChange={(e) => handleEditItemChange(idx, 'discount', Math.max(0, Number(e.target.value) || 0))}
                              style={{ borderRadius: '4px' }}
                              className="w-full h-11 px-3.5 text-right bg-white border border-[#E2E8F0] !rounded-[4px] text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                            />
                          </div>

                          {/* 6. Row Total */}
                          <div>
                            <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                              Row Total
                            </label>
                            <div
                              style={{ borderRadius: '4px' }}
                              className="h-11 px-4 bg-slate-50 border border-[#E2E8F0] !rounded-[4px] text-sm font-bold text-emerald-600 flex items-center justify-end font-sans shadow-2xs"
                            >
                              ₹{itemTotal.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Bank Settlement Details */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 pb-2.5 border-b border-slate-100 mb-4 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#4309A2]" />
                  <span>Bank Settlement Details</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.bank.bankName}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          bank: { ...editingInvoice.bank, bankName: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.bank.accountNumber}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          bank: { ...editingInvoice.bank, accountNumber: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      IFSC Code *
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.bank.ifscCode}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          bank: { ...editingInvoice.bank, ifscCode: e.target.value },
                        })
                      }
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                      UPI ID (VPA)
                    </label>
                    <input
                      type="text"
                      value={editingInvoice.bank.upiId || ''}
                      onChange={(e) =>
                        setEditingInvoice({
                          ...editingInvoice,
                          bank: { ...editingInvoice.bank, upiId: e.target.value },
                        })
                      }
                      placeholder="e.g. company@upi"
                      className="w-full h-11 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Rounding Mode & Calculated Totals Summary */}
              <div
                style={{ borderRadius: '4px' }}
                className="bg-slate-50/60 border border-[#E2E8F0] p-6 !rounded-[4px] space-y-4 font-sans shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Rounding Off Adjustment:
                  </span>
                  <div className="flex items-center gap-2.5">
                    {[
                      { mode: 'none', label: 'No Rounding' },
                      { mode: 'down', label: 'Round Down' },
                      { mode: 'up', label: 'Round Up' },
                    ].map(({ mode, label }) => {
                      const isSelected = (editingInvoice.roundMode || 'none') === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          style={{ borderRadius: '4px' }}
                          onClick={() => handleRoundModeChange(mode as any)}
                          className={`h-10 px-4 !rounded-[4px] text-xs sm:text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? 'bg-[#33077C] text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 stroke-[3] text-white" />}
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2.5 text-xs sm:text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-900">₹{editingInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  {editingInvoice.totalDiscount > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Discount:</span>
                      <span className="font-semibold">-₹{editingInvoice.totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>GST Total:</span>
                    <span className="font-semibold text-slate-900">₹{editingInvoice.taxTotal.toFixed(2)}</span>
                  </div>
                  {editingInvoice.roundOffAmount !== 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Rounding ({editingInvoice.roundMode}):</span>
                      <span className="font-semibold text-slate-900">
                        {editingInvoice.roundOffAmount > 0 ? '+' : ''}₹{editingInvoice.roundOffAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-slate-200 text-base font-bold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-xl font-black text-[#4309A2]">₹{editingInvoice.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingInvoice(null);
                  setIsDuplicateMode(false);
                }}
                className="h-10 px-4.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-bold shadow-2xs transition-all duration-200 cursor-pointer select-none active:scale-[0.98] flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500 stroke-[2.2]" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                onClick={handleSaveEditInvoice}
                className="h-10 px-5.5 bg-[#33077C] hover:bg-[#4309A2] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-[0.98]"
              >
                <Check className="w-4 h-4 text-white stroke-[2.5]" />
                <span>{isDuplicateMode ? 'Duplicate Invoice' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reusable Delete Invoice / Proforma Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteInvoiceConfirm}
        onClose={() => {
          if (!isDeletingInvoice) setDeleteInvoiceConfirm(null);
        }}
        type="Delete"
        itemTypeLabel={isProforma ? 'Proforma Invoice' : 'Invoice'}
        itemName={deleteInvoiceConfirm ? `#${deleteInvoiceConfirm.number}` : undefined}
        confirmButtonText="Yes, Delete"
        isLoading={isDeletingInvoice}
        onConfirm={async () => {
          if (!deleteInvoiceConfirm) return;
          setIsDeletingInvoice(true);
          try {
            await handleDeleteInvoice(deleteInvoiceConfirm.id, deleteInvoiceConfirm.number);
            setDeleteInvoiceConfirm(null);
          } finally {
            setIsDeletingInvoice(false);
          }
        }}
      />
    </div>
  );
};
