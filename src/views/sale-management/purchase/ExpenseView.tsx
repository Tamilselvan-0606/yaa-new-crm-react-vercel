import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Receipt,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  IndianRupee,
  MoreVertical,
  ChevronDown,
  Check,
  Upload,
  Image as ImageIcon,
  X,
  TrendingUp,
  CreditCard,
  Building2,
  FileText,
  Clock,
  Download,
  Printer,
  Forward,
  FileSpreadsheet,
} from 'lucide-react';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { exportTableToExcel } from '../../../utils/excelExport';
import { toast } from 'sonner';

export interface ExpenseItem {
  id: string;
  expenseNo: string;
  expenseDate: string;
  category: string;
  title: string;
  payee: string;
  amount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  paymentMode: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Credit Card' | 'Debit Card';
  referenceNo?: string;
  receiptImage?: string;
  notes?: string;
  status: 'Paid' | 'Pending' | 'Approved';
  createdAt: string;
}

const EXPENSE_CATEGORIES = [
  'Office Supplies',
  'Rent & Maintenance',
  'Electricity & Utilities',
  'Travel & Transportation',
  'Salaries & Wages',
  'Marketing & Advertising',
  'Software & Subscriptions',
  'Food & Refreshments',
  'Courier & Logistics',
  'Repairs & Service',
  'Miscellaneous',
];

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Credit Card', 'Debit Card'];

const PERIOD_FILTER_OPTIONS = [
  { label: 'Today', value: 'Today' },
  { label: 'All Expenses', value: 'All Expenses' },
  { label: 'This Month', value: 'This Month' },
  { label: 'Last Month', value: 'Last Month' },
  { label: 'This Quarter', value: 'This Quarter' },
  { label: 'This Year', value: 'This Year' },
  { label: 'This Financial Year', value: 'This Financial Year' },
  { label: 'Custom', value: 'Custom' },
];

const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: 'exp-1',
    expenseNo: 'EXP-2026-001',
    expenseDate: '2026-03-28',
    category: 'Rent & Maintenance',
    title: 'HQ Office Monthly Rent - March',
    payee: 'Sri Balaji Real Estate Towers',
    amount: 45000,
    taxPercent: 18,
    taxAmount: 8100,
    totalAmount: 53100,
    paymentMode: 'Bank Transfer',
    referenceNo: 'NEFT-8932401',
    notes: 'Paid for 3rd floor office space',
    status: 'Paid',
    createdAt: '2026-03-28 10:30 AM',
  },
  {
    id: 'exp-2',
    expenseNo: 'EXP-2026-002',
    expenseDate: '2026-03-29',
    category: 'Electricity & Utilities',
    title: 'TNEB Electricity Bill for Factory',
    payee: 'Tamil Nadu Electricity Board',
    amount: 14200,
    taxPercent: 0,
    taxAmount: 0,
    totalAmount: 14200,
    paymentMode: 'UPI',
    referenceNo: 'UPI-984210982',
    notes: 'Service connection #04-12-887',
    status: 'Paid',
    createdAt: '2026-03-29 02:15 PM',
  },
  {
    id: 'exp-3',
    expenseNo: 'EXP-2026-003',
    expenseDate: '2026-04-01',
    category: 'Software & Subscriptions',
    title: 'Cloud Server & CRM Database Billing',
    payee: 'Amazon Web Services India',
    amount: 8500,
    taxPercent: 18,
    taxAmount: 1530,
    totalAmount: 10030,
    paymentMode: 'Credit Card',
    referenceNo: 'CC-AUTH-4412',
    notes: 'Monthly infrastructure fee',
    status: 'Paid',
    createdAt: '2026-04-01 11:00 AM',
  },
  {
    id: 'exp-4',
    expenseNo: 'EXP-2026-004',
    expenseDate: '2026-04-02',
    category: 'Food & Refreshments',
    title: 'Client Lunch & Team Refreshments',
    payee: 'Anand Bhavan Sweets & Snacks',
    amount: 3200,
    taxPercent: 5,
    taxAmount: 160,
    totalAmount: 3360,
    paymentMode: 'Cash',
    referenceNo: 'RCP-5521',
    notes: 'Meeting with VIP buyer delegation',
    status: 'Paid',
    createdAt: '2026-04-02 04:45 PM',
  },
  {
    id: 'exp-5',
    expenseNo: 'EXP-2026-005',
    expenseDate: '2026-04-03',
    category: 'Courier & Logistics',
    title: 'Sample Fabric Parcels Shipping',
    payee: 'Professional Couriers Express',
    amount: 1850,
    taxPercent: 18,
    taxAmount: 333,
    totalAmount: 2183,
    paymentMode: 'UPI',
    referenceNo: 'UPI-43098522',
    notes: 'Sent to Mumbai and Delhi distributors',
    status: 'Paid',
    createdAt: '2026-04-03 05:20 PM',
  },
  {
    id: 'exp-6',
    expenseNo: 'EXP-2026-006',
    expenseDate: '2026-04-04',
    category: 'Office Supplies',
    title: 'A4 Paper Rims & Toner Cartridges',
    payee: 'Classic Stationery Mart',
    amount: 4600,
    taxPercent: 12,
    taxAmount: 552,
    totalAmount: 5152,
    paymentMode: 'Bank Transfer',
    referenceNo: 'IMPS-2026-1188',
    notes: 'Stock for accounts & design room',
    status: 'Paid',
    createdAt: '2026-04-04 11:15 AM',
  },
];

