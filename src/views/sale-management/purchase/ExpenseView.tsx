import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExpenseSchema, ExpenseFormData } from '../../../validations';
import { FormError } from '../../../components/common/FormError';
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
  Layers,
  Loader2,
  AlertCircle,
  Tag,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { exportTableToExcel } from '../../../utils/excelExport';
import { UniversalShareDropdown, formatExpenseShare } from '../../../utils/shareUtils';
import { FormLabel, FORM_INPUT_CLS, FORM_INPUT_DISABLED_CLS, FORM_SELECT_CLS, getFormInputCls } from '../utils/formUtils';
import { toast } from 'sonner';
import {
  workExpenseApi,
  workExpenseCategoryApi,
  mapApiExpenseToUi,
  mapUiToCreateExpensePayload,
  mapUiToUpdateExpensePayload,
  ApiExpenseCategory,
  ExpenseSummary,
  supplierApi,
  ApiSupplier,
  isValidUuid,
} from '../../../api';

export interface ExpenseItem {
  id: string;
  expenseNo: string;
  expenseDate: string;
  category: string;
  categoryId?: string;
  supplierId?: string;
  supplierName?: string;
  branchId?: string | null;
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
  updatedAt?: string;
}

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

/**
 * Calculates start and end dates for Work API filtering
 */
const getDateRangeForPeriod = (
  period: string,
  customStart?: string,
  customEnd?: string
): { from?: string; to?: string } => {
  const now = new Date();
  const formatYmd = (d: Date) => d.toISOString().split('T')[0];

  if (period === 'Today') {
    const today = formatYmd(now);
    return { from: today, to: today };
  }
  if (period === 'This Month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: formatYmd(firstDay), to: formatYmd(lastDay) };
  }
  if (period === 'Last Month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: formatYmd(firstDay), to: formatYmd(lastDay) };
  }
  if (period === 'This Quarter') {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    const firstDay = new Date(now.getFullYear(), qMonth, 1);
    const lastDay = new Date(now.getFullYear(), qMonth + 3, 0);
    return { from: formatYmd(firstDay), to: formatYmd(lastDay) };
  }
  if (period === 'This Year') {
    return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  }
  if (period === 'This Financial Year') {
    const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return { from: `${fyStart}-04-01`, to: `${fyStart + 1}-03-31` };
  }
  if (period.startsWith('Custom') && customStart && customEnd) {
    return { from: customStart, to: customEnd };
  }
  return {};
};

