import { HistoryTimelineView } from "../../../components/common/HistoryTimelineView";
import { CommonTableHead } from '../../../components/common/CommonTableHead';
import { SupplierSearchableSelect } from '../../../components/common/paginated-select';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PaymentOutSchema, PaymentOutFormData } from '../../../validations';
import { FormError } from '../../../components/common/FormError';
import {
  checkRequiredSelection,
  checkRequiredDate,
  checkDateNotBefore,
  checkMoney,
  checkPaymentWithinBalance,
  collectErrors,
  extractApiFieldErrors,
  getApiErrorMessage,
  useSubmitGuard,
  useFieldErrors,
  useRevalidateAfterSubmit,
} from '../../../utils/formValidation';
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
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Download,
} from 'lucide-react';
import {
  PaymentOut,
  PaymentOutMode,
  PurchaseOrder,
} from '../../../store/useSalesManagementStore';
import {
  workPaymentOutApi,
  mapApiPaymentOutToUi,
  mapUiToCreatePaymentOutPayload,
  mapUiToUpdatePaymentOutPayload,
  supplierApi,
  ApiSupplier,
  workPurchaseOrderApi,
  mapApiPurchaseOrderToUi,
  UUID_REGEX,
} from '../../../api';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { DeleteConfirmationModal } from '../../../components/common/DeleteConfirmationModal';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { exportTableToExcel } from '../../../utils/excelExport';
import { UniversalShareDropdown, formatPaymentOutShare } from '../../../utils/shareUtils';
import { printBusinessDocument, printTableReport, downloadBusinessDocument, DocumentPrintOptions } from '../../../utils/printUtils';
import { FormLabel, FORM_INPUT_CLS, FORM_INPUT_ERROR_CLS, FORM_SELECT_CLS, getFormInputCls, handleNonNegativeKeyDown } from '../utils/formUtils';
import { SaleActionDropdown } from '../utils';
import { toast } from "../../../utils/toast";
import { getNextPaymentOutNumber } from '../../../utils/documentNumbering';

