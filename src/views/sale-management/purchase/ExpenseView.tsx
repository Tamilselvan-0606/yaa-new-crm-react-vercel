import { CommonTableHead } from '../../../components/common/CommonTableHead';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExpenseSchema, ExpenseFormData } from '../../../validations';
import { FormError } from '../../../components/common/FormError';
import {
  checkRequiredText,
  checkRequiredDate,
  checkDateNotBefore,
  checkMoney,
  checkPercent,
  collectErrors,
  extractApiFieldErrors,
  getApiErrorMessage,
  useSubmitGuard,
  useFieldErrors,
  useRevalidateAfterSubmit,
} from '../../../utils/formValidation';
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
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { DeleteConfirmationModal } from '../../../components/common/DeleteConfirmationModal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { exportTableToExcel } from '../../../utils/excelExport';
import { printBusinessDocument, printTableReport, downloadBusinessDocument, DocumentPrintOptions } from '../../../utils/printUtils';
import { FormLabel, FORM_INPUT_CLS, FORM_INPUT_DISABLED_CLS, FORM_SELECT_CLS, getFormInputCls, handleNonNegativeKeyDown } from '../utils/formUtils';
import { SaleActionDropdown } from '../utils';
import { toast } from "../../../utils/toast";
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
  baseClient,
} from '../../../api';

