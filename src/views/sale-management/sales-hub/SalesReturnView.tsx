import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Loader2,
  FileCheck2,
} from 'lucide-react';
import {
  useSalesManagementStore,
  SalesReturn,
  SalesReturnItem,
  SalesReturnStatus,
  RefundStatus,
  ReturnReason,
  SaleTransaction,
  SalesCustomer,
} from '../../../store/useSalesManagementStore';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { exportTableToExcel } from '../../../utils/excelExport';
import { printTableReport } from '../../../utils/printUtils';
import { UniversalShareDropdown, formatCreditNoteShare } from '../../../utils/shareUtils';
import { toast } from 'sonner';
import {
  commerceSalesReturnApi,
  mapApiSalesReturnToSalesReturn,
  mapSalesReturnToApiPayload,
  UUID_REGEX,
  SalesReturnFilterParams,
} from '../../../api/commerce/salesReturnApi';
import { customerApi, mapApiCustomerToSalesCustomer } from '../../../api/commerce/customerApi';
import { commerceInvoiceApi, mapApiInvoiceToSaleTransaction } from '../../../api/commerce/invoiceApi';
import { productApi } from '../../../api/commerce/productApi';

// Date format helper
const isoToDdmmyyyy = (iso?: string): string => {
  if (!iso) return '';
  const clean = iso.split('T')[0];
  const parts = clean.split('-');
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

const TRANSACTION_TYPES = [
  'All Transaction',
  'Credit Note',
  'Sale',
  'Payment-In',
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
    setSalesList,
    saveSalesReturn,
    updateSalesReturnStatus: updateStoreReturnStatus,
    deleteSalesReturn: deleteStoreSalesReturn,
    customers,
    setCustomersList,
    paymentIns = [],
  } = useSalesManagementStore();

  // API & List State
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [serverTotal, setServerTotal] = useState(0);
  const isFetchingRef = useRef(false);
  const hasLoadedPrereqs = useRef(false);

  // Top Filter Controls
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return start.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return end.toISOString().split('T')[0];
  });
  const [selectedFirm, setSelectedFirm] = useState('ALL FIRMS');
  const [selectedTxType, setSelectedTxType] = useState('All Transaction');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearchQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Action Menus & Share Menus
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeShareDropdownId, setActiveShareDropdownId] = useState<string | null>(null);
  const [shareDropdownPos, setShareDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<SalesReturn | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null);
  const [historyTx, setHistoryTx] = useState<UnifiedTransactionRecord | null>(null);

  // Status Change Modal
  const [statusModalReturn, setStatusModalReturn] = useState<SalesReturn | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<SalesReturnStatus>('Approved');
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Create / Edit Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [partyName, setPartyName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [refNo, setRefNo] = useState('');
  const [returnItems, setReturnItems] = useState<SalesReturnItem[]>([]);
  const [refundMethod, setRefundMethod] = useState<
    'Bank Transfer' | 'UPI' | 'Cash' | 'Store Credit' | 'Original Payment Method'
  >('Store Credit');
  const [refundStatus, setRefundStatus] = useState<RefundStatus>('Refunded');
  const [returnStatus, setReturnStatus] = useState<SalesReturnStatus>('Approved');
  const [generalNotes, setGeneralNotes] = useState('');

  // -------------------------------------------------------------
  // API: Fetch Sales Returns list with current filters and pagination
  // -------------------------------------------------------------
  const fetchSalesReturns = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsFetching(true);
    try {
      const params: SalesReturnFilterParams = {
        page_no: currentPage,
        page_size: pageSize,
        pagination_required: true,
        sortOrder: 'desc',
      };

      if (appliedSearchQuery) {
        params.search = appliedSearchQuery;
      }
      if (startDate) params.from = startDate;
      if (endDate) params.to = endDate;

      if (selectedPeriod && selectedPeriod !== 'All Time') {
        const pMap: Record<string, string> = {
          'Today': 'today',
          'This Week': 'this_week',
          'This Month': 'this_month',
          'Last Month': 'last_month',
          'This Quarter': 'this_quarter',
          'This Financial Year': 'this_year',
        };
        if (pMap[selectedPeriod]) params.period = pMap[selectedPeriod];
      }

      if (selectedStatusFilter && selectedStatusFilter !== 'All') {
        params.status = selectedStatusFilter;
      }

      if (selectedFirm !== 'ALL FIRMS' && UUID_REGEX.test(selectedFirm)) {
        params.customerId = selectedFirm;
      }

      const res = await commerceSalesReturnApi.getSalesReturns(params);
      if (res?.success && Array.isArray(res.data)) {
        const mapped = res.data.map(mapApiSalesReturnToSalesReturn);
        setSalesReturns(mapped);
        if (res.pagination?.totalRecords !== undefined) {
          setServerTotal(res.pagination.totalRecords);
        } else {
          setServerTotal(mapped.length);
        }
      }
    } catch (err: any) {
      console.warn('Commerce Sales Returns API returned error:', err?.message || err);
    } finally {
      setIsFetching(false);
      setIsInitialLoading(false);
      isFetchingRef.current = false;
    }
  }, [
    currentPage,
    pageSize,
    appliedSearchQuery,
    startDate,
    endDate,
    selectedPeriod,
    selectedStatusFilter,
    selectedFirm,
  ]);

  // Load prerequisites (Sales Invoices & Customers) - Runs once on mount
  useEffect(() => {
    if (hasLoadedPrereqs.current) return;
    hasLoadedPrereqs.current = true;
    const loadPrerequisites = async () => {
      try {
        const [invRes, custRes] = await Promise.all([
          commerceInvoiceApi.getInvoices({ pagination_required: false }),
          customerApi.getCustomers({ pagination_required: false }),
        ]);
        if (invRes?.success && Array.isArray(invRes.data)) {
          setSalesList(invRes.data.map(mapApiInvoiceToSaleTransaction));
        }
        if (custRes?.success && Array.isArray(custRes.data)) {
          setCustomersList(custRes.data.map(mapApiCustomerToSalesCustomer));
        }
      } catch (e) {
        console.warn('Prerequisites fetch failed:', e);
      }
    };
    loadPrerequisites();
  }, [setSalesList, setCustomersList]);

  // Trigger fetch on filter change
  useEffect(() => {
    fetchSalesReturns();
  }, [fetchSalesReturns]);

  // Close transaction dropdown and action dropdown on outside click or scroll
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
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

  // Handle Date period selector
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();
    if (period === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (period === 'Last 30 Days') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (period === 'This Quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1);
      const end = new Date(now.getFullYear(), qMonth + 3, 0);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (period === 'This Financial Year') {
      const fiscalYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const start = new Date(fiscalYear, 3, 1);
      const end = new Date(fiscalYear + 1, 2, 31);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (period === 'All Time') {
      setStartDate('');
      setEndDate('');
    }
    setCurrentPage(1);
  };

  // When selected invoice changes, prefill items and customer
  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    if (!invId) {
      return;
    }
    const inv = sales.find((s) => s.id === invId);
    if (inv) {
      setSelectedCustomerId(inv.customerId || '');
      setPartyName(inv.customerName);
      setCustomerPhone(inv.customerPhone || '');
      setReturnItems(
        inv.items.map((item, idx) => ({
          id: `ret_item_${Date.now()}_${idx}`,
          productId: item.productId,
          productName: item.productName || item.name || 'Unnamed Product',
          sku: item.sku,
          batch: item.batch,
          soldQuantity: item.quantity,
          returnQuantity: Math.min(1, item.quantity),
          unitPrice: item.unitPrice || item.rate || 0,
          returnAmount: (Math.min(1, item.quantity)) * (item.unitPrice || item.rate || 0),
          reason: 'Defective',
        }))
      );
    }
  };

  // Aggregate All Transactions for the Tabular Ledger (Credit Notes, Sales, Payments)
  const allTransactions = useMemo<UnifiedTransactionRecord[]>(() => {
    const records: UnifiedTransactionRecord[] = [];

    // 1. Sales Returns (Credit Notes)
    (salesReturns || []).forEach((ret, index) => {
      const tot = Number(ret?.returnAmount ?? 0) || 0;
      const paid = Number(ret?.refundAmount ?? 0) || 0;
      records.push({
        id: ret?.id || `ret_${index}`,
        date: ret?.returnDate || new Date().toISOString().split('T')[0],
        refNo: (ret?.returnNo || '').replace('RET-', '') || String(index + 1),
        partyName: ret?.customerName || 'Customer',
        categoryName: ret?.items?.[0]?.productName || 'General Goods',
        type: 'Credit Note',
        total: tot,
        receivedPaid: paid,
        balance: Math.max(0, tot - paid),
        status: ret?.returnStatus || 'Approved',
        originalReturn: ret,
      });
    });

    // 2. Sales Invoices (if selected to view in combined ledger)
    if (selectedTxType === 'All Transaction' || selectedTxType === 'Sale') {
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
    }

    // 3. Payments In (if selected)
    if (selectedTxType === 'All Transaction' || selectedTxType === 'Payment-In') {
      (paymentIns || []).forEach((p, index) => {
        const amt = Number(p?.receivedAmount ?? 0) || 0;
        records.push({
          id: p?.id || `pay_${index}`,
          date: p?.date || new Date().toISOString().split('T')[0],
          refNo: String(p?.receiptNo || index + 1),
          partyName: p?.partyName || 'Customer',
          categoryName: 'Payment Receipt',
          type: 'Payment-In',
          total: amt,
          receivedPaid: amt,
          balance: 0,
          status: p?.status || 'Completed',
        });
      });
    }

    // Sort by date desc
    return records.sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [salesReturns, sales, paymentIns, selectedTxType]);

  // Filter Transactions by search and type
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

      let matchesFirm = true;
      if (selectedFirm !== 'ALL FIRMS') {
        const found = customers.find((c) => c.id === selectedFirm);
        matchesFirm = !found || tx.partyName.toLowerCase() === found.name.toLowerCase();
      }

      return matchesSearch && matchesType && matchesFirm;
    });
  }, [allTransactions, searchQuery, selectedTxType, selectedFirm, customers]);

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
    setEditingReturn(null);
    const defaultInv = sales[0];
    if (defaultInv) {
      setSelectedInvoiceId(defaultInv.id);
      setSelectedCustomerId(defaultInv.customerId || '');
      setPartyName(defaultInv.customerName);
      setCustomerPhone(defaultInv.customerPhone || '');
      setReturnItems(
        defaultInv.items.map((item, idx) => ({
          id: `ret_item_${Date.now()}_${idx}`,
          productId: item.productId,
          productName: item.productName || item.name || 'Unnamed Product',
          sku: item.sku,
          batch: item.batch,
          soldQuantity: item.quantity,
          returnQuantity: Math.min(1, item.quantity),
          unitPrice: item.unitPrice || item.rate || 0,
          returnAmount: Math.min(1, item.quantity) * (item.unitPrice || item.rate || 0),
          reason: 'Defective',
        }))
      );
    } else {
      setSelectedInvoiceId('');
      setSelectedCustomerId('');
      setPartyName('');
      setCustomerPhone('');
      setReturnItems([]);
    }
    setRefNo(`RET-${new Date().getFullYear()}-${String(salesReturns.length + 1).padStart(4, '0')}`);
    setReturnDate(new Date().toISOString().split('T')[0]);
    setRefundMethod('Store Credit');
    setRefundStatus('Refunded');
    setReturnStatus('Approved');
    setGeneralNotes('');
    setIsCreateModalOpen(true);
  };

  // Submit Create / Edit Return via Backend API
  const handleSubmitCreateReturn = async (e: React.FormEvent) => {
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

    const matchedCustomer = customers.find(
      (c) => c.id === selectedCustomerId || c.name.toLowerCase() === partyName.toLowerCase()
    );
    const matchedInvoice = sales.find((s) => s.id === selectedInvoiceId);

    setIsSaving(true);
    try {
      const returnNumber = refNo.trim() || `RET-${new Date().getFullYear()}-${String(salesReturns.length + 1).padStart(4, '0')}`;

      const payload = mapSalesReturnToApiPayload({
        returnNo: returnNumber,
        invoiceNo: matchedInvoice?.invoiceNo || undefined,
        saleId: selectedInvoiceId && UUID_REGEX.test(selectedInvoiceId) ? selectedInvoiceId : undefined,
        customerId: matchedCustomer?.id && UUID_REGEX.test(matchedCustomer.id) ? matchedCustomer.id : undefined,
        customerName: partyName.trim(),
        customerCompany: matchedCustomer?.company || undefined,
        returnDate,
        items: validItems,
        refundMethod,
        refundStatus,
        returnStatus,
        notes: generalNotes.trim() || undefined,
      });

      if (editingReturn && editingReturn.id && UUID_REGEX.test(editingReturn.id)) {
        const res = await commerceSalesReturnApi.updateSalesReturn(editingReturn.id, payload);
        if (res?.success && res.data) {
          const mapped = mapApiSalesReturnToSalesReturn(res.data);
          saveSalesReturn(mapped);
          toast.success(`Sales Return ${mapped.returnNo} updated successfully!`);
        }
      } else {
        const res = await commerceSalesReturnApi.createSalesReturn(payload);
        if (res?.success && res.data) {
          const mapped = mapApiSalesReturnToSalesReturn(res.data);
          saveSalesReturn(mapped);
          toast.success(`Sales Return (Credit Note) ${mapped.returnNo} created successfully!`);
        }
      }

      setIsCreateModalOpen(false);
      fetchSalesReturns();
    } catch (err: any) {
      console.error('Failed to save sales return:', err);
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save sales return';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Open View/Edit
  const handleOpenEdit = (tx: UnifiedTransactionRecord) => {
    setActiveMenuId(null);
    if (tx.originalReturn) {
      setEditingReturn(tx.originalReturn);
      setSelectedReturn(tx.originalReturn);
      setSelectedInvoiceId(tx.originalReturn.saleId || '');
      setSelectedCustomerId(tx.originalReturn.customerId || '');
      setPartyName(tx.originalReturn.customerName);
      const cust = customers.find((c) => c.id === tx.originalReturn?.customerId || c.name === tx.originalReturn?.customerName);
      setCustomerPhone(cust?.phone || '');
      setReturnDate(tx.originalReturn.returnDate);
      setRefNo(tx.originalReturn.returnNo);
      setReturnItems(tx.originalReturn.items || []);
      setRefundMethod((tx.originalReturn.refundMethod as any) || 'Store Credit');
      setRefundStatus(tx.originalReturn.refundStatus || 'Refunded');
      setReturnStatus(tx.originalReturn.returnStatus || 'Approved');
      setGeneralNotes(tx.originalReturn.notes || '');
      setIsCreateModalOpen(true);
    } else {
      toast.info(`Editing transaction #${tx.refNo}`);
    }
  };

  // Open Status Update Modal
  const handleOpenStatusModal = (ret: SalesReturn) => {
    setActiveMenuId(null);
    setStatusModalReturn(ret);
    setNewStatusValue(ret.returnStatus || 'Approved');
    setRejectionReasonText(ret.rejectionReason || '');
  };

  // Submit Status Update via PATCH /commerce/returns/{id}/status
  const handleSaveStatusUpdate = async () => {
    if (!statusModalReturn) return;
    if (newStatusValue === 'Rejected' && !rejectionReasonText.trim()) {
      toast.error('Rejection reason is required when rejecting a return');
      return;
    }

    try {
      if (UUID_REGEX.test(statusModalReturn.id)) {
        await commerceSalesReturnApi.updateStatus(
          statusModalReturn.id,
          newStatusValue,
          newStatusValue === 'Rejected' ? rejectionReasonText.trim() : undefined
        );
      }
      updateStoreReturnStatus(
        statusModalReturn.id,
        newStatusValue,
        newStatusValue === 'Rejected' ? rejectionReasonText.trim() : undefined
      );
      toast.success(`Sales Return ${statusModalReturn.returnNo} status updated to ${newStatusValue}`);
      setStatusModalReturn(null);
      fetchSalesReturns();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update return status';
      toast.error(msg);
    }
  };

  // Generate e-Invoice
  const handleGenerateEInvoice = (tx: UnifiedTransactionRecord) => {
    setActiveMenuId(null);
    const irn = `IRN-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    toast.success(`e-Invoice generated for Credit Note #${tx.refNo}! IRN: ${irn}`);
  };

  // Open PDF / Preview
  const handleOpenPdf = async (tx: UnifiedTransactionRecord) => {
    setActiveMenuId(null);
    if (tx.originalReturn) {
      let active = tx.originalReturn;
      if (UUID_REGEX.test(tx.originalReturn.id)) {
        try {
          const res = await commerceSalesReturnApi.getSalesReturnById(tx.originalReturn.id);
          if (res?.success && res.data) {
            active = mapApiSalesReturnToSalesReturn(res.data);
          }
        } catch (e) {
          console.warn('Could not fetch latest return for preview:', e);
        }
      }
      setSelectedReturn(active);
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
    const customer = customers.find((c) => c.name.toLowerCase() === tx.partyName.toLowerCase());
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
    const customer = customers.find((c) => c.name.toLowerCase() === tx.partyName.toLowerCase());
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

  // Delete / Void Return via Backend API
  const handleDeleteTransaction = async (tx: UnifiedTransactionRecord) => {
    setActiveMenuId(null);
    if (tx.originalReturn) {
      if (window.confirm(`Are you sure you want to void / delete Sales Return #${tx.refNo}? Any stock restored by this return will be removed.`)) {
        try {
          if (UUID_REGEX.test(tx.originalReturn.id)) {
            await commerceSalesReturnApi.deleteSalesReturn(tx.originalReturn.id);
          }
          deleteStoreSalesReturn(tx.originalReturn.id);
          toast.success(`Sales Return #${tx.refNo} voided successfully.`);
          fetchSalesReturns();
        } catch (err: any) {
          console.error('Failed to delete sales return:', err);
          const msg =
            err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            err?.message ||
            'Failed to delete sales return';
          toast.error(msg);
        }
      }
    } else {
      toast.info(`Transaction #${tx.refNo} cannot be deleted from here.`);
    }
  };

  // Duplicate Transaction / Return
  const handleDuplicate = (tx: UnifiedTransactionRecord) => {
    setActiveMenuId(null);
    setEditingReturn(null);
    const newRetNo = `RET-${new Date().getFullYear()}-${String(salesReturns.length + 1).padStart(4, '0')}`;
    setSelectedInvoiceId(tx.originalReturn?.saleId || '');
    setSelectedCustomerId(tx.originalReturn?.customerId || '');
    setPartyName(tx.partyName);
    setReturnDate(new Date().toISOString().split('T')[0]);
    setRefNo(newRetNo);
    setReturnItems(tx.originalReturn?.items || []);
    setRefundMethod(tx.originalReturn?.refundMethod || 'Store Credit');
    setRefundStatus('Refunded');
    setReturnStatus('Approved');
    setGeneralNotes(`Duplicate of #${tx.refNo}`);
    setIsCreateModalOpen(true);
    toast.info(`Configuring duplicate Credit Note ${newRetNo}`);
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
                {serverTotal || (salesReturns || []).length} total
              </span>
              {isFetching && (
                <Loader2 className="w-4 h-4 text-[#33077C] animate-spin" />
              )}
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
              onChange={handlePeriodChange}
              placeholder="Period"
            />

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-700">
              <span className="text-slate-400 font-medium">From:</span>
              <span className="font-semibold text-slate-800">{isoToDdmmyyyy(startDate) || 'All'}</span>
              <span className="text-slate-400 font-medium">To:</span>
              <span className="font-semibold text-slate-800">{isoToDdmmyyyy(endDate) || 'All'}</span>
            </div>

            <div className="relative">
              <select
                value={selectedFirm}
                onChange={(e) => {
                  setSelectedFirm(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3.5 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#33077C] cursor-pointer appearance-none"
              >
                <option value="ALL FIRMS">ALL PARTIES</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedStatusFilter}
                onChange={(e) => {
                  setSelectedStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3.5 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#33077C] cursor-pointer appearance-none"
              >
                <option value="All">Status: All</option>
                <option value="Approved">Approved</option>
                <option value="Received">Received</option>
                <option value="Refunded">Refunded</option>
                <option value="Requested">Requested</option>
                <option value="Rejected">Rejected</option>
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

        {/* Row 2: Transaction Type Filter Dropdown */}
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
            placeholder="Search party, return #, or remarks..."
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
      <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-opacity duration-200 ${isFetching ? "opacity-75" : "opacity-100"}`}>
        {isInitialLoading && filteredTransactions.length === 0 ? (
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-10 h-10 text-[#33077C] animate-spin" />
            <h3 className="text-base font-bold text-slate-800">Loading Sales Returns...</h3>
            <p className="text-xs text-slate-400">Fetching records from Commerce API</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
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
                Please try again after making relevant changes or recording a return.
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
                      <Calendar className="w-3 h-3 text-purple-200 opacity-80" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center border-r border-[#4309A2]/70 whitespace-nowrap w-20 text-white">
                    <span>REF NO.</span>
                  </th>
                  <th className="py-3 px-4 min-w-[150px] border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <span>PARTY NAME</span>
                  </th>
                  <th className="py-3 px-3.5 border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <span>CATEGORY / ITEM</span>
                  </th>
                  <th className="py-3 px-3.5 border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <span>TYPE</span>
                  </th>
                  <th className="py-3 px-3.5 text-right border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <span>TOTAL</span>
                  </th>
                  <th className="py-3 px-3.5 text-right border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <span>REFUNDED/PAID</span>
                  </th>
                  <th className="py-3 px-3.5 text-right border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <span>BALANCE</span>
                  </th>
                  <th className="py-3 px-3 text-center border-r border-[#4309A2]/70 whitespace-nowrap text-white">
                    <span>STATUS</span>
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
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            row.type === 'Credit Note'
                              ? 'bg-purple-50 text-[#33077C] border border-purple-200'
                              : row.type === 'Sale'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {row.type}
                        </span>
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

                      {/* STATUS */}
                      <td className="py-3.5 px-3 text-center border-r border-slate-200 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            row.status === 'Approved' || row.status === 'Refunded' || row.status === 'Received' || row.status === 'Completed' || row.status === 'Confirmed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : row.status === 'Rejected' || row.status === 'Cancelled'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {row.status || 'Approved'}
                        </span>
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
                          <UniversalShareDropdown
                            id={row.id}
                            activeShareId={activeShareDropdownId}
                            setActiveShareId={setActiveShareDropdownId}
                            sharePos={shareDropdownPos}
                            setSharePos={setShareDropdownPos}
                            getShareData={() => formatCreditNoteShare(row)}
                            title="Share Credit Note / Return"
                          />

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

                            {/* 3-Dots Floating Dropdown Menu */}
                            {isActionOpen && dropdownPos && (
                              <div
                                style={{
                                  position: 'fixed',
                                  top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
                                  bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
                                  right: `${dropdownPos.right}px`,
                                  zIndex: 9999,
                                }}
                                className="sales-return-action-dropdown-menu w-48 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-2 animate-in fade-in zoom-in-95 duration-100 text-left font-sans overflow-hidden"
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

                                {/* 2. Update Status (For original returns) */}
                                {row.originalReturn && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenStatusModal(row.originalReturn!)}
                                    className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-[#33077C] transition-colors cursor-pointer block"
                                  >
                                    Change Status...
                                  </button>
                                )}

                                {/* 3. Generate e-Invoice */}
                                <button
                                  type="button"
                                  onClick={() => handleGenerateEInvoice(row)}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Generate e-Invoice
                                </button>

                                {/* 4. Open PDF */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenPdf(row)}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Open PDF
                                </button>

                                {/* 5. Print */}
                                <button
                                  type="button"
                                  onClick={() => handlePrintRow(row)}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Print
                                </button>

                                {/* 6. Delete */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTransaction(row)}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors cursor-pointer block"
                                >
                                  Void / Delete
                                </button>

                                {/* 7. Duplicate */}
                                <button
                                  type="button"
                                  onClick={() => handleDuplicate(row)}
                                  className="w-full text-left px-4 py-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer block"
                                >
                                  Duplicate
                                </button>

                                {/* 8. View History */}
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

        {/* 4. Bottom Summary Bar */}
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
      {/* 6. CREATE SALE RETURN (CREDIT NOTE) MODAL                                 */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title={editingReturn ? `Edit Sale Return: ${editingReturn.returnNo}` : "Create Sale Return (Credit Note)"}
          subtitle="Process product return, calculate refund amount, and update inventory"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
        >
          <form noValidate onSubmit={handleSubmitCreateReturn} className="p-4 sm:p-6 space-y-5">
            {/* Row 1: Select Original Invoice & Party */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Original Invoice <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-[#4309A2]"
                >
                  <option value="">Manual / Unlinked Return</option>
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
              <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase flex items-center justify-between">
                <span>Return Items Selection</span>
                <span className="text-[11px] font-semibold text-slate-500 lowercase">
                  (Stock is automatically restored when Approved/Received/Refunded)
                </span>
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
                    {returnItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          {selectedInvoiceId
                            ? "No products found in this invoice."
                            : "Select an original invoice above to populate sold line items."}
                        </td>
                      </tr>
                    ) : (
                      returnItems.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="p-2.5 font-bold text-slate-800">{item.productName}</td>
                          <td className="p-2.5 text-center text-slate-500">{item.soldQuantity}</td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              max={item.soldQuantity || 9999}
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 3: Refund Method, Refund Status, Return Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Refund Method
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as any)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-[#4309A2]"
                >
                  <option value="Store Credit">Store Credit (Customer Ledger)</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
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
                  <option value="Refunded">Refunded (Settled)</option>
                  <option value="Pending">Pending</option>
                  <option value="Store Credit">Store Credit</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Return Lifecycle Status
                </label>
                <select
                  value={returnStatus}
                  onChange={(e) => setReturnStatus(e.target.value as any)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-[#4309A2]"
                >
                  <option value="Approved">Approved (Restores Stock)</option>
                  <option value="Received">Received (Restores Stock)</option>
                  <option value="Refunded">Refunded (Restores Stock)</option>
                  <option value="Requested">Requested</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Row 4: Remarks */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Remarks / Notes
              </label>
              <textarea
                rows={2}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Reason for return, condition of packaging, inspection notes..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm outline-none focus:border-[#4309A2]"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSaving}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-10 px-6 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Check className="w-4 h-4 stroke-[2.5]" />}
                <span>{isSaving ? "Saving..." : editingReturn ? "Update Credit Note" : "Save Credit Note"}</span>
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
                {selectedReturn.customerCompany && <p className="text-slate-500">{selectedReturn.customerCompany}</p>}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Return Information:</p>
                <p><strong className="text-slate-700">Original Invoice:</strong> {selectedReturn.invoiceNo || 'Manual Return'}</p>
                <p><strong className="text-slate-700">Return Status:</strong> {selectedReturn.returnStatus}</p>
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
                {(selectedReturn.items || []).map((it, i) => (
                  <tr key={i}>
                    <td className="p-2.5 text-slate-400">{i + 1}</td>
                    <td className="p-2.5 font-bold text-slate-800">{it.productName}</td>
                    <td className="p-2.5 text-center">{it.returnQuantity}</td>
                    <td className="p-2.5 text-right">₹{Number(it.unitPrice || 0).toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-slate-600">{it.reason}</td>
                    <td className="p-2.5 text-right font-bold text-[#33077C]">
                      ₹{Number(it.returnAmount || it.returnQuantity * it.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between text-sm font-black text-rose-700 pt-2 border-t border-slate-200">
                  <span>Total Refund:</span>
                  <span>₹{Number(selectedReturn.returnAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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

      {/* 8. Change Status Modal */}
      {statusModalReturn && (
        <Modal
          isOpen={Boolean(statusModalReturn)}
          onClose={() => setStatusModalReturn(null)}
          title={`Update Status: ${statusModalReturn.returnNo}`}
          subtitle={`Current Status: ${statusModalReturn.returnStatus}`}
          maxWidth="md"
        >
          <div className="p-4 space-y-4 text-xs sm:text-sm font-sans">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                New Status
              </label>
              <select
                value={newStatusValue}
                onChange={(e) => setNewStatusValue(e.target.value as SalesReturnStatus)}
                className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold outline-none focus:border-[#33077C]"
              >
                <option value="Approved">Approved (Restores Stock)</option>
                <option value="Received">Received (Restores Stock)</option>
                <option value="Refunded">Refunded (Restores Stock)</option>
                <option value="Requested">Requested (Removes restored stock)</option>
                <option value="Rejected">Rejected (Removes restored stock)</option>
              </select>
            </div>

            {newStatusValue === 'Rejected' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReasonText}
                  onChange={(e) => setRejectionReasonText(e.target.value)}
                  placeholder="Explain why this return was rejected (e.g. Item damaged by customer misuse, seal already opened)..."
                  className="w-full p-3 bg-white border border-rose-300 rounded-xl text-xs sm:text-sm outline-none focus:border-rose-600"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={() => setStatusModalReturn(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="button"
                onClick={handleSaveStatusUpdate}
                className="bg-[#33077C] hover:bg-[#280563]"
              >
                Update Status
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 9. History Audit Modal */}
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
                    Transaction Recorded ({historyTx.type})
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Date: {isoToDdmmyyyy(historyTx.date)} • Amount: ₹{historyTx.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                    Status: {historyTx.status || 'Active'}
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
                    Returned items restocked into inventory ledger on approval.
                  </div>
                  <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                    Commerce Backend API Synchronized
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

export default SalesReturnView;
