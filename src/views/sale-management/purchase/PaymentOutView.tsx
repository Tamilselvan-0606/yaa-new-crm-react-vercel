import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CreditCard,
  Plus,
  Eye,
  Trash2,
  Calendar,
  IndianRupee,
  Printer,
  MoreVertical,
  Wallet,
  ChevronDown,
  Check,
  Copy,
  History,
  Upload,
  Image as ImageIcon,
  X,
  Forward,
  FileSpreadsheet,
} from 'lucide-react';
import {
  useSalesManagementStore,
  PaymentOut,
  PaymentOutMode,
} from '../../../store/useSalesManagementStore';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { exportTableToExcel } from '../../../utils/excelExport';
import { toast } from 'sonner';

const PERIOD_FILTER_OPTIONS = [
  { label: 'Today', value: 'Today' },
  { label: 'All Payment-Out Invoices', value: 'All Payment-Out Invoices' },
  { label: 'This Month', value: 'This Month' },
  { label: 'Last Month', value: 'Last Month' },
  { label: 'This Quarter', value: 'This Quarter' },
  { label: 'This Year', value: 'This Year' },
  { label: 'This Financial Year', value: 'This Financial Year' },
  { label: 'Custom', value: 'Custom' },
];

export const PaymentOutView: React.FC = () => {
  const { paymentOuts, suppliers, purchases, savePaymentOut, deletePaymentOut } = useSalesManagementStore();

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingPeriod, setPendingPeriod] = useState('All Payment-Out Invoices');
  const [appliedPeriod, setAppliedPeriod] = useState('All Payment-Out Invoices');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState(false);
  const [pendingPaymentMode, setPendingPaymentMode] = useState('All');
  const [appliedPaymentMode, setAppliedPaymentMode] = useState('All');
  const [pendingSupplier, setPendingSupplier] = useState('All');
  const [appliedSupplier, setAppliedSupplier] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const periodDropdownRef = useRef<HTMLDivElement>(null);

  // Close period dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) {
        setIsPeriodOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3-Dots Action dropdown & Share Popover
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [sharePos, setSharePos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Close action dropdown and share popover on click outside or scroll
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-dropdown-container') && !target.closest('.action-dropdown-menu')) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (!target.closest('.share-popover-container') && !target.closest('.share-popover-menu')) {
        setActiveShareId(null);
        setSharePos(null);
      }
    };
    const handleScroll = () => {
      if (activeDropdownId) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (activeShareId) {
        setActiveShareId(null);
        setSharePos(null);
      }
    };
    window.addEventListener('click', handleOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeDropdownId, activeShareId]);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentOut | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  // Open Edit Payment Modal
  const handleOpenEditModal = (po: PaymentOut) => {
    setEditingPaymentId(po.id);
    setFormData({
      paymentNo: po.paymentNo,
      paymentDate: po.paymentDate,
      supplierId: po.supplierId || '',
      purchaseId: po.purchaseId || '',
      amount: po.amount,
      paymentMode: po.paymentMode || 'Bank Transfer',
      referenceNo: po.referenceNo || '',
      receiptImage: po.receiptImage || '',
      notes: po.notes || '',
    });
    setActiveDropdownId(null);
    setIsFormModalOpen(true);
  };

  // Duplicate Payment Handler
  const handleDuplicatePayment = (po: PaymentOut) => {
    setEditingPaymentId(null);
    const nextNo = `VPA-${new Date().getFullYear()}-${String(paymentOuts.length + 101).padStart(3, '0')}`;
    setFormData({
      paymentNo: nextNo,
      paymentDate: new Date().toISOString().split('T')[0],
      supplierId: po.supplierId || '',
      purchaseId: po.purchaseId || '',
      amount: po.amount,
      paymentMode: po.paymentMode || 'Bank Transfer',
      referenceNo: po.referenceNo ? `${po.referenceNo}-COPY` : '',
      receiptImage: po.receiptImage || '',
      notes: po.notes ? `[Duplicate of ${po.paymentNo}] ${po.notes}` : `Duplicate of voucher ${po.paymentNo}`,
    });
    setActiveDropdownId(null);
    setIsFormModalOpen(true);
    toast.info(`Cloned details from ${po.paymentNo} into form for editing.`);
  };

  // Form State
  const [formData, setFormData] = useState<{
    paymentNo: string;
    paymentDate: string;
    supplierId: string;
    purchaseId: string;
    amount: number | '';
    paymentMode: PaymentOutMode;
    referenceNo: string;
    receiptImage: string;
    notes: string;
  }>({
    paymentNo: '',
    paymentDate: new Date().toISOString().split('T')[0],
    supplierId: '',
    purchaseId: '',
    amount: '',
    paymentMode: 'Bank Transfer',
    referenceNo: '',
    receiptImage: '',
    notes: '',
  });

  // Calculate Display Date/Date Range for Filter by badge
  const periodDateBadgeText = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatDMY = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

    if (appliedPeriod === 'Today') {
      return formatDMY(now);
    }
    if (appliedPeriod === 'This Month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return `${formatDMY(start)} to ${formatDMY(end)}`;
    }
    if (appliedPeriod === 'Last Month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return `${formatDMY(start)} to ${formatDMY(end)}`;
    }
    if (appliedPeriod === 'This Quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1);
      const end = new Date(now.getFullYear(), qMonth + 3, 0);
      return `${formatDMY(start)} to ${formatDMY(end)}`;
    }
    if (appliedPeriod === 'This Year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return `${formatDMY(start)} to ${formatDMY(end)}`;
    }
    if (appliedPeriod === 'This Financial Year') {
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const start = new Date(fyStartYear, 3, 1);
      const end = new Date(fyStartYear + 1, 2, 31);
      return `${formatDMY(start)} to ${formatDMY(end)}`;
    }
    if (appliedPeriod === 'Custom' && customStartDate && customEndDate) {
      const s = new Date(customStartDate);
      const e = new Date(customEndDate);
      return `${formatDMY(s)} to ${formatDMY(e)}`;
    }
    return formatDMY(now);
  }, [appliedPeriod, customStartDate, customEndDate]);

  // Eligible purchases for selected supplier (pending or partial bills, or currently selected bill when editing)
  const supplierPurchases = useMemo(() => {
    if (!formData.supplierId) return [];
    return purchases.filter(
      (p) =>
        p.supplierId === formData.supplierId &&
        (p.id === formData.purchaseId || p.paymentStatus === 'Unpaid' || p.paymentStatus === 'Partial' || p.balance > 0)
    );
  }, [purchases, formData.supplierId, formData.purchaseId]);

  // Open Create Payment Modal
  const handleOpenCreateModal = () => {
    setEditingPaymentId(null);
    const nextNo = `VPA-${new Date().getFullYear()}-${String(paymentOuts.length + 101).padStart(3, '0')}`;
    setFormData({
      paymentNo: nextNo,
      paymentDate: new Date().toISOString().split('T')[0],
      supplierId: '',
      purchaseId: '',
      amount: '',
      paymentMode: 'Bank Transfer',
      referenceNo: '',
      receiptImage: '',
      notes: '',
    });
    setIsFormModalOpen(true);
  };

  // When a specific purchase bill is selected, auto-fill the balance amount
  const handlePurchaseSelect = (poId: string) => {
    const po = purchases.find((p) => p.id === poId);
    setFormData((prev) => ({
      ...prev,
      purchaseId: poId,
      amount: po ? po.balance : prev.amount,
    }));
  };

  // Submit Payment (Create or Edit)
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) {
      toast.error('Please select a supplier.');
      return;
    }
    const numAmount = Number(formData.amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid payment amount greater than 0.');
      return;
    }

    const supplierObj = suppliers.find((s) => s.id === formData.supplierId);
    const purchaseObj = purchases.find((p) => p.id === formData.purchaseId);
    const existing = editingPaymentId ? paymentOuts.find((p) => p.id === editingPaymentId) : null;

    const payload: PaymentOut = {
      id: editingPaymentId || `pay_out_${Date.now()}`,
      paymentNo: formData.paymentNo || `VPA-${Date.now()}`,
      paymentDate: formData.paymentDate,
      supplierId: formData.supplierId,
      supplierName: supplierObj?.name || existing?.supplierName || 'Unknown Supplier',
      supplierCode: supplierObj?.supplierCode || existing?.supplierCode,
      purchaseId: formData.purchaseId || undefined,
      purchaseNo: purchaseObj?.purchaseNo || (formData.purchaseId ? existing?.purchaseNo : undefined),
      amount: numAmount,
      paymentMode: formData.paymentMode,
      referenceNo: formData.referenceNo,
      receiptImage: formData.receiptImage || undefined,
      notes: formData.notes,
      status: existing ? existing.status : 'Completed',
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    savePaymentOut(payload);
    toast.success(
      editingPaymentId
        ? `Payment voucher ${payload.paymentNo} updated successfully!`
        : `Payment ${payload.paymentNo} recorded successfully!`
    );
    setEditingPaymentId(null);
    setIsFormModalOpen(false);
  };

  // Delete Payment
  const handleDeletePayment = (id: string, paymentNo: string) => {
    if (window.confirm(`Are you sure you want to delete payment record ${paymentNo}?`)) {
      deletePaymentOut(id);
      toast.success(`Payment voucher ${paymentNo} deleted.`);
      setActiveDropdownId(null);
    }
  };

  // Filtered List based on Search, Period & Date Ranges, Payment Mode, Supplier
  const filteredPayments = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return paymentOuts.filter((p) => {
      // 1. Search Query
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.paymentNo.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        (p.purchaseNo && p.purchaseNo.toLowerCase().includes(q)) ||
        (p.referenceNo && p.referenceNo.toLowerCase().includes(q));

      // 2. Period Filter
      let matchesPeriod = true;
      const pDate = p.paymentDate; // 'YYYY-MM-DD'
      if (appliedPeriod === 'Today') {
        matchesPeriod = pDate === todayStr;
      } else if (appliedPeriod === 'This Month') {
        const curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        matchesPeriod = pDate.startsWith(curYm);
      } else if (appliedPeriod === 'Last Month') {
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevYm = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
        matchesPeriod = pDate.startsWith(prevYm);
      } else if (appliedPeriod === 'This Quarter') {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        const qStart = new Date(now.getFullYear(), qMonth, 1).toISOString().split('T')[0];
        const qEnd = new Date(now.getFullYear(), qMonth + 3, 0).toISOString().split('T')[0];
        matchesPeriod = pDate >= qStart && pDate <= qEnd;
      } else if (appliedPeriod === 'This Year') {
        matchesPeriod = pDate.startsWith(`${now.getFullYear()}`);
      } else if (appliedPeriod === 'This Financial Year') {
        const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const fyStart = `${fyStartYear}-04-01`;
        const fyEnd = `${fyStartYear + 1}-03-31`;
        matchesPeriod = pDate >= fyStart && pDate <= fyEnd;
      } else if (appliedPeriod === 'Custom' && customStartDate && customEndDate) {
        matchesPeriod = pDate >= customStartDate && pDate <= customEndDate;
      }

      // 3. Payment Mode
      const matchesMode =
        appliedPaymentMode === 'All' ||
        p.paymentMode.toLowerCase() === appliedPaymentMode.toLowerCase();

      return matchesSearch && matchesPeriod && matchesMode;
    });
  }, [paymentOuts, appliedSearch, appliedPeriod, customStartDate, customEndDate, appliedPaymentMode]);

  // Metrics Summary
  const summary = useMemo(() => {
    const totalDisbursed = filteredPayments.reduce((acc, p) => acc + (p.status === 'Completed' ? p.amount : 0), 0);
    const today = new Date().toISOString().split('T')[0];
    const todayPaid = filteredPayments
      .filter((p) => p.paymentDate === today && p.status === 'Completed')
      .reduce((acc, p) => acc + p.amount, 0);
    const totalVouchers = filteredPayments.length;
    const bankPayments = filteredPayments
      .filter((p) => ['Bank Transfer', 'UPI', 'Net Banking', 'Card'].includes(p.paymentMode))
      .reduce((acc, p) => acc + p.amount, 0);
    const cashPayments = filteredPayments
      .filter((p) => p.paymentMode === 'Cash')
      .reduce((acc, p) => acc + p.amount, 0);

    return {
      totalDisbursed,
      todayPaid,
      totalVouchers,
      bankPayments,
      cashPayments,
    };
  }, [filteredPayments]);

  // Export Payment-Out Records to Excel
  const handleExportExcel = () => {
    if (filteredPayments.length === 0) {
      toast.error('No payment out records available to export.');
      return;
    }

    const excelRows = filteredPayments.map((p, idx) => ({
      sNo: idx + 1,
      paymentNo: p.paymentNo,
      paymentDate: p.paymentDate,
      supplierName: p.supplierName,
      supplierCode: p.supplierCode || '-',
      purchaseNo: p.purchaseNo || 'Direct Payment / Advance',
      paymentMode: p.paymentMode,
      referenceNo: p.referenceNo || '-',
      amount: Number(p.amount || 0),
      status: p.status,
    }));

    const grandDisbursed = excelRows.reduce((acc, row) => acc + row.amount, 0);

    exportTableToExcel({
      filename: `Payment_Out_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Vendor Payments',
      title: 'YAA CREATIONS CRM - PAYMENT OUT & VENDOR DISBURSEMENTS',
      subtitle: `Total Payments: ${filteredPayments.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'Voucher #', key: 'paymentNo', align: 'center', width: 16 },
        { header: 'Payment Date', key: 'paymentDate', align: 'center', width: 14 },
        { header: 'Supplier Name', key: 'supplierName', align: 'left', width: 24 },
        { header: 'Linked Bill #', key: 'purchaseNo', align: 'left', width: 18 },
        { header: 'Payment Mode', key: 'paymentMode', align: 'center', width: 16 },
        { header: 'Reference / UTR', key: 'referenceNo', align: 'left', width: 18 },
        { header: 'Amount Paid (₹)', key: 'amount', align: 'right', type: 'currency', width: 18 },
        { header: 'Status', key: 'status', align: 'center', width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: 'TOTAL',
        paymentNo: `${filteredPayments.length} Vouchers`,
        amount: grandDisbursed,
      },
    });

    toast.success(`Payment Out Excel report downloaded (${filteredPayments.length} records)!`);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <CreditCard className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Payment Out (Vendor Disbursements)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Track outgoing payments, record vendor settlement vouchers, and clear purchase payables
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            className="w-full sm:w-auto justify-center"
            onClick={handleExportExcel}
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Excel Report
          </Button>

          <Button
            variant="primary"
            size="md"
            className="w-full sm:w-auto justify-center"
            onClick={handleOpenCreateModal}
            icon={<Plus className="w-4 h-4 text-white" />}
          >
            Record Payment Out
          </Button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Disbursed */}
        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Paid Out</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              ₹{summary.totalDisbursed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Across {summary.totalVouchers} payment vouchers</div>
          </div>
        </div>

        {/* Paid Today */}
        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Paid Today</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              ₹{summary.todayPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Cleared in today's cycle</div>
          </div>
        </div>

        {/* Digital / Bank Transfers */}
        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Online & Bank Paid</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              ₹{summary.bankPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">NEFT / RTGS / UPI / Card</div>
          </div>
        </div>

        {/* Cash Paid */}
        <div className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cash Settlements</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-900">
              ₹{summary.cashPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Petty cash & direct handoffs</div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar in a Single Line */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search by voucher #, supplier..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedPeriod(pendingPeriod);
          setAppliedPaymentMode(pendingPaymentMode);
          setCurrentPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingPeriod('All Payment-Out Invoices');
          setAppliedPeriod('All Payment-Out Invoices');
          setPendingPaymentMode('All');
          setAppliedPaymentMode('All');
          setCurrentPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2 flex-nowrap">
            {/* Filter by Label */}
            <span className="text-xs sm:text-[13px] font-semibold text-slate-700 whitespace-nowrap shrink-0">
              Filter by :
            </span>

            {/* Filter by Period (Same style as Mode filter) */}
            <div className="shrink-0">
              <FilterDropdown
                placeholder="Period : All"
                value={pendingPeriod}
                onChange={(val) => {
                  setPendingPeriod(val);
                  setAppliedPeriod(val);
                  setCurrentPage(1);
                  if (val === 'Custom') {
                    setIsCustomDateModalOpen(true);
                  }
                }}
                options={PERIOD_FILTER_OPTIONS}
              />
            </div>

            {/* Filter by Mode */}
            <div className="shrink-0">
              <FilterDropdown
                placeholder="Mode : All"
                value={pendingPaymentMode}
                onChange={(val) => {
                  setPendingPaymentMode(val);
                  setAppliedPaymentMode(val);
                  setCurrentPage(1);
                }}
                options={[
                  { label: 'Mode : All', value: 'All' },
                  { label: 'Bank Transfer', value: 'Bank Transfer' },
                  { label: 'UPI', value: 'UPI' },
                  { label: 'Cash', value: 'Cash' },
                  { label: 'Cheque', value: 'Cheque' },
                  { label: 'Card', value: 'Card' },
                  { label: 'Net Banking', value: 'Net Banking' },
                  { label: 'Other', value: 'Other' },
                ]}
              />
            </div>
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1 whitespace-nowrap">
            <span className="text-xs font-semibold text-slate-500">
              Total Vouchers :{' '}
              <span className="text-[#33077C] font-bold">{filteredPayments.length}</span>
            </span>
          </div>
        }
      />

      {/* 4. Table matching 2nd reference image UI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">VOUCHER NO</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">DATE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">SUPPLIER / VENDOR</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">AGAINST BILL</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">PAYMENT MODE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">REFERENCE / UTR</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-right">AMOUNT PAID</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">No payment vouchers found</p>
                    <p className="text-xs text-slate-400 mt-1">Record a new payment out when settling supplier dues</p>
                  </td>
                </tr>
              ) : (
                filteredPayments
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((po) => {
                    return (
                      <tr
                        key={po.id}
                        className="hover:bg-purple-50/20 transition-colors border-b border-slate-200"
                      >
                        {/* 1. Voucher No */}
                        <td className="py-3.5 px-5 border border-slate-200">
                          <span className="font-semibold text-slate-800 text-xs">
                            {po.paymentNo}
                          </span>
                        </td>

                        {/* 2. Date */}
                        <td className="py-3.5 px-5 text-slate-800 font-bold text-xs border border-slate-200 whitespace-nowrap">
                          {(() => {
                            if (!po.paymentDate) return '—';
                            const [y, m, d] = po.paymentDate.split('-');
                            return y && m && d ? `${d}/${m}/${y}` : po.paymentDate;
                          })()}
                        </td>

                        {/* 3. Supplier */}
                        <td className="py-3.5 px-5 border border-slate-200">
                          <span className="font-semibold text-slate-800 text-xs">{po.supplierName}</span>
                        </td>

                        {/* 4. Against Bill */}
                        <td className="py-3 px-4 border border-slate-200 text-center">
                          {po.purchaseNo ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-md bg-purple-50 text-[#33077C] font-semibold text-[11px] border border-purple-100">
                              {po.purchaseNo}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Direct / Advance</span>
                          )}
                        </td>

                        {/* 5. Payment Mode */}
                        <td className="py-3 px-4 border border-slate-200 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            {po.paymentMode}
                          </span>
                        </td>

                        {/* 6. Reference / UTR */}
                        <td className="py-3 px-5 text-slate-600 text-xs border border-slate-200">
                          {po.referenceNo || '—'}
                        </td>

                        {/* 7. Amount Paid */}
                        <td className="py-3.5 px-5 border border-slate-200 text-right">
                          <span className="font-bold text-slate-900 text-sm">
                            ₹{po.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* 8. Status */}
                        <td className="py-3 px-5 border border-slate-200 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {po.status || 'Completed'}
                          </span>
                        </td>

                        {/* 9. Actions */}
                        <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Print Action */}
                            <button
                              type="button"
                              title="Print Payment Voucher"
                              onClick={() => {
                                setSelectedPayment(po);
                                toast.info(`Preparing print for ${po.paymentNo}...`);
                                window.print();
                              }}
                              className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Share / Forward Popover */}
                            <div className="relative inline-block text-left share-popover-container">
                              <button
                                type="button"
                                title="Share Payment Voucher"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeShareId === po.id) {
                                    setActiveShareId(null);
                                    setSharePos(null);
                                  } else {
                                    setActiveDropdownId(null);
                                    const btnRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    const spaceBelow = window.innerHeight - btnRect.bottom;
                                    const popoverHeight = 140;
                                    if (spaceBelow < popoverHeight) {
                                      setSharePos({
                                        bottom: window.innerHeight - btnRect.top + 6,
                                        right: window.innerWidth - btnRect.right - 20,
                                      });
                                    } else {
                                      setSharePos({
                                        top: btnRect.bottom + 6,
                                        right: window.innerWidth - btnRect.right - 20,
                                      });
                                    }
                                    setActiveShareId(po.id);
                                  }
                                }}
                                className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              >
                                <Forward className="w-4 h-4" />
                              </button>

                              {activeShareId === po.id && sharePos && (
                                <div
                                  className="share-popover-menu fixed z-[9999] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left min-w-[190px]"
                                  style={{
                                    top: sharePos.top !== undefined ? `${sharePos.top}px` : 'auto',
                                    bottom: sharePos.bottom !== undefined ? `${sharePos.bottom}px` : 'auto',
                                    right: `${Math.max(12, sharePos.right)}px`,
                                  }}
                                >
                                  <div className="text-xs font-bold text-slate-800 mb-3 px-0.5">
                                    Share
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    {/* Email Option */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveShareId(null);
                                        const subject = encodeURIComponent(`Payment Voucher: ${po.paymentNo}`);
                                        const body = encodeURIComponent(
                                          `Payment Voucher: ${po.paymentNo}\nSupplier: ${po.supplierName}\nDate: ${po.paymentDate}\nAmount Paid: ₹${po.amount.toLocaleString('en-IN')}\nPayment Mode: ${po.paymentMode}\nReference: ${po.referenceNo || 'N/A'}\nStatus: ${po.status || 'Completed'}`
                                        );
                                        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                                      }}
                                      className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group flex-1"
                                    >
                                      <div className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                                          <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6Z" fill="#EA4335" fillOpacity="0.1"/>
                                          <path d="M20 4H4C2.9 4 2 4.9 2 6V6.5L12 13L22 6.5V6C22 4.9 21.1 4 20 4Z" fill="#EA4335"/>
                                          <path d="M2 6.5V18C2 19.1 2.9 20 4 20H5V8.5L2 6.5Z" fill="#4285F4"/>
                                          <path d="M22 6.5V18C22 19.1 21.1 20 20 20H19V8.5L22 6.5Z" fill="#34A853"/>
                                          <path d="M19 20H5V8.5L12 13L19 8.5V20Z" fill="#FBBC04" fillOpacity="0.2"/>
                                          <path d="M20 6L12 11.5L4 6H20Z" fill="#C5221F"/>
                                        </svg>
                                      </div>
                                      <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">Email</span>
                                    </button>

                                    {/* WhatsApp Option */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveShareId(null);
                                        const text = encodeURIComponent(
                                          `*Payment Voucher: ${po.paymentNo}*\n*Supplier:* ${po.supplierName}\n*Amount Paid:* ₹${po.amount.toLocaleString('en-IN')}\n*Mode:* ${po.paymentMode}\n*Reference:* ${po.referenceNo || 'N/A'}\n*Status:* ${po.status || 'Completed'}`
                                        );
                                        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                                      }}
                                      className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group flex-1"
                                    >
                                      <div className="w-10 h-10 rounded-full bg-[#25D366] shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-5 h-5 fill-white text-white" viewBox="0 0 24 24">
                                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                        </svg>
                                      </div>
                                      <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">WhatsApp</span>
                                    </button>

                                    {/* SMS Option */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveShareId(null);
                                        const text = encodeURIComponent(
                                          `Payment Voucher ${po.paymentNo} for ${po.supplierName}, Amount Paid: ₹${po.amount.toLocaleString('en-IN')}, Mode: ${po.paymentMode}, Status: ${po.status || 'Completed'}`
                                        );
                                        window.open(`sms:?body=${text}`, '_blank');
                                      }}
                                      className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group flex-1"
                                    >
                                      <div className="w-10 h-10 rounded-full bg-[#FF9800] shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-5 h-5 fill-white text-white" viewBox="0 0 24 24">
                                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 10H6v-2h12v2zm0-3H6V7h12v2z"/>
                                          <circle cx="8" cy="11" r="1.2" fill="white"/>
                                          <circle cx="12" cy="11" r="1.2" fill="white"/>
                                          <circle cx="16" cy="11" r="1.2" fill="white"/>
                                        </svg>
                                      </div>
                                      <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">SMS</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 3-dots Actions Dropdown */}
                            <div className="relative inline-block text-left action-dropdown-container">
                              <button
                                type="button"
                                title="More Options"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeDropdownId === po.id) {
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                  } else {
                                    setActiveShareId(null);
                                    const btnRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    const spaceBelow = window.innerHeight - btnRect.bottom;
                                    const dropdownHeight = 220;
                                    if (spaceBelow < dropdownHeight) {
                                      setDropdownPos({
                                        bottom: window.innerHeight - btnRect.top + 4,
                                        right: window.innerWidth - btnRect.right,
                                      });
                                    } else {
                                      setDropdownPos({
                                        top: btnRect.bottom + 4,
                                        right: window.innerWidth - btnRect.right,
                                      });
                                    }
                                    setActiveDropdownId(po.id);
                                  }
                                }}
                                className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeDropdownId === po.id && dropdownPos && (
                                <div
                                  className="action-dropdown-menu fixed z-[9999] w-48 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                                  style={{
                                    top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
                                    bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
                                    right: `${dropdownPos.right}px`,
                                  }}
                                >
                                  {/* 1. View/Edit */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      handleOpenEditModal(po);
                                    }}
                                    className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                  >
                                    View/Edit
                                  </button>

                                  {/* 2. Duplicate */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      handleDuplicatePayment(po);
                                    }}
                                    className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                  >
                                    Duplicate
                                  </button>

                                  {/* 3. Delete */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      handleDeletePayment(po.id, po.paymentNo);
                                    }}
                                    className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                  >
                                    Delete
                                  </button>

                                  {/* 4. Open PDF */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPayment(po);
                                      setActiveDropdownId(null);
                                      toast.info(`Opening PDF for ${po.paymentNo}...`);
                                      window.print();
                                    }}
                                    className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                  >
                                    Open PDF
                                  </button>

                                  {/* 5. Print */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPayment(po);
                                      setActiveDropdownId(null);
                                      toast.info(`Preparing print for ${po.paymentNo}...`);
                                      window.print();
                                    }}
                                    className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                  >
                                    Print
                                  </button>

                                  {/* 6. View History */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPayment(po);
                                      setIsHistoryModalOpen(true);
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
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
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Pagination Matching Reference UI */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredPayments.length}
        pageSize={pageSize}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Custom Date Range Modal */}
      <Modal
        isOpen={isCustomDateModalOpen}
        onClose={() => setIsCustomDateModalOpen(false)}
        title="Select Custom Date Range"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Start Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              End Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCustomDateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                if (!customStartDate || !customEndDate) {
                  toast.error('Please select both start and end dates.');
                  return;
                }
                setAppliedPeriod('Custom');
                setIsCustomDateModalOpen(false);
              }}
            >
              Apply Range
            </Button>
          </div>
        </div>
      </Modal>

      {/* 6. CREATE / EDIT PAYMENT MODAL matching reference image 2 */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingPaymentId(null);
        }}
        title={editingPaymentId ? 'Edit Payment Out Voucher' : 'Record Payment Out'}
        subtitle={
          editingPaymentId
            ? 'Configure payment voucher profile, invoice settlement, and payment details'
            : 'Configure vendor disbursement voucher, payment mode, and settlement details'
        }
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        onBack={() => {
          setIsFormModalOpen(false);
          setEditingPaymentId(null);
        }}
        headerRightSlot={
          <div className="flex items-center gap-1.5 whitespace-nowrap text-white">
            <span className="text-xs sm:text-[13px] font-medium text-white/80">
              Balance Amount :
            </span>
            <span className="text-xs sm:text-[13px] font-bold text-white">
              ₹
              {(() => {
                const s = suppliers.find((sup) => sup.id === formData.supplierId);
                const bal = s?.payable || 0;
                return bal.toLocaleString('en-IN', { minimumFractionDigits: 2 });
              })()}
            </span>
          </div>
        }
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4.5 p-2 sm:p-4">
          {/* Row 1: 3 Fields (Supplier / Vendor, Bill No, Voucher No) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Field 1: Supplier / Vendor */}
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Supplier / Vendor <span className="text-slate-400 font-normal">*</span>
              </label>
              <CustomSelect
                value={formData.supplierId}
                onChange={(val) => {
                  setFormData({ ...formData, supplierId: val, purchaseId: '', amount: '' });
                }}
                placeholder="Select supplier / vendor"
                allowClear={true}
                options={suppliers.map((s) => ({
                  value: s.id,
                  label: `${s.name} (Payable: ₹${(s.payable || 0).toLocaleString('en-IN')})`,
                }))}
              />
            </div>

            {/* Field 2: Bill No (Dropdown) */}
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Bill No
              </label>
              <CustomSelect
                value={formData.purchaseId}
                onChange={(val) => handlePurchaseSelect(val)}
                placeholder="Select bill no"
                allowClear={true}
                options={supplierPurchases.map((p) => ({
                  value: p.id,
                  label: `${p.purchaseInvoiceNo ? `${p.purchaseInvoiceNo} (${p.purchaseNo})` : p.purchaseNo} — Bal: ₹${p.balance.toLocaleString('en-IN')}`,
                }))}
              />
            </div>

            {/* Field 3: Voucher / Payment No */}
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Voucher / Payment No <span className="text-slate-400 font-normal">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.paymentNo}
                onChange={(e) => setFormData({ ...formData, paymentNo: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all bg-white"
                placeholder="e.g. VPA-2026-001"
              />
            </div>
          </div>

          {/* Row 2: 3 Fields (Payment Date, Payment Amount, Payment Mode) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Field 4: Payment Date */}
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Payment Date <span className="text-slate-400 font-normal">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs sm:text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all bg-white cursor-pointer"
              />
            </div>

            {/* Field 5: Payment Amount */}
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Payment Amount (₹) <span className="text-slate-400 font-normal">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-medium text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-900 focus:outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all bg-white"
                />
              </div>
            </div>

            {/* Field 6: Payment Mode */}
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Payment Mode <span className="text-slate-400 font-normal">*</span>
              </label>
              <CustomSelect
                value={formData.paymentMode}
                onChange={(val) => setFormData({ ...formData, paymentMode: val as PaymentOutMode })}
                placeholder="Select payment mode"
                options={[
                  { value: 'Bank Transfer', label: 'Bank Transfer (NEFT/RTGS/IMPS)' },
                  { value: 'UPI', label: 'UPI / QR Code' },
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Cheque', label: 'Cheque' },
                  { value: 'Card', label: 'Debit / Credit Card' },
                  { value: 'Net Banking', label: 'Net Banking' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
            </div>
          </div>

          {/* Row 3: 3 Fields (Attach Receipt / Image, Reference no, Notes) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Field 7: Attach Receipt / Image (Next to Payment Mode / in Row 3) */}
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Upload Receipt / Proof
              </label>
              {formData.receiptImage ? (
                <div className="flex items-center gap-3 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <img
                    src={formData.receiptImage}
                    alt="Receipt"
                    className="w-7 h-7 rounded-lg object-cover border border-slate-300"
                  />
                  <span className="text-xs sm:text-[13px] text-slate-700 font-medium truncate flex-1">
                    Image Attached
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, receiptImage: '' })}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    title="Remove Image"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full h-11 px-3.5 rounded-xl border border-dashed border-slate-300 hover:border-[#4309A2] hover:bg-[#4309A2]/5 text-slate-600 hover:text-[#4309A2] text-xs sm:text-[13px] font-medium cursor-pointer transition-all bg-white">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>Upload Image / Receipt</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({ ...formData, receiptImage: reader.result as string });
                          toast.success('Receipt image attached successfully!');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* Field 8: Reference no */}
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Reference no
              </label>
              <input
                type="text"
                value={formData.referenceNo}
                onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs sm:text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all bg-white"
              />
            </div>

            {/* Field 9: Notes */}
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Notes
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs sm:text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all bg-white"
              />
            </div>
          </div>

          {/* Footer Buttons Matching Reference */}
          <div className="pt-4 flex justify-end items-center gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsFormModalOpen(false);
                setEditingPaymentId(null);
              }}
              className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
            >
              <span className="text-sm">✕</span>
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{editingPaymentId ? 'Save Changes' : 'Save'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 7. DETAIL VIEW MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Payment Voucher Details"
        maxWidth="md"
      >
        {selectedPayment && (
          <div className="space-y-5">
            {/* Header Voucher Card */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#33077C] uppercase tracking-wider">Payment Out Voucher</span>
                <div className="text-lg font-bold font-mono text-slate-900">{selectedPayment.paymentNo}</div>
                <div className="text-xs text-slate-500 mt-0.5">Date: {selectedPayment.paymentDate}</div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500">Amount Paid</span>
                <div className="text-xl font-bold font-mono text-emerald-600">
                  ₹{selectedPayment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <Badge variant="success" className="mt-1">
                  {selectedPayment.status}
                </Badge>
              </div>
            </div>

            {/* Grid Information */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block font-semibold">Vendor / Supplier</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedPayment.supplierName}</span>
                {selectedPayment.supplierCode && (
                  <span className="text-slate-400 font-mono text-[11px]">{selectedPayment.supplierCode}</span>
                )}
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block font-semibold">Linked Purchase Bill</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block font-mono">
                  {selectedPayment.purchaseNo || 'Direct / Advance Payment'}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block font-semibold">Payment Mode</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedPayment.paymentMode}</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block font-semibold">Reference / UTR</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block font-mono">
                  {selectedPayment.referenceNo || 'None'}
                </span>
              </div>
            </div>

            {/* Receipt Proof / Image in Detail View */}
            {selectedPayment.receiptImage && (
              <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block font-semibold text-xs mb-2">Payment Receipt / Proof</span>
                <img
                  src={selectedPayment.receiptImage}
                  alt="Receipt Proof"
                  className="max-h-48 rounded-lg border border-slate-200 object-contain mx-auto"
                />
              </div>
            )}

            {/* Notes */}
            {selectedPayment.notes && (
              <div className="bg-purple-50/50 border border-purple-100 p-3.5 rounded-lg text-xs">
                <span className="font-semibold text-[#33077C] block mb-1">Remarks & Notes:</span>
                <p className="text-slate-700 whitespace-pre-line">{selectedPayment.notes}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <Button
                variant="secondary"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print()}
              >
                Print Voucher
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 8. HISTORY MODAL */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Payment Voucher History & Audit Trail"
        maxWidth="md"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500">Voucher Reference</span>
                <div className="font-bold text-slate-900 text-sm">{selectedPayment.paymentNo}</div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500">Amount</span>
                <div className="font-bold text-[#33077C] text-sm">
                  ₹{selectedPayment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {/* Event 1: Payment Recorded */}
              <div className="relative">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                  <Check className="w-3 h-3 text-white stroke-[3]" />
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Payment Out Recorded</span>
                    <span className="text-[11px] text-slate-400 font-medium">{selectedPayment.paymentDate}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Voucher disbursed via <strong className="text-slate-800">{selectedPayment.paymentMode}</strong> to{' '}
                    <strong className="text-slate-800">{selectedPayment.supplierName}</strong>.
                  </p>
                </div>
              </div>

              {/* Event 2: Creation & Timestamp */}
              <div className="relative">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#33077C] border-2 border-white flex items-center justify-center">
                  <History className="w-2.5 h-2.5 text-white" />
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">System Log Entry</span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {selectedPayment.createdAt ? new Date(selectedPayment.createdAt).toLocaleString() : 'System'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Status marked as <span className="font-semibold text-emerald-600">Completed</span> with reference{' '}
                    <span className="font-mono text-slate-700">{selectedPayment.referenceNo || 'Direct Entry'}</span>.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-200">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsHistoryModalOpen(false)}
              >
                Close History
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