export const ExpenseView: React.FC = () => {
  // Local storage synced expenses
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    const saved = localStorage.getItem('crm_expenses_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved expenses', e);
      }
    }
    return INITIAL_EXPENSES;
  });

  useEffect(() => {
    localStorage.setItem('crm_expenses_list', JSON.stringify(expenses));
  }, [expenses]);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingPeriod, setPendingPeriod] = useState('All Expenses');
  const [appliedPeriod, setAppliedPeriod] = useState('All Expenses');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState(false);
  const [pendingCategory, setPendingCategory] = useState('All');
  const [appliedCategory, setAppliedCategory] = useState('All');
  const [pendingPaymentMode, setPendingPaymentMode] = useState('All');
  const [appliedPaymentMode, setAppliedPaymentMode] = useState('All');
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

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Duplicate Expense Handler
  const handleDuplicateExpense = (exp: ExpenseItem) => {
    setEditingExpenseId(null);
    const nextNo = `EXP-2026-${String(expenses.length + 1).padStart(3, '0')}`;
    setFormData({
      expenseNo: nextNo,
      expenseDate: new Date().toISOString().split('T')[0],
      category: exp.category,
      title: `${exp.title} (Copy)`,
      payee: exp.payee,
      amount: exp.amount,
      taxPercent: String(exp.taxPercent || 0),
      paymentMode: exp.paymentMode,
      referenceNo: exp.referenceNo ? `${exp.referenceNo}-COPY` : '',
      receiptImage: exp.receiptImage || '',
      notes: exp.notes ? `[Duplicate of ${exp.expenseNo}] ${exp.notes}` : `Duplicate of ${exp.expenseNo}`,
      status: exp.status,
    });
    setActiveDropdownId(null);
    setIsFormModalOpen(true);
    toast.info(`Cloned details from ${exp.expenseNo} into expense form.`);
  };

  // Form State
  const [formData, setFormData] = useState({
    expenseNo: '',
    expenseDate: new Date().toISOString().split('T')[0],
    category: 'Office Supplies',
    title: '',
    payee: '',
    amount: '' as string | number,
    taxPercent: '0',
    paymentMode: 'Bank Transfer' as ExpenseItem['paymentMode'],
    referenceNo: '',
    receiptImage: '',
    notes: '',
    status: 'Paid' as ExpenseItem['status'],
  });

  const generateNextExpenseNo = () => {
    const nextNum = expenses.length + 1;
    return `EXP-2026-${String(nextNum).padStart(3, '0')}`;
  };

  const handleOpenCreateModal = () => {
    setEditingExpenseId(null);
    setFormData({
      expenseNo: generateNextExpenseNo(),
      expenseDate: new Date().toISOString().split('T')[0],
      category: 'Office Supplies',
      title: '',
      payee: '',
      amount: '',
      taxPercent: '0',
      paymentMode: 'Bank Transfer',
      referenceNo: '',
      receiptImage: '',
      notes: '',
      status: 'Paid',
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (exp: ExpenseItem) => {
    setEditingExpenseId(exp.id);
    setFormData({
      expenseNo: exp.expenseNo,
      expenseDate: exp.expenseDate,
      category: exp.category,
      title: exp.title,
      payee: exp.payee,
      amount: exp.amount,
      taxPercent: String(exp.taxPercent || 0),
      paymentMode: exp.paymentMode,
      referenceNo: exp.referenceNo || '',
      receiptImage: exp.receiptImage || '',
      notes: exp.notes || '',
      status: exp.status,
    });
    setIsFormModalOpen(true);
  };

  const handleOpenDetailModal = (exp: ExpenseItem) => {
    setSelectedExpense(exp);
    setIsDetailModalOpen(true);
  };

  const handleDeleteExpense = (id: string, expNo: string) => {
    if (window.confirm(`Are you sure you want to delete expense record ${expNo}?`)) {
      setExpenses((prev) => prev.filter((item) => item.id !== id));
      toast.success(`Expense ${expNo} removed successfully`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, receiptImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    const baseAmount = Number(formData.amount);
    if (!formData.title.trim()) {
      toast.error('Please enter expense title/description');
      return;
    }
    if (isNaN(baseAmount) || baseAmount <= 0) {
      toast.error('Please enter a valid expense amount greater than 0');
      return;
    }

    const taxP = Number(formData.taxPercent) || 0;
    const taxAmt = Math.round((baseAmount * taxP) / 100);
    const totalAmt = baseAmount + taxAmt;

    if (editingExpenseId) {
      // Edit existing
      setExpenses((prev) =>
        prev.map((item) =>
          item.id === editingExpenseId
            ? {
                ...item,
                expenseDate: formData.expenseDate,
                category: formData.category,
                title: formData.title.trim(),
                payee: formData.payee.trim() || 'General Payee',
                amount: baseAmount,
                taxPercent: taxP,
                taxAmount: taxAmt,
                totalAmount: totalAmt,
                paymentMode: formData.paymentMode,
                referenceNo: formData.referenceNo.trim(),
                receiptImage: formData.receiptImage,
                notes: formData.notes.trim(),
                status: formData.status,
              }
            : item
        )
      );
      toast.success(`Expense ${formData.expenseNo} updated successfully`);
    } else {
      // Create new
      const newExpense: ExpenseItem = {
        id: `exp-${Date.now()}`,
        expenseNo: formData.expenseNo || generateNextExpenseNo(),
        expenseDate: formData.expenseDate,
        category: formData.category,
        title: formData.title.trim(),
        payee: formData.payee.trim() || 'General Payee',
        amount: baseAmount,
        taxPercent: taxP,
        taxAmount: taxAmt,
        totalAmount: totalAmt,
        paymentMode: formData.paymentMode,
        referenceNo: formData.referenceNo.trim(),
        receiptImage: formData.receiptImage,
        notes: formData.notes.trim(),
        status: formData.status,
        createdAt: new Date().toLocaleString(),
      };
      setExpenses((prev) => [newExpense, ...prev]);
      toast.success(`Expense ${newExpense.expenseNo} recorded successfully`);
    }

    setIsFormModalOpen(false);
  };

  // Filter application helpers
  const handleApplyPeriod = (option: string) => {
    if (option === 'Custom') {
      setIsCustomDateModalOpen(true);
      setIsPeriodOpen(false);
    } else {
      setPendingPeriod(option);
      setAppliedPeriod(option);
      setIsPeriodOpen(false);
      setCurrentPage(1);
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStartDate || !customEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    setPendingPeriod(`Custom (${customStartDate} to ${customEndDate})`);
    setAppliedPeriod(`Custom (${customStartDate} to ${customEndDate})`);
    setIsCustomDateModalOpen(false);
    setCurrentPage(1);
  };

  // Filter logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // Search
      if (appliedSearch) {
        const query = appliedSearch.toLowerCase();
        const matchesQuery =
          exp.expenseNo.toLowerCase().includes(query) ||
          exp.title.toLowerCase().includes(query) ||
          exp.payee.toLowerCase().includes(query) ||
          exp.category.toLowerCase().includes(query) ||
          (exp.referenceNo && exp.referenceNo.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      // Category filter
      if (appliedCategory !== 'All') {
        if (exp.category !== appliedCategory) return false;
      }

      // Payment Mode filter
      if (appliedPaymentMode !== 'All') {
        if (exp.paymentMode !== appliedPaymentMode) return false;
      }

      // Period Filter
      if (appliedPeriod !== 'All Expenses') {
        const itemDate = new Date(exp.expenseDate);
        const now = new Date();

        if (appliedPeriod === 'Today') {
          const todayStr = now.toISOString().split('T')[0];
          if (exp.expenseDate !== todayStr) return false;
        } else if (appliedPeriod === 'This Month') {
          if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (appliedPeriod === 'Last Month') {
          const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          if (itemDate.getMonth() !== lastMonth && itemDate.getFullYear() !== lastMonthYear) {
            return false;
          }
        } else if (appliedPeriod === 'This Year') {
          if (itemDate.getFullYear() !== now.getFullYear()) return false;
        } else if (appliedPeriod.startsWith('Custom') && customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (itemDate < start || itemDate > end) return false;
        }
      }

      return true;
    });
  }, [expenses, appliedSearch, appliedCategory, appliedPaymentMode, appliedPeriod, customStartDate, customEndDate]);

  // Metrics Calculations
  const metrics = useMemo(() => {
    const totalExp = filteredExpenses.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const count = filteredExpenses.length;
    const bankOnlineTotal = filteredExpenses
      .filter((e) => ['Bank Transfer', 'UPI', 'Credit Card', 'Debit Card', 'Cheque'].includes(e.paymentMode))
      .reduce((acc, curr) => acc + curr.totalAmount, 0);
    const cashTotal = filteredExpenses
      .filter((e) => e.paymentMode === 'Cash')
      .reduce((acc, curr) => acc + curr.totalAmount, 0);
    const totalTax = filteredExpenses.reduce((acc, curr) => acc + curr.taxAmount, 0);

    return { totalExp, count, bankOnlineTotal, cashTotal, totalTax };
  }, [filteredExpenses]);

  // Pagination slice
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, currentPage, pageSize]);

  // Category badge colors
  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'Rent & Maintenance':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Electricity & Utilities':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Software & Subscriptions':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Food & Refreshments':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Courier & Logistics':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Office Supplies':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Salaries & Wages':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Export Expenses to Excel
  const handleExportExcel = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No expense records available to export.');
      return;
    }

    const excelRows = filteredExpenses.map((exp, idx) => ({
      sNo: idx + 1,
      expenseNo: exp.expenseNo,
      expenseDate: exp.expenseDate,
      category: exp.category,
      title: exp.title,
      payee: exp.payee,
      amount: Number(exp.amount || 0),
      taxAmount: Number(exp.taxAmount || 0),
      totalAmount: Number(exp.totalAmount || 0),
      paymentMode: exp.paymentMode,
      referenceNo: exp.referenceNo || '-',
      status: exp.status,
    }));

    const grandTotalAmt = excelRows.reduce((acc, row) => acc + row.totalAmount, 0);
    const grandTaxAmt = excelRows.reduce((acc, row) => acc + row.taxAmount, 0);

    exportTableToExcel({
      filename: `Expenses_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Expenses Ledger',
      title: 'YAA CREATIONS CRM - OPERATIONAL EXPENSES DIRECTORY',
      subtitle: `Total Expenses: ${filteredExpenses.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'Expense #', key: 'expenseNo', align: 'center', width: 14 },
        { header: 'Date', key: 'expenseDate', align: 'center', width: 14 },
        { header: 'Category', key: 'category', align: 'left', width: 22 },
        { header: 'Title / Purpose', key: 'title', align: 'left', width: 24 },
        { header: 'Payee / Vendor', key: 'payee', align: 'left', width: 20 },
        { header: 'Base Amount (₹)', key: 'amount', align: 'right', type: 'currency', width: 16 },
        { header: 'Tax Amount (₹)', key: 'taxAmount', align: 'right', type: 'currency', width: 16 },
        { header: 'Total (₹)', key: 'totalAmount', align: 'right', type: 'currency', width: 18 },
        { header: 'Payment Mode', key: 'paymentMode', align: 'center', width: 16 },
        { header: 'Reference #', key: 'referenceNo', align: 'left', width: 16 },
        { header: 'Status', key: 'status', align: 'center', width: 14 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: 'TOTAL',
        expenseNo: `${filteredExpenses.length} Expenses`,
        taxAmount: grandTaxAmt,
        totalAmount: grandTotalAmt,
      },
    });

    toast.success(`Expenses Excel report downloaded (${filteredExpenses.length} records)!`);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Expense Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Track operational costs, company bills, office expenditures & vendor disbursements
              </p>
            </div>
          </div>
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
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto justify-center"
            icon={<Plus className="w-4 h-4 text-white shrink-0" />}
          >
            <span>Add Expense</span>
          </Button>
        </div>
      </div>



      {/* Search & Filter Bar in a Single Line */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search by expense #, title, payee..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedPeriod(pendingPeriod);
          setAppliedCategory(pendingCategory);
          setAppliedPaymentMode(pendingPaymentMode);
          setCurrentPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingPeriod('All Expenses');
          setAppliedPeriod('All Expenses');
          setPendingCategory('All');
          setAppliedCategory('All');
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

            {/* Filter by Period */}
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
                  ...PAYMENT_MODES.map((m) => ({ label: m, value: m })),
                ]}
              />
            </div>
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1 whitespace-nowrap">
            <span className="text-xs font-semibold text-slate-500">
              Total Expenses :{' '}
              <span className="text-[#33077C] font-bold">{filteredExpenses.length}</span>
            </span>
          </div>
        }
      />

      {/* Table matching reference UI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">EXPENSE NO</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">DATE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">CATEGORY</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">EXPENSE TITLE / PAYEE</th>
                <th className="py-4 px-4 border border-[#33077C]/30 bg-[#33077C] text-white text-center">PAYMENT MODE</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white">REFERENCE / BILL</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-right">TAX AMOUNT</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-right">TOTAL AMOUNT</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">STATUS</th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">No expense records found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or click "+ Add Expense" to record one.</p>
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-purple-50/20 transition-colors border-b border-slate-200"
                  >
                    {/* Expense No */}
                    <td className="py-3.5 px-5 border border-slate-200">
                      <span className="font-semibold text-slate-800 text-xs">
                        {exp.expenseNo}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-5 text-slate-800 font-bold text-xs border border-slate-200 whitespace-nowrap">
                      {(() => {
                        if (!exp.expenseDate) return '—';
                        const [y, m, d] = exp.expenseDate.split('-');
                        return y && m && d ? `${d}/${m}/${y}` : exp.expenseDate;
                      })()}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-5 border border-slate-200">
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-purple-50 text-[#33077C] font-semibold text-[11px] border border-purple-100 whitespace-nowrap">
                        {exp.category}
                      </span>
                    </td>

                    {/* Title / Payee */}
                    <td className="py-3.5 px-5 border border-slate-200">
                      <div>
                        <span className="font-bold text-slate-800 text-xs block line-clamp-1">
                          {exp.title}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {exp.payee}
                        </span>
                      </div>
                    </td>

                    {/* Payment Mode */}
                    <td className="py-3 px-4 border border-slate-200 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">
                        {exp.paymentMode}
                      </span>
                    </td>

                    {/* Reference / Bill */}
                    <td className="py-3 px-5 text-slate-600 text-xs border border-slate-200">
                      {exp.referenceNo || '—'}
                    </td>

                    {/* Tax Amount */}
                    <td className="py-3.5 px-5 border border-slate-200 text-right">
                      {exp.taxAmount > 0 ? (
                        <div>
                          <span className="font-semibold text-slate-700 text-xs">
                            ₹{exp.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-normal">({exp.taxPercent}%)</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-normal">₹0.00</span>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-5 border border-slate-200 text-right">
                      <span className="font-bold text-slate-900 text-sm">
                        ₹{exp.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-5 border border-slate-200 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {exp.status || 'Completed'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Print Action */}
                        <button
                          type="button"
                          title="Print Expense"
                          onClick={() => {
                            setSelectedExpense(exp);
                            toast.info(`Preparing print for ${exp.expenseNo}...`);
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
                            title="Share Expense"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeShareId === exp.id) {
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
                                setActiveShareId(exp.id);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Forward className="w-4 h-4" />
                          </button>

                          {activeShareId === exp.id && sharePos && (
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
                                    const subject = encodeURIComponent(`Expense Voucher: ${exp.expenseNo}`);
                                    const body = encodeURIComponent(
                                      `Expense Voucher: ${exp.expenseNo}\nCategory: ${exp.category}\nTitle: ${exp.title}\nPayee: ${exp.payee}\nDate: ${exp.expenseDate}\nTotal Amount: ₹${exp.totalAmount.toLocaleString('en-IN')}\nPayment Mode: ${exp.paymentMode}\nStatus: ${exp.status}`
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
                                      `*Expense Voucher: ${exp.expenseNo}*\n*Category:* ${exp.category}\n*Title:* ${exp.title}\n*Payee:* ${exp.payee}\n*Amount:* ₹${exp.totalAmount.toLocaleString('en-IN')}\n*Mode:* ${exp.paymentMode}\n*Status:* ${exp.status}`
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
                                      `Expense Voucher ${exp.expenseNo} for ${exp.payee}, Amount: ₹${exp.totalAmount.toLocaleString('en-IN')}, Category: ${exp.category}, Status: ${exp.status}`
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
                              if (activeDropdownId === exp.id) {
                                setActiveDropdownId(null);
                                setDropdownPos(null);
                              } else {
                                setActiveShareId(null);
                                const btnRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                const spaceBelow = window.innerHeight - btnRect.bottom;
                                const dropdownHeight = 260;
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
                                setActiveDropdownId(exp.id);
                              }
                            }}
                            className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeDropdownId === exp.id && dropdownPos && (
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
                                  handleOpenEditModal(exp);
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
                                  handleDuplicateExpense(exp);
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
                                  handleDeleteExpense(exp.id, exp.expenseNo);
                                }}
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                              >
                                Delete
                              </button>

                              {/* 4. Open PDF */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExpense(exp);
                                  setActiveDropdownId(null);
                                  toast.info(`Opening PDF for ${exp.expenseNo}...`);
                                  window.print();
                                }}
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                              >
                                Open PDF
                              </button>

                              {/* 5. Preview (next to Open PDF) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleOpenDetailModal(exp);
                                }}
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                              >
                                Preview
                              </button>

                              {/* 6. Print */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExpense(exp);
                                  setActiveDropdownId(null);
                                  toast.info(`Preparing print for ${exp.expenseNo}...`);
                                  window.print();
                                }}
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                              >
                                Print
                              </button>

                              {/* 7. View History */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  toast.info(`Expense ${exp.expenseNo} recorded on ${exp.expenseDate} for ${exp.payee}. Category: ${exp.category}, Amount: ₹${exp.totalAmount.toLocaleString('en-IN')}, Status: ${exp.status}.`);
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Matching Reference UI */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredExpenses.length}
        pageSize={pageSize}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* CREATE / EDIT EXPENSE MODAL */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingExpenseId ? 'Edit Expense' : 'Add New Expense'}
        subtitle={
          editingExpenseId
            ? 'Configure expense voucher profile, taxation rate, and payment details'
            : 'Configure expense voucher profile, payee details, and payment settlement'
        }
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        onBack={() => setIsFormModalOpen(false)}
      >
        <form onSubmit={handleSubmitForm} className="space-y-6 p-2 sm:p-4">
          {/* Row 1: 3 Fields (Expense Voucher No, Expense Category, Expense Date) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Expense Voucher No <span className="text-slate-400 font-normal">*</span>
              </label>
              <input
                type="text"
                value={formData.expenseNo}
                disabled
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs sm:text-[13px] font-mono font-bold text-slate-600 bg-slate-50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Expense Category <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                options={EXPENSE_CATEGORIES.map((c) => ({ label: c, value: c }))}
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
                placeholder="Select category"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Expense Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs sm:text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all bg-white cursor-pointer"
              />
            </div>
          </div>

          {/* Row 2: 3 Fields (Paid To / Payee Vendor, Expense Title / Description, Payment Mode) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Paid To / Payee Vendor
              </label>
              <input
                type="text"
                value={formData.payee}
                onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs sm:text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all bg-white"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Expense Title / Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs sm:text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all bg-white"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Payment Mode <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                options={PAYMENT_MODES.map((m) => ({ label: m, value: m }))}
                value={formData.paymentMode}
                onChange={(val) => setFormData({ ...formData, paymentMode: val as ExpenseItem['paymentMode'] })}
                placeholder="Select payment mode"
              />
            </div>
          </div>

          {/* Row 3: 3 Fields (Base Amount, Tax / GST Rate, Reference No / Transaction ID) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Base Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-medium text-sm">₹</span>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-900 focus:outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Tax / GST Rate
              </label>
              <CustomSelect
                options={[
                  { label: '0% (No Tax)', value: '0' },
                  { label: '5% GST', value: '5' },
                  { label: '12% GST', value: '12' },
                  { label: '18% GST', value: '18' },
                  { label: '28% GST', value: '28' },
                ]}
                value={formData.taxPercent}
                onChange={(val) => setFormData({ ...formData, taxPercent: val })}
                placeholder="Select GST Rate"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Reference No / Transaction ID
              </label>
              <input
                type="text"
                value={formData.referenceNo}
                onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs sm:text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all bg-white"
              />
            </div>
          </div>

          {/* Calculated Total summary bar */}
          {Number(formData.amount) > 0 && (
            <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3.5 flex items-center justify-between text-xs sm:text-[13px]">
              <div className="text-slate-600 font-medium">
                <span>Base: <strong className="text-slate-800">₹{Number(formData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                {Number(formData.taxPercent) > 0 && (
                  <span className="ml-4">
                    Tax ({formData.taxPercent}%): <strong className="text-slate-800">₹{Math.round((Number(formData.amount) * Number(formData.taxPercent)) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </span>
                )}
              </div>
              <div className="text-[#33077C] font-black text-sm sm:text-base">
                Total: ₹{(Number(formData.amount) + Math.round((Number(formData.amount) * Number(formData.taxPercent)) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}

          {/* Row 4: 3 Fields (Upload Receipt in 1 column, Notes spanning 2 columns) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    Receipt Attached
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, receiptImage: '' })}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    title="Remove Receipt"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full h-11 px-3.5 rounded-xl border border-dashed border-slate-300 hover:border-[#4309A2] hover:bg-[#4309A2]/5 text-slate-600 hover:text-[#4309A2] text-xs sm:text-[13px] font-medium cursor-pointer transition-all bg-white">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>Upload Receipt</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-[13px] font-medium text-slate-600 mb-2">
                Notes / Remarks
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs sm:text-[13px] font-medium text-slate-800 focus:outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all bg-white"
              />
            </div>
          </div>

          {/* Form Actions Matching Reference Image 2 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsFormModalOpen(false)}
              className="h-11 px-6 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200 cursor-pointer flex items-center gap-2"
              icon={<X className="w-4 h-4 text-slate-500" />}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="h-11 px-7 rounded-xl text-xs sm:text-[13px] font-semibold bg-[#33077C] hover:bg-[#25055b] text-white shadow-sm cursor-pointer flex items-center gap-2"
              icon={<Check className="w-4 h-4 text-white" />}
            >
              {editingExpenseId ? 'Save Changes' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW EXPENSE DETAIL MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedExpense ? `Expense Voucher: ${selectedExpense.expenseNo}` : 'Expense Details'}
        maxWidth="md"
      >
        {selectedExpense && (
          <div className="space-y-4">
            <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-1.5 ${getCategoryBadgeColor(
                    selectedExpense.category
                  )}`}
                >
                  {selectedExpense.category}
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedExpense.title}</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Payee: {selectedExpense.payee}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Amount</span>
                <span className="text-xl font-black text-[#33077C]">
                  ₹{selectedExpense.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Expense Date</span>
                <span className="font-bold text-slate-800">
                  {new Date(selectedExpense.expenseDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Payment Mode</span>
                <span className="font-bold text-slate-800">{selectedExpense.paymentMode}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Reference / Bill No</span>
                <span className="font-mono font-bold text-slate-800">{selectedExpense.referenceNo || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Tax / GST Breakdown</span>
                <span className="font-bold text-slate-800">
                  {selectedExpense.taxPercent}% (₹{selectedExpense.taxAmount.toLocaleString('en-IN')})
                </span>
              </div>
            </div>

            {selectedExpense.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase mb-1">Notes / Remarks</span>
                <p className="text-slate-700 font-medium">{selectedExpense.notes}</p>
              </div>
            )}

            {selectedExpense.receiptImage && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Attached Receipt</span>
                <img
                  src={selectedExpense.receiptImage}
                  alt="Receipt"
                  className="w-full max-h-48 object-contain rounded-lg border border-slate-200 bg-white"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
              <span>Created: {selectedExpense.createdAt}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEditModal(selectedExpense);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="bg-[#33077C] text-white text-xs px-4 py-1.5 rounded-lg cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* CUSTOM DATE RANGE MODAL */}
      <Modal
        isOpen={isCustomDateModalOpen}
        onClose={() => setIsCustomDateModalOpen(false)}
        title="Select Custom Date Range"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#33077C]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#33077C]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={() => setIsCustomDateModalOpen(false)}
              className="text-xs px-3 py-1.5 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyCustomDates}
              className="bg-[#33077C] text-white text-xs px-4 py-1.5 rounded-lg font-bold"
            >
              Apply Filter
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
