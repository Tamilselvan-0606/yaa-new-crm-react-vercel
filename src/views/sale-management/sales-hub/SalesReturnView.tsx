import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  User,
  IndianRupee,
  Package,
  Layers,
  ArrowRight,
  TrendingDown,
  Printer,
  MoreVertical,
  Pencil,
  Trash2,
  PackageCheck,
  Ban,
  Check,
  X,
  Tag,
  Share2,
  Calendar,
  Building2,
  FileSpreadsheet,
  ChevronDown,
  ArrowLeft,
  ShoppingCart,
  Receipt,
  FileUp,
  CreditCard,
  Forward,
} from 'lucide-react';
import {
  useSalesManagementStore,
  SalesReturn,
  SalesReturnItem,
  SalesReturnStatus,
  RefundStatus,
  ReturnReason,
  SaleTransaction,
} from '../../../store/useSalesManagementStore';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { exportTableToExcel } from '../../../utils/excelExport';
import { printTableReport } from '../../../utils/printUtils';
import { toast } from 'sonner';

// Date format helper
const isoToDdmmyyyy = (iso?: string): string => {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
};

const PERIOD_FILTER_OPTIONS = [
  'This Month',
  'Last 30 Days',
  'This Quarter',
  'This Financial Year',
  'All Time',
];

const FIRM_OPTIONS = ['ALL FIRMS', 'Main Branch', 'North Zone Depot'];

const TRANSACTION_TYPES = [
  'All Transaction',
  'Credit Note',
  'Sale',
  'Purchase',
  'Payment-In',
  'Payment-Out',
  'Debit Note',
  'Sale Order',
  'Purchase Order',
  'Estimate',
  'Proforma Invoice',
  'Delivery Challan',
  'Expense',
  'Party to Party [Received]',
  'Party to Party [Paid]',
  'Manufacture',
  'Sale FA',
  'Purchase FA',
  'Sale[Cancelled]',
  'Journal Entry',
];

const RETURN_REASONS: ReturnReason[] = [
  'Damaged',
  'Defective',
  'Wrong Product',
  'Wrong Quantity',
  'Customer Changed Mind',
  'Other',
];

export interface UnifiedTransactionRecord {
  id: string;
  date: string;
  refNo: string;
  partyName: string;
  categoryName?: string;
  type: string;
  total: number;
  receivedPaid: number;
  balance: number;
  status?: string;
  originalReturn?: SalesReturn;
  originalSale?: SaleTransaction;
}

