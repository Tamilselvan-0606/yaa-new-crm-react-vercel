import { HistoryTimelineView } from "../../../components/common/HistoryTimelineView";
import { CommonTableHead } from '../../../components/common/CommonTableHead';
import { SupplierSearchableSelect, ProductSearchableSelect } from '../../../components/common/paginated-select';
import { getNextPurchaseRequestNumber } from '../../../utils/documentNumbering';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PurchaseRequestSchema, PurchaseRequestFormData } from '../../../validations';
import { FormError } from '../../../components/common/FormError';
import {
  checkRequiredText,
  checkRequiredSelection,
  checkRequiredDate,
  checkDateNotBefore,
  checkHasLineItems,
  validateLineItems,
  collectErrors,
  extractApiFieldErrors,
  getApiErrorMessage,
  fieldAttr,
  useFieldErrors,
  useRevalidateAfterSubmit,
  useSubmitGuard,
} from '../../../utils/formValidation';
import {
  FilePlus,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  User,
  ShoppingBag,
  Trash2,
  MoreVertical,
  Check,
  Ban,
  X,
  Printer,
  Forward,
  Loader2,
  History,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import {
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseRequestPriority,
  PurchaseRequestStatus,
  PurchaseOrder,
} from '../../../store/useSalesManagementStore';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { DeleteConfirmationModal } from '../../../components/common/DeleteConfirmationModal';
import { CustomSelect } from '../../../components/common/CustomSelect';
import { Pagination } from '../../../components/common/Pagination';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { exportTableToExcel } from '../../../utils/excelExport';
import { printBusinessDocument, printTableReport, downloadBusinessDocument, DocumentPrintOptions } from '../../../utils/printUtils';
import { toast } from "../../../utils/toast";
import { useNavigate } from 'react-router-dom';
import {
  commercePurchaseRequestApi,
  mapApiPurchaseRequestToUi,
  mapUiToCreatePayload,
  mapUiToUpdatePayload,
  ensureValidUuid,
} from '../../../api/commerce/purchaseRequestApi';
import { productApi, ApiProduct } from '../../../api/commerce/productApi';
import { supplierApi, ApiSupplier } from '../../../api/commerce/supplierApi';
import {
  workPurchaseOrderApi,
  mapApiPurchaseOrderToUi,
  mapUiToCreatePurchaseOrderPayload,
  UUID_REGEX,
  getStoredOrganizationId,
} from '../../../api';
import { FormLabel, FORM_TEXTAREA_CLS, handleNonNegativeKeyDown } from '../utils/formUtils';
import { SaleActionDropdown } from '../utils';

import { formatDate } from '../utils/dateUtils';
import { evictApiCache } from "../../../api/queryCache";
const getLoggedInUserName = (): string => {
  try {
    const raw = localStorage.getItem('nexus_crm_fallback_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.name && typeof parsed.name === 'string') return parsed.name;
    }
  } catch {}
  return '';
};

// Helper for formatting ISO date strings to DD/MM/YYYY
const isoToDdmmyyyy = (iso?: string): string => {
  if (!iso) return '-';
  const clean = iso.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
};

export const PurchaseRequestView: React.FC = () => {
  const navigate = useNavigate();
  // Live Commerce API State
  const [liveRequests, setLiveRequests] = useState<PurchaseRequest[]>([]);

  // Computed next preview number based on currently loaded purchase requests
  const computedPreviewNo = useMemo(() => {
    return getNextPurchaseRequestNumber(liveRequests);
  }, [liveRequests]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState<boolean | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [totalApiRecords, setTotalApiRecords] = useState<number | null>(null);
  const [apiSummary, setApiSummary] = useState<NonNullable<import("../../../api/commerce/purchaseRequestTypes").PurchaseRequestListResponse["summary"]> | null>(null);
  const [totalApiPages, setTotalApiPages] = useState<number | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<ApiProduct[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [apiSuppliers, setApiSuppliers] = useState<ApiSupplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  // Deduplication refs for fetch
  const isFetchingRef = useRef(false);
  const lastFetchKeyRef = useRef<string | null>(null);

  // Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingPriority, setPendingPriority] = useState('All');
  const [appliedPriority, setAppliedPriority] = useState('All');
  const [pendingStatus, setPendingStatus] = useState('All');
  const [appliedStatus, setAppliedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // 3-Dots Action dropdown & Share Popover State
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Close action dropdown & share popover on click outside or scroll
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


  // On-demand product loader: calls products API when user opens product selector or searches products
  const handleProductSearch = useCallback(async (query = '') => {
    const trimmed = query.trim();
    setIsSearchingProducts(true);
    try {
      const res = await productApi.getProducts({
        search: trimmed || undefined,
        page_size: 50,
        pagination_required: false,
      });
      if (res && res.success && Array.isArray(res.data)) {
        setAvailableProducts((prev) => {
          const map = new Map<string, ApiProduct>();
          if (trimmed) {
            prev.forEach((p) => map.set(p.id, p));
          }
          res.data.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('Failed to search products:', err);
    } finally {
      setIsSearchingProducts(false);
    }
  }, []);

  // Master API Loader with deduplication
  const loadPurchaseRequests = useCallback(
    async (
      forceRefresh = false,
      overrides?: {
        search?: string;
        status?: string;
        priority?: string;
        page?: number;
      }
    ) => {
      const targetPage = overrides?.page ?? currentPage;
      const targetSearch = overrides?.search !== undefined ? overrides.search : appliedSearch;
      const targetStatus = overrides?.status !== undefined ? overrides.status : appliedStatus;
      const targetPriority = overrides?.priority !== undefined ? overrides.priority : appliedPriority;
      const fetchKey = `${targetPage}_${pageSize}_${targetSearch.trim()}_${targetStatus}_${targetPriority}`;

      if (isFetchingRef.current) return;
      if (!forceRefresh && lastFetchKeyRef.current === fetchKey) return;

      isFetchingRef.current = true;
      lastFetchKeyRef.current = fetchKey;
      setIsApiLoading(true);

      try {
        const res = await commercePurchaseRequestApi.getPurchaseRequests({
          page_no: targetPage,
          page_size: pageSize,
          pagination_required: true,
          search: targetSearch.trim() || undefined,
          sortOrder: 'desc',
          status: targetStatus !== 'All' ? targetStatus : undefined,
          priority: targetPriority !== 'All' ? targetPriority : undefined,
        });

        if (res && res.success && Array.isArray(res.data)) {
          const mapped = res.data.map(mapApiPurchaseRequestToUi);
          setLiveRequests(mapped);
          setIsApiConnected(true);
          setApiErrorMessage(null);

          setApiSummary(res.summary ?? null);
          if (res.pagination) {
            setTotalApiRecords(res.pagination.totalRecords);
            setTotalApiPages(res.pagination.totalPages);
          } else {
            setTotalApiRecords(mapped.length);
            setTotalApiPages(Math.ceil(mapped.length / pageSize) || 1);
          }
        } else {
          setIsApiConnected(true);
          setLiveRequests([]);
          setTotalApiRecords(0);
          setTotalApiPages(1);
        }
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to load purchase requests from API';
        console.warn('Commerce Purchase Request API call failed:', errMsg);
        setIsApiConnected(false);
        setApiErrorMessage(errMsg);
      } finally {
        isFetchingRef.current = false;
        setIsApiLoading(false);
      }
    },
    [currentPage, pageSize, appliedSearch, appliedStatus, appliedPriority]
  );

  // Trigger API fetch on query changes
  useEffect(() => {
    loadPurchaseRequests();
  }, [loadPurchaseRequests]);


  const handleManualRefresh = () => {
    evictApiCache(["PurchaseRequest"]); // explicit refresh bypasses the cache
    lastFetchKeyRef.current = null;
    loadPurchaseRequests(true);
    toast.info('Refreshing purchase requests from Commerce API...');
  };

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [historyRequest, setHistoryRequest] = useState<PurchaseRequest | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetRequest, setDeleteTargetRequest] = useState<PurchaseRequest | null>(null);
  const [isDeletingRequest, setIsDeletingRequest] = useState(false);
  const [deleteRequestError, setDeleteRequestError] = useState<string | null>(null);
  const [isDownloadingRequest, setIsDownloadingRequest] = useState(false);

  // Fetch suppliers from /work/suppliers API
  const loadSuppliers = useCallback(async () => {
    setIsLoadingSuppliers(true);
    try {
      const res = await supplierApi.getSuppliers({
        page_size: 100,
        pagination_required: false,
      });
      if (res && res.data && Array.isArray(res.data)) {
        setApiSuppliers(res.data);
      }
    } catch (err) {
      console.warn('Failed to load suppliers in PurchaseRequestView:', err);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, []);

  // Load initial products list and suppliers when the requisition form modal first opens (once per screen session)
  const hasLoadedFormDataRef = useRef(false);
  useEffect(() => {
    if (isCreateModalOpen && !hasLoadedFormDataRef.current) {
      hasLoadedFormDataRef.current = true;
      handleProductSearch('');
      loadSuppliers();
    }
  }, [isCreateModalOpen, handleProductSearch, loadSuppliers]);

  // Open the view modal, then load the latest record (GET /purchase-requests/:id)
  const handleOpenViewModal = async (req: PurchaseRequest) => {
    setSelectedRequest(req);
    setIsViewModalOpen(true);
    try {
      if (req.id) {
        const res = await commercePurchaseRequestApi.getPurchaseRequestById(req.id);
        if (res?.data) {
          const fresh = mapApiPurchaseRequestToUi(res.data);
          setSelectedRequest((prev) => (prev && prev.id === req.id ? { ...prev, ...fresh } : prev));
        }
      }
    } catch (err) {
      console.warn('Could not fetch purchase request details:', err);
    }
  };

  const handleOpenHistory = async (req: PurchaseRequest) => {
    setActiveDropdownId(null);
    setHistoryRequest(req);
    setIsLoadingHistory(true);
    try {
      if (req.id) {
        const res = await commercePurchaseRequestApi.getPurchaseRequestById(req.id);
        if (res?.data) {
          const fresh = mapApiPurchaseRequestToUi(res.data);
          setHistoryRequest(fresh);
        }
      }
    } catch (err) {
      console.warn('Failed to load purchase request history from API:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Rejection Modal
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [targetActionRequest, setTargetActionRequest] = useState<PurchaseRequest | null>(null);

  // Form Items State
  const [requestItems, setRequestItems] = useState<PurchaseRequestItem[]>([]);
  const [purchaseRequestManualNo, setPurchaseRequestManualNo] = useState('');
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [requiredDate, setRequiredDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);

  const lineFe = useFieldErrors();
  const { errors: lineErrors, validateAll, clearError, clearGroup, merge: mergeLineErrors, reset: resetLineErrors } = lineFe;
  const { runOnce: runSaveOnce } = useSubmitGuard();
  const { runOnce: runStatusOnce } = useSubmitGuard();
  const { runOnce: runDeleteOnce } = useSubmitGuard();
  // One key per save attempt; kept after a network failure with no answer so a retry cannot create a second record
  const idempotencyKeyRef = useRef<string | null>(null);
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // Cross-field / line rules that live outside React Hook Form (dates + items).
  const computeRequestErrors = () => {
    const errs = collectErrors([
      ['requestDate', checkRequiredDate(requestDate, 'request date')],
      ['requiredDate', checkRequiredDate(requiredDate, 'required-by date') || checkDateNotBefore(requiredDate, requestDate, 'required-by date', 'request date')],
      ['items', checkHasLineItems(requestItems.map((it) => ({ productId: it.productId, productName: it.productName, quantity: it.requestedQuantity })))],
    ]);
    const itemErrs = validateLineItems(
      requestItems.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.requestedQuantity,
        unitPrice: it.estimatedUnitPrice,
      })),
      { allowZeroPrice: true },
    );
    requestItems.forEach((it, i) => {
      if (!it.productId && !it.productName?.trim() && !itemErrs[`items.${i}.product`]) {
        itemErrs[`items.${i}.product`] = 'Please select a product before continuing.';
      }
      const e = checkDateNotBefore(it.requiredDate, requestDate, 'required-by date', 'request date');
      if (e) itemErrs[`items.${i}.requiredDate`] = e;
    });
    return { ...errs, ...itemErrs };
  };

  // React Hook Form for Requisition Modal
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<PurchaseRequestFormData>({
    // Shared zod schema + friendly local rules layered on top.
    resolver: (async (values: any, ctx: any, opts: any) => {
      const base: any = await (zodResolver(PurchaseRequestSchema) as any)(values, ctx, opts);
      const extra = collectErrors([
        ['requestedBy', checkRequiredText(values.requestedBy, 'name of the person requesting', 2)],
        ['department', checkRequiredSelection(values.department, 'department')],
        ['supplierId', checkRequiredSelection(values.supplierId, 'supplier')],
      ]);
      const errs: any = { ...(base.errors || {}) };
      for (const k of ['requestedBy', 'department', 'supplierId']) {
        if (extra[k]) errs[k] = { type: 'validate', message: extra[k] };
        else delete errs[k];
      }
      if (Object.keys(errs).length === 0) return { values: base.values ?? values, errors: {} };
      return { values: {}, errors: errs };
    }) as any,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      requestNo: '',
      requestedBy: getLoggedInUserName(),
      department: '',
      priority: 'Medium',
      supplierId: '',
      supplierName: '',
      notes: '',
    },
  });

  // After the first submit attempt, keep dates / line items errors in sync with their values.
  useRevalidateAfterSubmit(lineFe, computeRequestErrors, [requestDate, requiredDate, requestItems]);

  // Every open/close of the form or rejection dialog starts with no errors.
  useEffect(() => {
    resetLineErrors();
    clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateModalOpen]);
  useEffect(() => {
    setRejectionError(null);
  }, [rejectionModalOpen]);

  const selectedFormSupplierId = watch('supplierId');
  const selectedFormSupplierName = watch('supplierName');

  // Suppliers list from API + local store fallback + currently selected supplier
  const mergedSuppliers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; supplierCode?: string }>();

    // 1. API Suppliers (Primary Source of Truth from GET /work/suppliers)
    (apiSuppliers || []).forEach((s) => {
      if (s.id) {
        map.set(s.id, {
          id: s.id,
          name: s.name || s.company || 'Supplier',
          supplierCode: s.supplierCode,
        });
      }
    });

    // 2. Keep selected supplier if editing an existing request
    if (selectedFormSupplierId && selectedFormSupplierName && !map.has(selectedFormSupplierId)) {
      map.set(selectedFormSupplierId, {
        id: selectedFormSupplierId,
        name: selectedFormSupplierName,
      });
    }

    return Array.from(map.values());
  }, [apiSuppliers, selectedFormSupplierId, selectedFormSupplierName]);
  // Combined Product Options (API products + Inventory stocks)
  const productOptions = useMemo(() => {
    const map = new Map<
      string,
      {
        value: string;
        label: string;
        subLabel?: string;
        badge?: string;
        unitCost: number;
        openingStock: number;
      }
    >();

    availableProducts.forEach((p) => {
      const prodName = p.productName || (p as any).name || 'Product';
      const prodCost = Number(p.purchasePrice || (p as any).costPrice || 0);
      const stock = Number(p.openingStock ?? 0);
      map.set(p.id, {
        value: p.id,
        label: prodName,
        subLabel: p.productCode ? `Code: ${p.productCode} • In Stock: ${stock}` : `In Stock: ${stock}`,
        badge: p.productCode || undefined,
        unitCost: prodCost,
        openingStock: stock,
      });
    });

    // Also preserve already-selected items in current request so they always display their names
    requestItems.forEach((it) => {
      if (it.productId && !map.has(it.productId)) {
        map.set(it.productId, {
          value: it.productId,
          label: it.productName || 'Item',
          subLabel: `In Stock: ${it.currentStock || 0}`,
          unitCost: it.estimatedUnitPrice || 0,
          openingStock: it.currentStock || 0,
        });
      }
    });

    return Array.from(map.values());
  }, [availableProducts, requestItems]);


  // Rows shown come only from the API response
  const displayRequests = liveRequests;

  // Summary Metrics
  const localSummary = useMemo(() => {
    const listToAnalyze = liveRequests;
    const totalCount = totalApiRecords !== null ? totalApiRecords : listToAnalyze.length;
    const draftCount = listToAnalyze.filter((r) => r.status === 'Draft').length;
    const pendingCount = listToAnalyze.filter(
      (r) => r.status === 'Pending Approval' || r.status === 'Submitted'
    ).length;
    const approvedCount = listToAnalyze.filter((r) => r.status === 'Approved').length;
    const rejectedCount = listToAnalyze.filter((r) => r.status === 'Rejected').length;
    const completedCount = listToAnalyze.filter(
      (r) => r.status === 'Completed' || r.status === 'Purchase Created'
    ).length;

    return {
      totalCount,
      draftCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      completedCount,
    };
  }, [liveRequests, totalApiRecords]);
  const summary = apiSummary ?? localSummary;

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingRequest(null); resetLineErrors();
    setPurchaseRequestManualNo('');
    reset({
      requestNo: '',
      requestedBy: getLoggedInUserName(),
      department: '',
      priority: 'Medium',
      supplierId: '',
      supplierName: '',
      notes: '',
    });
    setRequestDate(new Date().toISOString().split('T')[0]);
    setRequiredDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setRequestItems([]);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (req: PurchaseRequest) => {
    setEditingRequest(req); resetLineErrors();
    setPurchaseRequestManualNo(req.purchaseRequestManualNo || '');
    reset({
      requestNo: req.requestNo,
      requestedBy: req.requestedBy || '',
      department: req.department || 'Warehouse / Production',
      priority: (req.priority as 'Low' | 'Medium' | 'High' | 'Urgent') || 'Medium',
      supplierId: req.supplierId || '',
      supplierName: req.supplierName || '',
      notes: req.notes || '',
    });
    setRequestDate(req.requestDate || new Date().toISOString().split('T')[0]);
    setRequiredDate(req.requiredDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setRequestItems(
      req.items && req.items.length > 0
        ? req.items
        : [
            {
              id: `pr_item_${Date.now()}`,
              productId: availableProducts[0]?.id || '',
              productName: availableProducts[0]?.productName || '',
              currentStock: availableProducts[0]?.openingStock ?? 0,
              requestedQuantity: 1,
              estimatedUnitPrice: availableProducts[0]?.purchasePrice ?? 0,
              requiredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
              remarks: '',
            },
          ]
    );
    setIsCreateModalOpen(true);
  };

  // Duplicate Request: Populates the form with existing fields & items so the user can review/edit before saving
  const handleDuplicateRequest = (req: PurchaseRequest) => {
    setEditingRequest(null); resetLineErrors();
    setPurchaseRequestManualNo('');
    reset({
      requestNo: '',
      requestedBy: req.requestedBy || getLoggedInUserName(),
      department: req.department || 'Warehouse / Production',
      priority: (req.priority as 'Low' | 'Medium' | 'High' | 'Urgent') || 'Medium',
      supplierId: req.supplierId || '',
      supplierName: req.supplierName || '',
      notes: req.notes ? `Duplicated from ${req.requestNo}. ${req.notes}` : `Duplicated from ${req.requestNo}`,
    });
    setRequestDate(new Date().toISOString().split('T')[0]);
    setRequiredDate(req.requiredDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setRequestItems(
      req.items && req.items.length > 0
        ? req.items.map((it) => ({
            ...it,
            id: `pr_item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          }))
        : [
            {
              id: `pr_item_${Date.now()}`,
              productId: availableProducts[0]?.id || '',
              productName: availableProducts[0]?.productName || '',
              currentStock: availableProducts[0]?.openingStock ?? 0,
              requestedQuantity: 1,
              estimatedUnitPrice: availableProducts[0]?.purchasePrice ?? 0,
              requiredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
              remarks: '',
            },
          ]
    );
    setIsCreateModalOpen(true);
    toast.info(`Duplicated ${req.requestNo} into edit form. Review and save when ready.`);
  };

  const handleProductChange = (index: number, prodId: string) => {
    clearError(`items.${index}.product`);
    clearError('items');
    if (!prodId) {
      setRequestItems((prev) => {
        const copy = [...prev];
        copy[index].productId = '';
        copy[index].productName = '';
        copy[index].currentStock = 0;
        copy[index].estimatedUnitPrice = 0;
        return copy;
      });
      return;
    }

    const targetProd = availableProducts.find((p) => p.id === prodId || p.productCode === prodId);
    if (targetProd) {
      setRequestItems((prev) => {
        const copy = [...prev];
        copy[index].productId = targetProd.id;
        copy[index].productName = targetProd.productName;
        copy[index].currentStock = targetProd.openingStock ?? 0;
        copy[index].estimatedUnitPrice = targetProd.purchasePrice ?? 0;
        return copy;
      });
      return;
    }

    const targetOpt = productOptions.find((o) => o.value === prodId);
    if (targetOpt) {
      setRequestItems((prev) => {
        const copy = [...prev];
        copy[index].productId = targetOpt.value;
        copy[index].productName = targetOpt.label;
        copy[index].currentStock = targetOpt.openingStock ?? 0;
        copy[index].estimatedUnitPrice = targetOpt.unitCost ?? 0;
        return copy;
      });
    }
  };

  const handleItemFieldChange = (index: number, field: keyof PurchaseRequestItem, val: any) => {
    clearError(`items.${index}.${field === 'requestedQuantity' ? 'quantity' : field}`);
    clearError('items');
    setRequestItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleAddItemRow = () => {
    const newItem: PurchaseRequestItem = {
      id: `pr_item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: '',
      productName: '',
      currentStock: 0,
      requestedQuantity: 1,
      estimatedUnitPrice: 0,
      requiredDate: requiredDate,
      remarks: '',
    };
    clearError('items');
    setRequestItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItemRow = (index: number) => {
    clearGroup('items');
    setRequestItems((prev) => prev.filter((_, i) => i !== index));
  };

  const onSaveRequest = (
    data: PurchaseRequestFormData,
    status: PurchaseRequestStatus = 'Pending Approval'
  ) => runSaveOnce(() => saveRequestInner(data, status));

  const saveRequestInner = async (
    data: PurchaseRequestFormData,
    status: PurchaseRequestStatus = 'Pending Approval'
  ) => {
    if (!validateAll(computeRequestErrors())) return;

    setIsSubmittingForm(true);

    try {
      if (editingRequest) {
        // UPDATE API: PUT /commerce/purchase-requests/{id}
        const updatePayload = mapUiToUpdatePayload({
          ...editingRequest,
          requestNo: data.requestNo,
          purchaseRequestManualNo,
          requestedBy: data.requestedBy,
          department: data.department,
          requiredDate: requiredDate,
          priority: data.priority,
          status: editingRequest.status || status,
          notes: data.notes || '',
          items: requestItems,
        });

        // The supplier is sent only when the user picked a different one (nothing else about it changes).
        if (
          data.supplierId &&
          data.supplierId !== (editingRequest.supplierId || '') &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.supplierId)
        ) {
          updatePayload.supplierId = data.supplierId;
        }

        const res = await commercePurchaseRequestApi.updatePurchaseRequest(
          editingRequest.id,
          updatePayload
        );

        if (res && res.success && res.data) {
          const mapped = mapApiPurchaseRequestToUi(res.data);
          toast.success(`Purchase request ${mapped.requestNo} updated successfully.`);
        } else {
          throw new Error('The purchase request could not be updated. Please try again.');
        }
      } else {
        // CREATE API: POST /commerce/purchase-requests
        const createPayload = mapUiToCreatePayload(
          {
            supplierId: data.supplierId || undefined,
            requestNo: data.requestNo,
            purchaseRequestManualNo,
            requestDate,
            requestedBy: data.requestedBy,
            department: data.department,
            requiredDate,
            priority: data.priority,
            status,
            notes: data.notes || '',
          },
          requestItems
        );

        if (!idempotencyKeyRef.current) idempotencyKeyRef.current = ensureValidUuid();
        const res = await commercePurchaseRequestApi.createPurchaseRequest(createPayload, idempotencyKeyRef.current);

        if (res && res.success && res.data) {
          idempotencyKeyRef.current = null;
          const mapped = mapApiPurchaseRequestToUi(res.data);
          toast.success(`Purchase request ${mapped.requestNo} created successfully!`);
        } else {
          throw new Error('The purchase request could not be created. Please try again.');
        }
      }

      setIsCreateModalOpen(false);
      setEditingRequest(null);
      loadPurchaseRequests(true);
    } catch (err: any) {
      console.warn('Purchase request API save error:', err);
      // A definite answer from the server ends this attempt; no answer keeps the key so a retry is safe
      if (err?.response) idempotencyKeyRef.current = null;
      // Keep the modal open with everything the user entered; show backend field errors inline.
      const apiFields = extractApiFieldErrors(err);
      const mapped: Record<string, string> = {};
      for (const [k, m] of Object.entries(apiFields)) {
        if (k === 'requestedBy' || k === 'department' || k === 'priority' || k === 'notes') {
          setError(k as any, { type: 'server', message: m });
          mapped[k] = m;
        } else if (k === 'requiredDate' || k === 'requestDate') {
          mapped[k] = m;
        } else {
          const im = k.match(/^items\.(\d+)\.(\w+)$/);
          if (im) {
            const f = im[2] === 'requestedQuantity' || im[2] === 'quantity' ? 'quantity' : im[2] === 'productId' ? 'product' : im[2];
            mapped[`items.${im[1]}.${f}`] = m;
          }
        }
      }
      if (Object.keys(mapped).length > 0) {
        mergeLineErrors(mapped);
      } else {
        toast.error(getApiErrorMessage(err, 'Failed to save the purchase request. Your entries have been kept; please try again.'));
      }
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Delete Purchase Request via API with confirmation modal
  const handleOpenDeleteModal = (req: PurchaseRequest) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    setDeleteTargetRequest(req);
    setDeleteRequestError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteRequest = () => runDeleteOnce(confirmDeleteRequestInner);
  const confirmDeleteRequestInner = async () => {
    if (!deleteTargetRequest) return;
    setIsDeletingRequest(true);
    setDeleteRequestError(null);
    try {
      await commercePurchaseRequestApi.deletePurchaseRequest(deleteTargetRequest.id);
      toast.success(`Purchase request "${deleteTargetRequest.requestNo}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setDeleteTargetRequest(null);
      loadPurchaseRequests(true);
    } catch (err: any) {
      console.warn('API delete error:', err);
      const errMsg = getApiErrorMessage(err, 'Failed to delete purchase request');
      setDeleteRequestError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDeletingRequest(false);
    }
  };

  // Convert Request to Purchase Order: opens Purchase Order creation form with all fields prefilled
  const handleConvertToPurchase = (req: PurchaseRequest) => {
    // Preconditions: request must be usable and have valid items.
    const st = (req.status as string)?.toLowerCase();
    if (st === 'rejected' || st === 'cancelled') {
      toast.error(`Request ${req.requestNo} was ${st} and cannot be converted to a purchase.`);
      return;
    }
    if (!req.items || req.items.length === 0) {
      toast.error(`Request ${req.requestNo} has no items to convert. Please add items first.`);
      return;
    }
    const badIdx = req.items.findIndex((it) => !it.productId || !(it.requestedQuantity > 0));
    if (badIdx >= 0) {
      toast.error(`Item ${badIdx + 1} of ${req.requestNo} needs a valid product and quantity before it can be converted.`);
      return;
    }
    // 1. Identify target supplier. Only the supplier saved on the request is used; a different
    //    supplier is never substituted silently, the user picks one on the purchase form instead.
    const targetSupplier = req.supplierId
      ? mergedSuppliers.find((s) => s.id === req.supplierId) || (req.supplierName ? { id: req.supplierId, name: req.supplierName } : undefined)
      : undefined;

    // Prepare line items
    const poItems = (req.items || []).map((it) => ({
      productId: it.productId || '',
      productName: it.productName || 'Product',
      quantity: Math.max(1, it.requestedQuantity || 1),
      purchasePrice: it.estimatedUnitPrice || 0,
      unit: 'PCS',
    }));

    toast.info(`Opening Purchase Bill for ${req.requestNo}...`);

    navigate('/sale-management/purchase/purchase', {
      state: {
        convertFromPr: {
          requestId: req.id,
          requestNo: req.requestNo,
          supplierId: targetSupplier?.id || '',
          supplierName: targetSupplier?.name || '',
          dueDate: req.requiredDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          notes: req.notes || '',
          items: poItems,
        },
      },
    });
  };

  // Rejection confirmation handler: invokes PATCH /commerce/purchase-requests/{id}/status
  const [isRejecting, setIsRejecting] = useState(false);
  const handleConfirmRejection = () => runStatusOnce(confirmRejectionInner);
  const confirmRejectionInner = async () => {
    if (!targetActionRequest) return;
    const reasonErr = checkRequiredText(rejectionReason, 'rejection reason');
    if (reasonErr) {
      setRejectionError(reasonErr);
      return;
    }
    setRejectionError(null);

    setIsRejecting(true);
    try {
      await commercePurchaseRequestApi.patchPurchaseRequestStatus(targetActionRequest.id, {
        status: 'Rejected',
        rejectionReason: rejectionReason.trim(),
      });
      toast.success(`Request ${targetActionRequest.requestNo} rejected.`);
      setRejectionModalOpen(false);
      loadPurchaseRequests(true);
    } catch (err: any) {
      console.warn('API rejection error:', err);
      const apiFields = extractApiFieldErrors(err);
      const m = apiFields.rejectionReason;
      if (m) setRejectionError(m);
      else toast.error(getApiErrorMessage(err, 'Failed to reject the purchase request. Please try again.'));
    } finally {
      setIsRejecting(false);
    }
  };

  // Helper to determine if requisition is pending approval (case-insensitive & handles variants)
  const isPendingApproval = (status?: string): boolean => {
    if (!status) return false;
    const s = status.trim().toLowerCase();
    return s === 'pending approval' || s === 'pending' || s === 'submitted';
  };

  // Approval handler: invokes PATCH /commerce/purchase-requests/{id}/status
  const handleApproveRequest = (reqToApprove?: PurchaseRequest | null) =>
    runStatusOnce(() => approveRequestInner(reqToApprove));
  const approveRequestInner = async (reqToApprove?: PurchaseRequest | null) => {
    const target = reqToApprove || selectedRequest;
    if (!target) {
      console.warn('Approve called without target request');
      return;
    }
    if (!isPendingApproval(target.status)) {
      toast.error(`Request ${target.requestNo} is not waiting for approval, so it cannot be approved.`);
      return;
    }

    const approverName = getLoggedInUserName() || 'Admin';
    const orgId = target.organizationId || getStoredOrganizationId();

    console.log('[PurchaseRequest] Triggering status update to Approved for:', {
      id: target.id,
      requestNo: target.requestNo,
      approverName,
      organizationId: orgId,
    });

    setIsApproving(true);
    try {
      await commercePurchaseRequestApi.patchPurchaseRequestStatus(
        target.id,
        {
          status: 'Approved',
          approvedBy: approverName,
        },
        orgId
      );

      toast.success(`Purchase request ${target.requestNo} approved successfully!`);

      // Update selectedRequest in place if modal is still open
      if (selectedRequest && selectedRequest.id === target.id) {
        setSelectedRequest({
          ...selectedRequest,
          status: 'Approved',
          approvedBy: approverName,
          approvedAt: new Date().toISOString(),
        });
      }
      setIsViewModalOpen(false);
      loadPurchaseRequests(true);
    } catch (err: any) {
      console.warn('API purchase request approval error:', err);
      toast.error(getApiErrorMessage(err, 'Failed to approve the purchase request. Please try again.'));
    } finally {
      setIsApproving(false);
    }
  };

  // Total records & paginated items
  const totalCount = totalApiRecords !== null ? totalApiRecords : liveRequests.length;

  const paginatedRequests = useMemo(() => {
    const list = liveRequests;
    if (list.length > pageSize) {
      const start = (currentPage - 1) * pageSize;
      return list.slice(start, start + pageSize);
    }
    return list;
  }, [liveRequests, currentPage, pageSize]);

  // Export Purchase Requests to Excel
  const handleExportExcel = () => {
    const listToExport = liveRequests;
    if (listToExport.length === 0) {
      toast.error('No purchase request records available to export.');
      return;
    }

    const excelRows = listToExport.map((r, idx) => {
      const itemsSummary = r.items
        .map((it) => `${it.productName} (Qty: ${it.requestedQuantity})`)
        .join('; ');
      const totalEstimated = r.items.reduce(
        (acc, it) => acc + (it.estimatedUnitPrice || 0) * (it.requestedQuantity || 0),
        0
      );

      return {
        sNo: idx + 1,
        requestNo: r.requestNo,
        requestDate: r.requestDate,
        requestedBy: r.requestedBy,
        department: r.department,
        requiredDate: r.requiredDate,
        priority: r.priority,
        status: r.status,
        itemCount: r.items.length,
        itemsSummary,
        estimatedTotal: totalEstimated,
      };
    });

    const grandEstimated = excelRows.reduce((acc, row) => acc + row.estimatedTotal, 0);

    exportTableToExcel({
      filename: `Purchase_Requests_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Purchase Requests',
      title: 'YAA CREATIONS CRM - PURCHASE REQUESTS & REQUISITIONS',
      subtitle: `Total Requests: ${listToExport.length} | Generated: ${new Date().toLocaleDateString('en-GB')}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'Request #', key: 'requestNo', align: 'center', width: 14 },
        { header: 'Request Date', key: 'requestDate', align: 'center', width: 14 },
        { header: 'Requested By', key: 'requestedBy', align: 'left', width: 20 },
        { header: 'Department', key: 'department', align: 'left', width: 18 },
        { header: 'Required Date', key: 'requiredDate', align: 'center', width: 14 },
        { header: 'Priority', key: 'priority', align: 'center', width: 12 },
        { header: 'Status', key: 'status', align: 'center', width: 16 },
        { header: 'Items Count', key: 'itemCount', align: 'center', width: 12 },
        { header: 'Estimated Value (₹)', key: 'estimatedTotal', align: 'right', type: 'currency', width: 18 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: 'TOTAL',
        requestNo: `${listToExport.length} Requests`,
        estimatedTotal: grandEstimated,
      },
    });

    toast.success(`Purchase Requests Excel report downloaded (${listToExport.length} records)!`);
  };

  // Print & Download Purchase Request via universal printUtils
  const buildPurchaseRequestPrintOptions = (req: PurchaseRequest): DocumentPrintOptions => {
    const totalEst = req.items.reduce(
      (acc, it) => acc + (it.estimatedUnitPrice || 0) * (it.requestedQuantity || (it as any).quantity || 0),
      0
    );

    return {
      docTypeTitle: 'PURCHASE REQUISITION',
      docNo: req.requestNo,
      docDate: req.requestDate,
      dueDate: req.requiredDate,
      status: req.status,
      statusColor: req.status === 'Approved' || req.status === 'Purchase Created' ? 'emerald' : req.status === 'Rejected' ? 'rose' : 'purple',
      partyTitle: 'Requisitioner / Department',
      partyName: req.requestedBy,
      partyCompany: `Department: ${req.department}`,
      extraMeta: [
        { label: 'Priority', value: req.priority },
        ...(req.supplierName ? [{ label: 'Suggested Supplier', value: req.supplierName }] : []),
        ...(req.rejectionReason ? [{ label: 'Rejection Reason', value: req.rejectionReason }] : []),
      ],
      columns: [
        { header: 'Product Item Description', width: '40%' },
        { header: 'Unit', align: 'center', width: '15%' },
        { header: 'Requested Qty', align: 'center', width: '15%' },
        { header: 'Est. Unit Price (₹)', align: 'right', width: '15%' },
        { header: 'Total Est. (₹)', align: 'right', width: '15%' },
      ],
      items: req.items.map((it) => {
        const qty = it.requestedQuantity || (it as any).quantity || 1;
        const price = it.estimatedUnitPrice || 0;
        return {
          name: it.productName,
          unit: (it as any).unit || 'PCS',
          quantity: qty,
          unitPrice: price,
          total: qty * price,
          remarks: it.remarks,
        };
      }),
      subtotal: totalEst,
      grandTotal: totalEst,
      notes: req.notes,
    };
  };

  const handlePrintPurchaseRequest = (req: PurchaseRequest) => {
    printBusinessDocument(buildPurchaseRequestPrintOptions(req));
  };

  const handleDownloadPurchaseRequest = async (req: PurchaseRequest) => {
    if (isDownloadingRequest) return;
    setIsDownloadingRequest(true);
    const filename = `PurchaseRequest_${(req.requestNo || 'PR').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    try {
      await downloadBusinessDocument(buildPurchaseRequestPrintOptions(req), filename);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      console.error('Failed to download purchase request PDF:', err);
      toast.error('Failed to download purchase request PDF. Please try again.');
    } finally {
      setIsDownloadingRequest(false);
    }
  };

  // Print Table Report for Purchase Requests
  const handlePrintTableReport = () => {
    const listToPrint = liveRequests;
    if (listToPrint.length === 0) {
      toast.info('No purchase requests available to print.');
      return;
    }

    const printRows = listToPrint.map((r) => {
      const totalEstimated = r.items.reduce(
        (acc, it) => acc + (it.estimatedUnitPrice || 0) * (it.requestedQuantity || (it as any).quantity || 0),
        0
      );
      return {
        requestNo: r.requestNo,
        requestDate: r.requestDate,
        requestedBy: `${r.requestedBy} (${r.department})`,
        priority: r.priority,
        status: r.status,
        itemCount: `${r.items.length} items`,
        estimatedTotal: totalEstimated,
      };
    });

    const grandTotal = printRows.reduce((acc, r) => acc + r.estimatedTotal, 0);

    printTableReport({
      title: 'Purchase Requisitions & Requests Report',
      subtitle: `Total Requests: ${listToPrint.length} | Status Filter: ${appliedStatus} | Priority: ${appliedPriority}`,
      columns: [
        { header: 'Request #', key: 'requestNo', width: '15%' },
        { header: 'Date', key: 'requestDate', width: '12%' },
        { header: 'Requested By & Department', key: 'requestedBy', width: '25%' },
        { header: 'Priority', key: 'priority', align: 'center', width: '12%' },
        { header: 'Status', key: 'status', align: 'center', width: '12%' },
        { header: 'Items Count', key: 'itemCount', align: 'center', width: '10%' },
        { header: 'Est. Total (₹)', key: 'estimatedTotal', align: 'right', type: 'currency', width: '14%' },
      ],
      data: printRows,
      metrics: [
        { label: 'Total Requisitions', value: listToPrint.length },
        { label: 'Total Estimated Value', value: grandTotal },
        { label: 'Pending Approvals', value: listToPrint.filter((r) => isPendingApproval(r.status)).length },
      ],
      summaryRow: {
        requestNo: 'Total',
        estimatedTotal: grandTotal,
      },
    });
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[220px] flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <FilePlus className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Purchase Requisitions & Requests
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Submit internal stock purchase requests, route for managerial approval, and convert to Purchase Orders
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
            onClick={handleOpenCreateModal}
            icon={<Plus className="w-4 h-4 text-white" />}
            className="flex-1 sm:flex-initial justify-center"
          >
            Create Purchase Request
          </Button>
        </div>
      </div>

      {/* API Notice Banner if offline/fallback */}
      {isApiConnected === false && apiErrorMessage && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 px-4 flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Commerce API Note:</strong> {apiErrorMessage}. Operating seamlessly in local cached mode.
            </span>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="text-amber-900 font-semibold underline hover:text-amber-950 cursor-pointer ml-3 shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-[#33077C] flex items-center justify-center">
              <FilePlus className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold text-slate-900">{summary.totalCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">All requisitions</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Drafts</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold text-slate-700">{summary.draftCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Unsubmitted</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold text-amber-600">{summary.pendingCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Awaiting review</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold text-blue-600">{summary.approvedCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Ready for PO</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rejected</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold text-rose-600">{summary.rejectedCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Disapproved</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">POs Made</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-lg font-bold text-emerald-600">{summary.completedCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Converted</div>
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search by request #, requester, department, product..."
        onSubmit={() => {
          const trimmed = pendingSearch.trim();
          const isSame =
            appliedSearch === trimmed &&
            appliedPriority === pendingPriority &&
            appliedStatus === pendingStatus &&
            currentPage === 1;

          setAppliedSearch(trimmed);
          setAppliedPriority(pendingPriority);
          setAppliedStatus(pendingStatus);
          setCurrentPage(1);

          if (isSame) {
            loadPurchaseRequests(true);
          }
        }}
        onReset={() => {
          isFetchingRef.current = false;
          lastFetchKeyRef.current = null;
          setPendingSearch('');
          setAppliedSearch('');
          setPendingPriority('All');
          setAppliedPriority('All');
          setPendingStatus('All');
          setAppliedStatus('All');
          setCurrentPage(1);
          loadPurchaseRequests(true, {
            search: '',
            status: 'All',
            priority: 'All',
            page: 1,
          });
        }}
        filterSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            <FilterDropdown
              placeholder="Priority : All"
              value={pendingPriority}
              onChange={(val) => {
                setPendingPriority(val);
              }}
              options={[
                { label: 'Priority : All', value: 'All' },
                { label: 'Low', value: 'Low', dotColor: '#64748b' },
                { label: 'Medium', value: 'Medium', dotColor: '#3b82f6' },
                { label: 'High', value: 'High', dotColor: '#f59e0b' },
                { label: 'Urgent', value: 'Urgent', dotColor: '#ef4444' },
              ]}
            />

            <FilterDropdown
              placeholder="Status : All"
              value={pendingStatus}
              onChange={(val) => {
                setPendingStatus(val);
              }}
              options={[
                { label: 'Status : All', value: 'All' },
                { label: 'Draft', value: 'Draft', dotColor: '#64748b' },
                { label: 'Pending Approval', value: 'Pending Approval', dotColor: '#f59e0b' },
                { label: 'Approved', value: 'Approved', dotColor: '#3b82f6' },
                { label: 'Purchase Created', value: 'Purchase Created', dotColor: '#10b981' },
                { label: 'Rejected', value: 'Rejected', dotColor: '#ef4444' },
              ]}
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            <span className="text-xs font-semibold text-slate-500">
              Total Requests :{' '}
              <span className="text-[#33077C] font-bold">{totalCount}</span>
            </span>
          </div>
        }
      />

      {/* 4. Request Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[950px]">
            <CommonTableHead
              columns={[
                { label: "REQUEST NO.", align: "center", minWidth: "140px" },
                { label: "DATE", align: "left", minWidth: "120px" },
                { label: "REQUESTED BY", align: "left", minWidth: "160px" },
                { label: "DEPARTMENT", align: "left", minWidth: "140px" },
                { label: "ITEMS REQUESTED", align: "left", minWidth: "150px" },
                { label: "PRIORITY", align: "center", minWidth: "110px" },
                { label: "STATUS", align: "center", minWidth: "110px" },
                { label: "ACTIONS", align: "center", minWidth: "130px" },
              ]}
            />
            <tbody className="text-sm">
              {isApiLoading && paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 text-[#33077C] animate-spin" />
                    <p className="font-semibold text-slate-600 text-sm">Loading purchase requests...</p>
                    <p className="text-xs text-slate-400 mt-1">Connecting to Commerce API</p>
                  </td>
                </tr>
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 border border-slate-200 font-medium">
                    <FilePlus className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">No purchase requests found</p>
                    <p className="text-xs text-slate-400 mt-1">Submit a new requisition to order supplies.</p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 font-sans">
                    {/* 1. Request No */}
                    <td className="py-3.5 px-3 font-bold text-slate-800 text-center border-r border-slate-200 whitespace-nowrap align-middle">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => handleOpenViewModal(req)}
                        >
                          {req.requestNo}
                        </span>
                      </div>
                    </td>

                    {/* 2. Date */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 text-xs sm:text-[13px] block">
                        {isoToDdmmyyyy(req.requestDate)}
                      </span>
                      {req.requiredDate && (
                        <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                          Need: {isoToDdmmyyyy(req.requiredDate)}
                        </span>
                      )}
                    </td>

                    {/* 3. Requested By */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-[#33077C]" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-xs sm:text-[13px] block">
                            {req.requestedBy}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Requisition Owner
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Department */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap font-medium text-slate-800 text-xs">
                      {req.department}
                    </td>

                    {/* 4. Items */}
                    <td className="py-4 px-5 border border-slate-200 whitespace-nowrap">
                      <div className="font-medium text-slate-800 text-xs">
                        {req.items[0]?.productName || 'No item'} ({req.items[0]?.requestedQuantity || 0} units)
                      </div>
                      {req.items.length > 1 && (
                        <span className="text-[11px] text-[#33077C] font-bold block mt-0.5">
                          +{req.items.length - 1} more product(s)
                        </span>
                      )}
                    </td>

                    {/* 5. Priority */}
                    <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                      {req.priority === 'Urgent' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span>Urgent</span>
                        </span>
                      ) : req.priority === 'High' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span>High</span>
                        </span>
                      ) : req.priority === 'Medium' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-300 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                          <span>Medium</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span>Low</span>
                        </span>
                      )}
                    </td>

                    {/* 6. Status */}
                    <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                      {req.status === 'Approved' || req.status === 'Purchase Created' || (req.status as string) === 'Converted' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 text-emerald-700 border border-emerald-300/80 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>{req.status}</span>
                        </span>
                      ) : req.status === 'Rejected' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span>Rejected</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-xs font-bold shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>

                    {/* 7. Actions */}
                    <td className="py-4 px-5 border border-slate-200 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">

                        

                        {/* 3-dots Actions Dropdown */}
                        <SaleActionDropdown
                          items={[
                            {
                              label: 'View',
                              variant: 'view',
                              onClick: () => handleOpenViewModal(req),
                            },
                            {
                              label: 'Edit',
                              variant: 'edit',
                              onClick: () => handleOpenEditModal(req),
                            },
                            {
                              label: 'Print Request',
                              variant: 'print',
                              onClick: () => handlePrintPurchaseRequest(req),
                            },
                            {
                              label: 'Download Request',
                              variant: 'download',
                              onClick: () => handleDownloadPurchaseRequest(req),
                            },
                            {
                              label: 'Duplicate',
                              variant: 'duplicate',
                              onClick: () => handleDuplicateRequest(req),
                            },
                            {
                              label: 'View History',
                              variant: 'view',
                              onClick: () => handleOpenHistory(req),
                            },
                            !(
                              req.status === 'Purchase Created' ||
                              (req.status as string) === 'Converted' ||
                              (req.status as string)?.toLowerCase() === 'purchase created' ||
                              (req.status as string)?.toLowerCase() === 'converted' ||
                              (req.status as string)?.toLowerCase() === 'completed' ||
                              Boolean(req.createdPurchaseId)
                            ) && {
                              label: 'Convert to Purchase',
                              variant: 'order',
                              onClick: () => handleConvertToPurchase(req),
                            },
                            {
                              label: 'Delete',
                              variant: 'delete',
                              danger: true,
                              dividerBefore: true,
                              onClick: () => handleOpenDeleteModal(req),
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
      {totalCount > 0 && (
        <Pagination
          total={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={(newPage) => {
            setCurrentPage(newPage);
          }}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      )}

      {/* ==========================================
          MODAL 1: CREATE / EDIT PURCHASE REQUEST MODAL
         ========================================== */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingRequest(null);
        }}
        title={editingRequest ? `Edit Requisition: ${editingRequest.requestNo}` : 'Create Purchase Requisition'}
        subtitle={
          editingRequest
            ? 'Modify requisition details, items, or quantities'
            : 'Set requisition details, requested items, and priorities'
        }
        maxWidth="4xl"
        headerGradient={true}
        showBackIcon={true}
        hideCloseButton={true}
        onBack={() => {
          setIsCreateModalOpen(false);
          setEditingRequest(null);
        }}
      >
        <form
          noValidate
          onSubmit={handleSubmit(
            (data) => onSaveRequest(data, 'Pending Approval'),
            () => {
              validateAll(computeRequestErrors());
            },
          )}
          className="space-y-4 p-2 sm:p-4 animate-in fade-in duration-150"
        >
          {/* Metadata: 3-column Grid Layout matching standard reference */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Request Number
              </label>
              <input
                type="text"
                value={editingRequest ? editingRequest.requestNo : computedPreviewNo}
                readOnly
                className="w-full h-11 px-4 bg-purple-50/70 border border-purple-200/90 rounded-xl text-xs sm:text-[13px] font-extrabold text-[#33077C] font-mono outline-none cursor-default"
                placeholder="Auto-generated on save"
              />
              <FormError message={errors.requestNo?.message} />
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Purchase Request No
              </label>
              <input
                type="text"
                value={purchaseRequestManualNo}
                onChange={(e) => setPurchaseRequestManualNo(e.target.value)}
                placeholder="Enter Purchase Request No"
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Request Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                {...fieldAttr('requestDate')}
                value={requestDate}
                onChange={(e) => {
                  setRequestDate(e.target.value);
                  clearError('requestDate');
                  clearError('requiredDate');
                }}
                disabled={!!editingRequest}
                title={editingRequest ? "Request date cannot be changed after creation" : undefined}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
              />
              <FormError message={lineErrors['requestDate']} />
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Required Date
              </label>
              <input
                type="date"
                {...fieldAttr('requiredDate')}
                value={requiredDate}
                onChange={(e) => {
                  setRequiredDate(e.target.value);
                  clearError('requiredDate');
                }}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
              <FormError message={lineErrors['requiredDate']} />
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Requested By <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('requestedBy')}
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
                placeholder="Enter requester name"
              />
              <FormError message={errors.requestedBy?.message} />
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Department <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                value={watch('department') || ''}
                onChange={(val) => setValue('department', val, { shouldValidate: true })}
                options={[
                  { value: 'Warehouse / Production', label: 'Warehouse / Production' },
                  { value: 'Operations', label: 'Operations' },
                  { value: 'Logistics', label: 'Logistics' },
                  { value: 'IT & Infrastructure', label: 'IT & Infrastructure' },
                  { value: 'Procurement', label: 'Procurement' },
                  { value: 'Marketing', label: 'Marketing' },
                  { value: 'Sales', label: 'Sales' },
                ]}
                placeholder="Select Department"
              />
              <FormError message={errors.department?.message} />
            </div>

            <div>
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Priority <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                value={watch('priority') || 'Medium'}
                onChange={(val) => setValue('priority', val as any, { shouldValidate: true })}
                options={[
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                  { value: 'Urgent', label: 'Urgent' },
                ]}
                placeholder="Select Priority"
              />
              <FormError message={errors.priority?.message} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs sm:text-[13px] font-medium text-slate-500">
                  Select Supplier <span className="text-rose-500">*</span>
                </label>
                {isLoadingSuppliers && (
                  <span className="text-[11px] text-purple-600 font-semibold animate-pulse">
                    Loading suppliers...
                  </span>
                )}
              </div>
              <SupplierSearchableSelect
                value={watch('supplierId') || ''}
                onChange={(selId, sup) => {
                  setValue('supplierId', selId);
                  setValue('supplierName', sup ? sup.name : '');
                }}
                selectedSupplier={
                  watch('supplierId')
                    ? {
                        id: watch('supplierId'),
                        name: watch('supplierName') || '',
                      }
                    : null
                }
                allowNone
                placeholder="Select or search supplier..."
              />
              <FormError message={errors.supplierId?.message} />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs sm:text-[13px] font-medium text-slate-500 block mb-1.5">
                Business Justification / Notes
              </label>
              <input
                type="text"
                {...register('notes')}
                placeholder="Why is this purchase required? Any preferred vendors?"
                className="w-full h-11 px-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all"
              />
              <FormError message={errors.notes?.message} />
            </div>
          </div>

          {/* Product Items Section without card wrapper */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-semibold text-slate-700">
                Requested Items & Stock Levels
              </span>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleAddItemRow}
                icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              >
                Add Product
              </Button>
            </div>

            <FormError message={lineErrors['items']} />
            <div className="border border-slate-200 rounded-[4px] overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#33077C] text-white font-bold uppercase text-[11px] border-b border-[#33077C] tracking-wider select-none">
                      <th className="py-2.5 px-2.5 text-center border-r border-white/20 w-10 text-white/80 font-extrabold">#</th>
                      <th className="py-2.5 px-3 text-left border-r border-white/20 min-w-[200px] text-white">Product</th>
                      <th className="py-2.5 px-2 text-center border-r border-white/20 w-24 text-white">In Stock</th>
                      <th className="py-2.5 px-2 text-center border-r border-white/20 w-24 text-white">Req Qty</th>
                      <th className="py-2.5 px-3 text-right border-r border-white/20 w-32 text-white">Est. Cost</th>
                      <th className="py-2.5 px-2.5 text-center border-r border-white/20 min-w-[130px] text-white">Required By</th>
                      <th className="py-2.5 px-2 text-center w-10 text-white/80"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {requestItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center bg-slate-50/40">
                          <p className="text-xs sm:text-[13px] text-slate-400 font-medium">
                            No items added yet. Click &quot;Add Product&quot; above to add line items.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      requestItems.map((it, idx) => (
                        <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* 1. Index # */}
                          <td className="py-2.5 px-2 text-center border-r border-slate-200 align-middle">
                            <span className="font-mono text-xs font-bold text-slate-400">
                              {idx + 1}
                            </span>
                          </td>

                          {/* 2. Product */}
                          <td className="py-2.5 px-2 border-r border-slate-200 align-middle min-w-[200px]" {...fieldAttr(`items.${idx}.product`)}>
                            <ProductSearchableSelect
                              value={it.productId}
                              onChange={(val) => {
                                handleProductChange(idx, val);
                              }}
                              selectedProduct={
                                it.productId
                                  ? {
                                      id: it.productId,
                                      productName: it.productName,
                                      purchasePrice: it.estimatedUnitPrice,
                                      currentStock: it.currentStock,
                                    }
                                  : null
                              }
                              priceType="purchase"
                              placeholder="Select Product..."
                              size="sm"
                              triggerClassName="!h-10 !rounded-[4px] !border !border-slate-300 hover:!border-slate-400 focus:!border-[#33077C] !bg-white shadow-2xs text-xs font-semibold"
                            />
                            <FormError message={lineErrors[`items.${idx}.product`]} />
                          </td>

                          {/* 3. In Stock */}
                          <td className="py-2.5 px-2 border-r border-slate-200 align-middle">
                            <div className="h-10 flex items-center justify-center px-2 font-bold text-slate-700 bg-slate-50/70 border border-slate-200 rounded-[4px] text-xs">
                              {it.currentStock}
                            </div>
                          </td>

                          {/* 4. Req Qty */}
                          <td className="py-2.5 px-2 border-r border-slate-200 align-middle">
                            <input
                              type="number"
                              min="1"
                              {...fieldAttr(`items.${idx}.quantity`)}
                              value={it.requestedQuantity}
                              onKeyDown={handleNonNegativeKeyDown}
                              onChange={(e) =>
                                handleItemFieldChange(idx, 'requestedQuantity', Number(e.target.value))
                              }
                              className="w-full h-10 px-2 text-center bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-bold text-slate-800 outline-none shadow-2xs transition-all"
                            />
                            <FormError message={lineErrors[`items.${idx}.quantity`]} />
                          </td>

                          {/* 5. Est. Cost */}
                          <td className="py-2.5 px-2 border-r border-slate-200 align-middle text-right">
                            <div className="h-10 flex items-center justify-end px-3 rounded-[4px] bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold text-xs font-sans">
                              ₹{(it.estimatedUnitPrice || 0).toLocaleString('en-IN')}
                            </div>
                          </td>

                          {/* 6. Required By */}
                          <td className="py-2.5 px-2 border-r border-slate-200 align-middle">
                            <input
                              type="date"
                              {...fieldAttr(`items.${idx}.requiredDate`)}
                              value={it.requiredDate}
                              onChange={(e) => handleItemFieldChange(idx, 'requiredDate', e.target.value)}
                              className="w-full h-10 px-2 text-center bg-white hover:border-slate-400 focus:bg-white border border-slate-300 focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/10 rounded-[4px] text-xs font-medium text-slate-700 outline-none shadow-2xs transition-all cursor-pointer"
                            />
                            <FormError message={lineErrors[`items.${idx}.requiredDate`]} />
                          </td>

                          {/* 7. Delete Action */}
                          <td className="py-2.5 px-2 text-center align-middle">
                            <div className="h-10 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-[4px] transition-all cursor-pointer"
                                title="Remove product"
                              >
                                <Trash2 className="w-4 h-4" />
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
        </div>

          {/* Standard Footer */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={isSubmittingForm}
              onClick={() => setIsCreateModalOpen(false)}
              icon={<X className="w-4 h-4 text-slate-500" />}
              className="w-full sm:w-auto justify-center"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmittingForm}
              icon={isSubmittingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[2.5]" />}
              className="w-full sm:w-auto justify-center"
            >
              {isSubmittingForm ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ==========================================
          MODAL 2: VIEW PURCHASE REQUEST
         ========================================== */}
      {selectedRequest && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Purchase Requisition: ${selectedRequest.requestNo}`}
          subtitle="View requested items, stock status, and approval remarks"
          maxWidth="4xl"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setIsViewModalOpen(false)}
        >
          <div className="space-y-5 pt-2 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  {selectedRequest.requestedBy} ({selectedRequest.department})
                </div>
                <div className="text-slate-500 mt-0.5 font-medium">
                  Required By: {formatDate(selectedRequest.requiredDate, 'N/A')} • Req Date: {formatDate(selectedRequest.requestDate)}
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#33077C] border border-purple-200 text-xs font-bold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#33077C] shrink-0" />
                  <span>{selectedRequest.status}</span>
                </span>
              </div>
            </div>

            {(selectedRequest.supplierName || selectedRequest.supplierId) && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{selectedRequest.supplierName || 'Supplier'}</span>
                  {selectedRequest.supplierCode && (
                    <span className="rounded-md bg-purple-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#33077C]">{selectedRequest.supplierCode}</span>
                  )}
                </div>
                {(selectedRequest.supplierPhone || selectedRequest.supplierEmail || selectedRequest.supplierAddress) && (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-slate-600">
                    {selectedRequest.supplierPhone && <div><span className="text-slate-400">Phone: </span><span className="font-medium text-slate-800">{selectedRequest.supplierPhone}</span></div>}
                    {selectedRequest.supplierEmail && <div className="break-all"><span className="text-slate-400">Email: </span><span className="font-medium text-slate-800">{selectedRequest.supplierEmail}</span></div>}
                    {selectedRequest.supplierAddress && <div><span className="text-slate-400">Address: </span><span className="font-medium text-slate-800">{selectedRequest.supplierAddress}</span></div>}
                  </div>
                )}
              </div>
            )}

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200 text-[11px]">
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-center">Current Stock</th>
                      <th className="py-2.5 px-3 text-center">Req Qty</th>
                      <th className="py-2.5 px-3 text-right">Est. Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Total Est.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {selectedRequest.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{it.productName}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{it.currentStock}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-purple-900">{it.requestedQuantity}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                          ₹{(it.estimatedUnitPrice || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹{((it.estimatedUnitPrice || 0) * (it.requestedQuantity || 0)).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200 font-bold text-slate-800 text-xs">
                      <td colSpan={4} className="py-3 px-3 text-right uppercase">
                        Total Estimated Amount:
                      </td>
                      <td className="py-3 px-3 text-right text-[#33077C] font-extrabold text-sm">
                        ₹
                        {(
                          selectedRequest.totalEstimatedAmount ??
                          selectedRequest.items.reduce(
                            (acc, i) => acc + (i.estimatedUnitPrice || 0) * (i.requestedQuantity || 0),
                            0
                          )
                        ).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {selectedRequest.notes && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                <span className="font-bold text-slate-800 block mb-1 text-xs">Requester Notes:</span>
                {selectedRequest.notes}
              </div>
            )}

            {selectedRequest.rejectionReason && (
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-700">
                <span className="font-bold block mb-1 text-xs">Rejection Remarks:</span>
                {selectedRequest.rejectionReason}
              </div>
            )}

            <div className="pt-4 flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
              {isPendingApproval(selectedRequest.status) && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetActionRequest(selectedRequest);
                      setRejectionReason(''); setRejectionError(null);
                      setRejectionModalOpen(true);
                    }}
                    className="h-10 px-4 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs sm:text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    disabled={isApproving}
                    onClick={() => handleApproveRequest(selectedRequest)}
                    className="h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-[13px] font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 whitespace-nowrap"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Approving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Request</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {(selectedRequest.status === 'Approved' || selectedRequest.status?.toLowerCase() === 'approved') &&
                selectedRequest.status?.toLowerCase() !== 'converted' &&
                selectedRequest.status?.toLowerCase() !== 'purchase created' &&
                !selectedRequest.createdPurchaseId && (
                <button
                  type="button"
                  onClick={() => handleConvertToPurchase(selectedRequest)}
                  className="h-10 px-4 rounded-lg border border-purple-200 hover:border-purple-300 text-xs sm:text-[13px] font-bold text-[#33077C] hover:bg-purple-50 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Generate Purchase Order</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="h-10 px-5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center shadow-2xs whitespace-nowrap"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => handlePrintPurchaseRequest(selectedRequest)}
                className="h-10 px-5 rounded-lg bg-[#33077C] hover:bg-[#26055d] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                <span>Print Request</span>
              </button>
              <button
                type="button"
                disabled={isDownloadingRequest}
                onClick={() => handleDownloadPurchaseRequest(selectedRequest)}
                className="h-10 px-5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {isDownloadingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isDownloadingRequest ? 'Generating...' : 'Download Request'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL 3: REJECTION REASON MODAL
         ========================================== */}
      {rejectionModalOpen && targetActionRequest && (
        <Modal
          isOpen={rejectionModalOpen}
          onClose={() => setRejectionModalOpen(false)}
          title={`Reject Requisition: ${targetActionRequest.requestNo}`}
          subtitle="Provide explanation for requisition rejection"
          maxWidth="md"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setRejectionModalOpen(false)}
        >
          <div className="space-y-4 pt-4 text-xs">
            <div>
              <FormLabel required>Rejection Reason</FormLabel>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => {
                  const v = e.target.value;
                  setRejectionReason(v);
                  setRejectionError((prev) => (prev ? checkRequiredText(v, 'rejection reason') : null));
                }}
                placeholder="e.g. Budget constraints, duplicate request, existing surplus stock..."
                className={FORM_TEXTAREA_CLS}
              />
              <FormError message={rejectionError || undefined} />
            </div>
            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectionModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                disabled={isRejecting}
                onClick={handleConfirmRejection}
                className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          MODAL 4: PURCHASE REQUEST HISTORY & AUDIT TRAIL
         ========================================== */}
      {historyRequest && (
        <Modal
          isOpen={Boolean(historyRequest)}
          onClose={() => setHistoryRequest(null)}
          title={`Requisition History & Audit Trail: ${historyRequest.requestNo}`}
          subtitle={
            isLoadingHistory
              ? 'Syncing live history from Commerce API...'
              : 'Complete lifecycle progression and timeline audit log'
          }
          maxWidth="md"
          headerGradient={true}
          showBackIcon={true}
          hideCloseButton={true}
          onBack={() => setHistoryRequest(null)}
        >
          <HistoryTimelineView
            isLoading={isLoadingHistory}
            eyebrow="Requisition No"
            title={historyRequest.requestNo}
            subtitle={
              <>
                Requested By: <span className="font-semibold text-slate-800">{historyRequest.requestedBy}</span> ({historyRequest.department})
                {historyRequest.supplierName ? ` • Preferred Vendor: ${historyRequest.supplierName}` : ""}
              </>
            }
            amount={{ label: "Est. Total Amount", value: `₹${Number(historyRequest.totalEstimatedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` }}
            badges={[
              { label: `${historyRequest.priority} Priority`, tone: historyRequest.priority === "Urgent" ? "danger" : historyRequest.priority === "High" ? "warning" : "info" },
              { label: historyRequest.status, tone: historyRequest.status === "Approved" ? "success" : historyRequest.status === "Purchase Created" ? "primary" : historyRequest.status === "Rejected" ? "danger" : "warning" },
            ]}
            facts={[
              { label: "Request Date", value: historyRequest.requestDate ? formatDate(historyRequest.requestDate) : "" },
              { label: "Required By", value: historyRequest.requiredDate ? formatDate(historyRequest.requiredDate) : "" },
              { label: "Items", value: `${historyRequest.items?.length || 0} material(s)` },
            ]}
            events={[
              {
                title: "Purchase Requisition Raised",
                at: historyRequest.createdAt || historyRequest.requestDate,
                tone: "primary",
                description: `${historyRequest.items?.length || 0} material(s) requested for ${historyRequest.department}.`,
                details: [
                  { label: "Request Date", value: historyRequest.requestDate ? formatDate(historyRequest.requestDate) : "" },
                  { label: "Required By", value: historyRequest.requiredDate ? formatDate(historyRequest.requiredDate) : "" },
                ],
              },
              {
                title: `Status: ${historyRequest.status}`,
                at: historyRequest.approvedAt || (historyRequest.status === "Pending Approval" ? undefined : historyRequest.updatedAt),
                tone: historyRequest.status === "Approved" || historyRequest.status === "Purchase Created" ? "success" : historyRequest.status === "Rejected" ? "danger" : "warning",
                description:
                  historyRequest.status === "Purchase Created"
                    ? "Requisition converted into a formal Purchase Order."
                    : historyRequest.status === "Approved"
                      ? "Authorized and approved by management; ready to convert to PO."
                      : historyRequest.status === "Rejected"
                        ? `Rejected: ${historyRequest.rejectionReason || "Declined during review"}`
                        : "Pending managerial approval and review.",
                details: historyRequest.approvedBy ? [{ label: "Approved By", value: historyRequest.approvedBy }] : undefined,
              },
              ...(historyRequest.createdPurchaseId
                ? [{ title: "Purchase Order Created", tone: "primary" as const, description: "A purchase order was generated from this requisition.", details: [{ label: "Purchase ID", value: historyRequest.createdPurchaseId }] }]
                : []),
              ...(historyRequest.notes
                ? [{ title: "Department Purpose / Remarks", tone: "info" as const, description: `"${historyRequest.notes}"` }]
                : []),
            ]}
            updatedAt={historyRequest.updatedAt}
            onClose={() => setHistoryRequest(null)}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingRequest) {
            setIsDeleteModalOpen(false);
            setDeleteTargetRequest(null);
            setDeleteRequestError(null);
          }
        }}
        onConfirm={handleConfirmDeleteRequest}
        entityName="Purchase Request"
        recordName={deleteTargetRequest?.requestNo}
        isLoading={isDeletingRequest}
        error={deleteRequestError}
      />
    </div>
  );
};