export const ExpenseView: React.FC = () => {
  // Purge any old local mock data from storage on mount
  useEffect(() => {
    try {
      localStorage.removeItem('crm_expenses_list');
    } catch {
      // ignore
    }
  }, []);

  // Live Expenses State
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);
  const [apiSummary, setApiSummary] = useState<ExpenseSummary | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Live Categories State
  const [categories, setCategories] = useState<ApiExpenseCategory[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);

  // Live Suppliers State (for Payee mapping)
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);

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

  // Deduplication & Sync Refs
  const isFetchingRef = useRef(false);
  const lastFetchKeyRef = useRef('');

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

  // Fetch Live Categories from Work API
  const fetchCategories = useCallback(async () => {
    setIsCategoriesLoading(true);
    try {
      const res = await workExpenseCategoryApi.getExpenseCategories({
        pagination_required: false,
      });
      if (res && res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to fetch expense categories:', err?.message);
    } finally {
      setIsCategoriesLoading(false);
    }
  }, []);

  // Fetch Registered Suppliers from Commerce API for Payee selection
  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await supplierApi.getSuppliers({
        pagination_required: false,
      });
      if (res && res.success && Array.isArray(res.data)) {
        setSuppliers(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to fetch suppliers for expense payee:', err?.message);
    }
  }, []);

  // Initial load for categories & suppliers
  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, [fetchCategories, fetchSuppliers]);

  // Fetch Expenses from Work API with deduplication
  const fetchExpenses = useCallback(
    async (forceRefresh = false) => {
      const dateRange = getDateRangeForPeriod(appliedPeriod, customStartDate, customEndDate);
      const fetchKey = `${currentPage}_${pageSize}_${appliedSearch.trim()}_${appliedCategory}_${appliedPaymentMode}_${dateRange.from || ''}_${dateRange.to || ''}`;

      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;
      setIsApiLoading(true);

      try {
        const response = await workExpenseApi.getExpenses({
          page: currentPage,
          limit: pageSize,
          search: appliedSearch.trim() || undefined,
          categoryId: appliedCategory !== 'All' ? appliedCategory : undefined,
          paymentMethod: appliedPaymentMode !== 'All' ? appliedPaymentMode : undefined,
          from: dateRange.from,
          to: dateRange.to,
          sortBy: 'expenseDate',
          sortOrder: 'desc',
          pagination_required: true,
        });

        if (response && response.success && Array.isArray(response.data)) {
          const mapped = response.data.map(mapApiExpenseToUi);
          setExpenses(mapped);
          setIsApiConnected(true);
          setApiErrorMessage(null);

          if (response.pagination) {
            setTotalApiRecords(response.pagination.totalRecords);
            setTotalApiPages(response.pagination.totalPages);
          } else {
            setTotalApiRecords(mapped.length);
            setTotalApiPages(Math.ceil(mapped.length / pageSize) || 1);
          }

          if (response.summary) {
            setApiSummary(response.summary);
          } else {
            setApiSummary(null);
          }
        } else {
          setIsApiConnected(true);
          setExpenses([]);
          setTotalApiRecords(0);
          setTotalApiPages(1);
          setApiSummary(null);
        }
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          'Work Expense API unavailable';
        console.warn('Work Expense API unavailable:', errMsg);
        setIsApiConnected(false);
        setApiErrorMessage(errMsg);
        setExpenses([]);
        setTotalApiRecords(0);
        setTotalApiPages(1);
        setApiSummary(null);
      } finally {
        isFetchingRef.current = false;
        setIsApiLoading(false);
      }
    },
    [currentPage, pageSize, appliedSearch, appliedCategory, appliedPaymentMode, appliedPeriod, customStartDate, customEndDate]
  );

  // Initial and reactive fetch on filter change
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Debounced Search (600ms) - waits until typing completes before triggering API
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = pendingSearch.trim();
      if (trimmed !== appliedSearch) {
        setAppliedSearch(trimmed);
        setCurrentPage(1);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [pendingSearch, appliedSearch]);

  // 3-Dots Action dropdown & Share Popover
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [sharePos, setSharePos] = useState<{ top?: number; bottom?: number; right?: number } | null>(null);

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
  const [receiptImageState, setReceiptImageState] = useState<string>('');

  // Category Manager Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryDesc, setEditCategoryDesc] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(ExpenseSchema),
    defaultValues: {
      expenseNo: '',
      expenseDate: new Date().toISOString().split('T')[0],
      category: '',
      categoryId: '',
      supplierId: '',
      title: '',
      payee: '',
      amount: '',
      taxPercent: '0',
      paymentMode: 'Bank Transfer',
      referenceNo: '',
      receiptImage: '',
      notes: '',
      status: 'Paid',
    },
  });

  const watchAmount = watch('amount');
  const watchTaxPercent = watch('taxPercent');
  const watchCategoryId = watch('categoryId');
  const watchSupplierId = watch('supplierId');
  const watchPayee = watch('payee');

  // Combobox state for Payee Vendor (allows typing manual payee or choosing registered supplier)
  const [isPayeeDropdownOpen, setIsPayeeDropdownOpen] = useState(false);
  const payeeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (payeeContainerRef.current && !payeeContainerRef.current.contains(e.target as Node)) {
        setIsPayeeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredSuppliersForPayee = useMemo(() => {
    if (!watchPayee || !watchPayee.trim()) return suppliers;
    const q = watchPayee.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.supplierCode && s.supplierCode.toLowerCase().includes(q))
    );
  }, [suppliers, watchPayee]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingExpenseId(null);
    setReceiptImageState('');
    const defaultCat = categories.length > 0 ? categories[0] : null;

    reset({
      expenseNo: 'Auto-generated on save',
      expenseDate: new Date().toISOString().split('T')[0],
      category: defaultCat ? defaultCat.name : '',
      categoryId: defaultCat ? defaultCat.id : '',
      supplierId: '',
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

  // Open Edit Modal
  const handleOpenEditModal = (exp: ExpenseItem) => {
    setEditingExpenseId(exp.id);
    setReceiptImageState(exp.receiptImage || '');

    reset({
      expenseNo: exp.expenseNo,
      expenseDate: exp.expenseDate,
      category: exp.category,
      categoryId: exp.categoryId || '',
      supplierId: exp.supplierId || '',
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

  // Duplicate Expense Handler
  const handleDuplicateExpense = (exp: ExpenseItem) => {
    setEditingExpenseId(null);
    setReceiptImageState(exp.receiptImage || '');

    reset({
      expenseNo: 'Auto-generated on save',
      expenseDate: new Date().toISOString().split('T')[0],
      category: exp.category,
      categoryId: exp.categoryId || '',
      supplierId: exp.supplierId || '',
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

  const handleOpenDetailModal = (exp: ExpenseItem) => {
    setSelectedExpense(exp);
    setIsDetailModalOpen(true);
  };

  // Delete Expense via Work API
  const handleDeleteExpense = async (id: string, expNo: string) => {
    try {
      await workExpenseApi.deleteExpense(id);
      toast.success(`Expense ${expNo} deleted successfully.`);
      fetchExpenses(true);
    } catch (err: any) {
      const msg = err?.message || 'Failed to delete expense';
      toast.error(msg);
    }
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setReceiptImageState(result);
        setValue('receiptImage', result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Expense Form (Create or Update)
  const onSubmitExpense = async (data: ExpenseFormData) => {
    // Validate Category
    let targetCatId = data.categoryId;
    if (!targetCatId || !isValidUuid(targetCatId)) {
      const match = categories.find((c) => c.name.toLowerCase() === data.category.toLowerCase());
      if (match) {
        targetCatId = match.id;
      } else if (categories.length > 0) {
        targetCatId = categories[0].id;
      } else {
        toast.error('Please create or select an expense category first.');
        return;
      }
    }

    // Determine supplierId
    let finalSupplierId: string | null = null;
    if (data.supplierId && isValidUuid(data.supplierId)) {
      finalSupplierId = data.supplierId;
    } else if (data.payee) {
      const matchSup = suppliers.find((s) => s.name.toLowerCase() === data.payee?.toLowerCase());
      if (matchSup && isValidUuid(matchSup.id)) {
        finalSupplierId = matchSup.id;
      }
    }

    setIsSubmittingForm(true);

    try {
      if (editingExpenseId) {
        // Update existing expense via PUT /work/expenses/{id}
        const payload = mapUiToUpdateExpensePayload({
          categoryId: targetCatId,
          supplierId: finalSupplierId,
          expenseDate: data.expenseDate,
          title: data.title,
          amount: data.amount,
          taxPercent: data.taxPercent,
          paymentMode: data.paymentMode,
          referenceNo: data.referenceNo,
          notes: data.notes,
        });

        await workExpenseApi.updateExpense(editingExpenseId, payload);
        toast.success(`Expense ${data.expenseNo || ''} updated successfully.`);
      } else {
        // Create new expense via POST /work/expenses
        const payload = mapUiToCreateExpensePayload({
          categoryId: targetCatId,
          supplierId: finalSupplierId,
          expenseDate: data.expenseDate,
          title: data.title,
          amount: data.amount,
          taxPercent: data.taxPercent,
          paymentMode: data.paymentMode,
          referenceNo: data.referenceNo,
          notes: data.notes,
        });

        const res = await workExpenseApi.createExpense(payload);
        const createdNo = res.data?.expenseNo || 'new expense';
        toast.success(`Expense ${createdNo} created successfully.`);
      }

      setIsFormModalOpen(false);
      fetchExpenses(true);
    } catch (err: any) {
      const msg = err?.message || 'Failed to save expense';
      toast.error(msg);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Category Manager Actions
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    setIsSavingCategory(true);
    try {
      const res = await workExpenseCategoryApi.createExpenseCategory({
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim() || undefined,
        status: 'Active',
      });
      toast.success(`Category "${res.data.name}" added successfully.`);
      setNewCategoryName('');
      setNewCategoryDesc('');
      await fetchCategories();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editCategoryName.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }
    try {
      await workExpenseCategoryApi.updateExpenseCategory(id, {
        name: editCategoryName.trim(),
        description: editCategoryDesc.trim() || undefined,
      });
      toast.success('Category updated successfully');
      setEditingCategoryId(null);
      await fetchCategories();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (cat: ApiExpenseCategory) => {
    try {
      await workExpenseCategoryApi.deleteExpenseCategory(cat.id);
      toast.success(`Category "${cat.name}" removed successfully.`);
      await fetchCategories();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete category');
    }
  };

  // Custom Date range application
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

  // Filtered categories for Category Manager Modal
  const filteredCategoryList = useMemo(() => {
    if (!categorySearchQuery.trim()) return categories;
    const q = categorySearchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, categorySearchQuery]);

  // Overall Metrics Calculations (combines API summary or fallback calculation)
  const summaryTotalAmount = useMemo(() => {
    if (apiSummary?.totalAmount !== undefined) return apiSummary.totalAmount;
    return expenses.reduce((acc, curr) => acc + curr.totalAmount, 0);
  }, [apiSummary, expenses]);

  const summaryTaxAmount = useMemo(() => {
    if (apiSummary?.taxAmount !== undefined) return apiSummary.taxAmount;
    return expenses.reduce((acc, curr) => acc + curr.taxAmount, 0);
  }, [apiSummary, expenses]);

  const summaryBaseAmount = useMemo(() => {
    if (apiSummary?.amount !== undefined) return apiSummary.amount;
    return expenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [apiSummary, expenses]);

  // Category badge colors
  const getCategoryBadgeColor = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('rent')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (c.includes('util') || c.includes('elect')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (c.includes('soft') || c.includes('tech') || c.includes('sub')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (c.includes('food') || c.includes('refresh')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (c.includes('logist') || c.includes('cour') || c.includes('travel')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (c.includes('suppl') || c.includes('station')) return 'bg-sky-50 text-sky-700 border-sky-200';
    if (c.includes('salar') || c.includes('wage')) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  // Export Expenses to Excel
  const handleExportExcel = () => {
    if (expenses.length === 0) {
      toast.error('No expense records available to export.');
      return;
    }

    const excelRows = expenses.map((exp, idx) => ({
      sNo: (currentPage - 1) * pageSize + idx + 1,
      expenseNo: exp.expenseNo,
      expenseDate: exp.expenseDate,
      category: exp.category,
      title: exp.title,
      payee: exp.payee || '-',
      amount: Number(exp.amount || 0),
      taxAmount: Number(exp.taxAmount || 0),
      totalAmount: Number(exp.totalAmount || 0),
      paymentMode: exp.paymentMode,
      referenceNo: exp.referenceNo || '-',
      status: exp.status,
    }));

    exportTableToExcel({
      filename: `Expenses_Ledger_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Expenses',
      title: 'YAA CREATIONS CRM - OPERATING EXPENSES DIRECTORY',
      subtitle: `Total Records: ${totalApiRecords ?? expenses.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'Expense #', key: 'expenseNo', align: 'center', width: 16 },
        { header: 'Date', key: 'expenseDate', align: 'center', width: 14 },
        { header: 'Category', key: 'category', align: 'left', width: 22 },
        { header: 'Title / Purpose', key: 'title', align: 'left', width: 26 },
        { header: 'Payee / Supplier', key: 'payee', align: 'left', width: 22 },
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
        expenseNo: `${totalApiRecords ?? expenses.length} Records`,
        taxAmount: summaryTaxAmount,
        totalAmount: summaryTotalAmount,
      },
    });

    toast.success(`Expenses Excel report downloaded (${excelRows.length} records in view)!`);
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
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Expense Management
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Track operational costs, tax breakdown, company overheads & vendor disbursements
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto">
          {/* Categories Master Management Button */}
          <Button
            variant="secondary"
            size="md"
            className="w-full sm:w-auto justify-center"
            onClick={() => setIsCategoryModalOpen(true)}
            icon={<Layers className="w-4 h-4 text-[#33077C]" />}
          >
            <span>Categories</span>
            {categories.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#33077C]/10 text-[#33077C]">
                {categories.length}
              </span>
            )}
          </Button>

          {/* Export to Excel */}
          <Button
            variant="secondary"
            size="md"
            className="w-full sm:w-auto justify-center"
            onClick={handleExportExcel}
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Excel Report
          </Button>

          {/* Add Expense Button */}
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreateModal}
            className="col-span-2 sm:col-span-1 w-full sm:w-auto justify-center"
            icon={<Plus className="w-4 h-4 text-white shrink-0" />}
          >
            <span>Add Expense</span>
          </Button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">
              ₹{summaryTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totalApiRecords ?? expenses.length} recorded vouchers
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tax / GST Paid
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">
              ₹{summaryTaxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Claimable input tax credit
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Base Expenditure
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">
              ₹{summaryBaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Net pre-tax operational costs
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Categories
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">
              {categories.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Cost classification heads
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search by expense #, title, payee, reference..."
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

            {/* Filter by Live Category */}
            <div className="shrink-0">
              <FilterDropdown
                placeholder="Category : All"
                value={pendingCategory}
                onChange={(val) => {
                  setPendingCategory(val);
                  setAppliedCategory(val);
                  setCurrentPage(1);
                }}
                options={[
                  { label: 'Category : All', value: 'All' },
                  ...categories.map((c) => ({ label: c.name, value: c.id })),
                ]}
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
              Total Records :{' '}
              <span className="text-[#33077C] font-bold">
                {totalApiRecords ?? expenses.length}
              </span>
            </span>
          </div>
        }
      />

      {/* Expenses Table */}
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
              {isApiLoading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#33077C] mb-2" />
                    <p className="font-semibold text-sm text-slate-700">Loading operating expenses...</p>
                    <p className="text-xs text-slate-400 mt-1">Connecting to Work API</p>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-700 text-sm">No expense records found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {apiErrorMessage
                        ? `Notice: ${apiErrorMessage}`
                        : 'Try adjusting your filters or click "+ Add Expense" to record a new operating expense.'}
                    </p>
                    <div className="mt-4">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleOpenCreateModal}
                        icon={<Plus className="w-3.5 h-3.5 mr-1" />}
                      >
                        Add First Expense
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-purple-50/20 transition-colors border-b border-slate-200"
                  >
                    {/* Expense No */}
                    <td className="py-3.5 px-5 border border-slate-200">
                      <span className="font-semibold text-slate-800 text-xs font-mono">
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
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md font-semibold text-[11px] border whitespace-nowrap ${getCategoryBadgeColor(
                          exp.category
                        )}`}
                      >
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
                          {exp.payee || (exp.supplierName ? exp.supplierName : 'General Payee')}
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
                          <span className="text-[10px] text-slate-400 block font-normal">
                            ({exp.taxPercent}%)
                          </span>
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
                        {exp.status || 'Paid'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Print Action */}
                        <button
                          type="button"
                          title="Print Expense Voucher"
                          onClick={() => {
                            setSelectedExpense(exp);
                            toast.info(`Preparing print for ${exp.expenseNo}...`);
                            window.print();
                          }}
                          className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Share Popover */}
                        <UniversalShareDropdown
                          id={exp.id}
                          activeShareId={activeShareId}
                          setActiveShareId={setActiveShareId}
                          sharePos={sharePos}
                          setSharePos={setSharePos}
                          getShareData={() => formatExpenseShare(exp)}
                          title="Share Expense Voucher"
                        />

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
                                const dropdownHeight = 240;
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
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-[#33077C] hover:text-white transition-colors cursor-pointer flex items-center gap-2 group"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                                <span>View/Edit</span>
                              </button>

                              {/* 2. Preview */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleOpenDetailModal(exp);
                                }}
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-[#33077C] hover:text-white transition-colors cursor-pointer flex items-center gap-2 group"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                                <span>Preview</span>
                              </button>

                              {/* 3. Duplicate */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleDuplicateExpense(exp);
                                }}
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-[#33077C] hover:text-white transition-colors cursor-pointer flex items-center gap-2 group"
                              >
                                <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                                <span>Duplicate</span>
                              </button>

                              {/* 4. Print */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExpense(exp);
                                  setActiveDropdownId(null);
                                  toast.info(`Preparing print for ${exp.expenseNo}...`);
                                  window.print();
                                }}
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-[#33077C] hover:text-white transition-colors cursor-pointer flex items-center gap-2 group"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                                <span>Print</span>
                              </button>

                              {/* 5. Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleDeleteExpense(exp.id, exp.expenseNo);
                                }}
                                className="w-full px-4 py-2 text-left text-[13px] font-medium text-rose-600 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer flex items-center gap-2 border-t border-slate-100 group"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500 group-hover:text-white transition-colors" />
                                <span>Delete</span>
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

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalApiRecords ?? expenses.length}
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
            : 'Configure operating expense voucher, classification category, and payment settlement'
        }
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        onBack={() => setIsFormModalOpen(false)}
      >
        <form noValidate onSubmit={handleSubmit(onSubmitExpense)} className="space-y-6 p-2 sm:p-4">
          {/* Row 1: 3 Fields (Expense Voucher No, Expense Category, Expense Date) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
            <div>
              <FormLabel>Expense Voucher No</FormLabel>
              <input
                type="text"
                {...register('expenseNo')}
                disabled
                className={FORM_INPUT_DISABLED_CLS}
              />
              <FormError message={errors.expenseNo?.message} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <FormLabel required className="mb-0">
                  Expense Category
                </FormLabel>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-xs font-semibold text-[#4309A2] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Manage</span>
                </button>
              </div>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <CustomSelect
                    options={categories.map((c) => ({ label: c.name, value: c.id }))}
                    value={field.value || ''}
                    onChange={(val) => {
                      field.onChange(val);
                      const found = categories.find((c) => c.id === val);
                      if (found) {
                        setValue('category', found.name);
                      }
                    }}
                    placeholder={
                      isCategoriesLoading ? 'Loading categories...' : 'Select expense category'
                    }
                  />
                )}
              />
              <FormError message={errors.category?.message || errors.categoryId?.message} />
            </div>

            <div>
              <FormLabel required>Expense Date</FormLabel>
              <input
                type="date"
                {...register('expenseDate')}
                className={getFormInputCls(!!errors.expenseDate)}
              />
              <FormError message={errors.expenseDate?.message} />
            </div>
          </div>

          {/* Row 2: 3 Fields (Paid To / Payee Vendor, Expense Title / Description, Payment Mode) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <FormLabel className="mb-0">Paid To / Payee Vendor</FormLabel>
                {watchSupplierId && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" />
                    <span>Linked Supplier</span>
                  </span>
                )}
              </div>
              <div className="relative" ref={payeeContainerRef}>
                <input
                  type="text"
                  value={watchPayee || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setValue('payee', val);
                    setValue('supplierId', '');
                    setIsPayeeDropdownOpen(true);
                  }}
                  onFocus={() => setIsPayeeDropdownOpen(true)}
                  placeholder="Type manual vendor or select supplier..."
                  className={`${FORM_INPUT_CLS} pr-16`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  {watchPayee && (
                    <button
                      type="button"
                      onClick={() => {
                        setValue('payee', '');
                        setValue('supplierId', '');
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPayeeDropdownOpen((prev) => !prev)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Show suppliers"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        isPayeeDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Dropdown Suggestions */}
                {isPayeeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 max-h-56 overflow-y-auto font-sans animate-in fade-in zoom-in-95 duration-100">
                    {/* Option to use manual typed text */}
                    {watchPayee && watchPayee.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setValue('supplierId', '');
                          setIsPayeeDropdownOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-purple-50 flex items-center justify-between border-b border-slate-100 text-xs transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-700">Use manual payee:</span>
                          <span className="font-bold text-[#33077C] truncate">"{watchPayee}"</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                          Manual
                        </span>
                      </button>
                    )}

                    {/* Registered Suppliers Header */}
                    <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Registered Suppliers</span>
                      <span>({suppliers.length})</span>
                    </div>

                    {filteredSuppliersForPayee.length === 0 ? (
                      <div className="px-3.5 py-2 text-xs text-slate-400 italic">
                        No matching registered suppliers found. You can keep your manual text above.
                      </div>
                    ) : (
                      filteredSuppliersForPayee.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setValue('payee', s.name);
                            setValue('supplierId', s.id);
                            setIsPayeeDropdownOpen(false);
                          }}
                          className={`w-full px-3.5 py-2 text-left hover:bg-purple-50 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            watchSupplierId === s.id
                              ? 'bg-purple-50/70 font-bold text-[#33077C]'
                              : 'text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="truncate font-semibold">{s.name}</span>
                            {s.supplierCode && (
                              <span className="text-[11px] text-slate-400 shrink-0">
                                ({s.supplierCode})
                              </span>
                            )}
                          </div>
                          {watchSupplierId === s.id && (
                            <Check className="w-3.5 h-3.5 text-[#33077C] shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <FormError message={errors.payee?.message} />
            </div>

            <div>
              <FormLabel required>Expense Title / Description</FormLabel>
              <input
                type="text"
                {...register('title')}
                placeholder="e.g. Office rent for October"
                className={FORM_INPUT_CLS}
              />
              <FormError message={errors.title?.message} />
            </div>

            <div>
              <FormLabel required>Payment Mode</FormLabel>
              <Controller
                control={control}
                name="paymentMode"
                render={({ field }) => (
                  <CustomSelect
                    options={PAYMENT_MODES.map((m) => ({ label: m, value: m }))}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select payment mode"
                  />
                )}
              />
              <FormError message={errors.paymentMode?.message} />
            </div>
          </div>

          {/* Row 3: 3 Fields (Base Amount, Tax / GST Rate, Reference No / Transaction ID) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
            <div>
              <FormLabel required>Base Amount (₹)</FormLabel>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 font-medium text-xs sm:text-[13px] pointer-events-none">₹</span>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  {...register('amount')}
                  className={`${FORM_INPUT_CLS} pl-7 font-bold`}
                />
              </div>
              <FormError message={errors.amount?.message} />
            </div>

            <div>
              <FormLabel>Tax / GST Rate</FormLabel>
              <Controller
                control={control}
                name="taxPercent"
                render={({ field }) => (
                  <CustomSelect
                    options={[
                      { label: '0% (No Tax)', value: '0' },
                      { label: '5% GST', value: '5' },
                      { label: '12% GST', value: '12' },
                      { label: '18% GST', value: '18' },
                      { label: '28% GST', value: '28' },
                    ]}
                    value={field.value ? String(field.value) : '0'}
                    onChange={field.onChange}
                    placeholder="Select GST Rate"
                  />
                )}
              />
              <FormError message={errors.taxPercent?.message} />
            </div>

            <div>
              <FormLabel>Reference No / Transaction ID</FormLabel>
              <input
                type="text"
                placeholder="e.g. TXN-RENT-1008 or Cheque #"
                {...register('referenceNo')}
                className={FORM_INPUT_CLS}
              />
              <FormError message={errors.referenceNo?.message} />
            </div>
          </div>

          {/* Calculated Total summary bar */}
          {Number(watchAmount) > 0 && (
            <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3.5 flex items-center justify-between text-xs sm:text-[13px]">
              <div className="text-slate-600 font-medium">
                <span>
                  Base:{' '}
                  <strong className="text-slate-800">
                    ₹{Number(watchAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </span>
                {Number(watchTaxPercent) > 0 && (
                  <span className="ml-4">
                    Tax ({watchTaxPercent}%):{' '}
                    <strong className="text-slate-800">
                      ₹{Math.round((Number(watchAmount) * Number(watchTaxPercent)) / 100).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </strong>
                  </span>
                )}
              </div>
              <div className="text-[#33077C] font-black text-sm sm:text-base">
                Total: ₹
                {(
                  Number(watchAmount) +
                  Math.round((Number(watchAmount) * Number(watchTaxPercent || 0)) / 100)
                ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}

          {/* Row 4: Upload Receipt in 1 column, Notes spanning 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
            <div>
              <FormLabel>Upload Receipt / Proof</FormLabel>
              {receiptImageState ? (
                <div className="flex items-center gap-3 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <img
                    src={receiptImageState}
                    alt="Receipt"
                    className="w-7 h-7 rounded-lg object-cover border border-slate-200"
                  />
                  <span className="text-xs sm:text-[13px] text-slate-700 font-medium truncate flex-1">
                    Receipt Attached
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptImageState('');
                      setValue('receiptImage', '');
                    }}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
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
              <FormLabel>Notes / Remarks</FormLabel>
              <input
                type="text"
                placeholder="Optional notes or disbursement comments"
                {...register('notes')}
                className={FORM_INPUT_CLS}
              />
              <FormError message={errors.notes?.message} />
            </div>
          </div>

          {/* Form Actions */}
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
              disabled={isSubmittingForm}
              className="h-11 px-7 rounded-xl text-xs sm:text-[13px] font-semibold bg-[#33077C] hover:bg-[#25055b] text-white shadow-sm cursor-pointer flex items-center gap-2"
              icon={
                isSubmittingForm ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Check className="w-4 h-4 text-white" />
                )
              }
            >
              {isSubmittingForm
                ? 'Saving to Work API...'
                : editingExpenseId
                ? 'Save Changes'
                : 'Record Expense'}
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
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Payee: {selectedExpense.payee || 'General Payee'}
                </p>
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
              <span>Created: {new Date(selectedExpense.createdAt).toLocaleDateString('en-IN')}</span>
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

      {/* CATEGORY MASTER MANAGEMENT MODAL */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Expense Categories Master"
        subtitle="Manage cost classifications, budget heads & active tax-tracking categories"
        maxWidth="2xl"
        headerGradient={true}
      >
        <div className="space-y-6 p-2 sm:p-4">
          {/* Quick Create Category Form */}
          <form onSubmit={handleCreateCategory} className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#33077C]" />
              <span>Add New Category</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <FormLabel required>Category Name</FormLabel>
                <input
                  type="text"
                  placeholder="e.g. Courier & Logistics"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className={FORM_INPUT_CLS}
                />
              </div>
              <div>
                <FormLabel>Description</FormLabel>
                <input
                  type="text"
                  placeholder="e.g. Courier and shipping costs"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  className={FORM_INPUT_CLS}
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSavingCategory}
                icon={
                  isSavingCategory ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )
                }
              >
                {isSavingCategory ? 'Adding...' : 'Save Category'}
              </Button>
            </div>
          </form>

          {/* Categories Search & List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#4309A2] bg-white"
                />
              </div>
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                {filteredCategoryList.length} Categories
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {filteredCategoryList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  No expense categories found.
                </div>
              ) : (
                filteredCategoryList.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    {editingCategoryId === cat.id ? (
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 bg-white"
                        />
                        <input
                          type="text"
                          value={editCategoryDesc}
                          onChange={(e) => setEditCategoryDesc(e.target.value)}
                          placeholder="Description"
                          className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 bg-white"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800 truncate">
                            {cat.name}
                          </span>
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                              cat.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {cat.status}
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {cat.description}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      {editingCategoryId === cat.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleUpdateCategory(cat.id)}
                            className="h-7 px-2.5 text-xs"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingCategoryId(null)}
                            className="h-7 px-2.5 text-xs"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setEditCategoryName(cat.name);
                              setEditCategoryDesc(cat.description || '');
                            }}
                            title="Edit Category"
                            className="w-7 h-7 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            title="Deactivate / Delete Category"
                            className="w-7 h-7 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={() => setIsCategoryModalOpen(false)}
              className="text-xs"
            >
              Done
            </Button>
          </div>
        </div>
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