import { formatDate } from '../utils/dateUtils';
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
  // Live Work Payments Out API State
  const [livePayments, setLivePayments] = useState<PaymentOut[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [apiSummary, setApiSummary] = useState<NonNullable<import("../../../api/work/paymentOutTypes").PaymentOutListResponse["summary"]> | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Registered Suppliers & Purchase Orders for form dropdowns
  const [availableSuppliers, setAvailableSuppliers] = useState<ApiSupplier[]>([]);
  const [availablePurchases, setAvailablePurchases] = useState<PurchaseOrder[]>([]);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingPeriod, setPendingPeriod] = useState('All Payment-Out Invoices');
  const [appliedPeriod, setAppliedPeriod] = useState('All Payment-Out Invoices');
  const [pendingStatus, setPendingStatus] = useState('All');
  const [appliedStatus, setAppliedStatus] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState(false);
  const [pendingPaymentMode, setPendingPaymentMode] = useState('All');
  const [appliedPaymentMode, setAppliedPaymentMode] = useState('All');
  const [pendingSupplier, setPendingSupplier] = useState('All');
  const [appliedSupplier, setAppliedSupplier] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const periodDropdownRef = useRef<HTMLDivElement>(null);

  // Deduplication & Sync Refs (prevents multiple redundant API calls)
  const isFetchingRef = useRef(false);
  const lastFetchKeyRef = useRef('');

  // On-demand loader for registered suppliers & purchases (loaded only when opening form modals)
  const hasLoadedFormMasterDataRef = useRef(false);
  const isLoadingFormMasterDataRef = useRef(false);

  const loadFormMasterData = useCallback(async () => {
    if (hasLoadedFormMasterDataRef.current || isLoadingFormMasterDataRef.current) return;
    isLoadingFormMasterDataRef.current = true;

    try {
      const [suppliersRes, posRes] = await Promise.allSettled([
        supplierApi.getSuppliers({ page_size: 100, pagination_required: false }),
        workPurchaseOrderApi.getPurchaseOrders({ limit: 100, pagination_required: false }),
      ]);

      if (suppliersRes.status === 'fulfilled' && suppliersRes.value?.data && Array.isArray(suppliersRes.value.data)) {
        setAvailableSuppliers(suppliersRes.value.data);
      }
      if (posRes.status === 'fulfilled' && posRes.value?.data && Array.isArray(posRes.value.data)) {
        setAvailablePurchases(posRes.value.data.map(mapApiPurchaseOrderToUi));
      }
      hasLoadedFormMasterDataRef.current = true;
    } catch {
      // ignore
    } finally {
      isLoadingFormMasterDataRef.current = false;
    }
  }, []);


  // Suppliers list (API only)
  const mergedSuppliers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; supplierCode?: string; payable?: number }>();
    availableSuppliers.forEach((s) => {
      map.set(s.id, {
        id: s.id,
        name: s.name,
        supplierCode: s.supplierCode,
        payable: Number(s.payable ?? (s as any).payableAmount ?? 0),
      });
    });
    return Array.from(map.values());
  }, [availableSuppliers]);

  // Purchases list (API only)
  const mergedPurchases = useMemo(() => {
    const map = new Map<string, PurchaseOrder>();
    availablePurchases.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [availablePurchases]);

  // Fetch Payments Out from Work API with deduplication
  const fetchPaymentsOut = useCallback(
    async (
      forceRefresh = false,
      overrides?: {
        search?: string;
        status?: string;
        page?: number;
      }
    ) => {
      const targetPage = overrides?.page ?? currentPage;
      const targetSearch = overrides?.search !== undefined ? overrides.search : appliedSearch;
      const targetStatus = overrides?.status !== undefined ? overrides.status : appliedStatus;
      const fetchKey = `${targetPage}_${pageSize}_${targetSearch.trim()}_${targetStatus}`;
      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;
      setIsApiLoading(true);

      try {
        const statusParam = targetStatus !== 'All' ? targetStatus : undefined;
        const response = await workPaymentOutApi.getPaymentsOut({
          page: targetPage,
          limit: pageSize,
          search: targetSearch.trim() || undefined,
          status: statusParam,
          pagination_required: true,
        });

        if (response && response.success && Array.isArray(response.data)) {
          const mapped = response.data.map(mapApiPaymentOutToUi);
          setLivePayments(mapped);
          setIsApiConnected(true);
          setApiErrorMessage(null);

          setApiSummary(response.summary ?? null);
          if (response.pagination) {
            setTotalApiRecords(response.pagination.totalRecords);
            setTotalApiPages(response.pagination.totalPages);
          } else {
            setTotalApiRecords(mapped.length);
            setTotalApiPages(Math.ceil(mapped.length / pageSize) || 1);
          }
        } else {
          setIsApiConnected(true);
          setLivePayments([]);
          setTotalApiRecords(0);
          setTotalApiPages(1);
        }
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load payments out from the API';
        console.warn('Work Payments Out API unavailable:', errMsg);
        setIsApiConnected(false);
        setApiErrorMessage(errMsg);
        setLivePayments([]);
        setTotalApiRecords(null);
        setTotalApiPages(null);
      } finally {
        isFetchingRef.current = false;
        setIsApiLoading(false);
      }
    },
    [currentPage, pageSize, appliedSearch, appliedStatus]
  );

  // Initial and reactive fetch on filter change
  useEffect(() => {
    fetchPaymentsOut();
  }, [fetchPaymentsOut]);


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
  const [sharePos, setSharePos] = useState<{ top?: number; bottom?: number; right?: number } | null>(null);

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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentOut | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetPayment, setDeleteTargetPayment] = useState<PaymentOut | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  const [deletePaymentError, setDeletePaymentError] = useState<string | null>(null);
  const [isDownloadingPayment, setIsDownloadingPayment] = useState(false);

  // Only load registered suppliers & purchases on demand when the form modal opens
  useEffect(() => {
    if (isFormModalOpen) {
      loadFormMasterData();
    }
  }, [isFormModalOpen, loadFormMasterData]);

  // Open History Modal with live API sync
  const handleOpenHistory = async (po: PaymentOut) => {
    setActiveDropdownId(null);
    setSelectedPayment(po);
    setIsHistoryModalOpen(true);

    if (po.id) {
      setIsLoadingHistory(true);
      try {
        const res = await workPaymentOutApi.getPaymentOutById(po.id);
        if (res && res.data) {
          const livePayment = mapApiPaymentOutToUi(res.data);
          setSelectedPayment(livePayment);
        }
      } catch (err) {
        console.warn('Could not fetch latest payment voucher audit data from API:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    }
  };

  const { runOnce: runSaveOnce } = useSubmitGuard();
  const { runOnce: runDeleteOnce } = useSubmitGuard();
  const [receiptError, setReceiptError] = useState<string | null>(null);
  // Invalid receipt file picked: kept silently until the form is submitted, then shown inline.
  const [receiptFileProblem, setReceiptFileProblem] = useState<string | null>(null);
  const dateFe = useFieldErrors();
  const customDateError = dateFe.errors.range ?? null;

  // Open Edit Payment Modal
  const {
    register,
    setError,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    clearErrors,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<PaymentOutFormData>({
    // Shared zod schema + friendly local rules layered on top.
    resolver: (async (values: any, ctx: any, opts: any) => {
      const base: any = await (zodResolver(PaymentOutSchema) as any)(values, ctx, opts);
      // Includes the supplier-record and outstanding-balance rules so they clear as soon as they pass.
      const extra = evaluatePayment(values).recheck;
      const errs: any = { ...(base.errors || {}) };
      for (const k of ['supplierId', 'paymentDate', 'amount', 'paymentMode']) {
        if (extra[k]) errs[k] = { type: 'validate', message: extra[k] };
        else delete errs[k];
      }
      if (Object.keys(errs).length === 0) return { values: base.values ?? values, errors: {} };
      return { values: {}, errors: errs };
    }) as any,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      paymentNo: '',
      paymentDate: new Date().toISOString().split('T')[0],
      supplierId: '',
      purchaseId: '',
      amount: '',
      paymentMode: 'Bank Transfer',
      referenceNo: '',
      receiptImage: '',
      notes: '',
    },
  });

  // Every open/close of the payment form starts with no errors.
  useEffect(() => {
    clearErrors();
    setReceiptError(null);
    setReceiptFileProblem(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormModalOpen]);

  const watchSupplierId = watch('supplierId');
  const watchPurchaseId = watch('purchaseId');
  const watchReceiptImage = watch('receiptImage');

  // Active pool of records: only the payment vouchers returned by the API
  const activePool = livePayments;

  // Computed next preview number based on currently loaded payment vouchers
  const computedPreviewNo = useMemo(() => {
    return getNextPaymentOutNumber(livePayments);
  }, [livePayments]);

  // Open Edit Payment Modal (Cancelled payments cannot be edited as per Swagger docs)
  // Open detail view with fresh data (GET /payments-out/:id)
  const openPaymentDetail = async (listPo: PaymentOut) => {
    setSelectedPayment(listPo);
    setIsDetailModalOpen(true);
    try {
      const res = await workPaymentOutApi.getPaymentOutById(listPo.id);
      if (res?.data) {
        const fresh = mapApiPaymentOutToUi(res.data);
        setSelectedPayment((prev) => (prev && prev.id === listPo.id ? { ...prev, ...fresh } : prev));
      }
    } catch (err) {
      console.warn('Could not fetch payment details:', err);
    }
  };

  const handleOpenEditModal = (po: PaymentOut) => {
    setReceiptError(null);
    loadFormMasterData();
    if (po.status === 'Cancelled') {
      toast.error('Cancelled payments cannot be edited.');
      return;
    }
    setEditingPaymentId(po.id);
    reset({
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
    loadFormMasterData();
    setEditingPaymentId(null);
    const nextNo = ''; // server generates the payment number on save
    reset({
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
    if (!watchSupplierId) return [];
    const supObj = mergedSuppliers.find((s) => s.id === watchSupplierId);
    return mergedPurchases.filter(
      (p) =>
        (p.supplierId === watchSupplierId || (supObj && p.supplierName?.toLowerCase() === supObj.name.toLowerCase())) &&
        (p.id === watchPurchaseId || p.paymentStatus === 'Unpaid' || p.paymentStatus === 'Partial' || p.balance > 0)
    );
  }, [mergedPurchases, watchSupplierId, watchPurchaseId, mergedSuppliers]);

  // Open Create Payment Modal
  const handleOpenCreateModal = () => {
    setReceiptError(null);
    loadFormMasterData();
    setEditingPaymentId(null);
    const nextNo = ''; // server generates the payment number on save
    reset({
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
    setValue('purchaseId', poId);
    const po = mergedPurchases.find((p) => p.id === poId);
    if (po) {
      setValue('amount', po.balance > 0 ? po.balance : po.grandTotal);
    }
  };

  // Pure rule evaluation shared by the form resolver and the submit handler.
  const evaluatePayment = (data: any) => {
    const numAmount = Number(data.amount);
    const recheck = collectErrors([
      ['supplierId', checkRequiredSelection(data.supplierId, 'supplier')],
      ['paymentDate', checkRequiredDate(data.paymentDate, 'payment date')],
      ['amount', checkMoney(data.amount, 'payment amount')],
      ['paymentMode', checkRequiredSelection(data.paymentMode, 'payment mode')],
    ]);

    // Resolve supplier: must be a real supplier record (no silent substitution of another supplier).
    let supId = data.supplierId;
    let supplierObj = mergedSuppliers.find((s) => s.id === supId);
    if (!supplierObj) {
      supplierObj = mergedSuppliers.find((s) => s.name.toLowerCase() === (supId || '').toLowerCase());
      if (supplierObj) supId = supplierObj.id;
    }
    if (!recheck.supplierId && !UUID_REGEX.test(supId)) {
      const foundSup = availableSuppliers.find((s) => s.id === supId || s.name === supplierObj?.name);
      if (foundSup && UUID_REGEX.test(foundSup.id)) {
        supId = foundSup.id;
      } else {
        recheck.supplierId = 'Please choose the supplier from the list.';
      }
    }

    const purchaseObj = mergedPurchases.find((p) => p.id === data.purchaseId);
    if (!recheck.amount && purchaseObj && purchaseObj.balance > 0) {
      const editedOriginal = editingPaymentId ? activePool.find((p) => p.id === editingPaymentId) : null;
      // When editing a payment against the same bill, its own earlier amount is part of what can be re-allocated.
      const allowance =
        editedOriginal && editedOriginal.purchaseId === data.purchaseId ? Number(editedOriginal.amount) || 0 : 0;
      const balErr = editingPaymentId && !allowance
        ? null
        : checkPaymentWithinBalance(numAmount, purchaseObj.balance + allowance);
      if (balErr) recheck.amount = balErr;
    }

    return { recheck, numAmount, supId, supplierObj, purchaseObj };
  };

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

  // Submit Payment (Create or Edit)
  const onSubmitPayment = (data: PaymentOutFormData) => {
    // An invalid receipt file blocks the save (shown inline together with the other errors).
    if (receiptFileProblem) return;
    return runSaveOnce(() => submitPaymentInner(data));
  };
  const submitPaymentInner = async (data: PaymentOutFormData) => {
    // Safety net: the resolver already blocked invalid values, so no request is sent when anything is invalid.
    const { recheck, numAmount, supId, supplierObj, purchaseObj } = evaluatePayment(data);
    const recheckKeys = Object.keys(recheck);
    if (recheckKeys.length > 0) {
      recheckKeys.forEach((k) => setError(k as any, { type: 'validate', message: recheck[k] }));
      return;
    }

    const existing = editingPaymentId ? activePool.find((p) => p.id === editingPaymentId) : null;

    if (existing && existing.status === 'Cancelled') {
      toast.error('Cancelled payments cannot be edited.');
      return;
    }

    setIsSubmittingForm(true);
    try {
      if (editingPaymentId) {
        // PUT /work/payments-out/:id
        const updatePayload = mapUiToUpdatePaymentOutPayload({
          paymentType: data.paymentMode,
          paymentMode: data.paymentMode,
          amount: numAmount,
          referenceNo: data.referenceNo,
          notes: data.notes,
        });

        const res = await workPaymentOutApi.updatePaymentOut(editingPaymentId, updatePayload);
        if (!res?.data) {
          throw new Error((res as any)?.error?.message || 'Failed to update payment voucher');
        }
        const updatedItem = mapApiPaymentOutToUi(res.data);
        if (data.purchaseId) {
          updatedItem.purchaseId = data.purchaseId;
          updatedItem.purchaseNo = purchaseObj?.purchaseNo;
        }
        if (data.receiptImage) {
          updatedItem.receiptImage = data.receiptImage;
        }
        if (supplierObj?.name && (!updatedItem.supplierName || updatedItem.supplierName === 'Unknown Supplier')) {
          updatedItem.supplierName = supplierObj.name;
        }

        // The bill balance used for the amount limit must be re-read from the API next time
        hasLoadedFormMasterDataRef.current = false;
        setLivePayments((prev) => prev.map((p) => (p.id === editingPaymentId ? updatedItem : p)));
        toast.success(`Payment voucher ${updatedItem.paymentNo} updated successfully!`);
      } else {
        // POST /work/payments-out
        const createPayload = mapUiToCreatePaymentOutPayload({
          supplierId: supId,
          purchaseOrderId: data.purchaseId,
          paymentType: data.paymentMode,
          paymentMode: data.paymentMode,
          amount: numAmount,
          referenceNo: data.referenceNo,
          notes: data.notes,
        });

        const res = await workPaymentOutApi.createPaymentOut(createPayload);
        if (!res?.data) {
          throw new Error((res as any)?.error?.message || 'Failed to record payment voucher');
        }
        const createdItem = mapApiPaymentOutToUi(res.data);
        if (data.purchaseId) {
          createdItem.purchaseId = data.purchaseId;
          createdItem.purchaseNo = purchaseObj?.purchaseNo;
        }
        if (data.receiptImage) {
          createdItem.receiptImage = data.receiptImage;
        }
        if (supplierObj?.name && (!createdItem.supplierName || createdItem.supplierName === 'Unknown Supplier')) {
          createdItem.supplierName = supplierObj.name;
        }

        hasLoadedFormMasterDataRef.current = false;
        setLivePayments((prev) => [createdItem, ...prev]);
        toast.success(`Payment ${createdItem.paymentNo} recorded successfully!`);
      }

        setEditingPaymentId(null);
        setIsFormModalOpen(false);
        fetchPaymentsOut(true);
      } catch (err: any) {
        // Keep the modal open and the entered values; show backend field errors inline.
        const apiFields = extractApiFieldErrors(err);
        const fieldMap: Record<string, string> = {
          supplierId: 'supplierId', amount: 'amount', paymentMode: 'paymentMode', referenceNo: 'referenceNo',
          notes: 'notes', purchaseOrderId: 'purchaseId', paymentDate: 'paymentDate',
        };
        let mapped = false;
        for (const [k, m] of Object.entries(apiFields)) {
          if (fieldMap[k]) {
            setError(fieldMap[k] as any, { type: 'server', message: m });
            mapped = true;
          }
        }
        if (!mapped) toast.error(getApiErrorMessage(err, 'Failed to save payment voucher. Your entries have been kept; please try again.'));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Delete / Cancel Payment (voids voucher as Cancelled as per Work API) with confirmation modal
  const handleOpenDeleteModal = (po: PaymentOut) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    if (po.status === 'Cancelled') {
      toast.info(`Payment voucher ${po.paymentNo} is already cancelled.`);
      return;
    }
    setDeleteTargetPayment(po);
    setDeletePaymentError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeletePayment = () => runDeleteOnce(confirmDeletePaymentInner);
  const confirmDeletePaymentInner = async () => {
    if (!deleteTargetPayment) return;
    setIsDeletingPayment(true);
    setDeletePaymentError(null);
    try {
      await workPaymentOutApi.deletePaymentOut(deleteTargetPayment.id);
      hasLoadedFormMasterDataRef.current = false;
      setLivePayments((prev) =>
        prev.map((p) => (p.id === deleteTargetPayment.id ? { ...p, status: 'Cancelled' } : p))
      );
      toast.success(`Payment voucher "${deleteTargetPayment.paymentNo}" cancelled successfully.`);
      setIsDeleteModalOpen(false);
      setDeleteTargetPayment(null);
      fetchPaymentsOut(true);
    } catch (err: any) {
      console.error('API cancel failed:', err);
      const errMsg = getApiErrorMessage(err, 'Failed to cancel payment voucher');
      setDeletePaymentError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeletingPayment(false);
    }
  };

  // Filtered List based on Search, Period & Date Ranges, Payment Mode, Status
  const filteredPayments = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return activePool.filter((p) => {
      // 1. Search Query (Client fallback if API search not applied)
      if (!isApiConnected && appliedSearch.trim()) {
        const q = appliedSearch.toLowerCase().trim();
        const matchesSearch =
          p.paymentNo.toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q) ||
          (p.purchaseNo && p.purchaseNo.toLowerCase().includes(q)) ||
          (p.referenceNo && p.referenceNo.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // 2. Status Filter
      if (appliedStatus !== 'All') {
        if (p.status?.toLowerCase() !== appliedStatus.toLowerCase()) return false;
      }

      // 3. Period Filter
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

      if (!matchesPeriod) return false;

      // 4. Payment Mode
      const matchesMode =
        appliedPaymentMode === 'All' ||
        p.paymentMode?.toLowerCase() === appliedPaymentMode.toLowerCase();

      return matchesMode;
    });
  }, [
    activePool,
    isApiConnected,
    appliedSearch,
    appliedStatus,
    appliedPeriod,
    customStartDate,
    customEndDate,
    appliedPaymentMode,
  ]);

  // Paginated records to display on table
  const displayedPayments = useMemo(() => {
    if (
      isApiConnected &&
      totalApiRecords !== null &&
      appliedPeriod === 'All Payment-Out Invoices' &&
      appliedPaymentMode === 'All' &&
      filteredPayments.length <= pageSize
    ) {
      return filteredPayments;
    }
    return filteredPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [
    isApiConnected,
    totalApiRecords,
    appliedPeriod,
    appliedPaymentMode,
    filteredPayments,
    currentPage,
    pageSize,
  ]);

  // Metrics Summary
  const localSummary = useMemo(() => {
    const totalDisbursed = filteredPayments.reduce(
      (acc, p) => acc + (p.status !== 'Cancelled' ? p.amount : 0),
      0
    );
    const today = new Date().toISOString().split('T')[0];
    const todayPaid = filteredPayments
      .filter((p) => p.paymentDate === today && p.status !== 'Cancelled')
      .reduce((acc, p) => acc + p.amount, 0);
    const totalVouchers =
      isApiConnected &&
      totalApiRecords !== null &&
      appliedPeriod === 'All Payment-Out Invoices' &&
      appliedPaymentMode === 'All'
        ? Math.max(totalApiRecords, filteredPayments.length)
        : filteredPayments.length;
    const bankPayments = filteredPayments
      .filter(
        (p) =>
          p.status !== 'Cancelled' &&
          ['Bank Transfer', 'UPI', 'Net Banking', 'Card'].includes(p.paymentMode)
      )
      .reduce((acc, p) => acc + p.amount, 0);
    const cashPayments = filteredPayments
      .filter((p) => p.status !== 'Cancelled' && p.paymentMode === 'Cash')
      .reduce((acc, p) => acc + p.amount, 0);

    return {
      totalDisbursed,
      todayPaid,
      totalVouchers,
      bankPayments,
      cashPayments,
    };
  }, [filteredPayments, isApiConnected, totalApiRecords, appliedPeriod, appliedPaymentMode]);
  const summary = apiSummary ?? localSummary;

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

    const grandDisbursed = excelRows.reduce(
      (acc, row) => acc + (row.status !== 'Cancelled' ? row.amount : 0),
      0
    );

    exportTableToExcel({
      filename: `Payment_Out_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Vendor Payments',
      title: 'YAA CREATIONS CRM - PAYMENT OUT & VENDOR DISBURSEMENTS',
      subtitle: `Total Payments: ${filteredPayments.length} | Generated: ${new Date().toLocaleDateString('en-GB')}`,
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

  // Print & Download Payment-Out Voucher via universal printUtils
  const buildPaymentOutPrintOptions = (po: PaymentOut): DocumentPrintOptions => {
    const matchedSup = mergedSuppliers.find((s) => s.id === po.supplierId || s.name === po.supplierName);

    return {
      docTypeTitle: 'PAYMENT-OUT VOUCHER',
      docNo: po.paymentNo,
      docDate: po.paymentDate,
      status: po.status || 'Completed',
      statusColor: po.status === 'Cancelled' ? 'rose' : po.status === 'Pending' ? 'amber' : 'emerald',
      referenceNo: po.referenceNo,
      partyTitle: 'Paid To (Supplier / Vendor)',
      partyName: po.supplierName,
      partyPhone: (matchedSup as any)?.phone || (matchedSup as any)?.mobile,
      partyEmail: (matchedSup as any)?.email,
      partyAddress: (matchedSup as any)?.billingAddress || (matchedSup as any)?.address,
      partyGstin: (matchedSup as any)?.gstNumber,
      extraMeta: [
        { label: 'Payment Mode', value: po.paymentMode },
        { label: 'Against Bill #', value: po.purchaseNo || 'Direct / Advance Payment' },
        ...(po.referenceNo ? [{ label: 'UTR / Ref No', value: po.referenceNo }] : []),
      ],
      columns: [
        { header: 'Disbursement Details', width: '50%' },
        { header: 'Payment Mode', align: 'center', width: '25%' },
        { header: 'Disbursed Amount (₹)', align: 'right', width: '25%' },
      ],
      items: [
        {
          name: `Vendor payment to ${po.supplierName}${po.purchaseNo ? ` against Purchase Order ${po.purchaseNo}` : ' (Direct / On Account)'}`,
          remarks: `Mode: ${po.paymentMode}${po.referenceNo ? ` | Ref/UTR: ${po.referenceNo}` : ''}`,
          quantity: 1,
          unitPrice: Number(po.amount || 0),
          total: Number(po.amount || 0),
        },
      ],
      subtotal: Number(po.amount || 0),
      grandTotal: Number(po.amount || 0),
      paidAmount: Number(po.amount || 0),
      balance: 0,
      paidAmountLabel: 'Amount Disbursed',
      balanceLabel: 'Balance',
      notes: po.notes || 'Vendor disbursement processed and verified.',
    };
  };

  const handlePrintPaymentOut = (po: PaymentOut) => {
    printBusinessDocument(buildPaymentOutPrintOptions(po));
  };

  const handleDownloadPaymentOut = async (po: PaymentOut) => {
    if (isDownloadingPayment) return;
    setIsDownloadingPayment(true);
    const filename = `PaymentVoucher_${(po.paymentNo || 'voucher').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    try {
      await downloadBusinessDocument(buildPaymentOutPrintOptions(po), filename);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      console.error('Failed to download payment voucher PDF:', err);
      toast.error('Failed to download payment voucher PDF. Please try again.');
    } finally {
      setIsDownloadingPayment(false);
    }
  };

  // Print Table Report for Payment Out
  const handlePrintTableReport = () => {
    if (filteredPayments.length === 0) {
      toast.info('No payment vouchers available to print.');
      return;
    }

    const printRows = filteredPayments.map((p) => ({
      paymentNo: p.paymentNo,
      paymentDate: p.paymentDate,
      supplierName: p.supplierName,
      purchaseNo: p.purchaseNo || 'Direct / Advance',
      paymentMode: p.paymentMode,
      referenceNo: p.referenceNo || '—',
      status: p.status,
      amount: Number(p.amount || 0),
    }));

    const grandDisbursed = printRows.reduce(
      (acc, row) => acc + (row.status !== 'Cancelled' ? row.amount : 0),
      0
    );

    printTableReport({
      title: 'Payment-Out & Vendor Disbursements Report',
      subtitle: `Total Payments: ${filteredPayments.length} | Period: ${appliedPeriod} | Mode: ${appliedPaymentMode}`,
      columns: [
        { header: 'Voucher #', key: 'paymentNo', width: '15%' },
        { header: 'Date', key: 'paymentDate', width: '12%' },
        { header: 'Supplier Name', key: 'supplierName', width: '24%' },
        { header: 'Bill Ref #', key: 'purchaseNo', width: '15%' },
        { header: 'Mode', key: 'paymentMode', align: 'center', width: '12%' },
        { header: 'Status', key: 'status', align: 'center', width: '10%' },
        { header: 'Disbursed (₹)', key: 'amount', align: 'right', type: 'currency', width: '12%' },
      ],
      data: printRows,
      metrics: [
        { label: 'Total Paid Out', value: summary.totalDisbursed },
        { label: 'Today Paid', value: summary.todayPaid },
        { label: 'Total Vouchers', value: filteredPayments.length },
      ],
      summaryRow: {
        paymentNo: 'Total',
        amount: grandDisbursed,
      },
    });
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[220px] flex-1">
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

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            className="flex-1 sm:flex-initial justify-center"
            onClick={handlePrintTableReport}
            icon={<Printer className="w-4 h-4 text-[#33077C]" />}
          >
            Print Report
          </Button>

          <Button
            variant="secondary"
            size="md"
            className="flex-1 sm:flex-initial justify-center"
            onClick={handleExportExcel}
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Excel Report
          </Button>

          <Button
            variant="primary"
            size="md"
            className="flex-1 sm:flex-initial justify-center"
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
          const trimmed = pendingSearch.trim();
          const isSame =
            appliedSearch === trimmed &&
            appliedPeriod === pendingPeriod &&
            appliedPaymentMode === pendingPaymentMode &&
            appliedStatus === pendingStatus &&
            currentPage === 1;

          setAppliedSearch(trimmed);
          setAppliedPeriod(pendingPeriod);
          setAppliedPaymentMode(pendingPaymentMode);
          setAppliedStatus(pendingStatus);
          setCurrentPage(1);

          if (isSame) {
            fetchPaymentsOut(true);
          }
        }}
        onReset={() => {
          isFetchingRef.current = false;
          lastFetchKeyRef.current = null;
          setPendingSearch('');
          setAppliedSearch('');
          setPendingPeriod('All Payment-Out Invoices');
          setAppliedPeriod('All Payment-Out Invoices');
          setPendingPaymentMode('All');
          setAppliedPaymentMode('All');
          setPendingStatus('All');
          setAppliedStatus('All');
          setCurrentPage(1);
          fetchPaymentsOut(true, {
            search: '',
            status: 'All',
            page: 1,
          });
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
                  if (val === 'Custom') {
                    setIsCustomDateModalOpen(true);
                  }
                }}
                options={PERIOD_FILTER_OPTIONS}
              />
            </div>

            {/* Filter by Status */}
            <div className="shrink-0">
              <FilterDropdown
                placeholder="Status : All"
                value={pendingStatus}
                onChange={(val) => {
                  setPendingStatus(val);
                }}
                options={[
                  { label: 'Status : All', value: 'All' },
                  { label: 'Completed', value: 'Completed' },
                  { label: 'Pending', value: 'Pending' },
                  { label: 'Cancelled', value: 'Cancelled' },
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
              <span className="text-[#33077C] font-bold">{summary.totalVouchers}</span>
            </span>
          </div>
        }
      />

      {/* 4. Table matching 2nd reference image UI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
            <CommonTableHead
                columns={[
                  { label: "VOUCHER NO", align: "left", minWidth: "140px" },
                  { label: "DATE", align: "left", minWidth: "120px" },
                  { label: "SUPPLIER / VENDOR", align: "left", minWidth: "180px" },
                  { label: "AGAINST BILL", align: "center", minWidth: "130px" },
                  { label: "PAYMENT MODE", align: "center", minWidth: "130px" },
                  { label: "REFERENCE / UTR", align: "left", minWidth: "150px" },
                  { label: "AMOUNT PAID", align: "right", minWidth: "130px" },
                  { label: "STATUS", align: "center", minWidth: "110px" },
                  { label: "ACTION", align: "center", minWidth: "130px" },
                ]}
              />
            <tbody className="text-sm">
              {isApiLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 text-[#33077C] animate-spin" />
                    <p className="font-semibold text-slate-600 text-sm">Fetching outward payments from Work API...</p>
                  </td>
                </tr>
              ) : displayedPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">No payment vouchers found</p>
                    <p className="text-xs text-slate-400 mt-1">Record a new payment out when settling supplier dues</p>
                  </td>
                </tr>
              ) : (
                displayedPayments.map((po) => {
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
                        {po.status === 'Cancelled' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Cancelled
                          </span>
                        ) : po.status === 'Pending' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {po.status || 'Completed'}
                          </span>
                        )}
                      </td>

                      {/* 9. Actions */}
                      <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap min-w-[130px] w-36 align-middle">
                        <div className="flex items-center justify-center gap-1.5">

                          {/* Share / Forward Popover */}
                          <UniversalShareDropdown
                            id={po.id}
                            activeShareId={activeShareId}
                            setActiveShareId={setActiveShareId}
                            sharePos={sharePos}
                            setSharePos={setSharePos}
                            getShareData={() => formatPaymentOutShare(po)}
                            title="Share Payment Voucher"
                          />

                          {/* 3-dots Actions Dropdown */}
                          <SaleActionDropdown
                            items={[
                              {
                                label: 'View',
                                variant: 'view',
                                onClick: () => openPaymentDetail(po),
                              },
                              po.status !== 'Cancelled' && {
                                label: 'Edit',
                                variant: 'edit',
                                onClick: () => handleOpenEditModal(po),
                              },
                              {
                                label: 'Duplicate',
                                variant: 'duplicate',
                                onClick: () => handleDuplicatePayment(po),
                              },
                              {
                                label: 'Print Voucher',
                                variant: 'print',
                                onClick: () => handlePrintPaymentOut(po),
                              },
                              {
                                label: 'Download Voucher',
                                variant: 'download',
                                onClick: () => handleDownloadPaymentOut(po),
                              },
                              {
                                label: 'View History',
                                variant: 'view',
                                onClick: () => handleOpenHistory(po),
                              },
                              po.status !== 'Cancelled' && {
                                label: 'Cancel Voucher',
                                variant: 'delete',
                                danger: true,
                                dividerBefore: true,
                                onClick: () => handleOpenDeleteModal(po),
                              },
                            ]}
                          />
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
        totalItems={
          isApiConnected &&
          totalApiRecords !== null &&
          appliedPeriod === 'All Payment-Out Invoices' &&
          appliedPaymentMode === 'All'
            ? totalApiRecords
            : filteredPayments.length
        }
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
        <form noValidate onSubmit={(e) => {
            e.preventDefault();
            if (!dateFe.validateAll(computeDateRangeErrors())) return;
            setAppliedPeriod('Custom');
            setIsCustomDateModalOpen(false);
          }} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Start Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
              }}
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
              onChange={(e) => {
                setCustomEndDate(e.target.value);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#33077C]/20 focus:border-[#33077C]"
            />
            <FormError message={customDateError || undefined} />
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
              type="submit"
              variant="primary"
              size="sm"
            >
              Apply Range
            </Button>
          </div>
        </form>
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
            : (
              <span className="flex items-center gap-1.5 flex-wrap">
                <span>Configure vendor disbursement voucher, payment mode, and settlement details</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {computedPreviewNo}
                </span>
                <span className="text-slate-400 text-[11px]">(Preview only. Final number assigned on save.)</span>
              </span>
            )
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
                const s = mergedSuppliers.find((sup) => sup.id === watchSupplierId);
                const bal = s?.payable || 0;
                return bal.toLocaleString('en-IN', { minimumFractionDigits: 2 });
              })()}
            </span>
          </div>
        }
      >
        <form noValidate onSubmit={handleSubmit(onSubmitPayment)} className="space-y-4.5 p-0.5 sm:p-2">
          {/* Row 1: 3 Fields (Supplier / Vendor, Bill No, Voucher No) */}
          {/* Row 1: 3 Fields (Supplier / Vendor, Bill No, Voucher No) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
            {/* Field 1: Supplier / Vendor */}
            <div>
              <FormLabel required>Supplier / Vendor</FormLabel>
              <Controller
                control={control}
                name="supplierId"
                render={({ field }) => (
                  <SupplierSearchableSelect
                    value={field.value}
                    onChange={(val, sup) => {
                      field.onChange(val);
                      setValue('purchaseId', '');
                      setValue('amount', '');
                      // supplierName not in PaymentOutFormData
                    }}
                    placeholder="Select supplier / vendor"
                    allowNone
                  />
                )}
              />
              <FormError message={errors.supplierId?.message} />
            </div>

            {/* Field 2: Bill No (Dropdown) */}
            <div>
              <FormLabel>Bill No</FormLabel>
              <Controller
                control={control}
                name="purchaseId"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value || ''}
                    onChange={(val) => handlePurchaseSelect(val)}
                    placeholder="Select bill no"
                    allowClear={true}
                    options={supplierPurchases.map((p) => ({
                      value: p.id,
                      label: `${p.purchaseInvoiceNo ? `${p.purchaseInvoiceNo} (${p.purchaseNo})` : p.purchaseNo} — Bal: ₹${p.balance.toLocaleString('en-IN')}`,
                    }))}
                  />
                )}
              />
              <FormError message={errors.purchaseId?.message} />
            </div>

            {/* Field 3: Voucher / Payment No */}
            <div>
              <FormLabel>Voucher / Payment No</FormLabel>
              <input
                type="text"
                readOnly
                value={editingPaymentId ? (watch('paymentNo') || '') : (watch('paymentNo') || computedPreviewNo)}
                className="w-full h-11 px-4 bg-purple-50/70 border border-purple-200/90 rounded-xl text-xs sm:text-[13px] font-extrabold text-[#33077C] font-mono outline-none cursor-default"
                placeholder="Auto-generated on save"
              />
              <FormError message={errors.paymentNo?.message} />
            </div>
          </div>

          {/* Row 2: 3 Fields (Payment Date, Payment Amount, Payment Mode) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
            {/* Field 4: Payment Date */}
            <div>
              <FormLabel required>Payment Date</FormLabel>
              <input
                type="date"
                {...register('paymentDate')}
                className={getFormInputCls(!!errors.paymentDate)}
              />
              <FormError message={errors.paymentDate?.message} />
            </div>

            {/* Field 5: Payment Amount */}
            <div>
              <FormLabel required>Payment Amount (₹)</FormLabel>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  {...register('amount')}
                  onKeyDown={handleNonNegativeKeyDown}
                  className={`${getFormInputCls(!!errors.amount)} pl-8 font-bold text-slate-900`}
                />
              </div>
              <FormError message={errors.amount?.message} />
            </div>

            {/* Field 6: Payment Mode */}
            <div>
              <FormLabel required>Payment Mode</FormLabel>
              <Controller
                control={control}
                name="paymentMode"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value}
                    onChange={(val) => field.onChange(val as PaymentOutMode)}
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
                )}
              />
              <FormError message={errors.paymentMode?.message} />
            </div>
          </div>

          {/* Row 3: 3 Fields (Attach Receipt / Image, Reference no, Notes) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
            {/* Field 7: Attach Receipt / Image */}
            <div>
              <FormLabel>Upload Receipt / Proof</FormLabel>
              {watchReceiptImage ? (
                <div className="flex items-center gap-3 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 shadow-2xs">
                  <img
                    src={watchReceiptImage}
                    alt="Receipt"
                    className="w-7 h-7 rounded-lg object-cover border border-slate-300"
                  />
                  <span className="text-xs sm:text-[13px] text-slate-700 font-medium truncate flex-1">
                    Image Attached
                  </span>
                  <button
                    type="button"
                    onClick={() => setValue('receiptImage', '')}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                    title="Remove Image"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full h-11 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 text-xs sm:text-[13px] font-medium cursor-pointer transition-all bg-white shadow-2xs">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>Upload Image / Receipt</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (!(file.type && file.type.startsWith('image/'))) {
                          setReceiptFileProblem('Please attach an image file for the receipt.');
                          e.target.value = '';
                          return;
                        }
                        setReceiptError(null);
                        setReceiptFileProblem(null);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setValue('receiptImage', reader.result as string);
                          toast.success('Receipt image attached successfully!');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
              <FormError message={receiptError || (isSubmitted ? receiptFileProblem : null) || undefined} />
            </div>

            {/* Field 8: Reference no */}
            <div>
              <FormLabel>Reference no</FormLabel>
              <input
                type="text"
                {...register('referenceNo')}
                className={getFormInputCls(!!errors.referenceNo)}
                placeholder="e.g. UTR-9821892812"
              />
              <FormError message={errors.referenceNo?.message} />
            </div>

            {/* Field 9: Notes */}
            <div>
              <FormLabel>Notes</FormLabel>
              <input
                type="text"
                {...register('notes')}
                className={getFormInputCls(!!errors.notes)}
                placeholder="e.g. Monthly vendor clearance"
              />
              <FormError message={errors.notes?.message} />
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
              disabled={isSubmitting || isSubmittingForm}
              className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting || isSubmittingForm ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>
                {isSubmitting || isSubmittingForm
                  ? 'Saving...'
                  : editingPaymentId
                  ? 'Save Changes'
                  : 'Save'}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 7. DETAIL VIEW MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedPayment ? `Payment Voucher: ${selectedPayment.paymentNo}` : 'Payment Voucher Details'}
        subtitle="Voucher amount, supplier, payment mode, and reference details"
        maxWidth="3xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsDetailModalOpen(false)}
      >
        {selectedPayment && (
          <div className="space-y-5 p-2 sm:p-4 max-h-[75vh] overflow-y-auto">
            {/* Header Voucher Card */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#33077C] uppercase tracking-wider">Payment Out Voucher</span>
                <div className="text-lg font-bold font-mono text-slate-900">{selectedPayment.paymentNo}</div>
                <div className="text-xs text-slate-500 mt-0.5">Date: {formatDate(selectedPayment.paymentDate)}</div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
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
            <div className="pt-4 flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="h-10 px-5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center shadow-2xs whitespace-nowrap"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handlePrintPaymentOut(selectedPayment)}
                className="h-10 px-5 rounded-lg bg-[#33077C] hover:bg-[#26055d] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                <span>Print Voucher</span>
              </button>
              <button
                type="button"
                disabled={isDownloadingPayment}
                onClick={() => handleDownloadPaymentOut(selectedPayment)}
                className="h-10 px-5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {isDownloadingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isDownloadingPayment ? 'Generating...' : 'Download Voucher'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 8. HISTORY MODAL */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Payment Voucher History & Audit Trail"
        subtitle={
          isLoadingHistory
            ? 'Syncing live history from Work API...'
            : 'Complete lifecycle progression and timeline audit log'
        }
        maxWidth="md"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => setIsHistoryModalOpen(false)}
      >
        {selectedPayment && (
          <HistoryTimelineView
            isLoading={isLoadingHistory}
            eyebrow="Voucher No"
            title={selectedPayment.paymentNo}
            subtitle={
              <>
                Supplier: <span className="font-semibold text-slate-800">{selectedPayment.supplierName}</span>
                {selectedPayment.purchaseNo ? ` • Bill ${selectedPayment.purchaseNo}` : ""}
              </>
            }
            amount={{ label: "Amount Paid", value: `₹${Number(selectedPayment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }}
            badges={[
              { label: selectedPayment.status, tone: selectedPayment.status === "Completed" ? "success" : selectedPayment.status === "Cancelled" || selectedPayment.status === "Failed" ? "danger" : "warning" },
              { label: selectedPayment.paymentMode, tone: "primary" },
            ]}
            facts={[
              { label: "Payment Date", value: selectedPayment.paymentDate ? formatDate(selectedPayment.paymentDate) : "" },
              { label: "Reference No", value: selectedPayment.referenceNo },
              { label: "Linked Bill", value: selectedPayment.purchaseNo },
            ]}
            events={[
              {
                title: "Payment Voucher Recorded",
                at: selectedPayment.createdAt || selectedPayment.paymentDate,
                tone: "primary",
                description: `Payment disbursed to ${selectedPayment.supplierName}.`,
                details: [
                  { label: "Mode", value: selectedPayment.paymentMode },
                  { label: "Reference", value: selectedPayment.referenceNo },
                  { label: "Payment Date", value: selectedPayment.paymentDate ? formatDate(selectedPayment.paymentDate) : "" },
                ],
              },
              ...(selectedPayment.purchaseNo
                ? [{ title: "Applied to Purchase Bill", tone: "info" as const, description: `Settlement posted against bill ${selectedPayment.purchaseNo}.` }]
                : []),
              {
                title: `Status: ${selectedPayment.status}`,
                at: selectedPayment.updatedAt && selectedPayment.updatedAt !== selectedPayment.createdAt ? selectedPayment.updatedAt : undefined,
                tone: selectedPayment.status === "Completed" ? "success" : selectedPayment.status === "Cancelled" || selectedPayment.status === "Failed" ? "danger" : "warning",
                description: selectedPayment.status === "Cancelled" ? "This voucher was cancelled and no longer counts toward settlement." : "Current state of the payment voucher.",
              },
              ...(selectedPayment.notes
                ? [{ title: "Remarks", tone: "info" as const, description: `"${selectedPayment.notes}"` }]
                : []),
            ]}
            updatedAt={selectedPayment.updatedAt}
            onClose={() => setIsHistoryModalOpen(false)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingPayment) {
            setIsDeleteModalOpen(false);
            setDeleteTargetPayment(null);
            setDeletePaymentError(null);
          }
        }}
        onConfirm={handleConfirmDeletePayment}
        entityName="Payment Voucher"
        recordName={deleteTargetPayment?.paymentNo}
        isLoading={isDeletingPayment}
        error={deletePaymentError}
      />
    </div>
  );
};