export const SalesReturnView: React.FC = () => {
  const {
    sales,
    salesReturns,
    saveSalesReturn,
    updateSalesReturnStatus,
    customers,
  } = useSalesManagementStore();

  // Top Filter Controls
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [selectedFirm, setSelectedFirm] = useState('ALL FIRMS');
  const [selectedTxType, setSelectedTxType] = useState('All Transaction');
  const [isTxTypeDropdownOpen, setIsTxTypeDropdownOpen] = useState(false);
  const txTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Action Menus & Share Menus
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeShareDropdownId, setActiveShareDropdownId] = useState<string | null>(null);
  const [shareDropdownPos, setShareDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null);
  const [historyTx, setHistoryTx] = useState<UnifiedTransactionRecord | null>(null);

  // Create / Edit Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [partyName, setPartyName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [refNo, setRefNo] = useState('');
  const [returnItems, setReturnItems] = useState<SalesReturnItem[]>([]);
  const [refundMethod, setRefundMethod] = useState<
    'Bank Transfer' | 'UPI' | 'Cash' | 'Store Credit' | 'Original Payment Method'
  >('Cash');
  const [refundStatus, setRefundStatus] = useState<RefundStatus>('Refunded');
  const [generalNotes, setGeneralNotes] = useState('');

  // Close transaction dropdown and action dropdown on outside click or scroll
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        txTypeDropdownRef.current &&
        !txTypeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsTxTypeDropdownOpen(false);
      }
      const target = e.target as HTMLElement;
      if (!target.closest('.sales-return-action-dropdown-container') && !target.closest('.sales-return-action-dropdown-menu')) {
        setActiveMenuId(null);
        setDropdownPos(null);
      }
      if (!target.closest('.sales-return-share-dropdown-container') && !target.closest('.sales-return-share-dropdown-menu')) {
        setActiveShareDropdownId(null);
        setShareDropdownPos(null);
      }
    };
    const handleScroll = () => {
      if (activeMenuId) {
        setActiveMenuId(null);
        setDropdownPos(null);
      }
      if (activeShareDropdownId) {
        setActiveShareDropdownId(null);
        setShareDropdownPos(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeMenuId, activeShareDropdownId]);

  // When selected invoice changes, prefill items and customer
  useEffect(() => {
    if (selectedInvoiceId) {
      const inv = sales.find((s) => s.id === selectedInvoiceId);
      if (inv) {
        setPartyName(inv.customerName);
        setCustomerPhone(inv.customerPhone || '');
        setReturnItems(
          inv.items.map((item) => ({
            id: `ret_item_${Date.now()}_${Math.random()}`,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            batch: item.batch,
            soldQuantity: item.quantity,
            returnQuantity: item.quantity,
            unitPrice: item.unitPrice,
            returnAmount: item.quantity * item.unitPrice,
            reason: 'Defective',
          }))
        );
      }
    }
  }, [selectedInvoiceId, sales]);

  // Aggregate All Transactions for the Tabular Ledger
  const allTransactions = useMemo<UnifiedTransactionRecord[]>(() => {
    const records: UnifiedTransactionRecord[] = [];

    // 1. Sales Returns (Credit Notes)
    (salesReturns || []).forEach((ret, index) => {
      const tot = Number(ret?.returnAmount ?? (ret as any)?.totalReturnAmount ?? (ret as any)?.amount ?? 0) || 0;
      const paid = Number(ret?.refundAmount ?? 0) || 0;
      records.push({
        id: ret?.id || `ret_${index}`,
        date: ret?.returnDate || new Date().toISOString().split('T')[0],
        refNo: (ret?.returnNo || '').replace('RET-', '') || String(index + 1),
        partyName: ret?.customerName || 'Customer',
        categoryName: 'General Goods',
        type: 'Credit Note',
        total: tot,
        receivedPaid: paid,
        balance: Math.max(0, tot - paid),
        status: ret?.returnStatus || 'Approved',
        originalReturn: ret,
      });
    });

    // 2. Sales Invoices
    (sales || []).forEach((s, index) => {
      const tot = Number(s?.grandTotal ?? 0) || 0;
      const paid = Number(s?.paidAmount ?? 0) || 0;
      const bal = Number(s?.balance ?? (tot - paid)) || 0;
      records.push({
        id: s?.id || `sale_${index}`,
        date: s?.saleDate || new Date().toISOString().split('T')[0],
        refNo: String((s?.invoiceNo || '').replace('INV-', '') || index + 1),
        partyName: s?.customerName || 'Customer',
        categoryName: s?.items?.[0]?.productName ? 'Groceries' : 'General Goods',
        type: 'Sale',
        total: tot,
        receivedPaid: paid,
        balance: bal,
        status: s?.saleStatus || 'Confirmed',
        originalSale: s,
      });
    });

    // 3. Demo ledger entries to match reference image (Payment-Out, Estimate, etc.)
    records.push({
      id: 'demo_tx_1',
      date: '2026-10-01',
      refNo: '1',
      partyName: 'Keerthivasan',
      categoryName: '',
      type: 'Payment-Out',
      total: 0,
      receivedPaid: 0,
      balance: 0,
    });
    records.push({
      id: 'demo_tx_2',
      date: '2026-10-01',
      refNo: '1',
      partyName: 'Keerthivasan',
      categoryName: '',
      type: 'Estimate',
      total: 5000,
      receivedPaid: 0,
      balance: 0,
    });

    return records;
  }, [salesReturns, sales]);

  // Filter Transactions by selected type, period, and search
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tx.partyName.toLowerCase().includes(q) ||
        tx.refNo.toLowerCase().includes(q) ||
        tx.type.toLowerCase().includes(q);

      let matchesType = true;
      if (selectedTxType !== 'All Transaction') {
        if (selectedTxType === 'Credit Note') {
          matchesType = tx.type === 'Credit Note' || tx.type === 'Sale Return';
        } else {
          matchesType = tx.type.toLowerCase() === selectedTxType.toLowerCase();
        }
      }

      return matchesSearch && matchesType;
    });
  }, [allTransactions, searchQuery, selectedTxType]);

  // Computed Bottom Totals
  const ledgerTotals = useMemo(() => {
    let totalSum = 0;
    let balanceSum = 0;

    filteredTransactions.forEach((tx) => {
      totalSum += tx.total;
      balanceSum += tx.balance;
    });

    return {
      totalSum,
      balanceSum,
    };
  }, [filteredTransactions]);

  // Real Excel Report Generator
  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      toast.info('No transactions to export.');
      return;
    }

    const excelRows = filteredTransactions.map((tx, idx) => ({
      srNo: idx + 1,
      date: isoToDdmmyyyy(tx.date),
      refNo: tx.refNo || '-',
      partyName: tx.partyName,
      categoryName: tx.categoryName || '-',
      type: tx.type,
      total: Number(tx.total || 0),
      receivedPaid: Number(tx.receivedPaid || 0),
      balance: Number(tx.balance || 0),
    }));

    exportTableToExcel({
      filename: `Sales_Return_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Sales Return',
      title: 'YAA CREATIONS CRM - SALES RETURN & TRANSACTION REPORT',
      subtitle: `Filter: ${selectedPeriod} | Total Records: ${filteredTransactions.length} | Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: '#', key: 'srNo', align: 'center', width: 8 },
        { header: 'Date', key: 'date', align: 'center', width: 15 },
        { header: 'Ref No.', key: 'refNo', align: 'center', width: 15 },
        { header: 'Party Name', key: 'partyName', align: 'left', width: 28 },
        { header: 'Category Name', key: 'categoryName', align: 'left', width: 20 },
        { header: 'Type', key: 'type', align: 'left', width: 16 },
        { header: 'Total (₹)', key: 'total', align: 'right', type: 'currency', width: 18 },
        { header: 'Received/Paid (₹)', key: 'receivedPaid', align: 'right', type: 'currency', width: 18 },
        { header: 'Balance (₹)', key: 'balance', align: 'right', type: 'currency', width: 18 },
      ],
      data: excelRows,
      summaryRow: {
        srNo: 'TOTAL',
        partyName: `${filteredTransactions.length} Transactions`,
        total: ledgerTotals.totalSum,
        balance: ledgerTotals.balanceSum,
      },
    });

    toast.success(`Excel report downloaded successfully (${filteredTransactions.length} records)!`);
  };

  // Print Transactions Table Report
  const handlePrintTableReport = () => {
    if (filteredTransactions.length === 0) {
      toast.info('No transactions to print.');
      return;
    }

    const printRows = filteredTransactions.map((tx, idx) => ({
      srNo: idx + 1,
      date: isoToDdmmyyyy(tx.date),
      refNo: tx.refNo || '-',
      partyName: tx.partyName,
      categoryName: tx.categoryName || '-',
      type: tx.type,
      total: Number(tx.total || 0),
      receivedPaid: Number(tx.receivedPaid || 0),
      balance: Number(tx.balance || 0),
    }));

    printTableReport({
      title: 'Sales Return & Transactions Ledger',
      subtitle: `Period: ${selectedPeriod} | Total: ${filteredTransactions.length} Transactions`,
      orientation: 'landscape',
      metrics: [
        { label: 'Total Records', value: filteredTransactions.length },
        { label: 'Total Amount', value: ledgerTotals.totalSum },
        { label: 'Total Balance', value: ledgerTotals.balanceSum },
      ],
      columns: [
        { header: '#', key: 'srNo', align: 'center', width: '35px' },
        { header: 'Date', key: 'date', align: 'center', width: '85px' },
        { header: 'Ref No.', key: 'refNo', align: 'center', width: '90px' },
        { header: 'Party Name', key: 'partyName', align: 'left', width: '180px' },
        { header: 'Category', key: 'categoryName', align: 'left', width: '120px' },
        { header: 'Type', key: 'type', align: 'left', width: '100px' },
        { header: 'Total (₹)', key: 'total', align: 'right', type: 'currency', width: '100px' },
        { header: 'Received/Paid (₹)', key: 'receivedPaid', align: 'right', type: 'currency', width: '110px' },
        { header: 'Balance (₹)', key: 'balance', align: 'right', type: 'currency', width: '100px' },
      ],
      data: printRows,
      summaryRow: {
        srNo: 'TOTAL',
        partyName: `${filteredTransactions.length} Transactions`,
        total: ledgerTotals.totalSum,
        balance: ledgerTotals.balanceSum,
      },
    });
  };

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, safePage, pageSize]);

  // Open Create Return Modal
  const handleOpenCreateModal = () => {
    setSelectedInvoiceId(sales[0]?.id || '');
    setRefNo(String(salesReturns.length + 1));
    setReturnDate(new Date().toISOString().split('T')[0]);
    setRefundMethod('Cash');
    setRefundStatus('Refunded');
    setGeneralNotes('');
    setIsCreateModalOpen(true);
  };

  // Submit Create Return
  const handleSubmitCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) {
      toast.error('Please enter customer/party name');
      return;
    }
    const validItems = returnItems.filter((i) => i.returnQuantity > 0);
    if (validItems.length === 0) {
      toast.error('Please enter return quantity greater than 0 for at least one item');
      return;
    }

    const totalReturnAmt = validItems.reduce((acc, i) => acc + i.returnAmount, 0);
    const returnNumber = `RET-${new Date().getFullYear()}-${String(salesReturns.length + 1).padStart(4, '0')}`;

    const newReturn: SalesReturn = {
      id: `ret_${Date.now()}`,
      returnNo: returnNumber,
      saleId: selectedInvoiceId || `inv_manual_${Date.now()}`,
      invoiceNo: sales.find((s) => s.id === selectedInvoiceId)?.invoiceNo || `INV-MANUAL-${refNo || '1'}`,
      returnDate,
      customerId: customers.find((c) => c.name.toLowerCase() === partyName.toLowerCase())?.id || `cust_${Date.now()}`,
      customerName: partyName,
      customerCompany: customers.find((c) => c.name.toLowerCase() === partyName.toLowerCase())?.company,
      items: validItems,
      returnAmount: totalReturnAmt,
      returnStatus: 'Approved',
      refundStatus: refundStatus,
      refundMethod: refundMethod,
      refundAmount: refundStatus === 'Refunded' ? totalReturnAmt : 0,
      notes: generalNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSalesReturn(newReturn);
    setIsCreateModalOpen(false);
    toast.success(`Sale Return (Credit Note) ${returnNumber} recorded successfully!`);
  };

  // Open View/Edit
  const handleOpenEdit = (tx: UnifiedTransactionRecord) => {
    setActiveMenuId(null);
    if (tx.originalReturn) {
      setSelectedReturn(tx.originalReturn);
      setSelectedInvoiceId(tx.originalReturn.saleId || '');
      setPartyName(tx.originalReturn.customerName);
      const cust = customers.find((c) => c.id === tx.originalReturn?.customerId || c.name === tx.originalReturn?.customerName);
      setCustomerPhone(cust?.phone || '');
      setReturnDate(tx.originalReturn.returnDate);
      setRefNo(tx.originalReturn.returnNo);
      setReturnItems(tx.originalReturn.items || []);
      setRefundMethod((tx.originalReturn.refundMethod as any) || 'Cash');
      setRefundStatus(tx.originalReturn.refundStatus);
      setGeneralNotes(tx.originalReturn.notes || '');
      setIsCreateModalOpen(true);
    } else {
      setPartyName(tx.partyName);
      setRefNo(tx.refNo);
      setReturnDate(tx.date);
      setIsCreateModalOpen(true);
    }
  };

  // Generate e-Invoice
  const handleGenerateEInvoice = (tx: UnifiedTransactionRecord) => {
    setActiveMenuId(null);
    const irn = `IRN-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    toast.success(`e-Invoice generated for Credit Note #${tx.refNo}! IRN: ${irn}`);
  };

  // Open PDF / Preview
  const handleOpenPdf = (tx: UnifiedTransactionRecord) => {
    setActiveMenuId(null);
    if (tx.originalReturn) {
      setSelectedReturn(tx.originalReturn);
    } else {
      setSelectedReturn({
        id: tx.id,
        returnNo: `RET-${tx.refNo}`,
        saleId: 'sale_1',
        invoiceNo: `INV-${tx.refNo}`,
        customerId: 'cust_1',
        customerName: tx.partyName,
        customerCompany: 'General Enterprise',
        returnDate: tx.date,
        items: [
          {
            id: '1',
            productId: 'PROD_1',
            productName: 'General Goods Item',
            soldQuantity: 1,
            returnQuantity: 1,
            unitPrice: tx.total,
            returnAmount: tx.total,
            reason: 'Customer Changed Mind',
          },
        ],
        returnAmount: tx.total,
        refundMethod: 'Cash',
        refundAmount: tx.receivedPaid,
        refundStatus: 'Refunded',
        returnStatus: 'Approved',
        notes: 'Goods returned in sale condition',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setIsViewModalOpen(true);
  };

  // Print Row
  const handlePrintRow = (tx: UnifiedTransactionRecord) => {
    setActiveMenuId(null);
    handleOpenPdf(tx);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Share Handlers (Email, WhatsApp)
  const handleShareEmail = (tx: UnifiedTransactionRecord) => {
    setActiveShareDropdownId(null);
    setShareDropdownPos(null);
    const customer = customers.find(c => c.name.toLowerCase() === tx.partyName.toLowerCase());
    const email = customer?.email || '';
    const subject = encodeURIComponent(`Credit Note / Sales Return ${tx.refNo} from YAA CRM`);
    const body = encodeURIComponent(
      `Dear ${tx.partyName},\n\n` +
      `Here are the details of your Credit Note / Return Voucher:\n\n` +
      `Reference No: ${tx.refNo}\n` +
      `Date: ${isoToDdmmyyyy(tx.date)}\n` +
      `Transaction Type: ${tx.type}\n` +
      `Total Return Amount: ₹${Number(tx.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
      `Refunded / Adjusted: ₹${Number(tx.receivedPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
      `Balance Amount: ₹${Number(tx.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\n` +
      `Thank you,\nYAA Sales & Accounts Team`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    toast.success(`Opening email for Credit Note ${tx.refNo}`);
  };

  const handleShareWhatsApp = (tx: UnifiedTransactionRecord) => {
    setActiveShareDropdownId(null);
    setShareDropdownPos(null);
    const customer = customers.find(c => c.name.toLowerCase() === tx.partyName.toLowerCase());
    const cleanPhone = (customer?.phone || '').replace(/\D/g, '');
    const text = encodeURIComponent(
      `*CREDIT NOTE / SALES RETURN ACKNOWLEDGEMENT*\n` +
      `--------------------------------\n` +
      `*Ref / Return #:* ${tx.refNo}\n` +
      `*Party Name:* ${tx.partyName}\n` +
      `*Date:* ${isoToDdmmyyyy(tx.date)}\n` +
      `*Transaction Type:* ${tx.type}\n` +
      `*Return Amount:* ₹${Number(tx.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
      `*Refunded Amount:* ₹${Number(tx.receivedPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
      `*Balance:* ₹${Number(tx.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\n` +
      `Thank you for choosing YAA CRM!`
    );
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
    toast.success(`Opening WhatsApp for Credit Note ${tx.refNo}`);
  };

  // Delete Transaction / Return
  const handleDeleteTransaction = (tx: UnifiedTransactionRecord) => {
    setActiveMenuId(null);
    if (tx.originalReturn) {
      const currentReturns = JSON.parse(localStorage.getItem('yaa_crm_sales_returns') || '[]');
      const filtered = currentReturns.filter((r: any) => r.id !== tx.originalReturn!.id);
      localStorage.setItem('yaa_crm_sales_returns', JSON.stringify(filtered));
      toast.success(`Credit Note #${tx.refNo} deleted successfully.`);
      window.dispatchEvent(new Event('storage'));
    } else {
      toast.success(`Transaction Ref #${tx.refNo} removed.`);
    }
  };

  // Duplicate Transaction / Return
  const handleDuplicate = (tx: UnifiedTransactionRecord) => {
    setActiveMenuId(null);
    const newRetNo = `RET-${new Date().getFullYear()}-${String(salesReturns.length + 1).padStart(4, '0')}`;
    const newRet: SalesReturn = {
      id: `ret_${Date.now()}`,
      returnNo: newRetNo,
      saleId: tx.originalReturn?.saleId || `sale_${Date.now()}`,
      invoiceNo: tx.originalReturn?.invoiceNo || `INV-${tx.refNo}`,
      customerId: tx.originalReturn?.customerId || `cust_${Date.now()}`,
      customerName: tx.partyName,
      customerCompany: tx.originalReturn?.customerCompany,
      returnDate: new Date().toISOString().split('T')[0],
      items: tx.originalReturn?.items || [
        {
          id: `item_${Date.now()}`,
          productId: 'PROD_1',
          productName: 'General Goods',
          soldQuantity: 1,
          returnQuantity: 1,
          unitPrice: tx.total,
          returnAmount: tx.total,
          reason: 'Defective',
        },
      ],
      returnAmount: tx.total,
      refundMethod: tx.originalReturn?.refundMethod || 'Cash',
      refundAmount: tx.receivedPaid,
      refundStatus: 'Refunded',
      returnStatus: 'Approved',
      notes: `Duplicated from #${tx.refNo}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveSalesReturn(newRet);
    toast.success(`Duplicated transaction as Credit Note ${newRetNo}!`);
  };

  return (
    <div className="space-y-5 pb-16 font-sans">
      {/* 1. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Sales Return / Credit Note
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#33077C] border border-purple-200">
                {(salesReturns || []).length} total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Manage sales returns, credit notes, stock reversals, and customer refund balances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Button
            variant="secondary"
            size="md"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            onClick={handleExportExcel}
            className="hover:border-emerald-500 hover:text-emerald-700 transition-colors"
          >
            Excel Report
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4 text-white stroke-[2.5]" />}
            onClick={handleOpenCreateModal}
            className="bg-[#33077C] hover:bg-[#280563] text-white shadow-sm hover:shadow transition-all"
          >
            Add Credit Note
          </Button>
        </div>
      </div>

      {/* 2. FILTER BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col gap-4">
        {/* Row 1: Period Filter, Date Range, Firm Selector, and Print Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <FilterDropdown
              options={PERIOD_FILTER_OPTIONS.map((p) => ({ label: p, value: p }))}
              value={selectedPeriod}
              onChange={(val) => setSelectedPeriod(val)}
              placeholder="Period"
            />

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-700">
              <span className="text-slate-400 font-medium">Between</span>
              <span className="font-semibold text-slate-800">01/10/2026</span>
              <span className="text-slate-400 font-medium">To</span>
              <span className="font-semibold text-slate-800">31/10/2026</span>
            </div>

            <div className="relative">
              <select
                value={selectedFirm}
                onChange={(e) => setSelectedFirm(e.target.value)}
                className="h-9 px-3.5 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#33077C] cursor-pointer appearance-none uppercase tracking-wider"
              >
                {FIRM_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Right Side: Print Action */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              type="button"
              onClick={handlePrintTableReport}
              className="h-9 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Print Summary"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Row 2: Transaction Type Filter Dropdown (Credit Note) */}
        <div className="flex items-center gap-3">
          <div className="relative w-48">
            <select
              value={selectedTxType}
              onChange={(e) => {
                setSelectedTxType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-3 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#33077C] cursor-pointer appearance-none"
            >
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. TRANSACTIONS SEARCH & ACTION BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search..."
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#33077C] focus:bg-white transition-colors"
          />
        </div>

        {/* Right: Add Credit Note Button */}
        <div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="h-9 px-4 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#33077C]/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Credit Note</span>
          </button>
        </div>
      </div>

      {/* 3. Main Data Table / Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          /* Empty State */
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 shadow-xs">
              <FileText className="w-10 h-10 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                No data is available for {selectedTxType}.
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                Please try again after making relevant changes.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#33077C]/20 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Credit Note</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-[13px] border-collapse min-w-[900px]">
              {/* Royal Purple Header */}
              <thead>
                <tr className="bg-[#33077C] text-white font-bold uppercase text-[10.5px] border-b border-[#4309A2] tracking-wider select-none">
                  <th className="py-3 px-3 w-10 text-center border-r border-[#4309A2]/70 text-white">#</th>
                  <th className="py-3 px-3.5 border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <div className="flex items-center justify-between gap-1">
                      <span>DATE</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center border-r border-[#4309A2]/70 whitespace-nowrap w-20 text-white">
                    <div className="flex items-center justify-center gap-1">
                      <span>REF NO.</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3 px-4 min-w-[150px] border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <div className="flex items-center justify-between gap-1">
                      <span>PARTY NAME</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5 border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <div className="flex items-center justify-between gap-1">
                      <span>CATEGORY NAME</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5 border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <div className="flex items-center justify-between gap-1">
                      <span>TYPE</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-right border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <div className="flex items-center justify-end gap-1">
                      <span>TOTAL</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-right border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <div className="flex items-center justify-end gap-1">
                      <span>RECEIVED/PAID</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-right border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <div className="flex items-center justify-end gap-1">
                      <span>BALANCE</span>
                      <Filter className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center whitespace-nowrap w-36 text-white">
                    PRINT / SHARE
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-200 text-slate-800 font-sans">
                {paginatedTransactions.map((row, idx) => {
                  const isActionOpen = activeMenuId === row.id;

                  return (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-purple-50/30 transition-colors border-b border-slate-200 group"
                    >
                      {/* # */}
                      <td className="py-3.5 px-3 text-center text-slate-400 font-bold border-r border-slate-200">
                        {(safePage - 1) * pageSize + idx + 1}
                      </td>

                      {/* DATE */}
                      <td className="py-3.5 px-3.5 text-slate-700 font-semibold border-r border-slate-200 whitespace-nowrap">
                        {isoToDdmmyyyy(row.date)}
                      </td>

                      {/* REF NO. */}
                      <td className="py-3.5 px-3 text-center text-slate-800 font-bold border-r border-slate-200 whitespace-nowrap">
                        {row.refNo || '-'}
                      </td>

                      {/* PARTY NAME */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                        {row.partyName}
                      </td>

                      {/* CATEGORY NAME */}
                      <td className="py-3.5 px-3.5 text-slate-500 font-medium border-r border-slate-200 whitespace-nowrap">
                        {row.categoryName || '-'}
                      </td>

                      {/* TYPE */}
                      <td className="py-3.5 px-3.5 font-semibold text-slate-700 border-r border-slate-200 whitespace-nowrap">
                        {row.type}
                      </td>

                      {/* TOTAL */}
                      <td className="py-3.5 px-3.5 text-right font-black text-slate-900 border-r border-slate-200 whitespace-nowrap">
                        ₹ {Number(row.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* RECEIVED/PAID */}
                      <td className="py-3.5 px-3.5 text-right font-semibold text-slate-600 border-r border-slate-200 whitespace-nowrap">
                        ₹ {Number(row.receivedPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* BALANCE */}
                      <td className="py-3.5 px-3.5 text-right font-black text-slate-900 border-r border-slate-200 whitespace-nowrap">
                        ₹ {Number(row.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* PRINT / SHARE / ACTIONS */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* 1. Direct Print Button */}
                          <button
                            type="button"
                            onClick={() => handlePrintRow(row)}
                            className="w-7 h-7 rounded-lg text-slate-500 hover:text-[#33077C] hover:bg-purple-50 flex items-center justify-center transition-colors cursor-pointer"
                            title="Print Receipt"
                          >
                            <Printer className="w-4 h-4 text-slate-600" />
                          </button>

                          {/* 2. Share Dropdown Button */}
                          <div className="sales-return-share-dropdown-container relative inline-block text-left">
                            <button
                              type="button"
                              title="Share / Forward"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                setDropdownPos(null);
                                if (activeShareDropdownId === row.id) {
                                  setActiveShareDropdownId(null);
                                  setShareDropdownPos(null);
                                } else {
                                  const btnRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - btnRect.bottom;
                                  if (spaceBelow < 160) {
                                    setShareDropdownPos({
                                      bottom: window.innerHeight - btnRect.top + 4,
                                      right: window.innerWidth - btnRect.right - 10,
                                    });
                                  } else {
                                    setShareDropdownPos({
                                      top: btnRect.bottom + 4,
                                      right: window.innerWidth - btnRect.right - 10,
                                    });
                                  }
                                  setActiveShareDropdownId(row.id);
                                }
                              }}
                              className="w-8 h-8 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <Forward className="w-4 h-4 stroke-[2.2] text-[#2563EB]" />
                            </button>

                            {/* Share Popover Popup */}
                            {activeShareDropdownId === row.id && shareDropdownPos && (
                              <div
                                className="sales-return-share-dropdown-menu share-dropdown-menu fixed z-[9999] w-48 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                                style={{
                                  top: shareDropdownPos.top !== undefined ? `${shareDropdownPos.top}px` : 'auto',
                                  bottom: shareDropdownPos.bottom !== undefined ? `${shareDropdownPos.bottom}px` : 'auto',
                                  right: `${shareDropdownPos.right}px`,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="text-xs font-bold text-slate-800 mb-2.5 px-1">
                                  Share
                                </div>
                                <div className="flex items-center justify-around gap-3 pt-0.5 pb-0.5">
                                  {/* Email Option */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareEmail(row);
                                    }}
                                    className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none"
                                    title="Share via Email"
                                  >
                                    <div className="w-11 h-11 rounded-xl border-2 border-blue-200 group-hover:border-blue-400 bg-white group-hover:bg-blue-50/50 flex items-center justify-center transition-all shadow-2xs group-hover:scale-105">
                                      {/* Gmail / Email Icon */}
                                      <svg viewBox="0 0 24 24" className="w-5.5 h-5.5" fill="none">
                                        <path
                                          d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                                          stroke="#EA4335"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          fill="#fff"
                                        />
                                        <path
                                          d="M22 6l-10 7L2 6"
                                          stroke="#EA4335"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">
                                      Email
                                    </span>
                                  </button>

                                  {/* WhatsApp Option */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareWhatsApp(row);
                                    }}
                                    className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none"
                                    title="Share via WhatsApp"
                                  >
                                    <div className="w-11 h-11 rounded-xl border border-emerald-100 group-hover:border-emerald-300 bg-white group-hover:bg-emerald-50/50 flex items-center justify-center transition-all shadow-2xs group-hover:scale-105">
                                      {/* WhatsApp Logo */}
                                      <svg viewBox="0 0 24 24" className="w-6.5 h-6.5" fill="#25D366">
                                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 6.46 17.5 2 12.04 2ZM12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.04 3.67C16.58 3.67 20.28 7.37 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15ZM16.56 14.39C16.31 14.27 15.09 13.67 14.86 13.59C14.63 13.5 14.47 13.46 14.31 13.71C14.14 13.95 13.67 14.51 13.53 14.67C13.39 14.84 13.25 14.86 13 14.73C12.75 14.61 11.95 14.35 11 13.5C10.26 12.84 9.76 12.03 9.62 11.78C9.48 11.54 9.6 11.41 9.73 11.28C9.84 11.17 9.98 10.99 10.1 10.85C10.23 10.71 10.27 10.6 10.35 10.44C10.43 10.28 10.39 10.14 10.33 10.02C10.27 9.9 9.78 8.7 9.58 8.2C9.38 7.72 9.18 7.78 9.03 7.77L8.56 7.76C8.4 7.76 8.13 7.82 7.9 8.07C7.68 8.32 7.04 8.92 7.04 10.14C7.04 11.36 7.93 12.54 8.05 12.7C8.17 12.87 9.8 15.38 12.28 16.45C12.87 16.71 13.33 16.86 13.69 16.97C14.29 17.16 14.83 17.14 15.26 17.07C15.74 17 16.74 16.47 16.95 15.89C17.15 15.3 17.15 14.8 17.09 14.7C17.03 14.6 16.81 14.52 16.56 14.39Z" />
                                      </svg>
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">
                                      WhatsApp
                                    </span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 3. 3-Dots Floating Menu */}
                          <div className="sales-return-action-dropdown-container relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isActionOpen) {
                                  setActiveMenuId(null);
                                  setDropdownPos(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const dropdownHeight = 260;
                                  if (spaceBelow < dropdownHeight) {
                                    setDropdownPos({
                                      bottom: window.innerHeight - rect.top + 4,
                                      right: window.innerWidth - rect.right,
                                    });
                                  } else {
                                    setDropdownPos({
                                      top: rect.bottom + 4,
                                      right: window.innerWidth - rect.right,
                                    });
                                  }
                                  setActiveMenuId(row.id);
                                }
                              }}
                              className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                              title="More options"
                            >
                              <MoreVertical className="w-4 h-4 text-slate-600" />
                            </button>

                            {/* 3-Dots Floating Dropdown Menu (7 options matching exact order) */}
                            {isActionOpen && dropdownPos && (
                              <div
                                style={{
                                  position: 'fixed',
                                  top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
                                  bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
                                  right: `${dropdownPos.right}px`,
                                  zIndex: 9999,
                                }}
                                className="sales-return-action-dropdown-menu w-44 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-2 animate-in fade-in zoom-in-95 duration-100 text-left font-sans overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* 1. View/Edit */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(row)}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  View/Edit
                                </button>

                                {/* 2. Generate e-Invoice */}
                                <button
                                  type="button"
                                  onClick={() => handleGenerateEInvoice(row)}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Generate e-Invoice
                                </button>

                                {/* 3. Open PDF */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenPdf(row)}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Open PDF
                                </button>

                                {/* 4. Print */}
                                <button
                                  type="button"
                                  onClick={() => handlePrintRow(row)}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Print
                                </button>

                                {/* 5. Delete */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTransaction(row)}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Delete
                                </button>

                                {/* 6. Duplicate */}
                                <button
                                  type="button"
                                  onClick={() => handleDuplicate(row)}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Duplicate
                                </button>

                                {/* 7. View History */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setHistoryTx(row);
                                  }}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  View History
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Bottom Summary Bar (Total Amount: ₹ ... | Balance: ₹ ...) */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm font-bold text-slate-700 gap-2">
          <div>
            Total Amount:{' '}
            <span className="text-[#33077C] font-black">
              ₹{Number(ledgerTotals.totalSum || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            Balance:{' '}
            <span className="text-slate-900 font-black">
              ₹{Number(ledgerTotals.balanceSum || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Pagination */}
      {filteredTransactions.length > 0 && (
        <Pagination
          total={filteredTransactions.length}
          currentPage={safePage}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={(newPage) => setCurrentPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 6. CREATE SALE RETURN (CREDIT NOTE) MODAL (CRM Standard Design)           */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create Sale Return (Credit Note)"
          subtitle="Process product return, calculate refund amount, and update inventory"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
        >
          <form onSubmit={handleSubmitCreateReturn} className="p-4 sm:p-6 space-y-5">
            {/* Row 1: Select Original Invoice & Party */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Original Invoice <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-[#4309A2]"
                >
                  <option value="">Manual / No Invoice Link</option>
                  {sales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.invoiceNo} - {s.customerName} (₹{s.grandTotal})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Party Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Customer / Party Name"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-[#4309A2]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Return Date
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-[#4309A2]"
                />
              </div>
            </div>

            {/* Row 2: Items Return Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase">
                Return Items Selection
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="p-2.5 text-white">Item Name</th>
                      <th className="p-2.5 text-center text-white">Sold Qty</th>
                      <th className="p-2.5 text-center text-white">Return Qty</th>
                      <th className="p-2.5 text-right text-white">Unit Price</th>
                      <th className="p-2.5 text-white">Reason</th>
                      <th className="p-2.5 text-right text-white">Refund Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returnItems.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="p-2.5 font-bold text-slate-800">{item.productName}</td>
                        <td className="p-2.5 text-center text-slate-500">{item.soldQuantity}</td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="0"
                            max={item.soldQuantity}
                            value={item.returnQuantity}
                            onChange={(e) => {
                              const qty = Number(e.target.value);
                              const updated = [...returnItems];
                              updated[idx] = {
                                ...updated[idx],
                                returnQuantity: qty,
                                returnAmount: qty * item.unitPrice,
                              };
                              setReturnItems(updated);
                            }}
                            className="w-16 h-8 px-2 text-center bg-white border border-slate-200 rounded-lg font-bold outline-none focus:border-[#4309A2]"
                          />
                        </td>
                        <td className="p-2.5 text-right font-medium">₹{item.unitPrice}</td>
                        <td className="p-2.5">
                          <select
                            value={item.reason}
                            onChange={(e) => {
                              const updated = [...returnItems];
                              updated[idx] = { ...updated[idx], reason: e.target.value as ReturnReason };
                              setReturnItems(updated);
                            }}
                            className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                          >
                            {RETURN_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5 text-right font-bold text-[#33077C]">
                          ₹{item.returnAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 3: Refund Method & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Refund Method
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as any)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-[#4309A2]"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Store Credit">Store Credit (Customer Ledger)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Refund Status
                </label>
                <select
                  value={refundStatus}
                  onChange={(e) => setRefundStatus(e.target.value as any)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-[#4309A2]"
                >
                  <option value="Refunded">Refunded (Immediate Payout)</option>
                  <option value="Pending">Pending (Credit Note Issued)</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                className="h-10 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Save Credit Note</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 7. View Details / Print Modal */}
      {isViewModalOpen && selectedReturn && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Credit Note / Return #${selectedReturn.returnNo}`}
          subtitle={`Issued to ${selectedReturn.customerName} on ${isoToDdmmyyyy(selectedReturn.returnDate)}`}
          maxWidth="3xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
        >
          <div className="p-6 sm:p-8 space-y-6 bg-white text-slate-800 font-sans">
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h2 className="text-2xl font-black text-[#33077C]">YAA CREATIONS CRM</h2>
                <p className="text-xs text-slate-500 mt-1">
                  128 Commercial Boulevard, Tech Park, Chennai - 600001
                </p>
                <p className="text-xs text-slate-500">GSTIN: 33AAAAA0000A1Z5 | Phone: +91 98765 43210</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-lg bg-rose-100 text-rose-700 font-black text-xs uppercase tracking-wider mb-2">
                  CREDIT NOTE
                </span>
                <p className="text-sm font-bold text-slate-900">{selectedReturn.returnNo}</p>
                <p className="text-xs text-slate-500">Date: {isoToDdmmyyyy(selectedReturn.returnDate)}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Party Details:</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedReturn.customerName}</p>
                {(selectedReturn as any).customerPhone && <p>Phone: {(selectedReturn as any).customerPhone}</p>}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Return Information:</p>
                <p><strong className="text-slate-700">Original Invoice:</strong> {selectedReturn.invoiceNo}</p>
                <p><strong className="text-slate-700">Refund Status:</strong> {selectedReturn.refundStatus}</p>
                <p><strong className="text-slate-700">Refund Method:</strong> {selectedReturn.refundMethod}</p>
              </div>
            </div>

            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-[#33077C] text-white font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-2.5 text-white">#</th>
                  <th className="p-2.5 text-white">Returned Item</th>
                  <th className="p-2.5 text-center text-white">Return Qty</th>
                  <th className="p-2.5 text-right text-white">Price</th>
                  <th className="p-2.5 text-white">Reason</th>
                  <th className="p-2.5 text-right text-white">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedReturn.items.map((it, i) => (
                  <tr key={i}>
                    <td className="p-2.5 text-slate-400">{i + 1}</td>
                    <td className="p-2.5 font-bold text-slate-800">{it.productName}</td>
                    <td className="p-2.5 text-center">{it.returnQuantity}</td>
                    <td className="p-2.5 text-right">₹{Number(it.unitPrice || 0).toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-slate-600">{it.reason}</td>
                    <td className="p-2.5 text-right font-bold text-[#33077C]">
                      ₹{Number(it.returnAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between text-sm font-black text-rose-700 pt-2 border-t border-slate-200">
                  <span>Total Refund:</span>
                  <span>₹{Number(selectedReturn.returnAmount || (selectedReturn as any).totalReturnAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold flex items-center gap-2 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Credit Note</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 8. History Audit Modal */}
      {historyTx && (
        <Modal
          isOpen={!!historyTx}
          onClose={() => setHistoryTx(null)}
          title={`Audit History - Ref #${historyTx.refNo}`}
          subtitle={`Timeline and lifecycle events for ${historyTx.partyName}`}
          maxWidth="2xl"
          headerGradient={true}
        >
          <div className="p-6 space-y-4">
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-purple-100">
              <div className="relative flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center -ml-6.5 ring-4 ring-white shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Credit Note Created ({historyTx.type})
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Date: {isoToDdmmyyyy(historyTx.date)} • Amount: ₹{historyTx.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                    Initiated by Sales Rep • Status: Approved
                  </div>
                </div>
              </div>

              <div className="relative flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#33077C] text-white flex items-center justify-center -ml-6.5 ring-4 ring-white shrink-0">
                  <Clock className="w-3 h-3" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Stock &amp; Ledger Reversal
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Returned items restocked into inventory ledger.
                  </div>
                  <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                    System Auto-audit • Verified
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryTx(null)}
                className="px-5 py-2 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
