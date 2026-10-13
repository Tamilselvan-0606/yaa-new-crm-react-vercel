import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PaymentOutSchema, PaymentOutFormData } from '../../../validations';
import { FormError } from '../../../components/common/FormError';
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
} from 'lucide-react';
import {
  useSalesManagementStore,
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
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { exportTableToExcel } from '../../../utils/excelExport';
import { UniversalShareDropdown, formatPaymentOutShare } from '../../../utils/shareUtils';
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
  const {
    paymentOuts,
    suppliers,
    purchases,
    savePaymentOut,
    setPaymentOutsList,
    deletePaymentOut,
  } = useSalesManagementStore();

  // Live Work Payments Out API State
  const [livePayments, setLivePayments] = useState<PaymentOut[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
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
  const [pageSize, setPageSize] = useState(10);

  const periodDropdownRef = useRef<HTMLDivElement>(null);

  // Deduplication & Sync Refs (prevents multiple redundant API calls)
  const isFetchingRef = useRef(false);
  const lastFetchKeyRef = useRef('');
  const paymentOutsRef = useRef(paymentOuts);
  useEffect(() => {
    paymentOutsRef.current = paymentOuts;
  }, [paymentOuts]);

  // Load registered suppliers & purchases for dropdowns
  useEffect(() => {
    let isMounted = true;

    supplierApi
      .getSuppliers({ page_size: 100, pagination_required: false })
      .then((res) => {
        if (isMounted && res?.data && Array.isArray(res.data)) {
          setAvailableSuppliers(res.data);
        }
      })
      .catch(() => {});

    workPurchaseOrderApi
      .getPurchaseOrders({ limit: 100, pagination_required: false })
      .then((res) => {
        if (isMounted && res?.data && Array.isArray(res.data)) {
          setAvailablePurchases(res.data.map(mapApiPurchaseOrderToUi));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Merged Suppliers list (API + Store fallback)
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
    suppliers.forEach((s) => {
      if (!map.has(s.id)) {
        map.set(s.id, {
          id: s.id,
          name: s.name,
          supplierCode: s.supplierCode,
          payable: s.payable || 0,
        });
      }
    });
    return Array.from(map.values());
  }, [availableSuppliers, suppliers]);

  // Merged Purchases list (API + Store fallback)
  const mergedPurchases = useMemo(() => {
    const map = new Map<string, PurchaseOrder>();
    availablePurchases.forEach((p) => map.set(p.id, p));
    purchases.forEach((p) => {
      if (!map.has(p.id)) map.set(p.id, p);
    });
    return Array.from(map.values());
  }, [availablePurchases, purchases]);

  // Fetch Payments Out from Work API with deduplication
  const fetchPaymentsOut = useCallback(
    async (forceRefresh = false) => {
      const fetchKey = `${currentPage}_${pageSize}_${appliedSearch.trim()}_${appliedStatus}`;
      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;
      setIsApiLoading(true);

      try {
        const statusParam = appliedStatus !== 'All' ? appliedStatus : undefined;
        const response = await workPaymentOutApi.getPaymentsOut({
          page: currentPage,
          limit: pageSize,
          search: appliedSearch.trim() || undefined,
          status: statusParam,
          pagination_required: true,
        });

        if (response && response.success && Array.isArray(response.data)) {
          const mapped = response.data.map(mapApiPaymentOutToUi);
          setLivePayments(mapped);
          setIsApiConnected(true);
          setApiErrorMessage(null);

          if (response.pagination) {
            setTotalApiRecords(response.pagination.totalRecords);
            setTotalApiPages(response.pagination.totalPages);
          } else {
            setTotalApiRecords(mapped.length);
            setTotalApiPages(Math.ceil(mapped.length / pageSize) || 1);
          }

          if (currentPage === 1 && !appliedSearch.trim() && appliedStatus === 'All') {
            setPaymentOutsList(mapped);
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
          'Work API unavailable, falling back to local cache';
        console.warn('Work Payments Out API unavailable:', errMsg);
        setIsApiConnected(false);
        setApiErrorMessage(errMsg);
        setLivePayments(paymentOutsRef.current);
        setTotalApiRecords(null);
        setTotalApiPages(null);
      } finally {
        isFetchingRef.current = false;
        setIsApiLoading(false);
      }
    },
    [currentPage, pageSize, appliedSearch, appliedStatus, setPaymentOutsList]
  );

  // Initial and reactive fetch on filter change
  useEffect(() => {
    fetchPaymentsOut();
  }, [fetchPaymentsOut]);

  // Debounced Search (450ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pendingSearch !== appliedSearch) {
        setAppliedSearch(pendingSearch);
        setCurrentPage(1);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [pendingSearch, appliedSearch]);

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
  const [selectedPayment, setSelectedPayment] = useState<PaymentOut | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  // Open Edit Payment Modal
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentOutFormData>({
    resolver: zodResolver(PaymentOutSchema),
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

  const watchSupplierId = watch('supplierId');
  const watchPurchaseId = watch('purchaseId');
  const watchReceiptImage = watch('receiptImage');

  // Active pool of records: API live list if connected, otherwise local store
  const activePool = isApiConnected ? livePayments : paymentOuts;

  // Open Edit Payment Modal (Cancelled payments cannot be edited as per Swagger docs)
  const handleOpenEditModal = (po: PaymentOut) => {
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
    setEditingPaymentId(null);
    const nextNo = `VPA-${new Date().getFullYear()}-${String((activePool.length || 0) + 101).padStart(3, '0')}`;
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
    setEditingPaymentId(null);
    const nextNo = `VPA-${new Date().getFullYear()}-${String((activePool.length || 0) + 101).padStart(3, '0')}`;
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

  // Submit Payment (Create or Edit)
  const onSubmitPayment = async (data: PaymentOutFormData) => {
    const numAmount = Number(data.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    // Resolve supplier
    let supId = data.supplierId;
    let supplierObj = mergedSuppliers.find((s) => s.id === supId);
    if (!supplierObj) {
      supplierObj = mergedSuppliers.find((s) => s.name.toLowerCase() === supId.toLowerCase());
      if (supplierObj) supId = supplierObj.id;
    }

    // Ensure supplierId is a valid UUID for the API
    if (!UUID_REGEX.test(supId)) {
      const foundSup = availableSuppliers.find((s) => s.id === supId || s.name === supplierObj?.name);
      if (foundSup && UUID_REGEX.test(foundSup.id)) {
        supId = foundSup.id;
      } else if (availableSuppliers.length > 0) {
        supId = availableSuppliers[0].id;
      }
    }

    const purchaseObj = mergedPurchases.find((p) => p.id === data.purchaseId);
    const existing = editingPaymentId ? activePool.find((p) => p.id === editingPaymentId) : null;

    if (existing && existing.status === 'Cancelled') {
      toast.error('Cancelled payments cannot be edited.');
      return;
    }

    setIsSubmittingForm(true);
    try {
      if (editingPaymentId) {
        // PUT /work/payments-out/{id}
        const updatePayload = mapUiToUpdatePaymentOutPayload({
          amount: numAmount,
          referenceNo: data.referenceNo,
          paymentType: data.paymentMode,
          paymentMode: data.paymentMode,
          notes: data.notes,
        });

        let updatedItem: PaymentOut;
        try {
          const res = await workPaymentOutApi.updatePaymentOut(editingPaymentId, updatePayload);
          if (res?.data) {
            updatedItem = mapApiPaymentOutToUi(res.data);
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
          } else {
            throw new Error('No data returned');
          }
        } catch (apiErr: any) {
          console.warn('API update failed, saving locally:', apiErr);
          updatedItem = {
            ...existing!,
            amount: numAmount,
            referenceNo: data.referenceNo || '',
            paymentMode: data.paymentMode as PaymentOutMode,
            notes: data.notes || '',
            receiptImage: data.receiptImage || existing?.receiptImage,
            purchaseId: data.purchaseId || existing?.purchaseId,
            purchaseNo: purchaseObj?.purchaseNo || existing?.purchaseNo,
            updatedAt: new Date().toISOString(),
          };
        }

        savePaymentOut(updatedItem);
        setLivePayments((prev) => prev.map((p) => (p.id === editingPaymentId ? updatedItem : p)));
        toast.success(`Payment voucher ${updatedItem.paymentNo} updated successfully!`);
      } else {
        // POST /work/payments-out
        const createPayload = mapUiToCreatePaymentOutPayload({
          supplierId: supId,
          paymentType: data.paymentMode,
          paymentMode: data.paymentMode,
          amount: numAmount,
          referenceNo: data.referenceNo,
          notes: data.notes,
        });

        let createdItem: PaymentOut;
        try {
          const res = await workPaymentOutApi.createPaymentOut(createPayload);
          if (res?.data) {
            createdItem = mapApiPaymentOutToUi(res.data);
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
          } else {
            throw new Error('No data returned');
          }
        } catch (apiErr: any) {
          const apiMsg = apiErr?.response?.data?.error?.message || apiErr?.message;
          console.warn('API create payment-out failed, recording locally:', apiMsg);
          createdItem = {
            id: `pout_${Date.now()}`,
            paymentNo: data.paymentNo || `VPA-${Date.now()}`,
            paymentDate: data.paymentDate,
            supplierId: supId,
            supplierName: supplierObj?.name || 'Unknown Supplier',
            supplierCode: supplierObj?.supplierCode,
            purchaseId: data.purchaseId || undefined,
            purchaseNo: purchaseObj?.purchaseNo,
            amount: numAmount,
            paymentMode: data.paymentMode as PaymentOutMode,
            referenceNo: data.referenceNo || '',
            receiptImage: data.receiptImage || undefined,
            notes: data.notes || '',
            status: 'Completed',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }

        savePaymentOut(createdItem);
        setLivePayments((prev) => [createdItem, ...prev]);
        toast.success(`Payment ${createdItem.paymentNo} recorded successfully!`);
      }

      setEditingPaymentId(null);
      setIsFormModalOpen(false);
      fetchPaymentsOut(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save payment voucher');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Delete / Cancel Payment (voids voucher as Cancelled as per Work API)
  const handleDeletePayment = async (id: string, paymentNo: string) => {
    const existing = activePool.find((p) => p.id === id);
    if (existing?.status === 'Cancelled') {
      toast.info(`Payment voucher ${paymentNo} is already cancelled.`);
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to cancel payment voucher ${paymentNo}?\n\nFinancial payments cannot be completely deleted; cancelling voids the voucher and locks it.`
      )
    ) {
      try {
        await workPaymentOutApi.deletePaymentOut(id);
        const cancelledPayment: PaymentOut = {
          ...(existing || {
            id,
            paymentNo,
            paymentDate: new Date().toISOString().split('T')[0],
            supplierId: '',
            supplierName: '',
            amount: 0,
            paymentMode: 'Bank Transfer',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          status: 'Cancelled',
          updatedAt: new Date().toISOString(),
        };
        savePaymentOut(cancelledPayment);
        setLivePayments((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'Cancelled' } : p))
        );
        toast.success(`Payment voucher ${paymentNo} cancelled successfully.`);
        fetchPaymentsOut(true);
      } catch (err: any) {
        console.warn('API cancel failed, updating locally:', err);
        if (existing) {
          const cancelledPayment: PaymentOut = {
            ...existing,
            status: 'Cancelled',
            updatedAt: new Date().toISOString(),
          };
          savePaymentOut(cancelledPayment);
          setLivePayments((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: 'Cancelled' } : p))
          );
        }
        toast.success(`Payment voucher ${paymentNo} marked as Cancelled.`);
      } finally {
        setActiveDropdownId(null);
      }
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
      appliedPaymentMode === 'All'
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
  const summary = useMemo(() => {
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
        ? totalApiRecords
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
          setAppliedStatus(pendingStatus);
          setCurrentPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingPeriod('All Payment-Out Invoices');
          setAppliedPeriod('All Payment-Out Invoices');
          setPendingPaymentMode('All');
          setAppliedPaymentMode('All');
          setPendingStatus('All');
          setAppliedStatus('All');
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

            {/* Filter by Status */}
            <div className="shrink-0">
              <FilterDropdown
                placeholder="Status : All"
                value={pendingStatus}
                onChange={(val) => {
                  setPendingStatus(val);
                  setAppliedStatus(val);
                  setCurrentPage(1);
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
              <span className="text-[#33077C] font-bold">{summary.totalVouchers}</span>
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
                                {po.status === 'Cancelled' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      setSelectedPayment(po);
                                      setIsDetailModalOpen(true);
                                    }}
                                    className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
                                  >
                                    <span>View Voucher</span>
                                    <span className="text-[10px] uppercase font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                                      Locked
                                    </span>
                                  </button>
                                ) : (
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
                                )}

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

                                {/* 3. Delete / Cancel */}
                                {po.status === 'Cancelled' ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-400 cursor-not-allowed block opacity-60"
                                  >
                                    Cancelled (Voided)
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      handleDeletePayment(po.id, po.paymentNo);
                                    }}
                                    className="w-full px-4 py-2 text-left text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer block"
                                  >
                                    Cancel Voucher
                                  </button>
                                )}

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
            if (!customStartDate || !customEndDate) {
              toast.error('Please select both start and end dates.');
              return;
            }
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
                const s = mergedSuppliers.find((sup) => sup.id === watchSupplierId);
                const bal = s?.payable || 0;
                return bal.toLocaleString('en-IN', { minimumFractionDigits: 2 });
              })()}
            </span>
          </div>
        }
      >
        <form noValidate onSubmit={handleSubmit(onSubmitPayment)} className="space-y-4.5 p-2 sm:p-4">
          {/* Row 1: 3 Fields (Supplier / Vendor, Bill No, Voucher No) */}
          {/* Row 1: 3 Fields (Supplier / Vendor, Bill No, Voucher No) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
            {/* Field 1: Supplier / Vendor */}
            <div>
              <div className="relative">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Supplier / Vendor <span className="text-rose-500">*</span>
                </span>
                <Controller
                  control={control}
                  name="supplierId"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        setValue('purchaseId', '');
                        setValue('amount', '');
                      }}
                      placeholder="Select supplier / vendor"
                      allowClear={true}
                      options={mergedSuppliers.map((s) => ({
                        value: s.id,
                        label: `${s.name} (Payable: ₹${(s.payable || 0).toLocaleString('en-IN')})`,
                      }))}
                    />
                  )}
                />
              </div>
              <FormError message={errors.supplierId?.message} />
            </div>

            {/* Field 2: Bill No (Dropdown) */}
            <div>
              <div className="relative">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Bill No
                </span>
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
              </div>
              <FormError message={errors.purchaseId?.message} />
            </div>

            {/* Field 3: Voucher / Payment No */}
            <div>
              <div className={`relative w-full h-11 bg-white rounded-xl transition-all shadow-2xs flex items-center ${
                errors.paymentNo
                  ? 'border border-rose-400 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20 bg-rose-50/20'
                  : 'border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15'
              }`}>
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Voucher / Payment No <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  {...register('paymentNo')}
                  className="w-full h-full px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                  placeholder="e.g. VPA-2026-001"
                />
              </div>
              <FormError message={errors.paymentNo?.message} />
            </div>
          </div>

          {/* Row 2: 3 Fields (Payment Date, Payment Amount, Payment Mode) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
            {/* Field 4: Payment Date */}
            <div>
              <div className={`relative w-full h-11 bg-white rounded-xl transition-all shadow-2xs flex items-center ${
                errors.paymentDate
                  ? 'border border-rose-400 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20 bg-rose-50/20'
                  : 'border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15'
              }`}>
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Payment Date <span className="text-rose-500">*</span>
                </span>
                <input
                  type="date"
                  {...register('paymentDate')}
                  className="w-full h-full px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-800 outline-none cursor-pointer"
                />
              </div>
              <FormError message={errors.paymentDate?.message} />
            </div>

            {/* Field 5: Payment Amount */}
            <div>
              <div className={`relative w-full h-11 bg-white rounded-xl transition-all shadow-2xs flex items-center ${
                errors.amount
                  ? 'border border-rose-400 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20 bg-rose-50/20'
                  : 'border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15'
              }`}>
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Payment Amount (₹) <span className="text-rose-500">*</span>
                </span>
                <span className="pl-4 text-slate-400 font-medium text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('amount')}
                  className="w-full h-full pl-2 pr-4 bg-transparent text-xs sm:text-[13px] font-bold text-slate-900 outline-none"
                />
              </div>
              <FormError message={errors.amount?.message} />
            </div>

            {/* Field 6: Payment Mode */}
            <div>
              <div className="relative">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Payment Mode <span className="text-rose-500">*</span>
                </span>
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
              </div>
              <FormError message={errors.paymentMode?.message} />
            </div>
          </div>

          {/* Row 3: 3 Fields (Attach Receipt / Image, Reference no, Notes) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
            {/* Field 7: Attach Receipt / Image */}
            <div>
              <div className="relative">
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Upload Receipt / Proof
                </span>
                {watchReceiptImage ? (
                  <div className="flex items-center gap-3 h-11 px-3.5 rounded-xl border border-slate-300 bg-slate-50 shadow-2xs">
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
                  <label className="flex items-center justify-center gap-2 w-full h-11 px-3.5 rounded-xl border border-slate-300 hover:border-[#33077C] hover:bg-[#33077C]/5 text-slate-600 hover:text-[#33077C] text-xs sm:text-[13px] font-medium cursor-pointer transition-all bg-white shadow-2xs">
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
                            setValue('receiptImage', reader.result as string);
                            toast.success('Receipt image attached successfully!');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Field 8: Reference no */}
            <div>
              <div className={`relative w-full h-11 bg-white rounded-xl transition-all shadow-2xs flex items-center ${
                errors.referenceNo
                  ? 'border border-rose-400 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20 bg-rose-50/20'
                  : 'border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15'
              }`}>
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Reference no
                </span>
                <input
                  type="text"
                  {...register('referenceNo')}
                  className="w-full h-full px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-800 outline-none"
                />
              </div>
              <FormError message={errors.referenceNo?.message} />
            </div>

            {/* Field 9: Notes */}
            <div>
              <div className={`relative w-full h-11 bg-white rounded-xl transition-all shadow-2xs flex items-center ${
                errors.notes
                  ? 'border border-rose-400 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20 bg-rose-50/20'
                  : 'border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15'
              }`}>
                <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight z-10">
                  Notes
                </span>
                <input
                  type="text"
                  {...register('notes')}
                  className="w-full h-full px-4 bg-transparent text-xs sm:text-[13px] font-medium text-slate-800 outline-none"
                />
              </div>
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