import { formatDate } from '../utils/dateUtils';
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
  const [pageSize, setPageSize] = useState(5);

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

  // On-demand loader for form master data (categories & suppliers)
  const hasLoadedFormMasterDataRef = useRef(false);
  const isLoadingFormMasterDataRef = useRef(false);

  const loadFormMasterData = useCallback(async () => {
    if (hasLoadedFormMasterDataRef.current || isLoadingFormMasterDataRef.current) return;
    isLoadingFormMasterDataRef.current = true;
    try {
      await Promise.allSettled([fetchCategories(), fetchSuppliers()]);
      hasLoadedFormMasterDataRef.current = true;
    } finally {
      isLoadingFormMasterDataRef.current = false;
    }
  }, [fetchCategories, fetchSuppliers]);

  // Fetch Expenses from Work API with deduplication
  const fetchExpenses = useCallback(
    async (
      forceRefresh = false,
      overrides?: {
        search?: string;
        period?: string;
        category?: string;
        paymentMode?: string;
        page?: number;
      }
    ) => {
      const targetPage = overrides?.page ?? currentPage;
      const targetSearch = overrides?.search !== undefined ? overrides.search : appliedSearch;
      const targetPeriod = overrides?.period !== undefined ? overrides.period : appliedPeriod;
      const targetCategory = overrides?.category !== undefined ? overrides.category : appliedCategory;
      const targetPaymentMode = overrides?.paymentMode !== undefined ? overrides.paymentMode : appliedPaymentMode;

      const dateRange = getDateRangeForPeriod(targetPeriod, customStartDate, customEndDate);
      const fetchKey = `${targetPage}_${pageSize}_${targetSearch.trim()}_${targetCategory}_${targetPaymentMode}_${dateRange.from || ''}_${dateRange.to || ''}`;

      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;
      setIsApiLoading(true);

      try {
        const response = await workExpenseApi.getExpenses({
          page: targetPage,
          limit: pageSize,
          search: targetSearch.trim() || undefined,
          categoryId: targetCategory !== 'All' ? targetCategory : undefined,
          paymentMethod: targetPaymentMode !== 'All' ? targetPaymentMode : undefined,
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


  // 3-Dots Action dropdown & Share Popover
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-dropdown-container') && !target.closest('.action-dropdown-menu')) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (!target.closest('.share-popover-container') && !target.closest('.share-popover-menu')) {
      }
    };
    const handleScroll = () => {
      if (activeDropdownId) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    };
    window.addEventListener('click', handleOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('click', handleOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeDropdownId]);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [receiptImageState, setReceiptImageState] = useState<string>('');
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [failedBillImageSrc, setFailedBillImageSrc] = useState<string | null>(null);
  const [selectedBillExpense, setSelectedBillExpense] = useState<ExpenseItem | null>(null);
  const [isLoadingBillReceipt, setIsLoadingBillReceipt] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetExpense, setDeleteTargetExpense] = useState<ExpenseItem | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [deleteExpenseError, setDeleteExpenseError] = useState<string | null>(null);
  const [isDownloadingExpense, setIsDownloadingExpense] = useState(false);

  // Category Manager Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryDesc, setEditCategoryDesc] = useState('');

  // Load master data on-demand only when modals are opened
  useEffect(() => {
    if (isFormModalOpen) {
      loadFormMasterData();
    } else if (isCategoryModalOpen) {
      fetchCategories();
    }
  }, [isFormModalOpen, isCategoryModalOpen, loadFormMasterData, fetchCategories]);

  const { runOnce: runSaveOnce } = useSubmitGuard();
  const { runOnce: runDeleteOnce } = useSubmitGuard();
  const { runOnce: runCategoryOnce } = useSubmitGuard();
  const [receiptError, setReceiptError] = useState<string | null>(null);
  // Invalid receipt file picked: kept silently until the form is submitted, then shown inline.
  const [receiptFileProblem, setReceiptFileProblem] = useState<string | null>(null);
  const newCatFe = useFieldErrors();
  const editCatFe = useFieldErrors();
  const dateFe = useFieldErrors();
  const newCategoryError = newCatFe.errors.newName ?? null;
  const editCategoryError = editCatFe.errors.editName ?? null;
  const customDateError = dateFe.errors.range ?? null;

  // Category must resolve to a real loaded category record (no silent substitution).
  const categoryIdError = (values: any): string | null => {
    const id = values?.categoryId;
    if (!id) {
      const byName = values?.category
        ? categories.find((c) => c.name.toLowerCase() === String(values.category).toLowerCase())
        : undefined;
      return byName ? null : 'Please select an expense category before continuing.';
    }
    if (!isValidUuid(id)) return 'Please choose the expense category from the list.';
    if (categories.length > 0 && !categories.some((c) => c.id === id)) {
      return 'Please choose the expense category from the list.';
    }
    return null;
  };

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitted },
  } = useForm<ExpenseFormData>({
    // Shared zod schema + friendly local rules layered on top.
    resolver: (async (values: any, ctx: any, opts: any) => {
      const base: any = await (zodResolver(ExpenseSchema) as any)(values, ctx, opts);
      const extra = collectErrors([
        ['expenseDate', checkRequiredDate(values.expenseDate, 'expense date')],
        ['title', checkRequiredText(values.title, 'expense title or description', 2)],
        ['amount', checkMoney(values.amount, 'expense amount')],
        ['taxPercent', checkPercent(values.taxPercent, 'tax percentage', { optional: true })],
        ['paymentMode', checkRequiredText(values.paymentMode, 'payment mode')],
        ['categoryId', categoryIdError(values)],
      ]);
      const errs: any = { ...(base.errors || {}) };
      for (const k of ['expenseDate', 'title', 'amount', 'taxPercent', 'paymentMode', 'categoryId']) {
        if (extra[k]) errs[k] = { type: 'validate', message: extra[k] };
        else delete errs[k];
      }
      // Category is validated through categoryId; avoid a duplicate "category" message.
      delete errs.category;
      if (Object.keys(errs).length === 0) return { values: base.values ?? values, errors: {} };
      return { values: {}, errors: errs };
    }) as any,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
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

  // Every open/close of the expense form starts with no errors.
  useEffect(() => {
    clearErrors();
    setReceiptError(null);
    setReceiptFileProblem(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormModalOpen]);

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
    setReceiptError(null);
    loadFormMasterData();
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
    setReceiptError(null);
    loadFormMasterData();
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
    setReceiptError(null);
    loadFormMasterData();
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

  const handleOpenDetailModal = async (exp: ExpenseItem) => {
    let currentReceipt = exp.receiptImage;
    if (!currentReceipt && exp.id) {
      currentReceipt =
        localStorage.getItem(`crm_exp_receipt_${exp.id}`) ||
        (exp.expenseNo ? localStorage.getItem(`crm_exp_receipt_${exp.expenseNo}`) : '') ||
        '';
    }
    const updatedExp = currentReceipt ? { ...exp, receiptImage: currentReceipt } : exp;
    setSelectedExpense(updatedExp);
    setIsDetailModalOpen(true);

    if (!currentReceipt && exp.id && isValidUuid(exp.id)) {
      try {
        const detail = await workExpenseApi.getExpenseById(exp.id);
        const fetchedImage =
          (detail.data as any)?.receiptImage ||
          (detail.data as any)?.receiptUrl ||
          (detail.data as any)?.attachmentUrl ||
          (detail.data as any)?.attachment ||
          (detail.data as any)?.billUrl ||
          (detail.data as any)?.billImage ||
          (detail.data as any)?.fileUrl ||
          '';
        if (fetchedImage) {
          localStorage.setItem(`crm_exp_receipt_${exp.id}`, fetchedImage);
          if (exp.expenseNo) localStorage.setItem(`crm_exp_receipt_${exp.expenseNo}`, fetchedImage);
          setSelectedExpense((prev) => (prev && prev.id === exp.id ? { ...prev, receiptImage: fetchedImage } : prev));
          setExpenses((prev) => prev.map((e) => (e.id === exp.id ? { ...e, receiptImage: fetchedImage } : e)));
        }
      } catch (err) {
        console.warn('Could not fetch expense detail for receipt in detail modal:', err);
      }
    }
  };

  const handleOpenBillModal = async (exp: ExpenseItem) => {
    let currentReceipt = exp.receiptImage;
    if (!currentReceipt && exp.id) {
      currentReceipt =
        localStorage.getItem(`crm_exp_receipt_${exp.id}`) ||
        (exp.expenseNo ? localStorage.getItem(`crm_exp_receipt_${exp.expenseNo}`) : '') ||
        '';
    }
    const initialExp = currentReceipt ? { ...exp, receiptImage: currentReceipt } : exp;
    setSelectedBillExpense(initialExp);
    setIsBillModalOpen(true);

    if (!currentReceipt && exp.id && isValidUuid(exp.id)) {
      setIsLoadingBillReceipt(true);
      try {
        const detail = await workExpenseApi.getExpenseById(exp.id);
        const fetchedImage =
          (detail.data as any)?.receiptImage ||
          (detail.data as any)?.receiptUrl ||
          (detail.data as any)?.attachmentUrl ||
          (detail.data as any)?.attachment ||
          (detail.data as any)?.billUrl ||
          (detail.data as any)?.billImage ||
          (detail.data as any)?.fileUrl ||
          '';
        if (fetchedImage) {
          localStorage.setItem(`crm_exp_receipt_${exp.id}`, fetchedImage);
          if (exp.expenseNo) localStorage.setItem(`crm_exp_receipt_${exp.expenseNo}`, fetchedImage);
          setSelectedBillExpense((prev) => (prev && prev.id === exp.id ? { ...prev, receiptImage: fetchedImage } : prev));
          setExpenses((prev) => prev.map((e) => (e.id === exp.id ? { ...e, receiptImage: fetchedImage } : e)));
        }
      } catch (err) {
        console.warn('Could not fetch expense detail for bill:', err);
      } finally {
        setIsLoadingBillReceipt(false);
      }
    }
  };

  // Delete Expense via Work API with confirmation modal
  const handleOpenDeleteModal = (exp: ExpenseItem) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setDeleteTargetExpense(exp);
    setDeleteExpenseError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteExpense = () => runDeleteOnce(confirmDeleteExpenseInner);
  const confirmDeleteExpenseInner = async () => {
    if (!deleteTargetExpense) return;
    setIsDeletingExpense(true);
    setDeleteExpenseError(null);
    try {
      await workExpenseApi.deleteExpense(deleteTargetExpense.id);
      toast.success(`Expense "${deleteTargetExpense.expenseNo}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setDeleteTargetExpense(null);
      fetchExpenses(true);
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Failed to delete expense');
      setDeleteExpenseError(msg);
      toast.error(msg);
    } finally {
      setIsDeletingExpense(false);
    }
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.avif'];
      const fileName = (file.name || '').toLowerCase();
      const hasValidExtension = allowedExtensions.some((ext) => fileName.endsWith(ext));
      const isImageMime = Boolean(file.type && file.type.startsWith('image/'));

      if (!isImageMime && !hasValidExtension) {
        setReceiptFileProblem('Please attach an image file (.png, .jpg, .jpeg, .webp, .gif, .bmp, .svg or .avif).');
        e.target.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setReceiptFileProblem('The receipt image must be smaller than 5 MB.');
        e.target.value = '';
        return;
      }
      setReceiptError(null);
      setReceiptFileProblem(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setReceiptImageState(result);
        setValue('receiptImage', result, { shouldValidate: true, shouldDirty: true });
        toast.success('Receipt image attached successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Expense Form (Create or Update)
  const onSubmitExpense = (data: ExpenseFormData) => {
    // An invalid receipt file blocks the save (shown inline together with the other errors).
    if (receiptFileProblem) return;
    return runSaveOnce(() => submitExpenseInner(data));
  };
  const submitExpenseInner = async (data: ExpenseFormData) => {
    // Re-check rules here so no request is sent if anything is invalid.
    const recheck = collectErrors([
      ['expenseDate', checkRequiredDate(data.expenseDate, 'expense date')],
      ['title', checkRequiredText(data.title, 'expense title or description', 2)],
      ['amount', checkMoney(data.amount, 'expense amount')],
      ['taxPercent', checkPercent(data.taxPercent, 'tax percentage', { optional: true })],
      ['paymentMode', checkRequiredText(data.paymentMode, 'payment mode')],
      ['categoryId', categoryIdError(data)],
    ]);
    const recheckKeys = Object.keys(recheck);
    if (recheckKeys.length > 0) {
      recheckKeys.forEach((k) => setError(k as any, { type: 'validate', message: recheck[k] }));
      return;
    }

    // Category: the selected record id, or an exact name match of a loaded category.
    let targetCatId = data.categoryId;
    if (!targetCatId || !isValidUuid(targetCatId)) {
      const match = categories.find((c) => c.name.toLowerCase() === data.category.toLowerCase());
      if (!match) {
        setError('categoryId', { type: 'validate', message: 'Please select an expense category before continuing.' });
        return;
      }
      targetCatId = match.id;
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

    // Upload receipt to S3 via /uploads/base64 if it's a data URL, or use direct URL
    let finalReceiptImage: string | null = null;
    const rawImage = (receiptImageState || data.receiptImage || '').trim();

    if (rawImage) {
      if (rawImage.startsWith('data:')) {
        try {
          const uploadRes = await baseClient.post('/uploads/base64', {
            image: rawImage,
            folder: 'attachments',
            fileName: `expense_${Date.now()}.png`,
          });
          const returnedUrl =
            (typeof uploadRes.data?.data === 'string' ? uploadRes.data.data : null) ||
            uploadRes.data?.data?.url ||
            uploadRes.data?.data?.fileUrl ||
            uploadRes.data?.data?.imageUrl ||
            uploadRes.data?.data?.location ||
            uploadRes.data?.data?.path ||
            (typeof uploadRes.data === 'string' ? uploadRes.data : null) ||
            uploadRes.data?.url ||
            uploadRes.data?.fileUrl ||
            uploadRes.data?.imageUrl ||
            uploadRes.data?.location;

          console.info('Expense receipt upload response:', uploadRes.data, '→ saved as:', returnedUrl);
          if (returnedUrl && typeof returnedUrl === 'string') {
            finalReceiptImage = returnedUrl;
          } else {
            throw new Error('Receipt upload did not return a file location.');
          }
        } catch (upErr) {
          // Do not send raw image data as the receipt when the upload failed; keep the form as is.
          console.warn('Failed to upload receipt:', upErr);
          setReceiptError('The receipt could not be uploaded. Please try attaching it again or remove it.');
          toast.error('The receipt could not be uploaded. Your entries have been kept.');
          setIsSubmittingForm(false);
          return;
        }
      } else {
        finalReceiptImage = rawImage;
      }
    } else {
      finalReceiptImage = null;
    }

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
          receiptImage: finalReceiptImage,
        });

        await workExpenseApi.updateExpense(editingExpenseId, payload);
        if (finalReceiptImage) {
          localStorage.setItem(`crm_exp_receipt_${editingExpenseId}`, finalReceiptImage);
          if (data.expenseNo) localStorage.setItem(`crm_exp_receipt_${data.expenseNo}`, finalReceiptImage);
        }
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
          receiptImage: finalReceiptImage,
        });

        const res = await workExpenseApi.createExpense(payload);
        const createdNo = res.data?.expenseNo || 'new expense';
        if (finalReceiptImage) {
          if (res.data?.id) localStorage.setItem(`crm_exp_receipt_${res.data.id}`, finalReceiptImage);
          if (res.data?.expenseNo) localStorage.setItem(`crm_exp_receipt_${res.data.expenseNo}`, finalReceiptImage);
        }
        toast.success(`Expense ${createdNo} created successfully.`);
      }

      setIsFormModalOpen(false);
      fetchExpenses(true);
    } catch (err: any) {
      const apiFields = extractApiFieldErrors(err);
      const fieldMap: Record<string, string> = {
        expenseDate: 'expenseDate', title: 'title', amount: 'amount', taxPercent: 'taxPercent',
        paymentMode: 'paymentMode', referenceNo: 'referenceNo', notes: 'notes', categoryId: 'categoryId', supplierId: 'payee',
      };
      let mapped = false;
      for (const [k, m] of Object.entries(apiFields)) {
        if (fieldMap[k]) {
          setError(fieldMap[k] as any, { type: 'server', message: m });
          mapped = true;
        }
      }
      if (!mapped) toast.error(getApiErrorMessage(err, 'Failed to save expense. Your entries have been kept; please try again.'));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Category Manager Actions
  const duplicateCategoryError = (name: string, ignoreId?: string): string | null =>
    categories.some((c) => c.id !== ignoreId && c.name.trim().toLowerCase() === name.trim().toLowerCase())
      ? 'A category with this name already exists.'
      : null;

  const computeNewCategoryErrors = () =>
    collectErrors([['newName', checkRequiredText(newCategoryName, 'category name') || duplicateCategoryError(newCategoryName)]]);
  const computeEditCategoryErrors = () =>
    collectErrors([['editName', checkRequiredText(editCategoryName, 'category name') || duplicateCategoryError(editCategoryName, editingCategoryId || undefined)]]);
  useRevalidateAfterSubmit(newCatFe, computeNewCategoryErrors, [newCategoryName, categories]);
  useRevalidateAfterSubmit(editCatFe, computeEditCategoryErrors, [editCategoryName, editingCategoryId, categories]);
  useEffect(() => {
    newCatFe.reset();
    editCatFe.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCategoryModalOpen]);
  useEffect(() => {
    editCatFe.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCategoryId]);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    return runCategoryOnce(async () => {
      if (!newCatFe.validateAll(computeNewCategoryErrors())) return;

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
        const m = extractApiFieldErrors(err).name;
        if (m) newCatFe.merge({ newName: m });
        else toast.error(getApiErrorMessage(err, 'Failed to create category'));
      } finally {
        setIsSavingCategory(false);
      }
    });
  };

  const handleUpdateCategory = (id: string) =>
    runCategoryOnce(async () => {
      if (!editCatFe.validateAll(computeEditCategoryErrors())) return;
      try {
        await workExpenseCategoryApi.updateExpenseCategory(id, {
          name: editCategoryName.trim(),
          description: editCategoryDesc.trim() || undefined,
        });
        toast.success('Category updated successfully');
        setEditingCategoryId(null);
        await fetchCategories();
      } catch (err: any) {
        const m = extractApiFieldErrors(err).name;
        if (m) editCatFe.merge({ editName: m });
        else toast.error(getApiErrorMessage(err, 'Failed to update category'));
      }
    });

  const handleDeleteCategory = (cat: ApiExpenseCategory) =>
    runCategoryOnce(async () => {
      try {
        await workExpenseCategoryApi.deleteExpenseCategory(cat.id);
        toast.success(`Category "${cat.name}" removed successfully.`);
        await fetchCategories();
      } catch (err: any) {
        toast.error(getApiErrorMessage(err, 'Failed to delete category'));
      }
    });

  // Custom Date range application
  const computeDateRangeErrors = () =>
    collectErrors([
      [
        'range',
        checkRequiredDate(customStartDate, 'start date') ||
          checkRequiredDate(customEndDate, 'end date') ||
          checkDateNotBefore(customEndDate, customStartDate, 'end date', 'start date'),
      ],
    ]);
  useRevalidateAfterSubmit(dateFe, computeDateRangeErrors, [customStartDate, customEndDate]);
  useEffect(() => {
    dateFe.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustomDateModalOpen]);
  const handleApplyCustomDates = () => {
    if (!dateFe.validateAll(computeDateRangeErrors())) return;
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

  // Print & Download Expense Voucher via universal printUtils
  const buildExpensePrintOptions = (exp: ExpenseItem): DocumentPrintOptions => {
    return {
      docTypeTitle: 'EXPENSE VOUCHER',
      docNo: exp.expenseNo,
      docDate: exp.expenseDate,
      status: exp.status || 'Paid',
      statusColor: 'emerald',
      referenceNo: exp.referenceNo,
      partyTitle: 'Paid To / Vendor',
      partyName: exp.payee || exp.supplierName || 'General Payee',
      partyCompany: exp.supplierName ? `Linked Supplier: ${exp.supplierName}` : undefined,
      extraMeta: [
        { label: 'Category', value: exp.category },
        { label: 'Payment Mode', value: exp.paymentMode },
        ...(exp.referenceNo ? [{ label: 'Ref / Bill No', value: exp.referenceNo }] : []),
      ],
      columns: [
        { header: 'Expense Description & Purpose', width: '50%' },
        { header: 'Category', align: 'center', width: '25%' },
        { header: 'Amount (₹)', align: 'right', width: '25%' },
      ],
      items: [
        {
          name: exp.title,
          remarks: exp.notes ? `Remarks: ${exp.notes}` : `Payee: ${exp.payee}`,
          quantity: 1,
          unitPrice: Number(exp.amount || 0),
          taxPercent: exp.taxPercent,
          total: Number(exp.totalAmount || 0),
        },
      ],
      subtotal: Number(exp.amount || 0),
      tax: {
        withGst: exp.taxAmount > 0,
        taxAmount: exp.taxAmount,
      },
      grandTotal: Number(exp.totalAmount || 0),
      paidAmount: Number(exp.totalAmount || 0),
      balance: 0,
      paidAmountLabel: 'Amount Disbursed',
      balanceLabel: 'Balance',
      notes: exp.notes || 'Operating expense processed and verified.',
    };
  };

  const handlePrintExpense = (exp: ExpenseItem) => {
    printBusinessDocument(buildExpensePrintOptions(exp));
  };

  const handleDownloadExpense = async (exp: ExpenseItem) => {
    if (isDownloadingExpense) return;
    setIsDownloadingExpense(true);
    const filename = `ExpenseVoucher_${(exp.expenseNo || 'expense').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    try {
      await downloadBusinessDocument(buildExpensePrintOptions(exp), filename);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      console.error('Failed to download expense voucher PDF:', err);
      toast.error('Failed to download expense voucher PDF. Please try again.');
    } finally {
      setIsDownloadingExpense(false);
    }
  };

  // Print Table Report for Expenses
  const handlePrintTableReport = () => {
    if (expenses.length === 0) {
      toast.info('No expense records available to print.');
      return;
    }

    const printRows = expenses.map((exp) => ({
      expenseNo: exp.expenseNo,
      expenseDate: exp.expenseDate,
      category: exp.category,
      title: exp.title,
      payee: exp.payee || exp.supplierName || '—',
      paymentMode: exp.paymentMode,
      referenceNo: exp.referenceNo || '—',
      totalAmount: Number(exp.totalAmount || 0),
    }));

    printTableReport({
      title: 'Operating Expenses Ledger Report',
      subtitle: `Total Records: ${totalApiRecords ?? expenses.length} | Category Filter: ${appliedCategory} | Mode: ${appliedPaymentMode}`,
      columns: [
        { header: 'Expense #', key: 'expenseNo', width: '15%' },
        { header: 'Date', key: 'expenseDate', width: '12%' },
        { header: 'Category', key: 'category', width: '16%' },
        { header: 'Title / Purpose', key: 'title', width: '25%' },
        { header: 'Payee / Vendor', key: 'payee', width: '18%' },
        { header: 'Total (₹)', key: 'totalAmount', align: 'right', type: 'currency', width: '14%' },
      ],
      data: printRows,
      metrics: [
        { label: 'Total Operating Expenses', value: summaryTotalAmount },
        { label: 'Tax Deductions', value: summaryTaxAmount },
        { label: 'Total Expense Vouchers', value: totalApiRecords ?? expenses.length },
      ],
      summaryRow: {
        expenseNo: 'Total',
        totalAmount: summaryTotalAmount,
      },
    });
  };

  const pagedExpenses = useMemo(() => {
    if (expenses.length > pageSize) {
      const start = (currentPage - 1) * pageSize;
      return expenses.slice(start, start + pageSize);
    }
    return expenses;
  }, [expenses, currentPage, pageSize]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[220px] flex-1">
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

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          {/* Categories Master Management Button */}
          <Button
            variant="secondary"
            size="md"
            className="flex-1 sm:flex-initial justify-center"
            onClick={() => {
              fetchCategories();
              setIsCategoryModalOpen(true);
            }}
            icon={<Layers className="w-4 h-4 text-[#33077C]" />}
          >
            <span>Categories</span>
            {categories.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#33077C]/10 text-[#33077C]">
                {categories.length}
              </span>
            )}
          </Button>

          {/* Print Report Button */}
          <Button
            variant="secondary"
            size="md"
            className="flex-1 sm:flex-initial justify-center"
            onClick={handlePrintTableReport}
            icon={<Printer className="w-4 h-4 text-[#33077C]" />}
          >
            Print Report
          </Button>

          {/* Export to Excel */}
          <Button
            variant="secondary"
            size="md"
            className="flex-1 sm:flex-initial justify-center"
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
            className="flex-1 sm:flex-initial justify-center"
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
              {apiSummary?.categoryCount ?? (categories.length > 0 ? categories.length : new Set(expenses.map((e) => e.category).filter(Boolean)).size || 0)}
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
          const trimmed = pendingSearch.trim();
          const isSame =
            appliedSearch === trimmed &&
            appliedPeriod === pendingPeriod &&
            appliedCategory === pendingCategory &&
            appliedPaymentMode === pendingPaymentMode &&
            currentPage === 1;

          setAppliedSearch(trimmed);
          setAppliedPeriod(pendingPeriod);
          setAppliedCategory(pendingCategory);
          setAppliedPaymentMode(pendingPaymentMode);
          setCurrentPage(1);

          if (isSame) {
            fetchExpenses(true);
          }
        }}
        onReset={() => {
          isFetchingRef.current = false;
          lastFetchKeyRef.current = null;
          setPendingSearch('');
          setAppliedSearch('');
          setPendingPeriod('All Expenses');
          setAppliedPeriod('All Expenses');
          setPendingCategory('All');
          setAppliedCategory('All');
          setPendingPaymentMode('All');
          setAppliedPaymentMode('All');
          setCurrentPage(1);
          fetchExpenses(true, {
            search: '',
            period: 'All Expenses',
            category: 'All',
            paymentMode: 'All',
            page: 1,
          });
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
                  if (val === 'Custom') {
                    setIsCustomDateModalOpen(true);
                  }
                }}
                options={PERIOD_FILTER_OPTIONS}
              />
            </div>

            {/* Filter by Live Category */}
            <div
              className="shrink-0"
              onClick={() => {
                if (categories.length === 0 && !isCategoriesLoading) {
                  fetchCategories();
                }
              }}
              onMouseEnter={() => {
                if (categories.length === 0 && !isCategoriesLoading) {
                  fetchCategories();
                }
              }}
            >
              <FilterDropdown
                placeholder="Category : All"
                value={pendingCategory}
                onChange={(val) => {
                  setPendingCategory(val);
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
            <CommonTableHead
                columns={[
                  { label: "EXPENSE NO", align: "left", minWidth: "140px" },
                  { label: "DATE", align: "left", minWidth: "120px" },
                  { label: "CATEGORY", align: "left", minWidth: "140px" },
                  { label: "EXPENSE TITLE / PAYEE", align: "left", minWidth: "180px" },
                  { label: "PAYMENT MODE", align: "center", minWidth: "130px" },
                  { label: "REFERENCE / BILL", align: "left", minWidth: "150px" },
                  { label: "TAX AMOUNT", align: "right", minWidth: "120px" },
                  { label: "TOTAL AMOUNT", align: "right", minWidth: "130px" },
                  { label: "STATUS", align: "center", minWidth: "110px" },
                  { label: "ACTION", align: "center", minWidth: "120px" },
                ]}
              />
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
                pagedExpenses.map((exp) => (
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{exp.referenceNo || '—'}</span>
                        <button
                          type="button"
                          title="View attached bill / receipt"
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                            exp.receiptImage
                              ? 'bg-purple-50 text-[#4309A2] hover:bg-purple-100 border border-purple-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenBillModal(exp);
                          }}
                        >
                          <Receipt className="w-3 h-3" />
                          <span>View Bill</span>
                        </button>
                      </div>
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

                        

                        {/* 3-dots Actions Dropdown */}
                        <SaleActionDropdown
                          items={[
                            {
                              label: 'View/Edit',
                              variant: 'edit',
                              onClick: () => handleOpenEditModal(exp),
                            },
                            {
                              label: 'Print Expense Voucher',
                              variant: 'print',
                              onClick: () => handlePrintExpense(exp),
                            },
                            {
                              label: 'Download Voucher',
                              variant: 'download',
                              onClick: () => handleDownloadExpense(exp),
                            },
                            {
                              label: 'Preview',
                              variant: 'preview',
                              onClick: () => handleOpenDetailModal(exp),
                            },
                            {
                              label: 'View Attached Bill',
                              variant: 'preview',
                              onClick: () => handleOpenBillModal(exp),
                            },
                            {
                              label: 'Duplicate',
                              variant: 'duplicate',
                              onClick: () => handleDuplicateExpense(exp),
                            },
                            {
                              label: 'Delete',
                              variant: 'delete',
                              danger: true,
                              dividerBefore: true,
                              onClick: () => handleOpenDeleteModal(exp),
                            },
                          ]}
                        />
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
              <FormError message={errors.categoryId?.message || errors.category?.message} />
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
                  min="0.01"
                  placeholder="0.00"
                  {...register('amount')}
                  onKeyDown={handleNonNegativeKeyDown}
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
                  <a
                    href={receiptImageState}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 cursor-pointer hover:opacity-80"
                    title="Click to view full receipt"
                  >
                    <img
                      src={receiptImageState}
                      alt="Receipt"
                      className="w-7 h-7 rounded-lg object-cover border border-slate-200"
                    />
                  </a>
                  <span className="text-xs sm:text-[13px] text-slate-700 font-medium truncate flex-1">
                    Receipt Attached
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptImageState('');
                      setValue('receiptImage', '', { shouldValidate: true, shouldDirty: true });
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
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg,.avif"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
              <FormError message={receiptError || (isSubmitted ? receiptFileProblem : null) || undefined} />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Expense Date</span>
                <span className="font-bold text-slate-800">
                  {formatDate(selectedExpense.expenseDate)}
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
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Attached Receipt</span>
                  <a
                    href={selectedExpense.receiptImage}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#4309A2] hover:underline font-semibold"
                  >
                    Open in new tab
                  </a>
                </div>
                <a
                  href={selectedExpense.receiptImage}
                  target="_blank"
                  rel="noreferrer"
                  className="block cursor-pointer hover:opacity-95"
                  title="Click to open receipt in new tab"
                >
                  <img
                    src={selectedExpense.receiptImage}
                    alt="Receipt"
                    className="w-full max-h-56 object-contain rounded-lg border border-slate-200 bg-white"
                  />
                </a>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
              <span>Created: {formatDate(selectedExpense.createdAt)}</span>
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
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="h-8.5 px-4 rounded-lg border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintExpense(selectedExpense)}
                  className="h-8.5 px-4 rounded-lg bg-[#33077C] hover:bg-[#26055d] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Expense Voucher</span>
                </button>
                <button
                  type="button"
                  disabled={isDownloadingExpense}
                  onClick={() => handleDownloadExpense(selectedExpense)}
                  className="h-8.5 px-4 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isDownloadingExpense ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{isDownloadingExpense ? 'Generating...' : 'Download Voucher'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* DEDICATED ATTACHED BILL VIEWER MODAL */}
      <Modal
        isOpen={isBillModalOpen}
        onClose={() => {
          setIsBillModalOpen(false);
          setSelectedBillExpense(null);
        }}
        title={`Attached Bill & Receipts`}
        subtitle={selectedBillExpense ? `${selectedBillExpense.expenseNo} • ${selectedBillExpense.title} • ₹${selectedBillExpense.totalAmount.toLocaleString('en-IN')}` : 'Expense Bill Viewer'}
        maxWidth="3xl"
        headerGradient={true}
      >
        {selectedBillExpense && (
          <div className="space-y-4 p-2 sm:p-4">
            {/* Meta summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Expense No</span>
                <span className="font-bold text-[#33077C]">{selectedBillExpense.expenseNo}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Category</span>
                <span className="font-semibold text-slate-700">{selectedBillExpense.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Payee / Vendor</span>
                <span className="font-semibold text-slate-700">{selectedBillExpense.payee}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Total Amount</span>
                <span className="font-bold text-[#33077C]">₹{selectedBillExpense.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Bill / Receipt content */}
            {isLoadingBillReceipt ? (
              <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Loader2 className="w-8 h-8 text-[#33077C] animate-spin mb-2" />
                <p className="text-xs font-semibold text-slate-600">Retrieving attached bill document...</p>
              </div>
            ) : selectedBillExpense.receiptImage ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-[#33077C]" />
                    <span>Attached Document / Receipt</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={selectedBillExpense.receiptImage}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#4309A2] hover:text-[#33077C] bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in New Tab</span>
                    </a>
                    <a
                      href={selectedBillExpense.receiptImage}
                      download={`Bill_${selectedBillExpense.expenseNo || 'receipt'}.png`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center min-h-[260px] max-h-[500px] overflow-auto">
                  {selectedBillExpense.receiptImage.includes('application/pdf') || selectedBillExpense.receiptImage.endsWith('.pdf') ? (
                    <iframe
                      src={selectedBillExpense.receiptImage}
                      title="Attached Bill PDF"
                      className="w-full h-[450px] rounded-lg border border-slate-200 bg-white"
                    />
                  ) : failedBillImageSrc === selectedBillExpense.receiptImage ? (
                    <div className="text-center space-y-2 p-6">
                      <Receipt className="w-10 h-10 text-slate-300 mx-auto stroke-[1.5]" />
                      <p className="text-sm font-bold text-slate-700">Could not load the attached bill</p>
                      <p className="text-xs text-slate-500 max-w-sm break-all">
                        The file link is broken or not accessible. Try "Open in New Tab", or re-upload the bill by editing this expense.
                      </p>
                    </div>
                  ) : (
                    <img
                      src={selectedBillExpense.receiptImage}
                      alt={`Receipt for ${selectedBillExpense.expenseNo}`}
                      onError={() => {
                        console.warn('Expense bill failed to load:', selectedBillExpense.receiptImage);
                        setFailedBillImageSrc(selectedBillExpense.receiptImage || null);
                      }}
                      className="max-h-[460px] max-w-full object-contain rounded-lg shadow-sm border border-slate-200 bg-white"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-3">
                <Receipt className="w-12 h-12 text-slate-300 stroke-[1.5]" />
                <div>
                  <h4 className="text-sm font-bold text-slate-700">No Bill Attached</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    No receipt or bill document was attached when recording this expense. You can attach one by editing this expense.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsBillModalOpen(false);
                    handleOpenEditModal(selectedBillExpense);
                  }}
                  icon={<Upload className="w-3.5 h-3.5" />}
                >
                  Upload &amp; Attach Bill Now
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">Reference: {selectedBillExpense.referenceNo || 'None'}</span>
              <button
                type="button"
                onClick={() => {
                  setIsBillModalOpen(false);
                  setSelectedBillExpense(null);
                }}
                className="h-8.5 px-4 rounded-lg border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center shadow-2xs"
              >
                Close
              </button>
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
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                  }}
                  className={FORM_INPUT_CLS}
                />
                <FormError message={newCategoryError || undefined} />
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
                          onChange={(e) => {
                            setEditCategoryName(e.target.value);
                          }}
                          className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 bg-white"
                        />
                        {editCategoryError && <FormError message={editCategoryError} />}
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
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#33077C]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#33077C]"
              />
              <FormError message={customDateError || undefined} />
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingExpense) {
            setIsDeleteModalOpen(false);
            setDeleteTargetExpense(null);
            setDeleteExpenseError(null);
          }
        }}
        onConfirm={handleConfirmDeleteExpense}
        entityName="Expense"
        recordName={deleteTargetExpense?.expenseNo}
        isLoading={isDeletingExpense}
        error={deleteExpenseError}
      />
    </div>
  );
};
